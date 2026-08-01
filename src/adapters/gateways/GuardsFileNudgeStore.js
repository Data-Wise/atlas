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

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { INudgeStore } from '../../domain/gateways/INudgeStore.js'
import { Nudge } from '../../domain/entities/Nudge.js'

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
    await writeFile(this.guardsFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
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
    const data = await this._readFile()
    const nudges = this._extract(data)

    if (nudges.some((n) => n.id === nudge.id)) {
      throw new Error(`Nudge ${nudge.id} already exists`)
    }

    nudges.push(nudge)
    await this._writeNudges(data, nudges)
    return nudge
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
    const data = await this._readFile()
    const nudges = this._extract(data)
    const index = nudges.findIndex((n) => n.id === nudge.id)

    if (index === -1) {
      throw new Error(`Nudge ${nudge.id} not found`)
    }

    nudges[index] = nudge
    await this._writeNudges(data, nudges)
    return nudge
  }

  async remove(id) {
    const data = await this._readFile()
    const nudges = this._extract(data)
    const remaining = nudges.filter((n) => n.id !== id)

    if (remaining.length === nudges.length) {
      return false
    }

    await this._writeNudges(data, remaining)
    return true
  }
}
