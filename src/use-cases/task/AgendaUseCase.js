/**
 * AgendaUseCase
 * Queries Tasks and ScheduleRecords within a window, merging them into the pinned agenda contract.
 */
export class AgendaUseCase {
  constructor({ taskRepository, scheduleRecordRepository, projectRepository }) {
    this.taskRepository = taskRepository
    this.scheduleRecordRepository = scheduleRecordRepository
    this.projectRepository = projectRepository
  }

  /**
   * Execute the use case
   * @param {Object} params
   * @param {number} params.windowDays - Number of days in the window (inclusive)
   * @returns {Promise<Array>} Merged agenda items
   */
  async execute({ windowDays }) {
    const window = parseInt(windowDays, 10)
    if (isNaN(window) || window < 0) {
      throw new Error('windowDays must be a non-negative integer')
    }

    // Calculate timezone-safe date strings for the window
    const now = new Date()
    const tzOffset = now.getTimezoneOffset() * 60000
    const localToday = new Date(now.getTime() - tzOffset)
    const todayStr = localToday.toISOString().split('T')[0]

    const localEnd = new Date(now.getTime() - tzOffset + (window * 24 * 60 * 60 * 1000))
    const endStr = localEnd.toISOString().split('T')[0]

    // Fetch sources
    const [tasks, scheduleRecords] = await Promise.all([
      this.taskRepository.findAll(),
      this.scheduleRecordRepository.findAll()
    ])

    // Load projects to map task types
    const projects = await this.projectRepository.findAll()
    const projectTypeMap = new Map(projects.map(p => [p.id, p.type]))

    const agendaItems = []

    // 1. Process Tasks
    // Include incomplete tasks that have a due date in the window (and include overdue tasks too)
    const activeTasks = tasks.filter(t => !t.completed && t.dueDate)
    for (const task of activeTasks) {
      const taskDate = new Date(task.dueDate)
      const taskLocal = new Date(taskDate.getTime() - tzOffset)
      const taskDateStr = taskLocal.toISOString().split('T')[0]

      // Filter: within window [overdue, today + windowDays]
      if (taskDateStr <= endStr) {
        // Resolve type from project or tags
        let type = 'general'
        const projType = projectTypeMap.get(task.projectId)
        if (projType === 'r-package' || projType === 'quarto' || projType === 'research') {
          type = 'research'
        } else if (projType === 'teaching') {
          type = 'teaching'
        } else if (task.tags.includes('research')) {
          type = 'research'
        } else if (task.tags.includes('teaching')) {
          type = 'teaching'
        }

        agendaItems.push({
          date: taskDateStr,
          label: task.description,
          type,
          project: task.projectId || '',
          recurrence: task.metadata?.recurrence || 'none'
        })
      }
    }

    // 2. Process ScheduleRecords
    const activeRecords = scheduleRecords.filter(r => r.date >= todayStr && r.date <= endStr)
    for (const record of activeRecords) {
      agendaItems.push(record.toAgendaItem())
    }

    // Sort: date ASC, then project, then label
    agendaItems.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date)
      }
      const projA = a.project || ''
      const projB = b.project || ''
      if (projA !== projB) {
        return projA.localeCompare(projB)
      }
      return a.label.localeCompare(b.label)
    })

    return agendaItems
  }
}

export default AgendaUseCase
