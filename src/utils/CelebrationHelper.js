/**
 * CelebrationHelper - Positive reinforcement for ADHD
 *
 * ADHD-friendly feature: External validation and dopamine support
 *
 * People with ADHD often:
 * - Don't feel internal satisfaction from accomplishments
 * - Need external validation to recognize achievements
 * - Benefit from immediate positive reinforcement
 *
 * This helper provides:
 * - Celebration animations for session completion
 * - Milestone recognition (streaks, personal bests)
 * - Tiered celebrations based on achievement level
 * - Terminal-safe ASCII art and colors
 */

export class CelebrationHelper {
  /**
   * Celebration levels and their visual intensity
   */
  static CELEBRATION_LEVELS = {
    small: {
      emoji: '✨',
      intensity: 1,
      description: 'Nice work!'
    },
    medium: {
      emoji: '🎉',
      intensity: 2,
      description: 'Great session!'
    },
    big: {
      emoji: '🎊',
      intensity: 3,
      description: 'Amazing achievement!'
    },
    epic: {
      emoji: '🏆',
      intensity: 4,
      description: 'Legendary performance!'
    }
  }

  /**
   * Get celebration data for session completion
   * @param {Object} options
   * @param {number} options.duration - Session duration in minutes
   * @param {string} options.outcome - Completion type
   * @param {number} [options.streak] - Current streak
   * @param {boolean} [options.newPersonalBest] - Is this a new record?
   * @returns {Object} Celebration data
   */
  static getCelebration(options) {
    const level = this._determineCelebrationLevel(options)
    const levelData = this.CELEBRATION_LEVELS[level]
    const message = this._getMessage(level, options)
    const asciiArt = this._getAsciiArt(level)
    const milestones = this._getMilestones(options)

    return {
      level,
      emoji: levelData.emoji,
      intensity: levelData.intensity,
      message,
      asciiArt,
      milestones,
      shouldAnimate: level !== 'small'
    }
  }

  /**
   * Determine celebration level based on achievement
   * @private
   */
  static _determineCelebrationLevel(options) {
    const { duration, outcome, streak, newPersonalBest } = options

    // Epic: New personal best or long streak
    if (newPersonalBest || streak >= 7) {
      return 'epic'
    }

    // Big: Good duration + completed, or streak milestone
    if ((duration >= 60 && outcome === 'completed') || streak >= 3) {
      return 'big'
    }

    // Medium: Decent session or any completion
    if (duration >= 25 || outcome === 'completed' || outcome === 'goodEnough') {
      return 'medium'
    }

    // Small: Any progress
    return 'small'
  }

  /**
   * Get celebration message
   * @private
   */
  static _getMessage(level, options) {
    const { duration, outcome, streak, newPersonalBest } = options

    // Priority messages
    if (newPersonalBest) {
      return '🏆 NEW PERSONAL BEST! You outdid yourself!'
    }

    if (streak >= 7) {
      return `🔥 ${streak} day streak! You're on fire!`
    }

    if (streak >= 3) {
      return `💪 ${streak} days in a row! Building momentum!`
    }

    // Outcome-based messages
    const messages = {
      epic: [
        'Absolutely legendary session!',
        "You crushed it! That's elite-level focus.",
        'What an incredible achievement!'
      ],
      big: [
        'Fantastic work today!',
        'Really solid session! Be proud.',
        'You showed up and delivered!'
      ],
      medium: [
        'Good session! Progress made.',
        'Nice work getting that done.',
        'Every session counts. Well done!'
      ],
      small: [
        'You showed up. That matters.',
        'Progress is progress!',
        "Small steps, big results. Keep going."
      ]
    }

    const levelMessages = messages[level]
    return levelMessages[Math.floor(Math.random() * levelMessages.length)]
  }

  /**
   * Get ASCII art for celebration (terminal-safe)
   * @private
   */
  static _getAsciiArt(level) {
    const art = {
      small: `
  ✨
`,
      medium: `
    🎉
  ★ ☆ ★
`,
      big: `
     🎊
   ★ ★ ★
  ☆     ☆
   ★ ★ ★
`,
      epic: `
       🏆
     ★ ★ ★
   ★ ★ ★ ★ ★
  ☆           ☆
   ★ ★ ★ ★ ★
     ★ ★ ★
`
    }

    return art[level] || art.small
  }

  /**
   * Get milestone achievements to highlight
   * @private
   */
  static _getMilestones(options) {
    const milestones = []
    const { duration, streak, newPersonalBest } = options

    if (newPersonalBest) {
      milestones.push({
        type: 'personal_best',
        icon: '🏆',
        message: 'New personal best!'
      })
    }

    if (streak === 3) {
      milestones.push({
        type: 'streak',
        icon: '🔥',
        message: '3-day streak started!'
      })
    }

    if (streak === 7) {
      milestones.push({
        type: 'streak',
        icon: '🔥🔥',
        message: 'One week streak!'
      })
    }

    if (streak === 30) {
      milestones.push({
        type: 'streak',
        icon: '🔥🔥🔥',
        message: 'One month streak! Incredible!'
      })
    }

    if (duration >= 60 && duration < 120) {
      milestones.push({
        type: 'duration',
        icon: '⏱️',
        message: '1+ hour deep work session!'
      })
    }

    if (duration >= 120) {
      milestones.push({
        type: 'duration',
        icon: '⏱️⏱️',
        message: '2+ hour marathon session!'
      })
    }

    return milestones
  }

  /**
   * Get quick celebration for inline display
   * @param {number} duration - Minutes
   * @param {string} outcome
   * @returns {string}
   */
  static getQuickCelebration(duration, outcome) {
    if (duration >= 60) return '🎊 Excellent!'
    if (duration >= 30) return '🎉 Great work!'
    if (duration >= 15) return '✨ Nice session!'
    if (outcome === 'completed') return '✅ Done!'
    return '👍 Progress!'
  }

  /**
   * Get encouragement for starting next session
   * Maintains positive momentum
   * @param {number} streak - Current streak
   * @returns {string}
   */
  static getNextSessionEncouragement(streak) {
    if (streak >= 7) {
      return "You've got an incredible streak going. Keep it alive!"
    }
    if (streak >= 3) {
      return 'Great momentum! Ready for another session?'
    }
    if (streak >= 1) {
      return 'You did it yesterday. You can do it today!'
    }
    return 'Every session is a win. Start when ready.'
  }

  /**
   * Check if this session deserves a celebration
   * @param {number} duration
   * @param {string} outcome
   * @returns {{celebrate: boolean, reason: string}}
   */
  static shouldCelebrate(duration, outcome) {
    // Always celebrate completed tasks
    if (outcome === 'completed') {
      return { celebrate: true, reason: 'Task completed!' }
    }

    // Celebrate good-enough stopping
    if (outcome === 'goodEnough') {
      return { celebrate: true, reason: 'Good enough is great!' }
    }

    // Celebrate decent duration
    if (duration >= 15) {
      return { celebrate: true, reason: 'Solid focus time!' }
    }

    // Even short sessions get acknowledgment
    if (duration >= 5) {
      return { celebrate: true, reason: 'You showed up!' }
    }

    // Very short sessions still matter
    return { celebrate: true, reason: 'Every minute counts!' }
  }

  /**
   * Get celebration animation frames for terminal
   * @param {string} level
   * @returns {string[]}
   */
  static getAnimationFrames(level) {
    const frames = {
      small: ['✨', '·', '✨'],
      medium: ['🎉', '✨🎉✨', '🎉'],
      big: ['🎊', '✨🎊✨', '★🎊★', '✨🎊✨', '🎊'],
      epic: ['🏆', '✨🏆✨', '🌟🏆🌟', '⭐🏆⭐', '🌟🏆🌟', '✨🏆✨', '🏆']
    }

    return frames[level] || frames.small
  }

  /**
   * Get color theme for celebration (terminal ANSI)
   * @param {string} level
   * @returns {{primary: string, secondary: string}}
   */
  static getCelebrationColors(level) {
    const colors = {
      small: { primary: '\x1b[36m', secondary: '\x1b[0m' }, // Cyan
      medium: { primary: '\x1b[33m', secondary: '\x1b[0m' }, // Yellow
      big: { primary: '\x1b[35m', secondary: '\x1b[0m' }, // Magenta
      epic: { primary: '\x1b[1m\x1b[33m', secondary: '\x1b[0m' } // Bold Yellow
    }

    return colors[level] || colors.small
  }
}
