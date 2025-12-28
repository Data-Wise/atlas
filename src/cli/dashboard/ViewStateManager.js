/**
 * ViewStateManager - Centralized Dashboard State
 *
 * Single source of truth for all dashboard UI state.
 * Views subscribe to state changes and react accordingly.
 *
 * Works alongside stateMachine.js which handles view transitions.
 * This manager handles the DATA state within each view.
 */

/**
 * @typedef {Object} ViewState
 * @property {number} selectedIndex - Currently selected project index
 * @property {Object|null} selectedProject - Currently selected project object
 * @property {string} filter - Current filter ('a'=active, 'p'=paused, 's'=stable, '*'=all)
 * @property {string} searchTerm - Current search term
 * @property {Array} allProjects - All loaded projects
 * @property {Array} filteredProjects - Projects after filter/search applied
 * @property {string|null} activeSession - Name of project with active session
 * @property {string} theme - Current theme name
 * @property {number|null} lastRefresh - Timestamp of last data refresh
 * @property {Object} pomodoroState - Timer state from timerManager
 */

/**
 * Create a new ViewStateManager
 * @param {Object} options - Configuration options
 * @returns {Object} ViewStateManager instance
 */
export function createViewStateManager(options = {}) {
  // Initial state
  const state = {
    // Selection
    selectedIndex: 0,
    selectedProject: null,

    // Filtering
    filter: options.defaultFilter || '*',
    searchTerm: '',
    allProjects: [],
    filteredProjects: [],

    // Session
    activeSession: null,

    // UI
    theme: options.theme || 'default',
    lastRefresh: null,

    // Timer
    pomodoroState: {
      isActive: false,
      isPaused: false,
      remaining: 0,
      duration: 25,
      breakReminder: false,
      history: []
    }
  }

  // Subscribers
  const subscribers = new Set()

  // Specific field subscribers (for optimized updates)
  const fieldSubscribers = new Map()

  /**
   * Notify all subscribers of state change
   * @param {Array<string>} changedFields - Fields that changed
   */
  function notify(changedFields = []) {
    const currentState = getState()

    // Notify general subscribers
    subscribers.forEach(callback => {
      try {
        callback(currentState, changedFields)
      } catch (err) {
        console.error('ViewStateManager subscriber error:', err.message)
      }
    })

    // Notify field-specific subscribers
    changedFields.forEach(field => {
      const fieldSubs = fieldSubscribers.get(field)
      if (fieldSubs) {
        fieldSubs.forEach(callback => {
          try {
            callback(currentState[field], currentState)
          } catch (err) {
            console.error(`ViewStateManager field subscriber error (${field}):`, err.message)
          }
        })
      }
    })
  }

  /**
   * Get current state (immutable copy)
   * @returns {ViewState} Current state
   */
  function getState() {
    return { ...state }
  }

  /**
   * Get a specific field from state
   * @param {string} field - Field name
   * @returns {*} Field value
   */
  function get(field) {
    return state[field]
  }

  /**
   * Update state with partial values
   * @param {Partial<ViewState>} partial - Fields to update
   * @param {Object} options - Update options
   * @param {boolean} options.silent - Don't notify subscribers
   */
  function update(partial, options = {}) {
    const changedFields = []

    for (const [key, value] of Object.entries(partial)) {
      if (state[key] !== value) {
        state[key] = value
        changedFields.push(key)
      }
    }

    if (changedFields.length > 0 && !options.silent) {
      notify(changedFields)
    }

    return changedFields
  }

  /**
   * Subscribe to all state changes
   * @param {Function} callback - Called with (state, changedFields)
   * @returns {Function} Unsubscribe function
   */
  function subscribe(callback) {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }

  /**
   * Subscribe to specific field changes
   * @param {string} field - Field to watch
   * @param {Function} callback - Called with (fieldValue, fullState)
   * @returns {Function} Unsubscribe function
   */
  function subscribeToField(field, callback) {
    if (!fieldSubscribers.has(field)) {
      fieldSubscribers.set(field, new Set())
    }
    fieldSubscribers.get(field).add(callback)
    return () => fieldSubscribers.get(field).delete(callback)
  }

  /**
   * Set all projects and apply current filter
   * @param {Array} projects - All projects
   */
  function setProjects(projects) {
    update({ allProjects: projects }, { silent: true })
    applyFilter()
  }

  /**
   * Apply current filter and search to projects
   */
  function applyFilter() {
    let filtered = [...state.allProjects]

    // Apply status filter
    if (state.filter !== '*') {
      const statusMap = {
        'a': 'active',
        'p': 'paused',
        's': 'stable'
      }
      const targetStatus = statusMap[state.filter]
      if (targetStatus) {
        filtered = filtered.filter(p => p.status === targetStatus)
      }
    }

    // Apply search
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.focus && p.focus.toLowerCase().includes(term)) ||
        (p.next && p.next.toLowerCase().includes(term))
      )
    }

    // Update filtered list and adjust selection
    const newIndex = Math.min(state.selectedIndex, Math.max(0, filtered.length - 1))
    const newProject = filtered[newIndex] || null

    update({
      filteredProjects: filtered,
      selectedIndex: newIndex,
      selectedProject: newProject,
      lastRefresh: Date.now()
    })
  }

  /**
   * Set filter and reapply
   * @param {string} filter - Filter code
   */
  function setFilter(filter) {
    update({ filter }, { silent: true })
    applyFilter()
  }

  /**
   * Set search term and reapply
   * @param {string} term - Search term
   */
  function setSearchTerm(term) {
    update({ searchTerm: term }, { silent: true })
    applyFilter()
  }

  /**
   * Select a project by index
   * @param {number} index - Project index
   * @returns {Object|null} Selected project
   */
  function selectByIndex(index) {
    const maxIndex = state.filteredProjects.length - 1
    const newIndex = Math.max(0, Math.min(index, maxIndex))

    if (newIndex < 0 || state.filteredProjects.length === 0) {
      update({ selectedIndex: 0, selectedProject: null })
      return null
    }

    const project = state.filteredProjects[newIndex]
    update({ selectedIndex: newIndex, selectedProject: project })
    return project
  }

  /**
   * Move selection up/down
   * @param {number} delta - Direction (-1 = up, 1 = down)
   * @returns {Object|null} Newly selected project
   */
  function moveSelection(delta) {
    return selectByIndex(state.selectedIndex + delta)
  }

  /**
   * Select first/last project
   * @param {string} position - 'first' or 'last'
   * @returns {Object|null} Selected project
   */
  function selectPosition(position) {
    if (position === 'first') {
      return selectByIndex(0)
    } else if (position === 'last') {
      return selectByIndex(state.filteredProjects.length - 1)
    }
    return state.selectedProject
  }

  /**
   * Set active session
   * @param {string|null} projectName - Project name or null
   */
  function setActiveSession(projectName) {
    update({ activeSession: projectName })
  }

  /**
   * Update Pomodoro state
   * @param {Partial<Object>} pomodoroUpdate - Timer state updates
   */
  function updatePomodoro(pomodoroUpdate) {
    update({
      pomodoroState: { ...state.pomodoroState, ...pomodoroUpdate }
    })
  }

  /**
   * Reset state to defaults
   */
  function reset() {
    update({
      selectedIndex: 0,
      selectedProject: null,
      filter: options.defaultFilter || '*',
      searchTerm: '',
      filteredProjects: [],
      activeSession: null
    })
  }

  /**
   * Clean up all subscriptions
   */
  function destroy() {
    subscribers.clear()
    fieldSubscribers.clear()
  }

  return {
    // State access
    getState,
    get,
    update,

    // Subscriptions
    subscribe,
    subscribeToField,

    // Project management
    setProjects,
    applyFilter,
    setFilter,
    setSearchTerm,

    // Selection
    selectByIndex,
    moveSelection,
    selectPosition,

    // Session
    setActiveSession,

    // Timer
    updatePomodoro,

    // Lifecycle
    reset,
    destroy
  }
}

export default createViewStateManager
