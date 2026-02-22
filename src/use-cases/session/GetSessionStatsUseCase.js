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
import { BusinessRules } from '../../domain/constants/BusinessRules.js'

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

    // Flow state (sessions >= configured threshold)
    const flowSessions = sessions.filter(s => (s.getDuration?.() || 0) >= BusinessRules.SESSION_FLOW_STATE_MINUTES)
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

    // Time estimation accuracy
    const estimationStats = this.calculateEstimationStats(sessions)

    // Focus score
    const summary = {
      totalSessions,
      totalMinutes,
      flowSessions: flowSessions.length,
      flowPercentage,
      completedSessions: completedSessions.length,
      completionRate,
      dailyAverageMinutes,
      activeDays
    }
    const focusScore = this.calculateFocusScore(summary, streak)

    return {
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        endDate: now,
        projectFilter
      },
      summary,
      streak,
      focusScore,
      bestDay,
      hourlyDistribution,
      byProject,
      dailyBreakdown,
      estimation: estimationStats
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
      if (duration >= BusinessRules.SESSION_FLOW_STATE_MINUTES) {
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

  /**
   * Calculate weighted focus score (0-100) with tier classification
   *
   * Components:
   *   duration    (30%) — average session length vs thresholds
   *   flow        (30%) — percentage of sessions reaching flow state
   *   completion  (25%) — session completion rate
   *   consistency (15%) — streak / active days ratio
   *
   * @param {Object} summary - Summary stats from calculateStats
   * @param {Object} streak  - Streak data
   * @returns {Object} { score, grade, tier, components }
   */
  calculateFocusScore(summary, streak) {
    const {
      FOCUS_SCORE_WEIGHT_DURATION: wD,
      FOCUS_SCORE_WEIGHT_FLOW: wF,
      FOCUS_SCORE_WEIGHT_COMPLETION: wC,
      FOCUS_SCORE_WEIGHT_CONSISTENCY: wCon,
      FOCUS_SCORE_DURATION_EXCELLENT: durExc,
      FOCUS_SCORE_DURATION_GOOD: durGood,
      FOCUS_SCORE_DURATION_FAIR: durFair,
      FOCUS_TIER_DEEP,
      FOCUS_TIER_STRONG,
      FOCUS_TIER_STEADY,
      FOCUS_TIER_WARMING,
    } = BusinessRules

    // Duration component: average session length
    const avgDuration = summary.totalSessions > 0
      ? summary.totalMinutes / summary.totalSessions
      : 0
    let durationScore
    if (avgDuration >= durExc) durationScore = 100
    else if (avgDuration >= durGood) durationScore = 60 + ((avgDuration - durGood) / (durExc - durGood)) * 40
    else if (avgDuration >= durFair) durationScore = 30 + ((avgDuration - durFair) / (durGood - durFair)) * 30
    else durationScore = avgDuration > 0 ? (avgDuration / durFair) * 30 : 0

    // Flow component: percentage of flow sessions
    const flowScore = summary.flowPercentage

    // Completion component: completion rate
    const completionScore = summary.completionRate

    // Consistency component: streak strength relative to period
    const consistencyScore = Math.min(100, (streak.current / 7) * 100)

    // Weighted total
    const score = Math.round(
      durationScore * wD +
      flowScore * wF +
      completionScore * wC +
      consistencyScore * wCon
    )

    const clampedScore = Math.max(0, Math.min(100, score))

    // Grade
    let grade
    if (clampedScore >= 90) grade = 'A'
    else if (clampedScore >= 80) grade = 'A'
    else if (clampedScore >= 70) grade = 'B'
    else if (clampedScore >= 60) grade = 'B'
    else if (clampedScore >= 50) grade = 'C'
    else if (clampedScore >= 40) grade = 'C'
    else if (clampedScore >= 20) grade = 'D'
    else grade = 'F'

    // Tier classification
    const TIERS = [
      { min: FOCUS_TIER_DEEP,    symbol: '●', label: 'deep' },
      { min: FOCUS_TIER_STRONG,  symbol: '◕', label: 'strong' },
      { min: FOCUS_TIER_STEADY,  symbol: '◑', label: 'steady' },
      { min: FOCUS_TIER_WARMING, symbol: '◔', label: 'warming' },
      { min: 0,                  symbol: '○', label: 'drift' },
    ]
    const tierDef = TIERS.find(t => clampedScore >= t.min)
    const tierIndex = TIERS.indexOf(tierDef)
    const tier = {
      symbol: tierDef.symbol,
      label: tierDef.label,
      index: 4 - tierIndex, // 0=drift, 4=deep
    }

    return {
      score: clampedScore,
      grade,
      tier,
      components: {
        duration: Math.round(durationScore),
        flow: Math.round(flowScore),
        completion: Math.round(completionScore),
        consistency: Math.round(consistencyScore),
      }
    }
  }

  /**
   * Calculate time estimation accuracy statistics
   * @private
   */
  calculateEstimationStats(sessions) {
    // Filter to completed sessions with estimates
    const sessionsWithEstimates = sessions.filter(s =>
      s.estimatedMinutes &&
      s.estimatedMinutes > 0 &&
      s.outcome === 'completed'
    )

    if (sessionsWithEstimates.length === 0) {
      return {
        hasData: false,
        sessionsWithEstimates: 0,
        message: 'No sessions with time estimates yet'
      }
    }

    // Calculate accuracy metrics
    let totalPercentageOff = 0
    let underestimates = 0
    let overestimates = 0
    let accurate = 0

    for (const session of sessionsWithEstimates) {
      const actual = session.getDuration?.() || 0
      const estimated = session.estimatedMinutes
      const difference = actual - estimated
      const percentageOff = estimated > 0 ? (difference / estimated) * 100 : 0

      totalPercentageOff += percentageOff

      if (Math.abs(percentageOff) <= 10) {
        accurate++
      } else if (percentageOff > 0) {
        underestimates++
      } else {
        overestimates++
      }
    }

    const averagePercentageOff = Math.round(totalPercentageOff / sessionsWithEstimates.length)
    const accuracyRate = Math.round((accurate / sessionsWithEstimates.length) * 100)

    // Generate human-friendly message
    let message = ''
    if (accuracyRate >= 70) {
      message = `Great estimation! ${accuracyRate}% of estimates were accurate.`
    } else if (averagePercentageOff > 20) {
      message = `You tend to underestimate by ${averagePercentageOff}%. Try adding a buffer.`
    } else if (averagePercentageOff < -20) {
      message = `You tend to overestimate by ${Math.abs(averagePercentageOff)}%. You're faster than you think!`
    } else {
      message = `Your estimates are fairly balanced. ${accuracyRate}% were accurate.`
    }

    return {
      hasData: true,
      sessionsWithEstimates: sessionsWithEstimates.length,
      averagePercentageOff,        // positive = underestimate, negative = overestimate
      accuracyRate,                // % within 10% of estimate
      underestimates,              // count of sessions that took longer
      overestimates,               // count of sessions that took less
      accurate,                    // count of sessions within 10%
      bias: averagePercentageOff > 0 ? 'underestimate' : averagePercentageOff < 0 ? 'overestimate' : 'balanced',
      message
    }
  }
}
