/**
 * Main View - Card Stack Layout
 *
 * Displays project cards in a scrollable list with filtering.
 */

import blessed from 'blessed'
import { CARD_HEIGHT } from '../constants.js'
import {
  getStatusIcon,
  formatProjectType,
  formatTimeAgo,
  createMiniProgressBar,
  truncateText
} from '../../../adapters/presenters/index.js'

/**
 * Create the main view with project cards
 * @param {Object} screen - Blessed screen instance
 * @param {Object} options - Configuration options
 * @returns {Object} Main view components and methods
 */
export function createMainView(screen, options = {}) {
  const MAX_VISIBLE_CARDS = Math.floor((screen.height - 8) / CARD_HEIGHT)

  // State
  let projectCards = []
  let selectedCardIndex = 0
  let filteredList = []
  let activeSessionProject = null

  // Main container
  const mainView = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: { bg: 'black' }
  })

  // Title bar
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

  // Stats footer
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

  // Command bar
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

  // Filter bar
  const filterBar = blessed.box({
    parent: mainView,
    top: 1,
    left: 2,
    width: '100%-4',
    height: 1,
    tags: true,
    style: { fg: 'gray', bg: 'black' }
  })

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

  /**
   * Create a project card
   */
  function createProjectCard(project, index, isSelected, isActive) {
    const cardTop = index * CARD_HEIGHT

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

    const nameDisplay = isActive
      ? `{bold}{green-fg}${project.name}{/}{/bold}`
      : `{bold}{${nameColor}-fg}${project.name}{/}{/bold}`

    // Line 1: Name and active status
    blessed.box({
      parent: card,
      top: 0,
      left: 1,
      width: '100%-4',
      height: 1,
      tags: true,
      content: `${statusIcon} ${nameDisplay}  ${activeIndicator}`
    })

    // Line 2: Type, status, time + progress bar
    const typeStr = formatProjectType(project.type)
    const statusStr = project.status || 'unknown'
    const progress = project.progress || project.metadata?.progress || 0
    const timeInfo = project.lastSession ? formatTimeAgo(project.lastSession) : ''
    const miniProgressBar = progress > 0 ? ` ${createMiniProgressBar(progress)}` : ''

    blessed.box({
      parent: card,
      top: 1,
      left: 1,
      width: '100%-4',
      height: 1,
      tags: true,
      content: `  {gray-fg}${typeStr} • ${statusStr}${timeInfo ? ' • ' + timeInfo : ''}${miniProgressBar}{/}`
    })

    // Line 3: Next action or focus
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
        blessed.box({
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

  /**
   * Render all project cards
   * Wrapped in error boundary for graceful degradation
   */
  function renderCards() {
    try {
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

      // Update title bar with count
      if (filteredList.length > MAX_VISIBLE_CARDS) {
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
    } catch (err) {
      // Graceful fallback - show error in card container
      cardContainer.setContent(`{red-fg}Render error: ${err.message}{/}\n\n{gray-fg}Press 'r' to refresh{/}`)
      screen.render()
    }
  }

  /**
   * Select a card by index
   */
  function selectCard(index) {
    if (index < 0) index = 0
    if (index >= filteredList.length) index = filteredList.length - 1
    if (index < 0) return null

    selectedCardIndex = index
    renderCards()
    return filteredList[index]
  }

  /**
   * Update command bar based on session state
   */
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

  /**
   * Update filter bar display
   */
  function updateFilterBar(currentFilter, searchTerm) {
    const filters = [
      currentFilter === 'a' ? '{green-fg}[A]ctive{/}' : '{gray-fg}[a]ctive{/}',
      currentFilter === 'p' ? '{yellow-fg}[P]aused{/}' : '{gray-fg}[p]aused{/}',
      currentFilter === 's' ? '{cyan-fg}[S]table{/}' : '{gray-fg}[s]table{/}',
      currentFilter === '*' ? '{white-fg}[*]All{/}' : '{gray-fg}[*]all{/}'
    ]
    const searchDisplay = searchTerm ? ` {blue-fg}/${searchTerm}{/}` : ' {gray-fg}/search{/}'
    filterBar.setContent(` ${filters.join('  ')}  ${searchDisplay}`)
  }

  return {
    // Components
    view: mainView,
    titleBar,
    cardContainer,
    statsFooter,
    commandBar,
    filterBar,
    searchInput,

    // Methods
    renderCards,
    selectCard,
    updateCommandBar,
    updateFilterBar,

    // State management
    setFilteredList: (list) => { filteredList = list },
    setActiveSession: (project) => { activeSessionProject = project },
    getSelectedIndex: () => selectedCardIndex,
    setSelectedIndex: (idx) => { selectedCardIndex = idx },
    getFilteredList: () => filteredList,
    getSelectedProject: () => filteredList[selectedCardIndex]
  }
}

export default createMainView
