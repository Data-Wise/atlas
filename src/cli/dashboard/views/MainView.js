/**
 * Main View - Card Stack Layout
 *
 * Displays project cards in a scrollable list with filtering.
 *
 * Performance optimizations (v0.6.0):
 * - Virtual scrolling: Only renders visible cards + buffer
 * - Card pooling: Reuses DOM elements instead of destroy/create
 * - Debounced rendering: Prevents excessive re-renders (60fps target)
 */

import blessed from 'blessed'
import {
  CARD_HEIGHT,
  VIRTUAL_SCROLL_BUFFER,
  RENDER_DEBOUNCE_MS
} from '../constants.js'
import {
  getStatusIcon,
  formatProjectType,
  formatTimeAgo,
  createMiniProgressBar,
  truncateText
} from '../../../adapters/presenters/index.js'
import { createCardPool } from '../CardPool.js'
import { debounce } from '../../../utils/debounce.js'

/**
 * Create the main view with project cards
 * @param {Object} screen - Blessed screen instance
 * @param {Object} options - Configuration options
 * @returns {Object} Main view components and methods
 */
export function createMainView(screen, options = {}) {
  // Calculate visible area
  const getVisibleCardCount = () => Math.floor((screen.height - 8) / CARD_HEIGHT)

  // State
  let selectedCardIndex = 0
  let filteredList = []
  let activeSessionProject = null
  let scrollOffset = 0 // Tracks virtual scroll position

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

  // Initialize card pool
  const cardPool = createCardPool(cardContainer)

  /**
   * Calculate visible range for virtual scrolling
   * @returns {Object} { start, end } indices
   */
  function getVisibleRange() {
    const visibleCount = getVisibleCardCount()
    const buffer = VIRTUAL_SCROLL_BUFFER

    // Calculate start based on scroll position
    const scrollTop = cardContainer.childBase || 0
    const startFromScroll = Math.floor(scrollTop / CARD_HEIGHT)

    // Ensure selected card is in range
    const start = Math.max(0, Math.min(startFromScroll, selectedCardIndex) - buffer)
    const end = Math.min(
      filteredList.length - 1,
      Math.max(startFromScroll + visibleCount, selectedCardIndex) + buffer
    )

    return { start, end }
  }

  /**
   * Generate card content for a project
   * @param {Object} project - Project data
   * @param {boolean} isSelected - Whether card is selected
   * @param {boolean} isActive - Whether project has active session
   * @returns {Object} Card content configuration
   */
  function getCardContent(project, isSelected, isActive) {
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

    // Line 1: Name and active status
    const statusIcon = getStatusIcon(project.status || 'unknown')
    const activeIndicator = isActive ? '{green-fg}● ACTIVE{/}' : ''
    const nameDisplay = isActive
      ? `{bold}{green-fg}${project.name}{/}{/bold}`
      : `{bold}{${nameColor}-fg}${project.name}{/}{/bold}`
    const line1 = `${statusIcon} ${nameDisplay}  ${activeIndicator}`

    // Line 2: Type, status, time + progress bar
    const typeStr = formatProjectType(project.type)
    const statusStr = project.status || 'unknown'
    const progress = project.progress || project.metadata?.progress || 0
    const timeInfo = project.lastSession ? formatTimeAgo(project.lastSession) : ''
    const miniProgressBar = progress > 0 ? ` ${createMiniProgressBar(progress)}` : ''
    const line2 = `  {gray-fg}${typeStr} • ${statusStr}${timeInfo ? ' • ' + timeInfo : ''}${miniProgressBar}{/}`

    // Line 3: Next action or focus
    const nextAction = project.next || project.metadata?.next
    const focusText = project.focus || project.metadata?.focus
    const actionText = nextAction || focusText
    let line3 = ''

    if (actionText) {
      line3 = `  {yellow-fg}→{/} ${truncateText(actionText, 50)}`
    } else if (isSelected) {
      line3 = '  {gray-fg}Press Enter for details, s to start session{/}'
    }

    return { borderColor, bgColor, line1, line2, line3 }
  }

  /**
   * Render visible cards using virtual scrolling and card pool
   * Core rendering function - optimized for performance
   */
  function renderCardsInternal() {
    try {
      const { start, end } = getVisibleRange()
      const currentIndices = cardPool.getInUseIndices()
      const neededIndices = new Set()

      // Determine which indices we need
      for (let i = start; i <= end; i++) {
        neededIndices.add(i)
      }

      // Release cards no longer needed
      for (const index of currentIndices) {
        if (!neededIndices.has(index)) {
          const card = cardPool.getCard(index)
          cardPool.release(card, index)
        }
      }

      // Render needed cards
      for (let i = start; i <= end; i++) {
        if (i >= filteredList.length) break

        const project = filteredList[i]
        const isSelected = i === selectedCardIndex
        const isActive = project.name === activeSessionProject
        const cardTop = i * CARD_HEIGHT

        const card = cardPool.getCard(i)
        const content = getCardContent(project, isSelected, isActive)

        cardPool.updateCard(card, {
          top: cardTop,
          borderColor: content.borderColor,
          bgColor: content.bgColor,
          line1: content.line1,
          line2: content.line2,
          line3: content.line3
        })
      }

      // Update title bar with count
      const visibleCount = getVisibleCardCount()
      if (filteredList.length > visibleCount) {
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

  // Debounced render function for smooth 60fps performance
  const renderCards = debounce(renderCardsInternal, RENDER_DEBOUNCE_MS)

  // Immediate render for critical updates (selection changes)
  function renderCardsImmediate() {
    renderCards.cancel()
    renderCardsInternal()
  }

  /**
   * Select a card by index
   */
  function selectCard(index) {
    if (index < 0) index = 0
    if (index >= filteredList.length) index = filteredList.length - 1
    if (index < 0) return null

    selectedCardIndex = index
    // Use immediate render for selection changes (feels responsive)
    renderCardsImmediate()
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

  /**
   * Set filtered list and reset selection
   */
  function setFilteredList(list) {
    filteredList = list
    // Release all cards when list changes
    cardPool.releaseAll()
  }

  /**
   * Get pool statistics for debugging
   */
  function getPoolStats() {
    return cardPool.getStats()
  }

  /**
   * Cleanup resources
   */
  function destroy() {
    renderCards.cancel()
    cardPool.destroy()
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
    renderCards: renderCardsImmediate, // Use immediate for external calls
    selectCard,
    updateCommandBar,
    updateFilterBar,
    destroy,

    // State management
    setFilteredList,
    setActiveSession: (project) => { activeSessionProject = project },
    getSelectedIndex: () => selectedCardIndex,
    setSelectedIndex: (idx) => { selectedCardIndex = idx },
    getFilteredList: () => filteredList,
    getSelectedProject: () => filteredList[selectedCardIndex],

    // Debug
    getPoolStats
  }
}

export default createMainView
