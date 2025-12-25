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

  // Project status donut chart (top-left)
  const statusDonut = grid.set(0, 0, 4, 4, contrib.donut, {
    label: ' Project Status ',
    radius: 10,
    arcWidth: 3,
    remainColor: 'black',
    yPadding: 2
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

  // Active projects table (middle)
  const projectsTable = grid.set(4, 0, 5, 8, contrib.table, {
    keys: true,
    fg: 'white',
    selectedFg: 'white',
    selectedBg: 'blue',
    interactive: true,
    label: ' Active Projects ',
    width: '100%',
    height: '100%',
    border: { type: 'line', fg: 'cyan' },
    columnSpacing: 3,
    columnWidth: [20, 10, 8, 30]
  })

  // Recent captures log (middle-right)
  const captureLog = grid.set(4, 8, 5, 4, contrib.log, {
    fg: 'green',
    selectedFg: 'green',
    label: ' Recent Captures '
  })

  // Next actions list (bottom)
  const nextActions = grid.set(9, 0, 3, 8, blessed.list, {
    label: ' Next Actions ',
    border: { type: 'line' },
    style: {
      fg: 'white',
      border: { fg: 'cyan' },
      selected: { bg: 'blue' }
    },
    keys: true,
    vi: true
  })

  // Help box (bottom-right)
  const helpBox = grid.set(9, 8, 3, 4, blessed.box, {
    label: ' Help ',
    border: { type: 'line' },
    style: {
      fg: 'gray',
      border: { fg: 'gray' }
    },
    content: 'q: quit\nr: refresh\nt: triage\ns: start session'
  })

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  async function loadData() {
    try {
      // Get projects
      const projects = await atlas.projects.list()
      const statusCounts = { active: 0, paused: 0, blocked: 0, archived: 0, complete: 0 }

      const activeProjects = []
      const allNextActions = []

      for (const p of projects) {
        const status = p.status || 'active'
        statusCounts[status] = (statusCounts[status] || 0) + 1

        if (status === 'active') {
          const projectDetails = await atlas.projects.get(p.name)
          // Handle ProjectType value object or string
          const typeStr = typeof p.type === 'object' ? (p.type?.value || 'generic') : (p.type || 'generic')
          activeProjects.push({
            name: p.name,
            type: typeStr,
            progress: projectDetails?.progress || 0,
            next: projectDetails?.next?.[0]?.action || '-'
          })

          if (projectDetails?.next?.[0]) {
            allNextActions.push(`${p.name}: ${projectDetails.next[0].action}`)
          }
        }
      }

      // Update status donut
      const donutData = []
      if (statusCounts.active > 0) donutData.push({ percent: statusCounts.active, label: 'Active', color: 'green' })
      if (statusCounts.paused > 0) donutData.push({ percent: statusCounts.paused, label: 'Paused', color: 'yellow' })
      if (statusCounts.blocked > 0) donutData.push({ percent: statusCounts.blocked, label: 'Blocked', color: 'red' })
      if (statusCounts.complete > 0) donutData.push({ percent: statusCounts.complete, label: 'Complete', color: 'blue' })

      if (donutData.length > 0) {
        statusDonut.setData(donutData)
      }

      // Update projects table
      projectsTable.setData({
        headers: ['Project', 'Type', 'Progress', 'Next Action'],
        data: activeProjects.map(p => [
          String(p.name || '').substring(0, 18),
          String(p.type || 'generic').substring(0, 8),
          `${p.progress || 0}%`,
          String(p.next || '-').substring(0, 28)
        ])
      })

      // Update next actions
      nextActions.setItems(allNextActions.slice(0, 10))

      // Get inbox stats
      const triageUseCase = atlas.container.resolve('TriageInboxUseCase')
      const stats = await triageUseCase.getStats()
      inboxBox.setDisplay(stats.inbox.toString().padStart(4, ' '))

      // Get recent captures
      const captures = await atlas.capture.inbox({ limit: 5 })
      captures.forEach(c => {
        captureLog.log(`[${c.type}] ${c.text.substring(0, 30)}`)
      })

      // Get current session
      const session = await atlas.sessions.current()
      if (session) {
        sessionBox.setContent(`\n  Project: ${session.project || 'default'}\n  Started: ${session.startTime || 'now'}\n  Focus: ${session.focus || '-'}`)
      } else {
        sessionBox.setContent('\n  No active session\n\n  Press "s" to start')
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
