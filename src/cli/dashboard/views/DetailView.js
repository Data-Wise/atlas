/**
 * Detail View - Project Details
 *
 * Displays detailed information about a selected project.
 */

import blessed from 'blessed'
import contrib from 'blessed-contrib'
import { getStatusIcon, formatProjectType } from '../../../adapters/presenters/index.js'

/**
 * Create the detail view
 * @param {Object} screen - Blessed screen instance
 * @param {boolean} canvasSupported - Whether canvas widgets work
 * @returns {Object} Detail view components and methods
 */
export function createDetailView(screen, canvasSupported = true) {
  const detailView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true
  })

  // Header
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
  let sessionGauge
  if (canvasSupported) {
    sessionGauge = contrib.gauge({
      parent: detailLeftPanel,
      top: 7,
      left: 1,
      width: '100%-4',
      height: 5,
      label: " Today's Progress ",
      stroke: 'green',
      fill: 'white',
      showLabel: true
    })
  } else {
    sessionGauge = blessed.box({
      parent: detailLeftPanel,
      top: 7,
      left: 1,
      width: '100%-4',
      height: 5,
      border: { type: 'line' },
      label: " Today's Progress ",
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

  // Right panel - Breadcrumbs & Captures
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

  // Breadcrumbs log
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

  // Captures log
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

  // Command bar
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

  /**
   * Update detail view with project data
   */
  function update(project, options = {}) {
    const { session, todayStatus, trail, captures } = options
    const name = project.name
    const typeStr = formatProjectType(project.type)
    const status = project.status || 'unknown'

    // Header
    detailHeader.setContent(
      ` {bold}← Esc{/}  │  {bold}${name}{/}  │  ${getStatusIcon(status)} ${status}  │  ${typeStr}`
    )

    // Project info
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

    // Session gauge
    if (todayStatus && canvasSupported) {
      const gaugePercent = todayStatus.sessions ? Math.min(100, Math.round((todayStatus.sessions / 5) * 100)) : 0
      sessionGauge.setPercent(gaugePercent)
    }

    // Current session info
    let sessionText = '{gray-fg}No active session{/}\nPress {cyan-fg}s{/} to start'
    if (session && session.project === name) {
      const duration = session.getDuration ? session.getDuration() : 0
      sessionText = ` {green-fg}● ACTIVE{/} (${duration}m)\n`
      sessionText += ` Task: ${session.task || '-'}\n`
      sessionText += ` {gray-fg}Press e to end{/}`
    } else if (session) {
      sessionText = ` {yellow-fg}● Other: ${session.project}{/}\n`
      sessionText += ` {gray-fg}End other first{/}`
    }
    currentSessionBox.setContent(sessionText)

    // Breadcrumbs
    breadcrumbsLog.log('{bold}Recent Activity{/}')
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

    // Captures
    capturesLog.log('{bold}Inbox Items{/}')
    if (captures?.length) {
      captures.forEach(c => {
        const icon = c.type === 'task' ? '☐' : '💡'
        capturesLog.log(`${icon} ${(c.text || '').substring(0, 28)}`)
      })
    } else {
      capturesLog.log('{gray-fg}Inbox empty!{/}')
    }

    screen.render()
  }

  return {
    view: detailView,
    header: detailHeader,
    projectInfoBox,
    sessionGauge,
    currentSessionBox,
    breadcrumbsLog,
    capturesLog,
    commandBar: detailCommandBar,
    update,
    show: () => detailView.show(),
    hide: () => detailView.hide()
  }
}

export default createDetailView
