/**
 * NudgePresenter
 *
 * Formatting functions for `atlas nudge ls`. Table output for interactive
 * use, JSON for programmatic consumption.
 */

/**
 * Format a list of nudges as a table for CLI display.
 * @param {Array<import('../../domain/entities/Nudge.js').Nudge>} nudges
 * @returns {string}
 */
export function formatNudgesTable(nudges) {
  if (!nudges?.length) {
    return '☐ No nudges found'
  }

  const lines = []
  lines.push(`\n☐ NUDGES (${nudges.length})`)
  lines.push('─'.repeat(40))

  nudges.forEach((nudge, i) => {
    const stateIcon = { pending: '○', fired: '●', acked: '✓' }[nudge.state] || '○'
    const recurringStr = nudge.recurring ? ' (daily)' : ''
    lines.push(`${i + 1}. ${stateIcon} [${nudge.id}] ${nudge.time}${recurringStr} — ${nudge.message} (${nudge.state})`)
  })

  return lines.join('\n')
}

/**
 * Format a list of nudges as JSON for programmatic consumption.
 * @param {Array<import('../../domain/entities/Nudge.js').Nudge>} nudges
 * @returns {string}
 */
export function formatNudgesJson(nudges) {
  return JSON.stringify((nudges || []).map((n) => n.toJSON()), null, 2)
}
