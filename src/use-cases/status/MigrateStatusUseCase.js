/**
 * MigrateStatusUseCase
 *
 * `atlas migrate --status [path]` — convert a legacy .STATUS file (markdown
 * `## Key:` or bare-yaml `key:` lines) to canonical YAML frontmatter
 * (schema atlas/v1). Dry-run by default: prints a field-level diff and
 * writes nothing. `--apply` performs the write. Accepts a single project
 * directory or a directory to batch-scan for .STATUS files.
 */

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { StatusFileGateway } from '../../adapters/gateways/StatusFileGateway.js'
import { StatusFileParser } from '../../adapters/gateways/StatusFileParser.js'

const gateway = new StatusFileGateway()
const parser = new StatusFileParser()

export class MigrateStatusUseCase {
  /**
   * @param {Object} options
   * @param {string} options.path - project directory or root to batch-scan
   * @param {boolean} [options.apply=false] - perform the write (default: dry-run)
   * @param {boolean} [options.batch=false] - scan `path` for nested .STATUS files
   * @returns {Promise<{results: Array<Object>}>}
   */
  async execute({ path, apply = false, batch = false }) {
    const targets = batch ? await this._findStatusDirs(path) : [path]
    const results = []

    for (const dir of targets) {
      results.push(await this._migrateOne(dir, apply))
    }

    return { results }
  }

  /** @private */
  async _findStatusDirs(root, depth = 3) {
    const found = []
    const walk = async (dir, d) => {
      if (d > depth) return
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      let hasStatus = false
      for (const entry of entries) {
        if (entry.isFile() && entry.name === '.STATUS') hasStatus = true
      }
      if (hasStatus) found.push(dir)
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') &&
            !['node_modules', 'vendor', 'dist', 'build'].includes(entry.name)) {
          await walk(join(dir, entry.name), d + 1)
        }
      }
    }
    await walk(root, 0)
    return found
  }

  /** @private */
  async _migrateOne(projectPath, apply) {
    const format = await gateway.detectFormat(projectPath)

    if (!format) {
      return { path: projectPath, status: 'skipped', reason: 'no .STATUS file found' }
    }
    if (format === 'frontmatter') {
      return { path: projectPath, status: 'skipped', reason: 'already canonical (schema atlas/v1)' }
    }

    const before = await gateway.read(projectPath)
    const diff = this._diff(before)

    if (!apply) {
      return { path: projectPath, status: 'dry-run', format, before, diff }
    }

    await gateway.write(projectPath, before, { migrate: true })
    const after = await gateway.read(projectPath)
    return { path: projectPath, status: 'migrated', format, before, after, diff }
  }

  /**
   * Field-level diff between the legacy-parsed object and what canonical
   * frontmatter will contain (values are unchanged by migration — this
   * highlights the FORMAT change, plus any parse warnings from PR#87
   * machinery so duplicate keys / trailing-text progress are visible).
   * @private
   */
  _diff(normalized) {
    const lines = []
    const FIELDS = ['status', 'progress', 'type', 'kind', 'priority', 'focus',
      'next', 'target', 'cran_state', 'version', 'tasks']
    for (const field of FIELDS) {
      const value = normalized[field]
      if (value === null || value === undefined) continue
      if (Array.isArray(value) && value.length === 0) continue
      lines.push(`  ${field}: ${JSON.stringify(value)}`)
    }
    if (normalized.warnings?.length) {
      for (const w of normalized.warnings) lines.push(`  ⚠ ${w}`)
    }
    if (Object.keys(normalized.unknownKeys || {}).length) {
      lines.push(`  (preserved unknown keys: ${Object.keys(normalized.unknownKeys).join(', ')})`)
    }
    return lines.join('\n')
  }
}

export default MigrateStatusUseCase
