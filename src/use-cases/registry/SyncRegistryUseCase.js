/**
 * SyncRegistryUseCase
 *
 * Syncs project registry from filesystem .STATUS files.
 * Combines project discovery with status file parsing to maintain
 * a comprehensive registry of all known projects.
 */

import { Project } from '../../domain/entities/Project.js'

export class SyncRegistryUseCase {
  /**
   * @param {Object} dependencies
   * @param {IProjectRepository} dependencies.projectRepository - Project storage
   * @param {StatusFileGateway} dependencies.statusFileGateway - .STATUS file reader
   * @param {FileSystemProjectRepository} dependencies.fileSystemProjectRepository - For scanning
   */
  constructor({ projectRepository, statusFileGateway, fileSystemProjectRepository }) {
    this.projectRepository = projectRepository
    this.statusFileGateway = statusFileGateway
    this.fsProjectRepository = fileSystemProjectRepository
  }

  /**
   * Execute registry sync
   *
   * @param {Object} input
   * @param {string[]} input.rootPaths - Root directories to scan
   * @param {boolean} [input.dryRun=false] - If true, don't save changes
   * @param {boolean} [input.removeOrphans=false] - Remove projects no longer on disk
   * @param {Function} [input.onProgress] - Progress callback (project) => void
   * @returns {Promise<SyncResult>}
   */
  async execute(input) {
    const { rootPaths, dryRun = false, removeOrphans = false, onProgress } = input

    if (!rootPaths || !Array.isArray(rootPaths) || rootPaths.length === 0) {
      throw new Error('SyncRegistryUseCase: rootPaths must be a non-empty array')
    }

    const result = {
      discovered: [],
      updated: [],
      unchanged: [],
      orphaned: [],
      errors: [],
      warnings: [],
      stats: {
        totalProjects: 0,
        withStatusFile: 0,
        active: 0,
        paused: 0,
        archived: 0
      }
    }

    // Scan all root paths for projects
    const allProjects = []
    for (const rootPath of rootPaths) {
      try {
        const projects = await this.fsProjectRepository.scan(rootPath, {
          useCache: false,
          forceRefresh: true
        })
        allProjects.push(...projects)
      } catch (error) {
        result.errors.push({
          path: rootPath,
          error: `Scan failed: ${error.message}`
        })
      }
    }

    result.stats.totalProjects = allProjects.length

    // Research projects (kind manuscript/program) encountered during a plain sync:
    // their metadata is preserved but NOT refreshed here, so we warn the user to
    // re-run `sync --from-status` (the authority for research metadata).
    const researchProjects = []

    // Process each discovered project
    for (const project of allProjects) {
      if (onProgress) onProgress(project)

      try {
        // Read .STATUS file if it exists
        const statusData = await this.statusFileGateway.read(project.path)

        if (statusData) {
          result.stats.withStatusFile++

          // Enrich project with status file data
          this._enrichProjectWithStatus(project, statusData)

          // Track status distribution
          const status = statusData.status?.toLowerCase()
          if (status === 'active') result.stats.active++
          else if (status === 'paused') result.stats.paused++
          else if (status === 'archived') result.stats.archived++
        }

        // Check if project already exists in registry
        const existing = await this.projectRepository.findById(project.id)

        const existingKind = existing && existing.metadata && existing.metadata.kind
        if (existingKind === 'manuscript' || existingKind === 'program') {
          researchProjects.push(existing.name || project.name)
        }

        if (existing) {
          // Check if anything changed
          if (this._hasChanged(existing, project)) {
            if (!dryRun) {
              // Preserve statistics from existing record
              project.totalSessions = existing.totalSessions
              project.totalDuration = existing.totalDuration
              // Preserve research metadata owned by `sync --from-status`.
              // The plain StatusFileGateway does not parse kind/target/tasks/priorityLabel,
              // so re-saving the scanned project would otherwise strip them on every update.
              this._preserveResearchMetadata(existing, project)
              await this.projectRepository.save(project)
            }
            result.updated.push(project)
          } else {
            result.unchanged.push(project)
          }
        } else {
          // New project
          if (!dryRun) {
            await this.projectRepository.save(project)
          }
          result.discovered.push(project)
        }
      } catch (error) {
        result.errors.push({
          path: project.path,
          error: error.message
        })
      }
    }

    // Check for orphaned projects (exist in registry but not on disk)
    if (removeOrphans) {
      const allRegistered = await this.projectRepository.findAll()
      const currentPaths = new Set(allProjects.map(p => p.path))

      for (const registered of allRegistered) {
        if (!currentPaths.has(registered.path)) {
          result.orphaned.push(registered)
          if (!dryRun) {
            await this.projectRepository.delete(registered.id)
          }
        }
      }
    }

    if (researchProjects.length > 0) {
      result.warnings.push({
        type: 'research-not-refreshed',
        projects: researchProjects,
        remedy: 'atlas sync --from-status'
      })
    }

    return result
  }

  /**
   * Enrich project entity with .STATUS file data
   * @private
   */
  _enrichProjectWithStatus(project, statusData) {
    // Set project metadata from status file
    project.metadata = project.metadata || {}

    if (statusData.status) {
      project.metadata.status = statusData.status
    }

    if (statusData.progress !== undefined) {
      project.metadata.progress = statusData.progress
    }

    if (statusData.type) {
      project.metadata.projectType = statusData.type
    }

    if (statusData.next && statusData.next.length > 0) {
      project.metadata.nextAction = statusData.next[0].action
      project.metadata.nextActions = statusData.next
    }

    if (statusData.metrics) {
      project.metadata.metrics = statusData.metrics
    }

    // Set focus from first next action.
    // Truncate to the Project description limit (parity with metadata.notes below):
    // some research .STATUS files yield a next-action longer than 500 chars, which
    // otherwise makes `new Project()` throw "description too long" during sync.
    if (statusData.next && statusData.next.length > 0) {
      project.description =
        project.description || (statusData.next[0].action || '').substring(0, 500)
    }

    // Parse body for additional context
    if (statusData.body) {
      project.metadata.notes = statusData.body.substring(0, 500)
    }
  }

  /**
   * Carry forward research metadata (kind/target/tasks/priorityLabel) from the
   * existing registry record onto the freshly-scanned project before saving.
   *
   * These fields are owned by `sync --from-status` (StatusFileParser); the
   * packages-only plain sync does not parse them, so without this the plain
   * sync would null them out on every update — silently undoing a research sync.
   * @private
   */
  _preserveResearchMetadata(existing, updated) {
    const existingMeta = existing.metadata || {}
    updated.metadata = updated.metadata || {}
    for (const key of ['kind', 'target', 'tasks', 'priorityLabel']) {
      if (updated.metadata[key] === undefined && existingMeta[key] !== undefined) {
        updated.metadata[key] = existingMeta[key]
      }
    }
  }

  /**
   * Check if project has changed since last sync
   * @private
   */
  _hasChanged(existing, updated) {
    // Compare key fields
    if (existing.type?.value !== updated.type?.value) return true
    if (existing.description !== updated.description) return true

    // Compare metadata
    const existingMeta = existing.metadata || {}
    const updatedMeta = updated.metadata || {}

    if (existingMeta.status !== updatedMeta.status) return true
    if (existingMeta.progress !== updatedMeta.progress) return true
    if (existingMeta.nextAction !== updatedMeta.nextAction) return true

    return false
  }
}

export default SyncRegistryUseCase
