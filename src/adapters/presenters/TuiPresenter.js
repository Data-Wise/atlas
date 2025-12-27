/**
 * TuiPresenter
 *
 * TUI-specific formatting using blessed tags.
 * These functions are specific to the blessed terminal UI.
 */

import {
  formatTimeAgo,
  truncateText,
  formatProjectType,
  getStatusCategory
} from './ProjectPresenter.js'

// Re-export UI-agnostic functions
export { formatTimeAgo, truncateText, formatProjectType, getStatusCategory }

/**
 * Create ASCII sparkline from data
 * @param {number[]} data - Data points
 * @param {number} width - Display width
 * @returns {string} Sparkline characters
 */
export function sparkline(data, width = 20) {
  const chars = '▁▂▃▄▅▆▇█'
  const max = Math.max(...data, 1)
  return data.map(v => chars[Math.floor((v / max) * 7)]).join('')
}

/**
 * Create progress bar with blessed tags
 * @param {number} percent - Percentage (0-100)
 * @param {number} width - Bar width
 * @returns {string} Progress bar with blessed tags
 */
export function progressBar(percent, width = 20) {
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  return '{green-fg}' + '█'.repeat(filled) + '{/}{gray-fg}' + '░'.repeat(empty) + '{/}'
}

/**
 * Create mini progress bar (10 chars) with color coding
 * @param {number} percent - Percentage (0-100)
 * @returns {string} Mini progress bar with blessed tags
 */
export function createMiniProgressBar(percent) {
  const width = 10
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  const color = percent >= 75 ? 'green' : percent >= 40 ? 'yellow' : 'blue'
  return `{${color}-fg}${'█'.repeat(filled)}{/}{gray-fg}${'░'.repeat(empty)}{/} ${percent}%`
}

/**
 * Get status icon with blessed tags
 * @param {string} status - Project status
 * @returns {string} Status icon with blessed tags
 */
export function getStatusIcon(status) {
  const icons = {
    active: '{green-fg}●{/}',
    working: '{green-fg}●{/}',
    'in-progress': '{green-fg}●{/}',
    testing: '{green-fg}◐{/}',
    paused: '{yellow-fg}◑{/}',
    blocked: '{red-fg}✖{/}',
    waiting: '{yellow-fg}◑{/}',
    stable: '{cyan-fg}●{/}',
    complete: '{cyan-fg}✓{/}',
    released: '{cyan-fg}✓{/}',
    ready: '{blue-fg}○{/}',
    planning: '{magenta-fg}○{/}',
    draft: '{gray-fg}○{/}',
    archive: '{gray-fg}▪{/}',
    unknown: '{gray-fg}?{/}'
  }
  return icons[status] || icons.unknown
}

/**
 * Format status with icon and color
 * @param {string} status - Project status
 * @returns {string} Formatted status string
 */
export function formatStatusWithIcon(status) {
  const icon = getStatusIcon(status)
  return `${icon} ${status}`
}

/**
 * Format project name with highlighting
 * @param {string} name - Project name
 * @param {boolean} isActive - Whether project has active session
 * @param {boolean} isSelected - Whether project is selected
 * @returns {string} Formatted name with blessed tags
 */
export function formatProjectName(name, isActive = false, isSelected = false) {
  if (isActive) {
    return `{bold}{green-fg}${name}{/}{/bold}`
  }
  if (isSelected) {
    return `{bold}{cyan-fg}${name}{/}{/bold}`
  }
  return `{bold}{white-fg}${name}{/}{/bold}`
}

/**
 * Format next action indicator
 * @param {string} action - Next action text
 * @param {number} maxLen - Maximum length
 * @returns {string} Formatted action with blessed tags
 */
export function formatNextAction(action, maxLen = 50) {
  if (!action) return ''
  return `{yellow-fg}→{/} ${truncateText(action, maxLen)}`
}

/**
 * Format session indicator
 * @param {string} projectName - Active session project name
 * @param {number} duration - Duration in minutes
 * @returns {string} Formatted session indicator
 */
export function formatSessionIndicator(projectName, duration) {
  if (!projectName) {
    return '{gray-fg}No active session{/}'
  }
  return `{green-fg}●{/} ${projectName} (${duration}m)`
}

/**
 * Format streak display
 * @param {Object} streakData - Streak data with current count
 * @returns {string} Formatted streak with blessed tags
 */
export function formatStreak(streakData) {
  if (!streakData?.current || streakData.current === 0) {
    return ''
  }
  return streakData.display || `{yellow-fg}🔥 Day ${streakData.current}{/}`
}

/**
 * Dashboard themes
 */
export const themes = {
  default: {
    primary: 'blue',
    secondary: 'cyan',
    accent: 'green',
    warning: 'yellow',
    error: 'red',
    muted: 'gray'
  },
  dark: {
    primary: 'magenta',
    secondary: 'blue',
    accent: 'green',
    warning: 'yellow',
    error: 'red',
    muted: 'gray'
  },
  minimal: {
    primary: 'white',
    secondary: 'gray',
    accent: 'cyan',
    warning: 'yellow',
    error: 'red',
    muted: 'gray'
  }
}

export const themeNames = Object.keys(themes)

export default {
  sparkline,
  progressBar,
  createMiniProgressBar,
  getStatusIcon,
  formatStatusWithIcon,
  formatProjectName,
  formatNextAction,
  formatSessionIndicator,
  formatStreak,
  themes,
  themeNames
}
