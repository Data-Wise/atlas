/**
 * Atlas Dashboard TUI
 *
 * ADHD-friendly terminal dashboard with:
 * - Visual graphs (sparklines, progress bars)
 * - Always-visible keyboard shortcuts
 * - Project detail view on Enter
 * - Color-coded status indicators
 * - Zen mode for minimal distraction
 * - State machine for reliable transitions
 */

import blessed from 'blessed'
import contrib from 'blessed-contrib'
import { createStateMachine, STATES } from './dashboard/stateMachine.js'
import { createTimerManager } from './dashboard/timerManager.js'
import { StreakCalculator } from '../utils/StreakCalculator.js'
import { TimeBlindnessHelper } from '../utils/TimeBlindnessHelper.js'
import { ContextRestorationHelper } from '../utils/ContextRestorationHelper.js'
import { CelebrationHelper } from '../utils/CelebrationHelper.js'
import {
  CARD_HEIGHT,
  MIN_TERMINAL_WIDTH,
  MIN_TERMINAL_HEIGHT,
  REFRESH_INTERVAL,
  DEFAULT_POMODORO_MINUTES,
  MIN_POMODORO_MINUTES,
  MAX_POMODORO_MINUTES,
  POMODORO_ADJUST_STEP,
  PROBLEM_TERMINALS,
  FALLBACK_TERMINAL,
  MORNING_START,
  MORNING_END,
  AFTERNOON_END,
  EVENING_END
} from './dashboard/constants.js'

/**
 * Create and run the dashboard
 */
export async function runDashboard(atlas, options = {}) {
  // Check for valid terminal
  if (!process.stdout.isTTY) {
    console.error('Error: Dashboard requires an interactive terminal (TTY)')
    console.error('Run this command in a terminal, not through a pipe or script.')
    process.exit(1)
  }

  // Check terminal dimensions
  const cols = process.stdout.columns || 80
  const rows = process.stdout.rows || 24
  if (cols < MIN_TERMINAL_WIDTH || rows < MIN_TERMINAL_HEIGHT) {
    console.error(`Error: Terminal too small (${cols}x${rows})`)
    console.error(`Dashboard requires at least ${MIN_TERMINAL_WIDTH}x${MIN_TERMINAL_HEIGHT}. Please resize your terminal.`)
    process.exit(1)
  }

  // Detect if canvas-based widgets will work
  // Canvas fails in pseudo-TTYs (from script command), XPC service contexts, etc.
  // Detect problematic terminals (Ghostty has terminfo issues with ansi-term)
  const currentTerm = process.env.TERM || ''
  const isProblematicTerminal = PROBLEM_TERMINALS.some(t => currentTerm.includes(t))

  // Canvas-based widgets fail in pseudo-TTYs, XPC contexts, and problematic terminals
  const canvasSupported = !(
    process.env.XPC_SERVICE_NAME === '0' ||  // Running in XPC service context
    !process.stdout.getWindowSize ||          // No window size function
    cols <= 0 || rows <= 0 ||                 // Invalid dimensions
    isProblematicTerminal                     // Ghostty causes ansi-term crashes
  )

  // Use safe terminal fallback for problematic terminals
  const safeTerminal = isProblematicTerminal
    ? FALLBACK_TERMINAL
    : currentTerm || FALLBACK_TERMINAL

  const screen = blessed.screen({
    smartCSR: true,
    title: 'Atlas Dashboard',
    fullUnicode: true,
    terminal: safeTerminal
  })

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Create state machine for view management
  const stateMachine = createStateMachine({ initial: STATES.BROWSE })

  // Create timer manager for Pomodoro
  const timer = createTimerManager({ defaultMinutes: DEFAULT_POMODORO_MINUTES })

  // Track data state (separate from view state)
  let projectList = []
  let filteredList = []
  let selectedProject = null
  let currentFilter = '*' // 'a' = active, 'p' = paused, 's' = stable, '*' = all
  let searchTerm = ''
  let activeSessionProject = null // Track which project has active session

  // Legacy timer state (for compatibility during refactor)
  let pomodoroActive = false
  let pomodoroStart = null
  let pomodoroMinutes = DEFAULT_POMODORO_MINUTES
  let breakReminder = false
  let timerInterval = null
  let focusTask = null // Current task for Task-Based Focus
  let taskOutcomes = [] // Track task completion history

  // Theme state
  const themes = {
    default: {
      primary: 'blue',
      secondary: 'cyan',
      accent: 'green',
      warning: 'yellow',
      error: 'red',
      muted: 'gray'
    },
    dark: {
      primary: 'magenta',
      secondary: 'blue',
      accent: 'green',
      warning: 'yellow',
      error: 'red',
      muted: 'gray'
    },
    minimal: {
      primary: 'white',
      secondary: 'gray',
      accent: 'cyan',
      warning: 'yellow',
      error: 'red',
      muted: 'gray'
    }
  }
  const themeNames = Object.keys(themes)
  let currentThemeIndex = 0
  let currentTheme = themes.default

  // Pomodoro history (completed sessions)
  let pomodoroHistory = []
  let breakEnforced = false // When true, locks dashboard during break

  // Cycle to next theme
  function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % themeNames.length
    const themeName = themeNames[currentThemeIndex]
    currentTheme = themes[themeName]
    applyTheme()
    statusBar.setContent(` {green-fg}Theme: ${themeName}{/}`)
    screen.render()
  }

  // Apply current theme to widgets
  function applyTheme() {
    // Apply to actual widgets that exist
    titleBar.style.bg = currentTheme.primary
    filterBar.style.bg = 'black'
    commandBar.style.bg = currentTheme.primary
    // Note: projectsTable and sidebar are legacy shims - skip them
    screen.render()
  }

  // Terminal size detection for adaptive layout
  function getLayoutMode() {
    const width = screen.width
    const height = screen.height
    if (width < 80) return 'compact'
    if (width < 120) return 'normal'
    return 'wide'
  }

  // ============================================================================
  // MAIN VIEW WIDGETS - Card Stack Design
  // ============================================================================

  const mainView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: { bg: 'black' }
  })

  // Title bar - minimal
  const titleBar = blessed.box({
    parent: mainView,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'white', bg: 'black' },
    content: ' {bold}ATLAS{/bold}  {gray-fg}─────────────────────────────────────────────────────────{/}'
  })

  // Card container - scrollable area for project cards
  const cardContainer = blessed.box({
    parent: mainView,
    top: 2,
    left: 2,
    right: 2,
    bottom: 4,
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '│',
      style: { fg: 'gray' }
    },
    keys: true,
    vi: true,
    mouse: true
  })

  // Project cards will be created dynamically
  let projectCards = []
  let selectedCardIndex = 0
  const MAX_VISIBLE_CARDS = Math.floor((screen.height - 8) / CARD_HEIGHT)

  // Stats footer - always visible
  const statsFooter = blessed.box({
    parent: mainView,
    bottom: 2,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    align: 'center'
  })

  // Command bar - contextual hints
  const commandBar = blessed.box({
    parent: mainView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 2,
    tags: true,
    style: { fg: 'white', bg: '#1a1a1a' },
    content: '\n  {cyan-fg}↑↓{/} Navigate  {cyan-fg}Enter{/} Details  {cyan-fg}s{/} Session  {cyan-fg}f{/} Focus  {cyan-fg}z{/} Zen  {cyan-fg}c{/} Capture  {cyan-fg}d{/} Decide  {cyan-fg}?{/} Help'
  })

  // Update command bar based on context
  function updateCommandBar() {
    if (activeSessionProject) {
      commandBar.setContent(
        `\n  {green-fg}●{/} {bold}${activeSessionProject}{/}  {gray-fg}│{/}  ` +
        `{cyan-fg}e{/} End  {cyan-fg}f{/} Focus  {cyan-fg}c{/} Capture  {cyan-fg}Enter{/} Details  {cyan-fg}?{/} Help  {cyan-fg}q{/} Quit`
      )
    } else {
      commandBar.setContent(
        '\n  {cyan-fg}↑↓{/} Navigate  {cyan-fg}Enter{/} Details  {cyan-fg}s{/} Session  {cyan-fg}f{/} Focus  {cyan-fg}z{/} Zen  {cyan-fg}c{/} Capture  {cyan-fg}d{/} Decide  {cyan-fg}?{/} Help'
      )
    }
  }

  // Search input (hidden by default)
  const searchInput = blessed.textbox({
    parent: mainView,
    top: 1,
    left: 2,
    width: '50%',
    height: 1,
    tags: true,
    hidden: true,
    style: {
      fg: 'white',
      bg: '#333',
      focus: { bg: '#333' }
    },
    inputOnFocus: true
  })

  // Filter indicator
  const filterBar = blessed.box({
    parent: mainView,
    top: 1,
    left: 2,
    width: '100%-4',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' }
  })

  // Compatibility shims for old code paths
  // TODO: Refactor callers to use new widget names directly, then remove these
  const statusBar = titleBar // Used for status messages throughout
  const projectsTable = { // Shim for focus management
    rows: { selected: 0, emit: () => {} },
    setData: () => {},
    focus: () => cardContainer.focus()
  }
  const sidebar = blessed.box({ hidden: true }) // Unused but referenced
  const activitySpark = { setData: () => {} } // Unused stub
  const statsBox = blessed.box({ setContent: () => {} }) // Unused stub
  const capturesBox = blessed.box({ setContent: () => {} }) // Unused stub

  screen.append(mainView)

  // ============================================================================
  // CARD CREATION AND MANAGEMENT
  // ============================================================================

  // Helper: Create a mini progress bar (10 chars)
  function createMiniProgressBar(percent) {
    const width = 10
    const filled = Math.round((percent / 100) * width)
    const empty = width - filled
    const color = percent >= 75 ? 'green' : percent >= 40 ? 'yellow' : 'blue'
    return `{${color}-fg}${'█'.repeat(filled)}{/}{gray-fg}${'░'.repeat(empty)}{/} ${percent}%`
  }

  // Helper: Truncate text with ellipsis
  function truncateText(text, maxLen) {
    if (!text) return ''
    if (text.length <= maxLen) return text
    return text.substring(0, maxLen - 1) + '…'
  }

  function createProjectCard(project, index, isSelected, isActive) {
    const cardTop = index * CARD_HEIGHT

    // Card colors based on state
    let borderColor = 'gray'
    let bgColor = 'black'
    let nameColor = 'white'

    if (isActive) {
      borderColor = 'green'
      nameColor = 'green'
    }
    if (isSelected) {
      borderColor = 'cyan'
      bgColor = '#111'
    }

    const card = blessed.box({
      parent: cardContainer,
      top: cardTop,
      left: 0,
      width: '100%-2',
      height: CARD_HEIGHT - 1,
      tags: true,
      border: { type: 'line', fg: borderColor },
      style: { bg: bgColor }
    })

    // Project name and status
    const statusIcon = getStatusIcon(project.status || 'unknown')
    const activeIndicator = isActive ? '{green-fg}● ACTIVE{/}' : ''
    const timeInfo = project.lastSession ? timeAgo(project.lastSession) : ''

    const nameDisplay = isActive
      ? `{bold}{green-fg}${project.name}{/}{/bold}`
      : `{bold}{${nameColor}-fg}${project.name}{/}{/bold}`

    // Line 1: Name and active status
    const line1 = blessed.box({
      parent: card,
      top: 0,
      left: 1,
      width: '100%-4',
      height: 1,
      tags: true,
      content: `${statusIcon} ${nameDisplay}  ${activeIndicator}`
    })

    // Line 2: Type, status, time + progress bar
    const typeStr = getTypeStr(project.type)
    const statusStr = project.status || 'unknown'
    const progress = project.progress || project.metadata?.progress || 0

    // Mini progress bar (10 chars wide)
    const miniProgressBar = progress > 0
      ? ` ${createMiniProgressBar(progress)}`
      : ''

    const line2 = blessed.box({
      parent: card,
      top: 1,
      left: 1,
      width: '100%-4',
      height: 1,
      tags: true,
      content: `  {gray-fg}${typeStr} • ${statusStr}${timeInfo ? ' • ' + timeInfo : ''}${miniProgressBar}{/}`
    })

    // Line 3: Next action or focus (if available) - only on selected card for clarity
    const nextAction = project.next || project.metadata?.next
    const focusText = project.focus || project.metadata?.focus
    const actionText = nextAction || focusText

    if (actionText || isSelected) {
      const displayText = actionText
        ? `{yellow-fg}→{/} ${truncateText(actionText, 50)}`
        : isSelected
          ? '{gray-fg}Press Enter for details, s to start session{/}'
          : ''

      if (displayText) {
        const line3 = blessed.box({
          parent: card,
          top: 2,
          left: 1,
          width: '100%-4',
          height: 1,
          tags: true,
          content: `  ${displayText}`
        })
      }
    }

    return card
  }

  function renderCards() {
    // Clear existing cards
    for (const card of projectCards) {
      card.destroy()
    }
    projectCards = []

    // Create new cards
    for (let i = 0; i < filteredList.length; i++) {
      const project = filteredList[i]
      const isSelected = i === selectedCardIndex
      const isActive = project.name === activeSessionProject
      const card = createProjectCard(project, i, isSelected, isActive)
      projectCards.push(card)
    }

    // Show pagination indicator if needed
    if (filteredList.length > MAX_VISIBLE_CARDS) {
      const moreCount = filteredList.length - MAX_VISIBLE_CARDS
      titleBar.setContent(
        ` {bold}ATLAS{/bold}  {gray-fg}────────────────────────────────────────{/}  ` +
        `{gray-fg}${filteredList.length} projects (scroll for more){/}`
      )
    } else {
      titleBar.setContent(
        ` {bold}ATLAS{/bold}  {gray-fg}────────────────────────────────────────{/}  ` +
        `{gray-fg}${filteredList.length} projects{/}`
      )
    }

    // Scroll to selected card
    cardContainer.scrollTo(selectedCardIndex * CARD_HEIGHT)

    screen.render()
  }

  function selectCard(index) {
    if (index < 0) index = 0
    if (index >= filteredList.length) index = filteredList.length - 1
    if (index < 0) return

    selectedCardIndex = index
    selectedProject = filteredList[index]
    renderCards()
  }

  // ============================================================================
  // DETAIL VIEW WIDGETS
  // ============================================================================

  const detailView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true
  })

  // Detail header
  const detailHeader = blessed.box({
    parent: detailView,
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: { fg: 'white', bg: 'green' }
  })

  // Left panel - Project info & session gauge
  const detailLeftPanel = blessed.box({
    parent: detailView,
    top: 3,
    left: 0,
    width: '50%',
    height: '100%-6',
    border: { type: 'line', fg: 'green' },
    label: ' {bold}Project{/} ',
    tags: true
  })

  // Project info text
  const projectInfoBox = blessed.box({
    parent: detailLeftPanel,
    top: 0,
    left: 1,
    width: '100%-4',
    height: 6,
    tags: true
  })

  // Session gauge (visual progress)
  let sessionGauge = null
  if (canvasSupported) {
    sessionGauge = contrib.gauge({
      parent: detailLeftPanel,
      top: 7,
      left: 1,
      width: '100%-4',
      height: 5,
      label: ' Today\'s Progress ',
      stroke: 'green',
      fill: 'white',
      showLabel: true
    })
  } else {
    // Text-based fallback when canvas widgets won't work
    sessionGauge = blessed.box({
      parent: detailLeftPanel,
      top: 7,
      left: 1,
      width: '100%-4',
      height: 5,
      border: { type: 'line' },
      label: ' Today\'s Progress ',
      tags: true,
      content: '{center}{gray-fg}(Gauge unavailable){/}{/center}'
    })
  }

  // Current session box
  const currentSessionBox = blessed.box({
    parent: detailLeftPanel,
    top: 13,
    left: 1,
    width: '100%-4',
    bottom: 1,
    tags: true,
    border: { type: 'line', fg: 'cyan' },
    label: ' {bold}Current Session{/} '
  })

  // Right panel - Breadcrumbs & Captures (using log widget for scrolling)
  const detailRightPanel = blessed.box({
    parent: detailView,
    top: 3,
    right: 0,
    width: '50%',
    height: '100%-6',
    border: { type: 'line', fg: 'blue' },
    label: ' {bold}Activity{/} ',
    tags: true
  })

  // Breadcrumbs log (scrollable)
  const breadcrumbsLog = contrib.log({
    parent: detailRightPanel,
    top: 0,
    left: 1,
    width: '100%-4',
    height: '50%-1',
    label: ' 🍞 Breadcrumbs ',
    tags: true,
    border: { type: 'line', fg: 'gray' },
    bufferLength: 20
  })

  // Captures log (scrollable)
  const capturesLog = contrib.log({
    parent: detailRightPanel,
    top: '50%',
    left: 1,
    width: '100%-4',
    bottom: 1,
    label: ' 💡 Captures ',
    tags: true,
    border: { type: 'line', fg: 'yellow' },
    bufferLength: 20
  })

  // Detail command bar
  const detailCommandBar = blessed.box({
    parent: detailView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: { fg: 'white', bg: 'black' },
    content: ' {yellow-fg}Esc{/} Back  {cyan-fg}s{/} Session  {cyan-fg}c{/} Capture  {cyan-fg}o{/} Open  {gray-fg}│{/} {yellow-fg}↑↓{/} Scroll'
  })

  screen.append(detailView)

  // ============================================================================
  // FOCUS MODE VIEW (Minimal, distraction-free)
  // ============================================================================

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

  // Focus mode command bar
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

  screen.append(focusView)

  // ============================================================================
  // ZEN MODE VIEW - Minimal distraction mode
  // ============================================================================

  const zenView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    style: { bg: 'black' }
  })

  // Zen mode content - large centered display
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

  // Zen mode minimal command bar
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

  screen.append(zenView)

  // ============================================================================
  // TIMELINE VIEW - Time block visualization
  // ============================================================================

  const timelineView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    style: { bg: 'black' }
  })

  // Timeline header
  const timelineHeader = blessed.box({
    parent: timelineView,
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    border: { type: 'line', fg: 'cyan' },
    style: { bg: 'black' },
    align: 'center'
  })

  // Timeline content - horizontal timeline
  const timelineContent = blessed.box({
    parent: timelineView,
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-5',
    tags: true,
    scrollable: true,
    style: { bg: 'black' },
    padding: { left: 2, right: 2 }
  })

  // Timeline command bar
  const timelineCommandBar = blessed.box({
    parent: timelineView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content: ' {cyan-fg}Esc{/} Back  {cyan-fg}r{/} Refresh  {cyan-fg}f{/} Focus Mode  {cyan-fg}q{/} Quit'
  })

  screen.append(timelineView)

  // ============================================================================
  // ECOSYSTEM VIEW - Multi-project overview
  // ============================================================================

  const ecosystemView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    style: { bg: 'black' }
  })

  // Ecosystem header
  const ecosystemHeader = blessed.box({
    parent: ecosystemView,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'white', bg: 'black' },
    content: ' {bold}ECOSYSTEM{/}  {gray-fg}────────────────────────────────────────────────{/}'
  })

  // Stats summary
  const ecosystemStats = blessed.box({
    parent: ecosystemView,
    top: 1,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'white', bg: 'black' },
    content: ''
  })

  // Project list
  const ecosystemList = blessed.box({
    parent: ecosystemView,
    top: 3,
    left: 1,
    width: '100%-2',
    height: '100%-5',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: '│', style: { fg: 'gray' } },
    tags: true,
    style: { fg: 'white', bg: 'black' }
  })

  // Ecosystem command bar
  const ecosystemCommandBar = blessed.box({
    parent: ecosystemView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content: ' {cyan-fg}↑↓{/} Navigate  {cyan-fg}Enter{/} View  {cyan-fg}f{/} Focus  {cyan-fg}Esc{/} Back  {cyan-fg}q{/} Quit'
  })

  screen.append(ecosystemView)

  // Ecosystem state
  let ecosystemProjects = []
  let ecosystemSelectedIndex = 0

  // ============================================================================
  // PLAN VIEW (Morning Ritual)
  // ============================================================================

  const planView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    style: { bg: 'black' }
  })

  // Plan title bar
  const planTitle = blessed.box({
    parent: planView,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'white', bg: 'black' }
  })

  // Yesterday summary
  const planYesterday = blessed.box({
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

  // Streak display
  const planStreak = blessed.box({
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

  // Suggestions list
  const planSuggestions = blessed.box({
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

  // Stats footer
  const planStats = blessed.box({
    parent: planView,
    bottom: 2,
    left: 1,
    width: '100%-2',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' }
  })

  // Command bar
  const planCommandBar = blessed.box({
    parent: planView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content: ' {cyan-fg}↑↓{/} Navigate  {cyan-fg}Enter{/} Execute  {cyan-fg}e{/} Energy  {cyan-fg}s{/} Start Session  {cyan-fg}Esc{/} Back'
  })

  screen.append(planView)

  // Plan state
  let planData = null
  let planSelectedIndex = 0
  let planEnergyLevel = null

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function sparkline(data, width = 20) {
    const chars = '▁▂▃▄▅▆▇█'
    const max = Math.max(...data, 1)
    return data.map(v => chars[Math.floor((v / max) * 7)]).join('')
  }

  function progressBar(percent, width = 20) {
    const filled = Math.round((percent / 100) * width)
    const empty = width - filled
    return '{green-fg}' + '█'.repeat(filled) + '{/}{gray-fg}' + '░'.repeat(empty) + '{/}'
  }

  function getStatusIcon(status) {
    const icons = {
      active: '{green-fg}●{/}',
      working: '{green-fg}●{/}',
      'in-progress': '{green-fg}●{/}',
      testing: '{green-fg}◐{/}',
      paused: '{yellow-fg}◑{/}',
      blocked: '{red-fg}✖{/}',
      waiting: '{yellow-fg}◑{/}',
      stable: '{cyan-fg}●{/}',
      complete: '{cyan-fg}✓{/}',
      released: '{cyan-fg}✓{/}',
      ready: '{blue-fg}○{/}',
      planning: '{magenta-fg}○{/}',
      draft: '{gray-fg}○{/}',
      archive: '{gray-fg}▪{/}',
      unknown: '{gray-fg}?{/}'
    }
    return icons[status] || icons.unknown
  }

  function getTypeStr(type) {
    if (typeof type === 'object') {
      return type?.value || type?._value || 'general'
    }
    return type || 'general'
  }

  function timeAgo(date) {
    if (!date) return '-'
    const now = Date.now()
    const then = new Date(date).getTime()
    const diff = now - then
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    const weeks = Math.floor(diff / 604800000)

    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return `${weeks}w`
  }

  function getStatusCategory(status) {
    if (['active', 'working', 'in-progress', 'testing'].includes(status)) return 'a'
    if (['paused', 'blocked', 'waiting'].includes(status)) return 'p'
    if (['stable', 'complete', 'released', 'ready'].includes(status)) return 's'
    return 'o'
  }

  function matchesFilter(project) {
    const status = project.status || 'unknown'
    const category = getStatusCategory(status)

    // Status filter
    if (currentFilter !== '*' && category !== currentFilter) return false

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const name = (project.name || '').toLowerCase()
      const type = getTypeStr(project.type).toLowerCase()
      if (!name.includes(term) && !type.includes(term)) return false
    }

    return true
  }

  function updateFilterBar() {
    const filters = [
      currentFilter === 'a' ? '{green-fg}[A]ctive{/}' : '{gray-fg}[a]ctive{/}',
      currentFilter === 'p' ? '{yellow-fg}[P]aused{/}' : '{gray-fg}[p]aused{/}',
      currentFilter === 's' ? '{cyan-fg}[S]table{/}' : '{gray-fg}[s]table{/}',
      currentFilter === '*' ? '{white-fg}[*]All{/}' : '{gray-fg}[*]all{/}'
    ]
    const searchDisplay = searchTerm ? ` {blue-fg}/${searchTerm}{/}` : ' {gray-fg}/search{/}'
    filterBar.setContent(` ${filters.join('  ')}  ${searchDisplay}`)
  }

  // ============================================================================
  // MAIN VIEW DATA
  // ============================================================================

  async function loadMainView() {
    try {
      const projects = await atlas.projects.list()
      projectList = projects

      // Get active session to highlight its project
      let currentSession = null
      let sessionDuration = 0
      try {
        currentSession = await atlas.sessions.current()
        activeSessionProject = currentSession?.project || null
        if (currentSession && currentSession.getDuration) {
          sessionDuration = currentSession.getDuration()
        }
      } catch (e) {
        activeSessionProject = null
      }
      updateCommandBar()

      // Status counts
      const counts = { active: 0, paused: 0, stable: 0, other: 0 }
      for (const p of projects) {
        const category = getStatusCategory(p.status || 'unknown')
        if (category === 'a') counts.active++
        else if (category === 'p') counts.paused++
        else if (category === 's') counts.stable++
        else counts.other++
      }

      // Apply filters
      filteredList = projects.filter(matchesFilter)

      // Update filter bar
      updateFilterBar()

      // Render cards
      if (selectedCardIndex >= filteredList.length) {
        selectedCardIndex = Math.max(0, filteredList.length - 1)
      }
      if (filteredList.length > 0) {
        selectedProject = filteredList[selectedCardIndex]
      }
      renderCards()

      // Update stats footer with useful info
      let todayStats = { sessions: 0, totalDuration: 0 }
      let streakData = { current: 0, display: '' }
      let timeAwareness = null
      try {
        const status = await atlas.context.getStatus()
        todayStats = status?.today || todayStats
        streakData = status?.streak || streakData

        // Get time awareness for active session
        if (currentSession && sessionDuration > 0) {
          timeAwareness = TimeBlindnessHelper.getTimeAwareness(sessionDuration)
        }
      } catch (e) { /* ignore */ }

      const sessionStr = currentSession
        ? `{green-fg}●{/} ${currentSession.project} (${sessionDuration}m)`
        : '{gray-fg}No active session{/}'

      // Enhanced streak display using StreakCalculator
      const streakStr = streakData.display || (streakData.current > 0 ? `{yellow-fg}🔥 Day ${streakData.current}{/}` : '')
      const todayStr = `Today: ${todayStats.sessions || 0} sessions, ${todayStats.totalDuration || 0}m`

      // Add time awareness cue for long sessions
      const timeCue = timeAwareness?.suggestBreak ? ` {cyan-fg}${timeAwareness.message}{/}` : ''

      statsFooter.setContent(
        `  ${sessionStr}${timeCue}  {gray-fg}│{/}  ${todayStr}  ${streakStr ? '{gray-fg}│{/}  ' + streakStr : ''}`
      )

    } catch (err) {
      titleBar.setContent(` {bold}ATLAS{/bold}  {red-fg}Error: ${err.message}{/}`)
    }

    screen.render()
  }

  // ============================================================================
  // DETAIL VIEW DATA
  // ============================================================================

  async function loadDetailView(project) {
    selectedProject = project
    const name = project.name
    const typeStr = getTypeStr(project.type)
    const status = project.status || 'unknown'

    // Header with project name and status
    detailHeader.setContent(
      ` {bold}← Esc{/}  │  {bold}${name}{/}  │  ${getStatusIcon(status)} ${status}  │  ${typeStr}`
    )

    // Project info box - include next action if available
    const shortPath = (project.path || '').split('/').slice(-3).join('/')
    const nextAction = project.next || project.metadata?.next
    const focusText = project.focus || project.metadata?.focus

    let infoContent =
      `{bold}Name:{/}   ${name}\n` +
      `{bold}Status:{/} ${getStatusIcon(status)} ${status}\n` +
      `{bold}Type:{/}   ${typeStr}\n` +
      `{bold}Path:{/}   ${shortPath}`

    if (nextAction) {
      infoContent += `\n\n{bold}{yellow-fg}Next:{/} ${nextAction.substring(0, 35)}`
    }
    if (focusText) {
      infoContent += `\n{bold}{cyan-fg}Focus:{/} ${focusText.substring(0, 35)}`
    }

    projectInfoBox.setContent(infoContent)

    // Session gauge - today's progress
    let gaugePercent = 0
    let sessionText = '{gray-fg}No active session{/}\nPress {cyan-fg}s{/} to start'

    try {
      const statusData = await atlas.context.getStatus()
      const today = statusData?.today || {}
      gaugePercent = today.sessions ? Math.min(100, Math.round((today.sessions / 5) * 100)) : 0
      if (canvasSupported) {
        sessionGauge.setPercent(gaugePercent)
      }
    } catch (e) {
      if (canvasSupported) {
        sessionGauge.setPercent(0)
      }
    }

    // Current session info
    try {
      const session = await atlas.sessions.current()
      if (session && session.project === name) {
        const duration = session.getDuration ? session.getDuration() : 0
        sessionText = ` {green-fg}● ACTIVE{/} (${duration}m)\n`
        sessionText += ` Task: ${session.task || '-'}\n`
        sessionText += ` {gray-fg}Press e to end{/}`
      } else if (session) {
        sessionText = ` {yellow-fg}● Other: ${session.project}{/}\n`
        sessionText += ` {gray-fg}End other first{/}`
      }
    } catch (e) { /* ignore */ }

    currentSessionBox.setContent(sessionText)

    // Clear and populate breadcrumbs log
    breadcrumbsLog.log('{bold}Recent Activity{/}')
    try {
      const trail = await atlas.context.trail({ project: name, limit: 8 })
      if (trail?.length) {
        trail.forEach(b => {
          const time = new Date(b.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })
          breadcrumbsLog.log(`{cyan-fg}${time}{/} ${(b.text || '').substring(0, 25)}`)
        })
      } else {
        breadcrumbsLog.log('{gray-fg}No breadcrumbs yet{/}')
      }
    } catch (e) {
      breadcrumbsLog.log('{gray-fg}Error loading{/}')
    }

    // Clear and populate captures log
    capturesLog.log('{bold}Inbox Items{/}')
    try {
      const captures = await atlas.capture.inbox({ limit: 8 })
      if (captures?.length) {
        captures.forEach(c => {
          const icon = c.type === 'task' ? '☐' : '💡'
          capturesLog.log(`${icon} ${(c.text || '').substring(0, 28)}`)
        })
      } else {
        capturesLog.log('{gray-fg}Inbox empty!{/}')
      }
    } catch (e) {
      capturesLog.log('{gray-fg}Error loading{/}')
    }

    screen.render()
  }

  // ============================================================================
  // VIEW SWITCHING
  // ============================================================================

  function showMainView() {
    stateMachine.transition(STATES.BROWSE)
    detailView.hide()
    focusView.hide()
    zenView.hide()
    mainView.show()
    projectsTable.focus()
    screen.render()
  }

  function showDetailView(project) {
    stateMachine.transition(STATES.DETAIL, { project })
    mainView.hide()
    focusView.hide()
    zenView.hide()
    detailView.show()
    loadDetailView(project)
  }

  function updateOverviewFor(project) {
    // Update sidebar to show selected project info
    const typeStr = getTypeStr(project.type)
    const status = project.status || 'unknown'
    const statusIcon = getStatusIcon(status)

    statsBox.setContent(
      `{bold}Selected{/}\n` +
      `───────────────────\n` +
      `{cyan-fg}${project.name}{/}\n` +
      `Type: ${typeStr}\n` +
      `Status: ${statusIcon} ${status}\n\n` +
      `{gray-fg}Press Enter for details{/}`
    )
    screen.render()
  }

  // ============================================================================
  // FOCUS MODE
  // ============================================================================

  function showFocusMode() {
    // Show task prompt before starting focus mode
    if (!pomodoroActive) {
      showTaskPromptDialog()
    } else {
      // Already in a Pomodoro, just show focus view
      stateMachine.transition(STATES.FOCUS)
      mainView.hide()
      detailView.hide()
      zenView.hide()
      focusView.show()
      updateFocusTimer()
      screen.render()
    }
  }

  function showTaskPromptDialog() {
    const promptBox = blessed.box({
      top: 'center',
      left: 'center',
      width: 55,
      height: 5,
      tags: true,
      border: { type: 'line', fg: 'green' },
      label: ' {bold}🎯 What will you focus on?{/} ',
      style: { bg: 'black' }
    })

    const input = blessed.textbox({
      parent: promptBox,
      top: 1,
      left: 1,
      width: 49,
      height: 1,
      style: { fg: 'white', bg: 'black' },
      inputOnFocus: true
    })

    const hint = blessed.box({
      parent: promptBox,
      bottom: 0,
      left: 1,
      width: 49,
      height: 1,
      tags: true,
      style: { fg: 'gray', bg: 'black' },
      content: '{gray-fg}Enter: Start focus | Esc: Skip{/}'
    })

    screen.append(promptBox)
    input.focus()
    screen.render()

    const startFocus = (task) => {
      screen.remove(promptBox)
      focusTask = task || null

      stateMachine.transition(STATES.FOCUS)
      mainView.hide()
      detailView.hide()
      zenView.hide()
      focusView.show()
      startPomodoro()
      updateFocusTimer()
      screen.render()
    }

    input.on('submit', (value) => {
      startFocus(value?.trim() || null)
    })

    input.on('cancel', () => {
      screen.remove(promptBox)
      screen.render()
    })
  }

  function exitFocusMode() {
    stateMachine.transition(STATES.BROWSE)
    focusView.hide()
    zenView.hide()
    mainView.show()
    projectsTable.focus()
    screen.render()
  }

  function startPomodoro() {
    pomodoroActive = true
    pomodoroStart = Date.now()
    breakReminder = false

    // Update timer every second
    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(() => {
      // Update the correct view based on current state
      if (stateMachine.is(STATES.FOCUS)) {
        updateFocusTimer()
      } else if (stateMachine.is(STATES.ZEN)) {
        updateZenDisplay()
      }

      // Check for break reminder
      const elapsed = Math.floor((Date.now() - pomodoroStart) / 60000)
      if (elapsed >= pomodoroMinutes && !breakReminder) {
        breakReminder = true
        showBreakReminder()
      }
    }, 1000)
  }

  function pausePomodoro() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    pomodoroActive = false
  }

  function resumePomodoro() {
    if (!pomodoroActive && pomodoroStart) {
      pomodoroActive = true
      timerInterval = setInterval(() => {
        updateFocusTimer()
        const elapsed = Math.floor((Date.now() - pomodoroStart) / 60000)
        if (elapsed >= pomodoroMinutes && !breakReminder) {
          breakReminder = true
          showBreakReminder()
        }
      }, 1000)
    }
  }

  function resetPomodoro() {
    if (timerInterval) clearInterval(timerInterval)
    pomodoroActive = false
    pomodoroStart = null
    breakReminder = false
    startPomodoro()
    updateFocusTimer()
  }

  function updateFocusTimer() {
    const now = Date.now()
    const elapsed = pomodoroStart ? Math.floor((now - pomodoroStart) / 1000) : 0
    const remaining = Math.max(0, (pomodoroMinutes * 60) - elapsed)

    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    // Progress bar
    const progress = pomodoroMinutes > 0 ? Math.min(100, (elapsed / (pomodoroMinutes * 60)) * 100) : 0
    const barWidth = 30
    const filled = Math.round((progress / 100) * barWidth)
    const progressBar = '{green-fg}' + '█'.repeat(filled) + '{/}{gray-fg}' + '░'.repeat(barWidth - filled) + '{/}'

    // Get session info
    let sessionInfo = '{gray-fg}No active session{/}'
    if (activeSessionProject) {
      sessionInfo = `{green-fg}●{/} {bold}${activeSessionProject}{/}`
    }

    // Current task display
    let taskLine = ''
    if (focusTask) {
      const truncatedTask = focusTask.length > 35 ? focusTask.slice(0, 35) + '...' : focusTask
      taskLine = `{cyan-fg}🎯 ${truncatedTask}{/}\n\n`
    }

    // Status indicator
    const statusIcon = pomodoroActive
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
      `\n` +
      `${sessionInfo}\n\n` +
      `${taskLine}` +
      `{bold}${statusIcon}{/}\n\n` +
      `{bold}{white-fg}${timeStr}{/}\n\n` +
      `${progressBar}\n\n` +
      `{gray-fg}${pomodoroMinutes} min session{/}\n\n` +
      `${statsLine}`
    )
    screen.render()
  }

  function showBreakReminder() {
    // Record completed Pomodoro in history
    const completedPomodoro = {
      completed: new Date().toISOString(),
      duration: pomodoroMinutes,
      project: activeSessionProject || 'unknown',
      task: focusTask || null,
      outcome: null
    }
    pomodoroHistory.push(completedPomodoro)

    // Play terminal bell
    process.stdout.write('\x07')

    // Enable break enforcement
    breakEnforced = true

    // If there's a task, show task completion dialog
    if (focusTask) {
      showTaskCompleteDialog(completedPomodoro)
    } else {
      showStandardBreakDialog()
    }
  }

  function showTaskCompleteDialog(pomodoro) {
    const truncatedTask = focusTask.length > 30 ? focusTask.slice(0, 30) + '...' : focusTask

    const completeBox = blessed.box({
      top: 'center',
      left: 'center',
      width: 50,
      height: 16,
      tags: true,
      border: { type: 'line', fg: 'green' },
      label: ' {bold}{green-fg}🍅 Pomodoro Complete!{/} ',
      style: { bg: 'black' },
      content: `

  {bold}{cyan-fg}Session #${pomodoroHistory.length}{/} - ${pomodoroMinutes} minutes

  {bold}Task:{/}
  "${truncatedTask}"

  {bold}Did you complete it?{/}

  {green-fg}[c]{/} ✓ Completed
  {yellow-fg}[p]{/} ◐ Partial progress
  {blue-fg}[n]{/} → Pivoted to something else

  {gray-fg}Then take a 5-min break!{/}
      `
    })

    screen.append(completeBox)
    completeBox.focus()
    screen.render()

    const handleOutcome = (outcome) => {
      // Record outcome
      pomodoro.outcome = outcome
      taskOutcomes.push({
        task: focusTask,
        outcome,
        timestamp: new Date().toISOString()
      })

      breakEnforced = false
      screen.remove(completeBox)
      focusTask = null // Clear task for next Pomodoro
      resetPomodoro()
      focusTimer.focus()
      screen.render()
    }

    completeBox.key(['c'], () => handleOutcome('completed'))
    completeBox.key(['p'], () => handleOutcome('partial'))
    completeBox.key(['n'], () => handleOutcome('pivoted'))
    completeBox.key(['enter', 'space'], () => handleOutcome('completed'))

    completeBox.key(['escape', 'q'], () => {
      pomodoro.outcome = 'skipped'
      breakEnforced = false
      screen.remove(completeBox)
      focusTask = null
      exitFocusMode()
    })
  }

  function showStandardBreakDialog() {
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

  {cyan-fg}Session #${pomodoroHistory.length}{/} - ${pomodoroMinutes} minutes

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
      breakEnforced = false
      screen.remove(breakBox)
      resetPomodoro()
      focusTimer.focus()
      screen.render()
    })

    // Also allow escape to exit focus mode entirely
    breakBox.onceKey(['escape', 'q'], () => {
      breakEnforced = false
      screen.remove(breakBox)
      exitFocusMode()
    })
  }

  function adjustPomodoroTime(delta) {
    pomodoroMinutes = Math.max(MIN_POMODORO_MINUTES, Math.min(MAX_POMODORO_MINUTES, pomodoroMinutes + delta))
    updateFocusTimer()
  }

  // ============================================================================
  // ZEN MODE
  // ============================================================================

  function showZenMode() {
    stateMachine.transition(STATES.ZEN)
    mainView.hide()
    detailView.hide()
    focusView.hide()
    zenView.show()

    // Start timer if not already running
    if (!pomodoroActive) {
      startPomodoro()
    }

    updateZenDisplay()
    screen.render()
  }

  function exitZenMode() {
    stateMachine.transition(STATES.BROWSE)
    zenView.hide()
    mainView.show()
    projectsTable.focus()
    screen.render()
  }

  function updateZenDisplay() {
    const timerStatus = timer.getStatus()
    const todayHistory = timer.getTodayHistory()

    // Get session info
    let projectName = activeSessionProject || 'No session'

    // Calculate streak (simplified - days with any Pomodoro)
    const streakDays = pomodoroHistory.length > 0 ? Math.min(pomodoroHistory.length, 7) : 0

    // Timer display
    const remaining = pomodoroStart
      ? Math.max(0, (pomodoroMinutes * 60) - Math.floor((Date.now() - pomodoroStart) / 1000))
      : pomodoroMinutes * 60
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    // Progress bar (simple ASCII)
    const elapsed = pomodoroMinutes * 60 - remaining
    const progress = pomodoroMinutes > 0 ? (elapsed / (pomodoroMinutes * 60)) * 100 : 0
    const barWidth = 30
    const filled = Math.round((progress / 100) * barWidth)
    const progressBar = '{green-fg}' + '█'.repeat(filled) + '{/}{gray-fg}' + '░'.repeat(barWidth - filled) + '{/}'

    // Status
    const statusIcon = pomodoroActive
      ? (breakReminder ? '{yellow-fg}☕ BREAK{/}' : '{green-fg}● FOCUS{/}')
      : '{yellow-fg}◑ PAUSED{/}'

    // Today's stats
    const todayCount = pomodoroHistory.filter(p =>
      p.completed.startsWith(new Date().toISOString().split('T')[0])
    ).length

    zenContent.setContent(
      `\n\n` +
      `{bold}{white-fg}${projectName}{/}\n\n` +
      `${statusIcon}\n\n` +
      `{bold}{white-fg}${timeStr}{/}\n\n` +
      `${progressBar}\n\n` +
      `{cyan-fg}Day ${streakDays || 1}{/}  |  {cyan-fg}${todayCount} 🍅 today{/}`
    )
    screen.render()
  }

  // ============================================================================
  // TIMELINE VIEW
  // ============================================================================

  async function showTimelineView() {
    stateMachine.transition(STATES.TIMELINE)
    mainView.hide()
    detailView.hide()
    focusView.hide()
    zenView.hide()
    timelineView.show()

    await updateTimelineDisplay()
    screen.render()
  }

  function exitTimelineView() {
    stateMachine.transition(STATES.BROWSE)
    timelineView.hide()
    mainView.show()
    projectsTable.focus()
    screen.render()
  }

  async function updateTimelineDisplay() {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Get today's sessions from repository
    let todaySessions = []
    try {
      const allSessions = await atlas.sessions.history({ limit: 100 })
      todaySessions = allSessions.filter(s =>
        s.startTime && new Date(s.startTime).toISOString().startsWith(todayStr)
      ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    } catch (e) {
      // Fallback to Pomodoro history if sessions unavailable
      todaySessions = pomodoroHistory.filter(p =>
        p.completed.startsWith(todayStr)
      )
    }

    // Calculate total focus time
    const totalMinutes = todaySessions.reduce((sum, s) => {
      if (s.getDuration) return sum + s.getDuration()
      return sum + (s.duration || 0)
    }, 0)

    // Header
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    timelineHeader.setContent(
      `{bold}{cyan-fg}📅 ${dayName}, ${dateStr}{/}  |  ` +
      `{green-fg}${todaySessions.length} sessions{/}  |  ` +
      `{yellow-fg}${totalMinutes} min focused{/}`
    )

    // Build timeline content
    if (todaySessions.length === 0) {
      timelineContent.setContent(
        `\n\n` +
        `  {gray-fg}No sessions recorded today.{/}\n\n` +
        `  {gray-fg}Press {cyan-fg}f{/}{gray-fg} to start a focus session!{/}`
      )
    } else {
      const timelineStr = buildTimelineChart(todaySessions, today)
      timelineContent.setContent(timelineStr)
    }

    screen.render()
  }

  function buildTimelineChart(sessions, today) {
    const lines = []
    const startHour = 6 // 6 AM
    const endHour = 23 // 11 PM
    const width = Math.min(screen.width - 6, 70)

    // Hour labels
    let hourLabels = '  '
    for (let h = startHour; h <= endHour; h += 2) {
      const label = h.toString().padStart(2)
      hourLabels += label + '  '
    }
    lines.push(`{gray-fg}${hourLabels}{/}`)

    // Timeline bar
    const minutesInDay = (endHour - startHour) * 60
    const charPerMinute = width / minutesInDay

    // Build the timeline
    let timeline = ''
    let currentMinute = 0

    // Create session blocks
    const sortedSessions = [...sessions].sort((a, b) =>
      new Date(a.startTime) - new Date(b.startTime)
    )

    for (const session of sortedSessions) {
      const start = new Date(session.startTime)
      const end = session.endTime ? new Date(session.endTime) : new Date()

      const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes()
      const endMinutes = (end.getHours() - startHour) * 60 + end.getMinutes()

      // Skip if outside visible range
      if (endMinutes < 0 || startMinutes > minutesInDay) continue

      // Gap before this session
      if (startMinutes > currentMinute) {
        const gapChars = Math.max(0, Math.floor((startMinutes - currentMinute) * charPerMinute))
        timeline += '{gray-fg}' + '░'.repeat(gapChars) + '{/}'
      }

      // Session block
      const sessionChars = Math.max(1, Math.floor((endMinutes - startMinutes) * charPerMinute))
      const color = getProjectColor(session.project)
      timeline += `{${color}-fg}` + '█'.repeat(sessionChars) + '{/}'

      currentMinute = Math.max(currentMinute, endMinutes)
    }

    // Fill remaining time
    const now = new Date()
    const nowMinutes = (now.getHours() - startHour) * 60 + now.getMinutes()
    if (currentMinute < nowMinutes) {
      const remaining = Math.floor((nowMinutes - currentMinute) * charPerMinute)
      timeline += '{gray-fg}' + '░'.repeat(remaining) + '{/}'
    }

    lines.push('')
    lines.push(`  ${timeline}`)
    lines.push('')

    // Session list
    lines.push(`{bold}  Sessions:{/}`)
    lines.push('')

    for (const session of sortedSessions) {
      const start = new Date(session.startTime)
      const timeStr = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      const duration = session.getDuration ? session.getDuration() : (session.duration || 0)
      const projectName = session.project || 'Unknown'
      const color = getProjectColor(projectName)
      const task = session.task ? ` - ${session.task.slice(0, 30)}` : ''

      lines.push(`  {gray-fg}${timeStr}{/}  {${color}-fg}█{/} {bold}${projectName}{/} {gray-fg}(${duration}m)${task}{/}`)
    }

    // Summary
    lines.push('')
    lines.push(`{gray-fg}  ────────────────────────────────────────{/}`)

    const focusBlocks = sortedSessions.length
    const avgDuration = focusBlocks > 0
      ? Math.round(sortedSessions.reduce((sum, s) => sum + (s.getDuration ? s.getDuration() : s.duration || 0), 0) / focusBlocks)
      : 0

    lines.push(`  {cyan-fg}Focus blocks: ${focusBlocks}{/}  |  {yellow-fg}Avg: ${avgDuration}m{/}`)

    return lines.join('\n')
  }

  function getProjectColor(projectName) {
    // Simple hash-based color assignment
    const colors = ['green', 'cyan', 'yellow', 'magenta', 'blue']
    if (!projectName) return 'gray'
    const hash = projectName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // ============================================================================
  // ECOSYSTEM VIEW
  // ============================================================================

  async function showEcosystemView() {
    stateMachine.transition(STATES.ECOSYSTEM)
    mainView.hide()
    detailView.hide()
    focusView.hide()
    zenView.hide()
    timelineView.hide()
    ecosystemView.show()

    await updateEcosystemDisplay()
    screen.render()
  }

  function exitEcosystemView() {
    stateMachine.transition(STATES.BROWSE)
    ecosystemView.hide()
    mainView.show()
    projectsTable.focus()
    screen.render()
  }

  async function updateEcosystemDisplay() {
    // Use StatusFileParser to scan for .STATUS files in dev-tools ecosystem
    const statusFileParser = atlas.container.resolve('StatusFileParser')
    const { homedir } = await import('node:os')
    const { join } = await import('node:path')

    // Scan ~/projects/dev-tools for .STATUS files
    const rootPath = join(homedir(), 'projects', 'dev-tools')
    let scanResults = []

    try {
      scanResults = await statusFileParser.scanDirectory(rootPath, { maxDepth: 2 })
    } catch (error) {
      // Fall back to registered projects if scan fails
      scanResults = []
    }

    // Convert scan results to project format
    const projectsWithStatus = scanResults.map(({ path, parsed }) => ({
      name: parsed.name || 'Unknown',
      path: path,
      type: parsed.type || 'unknown',
      status: parsed.status || 'unknown',
      progress: parsed.progress || 0,
      priority: parsed.priority || 3,
      phase: parsed.phase || '',
      focus: parsed.focus || '',
      next: parsed.next || ''
    }))

    // Sort: active first, then by priority, then by name
    projectsWithStatus.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.name.localeCompare(b.name)
    })

    // Update stats bar
    const activeCount = projectsWithStatus.filter(p => p.status === 'active').length
    const totalProgress = projectsWithStatus.reduce((sum, p) => sum + (p.progress || 0), 0)
    const avgProgress = projectsWithStatus.length > 0 ? Math.round(totalProgress / projectsWithStatus.length) : 0

    ecosystemStats.setContent(
      ` {green-fg}${activeCount}{/} Active  │  ` +
      `{cyan-fg}${projectsWithStatus.length}{/} Total  │  ` +
      `{yellow-fg}${avgProgress}%{/} Avg Progress`
    )

    // Build project list content
    const lines = []
    const STATUS_ICONS = {
      active: '🟢',
      stable: '✅',
      released: '🚀',
      paused: '⏸️',
      draft: '📝',
      archived: '📦',
      unknown: '❓'
    }

    const PRIORITY_COLORS = { 1: 'red', 2: 'yellow', 3: 'cyan' }

    // Group by status
    const grouped = {
      active: projectsWithStatus.filter(p => p.status === 'active'),
      stable: projectsWithStatus.filter(p => ['stable', 'released'].includes(p.status)),
      paused: projectsWithStatus.filter(p => p.status === 'paused'),
      draft: projectsWithStatus.filter(p => p.status === 'draft'),
      other: projectsWithStatus.filter(p => !['active', 'stable', 'released', 'paused', 'draft'].includes(p.status))
    }

    let globalIndex = 0
    const addGroup = (title, groupProjects) => {
      if (groupProjects.length === 0) return

      lines.push(`{bold}{white-fg}${title}{/} (${groupProjects.length})`)
      lines.push('')

      for (const project of groupProjects) {
        const isSelected = globalIndex === ecosystemSelectedIndex
        const prefix = isSelected ? '{inverse} ► {/}' : '   '
        const statusIcon = STATUS_ICONS[project.status] || STATUS_ICONS.unknown
        const priorityColor = PRIORITY_COLORS[project.priority] || 'white'

        // Progress bar
        const barWidth = 12
        const filled = Math.round((project.progress / 100) * barWidth)
        const empty = barWidth - filled
        const color = project.progress >= 75 ? 'green' : project.progress >= 50 ? 'yellow' : 'cyan'
        const progressBar = `{${color}-fg}${'█'.repeat(filled)}{/}{gray-fg}${'░'.repeat(empty)}{/}`

        const name = project.name.padEnd(20).slice(0, 20)
        const typeStr = (project.type || '').slice(0, 12).padEnd(12)

        lines.push(
          `${prefix}${statusIcon} {bold}${name}{/} ${progressBar} ` +
          `{${priorityColor}-fg}P${project.priority}{/} ` +
          `{gray-fg}${typeStr}{/}`
        )

        // Show focus/next for selected project
        if (isSelected && (project.focus || project.next)) {
          const detail = project.focus || project.next
          const truncated = detail.length > 50 ? detail.slice(0, 47) + '...' : detail
          lines.push(`     {cyan-fg}→ ${truncated}{/}`)
        }

        globalIndex++
      }
      lines.push('')
    }

    addGroup('🔥 Active Projects', grouped.active)
    addGroup('✅ Stable/Released', grouped.stable)
    addGroup('⏸️  Paused', grouped.paused)
    addGroup('📝 Draft', grouped.draft)
    addGroup('📦 Other', grouped.other)

    ecosystemList.setContent(lines.join('\n'))
    screen.render()
  }

  // ============================================================================
  // PLAN VIEW (Morning Ritual)
  // ============================================================================

  async function showPlanView() {
    stateMachine.transition(STATES.PLAN)
    mainView.hide()
    detailView.hide()
    focusView.hide()
    zenView.hide()
    timelineView.hide()
    ecosystemView.hide()
    planView.show()

    await updatePlanDisplay()
    screen.render()
  }

  function exitPlanView() {
    stateMachine.transition(STATES.BROWSE)
    planView.hide()
    mainView.show()
    projectsTable.focus()
    screen.render()
  }

  async function updatePlanDisplay() {
    // Get plan data using PlanDayUseCase
    const planUseCase = atlas.container.resolve('PlanDayUseCase')
    const { homedir } = await import('node:os')
    const { join } = await import('node:path')

    try {
      planData = await planUseCase.execute({
        ecosystemPath: join(homedir(), 'projects', 'dev-tools')
      })
    } catch (error) {
      planData = { greeting: 'Hello!', suggestions: [], inbox: [], parkedContexts: [], activeProjects: [] }
    }

    planSelectedIndex = Math.min(planSelectedIndex, Math.max(0, (planData.suggestions?.length || 1) - 1))

    // Title with greeting
    const greeting = planData.greeting || 'Hello!'
    const energyStr = planEnergyLevel ? `{cyan-fg}Energy: ${planEnergyLevel}{/}` : '{gray-fg}Energy: not set{/}'
    planTitle.setContent(` {bold}${greeting}{/}  ─────────────────────────  ${energyStr}`)

    // Yesterday summary
    const yesterday = planData.yesterday || {}
    if (yesterday.hasSessions) {
      planYesterday.setContent(
        ` {white-fg}${yesterday.sessionCount} sessions{/}\n` +
        ` {cyan-fg}${yesterday.hours}h ${yesterday.minutes}m{/} total\n` +
        ` {green-fg}${yesterday.completionRate}%{/} completed\n` +
        ` Last: {yellow-fg}${yesterday.lastProject || 'unknown'}{/}`
      )
    } else {
      planYesterday.setContent(
        ` {gray-fg}No sessions yesterday{/}\n\n` +
        ` {yellow-fg}Fresh start today!{/}`
      )
    }

    // Streak display
    const streak = planData.streak || {}
    const streakDisplay = streak.display || '🔥'
    planStreak.setContent(
      ` Current: {bold}{green-fg}${streak.current || 0} days{/}\n` +
      ` Longest: {cyan-fg}${streak.longest || 0} days{/}\n` +
      ` ${streakDisplay}\n` +
      ` {gray-fg}${streak.message || ''}{/}`
    )

    // Suggestions
    const suggestions = planData.suggestions || []
    const lines = []
    const SUGGESTION_ICONS = {
      unpark: '⏸️',
      triage: '📥',
      focus: '🎯',
      continue: '▶️',
      streak: '🔥'
    }

    if (suggestions.length === 0) {
      lines.push(' {gray-fg}No suggestions - start fresh!{/}')
    } else {
      suggestions.forEach((s, i) => {
        const isSelected = i === planSelectedIndex
        const prefix = isSelected ? '{inverse} ► {/}' : '   '
        const icon = SUGGESTION_ICONS[s.type] || '💡'

        lines.push(`${prefix}${icon} {white-fg}${s.message}{/}`)
        if (s.action && isSelected) {
          lines.push(`     {cyan-fg}→ ${s.action}{/}`)
        }
        lines.push('')
      })
    }

    planSuggestions.setContent(lines.join('\n'))

    // Stats footer
    const inboxCount = planData.inbox?.length || 0
    const parkedCount = planData.parkedContexts?.length || 0
    const activeCount = planData.activeProjects?.length || 0

    planStats.setContent(
      ` {cyan-fg}📥 ${inboxCount} inbox{/}  │  ` +
      `{yellow-fg}⏸️ ${parkedCount} parked{/}  │  ` +
      `{green-fg}🟢 ${activeCount} active{/}`
    )

    screen.render()
  }

  function cyclePlanEnergyLevel() {
    const levels = [null, 'high', 'medium', 'low']
    const currentIndex = levels.indexOf(planEnergyLevel)
    planEnergyLevel = levels[(currentIndex + 1) % levels.length]
    updatePlanDisplay()
    return planEnergyLevel
  }

  // ============================================================================
  // DECISION HELPER
  // ============================================================================

  async function showDecisionHelper() {
    // Analyze projects and suggest what to work on
    const suggestions = []

    // Time-of-day awareness
    const hour = new Date().getHours()
    let timeContext = ''
    let taskPriority = 'any' // 'heavy', 'medium', 'light'

    if (hour >= MORNING_START && hour < MORNING_END) {
      timeContext = '🌅 Morning - peak focus time'
      taskPriority = 'heavy'
    } else if (hour >= MORNING_END && hour < AFTERNOON_END) {
      timeContext = '☀️ Afternoon - steady work'
      taskPriority = 'medium'
    } else if (hour >= AFTERNOON_END && hour < EVENING_END) {
      timeContext = '🌆 Evening - lighter tasks'
      taskPriority = 'light'
    } else {
      timeContext = '🌙 Late - consider resting'
      taskPriority = 'light'
    }

    try {
      // Get all projects
      const projects = await atlas.projects.list()

      // Sort by various criteria
      const active = projects.filter(p => getStatusCategory(p.status) === 'a')
      const paused = projects.filter(p => getStatusCategory(p.status) === 'p')
      const blocked = projects.filter(p => p.status === 'blocked')
      const stable = projects.filter(p => getStatusCategory(p.status) === 's')

      // Late night: suggest rest or very light tasks only
      if (hour >= EVENING_END || hour < MORNING_START) {
        if (stable.length > 0) {
          suggestions.push({
            project: stable[0],
            reason: '💤 Light review only - rest soon!',
            priority: 0
          })
        }
      } else {
        // Suggest unblocking blocked items first (always high priority)
        if (blocked.length > 0) {
          suggestions.push({
            project: blocked[0],
            reason: '🚫 Unblock this first',
            priority: 1
          })
        }

        // Time-aware project suggestions
        if (taskPriority === 'heavy' && active.length > 0) {
          // Morning: prioritize complex/active work
          const complex = active.filter(p => p.progress < 50)
          if (complex.length > 0) {
            suggestions.push({
              project: complex[0],
              reason: '🧠 Deep work - use peak focus',
              priority: 2
            })
          }
        }

        // Add active projects
        for (const p of active.slice(0, 2)) {
          if (!suggestions.find(s => s.project.name === p.name)) {
            suggestions.push({
              project: p,
              reason: p.next || 'Continue work',
              priority: 3
            })
          }
        }

        // Evening: suggest lighter tasks
        if (taskPriority === 'light' && stable.length > 0) {
          suggestions.push({
            project: stable[0],
            reason: '📝 Light task - review or docs',
            priority: 4
          })
        }
      }

      // Show decision dialog
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
        projectsTable.focus()
        screen.render()
      })
    } catch (e) {
      statusBar.setContent(` {red-fg}Error: ${e.message}{/}`)
      screen.render()
    }
  }

  // ============================================================================
  // KEYBOARD HANDLERS
  // ============================================================================

  // Quit
  screen.key(['q', 'C-c'], () => {
    if (stateMachine.is(STATES.DETAIL)) {
      showMainView()
    } else if (stateMachine.is(STATES.FOCUS) || stateMachine.is(STATES.ZEN)) {
      // Confirm quit if timer is running
      if (pomodoroActive) {
        exitFocusMode()
      } else {
        cleanup()
        process.exit(0)
      }
    } else {
      cleanup()
      process.exit(0)
    }
  })

  // Cleanup function
  function cleanup() {
    if (timerInterval) clearInterval(timerInterval)
    timer.destroy()
    stateMachine.destroy()
  }

  // Escape - back to main (or exit focus/zen/timeline mode)
  screen.key(['escape'], () => {
    if (stateMachine.is(STATES.ZEN)) {
      exitZenMode()
    } else if (stateMachine.is(STATES.FOCUS)) {
      exitFocusMode()
    } else if (stateMachine.is(STATES.TIMELINE)) {
      exitTimelineView()
    } else if (stateMachine.is(STATES.ECOSYSTEM)) {
      exitEcosystemView()
    } else if (stateMachine.is(STATES.PLAN)) {
      exitPlanView()
    } else if (stateMachine.is(STATES.DETAIL)) {
      showMainView()
    }
  })

  // Arrow keys - navigate cards
  screen.key(['up', 'k'], () => {
    if (stateMachine.is(STATES.BROWSE) && filteredList.length > 0) {
      selectCard(selectedCardIndex - 1)
    }
  })

  screen.key(['down', 'j'], () => {
    if (stateMachine.is(STATES.BROWSE) && filteredList.length > 0) {
      selectCard(selectedCardIndex + 1)
    }
  })

  // Enter - show detail for selected card
  screen.key(['enter'], () => {
    if (stateMachine.is(STATES.BROWSE) && selectedProject) {
      showDetailView(selectedProject)
    }
  })

  // Filter keys: a = active, p = paused, s = stable, * = all
  screen.key(['a'], () => {
    if (stateMachine.is(STATES.BROWSE)) {
      currentFilter = currentFilter === 'a' ? '*' : 'a'
      loadMainView()
    }
  })

  screen.key(['p'], () => {
    if (stateMachine.is(STATES.BROWSE)) {
      currentFilter = currentFilter === 'p' ? '*' : 'p'
      loadMainView()
    }
  })

  // Note: 's' is also used for session, so only filter when not in detail view
  // Actually, 's' for stable conflicts. Let's use shift+s or just rely on command bar
  // For now, stable filter will only work via the filter bar display

  screen.key(['*', '8'], () => {
    if (stateMachine.is(STATES.BROWSE)) {
      currentFilter = '*'
      searchTerm = ''
      loadMainView()
    }
  })

  // Search: / opens search input
  screen.key(['/'], () => {
    if (stateMachine.is(STATES.BROWSE)) {
      searchInput.show()
      searchInput.focus()
      searchInput.setValue(searchTerm)
      screen.render()
    }
  })

  // Search input handlers
  searchInput.on('submit', (value) => {
    searchTerm = value || ''
    searchInput.hide()
    projectsTable.focus()
    loadMainView()
  })

  searchInput.on('cancel', () => {
    searchInput.hide()
    projectsTable.focus()
    screen.render()
  })

  searchInput.key(['escape'], () => {
    searchInput.hide()
    projectsTable.focus()
    screen.render()
  })

  // Refresh (or reset timer in focus mode)
  screen.key(['r'], async () => {
    if (stateMachine.is(STATES.FOCUS)) {
      resetPomodoro()
      return
    }
    if (stateMachine.is(STATES.TIMELINE)) {
      await updateTimelineDisplay()
      return
    }
    statusBar.setContent(' {yellow-fg}Refreshing...{/}')
    screen.render()
    if (stateMachine.is(STATES.BROWSE)) {
      await loadMainView()
    } else if (selectedProject) {
      await loadDetailView(selectedProject)
    }
  })

  // Help
  screen.key(['?', 'h'], () => showHelp())

  // Start session
  screen.key(['s'], () => {
    if (stateMachine.is(STATES.DETAIL) && selectedProject) {
      startSessionFor(selectedProject.name)
    } else {
      showSessionPrompt()
    }
  })

  // End session with celebration
  screen.key(['e'], async () => {
    try {
      // Get session info before ending for celebration
      let celebrationMsg = ''
      try {
        const status = await atlas.context.getStatus()
        const activeSession = status?.activeSession
        const streakData = status?.streak || { current: 0 }

        if (activeSession) {
          const duration = activeSession.duration || 0
          const celebration = CelebrationHelper.getCelebration({
            duration,
            outcome: 'completed',
            streak: streakData.current
          })
          celebrationMsg = ` ${celebration.emoji} ${celebration.message}`
        }
      } catch (e) { /* ignore celebration errors */ }

      await atlas.sessions.end('Ended from dashboard')
      statusBar.setContent(` {green-fg}✓ Session ended!{/}${celebrationMsg}`)

      if (stateMachine.is(STATES.BROWSE)) {
        await loadMainView()
      } else {
        await loadDetailView(selectedProject)
      }
    } catch (e) {
      statusBar.setContent(` {red-fg}${e.message}{/}`)
      screen.render()
    }
  })

  // Capture
  screen.key(['c'], () => showCapturePrompt())

  // Open folder (detail view)
  screen.key(['o'], () => {
    if (stateMachine.is(STATES.DETAIL) && selectedProject?.path) {
      // Use execFile instead of exec for safer command execution (no shell injection)
      require('child_process').execFile('open', [selectedProject.path], (err) => {
        if (err) {
          statusBar.setContent(` {red-fg}Failed to open: ${err.message}{/}`)
        }
        screen.render()
      })
      statusBar.setContent(` {green-fg}Opened: ${selectedProject.path}{/}`)
      screen.render()
    }
  })

  // Tab to switch focus
  screen.key(['tab'], () => {
    if (projectsTable.focused) {
      capturesBox.focus()
    } else {
      projectsTable.focus()
    }
    screen.render()
  })

  // Focus mode: f key (from main, detail, or timeline view)
  screen.key(['f'], () => {
    if (stateMachine.is(STATES.BROWSE) || stateMachine.is(STATES.DETAIL)) {
      showFocusMode()
    } else if (stateMachine.is(STATES.TIMELINE)) {
      timelineView.hide()
      showFocusMode()
    }
  })

  // Decision helper: d key
  screen.key(['d'], () => {
    if (stateMachine.is(STATES.BROWSE)) {
      showDecisionHelper()
    }
  })

  // Theme cycling: t key
  screen.key(['t'], () => {
    if (stateMachine.is(STATES.BROWSE) || stateMachine.is(STATES.DETAIL)) {
      cycleTheme()
    }
  })

  // Zen mode: z key
  screen.key(['z'], () => {
    if (stateMachine.is(STATES.BROWSE) || stateMachine.is(STATES.DETAIL)) {
      showZenMode()
    } else if (stateMachine.is(STATES.FOCUS)) {
      // Switch from focus to zen
      focusView.hide()
      showZenMode()
    }
  })

  // Timeline view: T key (shift+t)
  screen.key(['S-t'], () => {
    if (stateMachine.is(STATES.BROWSE) || stateMachine.is(STATES.DETAIL)) {
      showTimelineView()
    } else if (stateMachine.is(STATES.TIMELINE)) {
      exitTimelineView()
    }
  })

  // Ecosystem view: e key
  screen.key(['e'], () => {
    if (stateMachine.is(STATES.BROWSE) || stateMachine.is(STATES.DETAIL)) {
      showEcosystemView()
    } else if (stateMachine.is(STATES.ECOSYSTEM)) {
      exitEcosystemView()
    }
  })

  // Plan view (morning ritual): p key
  screen.key(['p'], () => {
    if (stateMachine.is(STATES.BROWSE) || stateMachine.is(STATES.DETAIL)) {
      showPlanView()
    } else if (stateMachine.is(STATES.PLAN)) {
      exitPlanView()
    }
  })

  // Focus/Zen mode: space for pause/resume
  screen.key(['space'], () => {
    if (stateMachine.is(STATES.FOCUS) || stateMachine.is(STATES.ZEN)) {
      if (pomodoroActive) {
        pausePomodoro()
      } else {
        resumePomodoro()
      }
      if (stateMachine.is(STATES.ZEN)) {
        updateZenDisplay()
      }
    }
  })

  // Focus mode: +/- for time adjustment (only when paused)
  screen.key(['+', '='], () => {
    if (stateMachine.is(STATES.FOCUS) && !pomodoroActive) {
      adjustPomodoroTime(POMODORO_ADJUST_STEP)
    }
  })

  screen.key(['-', '_'], () => {
    if (stateMachine.is(STATES.FOCUS) && !pomodoroActive) {
      adjustPomodoroTime(-POMODORO_ADJUST_STEP)
    }
  })

  // ============================================================================
  // DIALOGS
  // ============================================================================

  function showHelp() {
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
  {yellow-fg}T{/}          Timeline view

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
      if (stateMachine.is(STATES.BROWSE)) {
        projectsTable.focus()
      }
      screen.render()
    })
  }

  function showSessionPrompt() {
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

    input.on('submit', async (value) => {
      screen.remove(input)
      if (value?.trim()) {
        await startSessionFor(value.trim())
      }
      projectsTable.focus()
      screen.render()
    })

    input.on('cancel', () => {
      screen.remove(input)
      projectsTable.focus()
      screen.render()
    })
  }

  async function startSessionFor(projectName) {
    try {
      // Get context restoration info before starting
      let contextMsg = ''
      try {
        const status = await atlas.context.getStatus()
        const recentSessions = status?.recent?.recentSessions || []
        const lastSession = recentSessions.find(s => s.project === projectName)
        const streakData = status?.streak || { current: 0 }

        if (lastSession || streakData.current > 0) {
          const welcome = ContextRestorationHelper.getWelcomeBack(lastSession, streakData.current)
          contextMsg = ` {cyan-fg}${welcome}{/}`
        }
      } catch (e) { /* ignore context errors */ }

      await atlas.sessions.start(projectName)
      statusBar.setContent(` {green-fg}✓ Session started: ${projectName}{/}${contextMsg}`)
      if (stateMachine.is(STATES.BROWSE)) {
        await loadMainView()
      } else {
        await loadDetailView(selectedProject)
      }
    } catch (e) {
      statusBar.setContent(` {red-fg}${e.message}{/}`)
      screen.render()
    }
  }

  function showCapturePrompt() {
    // Inline capture at bottom of screen (ADHD-friendly - stays in context)
    const captureInput = blessed.textbox({
      bottom: 3,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        fg: 'white',
        bg: 'yellow'
      },
      inputOnFocus: true
    })

    // Show prompt prefix
    const captureLabel = blessed.box({
      bottom: 3,
      left: 0,
      width: 12,
      height: 1,
      tags: true,
      style: { fg: 'black', bg: 'yellow' },
      content: ' 💡 Capture:'
    })

    screen.append(captureLabel)
    screen.append(captureInput)
    captureInput.focus()
    screen.render()

    const cleanup = () => {
      screen.remove(captureInput)
      screen.remove(captureLabel)
      projectsTable.focus()
      screen.render()
    }

    captureInput.on('submit', async (value) => {
      cleanup()
      if (value?.trim()) {
        try {
          await atlas.capture.add(value.trim())
          statusBar.setContent(` {green-fg}✓ Captured: "${value.trim().substring(0, 30)}..."{/}`)
          screen.render()
          setTimeout(() => {
            if (stateMachine.is(STATES.BROWSE)) loadMainView()
            else if (selectedProject) loadDetailView(selectedProject)
          }, 1500)
        } catch (e) {
          statusBar.setContent(` {red-fg}${e.message}{/}`)
          screen.render()
        }
      }
    })

    captureInput.on('cancel', cleanup)
    captureInput.key(['escape'], cleanup)
  }

  // ============================================================================
  // TERMINAL-ADAPTIVE LAYOUT
  // ============================================================================

  // Handle terminal resize
  screen.on('resize', () => {
    const mode = getLayoutMode()
    if (mode === 'compact') {
      // Show compact mode warning
      statusBar.setContent(' {yellow-fg}⚠ Terminal too narrow - expand for best view{/}')
    }
    // Refresh current view
    if (stateMachine.is(STATES.BROWSE)) {
      loadMainView()
    } else if (stateMachine.is(STATES.DETAIL) && selectedProject) {
      loadDetailView(selectedProject)
    }
    screen.render()
  })

  // ============================================================================
  // INITIALIZE
  // ============================================================================

  // Auto-refresh interval for main view
  let refreshInterval = null

  function startRefreshInterval() {
    if (refreshInterval) clearInterval(refreshInterval)
    refreshInterval = setInterval(() => {
      if (stateMachine.is(STATES.BROWSE)) loadMainView()
    }, REFRESH_INTERVAL)
  }

  function stopRefreshInterval() {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  // Enhanced cleanup that clears ALL intervals
  const originalCleanup = cleanup
  cleanup = function() {
    originalCleanup()
    stopRefreshInterval()
  }

  projectsTable.focus()
  await loadMainView()
  startRefreshInterval()

  process.on('exit', stopRefreshInterval)
  screen.render()
}

export default runDashboard
