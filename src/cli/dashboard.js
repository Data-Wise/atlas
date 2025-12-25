/**
 * Atlas Dashboard TUI
 *
 * ADHD-friendly terminal dashboard with:
 * - Visual graphs (sparklines, progress bars)
 * - Always-visible keyboard shortcuts
 * - Project detail view on Enter
 * - Color-coded status indicators
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

  // Track state
  let projectList = []
  let currentView = 'main' // 'main' or 'detail'
  let selectedProject = null

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

  // Projects table
  const projectsTable = contrib.table({
    parent: mainView,
    top: 3,
    left: 0,
    width: '65%',
    height: '100%-6',
    keys: true,
    vi: true,
    mouse: true,
    fg: 'white',
    selectedFg: 'black',
    selectedBg: 'cyan',
    interactive: true,
    label: ' {bold}Projects{/bold} (↑↓ Enter) ',
    tags: true,
    border: { type: 'line', fg: 'blue' },
    columnSpacing: 2,
    columnWidth: [20, 8, 12, 20]
  })

  // Sidebar
  const sidebar = blessed.box({
    parent: mainView,
    top: 3,
    right: 0,
    width: '35%',
    height: '100%-6',
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

  const activitySpark = contrib.sparkline({
    parent: sidebar,
    top: 1,
    left: 1,
    width: '100%-4',
    height: 4,
    tags: true,
    style: { fg: 'cyan' }
  })

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
    content: ' {cyan-fg}q{/} Quit  {cyan-fg}Enter{/} Details  {cyan-fg}s{/} Session  {cyan-fg}c{/} Capture  {cyan-fg}r{/} Refresh  {cyan-fg}?{/} Help  {gray-fg}│{/} {yellow-fg}↑↓{/} Navigate'
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
  const sessionGauge = contrib.gauge({
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

  // ============================================================================
  // MAIN VIEW DATA
  // ============================================================================

  async function loadMainView() {
    try {
      const projects = await atlas.projects.list()
      projectList = projects

      // Status counts
      const counts = { active: 0, paused: 0, stable: 0, other: 0 }
      const projectRows = []

      for (const p of projects) {
        const rawStatus = p.status || 'unknown'

        if (['active', 'working', 'in-progress', 'testing'].includes(rawStatus)) {
          counts.active++
        } else if (['paused', 'blocked', 'waiting'].includes(rawStatus)) {
          counts.paused++
        } else if (['stable', 'complete', 'released', 'ready'].includes(rawStatus)) {
          counts.stable++
        } else {
          counts.other++
        }

        const typeStr = getTypeStr(p.type)
        const statusIcon = getStatusIcon(rawStatus)

        projectRows.push([
          String(p.name || '').substring(0, 18),
          String(typeStr).substring(0, 6),
          statusIcon + ' ' + String(rawStatus).substring(0, 8),
          String(p.path || '').split('/').slice(-2).join('/')
        ])
      }

      projectsTable.setData({
        headers: ['Project', 'Type', 'Status', 'Location'],
        data: projectRows.slice(0, 25)
      })

      // Session info
      let sessionInfo = '{yellow-fg}No active session{/}'
      try {
        const session = await atlas.sessions.current()
        if (session) {
          const duration = session.getDuration ? session.getDuration() : 0
          sessionInfo = `{green-fg}●{/} {bold}${session.project}{/} (${duration}m)`
        }
      } catch (e) { /* ignore */ }

      statusBar.setContent(
        ` ${sessionInfo}  {gray-fg}│{/}  ` +
        `{green-fg}●{/} ${counts.active}  ` +
        `{yellow-fg}●{/} ${counts.paused}  ` +
        `{cyan-fg}●{/} ${counts.stable}  ` +
        `{gray-fg}●{/} ${counts.other}  ` +
        `{gray-fg}│{/}  ${projects.length} projects`
      )

      // Activity sparkline (mock data for now - sessions per day)
      try {
        const status = await atlas.context.getStatus()
        // Create sparkline data from recent sessions
        const weekData = [2, 4, 3, 5, 4, 6, status?.today?.sessions || 0]
        activitySpark.setData(['Sessions'], [weekData])
      } catch (e) {
        activitySpark.setData(['Sessions'], [[0, 0, 0, 0, 0, 0, 0]])
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

    // Project info box
    const shortPath = (project.path || '').split('/').slice(-3).join('/')
    projectInfoBox.setContent(
      `{bold}Name:{/}   ${name}\n` +
      `{bold}Status:{/} ${getStatusIcon(status)} ${status}\n` +
      `{bold}Type:{/}   ${typeStr}\n` +
      `{bold}Path:{/}   ${shortPath}`
    )

    // Session gauge - today's progress
    let gaugePercent = 0
    let sessionText = '{gray-fg}No active session{/}\nPress {cyan-fg}s{/} to start'

    try {
      const statusData = await atlas.context.getStatus()
      const today = statusData?.today || {}
      gaugePercent = today.sessions ? Math.min(100, Math.round((today.sessions / 5) * 100)) : 0
      sessionGauge.setPercent(gaugePercent)
    } catch (e) {
      sessionGauge.setPercent(0)
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
    currentView = 'main'
    detailView.hide()
    mainView.show()
    projectsTable.focus()
    screen.render()
  }

  function showDetailView(project) {
    currentView = 'detail'
    mainView.hide()
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
  // KEYBOARD HANDLERS
  // ============================================================================

  // Quit
  screen.key(['q', 'C-c'], () => {
    if (currentView === 'detail') {
      showMainView()
    } else {
      process.exit(0)
    }
  })

  // Escape - back to main
  screen.key(['escape'], () => {
    if (currentView === 'detail') {
      showMainView()
    }
  })

  // Enter - show detail (using rows.on for blessed-contrib table)
  projectsTable.rows.on('select', (item, index) => {
    if (projectList[index]) {
      showDetailView(projectList[index])
    }
  })

  // Update overview when selection changes
  projectsTable.rows.on('select item', (item, index) => {
    if (projectList[index] && currentView === 'main') {
      updateOverviewFor(projectList[index])
    }
  })

  // Refresh
  screen.key(['r'], async () => {
    statusBar.setContent(' {yellow-fg}Refreshing...{/}')
    screen.render()
    if (currentView === 'main') {
      await loadMainView()
    } else if (selectedProject) {
      await loadDetailView(selectedProject)
    }
  })

  // Help
  screen.key(['?', 'h'], () => showHelp())

  // Start session
  screen.key(['s'], () => {
    if (currentView === 'detail' && selectedProject) {
      startSessionFor(selectedProject.name)
    } else {
      showSessionPrompt()
    }
  })

  // End session
  screen.key(['e'], async () => {
    try {
      await atlas.sessions.end('Ended from dashboard')
      if (currentView === 'main') {
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
    if (currentView === 'detail' && selectedProject?.path) {
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

  // ============================================================================
  // DIALOGS
  // ============================================================================

  function showHelp() {
    const help = blessed.box({
      top: 'center',
      left: 'center',
      width: 55,
      height: 20,
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      style: { bg: 'black' },
      label: ' {bold}Keyboard Shortcuts{/} ',
      content: `
  {bold}{cyan-fg}Navigation{/}
  ─────────────────────────────────
  {yellow-fg}↑/↓{/}        Navigate projects
  {yellow-fg}Enter{/}      Open project details
  {yellow-fg}Esc{/}        Back to main view
  {yellow-fg}Tab{/}        Switch panels

  {bold}{cyan-fg}Actions{/}
  ─────────────────────────────────
  {yellow-fg}s{/}          Start session
  {yellow-fg}e{/}          End session
  {yellow-fg}c{/}          Quick capture
  {yellow-fg}r{/}          Refresh
  {yellow-fg}o{/}          Open project folder

  {bold}{cyan-fg}General{/}
  ─────────────────────────────────
  {yellow-fg}q{/}          Quit (or back)
  {yellow-fg}?{/}          This help

  {gray-fg}Press any key to close{/}
      `
    })

    screen.append(help)
    help.focus()
    screen.render()

    help.onceKey(['escape', 'q', 'enter', 'space'], () => {
      screen.remove(help)
      if (currentView === 'main') {
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
      if (currentView === 'main') {
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
    const input = blessed.textbox({
      top: 'center',
      left: 'center',
      width: 60,
      height: 3,
      border: { type: 'line', fg: 'yellow' },
      label: ' 💡 Quick Capture: ',
      style: { bg: 'black' },
      inputOnFocus: true
    })

    screen.append(input)
    input.focus()
    screen.render()

    input.on('submit', async (value) => {
      screen.remove(input)
      if (value?.trim()) {
        try {
          await atlas.capture.add(value.trim())
          statusBar.setContent(` {green-fg}✓ Captured!{/}`)
          setTimeout(() => {
            if (currentView === 'main') loadMainView()
            else loadDetailView(selectedProject)
          }, 1000)
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

  projectsTable.focus()
  await loadMainView()

  const refreshInterval = setInterval(() => {
    if (currentView === 'main') loadMainView()
  }, 30000)

  process.on('exit', () => clearInterval(refreshInterval))
  screen.render()
}

export default runDashboard
