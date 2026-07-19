/**
 * StatusFileGateway
 *
 * Adapter for reading/writing .STATUS files from project directories.
 * Read path delegates to StatusFileParser for normalization so canonical
 * YAML frontmatter, legacy markdown, and legacy bare-yaml all produce the
 * same normalized object (schema atlas/v1). Write path always emits
 * canonical frontmatter and refuses to silently rewrite a legacy file
 * (call site must pass { migrate: true } — see `atlas migrate`).
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from 'yaml'
import { StatusFileParser, CANONICAL_FIELD_ORDER } from './StatusFileParser.js'

const parser = new StatusFileParser()

export class LegacyStatusFileError extends Error {
  constructor(projectPath) {
    super(
      `Refusing to overwrite legacy-format .STATUS at ${join(projectPath, '.STATUS')} with canonical frontmatter. ` +
      `Run "atlas migrate --status ${projectPath}" first (or pass { migrate: true }) to convert it losslessly.`
    )
    this.name = 'LegacyStatusFileError'
    this.projectPath = projectPath
  }
}

export class StatusFileGateway {
  /**
   * Read .STATUS file from project directory. Normalizes any of the three
   * accepted formats to the same canonical shape (schema atlas/v1).
   * @param {string} projectPath - Path to project directory
   * @returns {Promise<Object|null>} Normalized status data or null if not found
   */
  async read(projectPath) {
    const statusPath = join(projectPath, '.STATUS')

    if (!existsSync(statusPath)) {
      return null
    }

    try {
      const content = await readFile(statusPath, 'utf-8')
      const raw = parser.parseContent(content, undefined)
      const normalized = parser.normalize(raw)
      // Spread unknown/extra keys onto the top level too (convenience for
      // callers that access e.g. status.venue directly) while still
      // exposing them structurally via normalized.unknownKeys.
      // `format` keeps its pre-existing public values ('yaml'|'legacy') for
      // backward compatibility; sourceFormat carries the precise 3-way tag.
      return {
        ...normalized.unknownKeys,
        ...normalized,
        format: raw.format === 'frontmatter' ? 'yaml' : 'legacy',
        sourceFormat: raw.format
      }
    } catch (error) {
      console.error(`Warning: Could not read .STATUS file: ${error.message}`)
      return null
    }
  }

  /**
   * Detect the on-disk format without a full parse (used by write()'s
   * refusal check and by `atlas migrate`).
   * @param {string} projectPath
   * @returns {Promise<'frontmatter'|'markdown'|'yaml'|null>}
   */
  async detectFormat(projectPath) {
    const statusPath = join(projectPath, '.STATUS')
    if (!existsSync(statusPath)) return null
    const content = await readFile(statusPath, 'utf-8')
    if (content.trim().startsWith('---')) return 'frontmatter'
    if (/^##\s+\w+:/m.test(content)) return 'markdown'
    return 'yaml'
  }

  /**
   * Write .STATUS file to project directory as canonical YAML frontmatter.
   * Refuses to write over an existing legacy-format file unless
   * `options.migrate` is true — prevents the PR#87 silent-field-drop bug.
   * Unknown frontmatter keys and the markdown body are preserved verbatim.
   * @param {string} projectPath - Path to project directory
   * @param {Object} data - Status data to write (normalized shape or raw)
   * @param {Object} [options]
   * @param {boolean} [options.migrate] - allow overwriting a legacy file
   * @returns {Promise<void>}
   */
  async write(projectPath, data, options = {}) {
    const statusPath = join(projectPath, '.STATUS')
    const existingFormat = await this.detectFormat(projectPath)

    if (existingFormat && existingFormat !== 'frontmatter' && !options.migrate) {
      throw new LegacyStatusFileError(projectPath)
    }

    // If migrating, merge unknown keys + body from the legacy file so
    // nothing is silently dropped.
    let mergedData = data
    if (existingFormat && existingFormat !== 'frontmatter' && options.migrate) {
      const existingContent = await readFile(statusPath, 'utf-8')
      const rawExisting = parser.parseContent(existingContent, undefined)
      const normalizedExisting = parser.normalize(rawExisting)
      mergedData = {
        ...normalizedExisting,
        ...data,
        unknownKeys: { ...normalizedExisting.unknownKeys, ...(data.unknownKeys || {}) },
        body: data.body ?? normalizedExisting.body
      }
    }

    const content = this._generateCanonicalFormat(mergedData)

    try {
      await writeFile(statusPath, content, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to write .STATUS file: ${error.message}`)
    }
  }

  /**
   * Generate canonical YAML frontmatter (.STATUS schema atlas/v1).
   * Emits known fields in CANONICAL_FIELD_ORDER, then any unknown/extra
   * keys verbatim (round-trip preservation), then the markdown body
   * byte-for-byte.
   * @private
   */
  _generateCanonicalFormat(data) {
    const fm = { schema: 'atlas/v1' }

    const FIELD_ALIASES = {
      cran_state: data.cran_state ?? data.cranState
    }

    for (const key of CANONICAL_FIELD_ORDER) {
      if (key === 'schema') continue
      let value = key in FIELD_ALIASES ? FIELD_ALIASES[key] : data[key]
      if (value === undefined || value === null) continue
      if (key === 'next') {
        const arr = Array.isArray(value) ? value : [value]
        if (arr.length === 0) continue
        fm.next = arr
        continue
      }
      if (key === 'tasks') {
        if (!Array.isArray(value) || value.length === 0) continue
        fm.tasks = value
        continue
      }
      if (key === 'metrics') {
        if (!value || typeof value !== 'object' || Object.keys(value).length === 0) continue
        fm.metrics = value
        continue
      }
      fm[key] = value
    }

    // Preserve unknown/extra keys verbatim (round-trip guarantee)
    const unknown = data.unknownKeys || {}
    for (const [key, value] of Object.entries(unknown)) {
      if (!(key in fm)) fm[key] = value
    }

    const yaml = stringify(fm).trimEnd()
    const body = data.body ? '\n' + data.body.trim() + '\n' : ''
    return `---\n${yaml}\n---\n${body}`
  }

  /**
   * Check if path has a .STATUS file
   * @param {string} projectPath - Path to project directory
   * @returns {boolean}
   */
  hasStatusFile(projectPath) {
    const statusPath = join(projectPath, '.STATUS')
    return existsSync(statusPath)
  }
}
