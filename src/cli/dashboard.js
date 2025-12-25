/**
 * Atlas Dashboard TUI
 *
 * Terminal-based dashboard using blessed-contrib for
 * at-a-glance project status visualization.
 */

import blessed from 'blessed'
import contrib from 'blessed-contrib'

/**
 * Create and run the dashboard
 *
 * @param {Atlas} atlas - Atlas instance
 * @param {Object} options - Dashboard options
 */
export async function runDashboard(atlas, options = {}) {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Atlas Dashboard'
  })

  // Create grid layout
  const grid = new contrib.grid({
    rows: 12,
    cols: 12,
    screen: screen
  })

  // ============================================================================
  // WIDGETS
  // ============================================================================

  // Project status bar chart (top-left) - more reliable than donut
  const statusBar = grid.set(0, 0, 4, 4, contrib.bar, {
    label: ' Project Status ',
    barWidth: 6,
    barSpacing: 2,
    xOffset: 0,
    maxHeight: 50,
    barBgColor: 'cyan'
  })

  // Inbox stats (top-middle)
  const inboxBox = grid.set(0, 4, 4, 4, contrib.lcd, {
    segmentWidth: 0.06,
    segmentInterval: 0.11,
    strokeWidth: 0.1,
    elements: 4,
    display: '0',
    elementSpacing: 4,
    elementPadding: 2,
    color: 'cyan',
    label: ' Inbox Items '
  })

  // Session timer (top-right)
  const sessionBox = grid.set(0, 8, 4, 4, blessed.box, {
    label: ' Current Session ',
    border: { type: 'line' },
    style: {
      fg: 'white',
      border: { fg: 'cyan' }
    }
  })

  // Projects table (middle)
  const projectsTable = grid.set(4, 0, 5, 8, contrib.table, {
    keys: true,
    fg: 'white',
    selectedFg: 'white',
    selectedBg: 'blue',
    interactive: true,
    label: ' Projects ',
    width: '100%',
    height: '100%',
    border: { type: 'line', fg: 'cyan' },
    columnSpacing: 3,
    columnWidth: [20, 12, 10, 25]
  })

  // Recent captures log (middle-right)
  const captureLog = grid.set(4, 8, 5, 4, contrib.log, {
    fg: 'green',
    selectedFg: 'green',
    label: ' Recent Captures '
  })

  // Stats box (bottom)
  const statsBox = grid.set(9, 0, 3, 8, blessed.box, {
    label: ' Today ',
    border: { type: 'line' },
    style: {
      fg: 'white',
      border: { fg: 'cyan' }
    }
  })

  // Help box (bottom-right)
  const helpBox = grid.set(9, 8, 3, 4, blessed.box, {
    label: ' Help ',
    border: { type: 'line' },
    style: {
      fg: 'gray',
      border: { fg: 'gray' }
    },
    content: 'q: quit\nr: refresh'
  })

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  async function loadData() {
    try {
      // Get all projects
      const projects = await atlas.projects.list()

      // Count by status
      const statusCounts = {
        active: 0,
        paused: 0,
        stable: 0,
        other: 0
      }

      const projectRows = []

      for (const p of projects) {
        // Normalize status
        const rawStatus = p.status || 'unknown'
        let status = rawStatus

        if (['active', 'working', 'in-progress'].includes(rawStatus)) {
          status = 'active'
          statusCounts.active++
        } else if (['paused', 'blocked', 'waiting'].includes(rawStatus)) {
          status = 'paused'
          statusCounts.paused++
        } else if (['stable', 'complete', 'released'].includes(rawStatus)) {
          status = 'stable'
          statusCounts.stable++
        } else {
          statusCounts.other++
        }

        // Get type string
        const typeStr = typeof p.type === 'object'
          ? (p.type?.value || p.type?._value || 'general')
          : (p.type || 'general')

        projectRows.push({
          name: p.name,
          type: typeStr,
          status: rawStatus,
          path: p.path
        })
      }

      // Update status bar chart
      statusBar.setData({
        titles: ['Active', 'Paused', 'Stable', 'Other'],
        data: [statusCounts.active, statusCounts.paused, statusCounts.stable, statusCounts.other]
      })

      // Update projects table - show first 15
      projectsTable.setData({
        headers: ['Project', 'Type', 'Status', 'Path'],
        data: projectRows.slice(0, 15).map(p => [
          String(p.name || '').substring(0, 18),
          String(p.type || 'general').substring(0, 10),
          String(p.status || 'unknown').substring(0, 8),
          String(p.path || '').split('/').slice(-2).join('/')
        ])
      })

      // Get inbox stats
      try {
        const triageUseCase = atlas.container.resolve('TriageInboxUseCase')
        const stats = await triageUseCase.getStats()
        inboxBox.setDisplay(String(stats.inbox || 0).padStart(4, ' '))
      } catch (e) {
        inboxBox.setDisplay('   -')
      }

      // Get recent captures
      try {
        const captures = await atlas.capture.inbox({ limit: 5 })
        if (captures && captures.length > 0) {
          captures.forEach(c => {
            const text = c.text || c.content || ''
            captureLog.log(`[${c.type || 'idea'}] ${text.substring(0, 30)}`)
          })
        }
      } catch (e) {
        captureLog.log('(no captures)')
      }

      // Get current session
      try {
        const session = await atlas.sessions.current()
        if (session) {
          const duration = session.getDuration ? session.getDuration() : 0
          sessionBox.setContent(
            `\n  Project: ${session.project || 'default'}` +
            `\n  Duration: ${duration}m` +
            `\n  Task: ${session.task || '-'}`
          )
        } else {
          sessionBox.setContent('\n  No active session\n\n  Use: atlas session start')
        }
      } catch (e) {
        sessionBox.setContent('\n  Session error\n  ' + e.message)
      }

      // Get today's stats
      try {
        const status = await atlas.context.getStatus()
        if (status && status.today) {
          statsBox.setContent(
            `  Sessions: ${status.today.sessions || 0}` +
            `  |  Duration: ${status.today.totalDuration || 0}m` +
            `  |  Flow: ${status.today.flowSessions || 0}` +
            `  |  Projects: ${projects.length}`
          )
        } else {
          statsBox.setContent(`  Projects: ${projects.length}`)
        }
      } catch (e) {
        statsBox.setContent(`  Projects: ${projects.length}`)
      }

    } catch (err) {
      captureLog.log(`Error: ${err.message}`)
    }

    screen.render()
  }

  // ============================================================================
  // KEY BINDINGS
  // ============================================================================

  screen.key(['escape', 'q', 'C-c'], () => {
    return process.exit(0)
  })

  screen.key(['r'], async () => {
    captureLog.log('Refreshing...')
    await loadData()
  })

  // ============================================================================
  // INITIALIZE
  // ============================================================================

  // Initial load
  await loadData()

  // Auto-refresh every 30 seconds
  const refreshInterval = setInterval(loadData, 30000)

  // Cleanup on exit
  process.on('exit', () => {
    clearInterval(refreshInterval)
  })

  screen.render()
}

export default runDashboard
