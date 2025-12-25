/**
 * TriageInboxUseCase - Process inbox items one by one
 *
 * Actions:
 * - assign: Assign to project and mark triaged
 * - skip: Leave in inbox for later
 * - archive: Dismiss without action
 * - convert: Convert to different type
 */

export class TriageInboxUseCase {
  constructor({ captureRepository, projectRepository, eventPublisher }) {
    this.captureRepository = captureRepository
    this.projectRepository = projectRepository
    this.eventPublisher = eventPublisher
  }

  /**
   * Get next inbox item to triage
   *
   * @returns {Promise<Capture|null>} Next item or null if inbox empty
   */
  async getNextItem() {
    const items = await this.captureRepository.findByStatus('inbox')
    if (items.length === 0) return null

    // Sort by age (oldest first for FIFO processing)
    items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    return items[0]
  }

  /**
   * Get inbox stats
   *
   * @returns {Promise<Object>} Stats about inbox
   */
  async getStats() {
    const inbox = await this.captureRepository.findByStatus('inbox')
    const triaged = await this.captureRepository.findByStatus('triaged')
    const archived = await this.captureRepository.findByStatus('archived')

    // Count by type
    const byType = {}
    for (const item of inbox) {
      byType[item.type] = (byType[item.type] || 0) + 1
    }

    return {
      inbox: inbox.length,
      triaged: triaged.length,
      archived: archived.length,
      byType
    }
  }

  /**
   * Assign capture to project and mark triaged
   *
   * @param {string} captureId - Capture ID
   * @param {string} projectId - Project to assign to
   * @param {Object} [options] - Additional options
   * @param {string} [options.type] - Change type
   * @param {string[]} [options.tags] - Add tags
   * @returns {Promise<Object>} Result
   */
  async assign(captureId, projectId, options = {}) {
    const capture = await this.captureRepository.findById(captureId)
    if (!capture) {
      throw new Error(`Capture not found: ${captureId}`)
    }

    // Verify project exists
    const project = await this.projectRepository.findById(projectId) ||
                    await this.projectRepository.findByPath(projectId)
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // Triage the capture
    capture.triage({
      project: project.name || projectId,
      type: options.type,
      tags: options.tags
    })

    await this.captureRepository.save(capture)

    if (this.eventPublisher) {
      this.eventPublisher.publish('capture:triaged', {
        captureId: capture.id,
        project: project.name
      })
    }

    return {
      success: true,
      capture,
      message: `Assigned to ${project.name}`
    }
  }

  /**
   * Archive (dismiss) a capture
   *
   * @param {string} captureId - Capture ID
   * @returns {Promise<Object>} Result
   */
  async archive(captureId) {
    const capture = await this.captureRepository.findById(captureId)
    if (!capture) {
      throw new Error(`Capture not found: ${captureId}`)
    }

    capture.archive()
    await this.captureRepository.save(capture)

    if (this.eventPublisher) {
      this.eventPublisher.publish('capture:archived', {
        captureId: capture.id
      })
    }

    return {
      success: true,
      capture,
      message: 'Archived'
    }
  }

  /**
   * Convert capture to different type
   *
   * @param {string} captureId - Capture ID
   * @param {string} newType - New type (idea|task|bug|note|question)
   * @returns {Promise<Object>} Result
   */
  async convert(captureId, newType) {
    const capture = await this.captureRepository.findById(captureId)
    if (!capture) {
      throw new Error(`Capture not found: ${captureId}`)
    }

    const oldType = capture.type
    capture.type = newType
    await this.captureRepository.save(capture)

    return {
      success: true,
      capture,
      message: `Converted: ${oldType} → ${newType}`
    }
  }

  /**
   * Delete a capture permanently
   *
   * @param {string} captureId - Capture ID
   * @returns {Promise<Object>} Result
   */
  async delete(captureId) {
    const deleted = await this.captureRepository.delete(captureId)

    return {
      success: deleted,
      message: deleted ? 'Deleted' : 'Not found'
    }
  }

  /**
   * Process multiple items in batch
   *
   * @param {string[]} captureIds - Capture IDs
   * @param {string} action - Action: archive|delete
   * @returns {Promise<Object>} Result
   */
  async batchProcess(captureIds, action) {
    const results = { processed: 0, failed: 0, errors: [] }

    for (const id of captureIds) {
      try {
        if (action === 'archive') {
          await this.archive(id)
        } else if (action === 'delete') {
          await this.delete(id)
        }
        results.processed++
      } catch (err) {
        results.failed++
        results.errors.push({ id, error: err.message })
      }
    }

    return {
      success: results.failed === 0,
      ...results,
      message: `Processed ${results.processed}, failed ${results.failed}`
    }
  }
}

export default TriageInboxUseCase
