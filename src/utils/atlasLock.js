/**
 * Process lock for long-running atlas consumers (atlas-mcp, atlas dash).
 *
 * A long-running process resolves its configPath once at startup and never
 * re-checks it. If `atlas migrate --xdg --apply` moves the data directory
 * out from under it, it keeps reading/writing the now-stale path silently.
 * This lock lets --apply detect that and refuse (or, with --force, proceed
 * anyway) rather than risk corrupting an open SQLite WAL file or operating
 * on a directory that's about to disappear.
 *
 * Lives in the OS temp dir, keyed by a hash of the resolved configPath —
 * deliberately NOT inside the directory being migrated, so a rename of
 * that directory can't strand or split the lock itself.
 *
 * See docs/specs/SPEC-xdg-config-migration-2026-07-19.md §2.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

export function lockPath(configDir) {
  const hash = createHash('sha256').update(configDir).digest('hex').slice(0, 16)
  return join(tmpdir(), `atlas-${hash}.lock`)
}

/**
 * Write a lock for the given configDir. Call on process startup
 * (atlas-mcp, atlas dash) and remove via releaseLock on clean exit.
 */
export function acquireLock(configDir, processName) {
  const path = lockPath(configDir)
  writeFileSync(path, JSON.stringify({
    pid: process.pid,
    process: processName,
    startedAt: new Date().toISOString()
  }))
  return path
}

export function releaseLock(configDir) {
  const path = lockPath(configDir)
  try {
    unlinkSync(path)
  } catch {
    // Already gone — nothing to clean up.
  }
}

function isProcessAlive(pid) {
  try {
    // Signal 0 checks existence/permission without actually sending a signal.
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Returns the lock's contents ({ pid, process, startedAt }) if an atlas
 * process is likely actively holding configDir, or null if unlocked or the
 * lock is stale (its PID no longer exists — a crash, not a clean exit).
 * A stale lock is treated as "not locked" automatically; --force exists
 * for cases this can't detect (e.g. PID reuse by an unrelated process).
 */
export function checkLock(configDir) {
  const path = lockPath(configDir)
  if (!existsSync(path)) return null

  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }

  if (!data || typeof data.pid !== 'number' || !isProcessAlive(data.pid)) {
    return null
  }

  return data
}
