/**
 * GetDigestUseCase
 *
 * Composes the existing "where was I" and "what's next" read paths
 * (GetContextUseCase + PlanDayUseCase internals) plus the project's
 * .STATUS focus/next fields into a single glanceable digest object.
 *
 * This backs bare `atlas` (no args) — one answer to "what am I doing /
 * what's next" instead of four surfaces (plan/where/status/dash) that can
 * disagree. No new storage is introduced; this is a pure composition layer.
 *
 * @module use-cases/context/GetDigestUseCase
 */

export class GetDigestUseCase {
  /**
   * @param {Object} dependencies
   * @param {GetContextUseCase} dependencies.getContextUseCase
   * @param {PlanDayUseCase} dependencies.planDayUseCase
   * @param {StatusFileGateway} [dependencies.statusFileGateway] - Optional .STATUS reader
   * @param {IProjectRepository} [dependencies.projectRepository] - Optional, to resolve project path
   */
  constructor({ getContextUseCase, planDayUseCase, statusFileGateway, projectRepository }) {
    if (!getContextUseCase) throw new Error('getContextUseCase is required')
    if (!planDayUseCase) throw new Error('planDayUseCase is required')

    this.getContextUseCase = getContextUseCase
    this.planDayUseCase = planDayUseCase
    this.statusFileGateway = statusFileGateway || null
    this.projectRepository = projectRepository || null
  }

  /**
   * Build the digest
   *
   * @param {Object} [input]
   * @param {string} [input.project] - Project name to scope focus/next to (defaults to active session's project)
   * @returns {Promise<Object>} Digest
   */
  async execute({ project } = {}) {
    const [context, plan] = await Promise.all([
      this.getContextUseCase.execute({ project }),
      this.planDayUseCase.execute({})
    ])

    const activeProject = context.project || project || null

    let focus = context.focus || null
    let next = []

    if (activeProject && this.statusFileGateway) {
      try {
        const projectPath = await this._resolveProjectPath(activeProject)
        if (projectPath) {
          const statusData = await this.statusFileGateway.read(projectPath)
          if (statusData) {
            if (statusData.checkpoint) focus = statusData.checkpoint
            next = (statusData.next || [])
              .map(item => (typeof item === 'string' ? item : item.action))
              .filter(Boolean)
              .slice(0, 3)
          }
        }
      } catch {
        // Missing/unreadable .STATUS — degrade gracefully, digest still renders
      }
    }

    return {
      activeSession: context.session || null,
      project: activeProject,
      focus,
      next,
      inboxCount: context.inboxCount || 0,
      streak: plan.streak || null,
      suggestions: (plan.suggestions || []).slice(0, 3)
    }
  }

  /**
   * @private
   */
  async _resolveProjectPath(projectName) {
    if (!this.projectRepository) return null
    try {
      const proj =
        (await this.projectRepository.findById(projectName)) ||
        (await this.projectRepository.findByPath(projectName))
      return proj?.path || null
    } catch {
      return null
    }
  }
}

export default GetDigestUseCase
