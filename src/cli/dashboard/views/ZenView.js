/**
 * Zen View - Minimal Distraction Mode
 *
 * Ultra-minimal view with just essential information.
 */

import blessed from 'blessed'

/**
 * Create the zen view
 * @param {Object} screen - Blessed screen instance
 * @returns {Object} Zen view components and methods
 */
export function createZenView(screen) {
  const zenView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    style: { bg: 'black' }
  })

  // Centered content
  const zenContent = blessed.box({
    parent: zenView,
    top: 'center',
    left: 'center',
    width: 60,
    height: 15,
    tags: true,
    style: { bg: 'black' },
    align: 'center',
    valign: 'middle'
  })

  // Minimal command bar
  const zenCommandBar = blessed.box({
    parent: zenView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content: ' {cyan-fg}Space{/} Pause  {cyan-fg}c{/} Capture  {cyan-fg}Esc{/} Expand  {cyan-fg}q{/} Quit'
  })

  /**
   * Update zen display
   */
  function updateDisplay(options = {}) {
    const {
      projectName = 'No session',
      isActive = false,
      breakReminder = false,
      remaining = 0,
      pomodoroMinutes = 25,
      pomodoroHistory = [],
      streakDays = 0
    } = options

    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    // Progress bar
    const elapsed = pomodoroMinutes * 60 - remaining
    const progress = pomodoroMinutes > 0 ? (elapsed / (pomodoroMinutes * 60)) * 100 : 0
    const barWidth = 30
    const filled = Math.round((progress / 100) * barWidth)
    const bar = '{green-fg}' + '█'.repeat(filled) + '{/}{gray-fg}' + '░'.repeat(barWidth - filled) + '{/}'

    // Status
    const statusIcon = isActive
      ? (breakReminder ? '{yellow-fg}☕ BREAK{/}' : '{green-fg}● FOCUS{/}')
      : '{yellow-fg}◑ PAUSED{/}'

    // Today's stats
    const today = new Date().toISOString().split('T')[0]
    const todayCount = pomodoroHistory.filter(p => p.completed.startsWith(today)).length

    zenContent.setContent(
      `\n\n` +
      `{bold}{white-fg}${projectName}{/}\n\n` +
      `${statusIcon}\n\n` +
      `{bold}{white-fg}${timeStr}{/}\n\n` +
      `${bar}\n\n` +
      `{cyan-fg}Day ${streakDays || 1}{/}  |  {cyan-fg}${todayCount} 🍅 today{/}`
    )

    screen.render()
  }

  return {
    view: zenView,
    content: zenContent,
    commandBar: zenCommandBar,
    updateDisplay,
    show: () => zenView.show(),
    hide: () => zenView.hide()
  }
}

export default createZenView
