/**
 * GuardsFileNudgeStore
 *
 * Persists Nudges to the `nudges.wall-clock` key of the shared Claude-surface
 * guards file (~/.claude/guards.json by default). That file is owned jointly
 * with cc-config's guard hooks, so every write is read-modify-write and MUST
 * leave the `guards` key — and any other unknown top-level key — untouched.
 *
 * Path resolution deliberately does NOT go through resolveConfigDir():
 * guards.json is not atlas's own config file, and relocating atlas's config
 * dir (ATLAS_CONFIG / XDG) must not move it, or the cross-surface contract
 * breaks. See SPEC Design §1.
 */

import { readFile, writeFile, mkdir, rename, unlink } from 'fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { INudgeStore } from '../../domain/gateways/INudgeStore.js'
import { Nudge } from '../../domain/entities/Nudge.js'

const LOCK_RETRY_MS = 20
const LOCK_TIMEOUT_MS = 3000

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Acquire an exclusive lock on `${guardsFile}.lock` (atomic create via the
 * 'wx' flag — fails if the file already exists), run `fn`, then release.
 * Serializes every read-modify-write cycle across concurrent atlas
 * processes/calls sharing the same guards.json, so a launchd fire racing an
 * interactive `nudge add`/`ack` can no longer silently drop one write.
 * A lock left behind by a crashed process (stale PID) is reclaimed
 * automatically; a live contender is retried with backoff up to
 * LOCK_TIMEOUT_MS before giving up with a clear error.
 * @param {string} guardsFile
 * @param {() => Promise<any>} fn
 * @returns {Promise<any>}
 */
async function withGuardsLock(guardsFile, fn) {
  const lockPath = `${guardsFile}.lock`
  const deadline = Date.now() + LOCK_TIMEOUT_MS

  await mkdir(dirname(guardsFile), { recursive: true })

  for (;;) {
    try {
      await writeFile(lockPath, String(process.pid), { flag: 'wx' })
      break
    } catch (err) {
      if (err.code !== 'EEXIST') throw err

      let heldByLivePid = true
      try {
        const pid = Number((await readFile(lockPath, 'utf8')).trim())
        heldByLivePid = Number.isInteger(pid) && isProcessAlive(pid)
      } catch {
        heldByLivePid = false // Lock file vanished or is unreadable — treat as stale.
      }

      if (!heldByLivePid) {
        await unlink(lockPath).catch(() => {})
        continue
      }

      if (Date.now() >= deadline) {
        throw new Error(
          `Timed out waiting for the guards.json lock (${lockPath}) held by another atlas process. ` +
          'If no atlas process is actually running, delete this file and retry.'
        )
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS))
    }
  }

  try {
    return await fn()
  } finally {
    await unlink(lockPath).catch(() => {})
  }
}

/**
 * Resolve the guards.json path.
 * Precedence: ATLAS_GUARDS_FILE > ${CLAUDE_CONFIG_DIR:-~/.claude}/guards.json
 * @returns {string}
 */
export function resolveGuardsFile() {
  if (process.env.ATLAS_GUARDS_FILE) {
    return process.env.ATLAS_GUARDS_FILE
  }
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
  return join(claudeDir, 'guards.json')
}

export class GuardsFileNudgeStore extends INudgeStore {
  /**
   * @param {string} [guardsFile] - Override path (defaults to resolveGuardsFile())
   */
  constructor(guardsFile) {
    super()
    this.guardsFile = guardsFile || resolveGuardsFile()
  }

  /**
   * Read the whole guards file. Returns an empty object when absent so a
   * first-ever nudge on a machine with no guards.json still works.
   * @returns {Promise<Object>}
   * @private
   */
  async _readFile() {
    if (!existsSync(this.guardsFile)) {
      return {}
    }
    const raw = await readFile(this.guardsFile, 'utf8')
    if (!raw.trim()) {
      return {}
    }
    try {
      return JSON.parse(raw)
    } catch (err) {
      throw new Error(
        `Cannot parse ${this.guardsFile}: ${err.message}. ` +
        `Refusing to overwrite it — fix or move the file, then retry.`
      )
    }
  }

  /**
   * Write nudges back, preserving every other key in the file verbatim.
   * @param {Object} data - The full parsed file contents
   * @param {Array<Nudge>} nudges
   * @private
   */
  async _writeNudges(data, nudges) {
    const next = {
      ...data,
      nudges: {
        ...(data.nudges || {}),
        'wall-clock': nudges.map((n) => n.toJSON())
      }
    }

    await mkdir(dirname(this.guardsFile), { recursive: true })
    // Write to a sibling temp file then rename — rename is atomic on the
    // same filesystem, so a concurrent get()/list() (which don't take the
    // write lock) can never observe a partially-written file.
    const tmpPath = `${this.guardsFile}.tmp.${process.pid}`
    await writeFile(tmpPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    await rename(tmpPath, this.guardsFile)
  }

  /**
   * @param {Object} data
   * @returns {Array<Nudge>}
   * @private
   */
  _extract(data) {
    const raw = data?.nudges?.['wall-clock']
    if (!Array.isArray(raw)) return []
    return raw.map((json) => Nudge.fromJSON(json)).filter(Boolean)
  }

  async add(nudge) {
    return withGuardsLock(this.guardsFile, async () => {
      const data = await this._readFile()
      const nudges = this._extract(data)

      if (nudges.some((n) => n.id === nudge.id)) {
        throw new Error(`Nudge ${nudge.id} already exists`)
      }

      nudges.push(nudge)
      await this._writeNudges(data, nudges)
      return nudge
    })
  }

  async get(id) {
    const data = await this._readFile()
    return this._extract(data).find((n) => n.id === id) || null
  }

  async list({ outstandingOnly = false } = {}) {
    const data = await this._readFile()
    const nudges = this._extract(data)
    return outstandingOnly ? nudges.filter((n) => n.isOutstanding()) : nudges
  }

  async update(nudge) {
    return withGuardsLock(this.guardsFile, async () => {
      const data = await this._readFile()
      const nudges = this._extract(data)
      const index = nudges.findIndex((n) => n.id === nudge.id)

      if (index === -1) {
        throw new Error(`Nudge ${nudge.id} not found`)
      }

      nudges[index] = nudge
      await this._writeNudges(data, nudges)
      return nudge
    })
  }

  async remove(id) {
    return withGuardsLock(this.guardsFile, async () => {
      const data = await this._readFile()
      const nudges = this._extract(data)
      const remaining = nudges.filter((n) => n.id !== id)

      if (remaining.length === nudges.length) {
        return false
      }

      await this._writeNudges(data, remaining)
      return true
    })
  }
}
