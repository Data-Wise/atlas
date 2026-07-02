/**
 * RemoveTaskUseCase
 * Deletes a task from the repository.
 */
export class RemoveTaskUseCase {
  constructor({ taskRepository, eventPublisher }) {
    this.taskRepository = taskRepository
    this.eventPublisher = eventPublisher
  }

  /**
   * Execute the use case
   * @param {Object} params
   * @param {string} params.taskId - ID of the task to delete
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async execute({ taskId }) {
    if (!taskId) {
      throw new Error('Task ID is required')
    }

    const task = await this.taskRepository.findById(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    const deleted = await this.taskRepository.delete(taskId)

    if (deleted && this.eventPublisher) {
      this.eventPublisher.publish({
        type: 'TaskRemoved',
        payload: { id: taskId },
        timestamp: new Date().toISOString()
      })
    }

    return deleted
  }
}

export default RemoveTaskUseCase
