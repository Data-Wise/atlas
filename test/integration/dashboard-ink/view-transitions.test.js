/**
 * View Transitions Test (v0.14 3-view consolidation)
 *
 * Tests the state machine and view routing logic for the Ink dashboard.
 * Validates the 3 consolidated states (NOW / TIMER / PLAN) and their
 * transitions, per SPEC-tui-consolidation-2026-07-19.md's acceptance
 * criterion: "state machine has exactly 3 states."
 */

import { createStateMachine, STATES } from '../../../src/cli/dashboard-ink/lib/stateMachine.js';

describe('Dashboard View Transitions', () => {
  describe('exactly 3 states', () => {
    it('STATES has exactly 3 entries', () => {
      expect(Object.keys(STATES)).toHaveLength(3);
      expect(Object.values(STATES).sort()).toEqual(['now', 'plan', 'timer']);
    });
  });

  describe('State Machine', () => {
    it('should initialize with NOW state', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      expect(stateMachine.getState()).toBe(STATES.NOW);
    });

    it('should allow transition from NOW to TIMER', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      const success = stateMachine.transition(STATES.TIMER);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.TIMER);
    });

    it('should allow transition from NOW to PLAN', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      const success = stateMachine.transition(STATES.PLAN);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.PLAN);
    });

    it('should allow transition from TIMER back to NOW', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      stateMachine.transition(STATES.TIMER);
      const success = stateMachine.transition(STATES.NOW);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.NOW);
    });

    it('should allow transition from TIMER to PLAN', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      stateMachine.transition(STATES.TIMER);
      const success = stateMachine.transition(STATES.PLAN);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.PLAN);
    });

    it('should allow transition from PLAN to TIMER', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      stateMachine.transition(STATES.PLAN);
      const success = stateMachine.transition(STATES.TIMER);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.TIMER);
    });

    it('should track previous state', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      stateMachine.transition(STATES.TIMER);
      expect(stateMachine.getPreviousState()).toBe(STATES.NOW);
    });

    it('should support back() navigation', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      stateMachine.transition(STATES.TIMER);
      stateMachine.back();
      expect(stateMachine.getState()).toBe(STATES.NOW);
    });

    it('should emit transition events', (done) => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });

      stateMachine.on('transition', (data) => {
        expect(data.from).toBe(STATES.NOW);
        expect(data.to).toBe(STATES.TIMER);
        done();
      });

      stateMachine.transition(STATES.TIMER);
    });

    it('should emit enter events', (done) => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });

      stateMachine.on('enter:timer', (data) => {
        expect(data.from).toBe(STATES.NOW);
        done();
      });

      stateMachine.transition(STATES.TIMER);
    });

    it('should emit exit events', (done) => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });

      stateMachine.on('exit:now', (data) => {
        expect(data.to).toBe(STATES.TIMER);
        done();
      });

      stateMachine.transition(STATES.TIMER);
    });

    it('should check if transition is allowed', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      expect(stateMachine.canTransition(STATES.TIMER)).toBe(true);
      expect(stateMachine.canTransition(STATES.PLAN)).toBe(true);
    });

    it('should validate current state with is()', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });
      expect(stateMachine.is(STATES.NOW)).toBe(true);
      expect(stateMachine.is(STATES.TIMER)).toBe(false);

      stateMachine.transition(STATES.TIMER);
      expect(stateMachine.is(STATES.TIMER)).toBe(true);
      expect(stateMachine.is(STATES.NOW)).toBe(false);
    });

    it('should store and retrieve state data', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });

      stateMachine.transition(STATES.TIMER, { project: 'atlas' });
      const data = stateMachine.getData(STATES.TIMER);

      expect(data.project).toBe('atlas');
    });

    it('should update state data', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });

      stateMachine.transition(STATES.TIMER, { project: 'atlas' });
      stateMachine.setData({ focus: 'TUI migration' });

      const data = stateMachine.getData();
      expect(data.project).toBe('atlas');
      expect(data.focus).toBe('TUI migration');
    });
  });

  describe('View Transitions Flow', () => {
    it('should support full navigation cycle: NOW -> TIMER -> NOW', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });

      stateMachine.transition(STATES.TIMER);
      expect(stateMachine.getState()).toBe(STATES.TIMER);

      stateMachine.transition(STATES.NOW);
      expect(stateMachine.getState()).toBe(STATES.NOW);
    });

    it('should support NOW -> PLAN -> TIMER', () => {
      const stateMachine = createStateMachine({ initial: STATES.NOW });

      stateMachine.transition(STATES.PLAN);
      expect(stateMachine.getState()).toBe(STATES.PLAN);

      // Plan can start a focus session (Timer view)
      stateMachine.transition(STATES.TIMER);
      expect(stateMachine.getState()).toBe(STATES.TIMER);
    });
  });

  describe('All 3 states reachable and returnable', () => {
    it('should be able to reach TIMER and PLAN from NOW', () => {
      const allStates = [STATES.TIMER, STATES.PLAN];

      allStates.forEach((state) => {
        const sm = createStateMachine({ initial: STATES.NOW });
        const success = sm.transition(state);
        expect(success).toBe(true);
        expect(sm.getState()).toBe(state);
      });
    });

    it('should be able to return to NOW from any state', () => {
      const states = [STATES.TIMER, STATES.PLAN];

      states.forEach((startState) => {
        const stateMachine = createStateMachine({ initial: STATES.NOW });
        stateMachine.transition(startState);

        const success = stateMachine.transition(STATES.NOW);
        expect(success).toBe(true);
        expect(stateMachine.getState()).toBe(STATES.NOW);
      });
    });
  });
});
