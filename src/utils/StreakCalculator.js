/**
 * StreakCalculator - Calculates consecutive day streaks from session data
 *
 * ADHD-friendly feature: Visual reinforcement of habit building
 * Tracks consecutive days where at least one session was completed.
 */

export class StreakCalculator {
  /**
   * Calculate current streak from sessions
   * @param {Session[]} sessions - Array of session objects with startTime
   * @returns {{current: number, longest: number, lastActiveDate: Date|null}}
   */
  static calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) {
      return { current: 0, longest: 0, lastActiveDate: null }
    }

    // Get unique dates with sessions (normalize to YYYY-MM-DD strings in local time)
    const sessionDates = new Set()
    for (const session of sessions) {
      if (session.startTime) {
        const dateStr = StreakCalculator.normalizeDate(session.startTime)
        sessionDates.add(dateStr)
      }
    }

    // Convert to sorted array of date strings (most recent first)
    const sortedDateStrs = Array.from(sessionDates).sort().reverse()

    if (sortedDateStrs.length === 0) {
      return { current: 0, longest: 0, lastActiveDate: null }
    }

    const lastDateStr = sortedDateStrs[0]
    const today = StreakCalculator.normalizeDate(new Date())
    const yesterday = StreakCalculator.normalizeDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    )

    // Find the original session date for lastActiveDate
    let lastActiveDate = null
    for (const session of sessions) {
      if (session.startTime && StreakCalculator.normalizeDate(session.startTime) === lastDateStr) {
        lastActiveDate = session.startTime
        break
      }
    }

    // Calculate current streak
    let currentStreak = 0

    // Streak is valid if last session was today or yesterday
    if (lastDateStr === today || lastDateStr === yesterday) {
      currentStreak = 1

      // Walk backwards counting consecutive days
      if (sortedDateStrs.length > 1) {
        let expectedDate = StreakCalculator.addDays(lastDateStr, -1)
        for (let i = 1; i < sortedDateStrs.length; i++) {
          if (sortedDateStrs[i] === expectedDate) {
            currentStreak++
            expectedDate = StreakCalculator.addDays(expectedDate, -1)
          } else {
            break
          }
        }
      }
    }

    // Calculate longest streak ever
    let longestStreak = 1
    let tempStreak = 1

    for (let i = 0; i < sortedDateStrs.length - 1; i++) {
      const expectedPrev = StreakCalculator.addDays(sortedDateStrs[i], -1)
      if (sortedDateStrs[i + 1] === expectedPrev) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    return {
      current: currentStreak,
      longest: longestStreak,
      lastActiveDate
    }
  }

  /**
   * Normalize date to YYYY-MM-DD string (local timezone)
   * @param {Date} date
   * @returns {string}
   */
  static normalizeDate(date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  /**
   * Add days to a YYYY-MM-DD date string
   * @param {string} dateStr - Date in YYYY-MM-DD format
   * @param {number} days - Days to add (negative to subtract)
   * @returns {string} - New date in YYYY-MM-DD format
   */
  static addDays(dateStr, days) {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() + days)
    return StreakCalculator.normalizeDate(date)
  }

  /**
   * Get streak display with emoji
   * @param {number} streak - Current streak count
   * @returns {string}
   */
  static getStreakDisplay(streak) {
    if (streak === 0) return ''
    if (streak === 1) return '🔥 1 day'
    if (streak < 7) return `🔥 ${streak} days`
    if (streak < 30) return `🔥🔥 ${streak} days`
    return `🔥🔥🔥 ${streak} days`
  }

  /**
   * Get streak message for ADHD encouragement
   * @param {number} current - Current streak
   * @param {number} longest - Longest streak
   * @returns {string}
   */
  static getStreakMessage(current, longest) {
    if (current === 0) {
      return 'Start a session to begin your streak!'
    }
    if (current === 1) {
      return 'Day 1 - Every journey starts with a single step!'
    }
    if (current === longest && current > 1) {
      return `New personal best! ${current} days in a row!`
    }
    if (current >= 7) {
      return `Amazing! ${current} days strong! 🎯`
    }
    if (current >= 3) {
      return `Building momentum! ${current} days!`
    }
    return `${current} days and counting!`
  }
}
