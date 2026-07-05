/**
 * Dashboard State Machine
 *
 * Manages view states and transitions for the ADHD-friendly dashboard.
 * Provides explicit state management with enter/exit hooks and event emission.
 */

// Valid dashboard states
export const STATES = {
  BROWSE: 'browse',        // Main project list view
  DETAIL: 'detail',        // Single project detail view
  FOCUS: 'focus',          // Focus mode with timer
  ZEN: 'zen',              // Minimal zen mode
  TIMELINE: 'timeline',    // Time block view
  ECOSYSTEM: 'ecosystem',  // Multi-project ecosystem overview
  PLAN: 'plan',            // Morning ritual / daily planning
  ANALYTICS: 'analytics'   // Velocity + pattern analytics (v0.13.0)
} as const;

export type StateType = typeof STATES[keyof typeof STATES];

// Valid transitions between states
const TRANSITIONS: Record<StateType, StateType[]> = {
  [STATES.BROWSE]: [STATES.DETAIL, STATES.FOCUS, STATES.ZEN, STATES.TIMELINE, STATES.ECOSYSTEM, STATES.PLAN, STATES.ANALYTICS],
  [STATES.DETAIL]: [STATES.BROWSE, STATES.FOCUS, STATES.ZEN, STATES.TIMELINE, STATES.ECOSYSTEM, STATES.PLAN, STATES.ANALYTICS],
  [STATES.FOCUS]: [STATES.BROWSE, STATES.ZEN, STATES.TIMELINE, STATES.ECOSYSTEM, STATES.PLAN, STATES.ANALYTICS],
  [STATES.ZEN]: [STATES.BROWSE, STATES.FOCUS, STATES.TIMELINE, STATES.ECOSYSTEM, STATES.PLAN, STATES.ANALYTICS],
  [STATES.TIMELINE]: [STATES.BROWSE, STATES.FOCUS, STATES.ZEN, STATES.ECOSYSTEM, STATES.PLAN, STATES.ANALYTICS],
  [STATES.ECOSYSTEM]: [STATES.BROWSE, STATES.DETAIL, STATES.FOCUS, STATES.PLAN, STATES.ANALYTICS],
  [STATES.PLAN]: [STATES.BROWSE, STATES.FOCUS, STATES.DETAIL, STATES.ANALYTICS],
  [STATES.ANALYTICS]: [STATES.BROWSE, STATES.DETAIL, STATES.FOCUS]
};

interface StateMachineOptions {
  initial?: StateType;
}

interface StateData {
  [key: string]: any;
}

interface TransitionEventData {
  from: StateType | null;
  to: StateType;
  data: StateData;
}

interface ExitEventData {
  from: StateType;
  to: StateType;
  data: StateData;
}

type EventHandler = (data: any) => void;

/**
 * Create a new state machine for the dashboard
 */
export function createStateMachine(options: StateMachineOptions = {}) {
  let currentState: StateType = options.initial || STATES.BROWSE;
  let previousState: StateType | null = null;
  const listeners = new Map<string, EventHandler[]>();
  const stateData = new Map<StateType, StateData>();

  // Event emitter helpers
  function emit(event: string, data: any) {
    const handlers = listeners.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  function on(event: string, handler: EventHandler) {
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }
    listeners.get(event)!.push(handler);
    // Return unsubscribe function
    return () => {
      const handlers = listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  /**
   * Transition to a new state
   */
  function transition(newState: StateType, data: StateData = {}): boolean {
    // Validate state exists
    if (!Object.values(STATES).includes(newState)) {
      console.error(`Invalid state: ${newState}`);
      return false;
    }

    // Check if transition is allowed
    const allowedTransitions = TRANSITIONS[currentState] || [];
    if (!allowedTransitions.includes(newState) && currentState !== newState) {
      console.error(`Transition from ${currentState} to ${newState} not allowed`);
      return false;
    }

    // Same state - no-op but still emit for refresh
    if (currentState === newState) {
      emit('refresh', { state: currentState, data });
      return true;
    }

    // Store previous state
    previousState = currentState;

    // Emit exit event for current state
    emit('exit', {
      from: currentState,
      to: newState,
      data: stateData.get(currentState)
    } as ExitEventData);
    emit(`exit:${currentState}`, {
      to: newState,
      data: stateData.get(currentState)
    });

    // Update state
    currentState = newState;
    stateData.set(newState, data);

    // Emit enter event for new state
    emit('enter', {
      from: previousState,
      to: newState,
      data
    } as TransitionEventData);
    emit(`enter:${newState}`, {
      from: previousState,
      data
    });

    // Emit general transition event
    emit('transition', {
      from: previousState,
      to: newState,
      data
    } as TransitionEventData);

    return true;
  }

  /**
   * Go back to previous state
   */
  function back(): boolean {
    if (previousState) {
      return transition(previousState);
    }
    // Default to browse if no previous
    return transition(STATES.BROWSE);
  }

  /**
   * Get current state
   */
  function getState(): StateType {
    return currentState;
  }

  /**
   * Get previous state
   */
  function getPreviousState(): StateType | null {
    return previousState;
  }

  /**
   * Check if currently in a specific state
   */
  function is(state: StateType): boolean {
    return currentState === state;
  }

  /**
   * Check if a transition to target state is allowed
   */
  function canTransition(targetState: StateType): boolean {
    const allowed = TRANSITIONS[currentState] || [];
    return allowed.includes(targetState);
  }

  /**
   * Get data stored for a state
   */
  function getData(state: StateType = currentState): StateData {
    return stateData.get(state) || {};
  }

  /**
   * Set data for current state
   */
  function setData(data: StateData): void {
    stateData.set(currentState, { ...stateData.get(currentState), ...data });
  }

  /**
   * Clean up all listeners
   */
  function destroy(): void {
    listeners.clear();
    stateData.clear();
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
  };
}

export default createStateMachine;
