/**
 * Dashboard State Machine
 *
 * Manages view states and transitions for the ADHD-friendly dashboard.
 * Provides explicit state management with enter/exit hooks and event emission.
 */

// Valid dashboard states
export const STATES = {
  BROWSE: 'browse',      // Main project list view
  DETAIL: 'detail',      // Single project detail view
  FOCUS: 'focus',        // Focus mode with timer
  ZEN: 'zen'             // Minimal zen mode
}

// Valid transitions between states
const TRANSITIONS = {
  [STATES.BROWSE]: [STATES.DETAIL, STATES.FOCUS, STATES.ZEN],
  [STATES.DETAIL]: [STATES.BROWSE, STATES.FOCUS, STATES.ZEN],
  [STATES.FOCUS]: [STATES.BROWSE, STATES.ZEN],
  [STATES.ZEN]: [STATES.BROWSE, STATES.FOCUS]
}

/**
 * Create a new state machine for the dashboard
 * @param {Object} options - Configuration options
 * @param {string} options.initial - Initial state (default: BROWSE)
 * @returns {Object} State machine instance
 */
export function createStateMachine(options = {}) {
  let currentState = options.initial || STATES.BROWSE
  let previousState = null
  const listeners = new Map()
  const stateData = new Map() // Store data per state (e.g., selected project)

  // Event emitter helpers
  function emit(event, data) {
    const handlers = listeners.get(event) || []
    handlers.forEach(handler => handler(data))
  }

  function on(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, [])
    }
    listeners.get(event).push(handler)
    // Return unsubscribe function
    return () => {
      const handlers = listeners.get(event)
      const index = handlers.indexOf(handler)
      if (index > -1) handlers.splice(index, 1)
    }
  }

  /**
   * Transition to a new state
   * @param {string} newState - Target state
   * @param {Object} data - Optional data to pass with transition
   * @returns {boolean} Whether transition was successful
   */
  function transition(newState, data = {}) {
    // Validate state exists
    if (!Object.values(STATES).includes(newState)) {
      console.error(`Invalid state: ${newState}`)
      return false
    }

    // Check if transition is allowed
    const allowedTransitions = TRANSITIONS[currentState] || []
    if (!allowedTransitions.includes(newState) && currentState !== newState) {
      console.error(`Transition from ${currentState} to ${newState} not allowed`)
      return false
    }

    // Same state - no-op but still emit for refresh
    if (currentState === newState) {
      emit('refresh', { state: currentState, data })
      return true
    }

    // Store previous state
    previousState = currentState

    // Emit exit event for current state
    emit('exit', {
      from: currentState,
      to: newState,
      data: stateData.get(currentState)
    })
    emit(`exit:${currentState}`, {
      to: newState,
      data: stateData.get(currentState)
    })

    // Update state
    currentState = newState
    stateData.set(newState, data)

    // Emit enter event for new state
    emit('enter', {
      from: previousState,
      to: newState,
      data
    })
    emit(`enter:${newState}`, {
      from: previousState,
      data
    })

    // Emit general transition event
    emit('transition', {
      from: previousState,
      to: newState,
      data
    })

    return true
  }

  /**
   * Go back to previous state
   * @returns {boolean} Whether transition was successful
   */
  function back() {
    if (previousState) {
      return transition(previousState)
    }
    // Default to browse if no previous
    return transition(STATES.BROWSE)
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  function getState() {
    return currentState
  }

  /**
   * Get previous state
   * @returns {string|null} Previous state
   */
  function getPreviousState() {
    return previousState
  }

  /**
   * Check if currently in a specific state
   * @param {string} state - State to check
   * @returns {boolean} Whether in that state
   */
  function is(state) {
    return currentState === state
  }

  /**
   * Check if a transition to target state is allowed
   * @param {string} targetState - Target state
   * @returns {boolean} Whether transition is allowed
   */
  function canTransition(targetState) {
    const allowed = TRANSITIONS[currentState] || []
    return allowed.includes(targetState)
  }

  /**
   * Get data stored for a state
   * @param {string} state - State to get data for (default: current)
   * @returns {Object} State data
   */
  function getData(state = currentState) {
    return stateData.get(state) || {}
  }

  /**
   * Set data for current state
   * @param {Object} data - Data to store
   */
  function setData(data) {
    stateData.set(currentState, { ...stateData.get(currentState), ...data })
  }

  /**
   * Clean up all listeners
   */
  function destroy() {
    listeners.clear()
    stateData.clear()
  }

  return {
    // State queries
    getState,
    getPreviousState,
    is,
    canTransition,
    getData,
    setData,

    // Transitions
    transition,
    back,

    // Events
    on,

    // Cleanup
    destroy,

    // Constants
    STATES
  }
}

export default createStateMachine
