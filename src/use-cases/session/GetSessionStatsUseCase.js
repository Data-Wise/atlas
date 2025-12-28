/**
 * GetSessionStatsUseCase
 *
 * Use Case: Calculate session analytics and statistics
 *
 * Responsibilities:
 * - Fetch sessions within date range
 * - Calculate aggregate metrics (total, average, flow %)
 * - Compute streak data using StreakCalculator
 * - Break down stats by project
 * - Analyze hourly distribution
 *
 * This is a pure business logic layer with no framework dependencies.
 */

import { StreakCalculator } from '../../utils/StreakCalculator.js'

export class GetSessionStatsUseCase {
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
   * @param {number} [input.days=7] - Number of days to analyze
   * @param {string} [input.period] - Period shorthand ('week', 'month', 'year')
   * @param {string} [input.project] - Filter by project name
   * @returns {Promise<Object>} Session statistics
   */
  async execute(input = {}) {
    const { days, project } = this.normalizeInput(input)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Fetch sessions in range
    const filters = {
      since: startDate,
      until: endDate,
      orderBy: 'startTime',
      order: 'desc'
    }

    if (project) {
      filters.project = project
    }

    const sessions = await this.sessionRepository.list(filters)

    // Calculate all metrics
    const stats = this.calculateStats(sessions, days, project)

    return stats
  }

  /**
   * Normalize input parameters
   * @private
   */
  normalizeInput(input) {
    let days = 7

    // Handle period shortcuts
    if (input.period) {
      const periodMap = {
        'week': 7,
        'month': 30,
        'year': 365,
        'today': 1,
        'yesterday': 2
      }
      days = periodMap[input.period.toLowerCase()] || 7
    } else if (input.days) {
      days = parseInt(input.days, 10)
      if (isNaN(days) || days < 1) {
        days = 7
      }
    }

    return {
      days,
      project: input.project || null
    }
  }

  /**
   * Calculate all statistics from sessions
   * @private
   */
  calculateStats(sessions, days, projectFilter) {
    const now = new Date()

    // Basic counts
    const totalSessions = sessions.length
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.getDuration?.() || 0), 0)

    // Flow state (sessions >= 15 minutes)
    const flowSessions = sessions.filter(s => (s.getDuration?.() || 0) >= 15)
    const flowPercentage = totalSessions > 0
      ? Math.round((flowSessions.length / totalSessions) * 100)
      : 0

    // Completion rate
    const completedSessions = sessions.filter(s => s.outcome === 'completed')
    const completionRate = totalSessions > 0
      ? Math.round((completedSessions.length / totalSessions) * 100)
      : 0

    // Daily average
    const activeDays = this.countActiveDays(sessions)
    const dailyAverageMinutes = activeDays > 0
      ? Math.round(totalMinutes / activeDays)
      : 0

    // Streak calculation
    const streakData = StreakCalculator.calculateStreak(sessions)
    const streak = {
      current: streakData.current,
      longest: streakData.longest,
      display: StreakCalculator.getStreakDisplay(streakData.current),
      message: StreakCalculator.getStreakMessage(streakData.current, streakData.longest)
    }

    // Best day
    const bestDay = this.findBestDay(sessions)

    // Hourly distribution (0-23)
    const hourlyDistribution = this.calculateHourlyDistribution(sessions)

    // Per-project breakdown
    const byProject = this.calculateProjectBreakdown(sessions)

    // Daily breakdown (last N days)
    const dailyBreakdown = this.calculateDailyBreakdown(sessions, days)

    return {
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        endDate: now,
        projectFilter
      },
      summary: {
        totalSessions,
        totalMinutes,
        flowSessions: flowSessions.length,
        flowPercentage,
        completedSessions: completedSessions.length,
        completionRate,
        dailyAverageMinutes,
        activeDays
      },
      streak,
      bestDay,
      hourlyDistribution,
      byProject,
      dailyBreakdown
    }
  }

  /**
   * Count unique days with sessions
   * @private
   */
  countActiveDays(sessions) {
    const days = new Set()
    for (const session of sessions) {
      if (session.startTime) {
        days.add(StreakCalculator.normalizeDate(session.startTime))
      }
    }
    return days.size
  }

  /**
   * Find the most productive day
   * @private
   */
  findBestDay(sessions) {
    if (sessions.length === 0) {
      return null
    }

    const dayTotals = {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    for (const session of sessions) {
      if (session.startTime) {
        const dateStr = StreakCalculator.normalizeDate(session.startTime)
        const dayOfWeek = new Date(session.startTime).getDay()
        const dayName = dayNames[dayOfWeek]

        if (!dayTotals[dateStr]) {
          dayTotals[dateStr] = { date: dateStr, dayName, minutes: 0, sessions: 0 }
        }
        dayTotals[dateStr].minutes += session.getDuration?.() || 0
        dayTotals[dateStr].sessions++
      }
    }

    // Find the day with most minutes
    let best = null
    for (const day of Object.values(dayTotals)) {
      if (!best || day.minutes > best.minutes) {
        best = day
      }
    }

    return best
  }

  /**
   * Calculate hourly activity distribution
   * @private
   */
  calculateHourlyDistribution(sessions) {
    const hourly = Array(24).fill(0)

    for (const session of sessions) {
      if (session.startTime) {
        const hour = new Date(session.startTime).getHours()
        hourly[hour] += session.getDuration?.() || 0
      }
    }

    return hourly
  }

  /**
   * Calculate per-project statistics
   * @private
   */
  calculateProjectBreakdown(sessions) {
    const byProject = {}

    for (const session of sessions) {
      const projectName = session.project || 'unknown'

      if (!byProject[projectName]) {
        byProject[projectName] = {
          name: projectName,
          sessions: 0,
          totalMinutes: 0,
          flowSessions: 0
        }
      }

      const duration = session.getDuration?.() || 0
      byProject[projectName].sessions++
      byProject[projectName].totalMinutes += duration
      if (duration >= 15) {
        byProject[projectName].flowSessions++
      }
    }

    // Calculate flow percentage and sort by total time
    const projects = Object.values(byProject)
      .map(p => ({
        ...p,
        flowPercentage: p.sessions > 0
          ? Math.round((p.flowSessions / p.sessions) * 100)
          : 0
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)

    return projects
  }

  /**
   * Calculate daily breakdown for the period
   * @private
   */
  calculateDailyBreakdown(sessions, days) {
    const daily = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Initialize all days in range
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = StreakCalculator.normalizeDate(date)
      const dayOfWeek = date.getDay()

      daily[dateStr] = {
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        sessions: 0,
        minutes: 0
      }
    }

    // Fill in session data
    for (const session of sessions) {
      if (session.startTime) {
        const dateStr = StreakCalculator.normalizeDate(session.startTime)
        if (daily[dateStr]) {
          daily[dateStr].sessions++
          daily[dateStr].minutes += session.getDuration?.() || 0
        }
      }
    }

    // Return as sorted array (most recent first)
    return Object.values(daily).sort((a, b) => b.date.localeCompare(a.date))
  }
}
