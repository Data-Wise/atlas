/**
 * Plan View - Morning Ritual Dashboard
 *
 * ADHD-friendly morning planning interface:
 * - Yesterday's work summary
 * - Streak display
 * - Inbox items count
 * - Active projects with priority
 * - Actionable suggestions
 * - Energy level selector
 */

import blessed from 'blessed'

/**
 * Create the plan view
 * @param {Object} screen - Blessed screen instance
 * @returns {Object} Plan view components and methods
 */
export function createPlanView(screen) {
  const planView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    style: { bg: 'black' }
  })

  // Title bar with greeting
  const titleBar = blessed.box({
    parent: planView,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'white', bg: 'black' }
  })

  // Yesterday summary
  const yesterdayBox = blessed.box({
    parent: planView,
    top: 2,
    left: 1,
    width: '48%',
    height: 6,
    tags: true,
    border: { type: 'line', fg: 'gray' },
    label: ' 📅 Yesterday ',
    style: { fg: 'white', bg: 'black' }
  })

  // Streak & stats
  const streakBox = blessed.box({
    parent: planView,
    top: 2,
    right: 1,
    width: '48%',
    height: 6,
    tags: true,
    border: { type: 'line', fg: 'gray' },
    label: ' 🔥 Streak ',
    style: { fg: 'white', bg: 'black' }
  })

  // Suggestions list (main interactive area)
  const suggestionsBox = blessed.box({
    parent: planView,
    top: 9,
    left: 1,
    width: '100%-2',
    height: '50%-3',
    tags: true,
    border: { type: 'line', fg: 'cyan' },
    label: ' 💡 Suggestions ',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: '│', style: { fg: 'gray' } },
    style: { fg: 'white', bg: 'black' }
  })

  // Quick stats footer
  const statsBar = blessed.box({
    parent: planView,
    bottom: 2,
    left: 1,
    width: '100%-2',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' }
  })

  // Command bar
  const commandBar = blessed.box({
    parent: planView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content: ' {cyan-fg}↑↓{/} Navigate  {cyan-fg}Enter{/} Execute  {cyan-fg}e{/} Energy  {cyan-fg}s{/} Start Session  {cyan-fg}Esc{/} Back'
  })

  // State
  let planData = null
  let selectedIndex = 0
  let energyLevel = null // high, medium, low

  /**
   * Update display with plan data from PlanDayUseCase
   * @param {Object} data - Result from PlanDayUseCase.execute()
   */
  function updateDisplay(data) {
    planData = data || {}
    selectedIndex = Math.min(selectedIndex, Math.max(0, (planData.suggestions?.length || 1) - 1))

    // Title with greeting
    const greeting = planData.greeting || 'Hello!'
    const energyStr = energyLevel ? `{cyan-fg}Energy: ${energyLevel}{/}` : '{gray-fg}Energy: not set{/}'
    titleBar.setContent(` {bold}${greeting}{/}  ─────────────────────────  ${energyStr}`)

    // Yesterday summary
    const yesterday = planData.yesterday || {}
    if (yesterday.hasSessions) {
      yesterdayBox.setContent(
        ` {white-fg}${yesterday.sessionCount} sessions{/}\n` +
        ` {cyan-fg}${yesterday.hours}h ${yesterday.minutes}m{/} total\n` +
        ` {green-fg}${yesterday.completionRate}%{/} completed\n` +
        ` Last: {yellow-fg}${yesterday.lastProject || 'unknown'}{/}`
      )
    } else {
      yesterdayBox.setContent(
        ` {gray-fg}No sessions yesterday{/}\n\n` +
        ` {yellow-fg}Fresh start today!{/}`
      )
    }

    // Streak display
    const streak = planData.streak || {}
    const streakDisplay = streak.display || '🔥'
    streakBox.setContent(
      ` Current: {bold}{green-fg}${streak.current || 0} days{/}\n` +
      ` Longest: {cyan-fg}${streak.longest || 0} days{/}\n` +
      ` ${streakDisplay}\n` +
      ` {gray-fg}${streak.message || ''}{/}`
    )

    // Suggestions
    const suggestions = planData.suggestions || []
    const lines = []

    if (suggestions.length === 0) {
      lines.push(' {gray-fg}No suggestions - start fresh!{/}')
    } else {
      suggestions.forEach((s, i) => {
        const isSelected = i === selectedIndex
        const prefix = isSelected ? '{inverse} ► {/}' : '   '
        const icon = getSuggestionIcon(s.type)

        lines.push(`${prefix}${icon} {white-fg}${s.message}{/}`)
        if (s.action && isSelected) {
          lines.push(`     {cyan-fg}→ ${s.action}{/}`)
        }
        lines.push('')
      })
    }

    suggestionsBox.setContent(lines.join('\n'))

    // Stats footer
    const inboxCount = planData.inbox?.length || 0
    const parkedCount = planData.parkedContexts?.length || 0
    const activeCount = planData.activeProjects?.length || 0

    statsBar.setContent(
      ` {cyan-fg}📥 ${inboxCount} inbox{/}  │  ` +
      `{yellow-fg}⏸️ ${parkedCount} parked{/}  │  ` +
      `{green-fg}🟢 ${activeCount} active{/}`
    )

    screen.render()
  }

  /**
   * Get icon for suggestion type
   */
  function getSuggestionIcon(type) {
    const icons = {
      unpark: '⏸️',
      triage: '📥',
      focus: '🎯',
      continue: '▶️',
      streak: '🔥'
    }
    return icons[type] || '💡'
  }

  /**
   * Move selection
   */
  function moveSelection(delta) {
    const count = planData?.suggestions?.length || 0
    if (count === 0) return

    selectedIndex = Math.max(0, Math.min(count - 1, selectedIndex + delta))
    updateDisplay(planData)
  }

  /**
   * Get selected suggestion
   */
  function getSelectedSuggestion() {
    return planData?.suggestions?.[selectedIndex] || null
  }

  /**
   * Cycle energy level
   */
  function cycleEnergyLevel() {
    const levels = [null, 'high', 'medium', 'low']
    const currentIndex = levels.indexOf(energyLevel)
    energyLevel = levels[(currentIndex + 1) % levels.length]
    updateDisplay(planData)
    return energyLevel
  }

  /**
   * Get current energy level
   */
  function getEnergyLevel() {
    return energyLevel
  }

  /**
   * Set energy level directly
   */
  function setEnergyLevel(level) {
    if (['high', 'medium', 'low', null].includes(level)) {
      energyLevel = level
      updateDisplay(planData)
    }
  }

  return {
    view: planView,
    titleBar,
    yesterdayBox,
    streakBox,
    suggestionsBox,
    statsBar,
    commandBar,
    updateDisplay,
    moveSelection,
    getSelectedSuggestion,
    cycleEnergyLevel,
    getEnergyLevel,
    setEnergyLevel,
    show: () => planView.show(),
    hide: () => planView.hide()
  }
}

export default createPlanView
