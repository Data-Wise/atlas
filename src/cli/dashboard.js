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
  if (cols < 60 || rows < 15) {
    console.error(`Error: Terminal too small (${cols}x${rows})`)
    console.error('Dashboard requires at least 60x15. Please resize your terminal.')
    process.exit(1)
  }

  // Detect if canvas-based widgets will work
  // Canvas fails in pseudo-TTYs (from script command), XPC service contexts, etc.
  const canvasSupported = !(
    process.env.XPC_SERVICE_NAME === '0' ||  // Running in XPC service context
    !process.stdout.getWindowSize ||          // No window size function
    cols <= 0 || rows <= 0                     // Invalid dimensions
  )

  // Detect problematic terminals and use safe fallback
  const problemTerminals = ['xterm-ghostty', 'ghostty']
  const currentTerm = process.env.TERM || ''
  const safeTerminal = problemTerminals.some(t => currentTerm.includes(t))
    ? 'xterm-256color'
    : currentTerm || 'xterm-256color'

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
  const timer = createTimerManager({ defaultMinutes: 25 })

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
  let pomodoroMinutes = 25
  let breakReminder = false
  let timerInterval = null

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
    statusBar.style.bg = currentTheme.primary
    filterBar.style.bg = 'black'
    projectsTable.options.border.fg = currentTheme.primary
    sidebar.options.border.fg = currentTheme.primary
    commandBar.style.bg = currentTheme.primary
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
  // MAIN VIEW WIDGETS
  // ============================================================================

  const mainView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  })

  // Status bar
  const statusBar = blessed.box({
    parent: mainView,
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: { fg: 'white', bg: 'blue' }
  })

  // Filter bar
  const filterBar = blessed.box({
    parent: mainView,
    top: 3,
    left: 0,
    width: '65%',
    height: 1,
    tags: true,
    style: { fg: 'white', bg: 'black' }
  })

  // Search input (hidden by default)
  const searchInput = blessed.textbox({
    parent: mainView,
    top: 3,
    left: 0,
    width: '40%',
    height: 1,
    tags: true,
    hidden: true,
    style: {
      fg: 'white',
      bg: 'blue',
      focus: { bg: 'blue' }
    },
    inputOnFocus: true
  })

  // Projects table
  const projectsTable = contrib.table({
    parent: mainView,
    top: 4,
    left: 0,
    width: '65%',
    height: '100%-7',
    keys: true,
    vi: true,
    mouse: true,
    fg: 'white',
    selectedFg: 'black',
    selectedBg: 'cyan',
    interactive: true,
    label: ' {bold}Projects{/bold} ',
    tags: true,
    border: { type: 'line', fg: 'blue' },
    columnSpacing: 1,
    columnWidth: [2, 16, 6, 10, 8]  // Focus, Name, Type, Status, Last
  })

  // Sidebar
  const sidebar = blessed.box({
    parent: mainView,
    top: 4,
    right: 0,
    width: '35%',
    height: '100%-7',
    border: { type: 'line', fg: 'blue' },
    label: ' {bold}Overview{/bold} ',
    tags: true
  })

  // Activity sparkline in sidebar
  const activityLabel = blessed.box({
    parent: sidebar,
    top: 0,
    left: 1,
    width: '100%-4',
    height: 1,
    tags: true,
    content: '{bold}This Week{/bold}'
  })

  // Sparkline with fallback for terminal compatibility issues
  let activitySpark = null
  if (canvasSupported) {
    activitySpark = contrib.sparkline({
      parent: sidebar,
      top: 1,
      left: 1,
      width: '100%-4',
      height: 4,
      tags: true,
      style: { fg: 'cyan' }
    })
  } else {
    // Text-based fallback when canvas widgets won't work
    activitySpark = blessed.box({
      parent: sidebar,
      top: 1,
      left: 1,
      width: '100%-4',
      height: 4,
      tags: true,
      content: '{gray-fg}(Activity graph unavailable){/}'
    })
  }

  // Stats in sidebar
  const statsBox = blessed.box({
    parent: sidebar,
    top: 6,
    left: 1,
    right: 1,
    height: 8,
    tags: true
  })

  // Recent captures
  const capturesBox = blessed.box({
    parent: sidebar,
    top: 15,
    left: 1,
    right: 1,
    bottom: 1,
    tags: true,
    label: ' 💡 Inbox ',
    border: { type: 'line', fg: 'gray' }
  })

  // Command bar
  const commandBar = blessed.box({
    parent: mainView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: { fg: 'white', bg: 'black' },
    content: ' {cyan-fg}q{/}Quit {cyan-fg}/{/}Search {cyan-fg}a{/}{cyan-fg}p{/}{cyan-fg}s{/}{cyan-fg}*{/}Filter {cyan-fg}Enter{/}Details {cyan-fg}s{/}Session {cyan-fg}c{/}Capture {cyan-fg}r{/}Refresh {yellow-fg}↑↓{/}Nav'
  })

  screen.append(mainView)

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
      try {
        const session = await atlas.sessions.current()
        activeSessionProject = session?.project || null
      } catch (e) {
        activeSessionProject = null
      }

      // Status counts (for all projects, regardless of filter)
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

      // Build table rows
      const projectRows = []

      for (const p of filteredList) {
        const rawStatus = p.status || 'unknown'
        const typeStr = getTypeStr(p.type)
        const statusIcon = getStatusIcon(rawStatus)

        // Focus indicator: ► for active session's project
        const focusIndicator = (p.name === activeSessionProject) ? '{green-fg}►{/}' : ' '

        // Time since last session (mock for now - would need session history)
        const lastActive = p.lastSession ? timeAgo(p.lastSession) : '-'

        projectRows.push([
          focusIndicator,
          String(p.name || '').substring(0, 14),
          String(typeStr).substring(0, 5),
          statusIcon + ' ' + String(rawStatus).substring(0, 6),
          lastActive
        ])
      }

      // Update filter bar
      updateFilterBar()

      // Update table
      projectsTable.setData({
        headers: ['', 'Project', 'Type', 'Status', 'Last'],
        data: projectRows.slice(0, 25)
      })

      // Session info for status bar
      let sessionInfo = '{yellow-fg}No session{/}'
      let sessionDuration = 0
      try {
        const session = await atlas.sessions.current()
        if (session) {
          sessionDuration = session.getDuration ? session.getDuration() : 0
          sessionInfo = `{green-fg}●{/} {bold}${session.project}{/} (${sessionDuration}m)`
        }
      } catch (e) { /* ignore */ }

      // Show filter status and counts
      const filterLabel = currentFilter === '*' ? '' : ` [${currentFilter.toUpperCase()}]`
      statusBar.setContent(
        ` ${sessionInfo}  {gray-fg}│{/}  ` +
        `{green-fg}●{/}${counts.active} ` +
        `{yellow-fg}●{/}${counts.paused} ` +
        `{cyan-fg}●{/}${counts.stable}` +
        `${filterLabel}  ` +
        `{gray-fg}│{/}  ${filteredList.length}/${projects.length}`
      )

      // Activity sparkline - real session data for past 7 days
      try {
        const sessionRepo = atlas.container.resolve('SessionRepository')
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const sessions = await sessionRepo.list({ since: sevenDaysAgo })

        // Count sessions per day (past 7 days)
        const weekData = [0, 0, 0, 0, 0, 0, 0]
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const s of sessions) {
          const sessionDate = new Date(s.startTime)
          sessionDate.setHours(0, 0, 0, 0)
          const daysAgo = Math.floor((today - sessionDate) / (24 * 60 * 60 * 1000))
          if (daysAgo >= 0 && daysAgo < 7) {
            weekData[6 - daysAgo]++ // Most recent day is at index 6
          }
        }

        if (canvasSupported) {
          activitySpark.setData(['Sessions'], [weekData])
        }
      } catch (e) {
        // Fallback to zeros if can't load
        if (canvasSupported) {
          activitySpark.setData(['Sessions'], [[0, 0, 0, 0, 0, 0, 0]])
        }
      }

      // Stats
      try {
        const status = await atlas.context.getStatus()
        const today = status?.today || {}
        const pct = today.sessions ? Math.min(100, Math.round((today.sessions / 5) * 100)) : 0

        statsBox.setContent(
          `{bold}Today{/}\n` +
          `───────────────────\n` +
          `Sessions: ${today.sessions || 0}/5\n` +
          progressBar(pct, 18) + `\n\n` +
          `Duration: {cyan-fg}${today.totalDuration || 0}m{/}\n` +
          `Flow:     {green-fg}${today.flowSessions || 0}{/}`
        )
      } catch (e) {
        statsBox.setContent('{gray-fg}Loading...{/}')
      }

      // Captures
      try {
        const captures = await atlas.capture.inbox({ limit: 4 })
        let text = ''
        if (captures?.length) {
          captures.forEach(c => {
            const icon = c.type === 'task' ? '☐' : '💡'
            text += ` ${icon} ${(c.text || '').substring(0, 22)}\n`
          })
        } else {
          text = ' {gray-fg}Empty inbox!{/}'
        }
        capturesBox.setContent(text)
      } catch (e) {
        capturesBox.setContent(' {gray-fg}-{/}')
      }

    } catch (err) {
      statusBar.setContent(` {red-fg}Error: ${err.message}{/}`)
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
    stateMachine.transition(STATES.FOCUS)
    mainView.hide()
    detailView.hide()
    zenView.hide()
    focusView.show()

    // Start pomodoro if not already running
    if (!pomodoroActive) {
      startPomodoro()
    }

    updateFocusTimer()
    screen.render()
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
      `\n\n` +
      `${sessionInfo}\n\n` +
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
    pomodoroHistory.push({
      completed: new Date().toISOString(),
      duration: pomodoroMinutes,
      project: activeSessionProject || 'unknown'
    })

    // Play terminal bell
    process.stdout.write('\x07')

    // Enable break enforcement
    breakEnforced = true

    // Show break dialog
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

  {cyan-fg}Session #{pomodoroHistory.length}{/} - ${pomodoroMinutes} minutes

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
    pomodoroMinutes = Math.max(5, Math.min(60, pomodoroMinutes + delta))
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
  // DECISION HELPER
  // ============================================================================

  async function showDecisionHelper() {
    // Analyze projects and suggest what to work on
    const suggestions = []

    // Time-of-day awareness
    const hour = new Date().getHours()
    let timeContext = ''
    let taskPriority = 'any' // 'heavy', 'medium', 'light'

    if (hour >= 6 && hour < 12) {
      timeContext = '🌅 Morning - peak focus time'
      taskPriority = 'heavy'
    } else if (hour >= 12 && hour < 17) {
      timeContext = '☀️ Afternoon - steady work'
      taskPriority = 'medium'
    } else if (hour >= 17 && hour < 21) {
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
      if (hour >= 21 || hour < 6) {
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

  // Escape - back to main (or exit focus/zen mode)
  screen.key(['escape'], () => {
    if (stateMachine.is(STATES.ZEN)) {
      exitZenMode()
    } else if (stateMachine.is(STATES.FOCUS)) {
      exitFocusMode()
    } else if (stateMachine.is(STATES.DETAIL)) {
      showMainView()
    }
  })

  // Enter - show detail (using rows.on for blessed-contrib table)
  projectsTable.rows.on('select', (item, index) => {
    if (filteredList[index]) {
      showDetailView(filteredList[index])
    }
  })

  // Update overview when selection changes
  projectsTable.rows.on('select item', (item, index) => {
    if (filteredList[index] && stateMachine.is(STATES.BROWSE)) {
      updateOverviewFor(filteredList[index])
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

  // End session
  screen.key(['e'], async () => {
    try {
      await atlas.sessions.end('Ended from dashboard')
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
      require('child_process').exec(`open "${selectedProject.path}"`)
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

  // Focus mode: f key (only from main or detail view)
  screen.key(['f'], () => {
    if (stateMachine.is(STATES.BROWSE) || stateMachine.is(STATES.DETAIL)) {
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
      adjustPomodoroTime(5) // Add 5 minutes
    }
  })

  screen.key(['-', '_'], () => {
    if (stateMachine.is(STATES.FOCUS) && !pomodoroActive) {
      adjustPomodoroTime(-5) // Remove 5 minutes
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
      await atlas.sessions.start(projectName)
      statusBar.setContent(` {green-fg}✓ Session started: ${projectName}{/}`)
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

  projectsTable.focus()
  await loadMainView()

  const refreshInterval = setInterval(() => {
    if (stateMachine.is(STATES.BROWSE)) loadMainView()
  }, 30000)

  process.on('exit', () => clearInterval(refreshInterval))
  screen.render()
}

export default runDashboard
