/**
 * Dashboard Dialogs
 *
 * Modal dialogs for help, session prompts, captures, etc.
 */

import blessed from 'blessed'

/**
 * Show help dialog
 * @param {Object} screen - Blessed screen instance
 * @param {Function} onClose - Callback when dialog closes
 */
export function showHelpDialog(screen, onClose) {
  const help = blessed.box({
    top: 'center',
    left: 'center',
    width: 58,
    height: 28,
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
  help.focus()
  screen.render()

  help.onceKey(['escape', 'q', 'enter', 'space'], () => {
    screen.remove(help)
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
    width: 50,
    height: 3,
    border: { type: 'line', fg: 'green' },
    label: ' Start Session - Project name: ',
    style: { bg: 'black' },
    inputOnFocus: true
  })

  screen.append(input)
  input.focus()
  screen.render()

  input.on('submit', (value) => {
    screen.remove(input)
    if (value?.trim() && onSubmit) {
      onSubmit(value.trim())
    }
    screen.render()
  })

  input.on('cancel', () => {
    screen.remove(input)
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
  captureInput.focus()
  screen.render()

  const cleanup = () => {
    screen.remove(captureInput)
    screen.remove(captureLabel)
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
    width: 50,
    height: 12,
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
  breakBox.focus()
  screen.render()

  breakBox.onceKey(['enter', 'space'], () => {
    screen.remove(breakBox)
    if (onContinue) onContinue()
    screen.render()
  })

  breakBox.onceKey(['escape', 'q'], () => {
    screen.remove(breakBox)
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
    width: 60,
    height: 18,
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
  decisionBox.focus()
  screen.render()

  decisionBox.onceKey(['escape', 'enter', 'space', 'q'], () => {
    screen.remove(decisionBox)
    if (onClose) onClose()
    screen.render()
  })
}
