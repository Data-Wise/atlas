/**
 * View Transitions Test
 *
 * Tests the state machine and view routing logic for the Ink dashboard.
 * Validates that all views can be accessed and state transitions work correctly.
 */

import { createStateMachine, STATES } from '../../../src/cli/dashboard-ink/lib/stateMachine.js';

describe('Dashboard View Transitions', () => {
  describe('State Machine', () => {
    it('should initialize with BROWSE state', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      expect(stateMachine.getState()).toBe(STATES.BROWSE);
    });

    it('should allow transition from BROWSE to DETAIL', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      const success = stateMachine.transition(STATES.DETAIL);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.DETAIL);
    });

    it('should allow transition from BROWSE to FOCUS', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      const success = stateMachine.transition(STATES.FOCUS);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.FOCUS);
    });

    it('should allow transition from BROWSE to ZEN', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      const success = stateMachine.transition(STATES.ZEN);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.ZEN);
    });

    it('should allow transition from BROWSE to TIMELINE', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      const success = stateMachine.transition(STATES.TIMELINE);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.TIMELINE);
    });

    it('should allow transition from BROWSE to ECOSYSTEM', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      const success = stateMachine.transition(STATES.ECOSYSTEM);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.ECOSYSTEM);
    });

    it('should allow transition from BROWSE to PLAN', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      const success = stateMachine.transition(STATES.PLAN);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.PLAN);
    });

    it('should allow transition from DETAIL back to BROWSE', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      stateMachine.transition(STATES.DETAIL);
      const success = stateMachine.transition(STATES.BROWSE);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.BROWSE);
    });

    it('should allow transition from FOCUS to ZEN', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      stateMachine.transition(STATES.FOCUS);
      const success = stateMachine.transition(STATES.ZEN);
      expect(success).toBe(true);
      expect(stateMachine.getState()).toBe(STATES.ZEN);
    });

    it('should track previous state', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      stateMachine.transition(STATES.DETAIL);
      expect(stateMachine.getPreviousState()).toBe(STATES.BROWSE);
    });

    it('should support back() navigation', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      stateMachine.transition(STATES.DETAIL);
      stateMachine.back();
      expect(stateMachine.getState()).toBe(STATES.BROWSE);
    });

    it('should emit transition events', (done) => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.on('transition', (data) => {
        expect(data.from).toBe(STATES.BROWSE);
        expect(data.to).toBe(STATES.FOCUS);
        done();
      });

      stateMachine.transition(STATES.FOCUS);
    });

    it('should emit enter events', (done) => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.on('enter:focus', (data) => {
        expect(data.from).toBe(STATES.BROWSE);
        done();
      });

      stateMachine.transition(STATES.FOCUS);
    });

    it('should emit exit events', (done) => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.on('exit:browse', (data) => {
        expect(data.to).toBe(STATES.FOCUS);
        done();
      });

      stateMachine.transition(STATES.FOCUS);
    });

    it('should check if transition is allowed', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      expect(stateMachine.canTransition(STATES.DETAIL)).toBe(true);
      expect(stateMachine.canTransition(STATES.FOCUS)).toBe(true);
      expect(stateMachine.canTransition(STATES.ZEN)).toBe(true);
    });

    it('should validate current state with is()', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      expect(stateMachine.is(STATES.BROWSE)).toBe(true);
      expect(stateMachine.is(STATES.DETAIL)).toBe(false);

      stateMachine.transition(STATES.DETAIL);
      expect(stateMachine.is(STATES.DETAIL)).toBe(true);
      expect(stateMachine.is(STATES.BROWSE)).toBe(false);
    });

    it('should store and retrieve state data', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.transition(STATES.DETAIL, { project: 'atlas' });
      const data = stateMachine.getData(STATES.DETAIL);

      expect(data.project).toBe('atlas');
    });

    it('should update state data', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.transition(STATES.DETAIL, { project: 'atlas' });
      stateMachine.setData({ focus: 'TUI migration' });

      const data = stateMachine.getData();
      expect(data.project).toBe('atlas');
      expect(data.focus).toBe('TUI migration');
    });
  });

  describe('View Transitions Flow', () => {
    it('should support full navigation cycle: BROWSE -> DETAIL -> BROWSE', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      // Browse to Detail
      stateMachine.transition(STATES.DETAIL);
      expect(stateMachine.getState()).toBe(STATES.DETAIL);

      // Detail back to Browse
      stateMachine.transition(STATES.BROWSE);
      expect(stateMachine.getState()).toBe(STATES.BROWSE);
    });

    it('should support BROWSE -> FOCUS -> ZEN -> BROWSE', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.transition(STATES.FOCUS);
      expect(stateMachine.getState()).toBe(STATES.FOCUS);

      stateMachine.transition(STATES.ZEN);
      expect(stateMachine.getState()).toBe(STATES.ZEN);

      stateMachine.transition(STATES.BROWSE);
      expect(stateMachine.getState()).toBe(STATES.BROWSE);
    });

    it('should support BROWSE -> TIMELINE -> FOCUS', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.transition(STATES.TIMELINE);
      expect(stateMachine.getState()).toBe(STATES.TIMELINE);

      // Timeline can transition to Focus
      stateMachine.transition(STATES.FOCUS);
      expect(stateMachine.getState()).toBe(STATES.FOCUS);
    });

    it('should support BROWSE -> ECOSYSTEM -> DETAIL', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.transition(STATES.ECOSYSTEM);
      expect(stateMachine.getState()).toBe(STATES.ECOSYSTEM);

      // Ecosystem can show project details
      stateMachine.transition(STATES.DETAIL);
      expect(stateMachine.getState()).toBe(STATES.DETAIL);
    });

    it('should support BROWSE -> PLAN -> FOCUS', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });

      stateMachine.transition(STATES.PLAN);
      expect(stateMachine.getState()).toBe(STATES.PLAN);

      // Plan can start a focus session
      stateMachine.transition(STATES.FOCUS);
      expect(stateMachine.getState()).toBe(STATES.FOCUS);
    });
  });

  describe('All States Reachability', () => {
    it('should be able to reach all 7 states from BROWSE', () => {
      const stateMachine = createStateMachine({ initial: STATES.BROWSE });
      const allStates = [
        STATES.BROWSE,
        STATES.DETAIL,
        STATES.FOCUS,
        STATES.ZEN,
        STATES.TIMELINE,
        STATES.ECOSYSTEM,
        STATES.PLAN,
      ];

      allStates.forEach((state) => {
        const sm = createStateMachine({ initial: STATES.BROWSE });
        if (state !== STATES.BROWSE) {
          const success = sm.transition(state);
          expect(success).toBe(true);
          expect(sm.getState()).toBe(state);
        }
      });
    });

    it('should be able to return to BROWSE from any state', () => {
      const states = [
        STATES.DETAIL,
        STATES.FOCUS,
        STATES.ZEN,
        STATES.TIMELINE,
        STATES.ECOSYSTEM,
        STATES.PLAN,
      ];

      states.forEach((startState) => {
        const stateMachine = createStateMachine({ initial: STATES.BROWSE });
        stateMachine.transition(startState);

        const success = stateMachine.transition(STATES.BROWSE);
        expect(success).toBe(true);
        expect(stateMachine.getState()).toBe(STATES.BROWSE);
      });
    });
  });
});
