/**
 * MCP Server Formatters
 *
 * Formatting functions for MCP tool responses.
 * Extracted for testability and reuse.
 */

/**
 * Format duration in minutes to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "1h 30m")
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Format context for MCP response
 * @param {Object} context - Context from GetContextUseCase
 * @returns {string} Formatted context text
 */
export function formatContext(context) {
  if (!context) return 'No context available'

  const lines = []
  lines.push('=== Current Context ===')

  if (context.activeSession) {
    const s = context.activeSession
    lines.push(`\nActive Session: ${s.project}`)
    if (s.task) lines.push(`  Task: ${s.task}`)
    lines.push(`  Duration: ${s.duration || 0} min`)
    if (s.isFlowState) lines.push(`  Status: In flow state`)
  } else {
    lines.push('\nNo active session')
  }

  if (context.project) {
    lines.push(`\nProject: ${context.project}`)
    if (context.focus) lines.push(`  Focus: ${context.focus}`)
  }

  if (context.recentCrumbs?.length > 0) {
    lines.push('\nRecent breadcrumbs:')
    context.recentCrumbs.slice(0, 5).forEach(c => {
      const age = c.ago || c.getAge?.() || ''
      lines.push(`  - ${c.text} ${age ? `(${age})` : ''}`)
    })
  }

  if (context.inboxCount > 0) {
    lines.push(`\nInbox: ${context.inboxCount} items awaiting triage`)
  }

  return lines.join('\n')
}

/**
 * Format projects list for MCP response
 * @param {Array} projects - Projects from ProjectsAPI.list
 * @returns {string} Formatted projects text
 */
export function formatProjects(projects) {
  if (!projects?.length) return 'No projects found'

  const lines = ['=== Projects ===\n']

  projects.forEach(p => {
    const statusIcon = p.status === 'active' ? '🟢' : p.status === 'paused' ? '⏸️' : '⚪'
    lines.push(`${statusIcon} ${p.name}`)
    lines.push(`   Type: ${p.type || 'unknown'} | Status: ${p.status || 'unknown'}`)
    if (p.path) lines.push(`   Path: ${p.path}`)
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * Format session statistics for MCP response
 * @param {Object} stats - Stats from GetSessionStatsUseCase
 * @returns {string} Formatted stats text
 */
export function formatStats(stats) {
  const lines = ['=== Session Statistics ===\n']
  const { summary, streak, bestDay, estimation, period } = stats

  lines.push(`Period: Last ${period.days} days${period.projectFilter ? ` (${period.projectFilter})` : ''}`)
  lines.push('')
  lines.push(`Total Sessions: ${summary.totalSessions}`)
  lines.push(`Total Time: ${formatDuration(summary.totalMinutes)}`)
  lines.push(`Daily Average: ${formatDuration(summary.dailyAverageMinutes)}`)
  lines.push(`Flow Sessions: ${summary.flowSessions} (${summary.flowPercentage}%)`)
  lines.push(`Completion Rate: ${summary.completionRate}%`)

  if (streak.current > 0) {
    lines.push(`\nStreak: ${streak.display} (longest: ${streak.longest} days)`)
  }

  if (bestDay) {
    lines.push(`Best Day: ${bestDay.dayName} (${formatDuration(bestDay.minutes)})`)
  }

  if (estimation?.hasData) {
    lines.push(`\nTime Estimation:`)
    lines.push(`  ${estimation.message}`)
    lines.push(`  Accuracy: ${estimation.accuracyRate}% within 10%`)
  }

  return lines.join('\n')
}

/**
 * Format breadcrumb trail for MCP response
 * @param {Array} trail - Trail from GetTrailUseCase
 * @returns {string} Formatted trail text
 */
export function formatTrail(trail) {
  if (!trail?.length) return 'No breadcrumbs found'

  const lines = ['=== Breadcrumb Trail ===\n']

  trail.slice(0, 20).forEach(crumb => {
    const time = crumb.timestamp?.toLocaleString?.() || crumb.timestamp
    const icon = crumb.getIcon?.() || '🍞'
    lines.push(`${time}`)
    lines.push(`  ${icon} ${crumb.text}`)
    if (crumb.project) lines.push(`  Project: ${crumb.project}`)
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * Format inbox items for MCP response
 * @param {Array} items - Items from GetInboxUseCase
 * @returns {string} Formatted inbox text
 */
export function formatInbox(items) {
  if (!items?.length) return 'Inbox empty'

  const lines = [`=== Inbox (${items.length} items) ===\n`]

  items.forEach((item, i) => {
    const icon = item.type === 'task' ? '☐' : item.type === 'bug' ? '🐛' : '💡'
    const age = item.getAge?.() || item.age || ''
    lines.push(`${i + 1}. ${icon} ${item.text}`)
    if (item.project) lines.push(`   Project: ${item.project}`)
    if (age) lines.push(`   Age: ${age}`)
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * Format morning plan for MCP response
 * @param {Object} plan - Plan from PlanDayUseCase
 * @returns {string} Formatted plan text
 */
export function formatPlan(plan) {
  const lines = []

  lines.push(plan.greeting || '=== Morning Planning ===')
  lines.push('')

  if (plan.streak?.current > 0) {
    lines.push(`Streak: ${plan.streak.display}`)
    lines.push('')
  }

  if (plan.yesterday) {
    lines.push('Yesterday:')
    lines.push(`  Sessions: ${plan.yesterday.sessions}`)
    lines.push(`  Time: ${formatDuration(plan.yesterday.totalMinutes)}`)
    lines.push('')
  }

  if (plan.parked?.length > 0) {
    lines.push('Parked contexts:')
    plan.parked.forEach(p => {
      lines.push(`  - ${p.project}: ${p.reason || 'no reason given'}`)
    })
    lines.push('')
  }

  if (plan.inbox?.length > 0) {
    lines.push(`Inbox: ${plan.inbox.length} items to triage`)
    lines.push('')
  }

  if (plan.suggestions?.length > 0) {
    lines.push('Suggestions:')
    plan.suggestions.slice(0, 3).forEach(s => {
      lines.push(`  - ${s.message}`)
    })
  }

  return lines.join('\n')
}

/**
 * Format session start response
 * @param {Object} session - Session from start
 * @returns {string} Formatted response
 */
export function formatSessionStart(session) {
  let text = `Started session for "${session.project}"${session.task ? `: ${session.task}` : ''}\n`
  if (session.estimatedMinutes) text += `Estimated: ${session.estimatedMinutes} minutes\n`
  if (session.energyLevel) text += `Energy: ${session.energyLevel}\n`
  text += `Started at: ${new Date(session.startTime).toLocaleTimeString()}`
  return text
}

/**
 * Format session end response
 * @param {Object} result - Result from end
 * @param {string} note - Optional note
 * @returns {string} Formatted response
 */
export function formatSessionEnd(result, note) {
  let text = `Session ended. Duration: ${result.duration}`
  if (note) text += `\nNote: ${note}`
  return text
}

/**
 * Format capture response
 * @param {string} text - Captured text
 * @param {string} type - Capture type
 * @param {string} project - Optional project
 * @param {string[]} tags - Optional tags
 * @returns {string} Formatted response
 */
export function formatCapture(text, type, project, tags) {
  let response = `Captured ${type || 'idea'}: "${text}"`
  if (project) response += ` (${project})`
  if (tags?.length) response += ` [${tags.join(', ')}]`
  return response
}

/**
 * Format breadcrumb response
 * @param {string} text - Breadcrumb text
 * @param {string} project - Optional project
 * @returns {string} Formatted response
 */
export function formatBreadcrumb(text, project) {
  let response = `Logged breadcrumb: "${text}"`
  if (project) response += ` (${project})`
  return response
}

export default {
  formatDuration,
  formatContext,
  formatProjects,
  formatStats,
  formatTrail,
  formatInbox,
  formatPlan,
  formatSessionStart,
  formatSessionEnd,
  formatCapture,
  formatBreadcrumb
}
