/**
 * ProjectPresenter
 *
 * UI-agnostic formatting for project data.
 * These functions can be used by any UI layer (CLI, TUI, web).
 */

/**
 * Format relative time ago
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatTimeAgo(date) {
  if (!date) return '-'
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(diff / 604800000)

  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return `${weeks}w`
}

/**
 * Format duration in minutes to human-readable
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export function formatDuration(minutes) {
  if (!minutes || minutes < 1) return '0m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLen - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLen) {
  if (!text) return ''
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen - 1) + '…'
}

/**
 * Get type string from project type (handles value objects)
 * @param {Object|string} type - Project type
 * @returns {string} Type string
 */
export function formatProjectType(type) {
  if (typeof type === 'object') {
    return type?.value || type?._value || 'general'
  }
  return type || 'general'
}

/**
 * Get status category for filtering
 * @param {string} status - Project status
 * @returns {string} Category: 'active', 'paused', 'stable', 'other'
 */
export function getStatusCategory(status) {
  const categories = {
    active: ['active', 'working', 'in-progress', 'testing'],
    paused: ['paused', 'blocked', 'waiting'],
    stable: ['stable', 'complete', 'released', 'ready']
  }

  for (const [category, statuses] of Object.entries(categories)) {
    if (statuses.includes(status)) return category
  }
  return 'other'
}

/**
 * Format project summary for display
 * @param {Object} project - Project entity
 * @returns {Object} Formatted summary
 */
export function formatProjectSummary(project) {
  return {
    name: project.name,
    type: formatProjectType(project.type),
    status: project.status || 'unknown',
    statusCategory: getStatusCategory(project.status || 'unknown'),
    lastAccessed: formatTimeAgo(project.lastAccessedAt),
    progress: project.progress || project.metadata?.progress || 0,
    nextAction: project.next || project.metadata?.next || null,
    focus: project.focus || project.metadata?.focus || null
  }
}

/**
 * Format session duration for display
 * @param {Object} session - Session entity
 * @returns {Object} Formatted session info
 */
export function formatSessionInfo(session) {
  if (!session) return null

  const duration = session.getDuration ? session.getDuration() : 0
  return {
    project: session.project,
    task: session.task || '-',
    duration: formatDuration(duration),
    durationMinutes: duration,
    isActive: true
  }
}

export default {
  formatTimeAgo,
  formatDuration,
  truncateText,
  formatProjectType,
  getStatusCategory,
  formatProjectSummary,
  formatSessionInfo
}
