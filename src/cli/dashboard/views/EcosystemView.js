/**
 * Ecosystem View - Multi-Project Overview
 *
 * Displays all tracked projects with their status, progress, and metrics.
 * Designed for quick ecosystem health assessment.
 */

import blessed from 'blessed'

// Status emoji mappings
const STATUS_ICONS = {
  active: '🟢',
  stable: '✅',
  released: '🚀',
  paused: '⏸️',
  draft: '📝',
  archived: '📦',
  unknown: '❓'
}

// Priority display
const PRIORITY_COLORS = {
  1: 'red',
  2: 'yellow',
  3: 'cyan'
}

/**
 * Parse ## Key: Value format from .STATUS content
 * @param {string} content - Raw file content
 * @returns {Object} Parsed status data
 */
function parseStatusContent(content) {
  const data = {
    name: 'Unknown',
    type: 'unknown',
    status: 'unknown',
    phase: '',
    priority: 3,
    progress: 0,
    focus: '',
    next: []
  }

  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()

    // Parse ## Key: Value format
    if (trimmed.startsWith('## ')) {
      const rest = trimmed.slice(3)
      const colonIndex = rest.indexOf(':')
      if (colonIndex > 0) {
        const key = rest.slice(0, colonIndex).toLowerCase()
        const value = rest.slice(colonIndex + 1).trim()

        switch (key) {
          case 'project':
            data.name = value
            break
          case 'type':
            data.type = value
            break
          case 'status':
            data.status = value.toLowerCase()
            break
          case 'phase':
            data.phase = value
            break
          case 'priority':
            data.priority = parseInt(value, 10) || 3
            break
          case 'progress':
            data.progress = parseInt(value, 10) || 0
            break
          case 'focus':
            data.focus = value
            break
        }
      }
    }
  }

  return data
}

/**
 * Create progress bar string
 * @param {number} progress - Progress percentage (0-100)
 * @param {number} width - Bar width
 * @returns {string} Progress bar with color tags
 */
function createProgressBar(progress, width = 15) {
  const filled = Math.round((progress / 100) * width)
  const empty = width - filled

  const color = progress >= 75 ? 'green' : progress >= 50 ? 'yellow' : 'cyan'
  return `{${color}-fg}${'█'.repeat(filled)}{/}{gray-fg}${'░'.repeat(empty)}{/}`
}

/**
 * Create the ecosystem view
 * @param {Object} screen - Blessed screen instance
 * @returns {Object} Ecosystem view components and methods
 */
export function createEcosystemView(screen) {
  const ecosystemView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    style: { bg: 'black' }
  })

  // Title bar
  const titleBar = blessed.box({
    parent: ecosystemView,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'white', bg: 'black' },
    content: ' {bold}ECOSYSTEM{/}  {gray-fg}───────────────────────────────────────────────{/}'
  })

  // Stats summary bar
  const statsBar = blessed.box({
    parent: ecosystemView,
    top: 1,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'white', bg: 'black' },
    content: ''
  })

  // Project list container
  const listContainer = blessed.box({
    parent: ecosystemView,
    top: 3,
    left: 1,
    width: '100%-2',
    height: '100%-5',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '│',
      style: { fg: 'gray' }
    },
    tags: true,
    style: { fg: 'white', bg: 'black' }
  })

  // Command bar
  const commandBar = blessed.box({
    parent: ecosystemView,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content: ' {cyan-fg}↑↓{/} Navigate  {cyan-fg}Enter{/} View  {cyan-fg}f{/} Focus  {cyan-fg}Esc{/} Back  {cyan-fg}q{/} Quit'
  })

  // State
  let projects = []
  let selectedIndex = 0

  /**
   * Update display with project data
   * @param {Array} projectData - Array of project status objects
   */
  function updateDisplay(projectData) {
    projects = projectData || []
    selectedIndex = Math.min(selectedIndex, Math.max(0, projects.length - 1))

    // Update stats bar
    const activeCount = projects.filter(p => p.status === 'active').length
    const totalProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0)
    const avgProgress = projects.length > 0 ? Math.round(totalProgress / projects.length) : 0

    statsBar.setContent(
      ` {green-fg}${activeCount}{/} Active  │  ` +
      `{cyan-fg}${projects.length}{/} Total  │  ` +
      `{yellow-fg}${avgProgress}%{/} Avg Progress`
    )

    // Group projects by status
    const grouped = {
      active: projects.filter(p => p.status === 'active'),
      stable: projects.filter(p => p.status === 'stable' || p.status === 'released'),
      paused: projects.filter(p => p.status === 'paused'),
      draft: projects.filter(p => p.status === 'draft'),
      other: projects.filter(p => !['active', 'stable', 'released', 'paused', 'draft'].includes(p.status))
    }

    // Build content
    const lines = []
    let globalIndex = 0

    const addGroup = (title, groupProjects) => {
      if (groupProjects.length === 0) return

      lines.push(`{bold}{white-fg}${title}{/} (${groupProjects.length})`)
      lines.push('')

      for (const project of groupProjects) {
        const isSelected = globalIndex === selectedIndex
        const prefix = isSelected ? '{inverse} ► {/}' : '   '
        const statusIcon = STATUS_ICONS[project.status] || STATUS_ICONS.unknown
        const progressBar = createProgressBar(project.progress || 0)
        const priorityColor = PRIORITY_COLORS[project.priority] || 'white'

        const name = (project.name || 'Unknown').padEnd(20).slice(0, 20)
        const phase = (project.phase || '').slice(0, 30).padEnd(30)

        lines.push(
          `${prefix}${statusIcon} {bold}${name}{/} ${progressBar} ` +
          `{${priorityColor}-fg}P${project.priority || 3}{/} ` +
          `{gray-fg}${phase}{/}`
        )

        if (project.focus && isSelected) {
          lines.push(`     {cyan-fg}Focus: ${project.focus}{/}`)
        }

        globalIndex++
      }

      lines.push('')
    }

    addGroup('🔥 Active Projects', grouped.active)
    addGroup('✅ Stable/Released', grouped.stable)
    addGroup('⏸️ Paused', grouped.paused)
    addGroup('📝 Draft', grouped.draft)
    addGroup('📦 Other', grouped.other)

    listContainer.setContent(lines.join('\n'))
    screen.render()
  }

  /**
   * Move selection
   * @param {number} delta - Direction (+1 or -1)
   */
  function moveSelection(delta) {
    if (projects.length === 0) return

    selectedIndex = Math.max(0, Math.min(projects.length - 1, selectedIndex + delta))
    updateDisplay(projects)
  }

  /**
   * Get selected project
   * @returns {Object|null} Selected project data
   */
  function getSelectedProject() {
    return projects[selectedIndex] || null
  }

  return {
    view: ecosystemView,
    container: listContainer,
    commandBar,
    updateDisplay,
    moveSelection,
    getSelectedProject,
    parseStatusContent,
    show: () => ecosystemView.show(),
    hide: () => ecosystemView.hide()
  }
}

export { parseStatusContent }
export default createEcosystemView
