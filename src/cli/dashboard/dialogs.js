/**
 * Dashboard Dialogs
 *
 * Modal dialogs for help, session prompts, captures, etc.
 */

import blessed from 'blessed'
import {
  DIALOG_HELP,
  DIALOG_SESSION_PROMPT,
  DIALOG_BREAK_REMINDER,
  DIALOG_DECISION_HELPER,
  DIALOG_TASK_PROMPT,
  DIALOG_TASK_COMPLETE
} from './constants.js'

// Track active dialogs for cleanup on screen destroy
const activeDialogs = new Set()

/**
 * Register a dialog for tracking
 * @private
 */
function registerDialog(element) {
  activeDialogs.add(element)
}

/**
 * Unregister a dialog after cleanup
 * @private
 */
function unregisterDialog(element) {
  activeDialogs.delete(element)
}

/**
 * Cleanup all active dialogs
 * Call this on screen destroy to prevent memory leaks
 * @param {Object} screen - Blessed screen instance
 */
export function cleanupAllDialogs(screen) {
  for (const dialog of activeDialogs) {
    try {
      screen.remove(dialog)
    } catch (e) {
      // Dialog may already be removed
    }
  }
  activeDialogs.clear()
}

/**
 * Get count of active dialogs (for debugging)
 * @returns {number}
 */
export function getActiveDialogCount() {
  return activeDialogs.size
}

/**
 * Show help dialog
 * @param {Object} screen - Blessed screen instance
 * @param {Function} onClose - Callback when dialog closes
 */
export function showHelpDialog(screen, onClose) {
  const help = blessed.box({
    top: 'center',
    left: 'center',
    width: DIALOG_HELP.width,
    height: DIALOG_HELP.height,
    tags: true,
    border: { type: 'line', fg: 'cyan' },
    style: { bg: 'black' },
    label: ' {bold}Keyboard Shortcuts{/} ',
    content: `
  {bold}{cyan-fg}Navigation{/}
  ─────────────────────────────────────────
  {yellow-fg}↑/↓{/}        Navigate projects
  {yellow-fg}Enter{/}      Open project details
  {yellow-fg}Esc{/}        Back / Exit focus mode
  {yellow-fg}Tab{/}        Switch panels

  {bold}{cyan-fg}Actions{/}
  ─────────────────────────────────────────
  {yellow-fg}s{/}          Start session
  {yellow-fg}e{/}          End session
  {yellow-fg}c{/}          Quick capture
  {yellow-fg}r{/}          Refresh
  {yellow-fg}o{/}          Open project folder

  {bold}{cyan-fg}Filter & Search{/}
  ─────────────────────────────────────────
  {yellow-fg}/{/}          Search projects
  {yellow-fg}a{/}/{yellow-fg}p{/}/{yellow-fg}*{/}      Filter: active/paused/all
  {yellow-fg}d{/}          Decision helper
  {yellow-fg}t{/}          Cycle themes

  {bold}{cyan-fg}Focus Mode (f) / Zen Mode (z){/}
  ─────────────────────────────────────────
  {yellow-fg}Space{/}      Pause/Resume timer
  {yellow-fg}r{/}          Reset timer
  {yellow-fg}+/-{/}        Adjust time (±5m)
  {yellow-fg}z{/}          Toggle Zen mode (minimal)

  {yellow-fg}q{/} Quit  {yellow-fg}?{/} Help  {gray-fg}Press any key to close{/}
    `
  })

  screen.append(help)
  registerDialog(help)
  help.focus()
  screen.render()

  help.onceKey(['escape', 'q', 'enter', 'space'], () => {
    screen.remove(help)
    unregisterDialog(help)
    if (onClose) onClose()
    screen.render()
  })
}

/**
 * Show session prompt dialog
 * @param {Object} screen - Blessed screen instance
 * @param {Function} onSubmit - Callback with project name
 * @param {Function} onCancel - Callback when cancelled
 */
export function showSessionPrompt(screen, onSubmit, onCancel) {
  const input = blessed.textbox({
    top: 'center',
    left: 'center',
    width: DIALOG_SESSION_PROMPT.width,
    height: DIALOG_SESSION_PROMPT.height,
    border: { type: 'line', fg: 'green' },
    label: ' Start Session - Project name: ',
    style: { bg: 'black' },
    inputOnFocus: true
  })

  screen.append(input)
  registerDialog(input)
  input.focus()
  screen.render()

  input.on('submit', (value) => {
    screen.remove(input)
    unregisterDialog(input)
    if (value?.trim() && onSubmit) {
      onSubmit(value.trim())
    }
    screen.render()
  })

  input.on('cancel', () => {
    screen.remove(input)
    unregisterDialog(input)
    if (onCancel) onCancel()
    screen.render()
  })
}

/**
 * Show capture prompt (inline at bottom)
 * @param {Object} screen - Blessed screen instance
 * @param {Function} onSubmit - Callback with capture text
 * @param {Function} onCancel - Callback when cancelled
 */
export function showCapturePrompt(screen, onSubmit, onCancel) {
  const captureLabel = blessed.box({
    bottom: 3,
    left: 0,
    width: 12,
    height: 1,
    tags: true,
    style: { fg: 'black', bg: 'yellow' },
    content: ' 💡 Capture:'
  })

  const captureInput = blessed.textbox({
    bottom: 3,
    left: 12,
    width: '100%-12',
    height: 1,
    tags: true,
    style: {
      fg: 'white',
      bg: 'yellow'
    },
    inputOnFocus: true
  })

  screen.append(captureLabel)
  screen.append(captureInput)
  registerDialog(captureLabel)
  registerDialog(captureInput)
  captureInput.focus()
  screen.render()

  const cleanup = () => {
    screen.remove(captureInput)
    screen.remove(captureLabel)
    unregisterDialog(captureInput)
    unregisterDialog(captureLabel)
    screen.render()
  }

  captureInput.on('submit', (value) => {
    cleanup()
    if (value?.trim() && onSubmit) {
      onSubmit(value.trim())
    }
  })

  captureInput.on('cancel', () => {
    cleanup()
    if (onCancel) onCancel()
  })

  captureInput.key(['escape'], () => {
    cleanup()
    if (onCancel) onCancel()
  })
}

/**
 * Show break reminder dialog
 * @param {Object} screen - Blessed screen instance
 * @param {Object} options - Break info
 * @param {Function} onContinue - Callback when user continues
 * @param {Function} onExit - Callback when user exits
 */
export function showBreakReminder(screen, options, onContinue, onExit) {
  const { sessionNumber = 1, pomodoroMinutes = 25 } = options

  const breakBox = blessed.box({
    top: 'center',
    left: 'center',
    width: DIALOG_BREAK_REMINDER.width,
    height: DIALOG_BREAK_REMINDER.height,
    tags: true,
    border: { type: 'line', fg: 'yellow' },
    label: ' {bold}{yellow-fg}☕ Break Time!{/} ',
    style: { bg: 'black' },
    content: `

  {bold}{green-fg}✓ Pomodoro Complete!{/}

  {cyan-fg}Session #${sessionNumber}{/} - ${pomodoroMinutes} minutes

  Take a 5-minute break to:
  • Stretch & move around
  • Rest your eyes
  • Hydrate

  {gray-fg}Press Enter when ready to continue{/}
    `
  })

  screen.append(breakBox)
  registerDialog(breakBox)
  breakBox.focus()
  screen.render()

  breakBox.onceKey(['enter', 'space'], () => {
    screen.remove(breakBox)
    unregisterDialog(breakBox)
    if (onContinue) onContinue()
    screen.render()
  })

  breakBox.onceKey(['escape', 'q'], () => {
    screen.remove(breakBox)
    unregisterDialog(breakBox)
    if (onExit) onExit()
    screen.render()
  })
}

/**
 * Show decision helper dialog
 * @param {Object} screen - Blessed screen instance
 * @param {Object} options - Decision data
 * @param {Function} onClose - Callback when closed
 */
export function showDecisionHelper(screen, options, onClose) {
  const { timeContext, suggestions = [] } = options

  const decisionBox = blessed.box({
    top: 'center',
    left: 'center',
    width: DIALOG_DECISION_HELPER.width,
    height: DIALOG_DECISION_HELPER.height,
    tags: true,
    border: { type: 'line', fg: 'magenta' },
    label: ' {bold}🎯 What Should I Work On?{/} ',
    style: { bg: 'black' }
  })

  let content = `\n  {cyan-fg}${timeContext}{/}\n\n`

  if (suggestions.length === 0) {
    content += '  {gray-fg}No suggestions - all caught up!{/}\n'
  } else {
    suggestions.slice(0, 4).forEach((s, i) => {
      const icon = i === 0 ? '{green-fg}►{/}' : ' '
      content += `  ${icon} {bold}${s.project.name}{/}\n`
      content += `     {gray-fg}${s.reason}{/}\n\n`
    })
  }

  content += '\n  {gray-fg}Press any key to close{/}'

  decisionBox.setContent(content)
  screen.append(decisionBox)
  registerDialog(decisionBox)
  decisionBox.focus()
  screen.render()

  decisionBox.onceKey(['escape', 'enter', 'space', 'q'], () => {
    screen.remove(decisionBox)
    unregisterDialog(decisionBox)
    if (onClose) onClose()
    screen.render()
  })
}

/**
 * Show task prompt dialog (for Task-Based Focus)
 * @param {Object} screen - Blessed screen instance
 * @param {Function} onSubmit - Callback with task text
 * @param {Function} onSkip - Callback when skipped
 */
export function showTaskPrompt(screen, onSubmit, onSkip) {
  const promptBox = blessed.box({
    top: 'center',
    left: 'center',
    width: DIALOG_TASK_PROMPT.width,
    height: DIALOG_TASK_PROMPT.height,
    tags: true,
    border: { type: 'line', fg: 'green' },
    label: ' {bold}🎯 What will you focus on?{/} ',
    style: { bg: 'black' }
  })

  const input = blessed.textbox({
    parent: promptBox,
    top: 1,
    left: 1,
    width: DIALOG_TASK_PROMPT.width - 4,
    height: 1,
    style: { fg: 'white', bg: 'black' },
    inputOnFocus: true
  })

  const hint = blessed.box({
    parent: promptBox,
    bottom: 0,
    left: 1,
    width: DIALOG_TASK_PROMPT.width - 4,
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content: '{gray-fg}Enter: Submit | Esc: Skip{/}'
  })

  screen.append(promptBox)
  registerDialog(promptBox)
  input.focus()
  screen.render()

  input.on('submit', (value) => {
    screen.remove(promptBox)
    unregisterDialog(promptBox)
    if (value?.trim() && onSubmit) {
      onSubmit(value.trim())
    } else if (onSkip) {
      onSkip()
    }
    screen.render()
  })

  input.on('cancel', () => {
    screen.remove(promptBox)
    unregisterDialog(promptBox)
    if (onSkip) onSkip()
    screen.render()
  })
}

/**
 * Show task completion dialog (after Pomodoro completes)
 * @param {Object} screen - Blessed screen instance
 * @param {Object} options - Task info
 * @param {Function} onComplete - Callback with outcome
 */
export function showTaskComplete(screen, options, onComplete) {
  const { task = 'Focus session', sessionNumber = 1, pomodoroMinutes = 25 } = options

  const completeBox = blessed.box({
    top: 'center',
    left: 'center',
    width: DIALOG_TASK_COMPLETE.width,
    height: DIALOG_TASK_COMPLETE.height,
    tags: true,
    border: { type: 'line', fg: 'green' },
    label: ' {bold}{green-fg}🍅 Pomodoro Complete!{/} ',
    style: { bg: 'black' },
    content: `

  {bold}{cyan-fg}Session #${sessionNumber}{/} - ${pomodoroMinutes} minutes

  {bold}Task:{/}
  "${task.length > 35 ? task.slice(0, 35) + '...' : task}"

  {bold}Did you complete it?{/}

  {green-fg}[c]{/} ✓ Completed
  {yellow-fg}[p]{/} ◐ Partial progress
  {blue-fg}[n]{/} → Pivoted to something else

  {gray-fg}Then take a 5-min break!{/}
    `
  })

  screen.append(completeBox)
  registerDialog(completeBox)
  completeBox.focus()
  screen.render()

  const cleanup = (outcome) => {
    screen.remove(completeBox)
    unregisterDialog(completeBox)
    if (onComplete) onComplete(outcome)
    screen.render()
  }

  completeBox.key(['c'], () => cleanup('completed'))
  completeBox.key(['p'], () => cleanup('partial'))
  completeBox.key(['n'], () => cleanup('pivoted'))
  completeBox.key(['escape', 'enter', 'space'], () => cleanup('completed'))
}
