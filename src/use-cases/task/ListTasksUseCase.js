/**
 * ListTasksUseCase
 * Retrieves tasks with optional filtering and search capabilities.
 */
export class ListTasksUseCase {
  constructor({ taskRepository }) {
    this.taskRepository = taskRepository
  }

  /**
   * Execute the use case
   * @param {Object} [filters]
   * @param {string} [filters.project] - Filter by project ID
   * @param {boolean} [filters.completed] - Filter by completion status
   * @param {boolean} [filters.overdue] - Filter to overdue tasks only
   * @param {boolean} [filters.dueSoon] - Filter to due soon tasks only
   * @param {string} [filters.query] - Free-text search query
   * @returns {Promise<Task[]>} Filtered tasks
   */
  async execute(filters = {}) {
    let tasks = []

    if (filters.query) {
      tasks = await this.taskRepository.search(filters.query)
    } else {
      tasks = await this.taskRepository.findAll()
    }

    if (filters.project) {
      tasks = tasks.filter(t => t.projectId === filters.project)
    }

    if (filters.completed !== undefined) {
      tasks = tasks.filter(t => t.completed === filters.completed)
    }

    if (filters.overdue === true) {
      tasks = tasks.filter(t => t.isOverdue())
    }

    if (filters.dueSoon === true) {
      tasks = tasks.filter(t => t.isDueSoon())
    }

    return tasks
  }
}

export default ListTasksUseCase
