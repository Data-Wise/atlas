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
  const { summary, streak, bestDay, hourlyDistribution, byProject, period, estimation } = stats

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

  // Estimation accuracy
  if (estimation && estimation.hasData) {
    lines.push('  Time Estimation:')
    lines.push(`    ${estimation.message}`)
    lines.push(`    Estimates used:  ${estimation.sessionsWithEstimates}`)
    lines.push(`    Accuracy rate:   ${estimation.accuracyRate}% (within 10%)`)
    if (estimation.bias !== 'balanced') {
      const biasAmount = Math.abs(estimation.averagePercentageOff)
      const biasDir = estimation.bias === 'underestimate' ? 'under' : 'over'
      lines.push(`    Tendency:        ${biasAmount}% ${biasDir}estimate`)
    }
    lines.push('')
  }

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
  const { summary, streak, estimation, period } = stats
  const lines = []

  lines.push(`Stats for last ${period.days} days${period.projectFilter ? ` (${period.projectFilter})` : ''}:`)
  lines.push(`  ${summary.totalSessions} sessions, ${formatDuration(summary.totalMinutes)} total`)
  lines.push(`  ${summary.flowPercentage}% flow state, ${summary.completionRate}% completion`)

  if (streak.current > 0) {
    lines.push(`  ${streak.display}`)
  }

  if (estimation && estimation.hasData) {
    lines.push(`  Estimation: ${estimation.message}`)
  }

  return lines.join('\n')
}

/**
 * Format stats as Markdown for export
 * @param {Object} stats - Stats from GetSessionStatsUseCase
 * @returns {string} Markdown formatted output
 */
export function formatStatsMarkdown(stats) {
  const { summary, streak, bestDay, hourlyDistribution, byProject, period, estimation } = stats
  const lines = []
  const date = new Date().toISOString().split('T')[0]

  // Header
  const periodLabel = period.projectFilter
    ? `${period.projectFilter} - Last ${period.days} Days`
    : `Last ${period.days} Days`

  lines.push(`# Session Analytics Report`)
  lines.push('')
  lines.push(`**Period:** ${periodLabel}`)
  lines.push(`**Generated:** ${date}`)
  lines.push('')

  // Summary table
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|--------|-------|')
  lines.push(`| Total Sessions | ${summary.totalSessions} |`)
  lines.push(`| Total Time | ${formatDuration(summary.totalMinutes)} |`)
  lines.push(`| Daily Average | ${formatDuration(summary.dailyAverageMinutes)} |`)
  lines.push(`| Flow Sessions | ${summary.flowSessions} (${summary.flowPercentage}%) |`)
  lines.push(`| Completion Rate | ${summary.completionRate}% |`)
  lines.push('')

  // Streak section
  lines.push('## Streak')
  lines.push('')
  if (streak.current > 0) {
    lines.push(`- **Current:** ${streak.display}`)
    lines.push(`- **Longest:** ${streak.longest} days`)
  } else {
    lines.push('No active streak')
  }
  lines.push('')

  // Estimation accuracy section
  if (estimation && estimation.hasData) {
    lines.push('## Time Estimation')
    lines.push('')
    lines.push(`> ${estimation.message}`)
    lines.push('')
    lines.push('| Metric | Value |')
    lines.push('|--------|-------|')
    lines.push(`| Sessions with estimates | ${estimation.sessionsWithEstimates} |`)
    lines.push(`| Accuracy rate (±10%) | ${estimation.accuracyRate}% |`)
    lines.push(`| Average deviation | ${estimation.averagePercentageOff > 0 ? '+' : ''}${estimation.averagePercentageOff}% |`)
    lines.push(`| Underestimates | ${estimation.underestimates} |`)
    lines.push(`| Overestimates | ${estimation.overestimates} |`)
    lines.push(`| Accurate | ${estimation.accurate} |`)
    lines.push('')
  }

  // Best day
  if (bestDay) {
    lines.push('## Best Day')
    lines.push('')
    lines.push(`**${bestDay.dayName}** with ${formatDuration(bestDay.minutes)}`)
    lines.push('')
  }

  // Hourly distribution
  if (hourlyDistribution.some(v => v > 0)) {
    lines.push('## Hourly Distribution')
    lines.push('')
    lines.push('```')
    lines.push(formatHourlySparkline(hourlyDistribution))
    lines.push('6am           12pm           6pm           12am')
    lines.push('```')
    lines.push('')
  }

  // Project breakdown
  if (byProject.length > 0 && !period.projectFilter) {
    lines.push('## By Project')
    lines.push('')
    lines.push('| Project | Sessions | Time | Flow % |')
    lines.push('|---------|----------|------|--------|')

    for (const p of byProject.slice(0, 10)) {
      lines.push(`| ${p.name} | ${p.sessions} | ${formatDuration(p.totalMinutes)} | ${p.flowPercentage}% |`)
    }
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push('*Generated by [Atlas](https://github.com/Data-Wise/atlas)*')

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

/**
 * Format estimation bias for display with color hints
 * @param {Object} estimation - Estimation stats
 * @returns {Object} { display, color }
 */
export function formatEstimationDisplay(estimation) {
  if (!estimation || !estimation.hasData) {
    return { display: 'No data', color: 'gray' }
  }
  if (estimation.accuracyRate >= 70) {
    return { display: `${estimation.accuracyRate}% accurate`, color: 'green' }
  }
  if (estimation.bias === 'underestimate') {
    return { display: `${Math.abs(estimation.averagePercentageOff)}% under`, color: 'yellow' }
  }
  if (estimation.bias === 'overestimate') {
    return { display: `${Math.abs(estimation.averagePercentageOff)}% over`, color: 'cyan' }
  }
  return { display: 'Balanced', color: 'white' }
}

export default {
  formatStatsTable,
  formatStatsJson,
  formatStatsText,
  formatStatsMarkdown,
  formatHourlySparkline,
  formatStatLine,
  formatStreakDisplay,
  formatFlowDisplay,
  formatEstimationDisplay,
  getPeriodLabel
}
