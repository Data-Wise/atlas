/**
 * TimeBlindnessHelper - Gentle time awareness for ADHD users
 *
 * ADHD-friendly feature: Combat time blindness without breaking flow
 *
 * Time blindness is a common ADHD trait where people lose track of time,
 * especially during hyperfocus. This helper provides:
 * - Gentle, non-intrusive time cues
 * - Milestone-based awareness (not constant nagging)
 * - Encouraging messages that don't break concentration
 * - Break suggestions at healthy intervals
 */

export class TimeBlindnessHelper {
  // Time milestones in minutes for gentle cues
  static MILESTONES = [15, 30, 45, 60, 90, 120, 150, 180]

  // Break suggestions (in minutes) - research-based intervals
  static BREAK_INTERVALS = {
    micro: 25,      // Pomodoro-style micro break
    short: 50,      // Short break after focused work
    long: 90,       // Ultradian rhythm - natural energy cycle
    extended: 180   // Maximum recommended focus time
  }

  /**
   * Get time awareness message for current session duration
   * @param {number} durationMinutes - Current session duration in minutes
   * @returns {{message: string, milestone: number|null, suggestBreak: boolean, breakType: string|null}}
   */
  static getTimeAwareness(durationMinutes) {
    const milestone = this._findMilestone(durationMinutes)
    const breakSuggestion = this._getBreakSuggestion(durationMinutes)

    return {
      message: this._getMessage(durationMinutes, milestone),
      milestone,
      suggestBreak: breakSuggestion !== null,
      breakType: breakSuggestion,
      formattedDuration: this._formatDuration(durationMinutes)
    }
  }

  /**
   * Get gentle time cue for dashboard display
   * @param {number} durationMinutes
   * @returns {string}
   */
  static getGentleCue(durationMinutes) {
    if (durationMinutes < 5) {
      return 'Just getting started...'
    }
    if (durationMinutes < 15) {
      return 'Building momentum'
    }
    if (durationMinutes < 30) {
      return 'In the flow ✨'
    }
    if (durationMinutes < 45) {
      return 'Deep work mode 🎯'
    }
    if (durationMinutes < 60) {
      return 'Strong focus session!'
    }
    if (durationMinutes < 90) {
      return 'Excellent progress! 1+ hour'
    }
    if (durationMinutes < 120) {
      return 'Marathon session! Consider a break?'
    }
    return 'Epic session! A break would be great'
  }

  /**
   * Get break suggestion message
   * @param {number} durationMinutes
   * @returns {string|null}
   */
  static getBreakMessage(durationMinutes) {
    const breakType = this._getBreakSuggestion(durationMinutes)
    if (!breakType) return null

    const messages = {
      micro: '⏰ Quick stretch? (25 min mark)',
      short: '☕ Good time for a short break (50 min)',
      long: '🧘 Natural energy dip - 5 min break helps (90 min)',
      extended: '🚶 Long session! Walk around? (3+ hours)'
    }

    return messages[breakType] || null
  }

  /**
   * Format duration in human-friendly way
   * @param {number} minutes
   * @returns {string}
   */
  static _formatDuration(minutes) {
    if (minutes < 1) return 'Just started'
    if (minutes < 60) return `${Math.round(minutes)} min`

    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)

    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  /**
   * Find the most recent milestone passed
   * @private
   */
  static _findMilestone(durationMinutes) {
    // Find milestones within a 2-minute window (just passed)
    for (let i = this.MILESTONES.length - 1; i >= 0; i--) {
      const milestone = this.MILESTONES[i]
      if (durationMinutes >= milestone && durationMinutes < milestone + 2) {
        return milestone
      }
    }
    return null
  }

  /**
   * Get break suggestion based on duration
   * @private
   */
  static _getBreakSuggestion(durationMinutes) {
    // Check break intervals (with 2-minute window)
    for (const [type, minutes] of Object.entries(this.BREAK_INTERVALS)) {
      if (durationMinutes >= minutes && durationMinutes < minutes + 2) {
        return type
      }
    }
    return null
  }

  /**
   * Get time awareness message
   * @private
   */
  static _getMessage(durationMinutes, milestone) {
    if (!milestone) {
      return this.getGentleCue(durationMinutes)
    }

    const milestoneMessages = {
      15: '15 minutes in - finding your rhythm',
      30: 'Half hour of focus - nice!',
      45: '45 minutes - solid work session',
      60: '1 hour mark - you\'re in the zone!',
      90: '90 minutes of deep work - impressive!',
      120: '2 hours! Consider a longer break',
      150: '2.5 hours - marathon focus!',
      180: '3 hours - epic session! Break time?'
    }

    return milestoneMessages[milestone] || this.getGentleCue(durationMinutes)
  }

  /**
   * Get time estimate for completion
   * Helps with ADHD time estimation challenges
   * @param {number} percentComplete - 0-100
   * @param {number} elapsedMinutes - Time spent so far
   * @returns {{estimate: number, message: string, confidence: string}}
   */
  static estimateCompletion(percentComplete, elapsedMinutes) {
    if (percentComplete <= 0 || percentComplete >= 100) {
      return {
        estimate: 0,
        message: percentComplete >= 100 ? 'Done!' : 'Getting started...',
        confidence: 'low'
      }
    }

    // Linear estimate (tends to be optimistic)
    const linearEstimate = (elapsedMinutes / percentComplete) * (100 - percentComplete)

    // Add buffer for ADHD realism (tasks often take longer)
    const realisticEstimate = linearEstimate * 1.25

    // Confidence based on progress
    let confidence = 'low'
    if (percentComplete >= 25 && percentComplete < 50) confidence = 'medium'
    if (percentComplete >= 50) confidence = 'high'

    return {
      estimate: Math.round(realisticEstimate),
      message: this._getEstimateMessage(realisticEstimate, confidence),
      confidence
    }
  }

  /**
   * Get friendly estimate message
   * @private
   */
  static _getEstimateMessage(estimateMinutes, confidence) {
    const formatted = this._formatDuration(estimateMinutes)
    const confidenceNote = {
      low: '(rough guess)',
      medium: '(getting clearer)',
      high: '(pretty reliable)'
    }

    return `~${formatted} remaining ${confidenceNote[confidence]}`
  }

  /**
   * Check if it's a good time for a gentle reminder
   * Prevents over-notification
   * @param {number} lastReminderMinutes - Minutes since last reminder
   * @param {number} sessionMinutes - Current session duration
   * @returns {boolean}
   */
  static shouldRemind(lastReminderMinutes, sessionMinutes) {
    // Minimum 10 minutes between reminders
    if (lastReminderMinutes < 10) return false

    // More frequent early, less frequent later
    if (sessionMinutes < 30) return lastReminderMinutes >= 15
    if (sessionMinutes < 60) return lastReminderMinutes >= 20
    if (sessionMinutes < 120) return lastReminderMinutes >= 25

    return lastReminderMinutes >= 30
  }
}
