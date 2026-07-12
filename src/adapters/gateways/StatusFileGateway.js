/**
 * StatusFileGateway
 *
 * Adapter for reading .STATUS files from project directories.
 * Supports both legacy format and new YAML frontmatter format.
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'

export class StatusFileGateway {
  /**
   * Read .STATUS file from project directory
   * @param {string} projectPath - Path to project directory
   * @returns {Promise<Object|null>} Status data or null if not found
   */
  async read(projectPath) {
    const statusPath = join(projectPath, '.STATUS')

    if (!existsSync(statusPath)) {
      return null
    }

    try {
      const content = await readFile(statusPath, 'utf-8')

      // Check if it's YAML frontmatter format (starts with ---)
      if (content.trim().startsWith('---')) {
        return this._parseYAMLFormat(content)
      } else {
        return this._parseLegacyFormat(content)
      }
    } catch (error) {
      console.error(`Warning: Could not read .STATUS file: ${error.message}`)
      return null
    }
  }

  /**
   * Parse YAML frontmatter format (.STATUS v2)
   * @private
   */
  _parseYAMLFormat(content) {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n(.*?)\n---/s)
    if (!frontmatterMatch) {
      return this._parseLegacyFormat(content)
    }

    const frontmatter = frontmatterMatch[1]
    const body = content.slice(frontmatterMatch[0].length).trim()

    let parsed
    try {
      parsed = parse(frontmatter)
    } catch {
      return this._parseLegacyFormat(content)
    }
    if (!parsed || typeof parsed !== 'object') {
      return this._parseLegacyFormat(content)
    }

    const cleanData = Object.fromEntries(
      Object.entries(parsed).filter(([_, v]) => v !== undefined && v !== null)
    )
    return {
      format: 'yaml',
      status: 'unknown',
      type: 'generic',
      ...cleanData,
      progress: typeof cleanData.progress === 'string' ? (parseInt(cleanData.progress, 10) || 0) : (cleanData.progress ?? 0),
      next: cleanData.next || [],
      metrics: cleanData.metrics || {},
      body
    }
  }

  /**
   * Parse legacy .STATUS format (plain text)
   * @private
   */
  _parseLegacyFormat(content) {
    const lines = content.split('\n')
    const data = {
      format: 'legacy',
      status: 'unknown',
      progress: 0,
      next: [],
      body: content
    }

    // Try to extract common patterns
    for (const line of lines) {
      const trimmed = line.trim()

      // Look for status indicators
      if (trimmed.startsWith('status:') || trimmed.startsWith('Status:')) {
        const statusMatch = trimmed.match(/status:\s*(\w+)/i)
        if (statusMatch) {
          data.status = statusMatch[1].toLowerCase()
        }
      }

      // Look for progress percentage
      const progressMatch = trimmed.match(/(\d+)%/)
      if (progressMatch) {
        data.progress = parseInt(progressMatch[1], 10)
      }

      // Look for "next:" or "next action:" lines
      if (
        trimmed.toLowerCase().startsWith('next:') ||
        trimmed.toLowerCase().startsWith('next action:')
      ) {
        const actionText = trimmed.split(':').slice(1).join(':').trim()
        if (actionText) {
          data.next.push({ action: actionText, priority: 'medium' })
        }
      }
    }

    return data
  }

  /**
   * Parse YAML value (string, number, boolean)
   * @private
   */
  _parseValue(value) {
    // Remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1)
    }

    // Parse numbers
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10)
    }

    // Parse booleans
    if (value === 'true') return true
    if (value === 'false') return false

    return value
  }

  /**
   * Write .STATUS file to project directory
   * @param {string} projectPath - Path to project directory
   * @param {Object} data - Status data to write
   * @returns {Promise<void>}
   */
  async write(projectPath, data) {
    const statusPath = join(projectPath, '.STATUS')

    // Generate YAML frontmatter format
    const content = this._generateYAMLFormat(data)

    try {
      await writeFile(statusPath, content, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to write .STATUS file: ${error.message}`)
    }
  }

  /**
   * Generate YAML frontmatter format
   * @private
   */
  _generateYAMLFormat(data) {
    const KNOWN_ORDER = ['status', 'progress', 'type', 'kind', 'priority',
      'phase', 'focus', 'version', 'updated', 'target', 'checkpoint']

    const fm = {}
    for (const key of KNOWN_ORDER) {
      if (data[key] !== undefined && data[key] !== null) fm[key] = data[key]
    }
    if (data.next?.length) fm.next = data.next
    if (data.tasks?.length) fm.tasks = data.tasks
    if (data.metrics && Object.keys(data.metrics).length > 0) {
      fm.metrics = data.metrics
    }

    for (const [key, value] of Object.entries(data)) {
      if (!(key in fm) && key !== 'body' && key !== 'format') {
        fm[key] = value
      }
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
