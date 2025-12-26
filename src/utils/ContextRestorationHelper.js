/**
 * ContextRestorationHelper - "Where was I?" support for ADHD
 *
 * ADHD-friendly feature: Combat working memory challenges
 *
 * ADHD often affects working memory, making it hard to:
 * - Remember what you were doing before an interruption
 * - Pick up where you left off after a break
 * - Maintain context across sessions
 *
 * This helper provides:
 * - "Last time you were..." messages
 * - Recent breadcrumb display
 * - Context summary for quick re-orientation
 * - Suggested re-entry points
 */

export class ContextRestorationHelper {
  /**
   * Generate context restoration summary
   * @param {Object} lastSession - Most recent session data
   * @param {Array} breadcrumbs - Recent breadcrumbs for the project
   * @param {Object} [projectInfo] - Project metadata
   * @returns {Object} Context restoration data
   */
  static getContextSummary(lastSession, breadcrumbs = [], projectInfo = null) {
    const lastTimeMessage = this._buildLastTimeMessage(lastSession)
    const breadcrumbSummary = this._summarizeBreadcrumbs(breadcrumbs)
    const reentryPoints = this._suggestReentryPoints(lastSession, breadcrumbs)
    const timeSince = lastSession?.endTime ? this._formatTimeSince(lastSession.endTime) : null

    return {
      lastTimeMessage,
      timeSince,
      breadcrumbSummary,
      reentryPoints,
      projectName: projectInfo?.name || lastSession?.project || null,
      hasContext: !!(lastSession || breadcrumbs.length > 0)
    }
  }

  /**
   * Build "Last time you were..." message
   * @private
   */
  static _buildLastTimeMessage(session) {
    if (!session) {
      return 'No previous session found. Fresh start!'
    }

    const parts = []

    // What you were working on
    if (session.task) {
      parts.push(`working on "${session.task}"`)
    } else if (session.project) {
      parts.push(`in ${session.project}`)
    }

    // How long the session was
    if (session.duration) {
      parts.push(`for ${this._formatDuration(session.duration)}`)
    }

    // How it ended
    if (session.outcome) {
      const outcomeText = this._getOutcomeText(session.outcome)
      if (outcomeText) {
        parts.push(outcomeText)
      }
    }

    if (parts.length === 0) {
      return 'You had a session here. Ready to continue?'
    }

    return `Last time, you were ${parts.join(' ')}.`
  }

  /**
   * Get human-friendly outcome text
   * @private
   */
  static _getOutcomeText(outcome) {
    const outcomeMap = {
      completed: 'and finished the task',
      goodEnough: 'and made good progress',
      paused: 'and paused to continue later',
      blocked: 'but got blocked on something',
      pivoted: 'and changed direction',
      timeboxed: 'and stopped at your time limit'
    }
    return outcomeMap[outcome] || null
  }

  /**
   * Summarize recent breadcrumbs
   * @private
   */
  static _summarizeBreadcrumbs(breadcrumbs) {
    if (!breadcrumbs || breadcrumbs.length === 0) {
      return {
        message: 'No breadcrumbs left. Consider leaving notes as you work!',
        items: [],
        hasItems: false
      }
    }

    // Get most recent 3 breadcrumbs
    const recent = breadcrumbs.slice(0, 3)

    const items = recent.map((b) => ({
      text: b.text || b.content,
      timeAgo: b.timestamp ? this._formatTimeSince(b.timestamp) : null,
      type: b.type || 'note'
    }))

    return {
      message: `You left ${breadcrumbs.length} breadcrumb${breadcrumbs.length > 1 ? 's' : ''}. Here's the trail:`,
      items,
      hasItems: true,
      totalCount: breadcrumbs.length
    }
  }

  /**
   * Suggest re-entry points based on context
   * @private
   */
  static _suggestReentryPoints(session, breadcrumbs) {
    const points = []

    // If there's a recent breadcrumb, suggest continuing from there
    if (breadcrumbs.length > 0) {
      const latest = breadcrumbs[0]
      points.push({
        type: 'breadcrumb',
        suggestion: `Continue from: "${this._truncate(latest.text || latest.content, 50)}"`,
        priority: 1
      })
    }

    // If session was paused, suggest picking up
    if (session?.outcome === 'paused') {
      points.push({
        type: 'paused_session',
        suggestion: 'Pick up where you paused',
        priority: 1
      })
    }

    // If session was blocked, suggest checking blocker
    if (session?.outcome === 'blocked') {
      points.push({
        type: 'blocked',
        suggestion: 'Check if blocker is resolved',
        priority: 2
      })
    }

    // Generic suggestions
    points.push({
      type: 'review',
      suggestion: 'Review last session notes',
      priority: 3
    })

    points.push({
      type: 'fresh',
      suggestion: 'Start fresh with a new task',
      priority: 4
    })

    // Sort by priority
    return points.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Format duration in human-friendly way
   * @private
   */
  static _formatDuration(minutes) {
    if (minutes < 1) return 'a moment'
    if (minutes < 60) return `${Math.round(minutes)} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours}h ${mins}m`
  }

  /**
   * Format time since a date
   * @private
   */
  static _formatTimeSince(date) {
    const dateObj = date instanceof Date ? date : new Date(date)
    const now = new Date()
    const diffMs = now - dateObj
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`

    return dateObj.toLocaleDateString()
  }

  /**
   * Truncate text with ellipsis
   * @private
   */
  static _truncate(text, maxLength) {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  /**
   * Get quick context check for dashboard
   * @param {Object} lastSession
   * @returns {string}
   */
  static getQuickContext(lastSession) {
    if (!lastSession) return 'No recent session'

    const timeSince = lastSession.endTime ? this._formatTimeSince(lastSession.endTime) : null

    if (lastSession.task) {
      return timeSince
        ? `"${this._truncate(lastSession.task, 30)}" (${timeSince})`
        : `"${this._truncate(lastSession.task, 30)}"`
    }

    if (lastSession.project) {
      return timeSince ? `${lastSession.project} (${timeSince})` : lastSession.project
    }

    return timeSince ? `Last session: ${timeSince}` : 'Previous session available'
  }

  /**
   * Generate warm welcome back message
   * @param {Object} lastSession
   * @param {number} streak - Current streak count
   * @returns {string}
   */
  static getWelcomeBack(lastSession, streak = 0) {
    const greetings = ['Welcome back!', 'Hey there!', 'Good to see you!', 'Ready to focus?']

    const greeting = greetings[Math.floor(Math.random() * greetings.length)]

    if (!lastSession) {
      return `${greeting} Let's get started.`
    }

    const timeSince = lastSession.endTime ? this._formatTimeSince(lastSession.endTime) : null

    if (timeSince) {
      if (streak > 1) {
        return `${greeting} You're on a ${streak}-day streak! Last session was ${timeSince}.`
      }
      return `${greeting} You were here ${timeSince}.`
    }

    return greeting
  }

  /**
   * Check if context restoration is recommended
   * @param {Object} lastSession
   * @returns {{recommended: boolean, reason: string}}
   */
  static shouldShowContextRestore(lastSession) {
    if (!lastSession) {
      return { recommended: false, reason: 'No previous session' }
    }

    // Check time since last session
    if (lastSession.endTime) {
      const hoursSince = (Date.now() - new Date(lastSession.endTime)) / (1000 * 60 * 60)

      if (hoursSince > 24) {
        return {
          recommended: true,
          reason: "It's been a while - context refresh helpful"
        }
      }
      if (hoursSince > 4) {
        return {
          recommended: true,
          reason: 'Several hours since last session'
        }
      }
    }

    // Check if last session was paused
    if (lastSession.outcome === 'paused') {
      return {
        recommended: true,
        reason: 'You paused intentionally - showing where you stopped'
      }
    }

    // Check if there was a task
    if (lastSession.task) {
      return {
        recommended: true,
        reason: 'Showing what you were working on'
      }
    }

    return { recommended: false, reason: 'Recent context still fresh' }
  }
}
