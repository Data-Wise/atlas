/**
 * Config directory resolution — single source of truth.
 *
 * Precedence: ATLAS_CONFIG > ATLAS_DATA_DIR > legacy ~/.atlas (if it exists
 * and hasn't been migrated) > XDG_CONFIG_HOME/atlas (or ~/.config/atlas).
 *
 * A pre-existing ~/.atlas is only superseded once a migration marker exists
 * at the XDG path — bare directory existence isn't enough, since an XDG dir
 * could exist for an unrelated reason while the real data is still legacy.
 * See docs/specs/SPEC-xdg-config-migration-2026-07-19.md §1.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const MIGRATION_MARKER_FILENAME = '.atlas-migration.json'

export function legacyConfigDir() {
  return `${process.env.HOME}/.atlas`
}

export function xdgConfigDir() {
  const base = process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`
  return join(base, 'atlas')
}

export function migrationMarkerPath(xdgDir = xdgConfigDir()) {
  return join(xdgDir, MIGRATION_MARKER_FILENAME)
}

export function resolveConfigDir() {
  if (process.env.ATLAS_CONFIG) return process.env.ATLAS_CONFIG
  if (process.env.ATLAS_DATA_DIR) return process.env.ATLAS_DATA_DIR

  const legacy = legacyConfigDir()
  const xdg = xdgConfigDir()

  if (existsSync(legacy) && !existsSync(migrationMarkerPath(xdg))) {
    return legacy
  }

  return xdg
}
