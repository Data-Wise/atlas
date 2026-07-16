/**
 * StatusFileParser
 *
 * Scans directories for .STATUS files and parses them into a unified format.
 * Used for ecosystem-wide project status aggregation.
 *
 * Supports two formats:
 * 1. Markdown-style: ## Status: active, ## Progress: 75
 * 2. YAML-style: status: active, progress: 75
 */

import { readFile, readdir, access, constants } from 'node:fs/promises'
import { join, basename, dirname } from 'node:path'

/**
 * Strip a trailing whitespace-anchored inline comment from a .STATUS value,
 * e.g. `CSDA # was JASA — retargeted` → `CSDA`. The leading-whitespace anchor
 * keeps a `#` that is part of the value itself (no preceding space).
 * @param {string} value
 * @returns {string}
 */
function stripInlineComment(value) {
  return String(value == null ? '' : value).replace(/\s+#.*$/, '').trim()
}

/**
 * Parse a `progress:` value as a leading integer (optionally `%`-suffixed),
 * same extraction `parseInt` already did — "75 (note)" still parses to 75,
 * unchanged from prior behavior. What changes: this makes both failure modes
 * VISIBLE via `warnings` instead of silent:
 *   - no leading digit at all (pure prose, e.g. "manuscript prep ON HOLD")
 *     — was already silently coerced to 0 by `parseInt(...) || 0`; still 0,
 *     now with a warning naming the bad value.
 *   - a leading digit followed by non-empty trailing text (e.g. "75 (note)")
 *     — value is preserved (75), but flagged so the note can be moved to
 *     `next:` where it won't be mistaken for a machine-readable field.
 * @param {string} raw
 * @param {string[]} warnings - collector for human-readable parse warnings
 * @returns {number} 0-100
 */
function parseProgress(raw, warnings) {
  const trimmed = String(raw == null ? '' : raw).trim()
  const match = trimmed.match(/^(\d{1,3})\s*%?/)
  if (!match) {
    warnings.push(`progress: non-numeric value "${trimmed}" — parsed as 0, needs a plain integer 0-100`)
    return 0
  }
  const value = Math.min(100, Math.max(0, Number(match[1])))
  const rest = trimmed.slice(match[0].length).trim()
  if (rest) {
    warnings.push(`progress: trailing text after the number in "${trimmed}" — parsed as ${value}, consider moving the note to next:`)
  }
  return value
}

/**
 * Record a key assignment, warning on a second occurrence of the same key.
 * Last-occurrence-wins behavior is unchanged — this only makes a silent
 * collision visible (e.g. a stale "preserved original content" block below
 * an active header, duplicating status:/progress:/target:).
 * @param {Record<string, number>} seenAt - key -> first-seen line number
 * @param {string} key
 * @param {number} lineNum
 * @param {string[]} warnings
 */
function trackDuplicateKey(seenAt, key, lineNum, warnings) {
  if (seenAt[key] !== undefined) {
    warnings.push(`duplicate key "${key}" at line ${lineNum} (first seen line ${seenAt[key]}) — using the last occurrence`)
  }
  seenAt[key] = lineNum
}

export class StatusFileParser {
  /**
   * Scan a directory tree for all .STATUS files
   * @param {string} rootPath - Root directory to scan
   * @param {Object} options - Scan options
   * @param {number} options.maxDepth - Maximum directory depth (default: 3)
   * @param {string[]} options.exclude - Directory names to exclude
   * @returns {Promise<Array<{path: string, parsed: Object}>>}
   */
  async scanDirectory(rootPath, options = {}) {
    const { maxDepth = 3, exclude = ['node_modules', '.git', 'vendor', 'dist', 'build'] } = options

    const results = []
    await this._scanRecursive(rootPath, results, 0, maxDepth, exclude)
    return results
  }

  /**
   * Recursive directory scanner
   * @private
   */
  async _scanRecursive(dirPath, results, currentDepth, maxDepth, exclude) {
    if (currentDepth > maxDepth) return

    // Path traversal protection
    if (dirPath.includes('..') || dirPath.includes('\\..')) {
      return
    }

    try {
      const entries = await readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)

        if (entry.isFile() && entry.name === '.STATUS') {
          const parsed = await this.parse(fullPath)
          if (parsed) {
            results.push({
              path: dirPath,
              file: fullPath,
              parsed
            })
          }
        } else if (entry.isDirectory() && !exclude.includes(entry.name) && !entry.name.startsWith('.')) {
          await this._scanRecursive(fullPath, results, currentDepth + 1, maxDepth, exclude)
        }
      }
    } catch (error) {
      // Skip directories we can't read
      if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
        console.error(`Warning: Could not scan ${dirPath}: ${error.message}`)
      }
    }
  }

  /**
   * Parse a single .STATUS file
   * @param {string} filePath - Path to .STATUS file
   * @returns {Promise<Object|null>} Parsed status data
   */
  async parse(filePath) {
    try {
      await access(filePath, constants.F_OK)
    } catch {
      return null
    }

    try {
      const content = await readFile(filePath, 'utf-8')
      const projectName = basename(dirname(filePath))

      // Detect format and parse
      if (this._isMarkdownFormat(content)) {
        return this._parseMarkdownFormat(content, projectName)
      } else {
        return this._parseYAMLFormat(content, projectName)
      }
    } catch (error) {
      console.error(`Warning: Could not parse ${filePath}: ${error.message}`)
      return null
    }
  }

  /**
   * Check if content is in Markdown format (## Key: Value)
   * @private
   */
  _isMarkdownFormat(content) {
    return /^##\s+\w+:/m.test(content)
  }

  /**
   * Parse Markdown-style .STATUS format
   * ## Project: name
   * ## Status: active
   * ## Progress: 75
   * @private
   */
  _parseMarkdownFormat(content, defaultName) {
    const data = {
      format: 'markdown',
      name: defaultName,
      status: 'unknown',
      progress: 0,
      priority: 3,
      type: 'generic',
      phase: null,
      focus: null,
      next: null,
      version: null,
      updated: null,
      kind: null,
      target: null,
      cranState: null,
      tasks: [],
      _parseWarnings: []
    }
    const seenAt = {}

    const lines = content.split('\n')

    lines.forEach((line, index) => {
      const trimmed = line.trim()

      // Match ## Key: Value pattern
      const match = trimmed.match(/^##\s+(\w+):\s*(.+)$/i)
      if (match) {
        const [, key, value] = match
        const lowerKey = key.toLowerCase()

        if (['status', 'progress', 'priority', 'target', 'type', 'kind', 'cran_state'].includes(lowerKey)) {
          trackDuplicateKey(seenAt, lowerKey, index + 1, data._parseWarnings)
        }

        switch (lowerKey) {
          case 'project':
            data.name = value.trim()
            break
          case 'status':
            data.status = value.trim().toLowerCase()
            break
          case 'progress':
            data.progress = parseProgress(value, data._parseWarnings)
            break
          case 'priority':
            data.priority = parseInt(value, 10) || 3
            break
          case 'type':
            data.type = value.trim()
            break
          case 'kind':
            data.kind = value.trim().toLowerCase()
            break
          case 'target':
            data.target = stripInlineComment(value)
            break
          case 'cran_state':
            data.cranState = value.trim().toLowerCase()
            break
          case 'phase':
            data.phase = value.trim()
            break
          case 'focus':
            data.focus = value.trim()
            break
          case 'version':
            data.version = value.trim()
            break
        }
      }

      // Also check for "next:" pattern (not ## prefixed)
      if (trimmed.toLowerCase().startsWith('next:')) {
        data.next = trimmed.substring(5).trim()
      }
    })

    return data
  }

  /**
   * Parse YAML-style .STATUS format
   * status: active
   * progress: 75
   * @private
   */
  _parseYAMLFormat(content, defaultName) {
    const data = {
      format: 'yaml',
      name: defaultName,
      status: 'unknown',
      progress: 0,
      priority: 3,
      type: 'generic',
      phase: null,
      focus: null,
      next: null,
      version: null,
      updated: null,
      kind: null,
      target: null,
      cranState: null,
      tasks: [],
      _parseWarnings: []
    }
    const seenAt = {}

    const lines = content.split('\n')
    let inTasks = false

    for (const [index, line] of lines.entries()) {
      const trimmed = line.trim()

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue

      // Collect items under a `tasks:` block (proposals → tasks)
      if (inTasks) {
        if (trimmed.startsWith('- ')) {
          const item = this._parseTaskItem(trimmed)
          if (item) data.tasks.push(item)
          continue
        }
        // Anything else ends the tasks block; fall through to normal parsing
        inTasks = false
      }

      // Match key: value pattern (split on first colon only)
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0 && /^\w+$/.test(trimmed.slice(0, colonIndex))) {
        const key = trimmed.slice(0, colonIndex).trim()
        const value = trimmed.slice(colonIndex + 1).trim()
        const lowerKey = key.toLowerCase()

        // `tasks:` opens a block of `- text: ...; priority: ...; done: ...` items
        if (lowerKey === 'tasks' && !value) {
          inTasks = true
          data.tasks = []
          continue
        }

        if (!value) continue
        const cleanValue = this._cleanValue(value)

        if (['status', 'progress', 'priority', 'target', 'type', 'kind', 'next', 'cran_state'].includes(lowerKey)) {
          trackDuplicateKey(seenAt, lowerKey, index + 1, data._parseWarnings)
        }

        switch (lowerKey) {
          case 'project':
          case 'name':
            data.name = cleanValue
            break
          case 'status':
            data.status = cleanValue.toLowerCase()
            break
          case 'progress':
            data.progress = parseProgress(cleanValue, data._parseWarnings)
            break
          case 'priority':
            data.priority = parseInt(cleanValue, 10) || 3
            data.priorityLabel = cleanValue
            break
          case 'type':
            data.type = cleanValue
            break
          case 'kind':
            data.kind = cleanValue.toLowerCase()
            break
          case 'target':
          case 'venue':
          case 'journal':
            data.target = stripInlineComment(cleanValue)
            break
          case 'cran_state':
            data.cranState = cleanValue.toLowerCase()
            break
          case 'phase':
            data.phase = cleanValue
            break
          case 'focus':
            data.focus = cleanValue
            break
          case 'next':
            data.next = cleanValue
            break
          case 'version':
            data.version = cleanValue
            break
          case 'updated':
            data.updated = cleanValue
            break
          case 'checkpoint':
            // Store checkpoint as focus if no focus set
            if (!data.focus) data.focus = cleanValue
            break
        }
      }
    }

    return data
  }

  /**
   * Parse a single inline task item from a `tasks:` block.
   * Format: `- text: "define estimand"; priority: P1; done: false`
   * @private
   */
  _parseTaskItem(line) {
    const body = line.replace(/^-\s+/, '')
    const item = {}
    for (const seg of body.split(';')) {
      const ci = seg.indexOf(':')
      if (ci < 0) continue
      const key = seg.slice(0, ci).trim().toLowerCase()
      const val = this._cleanValue(seg.slice(ci + 1).trim())
      switch (key) {
        case 'text':
          item.text = val
          break
        case 'priority':
          item.priority = val
          break
        case 'done':
          item.done = val === 'true' || val === true
          break
        case 'est':
        case 'estimate':
          item.est = val
          break
      }
    }
    return item.text ? item : null
  }

  /**
   * Clean a value (remove quotes, parse types)
   * @private
   */
  _cleanValue(value) {
    let cleaned = value.trim()

    // Remove quotes
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1)
    }

    return cleaned
  }

  /**
   * Get summary of all projects from scan results
   * @param {Array} scanResults - Results from scanDirectory()
   * @returns {Object} Summary grouped by status
   */
  summarize(scanResults) {
    const summary = {
      total: scanResults.length,
      byStatus: {},
      byKind: {},
      byPriority: { 1: [], 2: [], 3: [] },
      byProgress: { complete: [], inProgress: [], notStarted: [] }
    }

    for (const { path, parsed } of scanResults) {
      const status = parsed.status || 'unknown'
      const priority = parsed.priority || 3
      const progress = parsed.progress || 0

      // Group by status
      if (!summary.byStatus[status]) {
        summary.byStatus[status] = []
      }
      summary.byStatus[status].push({ path, ...parsed })

      // Group by kind (manuscript / program / package / unspecified)
      const kind = parsed.kind || 'unspecified'
      if (!summary.byKind[kind]) {
        summary.byKind[kind] = []
      }
      summary.byKind[kind].push({ path, ...parsed })

      // Group by priority
      const priorityKey = Math.min(3, Math.max(1, priority))
      summary.byPriority[priorityKey].push({ path, ...parsed })

      // Group by progress
      if (progress >= 100) {
        summary.byProgress.complete.push({ path, ...parsed })
      } else if (progress > 0) {
        summary.byProgress.inProgress.push({ path, ...parsed })
      } else {
        summary.byProgress.notStarted.push({ path, ...parsed })
      }
    }

    return summary
  }
}

export default StatusFileParser
