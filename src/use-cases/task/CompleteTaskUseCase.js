/**
 * CompleteTaskUseCase
 * Marks a task as completed.
 */
export class CompleteTaskUseCase {
  constructor({ taskRepository, eventPublisher }) {
    this.taskRepository = taskRepository
    this.eventPublisher = eventPublisher
  }

  /**
   * Execute the use case
   * @param {Object} params
   * @param {string} params.taskId - ID of the task to complete
   * @returns {Promise<Task>} The completed task
   */
  async execute({ taskId }) {
    if (!taskId) {
      throw new Error('Task ID is required')
    }

    const task = await this.taskRepository.findById(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    task.complete()
    await this.taskRepository.save(task)

    if (this.eventPublisher) {
      this.eventPublisher.publish({
        type: 'TaskCompleted',
        payload: task.toJSON(),
        timestamp: new Date().toISOString()
      })
    }

    return task
  }
}

export default CompleteTaskUseCase
