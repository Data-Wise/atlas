/**
 * Dashboard State Machine
 *
 * Manages view states and transitions for the ADHD-friendly dashboard.
 * Provides explicit state management with enter/exit hooks and event emission.
 *
 * v0.14 consolidation: 8 states -> 3 (SPEC-tui-consolidation-2026-07-19.md).
 *   NOW   absorbs Main + Detail + Inspector + Ecosystem
 *   TIMER absorbs Focus + Zen + Inspector timer
 *   PLAN  absorbs Plan + Analytics
 */

// Valid dashboard states
export const STATES = {
  NOW: 'now',      // Project list + selected project detail (+ ecosystem toggle)
  TIMER: 'timer',  // Pomodoro timer (+ zen density toggle)
  PLAN: 'plan'     // Morning ritual (+ analytics toggle)
} as const;

export type StateType = typeof STATES[keyof typeof STATES];

// All 3 states can freely transition to one another.
const TRANSITIONS: Record<StateType, StateType[]> = {
  [STATES.NOW]: [STATES.TIMER, STATES.PLAN],
  [STATES.TIMER]: [STATES.NOW, STATES.PLAN],
  [STATES.PLAN]: [STATES.NOW, STATES.TIMER]
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
  let currentState: StateType = options.initial || STATES.NOW;
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
    // Default to NOW if no previous
    return transition(STATES.NOW);
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
