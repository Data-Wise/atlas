/**
 * XDG migration — moves the legacy ~/.atlas data directory to the XDG
 * location, guarded so it never runs out from under a live long-running
 * process (atlas-mcp / atlas dash) and never silently overwrites a
 * partial prior migration.
 *
 * See docs/specs/SPEC-xdg-config-migration-2026-07-19.md §2.
 */

import { existsSync } from 'node:fs'
import { mkdir, rename, rm, cp, writeFile, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { legacyConfigDir, xdgConfigDir, migrationMarkerPath } from './configPath.js'
import { checkLock } from './atlasLock.js'

const SQLITE_SUFFIXES = ['.db', '.db-shm', '.db-wal']

/**
 * Walk a directory and report file count, total bytes, and whether any
 * SQLite files are present (informs the dry-run warning about closing
 * anything that might hold atlas.db open).
 */
async function scanDir(dir) {
  let fileCount = 0
  let totalBytes = 0
  let hasSqlite = false

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else {
        fileCount += 1
        const s = await stat(full)
        totalBytes += s.size
        if (SQLITE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
          hasSqlite = true
        }
      }
    }
  }

  await walk(dir)
  return { fileCount, totalBytes, hasSqlite }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Move `legacy` to `xdg` atomically where possible.
 *
 * fs.rename() is a single atomic syscall on the common case (same
 * filesystem). If it fails with EXDEV (cross-filesystem — e.g. a
 * dotfile-manager symlink under ~/.config), fall back to: copy the whole
 * tree to a temp sibling directory, rename the temp dir into its final
 * name (atomic — the new location either fully exists or doesn't appear
 * at all), then remove the old tree as a final, safely-retryable cleanup
 * step. Never a naive recursive copy-then-delete-source.
 */
async function moveDir(legacy, xdg) {
  await mkdir(dirname(xdg), { recursive: true })
  try {
    await rename(legacy, xdg)
  } catch (err) {
    if (err.code !== 'EXDEV') throw err

    const tmp = `${xdg}.migrating-${process.pid}`
    await rm(tmp, { recursive: true, force: true })
    await cp(legacy, tmp, { recursive: true })
    await rename(tmp, xdg)
    await rm(legacy, { recursive: true, force: true })
  }
}

/**
 * @param {Object} options
 * @param {boolean} [options.apply=false] - Actually move (default: dry-run report only)
 * @param {boolean} [options.force=false] - Override the process-lock guard only —
 *   never bypasses the existing-XDG-target refusal (that's a hard data-integrity
 *   guard, not a soft safety check; see SPEC §2 / grill ledger #6).
 * @param {string} options.atlasVersion - Recorded in the migration marker.
 */
export async function migrateToXdg({ apply = false, force = false, atlasVersion } = {}) {
  const legacy = legacyConfigDir()
  const xdg = xdgConfigDir()
  const markerPath = migrationMarkerPath(xdg)

  if (!existsSync(legacy)) {
    return {
      success: true,
      alreadyDone: true,
      message: `Nothing to migrate — no data found at ${legacy}.`
    }
  }

  if (existsSync(markerPath)) {
    return {
      success: true,
      alreadyDone: true,
      message: `Already migrated — atlas has been using ${xdg} since a previous run.`
    }
  }

  const stats = await scanDir(legacy)

  if (!apply) {
    const lines = [
      `Would move ${legacy}`,
      `        to ${xdg}`,
      `  ${stats.fileCount} files, ${formatBytes(stats.totalBytes)}`
    ]
    if (stats.hasSqlite) {
      lines.push('  Includes a SQLite database — close atlas dash / restart atlas-mcp before --apply if either is running.')
    }
    lines.push("  [dry-run — no changes made; pass --apply to actually move]")
    return { success: true, dryRun: true, stats, message: lines.join('\n') }
  }

  // Hard, non-overridable guard: never merge or overwrite an existing
  // partial migration. --force does not apply here.
  if (existsSync(xdg)) {
    return {
      success: false,
      message: `${xdg} already exists — this looks like a previous partial migration. ` +
        `Please resolve it manually (check its contents, then remove or move it aside) before retrying.`
    }
  }

  // Soft, overridable guard: a long-running atlas process may be holding
  // configDir open. checkLock is keyed by the currently-resolved path,
  // which is still `legacy` at this point (migration hasn't happened yet).
  const lock = checkLock(legacy)
  if (lock && !force) {
    return {
      success: false,
      message: `${lock.process} is running (pid ${lock.pid}) and may be using this data — ` +
        `close it and try again, or pass --force if that's a stale lock from a crash.`
    }
  }

  await moveDir(legacy, xdg)

  await writeFile(markerPath, JSON.stringify({
    from: legacy,
    migratedAt: new Date().toISOString(),
    atlasVersion: atlasVersion || null
  }, null, 2))

  return {
    success: true,
    message: `Moved your atlas data to ${xdg}. Everything's right where atlas expects it.`
  }
}
