/**
 * ExportSessionsUseCase
 *
 * Use Case: Export sessions to calendar format (iCal/ICS)
 *
 * Responsibilities:
 * - Fetch sessions within date range
 * - Convert sessions to iCal VEVENT format
 * - Generate valid ICS file content
 *
 * This is a pure business logic layer with no framework dependencies.
 */

export class ExportSessionsUseCase {
  /**
   * @param {ISessionRepository} sessionRepository
   */
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository
  }

  /**
   * Execute the use case
   *
   * @param {Object} input
   * @param {number} [input.days=30] - Number of days to export
   * @param {string} [input.period] - Period shorthand ('week', 'month', 'year')
   * @param {string} [input.project] - Filter by project name
   * @param {string} [input.format='ical'] - Export format ('ical', 'json')
   * @returns {Promise<Object>} Export result with content and metadata
   */
  async execute(input = {}) {
    const { days, project, format } = this.normalizeInput(input)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Fetch sessions in range
    const filters = {
      since: startDate,
      until: endDate,
      orderBy: 'startTime',
      order: 'asc'
    }

    if (project) {
      filters.project = project
    }

    const sessions = await this.sessionRepository.list(filters)

    // Generate export content
    let content
    if (format === 'json') {
      content = this.generateJSON(sessions)
    } else {
      content = this.generateICS(sessions)
    }

    return {
      content,
      format,
      sessionCount: sessions.length,
      period: { days, startDate, endDate },
      project: project || null
    }
  }

  /**
   * Normalize input parameters
   * @private
   */
  normalizeInput(input) {
    let days = 30

    // Handle period shortcuts
    if (input.period) {
      const periodMap = {
        'week': 7,
        'month': 30,
        'year': 365,
        'today': 1,
        'all': 3650 // ~10 years
      }
      days = periodMap[input.period.toLowerCase()] || 30
    } else if (input.days) {
      days = parseInt(input.days, 10)
      if (isNaN(days) || days < 1) {
        days = 30
      }
    }

    return {
      days,
      project: input.project || null,
      format: input.format || 'ical'
    }
  }

  /**
   * Generate ICS calendar content
   * @private
   */
  generateICS(sessions) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Atlas//Session Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Atlas Sessions'
    ]

    for (const session of sessions) {
      const event = this.sessionToVEVENT(session)
      lines.push(...event)
    }

    lines.push('END:VCALENDAR')

    return lines.join('\r\n')
  }

  /**
   * Convert a session to VEVENT lines
   * @private
   */
  sessionToVEVENT(session) {
    const uid = `${session.id}@atlas`
    const dtstamp = this.formatICSDate(new Date())
    const dtstart = this.formatICSDate(session.startTime)
    const dtend = this.formatICSDate(session.endTime || new Date())

    const summary = this.escapeICS(`Atlas: ${session.project}`)
    const description = this.buildDescription(session)

    const lines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`
    ]

    if (description) {
      lines.push(`DESCRIPTION:${this.escapeICS(description)}`)
    }

    // Add categories for filtering in calendar apps
    lines.push(`CATEGORIES:Atlas,Work Session`)

    // Add outcome as status
    if (session.outcome) {
      const status = session.outcome === 'completed' ? 'CONFIRMED' : 'TENTATIVE'
      lines.push(`STATUS:${status}`)
    }

    lines.push('END:VEVENT')

    return lines
  }

  /**
   * Build session description
   * @private
   */
  buildDescription(session) {
    const parts = []

    if (session.task && session.task !== 'Work session') {
      parts.push(`Task: ${session.task}`)
    }

    const duration = session.getDuration ? session.getDuration() : 0
    if (duration > 0) {
      parts.push(`Duration: ${duration} minutes`)
    }

    if (session.outcome) {
      parts.push(`Outcome: ${session.outcome}`)
    }

    if (session.branch && session.branch !== 'main') {
      parts.push(`Branch: ${session.branch}`)
    }

    return parts.join('\\n')
  }

  /**
   * Format date for ICS (YYYYMMDDTHHmmssZ format)
   * @private
   */
  formatICSDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  /**
   * Escape special characters for ICS
   * @private
   */
  escapeICS(str) {
    if (!str) return ''
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  /**
   * Generate JSON export
   * @private
   */
  generateJSON(sessions) {
    const events = sessions.map(session => ({
      id: session.id,
      project: session.project,
      task: session.task,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.getDuration ? session.getDuration() : 0,
      outcome: session.outcome,
      branch: session.branch
    }))

    return JSON.stringify(events, null, 2)
  }
}
