/**
 * Atlas Dashboard TUI
 *
 * ADHD-friendly terminal dashboard with:
 * - Clear visual hierarchy
 * - Always-visible keyboard shortcuts
 * - Color-coded status indicators
 * - Simple navigation
 */

import blessed from 'blessed'
import contrib from 'blessed-contrib'

/**
 * Create and run the dashboard
 */
export async function runDashboard(atlas, options = {}) {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Atlas Dashboard',
    fullUnicode: true
  })

  // Color scheme
  const colors = {
    active: 'green',
    paused: 'yellow',
    stable: 'cyan',
    border: 'blue',
    highlight: 'white',
    muted: 'gray'
  }

  // ============================================================================
  // LAYOUT: Simple 3-row design
  // ============================================================================

  // Row 1: Status bar (current session + quick stats)
  const statusBar = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue'
    }
  })

  // Row 2: Main content (projects table)
  const projectsTable = contrib.table({
    top: 3,
    left: 0,
    width: '70%',
    height: '100%-6',
    keys: true,
    vi: true,
    mouse: true,
    fg: 'white',
    selectedFg: 'black',
    selectedBg: 'cyan',
    interactive: true,
    label: ' {bold}Projects{/bold} (↑↓ navigate, Enter select) ',
    tags: true,
    border: { type: 'line', fg: colors.border },
    columnSpacing: 2,
    columnWidth: [22, 10, 10, 25]
  })

  // Sidebar: Quick stats + captures
  const sidebar = blessed.box({
    top: 3,
    right: 0,
    width: '30%',
    height: '100%-6',
    border: { type: 'line', fg: colors.border },
    label: ' {bold}Quick View{/bold} ',
    tags: true,
    style: { border: { fg: colors.border } }
  })

  // Stats section in sidebar
  const statsContent = blessed.box({
    parent: sidebar,
    top: 0,
    left: 1,
    right: 1,
    height: 8,
    tags: true,
    content: '{gray-fg}Loading...{/}'
  })

  // Captures section in sidebar
  const capturesBox = blessed.box({
    parent: sidebar,
    top: 9,
    left: 1,
    right: 1,
    bottom: 1,
    tags: true,
    label: ' Recent Captures ',
    border: { type: 'line', fg: 'gray' },
    scrollable: true
  })

  // Row 3: Command bar (always visible!)
  const commandBar = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: {
      fg: 'white',
      bg: 'black'
    },
    content: getCommandBarContent()
  })

  // Add widgets to screen
  screen.append(statusBar)
  screen.append(projectsTable)
  screen.append(sidebar)
  screen.append(commandBar)

  // Focus on projects table
  projectsTable.focus()

  // ============================================================================
  // COMMAND BAR CONTENT
  // ============================================================================

  function getCommandBarContent() {
    return ' {bold}{cyan-fg}q{/} Quit  ' +
           '{bold}{cyan-fg}r{/} Refresh  ' +
           '{bold}{cyan-fg}s{/} Start Session  ' +
           '{bold}{cyan-fg}e{/} End Session  ' +
           '{bold}{cyan-fg}c{/} Capture  ' +
           '{bold}{cyan-fg}?{/} Help  ' +
           '{gray-fg}│{/} {bold}{yellow-fg}↑↓{/} Navigate  ' +
           '{bold}{yellow-fg}Tab{/} Switch Panel'
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  async function loadData() {
    try {
      // Get projects
      const projects = await atlas.projects.list()

      // Status counts
      const counts = { active: 0, paused: 0, stable: 0, other: 0 }
      const projectRows = []

      for (const p of projects) {
        const rawStatus = p.status || 'unknown'

        // Categorize
        if (['active', 'working', 'in-progress', 'testing'].includes(rawStatus)) {
          counts.active++
        } else if (['paused', 'blocked', 'waiting'].includes(rawStatus)) {
          counts.paused++
        } else if (['stable', 'complete', 'released', 'ready'].includes(rawStatus)) {
          counts.stable++
        } else {
          counts.other++
        }

        // Get type string safely
        const typeStr = typeof p.type === 'object'
          ? (p.type?.value || p.type?._value || 'general')
          : (p.type || 'general')

        // Status emoji
        const statusIcon = getStatusIcon(rawStatus)

        projectRows.push([
          String(p.name || '').substring(0, 20),
          String(typeStr).substring(0, 8),
          statusIcon + ' ' + String(rawStatus).substring(0, 7),
          String(p.path || '').split('/').slice(-2).join('/')
        ])
      }

      // Update projects table
      projectsTable.setData({
        headers: ['Project', 'Type', 'Status', 'Location'],
        data: projectRows.slice(0, 20)
      })

      // Get session info
      let sessionInfo = '{yellow-fg}No active session{/}'
      try {
        const session = await atlas.sessions.current()
        if (session) {
          const duration = session.getDuration ? session.getDuration() : 0
          sessionInfo = `{green-fg}●{/} {bold}${session.project}{/} ({white-fg}${duration}m{/})`
        }
      } catch (e) { /* ignore */ }

      // Update status bar
      statusBar.setContent(
        ` ${sessionInfo}` +
        `  {gray-fg}│{/}  ` +
        `{green-fg}●{/} Active: {bold}${counts.active}{/}  ` +
        `{yellow-fg}●{/} Paused: {bold}${counts.paused}{/}  ` +
        `{cyan-fg}●{/} Stable: {bold}${counts.stable}{/}  ` +
        `{gray-fg}●{/} Other: ${counts.other}  ` +
        `{gray-fg}│{/}  ` +
        `{white-fg}${projects.length} projects{/}`
      )

      // Get today's stats
      let statsText = ''
      try {
        const status = await atlas.context.getStatus()
        if (status?.today) {
          statsText =
            `{bold}Today{/}\n` +
            `─────────────────\n` +
            `{cyan-fg}Sessions:{/}  ${status.today.sessions || 0}\n` +
            `{cyan-fg}Duration:{/}  ${status.today.totalDuration || 0}m\n` +
            `{cyan-fg}Flow:{/}      ${status.today.flowSessions || 0}\n\n` +
            `{bold}Inbox{/}\n` +
            `─────────────────\n`
        }
      } catch (e) { /* ignore */ }

      // Get inbox count
      try {
        const triageUseCase = atlas.container.resolve('TriageInboxUseCase')
        const inboxStats = await triageUseCase.getStats()
        statsText += `{yellow-fg}Items:{/}     ${inboxStats.inbox || 0}\n`
      } catch (e) {
        statsText += `{gray-fg}Items:{/}     -\n`
      }

      statsContent.setContent(statsText)

      // Get recent captures
      try {
        const captures = await atlas.capture.inbox({ limit: 5 })
        let captureText = ''
        if (captures && captures.length > 0) {
          captures.forEach((c, i) => {
            const icon = c.type === 'task' ? '☐' : '💡'
            const text = (c.text || c.content || '').substring(0, 25)
            captureText += ` ${icon} ${text}\n`
          })
        } else {
          captureText = ' {gray-fg}No recent captures{/}'
        }
        capturesBox.setContent(captureText)
      } catch (e) {
        capturesBox.setContent(' {gray-fg}Error loading{/}')
      }

    } catch (err) {
      statusBar.setContent(` {red-fg}Error: ${err.message}{/}`)
    }

    screen.render()
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

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================

  // Quit
  screen.key(['q', 'C-c'], () => process.exit(0))

  // Refresh
  screen.key(['r'], async () => {
    statusBar.setContent(' {yellow-fg}Refreshing...{/}')
    screen.render()
    await loadData()
  })

  // Help
  screen.key(['?', 'h'], () => showHelp())

  // Start session
  screen.key(['s'], () => showSessionPrompt())

  // End session
  screen.key(['e'], async () => {
    try {
      await atlas.sessions.end('Ended from dashboard')
      await loadData()
    } catch (e) {
      statusBar.setContent(` {red-fg}${e.message}{/}`)
      screen.render()
    }
  })

  // Capture
  screen.key(['c'], () => showCapturePrompt())

  // Tab to switch focus
  screen.key(['tab'], () => {
    if (projectsTable.focused) {
      capturesBox.focus()
    } else {
      projectsTable.focus()
    }
    screen.render()
  })

  // ============================================================================
  // DIALOGS
  // ============================================================================

  function showHelp() {
    const help = blessed.box({
      top: 'center',
      left: 'center',
      width: 50,
      height: 18,
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      style: { bg: 'black' },
      label: ' {bold}Keyboard Shortcuts{/} ',
      content: `
  {bold}{cyan-fg}Navigation{/}
  ─────────────────────────────
  {yellow-fg}↑/↓{/}        Move through projects
  {yellow-fg}Tab{/}        Switch between panels
  {yellow-fg}Enter{/}      Select project

  {bold}{cyan-fg}Actions{/}
  ─────────────────────────────
  {yellow-fg}s{/}          Start session
  {yellow-fg}e{/}          End current session
  {yellow-fg}c{/}          Quick capture
  {yellow-fg}r{/}          Refresh data

  {bold}{cyan-fg}General{/}
  ─────────────────────────────
  {yellow-fg}q{/}          Quit dashboard
  {yellow-fg}?{/}          Show this help

  {gray-fg}Press any key to close{/}
      `
    })

    screen.append(help)
    help.focus()
    screen.render()

    help.onceKey(['escape', 'q', 'enter', 'space'], () => {
      screen.remove(help)
      projectsTable.focus()
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
      label: ' Start Session - Enter project name: ',
      style: { bg: 'black', focus: { border: { fg: 'cyan' } } },
      inputOnFocus: true
    })

    screen.append(input)
    input.focus()
    screen.render()

    input.on('submit', async (value) => {
      screen.remove(input)
      if (value && value.trim()) {
        try {
          await atlas.sessions.start(value.trim())
          await loadData()
        } catch (e) {
          statusBar.setContent(` {red-fg}${e.message}{/}`)
        }
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

  function showCapturePrompt() {
    const input = blessed.textbox({
      top: 'center',
      left: 'center',
      width: 60,
      height: 3,
      border: { type: 'line', fg: 'yellow' },
      label: ' Quick Capture - Enter idea/task: ',
      style: { bg: 'black', focus: { border: { fg: 'cyan' } } },
      inputOnFocus: true
    })

    screen.append(input)
    input.focus()
    screen.render()

    input.on('submit', async (value) => {
      screen.remove(input)
      if (value && value.trim()) {
        try {
          await atlas.capture.add(value.trim())
          statusBar.setContent(` {green-fg}✓ Captured: "${value.substring(0, 30)}..."{/}`)
          setTimeout(() => loadData(), 1500)
        } catch (e) {
          statusBar.setContent(` {red-fg}${e.message}{/}`)
        }
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

  // ============================================================================
  // INITIALIZE
  // ============================================================================

  await loadData()

  // Auto-refresh every 30 seconds
  const refreshInterval = setInterval(loadData, 30000)
  process.on('exit', () => clearInterval(refreshInterval))

  screen.render()
}

export default runDashboard
