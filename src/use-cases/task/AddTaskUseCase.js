/**
 * AddTaskUseCase
 * Creates and persists a new Task entity.
 */
import { Task } from '../../domain/entities/Task.js'

export class AddTaskUseCase {
  constructor({ taskRepository, eventPublisher }) {
    this.taskRepository = taskRepository
    this.eventPublisher = eventPublisher
  }

  /**
   * Execute the use case
   * @param {Object} params
   * @param {string} params.description - Task description
   * @param {Object} [params.options] - Optional task properties
   * @returns {Promise<Task>} The created task
   */
  async execute({ description, options = {} }) {
    if (!description?.trim()) {
      throw new Error('Task description is required')
    }

    const id = `tsk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Parse dueDate if provided as string
    let parsedDueDate = options.dueDate || null
    if (parsedDueDate && typeof parsedDueDate === 'string') {
      parsedDueDate = new Date(parsedDueDate)
      if (isNaN(parsedDueDate.getTime())) {
        throw new Error('Invalid due date format')
      }
    }

    const task = new Task(id, description.trim(), {
      ...options,
      dueDate: parsedDueDate
    })

    await this.taskRepository.save(task)

    if (this.eventPublisher) {
      this.eventPublisher.publish({
        type: 'TaskAdded',
        payload: task.toJSON(),
        timestamp: new Date().toISOString()
      })
    }

    return task
  }
}

export default AddTaskUseCase
