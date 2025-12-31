/**
 * SyncFromStatusUseCase
 *
 * Scans directories for .STATUS files and syncs them to the project registry.
 * Provides ecosystem-wide visibility into project states without requiring
 * full project scanning.
 *
 * Key differences from SyncRegistryUseCase:
 * - Uses StatusFileParser for intelligent .STATUS file discovery
 * - Returns ecosystem summary with aggregated statistics
 * - Can work in "report only" mode without modifying registry
 */

import { Project } from '../../domain/entities/Project.js'
import { ProjectType } from '../../domain/value-objects/ProjectType.js'

export class SyncFromStatusUseCase {
  /**
   * @param {Object} dependencies
   * @param {IProjectRepository} dependencies.projectRepository - Project storage
   * @param {StatusFileParser} dependencies.statusFileParser - .STATUS file scanner/parser
   */
  constructor({ projectRepository, statusFileParser }) {
    if (!projectRepository) throw new Error('projectRepository is required')
    if (!statusFileParser) throw new Error('statusFileParser is required')

    this.projectRepository = projectRepository
    this.statusFileParser = statusFileParser
  }

  /**
   * Execute ecosystem sync from .STATUS files
   *
   * @param {Object} input
   * @param {string} input.rootPath - Root directory to scan for .STATUS files
   * @param {Object} [input.options] - Scan options
   * @param {number} [input.options.maxDepth=3] - Maximum directory depth
   * @param {string[]} [input.options.exclude] - Directory names to exclude
   * @param {boolean} [input.dryRun=false] - If true, don't modify registry
   * @param {boolean} [input.reportOnly=false] - If true, only return summary without syncing
   * @param {Function} [input.onProgress] - Progress callback ({ path, parsed }) => void
   * @returns {Promise<SyncFromStatusResult>}
   */
  async execute(input) {
    const {
      rootPath,
      options = {},
      dryRun = false,
      reportOnly = false,
      onProgress
    } = input

    if (!rootPath) {
      throw new Error('rootPath is required')
    }

    const result = {
      scanned: 0,
      synced: [],
      created: [],
      updated: [],
      skipped: [],
      errors: [],
      summary: null
    }

    // Scan for .STATUS files
    const scanResults = await this.statusFileParser.scanDirectory(rootPath, options)
    result.scanned = scanResults.length

    // Generate summary
    result.summary = this.statusFileParser.summarize(scanResults)

    // If report only, return without modifying registry
    if (reportOnly) {
      return result
    }

    // Process each found .STATUS file
    for (const { path, file, parsed } of scanResults) {
      if (onProgress) onProgress({ path, parsed })

      try {
        // Check if project exists in registry
        const existing = await this.projectRepository.findByPath(path)

        if (existing) {
          // Update existing project with .STATUS data
          const updated = this._updateProjectFromStatus(existing, parsed)

          if (this._hasChanges(existing, updated)) {
            if (!dryRun) {
              await this.projectRepository.save(updated)
            }
            result.updated.push({ path, name: parsed.name, changes: this._getChanges(existing, updated) })
          } else {
            result.skipped.push({ path, name: parsed.name, reason: 'no changes' })
          }
        } else {
          // Create new project from .STATUS data
          const newProject = this._createProjectFromStatus(path, parsed)

          if (!dryRun) {
            await this.projectRepository.save(newProject)
          }
          result.created.push({ path, name: parsed.name })
        }

        result.synced.push({ path, name: parsed.name, status: parsed.status, progress: parsed.progress })
      } catch (error) {
        result.errors.push({
          path,
          name: parsed?.name,
          error: error.message
        })
      }
    }

    return result
  }

  /**
   * Create a new Project entity from .STATUS data
   * @private
   */
  _createProjectFromStatus(path, parsed) {
    const project = new Project(
      this._generateId(parsed.name),
      parsed.name,
      { path }
    )

    // Set type from parsed data
    if (parsed.type) {
      try {
        project.type = new ProjectType(parsed.type)
      } catch {
        project.type = new ProjectType('general')
      }
    }

    // Set metadata from parsed fields
    project.metadata = {
      status: parsed.status,
      progress: parsed.progress,
      priority: parsed.priority,
      phase: parsed.phase,
      focus: parsed.focus,
      next: parsed.next,
      version: parsed.version,
      sourceFormat: parsed.format,
      syncedAt: new Date().toISOString()
    }

    // Set description from focus or next
    if (parsed.focus) {
      project.description = parsed.focus
    } else if (parsed.next) {
      project.description = parsed.next
    }

    return project
  }

  /**
   * Update an existing Project entity with .STATUS data
   * @private
   */
  _updateProjectFromStatus(existing, parsed) {
    // Clone existing project
    const updated = new Project(existing.id, existing.name, { path: existing.path })

    // Preserve statistics
    updated.totalSessions = existing.totalSessions
    updated.totalDuration = existing.totalDuration
    updated.lastAccessedAt = existing.lastAccessedAt

    // Preserve type or update from parsed
    if (parsed.type) {
      try {
        updated.type = new ProjectType(parsed.type)
      } catch {
        // Invalid type in .STATUS, keep existing or use general as fallback
        updated.type = existing.type || new ProjectType('general')
      }
    } else {
      updated.type = existing.type
    }

    // Merge metadata
    updated.metadata = {
      ...existing.metadata,
      status: parsed.status,
      progress: parsed.progress,
      priority: parsed.priority,
      phase: parsed.phase,
      focus: parsed.focus,
      next: parsed.next,
      version: parsed.version,
      sourceFormat: parsed.format,
      syncedAt: new Date().toISOString()
    }

    // Update description from focus or next if not already set
    if (parsed.focus && !existing.description) {
      updated.description = parsed.focus
    } else if (parsed.next && !existing.description) {
      updated.description = parsed.next
    } else {
      updated.description = existing.description
    }

    return updated
  }

  /**
   * Check if project has meaningful changes
   * @private
   */
  _hasChanges(existing, updated) {
    const oldMeta = existing.metadata || {}
    const newMeta = updated.metadata || {}

    return (
      oldMeta.status !== newMeta.status ||
      oldMeta.progress !== newMeta.progress ||
      oldMeta.priority !== newMeta.priority ||
      oldMeta.phase !== newMeta.phase ||
      oldMeta.focus !== newMeta.focus ||
      oldMeta.next !== newMeta.next
    )
  }

  /**
   * Get list of changes between old and new project
   * @private
   */
  _getChanges(existing, updated) {
    const changes = []
    const oldMeta = existing.metadata || {}
    const newMeta = updated.metadata || {}

    if (oldMeta.status !== newMeta.status) {
      changes.push(`status: ${oldMeta.status || 'none'} → ${newMeta.status}`)
    }
    if (oldMeta.progress !== newMeta.progress) {
      changes.push(`progress: ${oldMeta.progress || 0}% → ${newMeta.progress}%`)
    }
    if (oldMeta.priority !== newMeta.priority) {
      changes.push(`priority: ${oldMeta.priority || 3} → ${newMeta.priority}`)
    }
    if (oldMeta.phase !== newMeta.phase) {
      changes.push(`phase: ${oldMeta.phase || 'none'} → ${newMeta.phase}`)
    }

    return changes
  }

  /**
   * Generate a project ID from name
   * @private
   */
  _generateId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

export default SyncFromStatusUseCase
