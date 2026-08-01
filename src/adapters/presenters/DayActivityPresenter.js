/**
 * DayActivityPresenter
 *
 * Formatting for `atlas day`. Table output for interactive use, JSON for
 * programmatic consumers (e.g. savant's research-day-log skill).
 */

/**
 * Format a day's multi-repo activity as a table.
 * @param {Object} activity - Keyed by tree name, from GetDayActivityUseCase
 * @returns {string}
 */
export function formatDayActivityTable(activity) {
  const lines = ['\n📅 DAY ACTIVITY', '─'.repeat(40)]

  for (const [tree, data] of Object.entries(activity)) {
    const hasActivity = data.commits.length > 0 || data.statusDiffs.length > 0 || data.sessionMinutes > 0

    if (!hasActivity) {
      lines.push(`\n${tree}: no activity`)
      continue
    }

    lines.push(`\n${tree}${data.sessionMinutes > 0 ? ` (${data.sessionMinutes}m tracked)` : ''}`)
    for (const entry of data.commits) {
      lines.push(`  ${entry.repo}:`)
      for (const c of entry.commits) {
        lines.push(`    - ${c.subject}`)
      }
    }
    for (const entry of data.statusDiffs) {
      lines.push(`  ${entry.repo} .STATUS changed`)
    }
  }

  return lines.join('\n')
}

/**
 * Format a day's multi-repo activity as JSON.
 * @param {Object} activity
 * @returns {string}
 */
export function formatDayActivityJson(activity) {
  return JSON.stringify(activity, null, 2)
}
