/**
 * PlanDayUseCase
 *
 * ADHD-friendly morning ritual for daily planning.
 *
 * Gathers context to help start the day:
 * - Yesterday's sessions summary
 * - Parked contexts (things left unfinished)
 * - Inbox captures (quick ideas to review)
 * - Ecosystem status (from .STATUS files)
 *
 * This helps answer: "What should I work on today?"
 */

import { StreakCalculator } from '../../utils/StreakCalculator.js'

export class PlanDayUseCase {
  /**
   * @param {Object} dependencies
   * @param {ISessionRepository} dependencies.sessionRepository
   * @param {ICaptureRepository} dependencies.captureRepository
   * @param {IProjectRepository} dependencies.projectRepository
   * @param {StatusFileParser} [dependencies.statusFileParser] - Optional ecosystem scanner
   */
  constructor({ sessionRepository, captureRepository, projectRepository, statusFileParser }) {
    if (!sessionRepository) throw new Error('sessionRepository is required')
    if (!captureRepository) throw new Error('captureRepository is required')
    if (!projectRepository) throw new Error('projectRepository is required')

    this.sessionRepository = sessionRepository
    this.captureRepository = captureRepository
    this.projectRepository = projectRepository
    this.statusFileParser = statusFileParser || null
  }

  /**
   * Execute the morning planning ritual
   *
   * @param {Object} input
   * @param {string} [input.ecosystemPath] - Path to scan for .STATUS files
   * @returns {Promise<PlanDayResult>}
   */
  async execute(input = {}) {
    const result = {
      timestamp: new Date().toISOString(),
      greeting: this._getGreeting(),
      yesterday: null,
      streak: null,
      parkedContexts: [],
      inbox: [],
      activeProjects: [],
      suggestions: []
    }

    // Get yesterday's sessions
    result.yesterday = await this._getYesterdaySummary()

    // Calculate streak
    result.streak = await this._getStreakInfo()

    // Get parked contexts
    result.parkedContexts = await this._getParkedContexts()

    // Get inbox items
    result.inbox = await this._getInboxItems()

    // Get active projects from registry
    result.activeProjects = await this._getActiveProjects()

    // Scan ecosystem if path provided
    if (input.ecosystemPath && this.statusFileParser) {
      result.ecosystem = await this._scanEcosystem(input.ecosystemPath)
    }

    // Generate suggestions based on context
    result.suggestions = this._generateSuggestions(result)

    return result
  }

  /**
   * Get time-appropriate greeting
   * @private
   */
  _getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning!'
    if (hour < 17) return 'Good afternoon!'
    return 'Good evening!'
  }

  /**
   * Get yesterday's session summary
   * @private
   */
  async _getYesterdaySummary() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sessions = await this.sessionRepository.list({
      since: yesterday,
      until: today,
      orderBy: 'startTime',
      order: 'desc'
    })

    if (sessions.length === 0) {
      return {
        hasSessions: false,
        message: 'No sessions yesterday'
      }
    }

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.getDuration?.() || 0), 0)
    const projects = [...new Set(sessions.map(s => s.project))]
    const completedCount = sessions.filter(s => s.outcome === 'completed').length

    return {
      hasSessions: true,
      sessionCount: sessions.length,
      totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      projects,
      completedCount,
      completionRate: Math.round((completedCount / sessions.length) * 100),
      lastTask: sessions[0]?.task,
      lastProject: sessions[0]?.project
    }
  }

  /**
   * Get current streak info
   * @private
   */
  async _getStreakInfo() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sessions = await this.sessionRepository.list({
      since: thirtyDaysAgo,
      orderBy: 'startTime',
      order: 'desc'
    })

    const streakData = StreakCalculator.calculateStreak(sessions)

    return {
      current: streakData.current,
      longest: streakData.longest,
      display: StreakCalculator.getStreakDisplay(streakData.current),
      message: StreakCalculator.getStreakMessage(streakData.current, streakData.longest)
    }
  }

  /**
   * Get parked contexts (unfinished work)
   * @private
   */
  async _getParkedContexts() {
    const parked = await this.captureRepository.findByStatus('parked')

    return parked.map(p => ({
      id: p.id,
      project: p.project,
      text: p.text,
      parkedAt: p.createdAt,
      context: p.context || {}
    })).slice(0, 5) // Limit to 5 most recent
  }

  /**
   * Get inbox items for review
   * @private
   */
  async _getInboxItems() {
    const inbox = await this.captureRepository.findByStatus('inbox')

    return inbox.map(item => ({
      id: item.id,
      text: item.text,
      type: item.type,
      project: item.project,
      createdAt: item.createdAt
    })).slice(0, 10) // Limit to 10 items
  }

  /**
   * Get active projects from registry
   * @private
   */
  async _getActiveProjects() {
    try {
      const projects = await this.projectRepository.list()

      return projects
        .filter(p => {
          const status = p.metadata?.status
          return status === 'active' || status === 'in-progress'
        })
        .map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          status: p.metadata?.status,
          progress: p.metadata?.progress || 0,
          focus: p.metadata?.focus || p.description,
          priority: p.metadata?.priority || 3
        }))
        .sort((a, b) => a.priority - b.priority) // Sort by priority (P1 first)
        .slice(0, 10)
    } catch {
      return []
    }
  }

  /**
   * Scan ecosystem for .STATUS files
   * @private
   */
  async _scanEcosystem(rootPath) {
    if (!this.statusFileParser) {
      return null
    }

    try {
      const scanResults = await this.statusFileParser.scanDirectory(rootPath)
      const summary = this.statusFileParser.summarize(scanResults)

      // Get high-priority items (P1)
      const highPriority = summary.byPriority?.[1] || []

      // Get in-progress items
      const inProgress = summary.byProgress?.inProgress || []

      return {
        total: summary.total,
        highPriority: highPriority.slice(0, 5),
        inProgress: inProgress.slice(0, 5),
        summary
      }
    } catch {
      return null
    }
  }

  /**
   * Generate planning suggestions based on context
   * @private
   */
  _generateSuggestions(result) {
    const suggestions = []

    // Suggest unparking if there are parked contexts
    if (result.parkedContexts.length > 0) {
      const most = result.parkedContexts[0]
      suggestions.push({
        type: 'unpark',
        priority: 1,
        message: `Resume parked work: ${most.project || 'previous context'}`,
        action: 'atlas unpark'
      })
    }

    // Suggest triaging inbox if it has items
    if (result.inbox.length > 5) {
      suggestions.push({
        type: 'triage',
        priority: 2,
        message: `${result.inbox.length} items in inbox - consider triaging`,
        action: 'atlas triage'
      })
    }

    // Suggest high-priority projects
    const p1Projects = result.activeProjects.filter(p => p.priority === 1)
    if (p1Projects.length > 0) {
      suggestions.push({
        type: 'focus',
        priority: 1,
        message: `P1 focus: ${p1Projects[0].name}`,
        action: `atlas session start ${p1Projects[0].name}`
      })
    }

    // Suggest continuing yesterday's work
    if (result.yesterday?.hasSessions && result.yesterday.lastProject) {
      suggestions.push({
        type: 'continue',
        priority: 3,
        message: `Continue yesterday's ${result.yesterday.lastProject}`,
        action: `atlas session start ${result.yesterday.lastProject}`
      })
    }

    // Celebrate streak
    if (result.streak?.current >= 3) {
      suggestions.push({
        type: 'streak',
        priority: 4,
        message: result.streak.message,
        action: null
      })
    }

    return suggestions.sort((a, b) => a.priority - b.priority)
  }
}

export default PlanDayUseCase
