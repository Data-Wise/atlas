/**
 * StatsPresenter
 *
 * Formatting functions for session statistics.
 * Provides table, JSON, and plain text output formats.
 */

import { formatDuration } from './ProjectPresenter.js'
import { sparkline } from './TuiPresenter.js'

/**
 * Format stats as a table for CLI display
 * @param {Object} stats - Stats from GetSessionStatsUseCase
 * @returns {string} Formatted table output
 */
export function formatStatsTable(stats) {
  const lines = []
  const { summary, streak, bestDay, hourlyDistribution, byProject, period } = stats

  // Header
  const periodLabel = period.projectFilter
    ? `${period.projectFilter} (Last ${period.days} Days)`
    : `Last ${period.days} Days`

  lines.push('')
  lines.push(`Session Analytics - ${periodLabel}`)
  lines.push('═'.repeat(55))
  lines.push('')

  // Summary section
  lines.push('  Total Sessions:    ' + summary.totalSessions)
  lines.push('  Total Time:        ' + formatDuration(summary.totalMinutes))
  lines.push('  Daily Average:     ' + formatDuration(summary.dailyAverageMinutes))
  lines.push(`  Flow Sessions:     ${summary.flowSessions} (${summary.flowPercentage}%)`)
  lines.push(`  Completion Rate:   ${summary.completionRate}%`)
  lines.push('')

  // Streak
  if (streak.current > 0) {
    lines.push(`  Streak:            ${streak.display} (longest: ${streak.longest})`)
  } else {
    lines.push('  Streak:            No active streak')
  }

  // Best day
  if (bestDay) {
    lines.push(`  Best Day:          ${bestDay.dayName} (${formatDuration(bestDay.minutes)})`)
  }

  lines.push('')

  // Hourly distribution
  if (hourlyDistribution.some(v => v > 0)) {
    lines.push('  Hourly Activity:')
    lines.push('  ' + formatHourlySparkline(hourlyDistribution))
    lines.push('  6am           12pm           6pm           12am')
    lines.push('')
  }

  // Project breakdown
  if (byProject.length > 0 && !period.projectFilter) {
    lines.push('  By Project:')
    lines.push('  ┌' + '─'.repeat(14) + '┬' + '─'.repeat(10) + '┬' + '─'.repeat(11) + '┬' + '─'.repeat(10) + '┐')
    lines.push('  │ Project      │ Sessions │ Time      │ Flow %   │')
    lines.push('  ├' + '─'.repeat(14) + '┼' + '─'.repeat(10) + '┼' + '─'.repeat(11) + '┼' + '─'.repeat(10) + '┤')

    for (const p of byProject.slice(0, 10)) {
      const name = p.name.length > 12 ? p.name.substring(0, 11) + '…' : p.name.padEnd(12)
      const sessions = String(p.sessions).padStart(8)
      const time = formatDuration(p.totalMinutes).padEnd(9)
      const flow = (p.flowPercentage + '%').padStart(8)
      lines.push(`  │ ${name} │${sessions} │ ${time} │${flow} │`)
    }

    lines.push('  └' + '─'.repeat(14) + '┴' + '─'.repeat(10) + '┴' + '─'.repeat(11) + '┴' + '─'.repeat(10) + '┘')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format stats as JSON
 * @param {Object} stats - Stats from GetSessionStatsUseCase
 * @returns {string} JSON string
 */
export function formatStatsJson(stats) {
  return JSON.stringify(stats, null, 2)
}

/**
 * Format stats as plain text (minimal)
 * @param {Object} stats - Stats from GetSessionStatsUseCase
 * @returns {string} Plain text output
 */
export function formatStatsText(stats) {
  const { summary, streak, period } = stats
  const lines = []

  lines.push(`Stats for last ${period.days} days${period.projectFilter ? ` (${period.projectFilter})` : ''}:`)
  lines.push(`  ${summary.totalSessions} sessions, ${formatDuration(summary.totalMinutes)} total`)
  lines.push(`  ${summary.flowPercentage}% flow state, ${summary.completionRate}% completion`)

  if (streak.current > 0) {
    lines.push(`  ${streak.display}`)
  }

  return lines.join('\n')
}

/**
 * Format hourly distribution as sparkline
 * Rotates array to start at 6am for better readability
 * @param {number[]} hourly - 24-element array (0-23 hours)
 * @returns {string} Sparkline string
 */
export function formatHourlySparkline(hourly) {
  // Rotate to start at 6am for typical work day visibility
  const rotated = [...hourly.slice(6), ...hourly.slice(0, 6)]
  return sparkline(rotated, 24)
}

/**
 * Format a single stat value for inline display
 * @param {string} label - Stat label
 * @param {*} value - Stat value
 * @returns {string} Formatted line
 */
export function formatStatLine(label, value) {
  const labelPad = label.padEnd(18)
  return `  ${labelPad}${value}`
}

/**
 * Format streak for display with color hints
 * @param {Object} streak - Streak data
 * @returns {Object} { display, color }
 */
export function formatStreakDisplay(streak) {
  if (streak.current === 0) {
    return { display: 'No streak', color: 'gray' }
  }
  if (streak.current >= 7) {
    return { display: streak.display, color: 'green' }
  }
  if (streak.current >= 3) {
    return { display: streak.display, color: 'yellow' }
  }
  return { display: streak.display, color: 'white' }
}

/**
 * Format flow percentage with visual indicator
 * @param {number} flowPercentage - Flow state percentage
 * @returns {Object} { display, color }
 */
export function formatFlowDisplay(flowPercentage) {
  if (flowPercentage >= 70) {
    return { display: `${flowPercentage}% 🎯`, color: 'green' }
  }
  if (flowPercentage >= 50) {
    return { display: `${flowPercentage}%`, color: 'yellow' }
  }
  return { display: `${flowPercentage}%`, color: 'gray' }
}

/**
 * Get period label for display
 * @param {number} days - Number of days
 * @returns {string} Period label
 */
export function getPeriodLabel(days) {
  if (days === 1) return 'Today'
  if (days === 7) return 'This Week'
  if (days === 30) return 'This Month'
  if (days === 365) return 'This Year'
  return `Last ${days} Days`
}

export default {
  formatStatsTable,
  formatStatsJson,
  formatStatsText,
  formatHourlySparkline,
  formatStatLine,
  formatStreakDisplay,
  formatFlowDisplay,
  getPeriodLabel
}
