/**
 * Focus View - Pomodoro Timer
 *
 * Minimal, distraction-free focus mode with timer.
 */

import blessed from 'blessed'
import { progressBar } from '../helpers.js'

/**
 * Create the focus view
 * @param {Object} screen - Blessed screen instance
 * @returns {Object} Focus view components and methods
 */
export function createFocusView(screen) {
  const focusView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    style: { bg: 'black' }
  })

  // Large centered timer display
  const focusTimer = blessed.box({
    parent: focusView,
    top: 'center',
    left: 'center',
    width: 50,
    height: 15,
    tags: true,
    border: { type: 'line', fg: 'green' },
    style: { bg: 'black' },
    align: 'center',
    valign: 'middle'
  })

  // Command bar
  const focusCommandBar = blessed.box({
    parent: focusView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content: ' {cyan-fg}Esc{/} Exit Focus  {cyan-fg}Space{/} Pause/Resume  {cyan-fg}r{/} Reset  {cyan-fg}c{/} Capture  {cyan-fg}+/-{/} Adjust Time'
  })

  /**
   * Update the timer display
   */
  function updateTimer(options = {}) {
    const {
      sessionProject = null,
      isActive = false,
      breakReminder = false,
      remaining = 0,
      pomodoroMinutes = 25,
      pomodoroHistory = []
    } = options

    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    // Progress bar
    const elapsed = pomodoroMinutes * 60 - remaining
    const progress = pomodoroMinutes > 0 ? Math.min(100, (elapsed / (pomodoroMinutes * 60)) * 100) : 0
    const barWidth = 30
    const filled = Math.round((progress / 100) * barWidth)
    const bar = '{green-fg}' + '█'.repeat(filled) + '{/}{gray-fg}' + '░'.repeat(barWidth - filled) + '{/}'

    // Session info
    const sessionInfo = sessionProject
      ? `{green-fg}●{/} {bold}${sessionProject}{/}`
      : '{gray-fg}No active session{/}'

    // Status indicator
    const statusIcon = isActive
      ? (breakReminder ? '{yellow-fg}☕ BREAK TIME{/}' : '{green-fg}● FOCUSING{/}')
      : '{yellow-fg}◑ PAUSED{/}'

    // Today's Pomodoro stats
    const today = new Date().toISOString().split('T')[0]
    const todayPomodoros = pomodoroHistory.filter(p => p.completed.startsWith(today))
    const todayMinutes = todayPomodoros.reduce((sum, p) => sum + p.duration, 0)
    const statsLine = todayPomodoros.length > 0
      ? `{cyan-fg}Today: ${todayPomodoros.length} 🍅 (${todayMinutes}m){/}`
      : '{gray-fg}Start your first Pomodoro!{/}'

    focusTimer.setContent(
      `\n\n` +
      `${sessionInfo}\n\n` +
      `{bold}${statusIcon}{/}\n\n` +
      `{bold}{white-fg}${timeStr}{/}\n\n` +
      `${bar}\n\n` +
      `{gray-fg}${pomodoroMinutes} min session{/}\n\n` +
      `${statsLine}`
    )

    screen.render()
  }

  return {
    view: focusView,
    timer: focusTimer,
    commandBar: focusCommandBar,
    updateTimer,
    show: () => focusView.show(),
    hide: () => focusView.hide()
  }
}

export default createFocusView
