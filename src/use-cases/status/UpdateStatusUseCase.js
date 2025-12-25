/**
 * UpdateStatusUseCase
 *
 * Programmatically update .STATUS files in project directories.
 * Allows setting status, progress, next actions, and custom fields.
 */

export class UpdateStatusUseCase {
  /**
   * @param {Object} dependencies
   * @param {IProjectRepository} dependencies.projectRepository - Project storage
   * @param {StatusFileGateway} dependencies.statusFileGateway - .STATUS file read/write
   */
  constructor({ projectRepository, statusFileGateway }) {
    this.projectRepository = projectRepository
    this.statusFileGateway = statusFileGateway
  }

  /**
   * Update a project's .STATUS file
   *
   * @param {Object} input
   * @param {string} input.project - Project ID/path/name
   * @param {Object} [input.updates] - Fields to update
   * @param {string} [input.updates.status] - Status (active|paused|blocked|archived|complete)
   * @param {number} [input.updates.progress] - Progress percentage (0-100)
   * @param {string} [input.updates.focus] - Current focus/checkpoint
   * @param {Array} [input.updates.next] - Next actions
   * @param {string} [input.updates.type] - Project type
   * @param {Object} [input.updates.metrics] - Metrics to update
   * @param {string} [input.updates.body] - Body content
   * @param {boolean} [input.createIfMissing=false] - Create .STATUS if doesn't exist
   * @returns {Promise<UpdateResult>}
   */
  async execute(input) {
    const { project: projectId, updates = {}, createIfMissing = false } = input

    if (!projectId) {
      throw new Error('UpdateStatusUseCase: project is required')
    }

    // Find project
    let projectPath = projectId
    const project = await this.projectRepository.findById(projectId) ||
                    await this.projectRepository.findByPath(projectId)

    if (project) {
      projectPath = project.path
    }

    // Read existing .STATUS file
    let statusData = await this.statusFileGateway.read(projectPath)

    if (!statusData && !createIfMissing) {
      return {
        success: false,
        message: `No .STATUS file found at ${projectPath}. Use createIfMissing: true to create one.`
      }
    }

    // Initialize new status data if creating
    if (!statusData) {
      statusData = {
        status: 'active',
        progress: 0,
        type: 'generic',
        next: [],
        metrics: {},
        body: ''
      }
    }

    // Apply updates
    const changes = []

    if (updates.status !== undefined) {
      const validStatuses = ['active', 'paused', 'blocked', 'archived', 'complete', 'draft']
      if (!validStatuses.includes(updates.status)) {
        throw new Error(`Invalid status: ${updates.status}. Valid: ${validStatuses.join(', ')}`)
      }
      if (statusData.status !== updates.status) {
        changes.push(`status: ${statusData.status} → ${updates.status}`)
        statusData.status = updates.status
      }
    }

    if (updates.progress !== undefined) {
      const progress = parseInt(updates.progress, 10)
      if (isNaN(progress) || progress < 0 || progress > 100) {
        throw new Error('Progress must be a number between 0 and 100')
      }
      if (statusData.progress !== progress) {
        changes.push(`progress: ${statusData.progress}% → ${progress}%`)
        statusData.progress = progress
      }
    }

    if (updates.focus !== undefined) {
      changes.push(`focus: "${updates.focus}"`)
      statusData.checkpoint = updates.focus
    }

    if (updates.type !== undefined) {
      if (statusData.type !== updates.type) {
        changes.push(`type: ${statusData.type} → ${updates.type}`)
        statusData.type = updates.type
      }
    }

    if (updates.next !== undefined) {
      // Accept string or array
      if (typeof updates.next === 'string') {
        statusData.next = [{ action: updates.next, priority: 'medium' }]
      } else if (Array.isArray(updates.next)) {
        statusData.next = updates.next.map(item => {
          if (typeof item === 'string') {
            return { action: item, priority: 'medium' }
          }
          return item
        })
      }
      changes.push(`next: ${statusData.next.length} action(s)`)
    }

    if (updates.metrics !== undefined) {
      statusData.metrics = { ...statusData.metrics, ...updates.metrics }
      changes.push(`metrics: updated`)
    }

    if (updates.body !== undefined) {
      statusData.body = updates.body
      changes.push(`body: updated`)
    }

    // Add automatic metrics
    statusData.metrics = statusData.metrics || {}
    statusData.metrics.last_updated = new Date().toISOString().split('T')[0]

    // Write updated .STATUS file
    await this.statusFileGateway.write(projectPath, statusData)

    // Update project in registry if it exists
    if (project) {
      project.metadata = project.metadata || {}
      project.metadata.status = statusData.status
      project.metadata.progress = statusData.progress
      project.metadata.nextAction = statusData.next?.[0]?.action
      project.touch()
      await this.projectRepository.save(project)
    }

    return {
      success: true,
      path: projectPath,
      changes,
      message: changes.length > 0
        ? `Updated .STATUS: ${changes.join(', ')}`
        : 'No changes made'
    }
  }

  /**
   * Increment progress by a given amount
   *
   * @param {string} projectId - Project ID/path
   * @param {number} increment - Amount to increment (default: 10)
   * @returns {Promise<UpdateResult>}
   */
  async incrementProgress(projectId, increment = 10) {
    const project = await this.projectRepository.findById(projectId) ||
                    await this.projectRepository.findByPath(projectId)

    const projectPath = project?.path || projectId
    const statusData = await this.statusFileGateway.read(projectPath)

    if (!statusData) {
      throw new Error(`No .STATUS file found at ${projectPath}`)
    }

    const currentProgress = statusData.progress || 0
    const newProgress = Math.min(100, currentProgress + increment)

    return this.execute({
      project: projectId,
      updates: { progress: newProgress }
    })
  }

  /**
   * Mark a next action as complete and optionally add a new one
   *
   * @param {string} projectId - Project ID/path
   * @param {string} [newAction] - New action to add (optional)
   * @returns {Promise<UpdateResult>}
   */
  async completeNextAction(projectId, newAction = null) {
    const project = await this.projectRepository.findById(projectId) ||
                    await this.projectRepository.findByPath(projectId)

    const projectPath = project?.path || projectId
    const statusData = await this.statusFileGateway.read(projectPath)

    if (!statusData) {
      throw new Error(`No .STATUS file found at ${projectPath}`)
    }

    // Remove first action
    const completedAction = statusData.next?.shift()

    // Add new action if provided
    if (newAction) {
      statusData.next = statusData.next || []
      statusData.next.push({ action: newAction, priority: 'medium' })
    }

    // Write and return
    await this.statusFileGateway.write(projectPath, statusData)

    return {
      success: true,
      path: projectPath,
      completedAction: completedAction?.action,
      message: completedAction
        ? `✓ Completed: "${completedAction.action}"${newAction ? ` → Next: "${newAction}"` : ''}`
        : 'No action to complete'
    }
  }
}

export default UpdateStatusUseCase
