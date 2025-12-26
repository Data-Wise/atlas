/**
 * SessionCompletionHelper - ADHD-friendly session ending support
 *
 * ADHD-friendly feature: Combat perfectionism paralysis
 *
 * Many people with ADHD struggle to end tasks because:
 * - Perfectionism: "It's not good enough yet"
 * - All-or-nothing thinking: "If it's not done, I failed"
 * - Difficulty transitioning: Hard to switch contexts
 *
 * This helper provides:
 * - Multiple valid completion states (not just done/not done)
 * - "Good enough" as an explicit, valid option
 * - Encouraging messages that validate partial progress
 * - Smooth transition prompts
 */

export class SessionCompletionHelper {
  /**
   * Completion types with ADHD-friendly descriptions
   */
  static COMPLETION_TYPES = {
    completed: {
      label: 'Completed',
      emoji: '✅',
      description: 'Task fully done',
      encouragement: "Great job finishing! That's a real accomplishment."
    },
    goodEnough: {
      label: 'Good Enough',
      emoji: '👍',
      description: 'Made meaningful progress - stopping is valid',
      encouragement: 'Progress counts! Knowing when to stop is a skill.'
    },
    paused: {
      label: 'Paused',
      emoji: '⏸️',
      description: 'Taking a break, will continue later',
      encouragement: 'Smart to take a break. You can pick this up anytime.'
    },
    blocked: {
      label: 'Blocked',
      emoji: '🚧',
      description: 'Waiting on something external',
      encouragement: "Not your fault - some things need external input. You've done what you can."
    },
    pivoted: {
      label: 'Pivoted',
      emoji: '🔄',
      description: 'Changed direction (and that is okay!)',
      encouragement: "Pivoting isn't failing - it's learning. Flexibility is strength."
    },
    timeboxed: {
      label: 'Timeboxed',
      emoji: '⏱️',
      description: 'Hit time limit - stopping as planned',
      encouragement: 'Respecting your time limit is excellent self-regulation!'
    }
  }

  /**
   * Get all available completion options
   * @returns {Array<{type: string, label: string, emoji: string, description: string}>}
   */
  static getCompletionOptions() {
    return Object.entries(this.COMPLETION_TYPES).map(([type, data]) => ({
      type,
      ...data
    }))
  }

  /**
   * Get completion data for a type
   * @param {string} type - Completion type
   * @returns {Object|null}
   */
  static getCompletionData(type) {
    return this.COMPLETION_TYPES[type] || null
  }

  /**
   * Get ending message based on session data
   * @param {string} completionType
   * @param {number} durationMinutes
   * @param {string} [taskDescription]
   * @returns {{primary: string, encouragement: string, nextSteps: string[]}}
   */
  static getEndingMessage(completionType, durationMinutes, taskDescription = null) {
    const typeData = this.COMPLETION_TYPES[completionType] || this.COMPLETION_TYPES.completed

    const primary = this._buildPrimaryMessage(completionType, durationMinutes, taskDescription)
    const encouragement = typeData.encouragement
    const nextSteps = this._getSuggestedNextSteps(completionType)

    return { primary, encouragement, nextSteps }
  }

  /**
   * Build primary ending message
   * @private
   */
  static _buildPrimaryMessage(completionType, durationMinutes, taskDescription) {
    const formattedDuration = this._formatDuration(durationMinutes)
    const typeData = this.COMPLETION_TYPES[completionType]
    const emoji = typeData?.emoji || '✓'

    if (taskDescription) {
      return `${emoji} Session ended: "${taskDescription}" (${formattedDuration})`
    }

    return `${emoji} Session ended after ${formattedDuration}`
  }

  /**
   * Get suggested next steps based on completion type
   * @private
   */
  static _getSuggestedNextSteps(completionType) {
    const nextSteps = {
      completed: [
        'Celebrate this win!',
        'Consider a break before next task',
        'Log what you accomplished'
      ],
      goodEnough: [
        'Capture where you stopped',
        'Note what could continue later',
        "Don't second-guess your decision to stop"
      ],
      paused: ['Leave a breadcrumb for future you', 'Set a reminder to continue', 'Take a real break'],
      blocked: [
        'Document what you need',
        'Set a follow-up reminder',
        'Move to something you can control'
      ],
      pivoted: [
        'Capture why you pivoted (future learning)',
        'Start fresh on new direction',
        'Let go of the original plan'
      ],
      timeboxed: ['Review what you accomplished', 'Decide if you want another timebox', 'Switch contexts']
    }

    return nextSteps[completionType] || nextSteps.completed
  }

  /**
   * Format duration for display
   * @private
   */
  static _formatDuration(minutes) {
    if (minutes < 1) return 'less than a minute'
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  /**
   * Get progress validation message
   * For combating all-or-nothing thinking
   * @param {number} percentComplete - 0-100
   * @returns {{valid: boolean, message: string}}
   */
  static validateProgress(percentComplete) {
    if (percentComplete >= 100) {
      return {
        valid: true,
        message: "100% - Amazing! You've completed the task fully."
      }
    }
    if (percentComplete >= 80) {
      return {
        valid: true,
        message: `${percentComplete}% - So close! This is absolutely "done enough."`
      }
    }
    if (percentComplete >= 50) {
      return {
        valid: true,
        message: `${percentComplete}% - More than halfway! Real progress.`
      }
    }
    if (percentComplete >= 25) {
      return {
        valid: true,
        message: `${percentComplete}% - Quarter done! That's a real start.`
      }
    }
    if (percentComplete >= 10) {
      return {
        valid: true,
        message: `${percentComplete}% - You've started! That's often the hardest part.`
      }
    }
    if (percentComplete > 0) {
      return {
        valid: true,
        message: 'Just beginning - even 1% is more than 0%!'
      }
    }
    return {
      valid: true, // Even 0% is valid - showing up counts
      message: "You showed up. That counts for something."
    }
  }

  /**
   * Get transition support message
   * Helps with ADHD context-switching difficulty
   * @param {string} fromTask
   * @param {string} [toTask]
   * @returns {{steps: string[], reminder: string}}
   */
  static getTransitionSupport(fromTask, toTask = null) {
    const steps = ['Take 3 deep breaths', `Say goodbye to "${fromTask}" (seriously, out loud helps)`]

    if (toTask) {
      steps.push(`Set intention: "I am now working on ${toTask}"`, 'Start with the smallest possible action')
    } else {
      steps.push('Notice how you feel right now', 'Decide your next move (or take a break)')
    }

    return {
      steps,
      reminder:
        "Context switching is hard. Be patient with yourself - your brain needs a moment to shift gears."
    }
  }

  /**
   * Check if session duration suggests stopping
   * @param {number} durationMinutes
   * @param {number} [plannedMinutes]
   * @returns {{shouldConsiderStopping: boolean, reason: string|null}}
   */
  static shouldConsiderStopping(durationMinutes, plannedMinutes = null) {
    // Exceeded planned time
    if (plannedMinutes && durationMinutes > plannedMinutes * 1.2) {
      return {
        shouldConsiderStopping: true,
        reason: `You're ${Math.round(((durationMinutes - plannedMinutes) / plannedMinutes) * 100)}% over your planned time. Consider stopping?`
      }
    }

    // Very long session
    if (durationMinutes > 180) {
      return {
        shouldConsiderStopping: true,
        reason: '3+ hours is a marathon! A break would help your brain.'
      }
    }

    // Long session
    if (durationMinutes > 90) {
      return {
        shouldConsiderStopping: true,
        reason: '90+ minutes - natural energy dip time. Good moment to pause?'
      }
    }

    return {
      shouldConsiderStopping: false,
      reason: null
    }
  }
}
