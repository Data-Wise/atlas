/**
 * EndSessionUseCase
 *
 * Use Case: End an active work session
 *
 * Responsibilities:
 * - Find active session
 * - End the session (domain logic)
 * - Update project statistics
 * - Persist changes
 * - Return ended session
 *
 * This is a pure business logic layer with no framework dependencies.
 */

export class EndSessionUseCase {
  /**
   * @param {ISessionRepository} sessionRepository
   * @param {IProjectRepository} projectRepository
   * @param {GitGateway} [gitGateway] - Optional; when present, computes an evidence delta
   *   (commits/files since session start) instead of trusting an unchecked outcome
   * @param {SyncFromStatusUseCase} [syncFromStatusUseCase] - Optional; when present, runs a
   *   registry sync scoped to the session's project right after the session ends
   */
  constructor(sessionRepository, projectRepository, gitGateway = null, syncFromStatusUseCase = null) {
    this.sessionRepository = sessionRepository
    this.projectRepository = projectRepository
    this.gitGateway = gitGateway
    this.syncFromStatusUseCase = syncFromStatusUseCase
  }

  /**
   * Execute the use case
   *
   * @param {Object} input
   * @param {string} [input.sessionId] - Optional session ID (defaults to active session)
   * @param {string} [input.outcome] - Session outcome (completed, cancelled, interrupted)
   * @returns {Promise<Object>} { session, gitDelta, synced }
   */
  async execute(input = {}) {
    // Find the session to end
    let session
    if (input.sessionId) {
      session = await this.sessionRepository.findById(input.sessionId)
      if (!session) {
        throw new Error(`Session not found: ${input.sessionId}`)
      }
    } else {
      // Default to active session
      session = await this.sessionRepository.findActive()
      if (!session) {
        throw new Error('No active session found to end')
      }
    }

    // Validate outcome if provided
    const outcome = input.outcome || 'completed'
    const validOutcomes = ['completed', 'cancelled', 'interrupted']
    if (!validOutcomes.includes(outcome)) {
      throw new Error(`Invalid outcome: ${outcome}. Must be one of: ${validOutcomes.join(', ')}`)
    }

    // Resolve the project's path BEFORE ending, so we can compute the evidence delta
    // and scope the post-end sync. Best-effort: a project not (yet) in the registry,
    // or a non-git path, degrades to gitDelta: null rather than failing session end.
    let projectRecord = null
    if (session.project) {
      try {
        projectRecord = await this._resolveProject(session.project)
      } catch {
        projectRecord = null
      }
    }

    let gitDelta = null
    if (this.gitGateway && projectRecord?.path && session.startTime) {
      try {
        gitDelta = await this.gitGateway.getDelta(projectRecord.path, session.startTime)
      } catch (error) {
        console.warn(`Failed to compute git delta: ${error.message}`)
        gitDelta = null
      }
    }

    // End the session (domain logic handles validation)
    session.end(outcome)

    // Update project statistics
    if (session.project) {
      try {
        const project = projectRecord || (await this._resolveProject(session.project))
        if (project) {
          const duration = session.getDuration()
          project.recordSession(duration)
          await this.projectRepository.save(project)
        }
      } catch (error) {
        // Non-critical: Project statistics update failure shouldn't prevent session ending
        console.warn(`Failed to update project statistics: ${error.message}`)
      }
    }

    // Persist the ended session
    const savedSession = await this.sessionRepository.save(session)

    // Registry rot ends here: auto-sync scoped to this session's project, best-effort.
    let synced = false
    if (this.syncFromStatusUseCase && projectRecord?.path) {
      try {
        await this.syncFromStatusUseCase.execute({
          rootPath: projectRecord.path,
          options: { maxDepth: 0 }
        })
        synced = true
      } catch (error) {
        console.warn(`Failed to sync registry after session end: ${error.message}`)
      }
    }

    return { session: savedSession, gitDelta, synced }
  }

  /**
   * Resolve a project record from a session's `project` field, which may be
   * an id, a path, or (most commonly) a bare project name. Tries id/path
   * lookups first (cheap, indexed), then falls back to scanning the full
   * project list by name.
   * @private
   */
  async _resolveProject(projectRef) {
    const byId = await this.projectRepository.findById(projectRef)
    if (byId) return byId

    const byPath = await this.projectRepository.findByPath(projectRef)
    if (byPath) return byPath

    const lister = this.projectRepository.findAll || this.projectRepository.list
    if (typeof lister === 'function') {
      try {
        const all = await lister.call(this.projectRepository)
        return all.find(p => p.name === projectRef) || null
      } catch {
        return null
      }
    }

    return null
  }
}
