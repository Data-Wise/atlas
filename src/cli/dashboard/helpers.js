/**
 * Dashboard Helper Functions
 *
 * DEPRECATED: Import directly from '../../../adapters/presenters/index.js' instead.
 *
 * This file provides backward compatibility and convenience aliases.
 * New code should import directly from the presenters layer.
 *
 * @deprecated Use presenters/index.js for direct imports
 */

// Import from presenters (Clean Architecture - adapters layer)
import {
  // UI-agnostic formatters
  formatTimeAgo,
  truncateText,
  formatProjectType,
  getStatusCategory as getStatusCategoryBase,

  // TUI-specific formatters
  sparkline,
  progressBar,
  createMiniProgressBar,
  getStatusIcon,
  formatProjectName,
  formatNextAction,
  formatSessionIndicator,
  formatStreak,
  themes,
  themeNames
} from '../../adapters/presenters/index.js'

// Re-export all for dashboard usage
export {
  sparkline,
  progressBar,
  createMiniProgressBar,
  truncateText,
  getStatusIcon,
  formatProjectName,
  formatNextAction,
  formatSessionIndicator,
  formatStreak,
  themes,
  themeNames
}

// Aliased exports for backward compatibility
export const timeAgo = formatTimeAgo
export const getTypeStr = formatProjectType

/**
 * Get status category for filtering (returns short codes for dashboard)
 * @param {string} status - Project status
 * @returns {string} Category: 'a' (active), 'p' (paused), 's' (stable), 'o' (other)
 */
export function getStatusCategory(status) {
  const category = getStatusCategoryBase(status)
  const shortCodes = {
    active: 'a',
    paused: 'p',
    stable: 's',
    other: 'o'
  }
  return shortCodes[category] || 'o'
}
