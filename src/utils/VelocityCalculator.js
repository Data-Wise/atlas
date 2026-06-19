/**
 * VelocityCalculator
 *
 * Tracks sessions/week and focus-hours/week over a rolling 4-week window.
 * Window: 4 complete ISO weeks ending at the start of the current week
 * (excludes the in-progress week to avoid partial-week skew).
 */

const SPARKLINE_CHARS = '▁▂▃▄▅▆▇█'
const WEEK_COUNT = 4

/**
 * Returns ISO week label "YYYY-WWW" for a given Date.
 * @param {Date} date
 * @returns {string}
 */
function isoWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  const year = d.getUTCFullYear()
  return `${year}-W${String(week).padStart(2, '0')}`
}

/**
 * Returns the Monday of the ISO week containing the given date (UTC midnight).
 * @param {Date} date
 * @returns {Date}
 */
function isoWeekMonday(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - (day - 1))
  return d
}

export class VelocityCalculator {
  constructor(sessions) {
    this._sessions = sessions || []
  }

  calculate() {
    if (this._sessions.length === 0) {
      return { weeksData: [], trend: 'stable', sparkline: '' }
    }

    // Compute the Monday of the current (in-progress) week
    const now = new Date()
    const currentWeekMonday = isoWeekMonday(now)

    // Build the 4 target week windows: 4 weeks before current week
    const weeks = []
    for (let i = WEEK_COUNT; i >= 1; i--) {
      const weekStart = new Date(currentWeekMonday)
      weekStart.setUTCDate(weekStart.getUTCDate() - i * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
      weeks.push({ start: weekStart, end: weekEnd })
    }

    // Filter to only sessions with valid durations that have ended
    const validSessions = this._sessions.filter(s => {
      if (!s.startTime) return false
      const dur = typeof s.getDuration === 'function' ? s.getDuration() : null
      return dur !== null && dur > 0
    })

    // Bucket sessions into the 4 target weeks
    const weeksData = weeks.map(({ start, end }) => {
      const weekSessions = validSessions.filter(s => {
        const t = s.startTime instanceof Date ? s.startTime : new Date(s.startTime)
        return t >= start && t < end
      })

      const sessionCount = weekSessions.length
      const totalMinutes = weekSessions.reduce((sum, s) => sum + s.getDuration(), 0)
      const focusHours = Math.round((totalMinutes / 60) * 100) / 100

      // Consistency: distinct calendar days with at least one session / 7
      const distinctDays = new Set(
        weekSessions.map(s => {
          const t = s.startTime instanceof Date ? s.startTime : new Date(s.startTime)
          return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`
        })
      ).size
      const consistency = Math.round((distinctDays / 7) * 100) / 100

      const weekStart = start instanceof Date ? start : new Date(start)

      return {
        week: isoWeekLabel(weekStart),
        sessionCount,
        focusHours,
        consistency,
      }
    })

    // Only include weeks that fall within available history
    const firstSessionTime = validSessions.reduce((earliest, s) => {
      const t = s.startTime instanceof Date ? s.startTime : new Date(s.startTime)
      return t < earliest ? t : earliest
    }, new Date())

    const firstWeekMonday = isoWeekMonday(firstSessionTime)
    const trimmedWeeks = weeksData.filter((_, i) => {
      return weeks[i].end > firstWeekMonday
    })

    const trend = this._computeTrend(trimmedWeeks)
    const sparkline = this._computeSparkline(trimmedWeeks)

    return { weeksData: trimmedWeeks, trend, sparkline }
  }

  _computeTrend(weeksData) {
    if (weeksData.length < 2) return 'stable'

    const mid = Math.floor(weeksData.length / 2)
    const early = weeksData.slice(0, mid)
    const recent = weeksData.slice(weeksData.length - mid)

    const meanEarly = early.reduce((s, w) => s + w.focusHours, 0) / early.length
    const meanRecent = recent.reduce((s, w) => s + w.focusHours, 0) / recent.length

    if (meanEarly === 0) return meanRecent > 0 ? 'up' : 'stable'

    const delta = (meanRecent - meanEarly) / meanEarly
    if (delta > 0.1) return 'up'
    if (delta < -0.1) return 'down'
    return 'stable'
  }

  _computeSparkline(weeksData) {
    if (weeksData.length === 0) return ''
    const values = weeksData.map(w => w.focusHours)
    const max = Math.max(...values)
    if (max === 0) return weeksData.map(() => SPARKLINE_CHARS[0]).join('')
    return values
      .map(v => {
        const idx = Math.min(7, Math.round((v / max) * 7))
        return SPARKLINE_CHARS[idx]
      })
      .join('')
  }
}
