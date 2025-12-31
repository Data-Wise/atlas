/**
 * StateMachine Tests
 *
 * Tests for the dashboard state machine that manages view transitions.
 */

import { jest } from '@jest/globals'
import { createStateMachine, STATES } from '../../../../src/cli/dashboard/stateMachine.js'

describe('StateMachine', () => {
  let sm

  beforeEach(() => {
    sm = createStateMachine()
  })

  afterEach(() => {
    sm.destroy()
  })

  describe('Initialization', () => {
    test('starts in BROWSE state by default', () => {
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    test('can start in a custom initial state', () => {
      const customSm = createStateMachine({ initial: STATES.FOCUS })
      expect(customSm.getState()).toBe(STATES.FOCUS)
      customSm.destroy()
    })

    test('has no previous state initially', () => {
      expect(sm.getPreviousState()).toBeNull()
    })

    test('exports all valid states', () => {
      expect(STATES.BROWSE).toBe('browse')
      expect(STATES.DETAIL).toBe('detail')
      expect(STATES.FOCUS).toBe('focus')
      expect(STATES.ZEN).toBe('zen')
      expect(STATES.TIMELINE).toBe('timeline')
    })
  })

  describe('State Queries', () => {
    test('is() returns true for current state', () => {
      expect(sm.is(STATES.BROWSE)).toBe(true)
      expect(sm.is(STATES.DETAIL)).toBe(false)
    })

    test('getState() returns current state', () => {
      expect(sm.getState()).toBe(STATES.BROWSE)
      sm.transition(STATES.DETAIL)
      expect(sm.getState()).toBe(STATES.DETAIL)
    })

    test('getPreviousState() returns previous state after transition', () => {
      sm.transition(STATES.DETAIL)
      expect(sm.getPreviousState()).toBe(STATES.BROWSE)
    })
  })

  describe('Valid Transitions', () => {
    test('BROWSE can transition to DETAIL, FOCUS, ZEN, TIMELINE', () => {
      expect(sm.canTransition(STATES.DETAIL)).toBe(true)
      expect(sm.canTransition(STATES.FOCUS)).toBe(true)
      expect(sm.canTransition(STATES.ZEN)).toBe(true)
      expect(sm.canTransition(STATES.TIMELINE)).toBe(true)
    })

    test('DETAIL can transition to BROWSE, FOCUS, ZEN, TIMELINE', () => {
      sm.transition(STATES.DETAIL)
      expect(sm.canTransition(STATES.BROWSE)).toBe(true)
      expect(sm.canTransition(STATES.FOCUS)).toBe(true)
      expect(sm.canTransition(STATES.ZEN)).toBe(true)
      expect(sm.canTransition(STATES.TIMELINE)).toBe(true)
    })

    test('FOCUS can transition to BROWSE, ZEN, TIMELINE', () => {
      sm.transition(STATES.FOCUS)
      expect(sm.canTransition(STATES.BROWSE)).toBe(true)
      expect(sm.canTransition(STATES.ZEN)).toBe(true)
      expect(sm.canTransition(STATES.TIMELINE)).toBe(true)
      expect(sm.canTransition(STATES.DETAIL)).toBe(false)
    })

    test('ZEN can transition to BROWSE, FOCUS, TIMELINE', () => {
      sm.transition(STATES.ZEN)
      expect(sm.canTransition(STATES.BROWSE)).toBe(true)
      expect(sm.canTransition(STATES.FOCUS)).toBe(true)
      expect(sm.canTransition(STATES.TIMELINE)).toBe(true)
      expect(sm.canTransition(STATES.DETAIL)).toBe(false)
    })

    test('TIMELINE can transition to BROWSE, FOCUS, ZEN', () => {
      sm.transition(STATES.TIMELINE)
      expect(sm.canTransition(STATES.BROWSE)).toBe(true)
      expect(sm.canTransition(STATES.FOCUS)).toBe(true)
      expect(sm.canTransition(STATES.ZEN)).toBe(true)
      expect(sm.canTransition(STATES.DETAIL)).toBe(false)
    })
  })

  describe('transition()', () => {
    test('transitions to valid state and returns true', () => {
      const result = sm.transition(STATES.DETAIL)
      expect(result).toBe(true)
      expect(sm.getState()).toBe(STATES.DETAIL)
    })

    test('rejects invalid state and returns false', () => {
      const result = sm.transition('invalid')
      expect(result).toBe(false)
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    test('rejects disallowed transition and returns false', () => {
      sm.transition(STATES.FOCUS)
      const result = sm.transition(STATES.DETAIL) // FOCUS -> DETAIL not allowed
      expect(result).toBe(false)
      expect(sm.getState()).toBe(STATES.FOCUS)
    })

    test('same state transition emits refresh and returns true', () => {
      const refreshHandler = jest.fn()
      sm.on('refresh', refreshHandler)

      const result = sm.transition(STATES.BROWSE)
      expect(result).toBe(true)
      expect(refreshHandler).toHaveBeenCalledWith({
        state: STATES.BROWSE,
        data: {}
      })
    })

    test('passes data with transition', () => {
      const project = { name: 'test-project' }
      sm.transition(STATES.DETAIL, { project })
      expect(sm.getData()).toEqual({ project })
    })
  })

  describe('back()', () => {
    test('returns to previous state', () => {
      sm.transition(STATES.DETAIL)
      sm.back()
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    test('returns to BROWSE if no previous state', () => {
      const freshSm = createStateMachine({ initial: STATES.FOCUS })
      freshSm.back()
      expect(freshSm.getState()).toBe(STATES.BROWSE)
      freshSm.destroy()
    })

    test('returns true on successful back', () => {
      sm.transition(STATES.DETAIL)
      const result = sm.back()
      expect(result).toBe(true)
    })
  })

  describe('State Data', () => {
    test('getData() returns empty object by default', () => {
      expect(sm.getData()).toEqual({})
    })

    test('getData() returns data set during transition', () => {
      const data = { project: { name: 'test' } }
      sm.transition(STATES.DETAIL, data)
      expect(sm.getData()).toEqual(data)
    })

    test('setData() merges with existing data', () => {
      sm.transition(STATES.DETAIL, { project: { name: 'test' } })
      sm.setData({ selected: true })
      expect(sm.getData()).toEqual({
        project: { name: 'test' },
        selected: true
      })
    })

    test('getData() can retrieve data for specific state', () => {
      sm.transition(STATES.DETAIL, { foo: 'bar' })
      sm.transition(STATES.FOCUS, { baz: 'qux' })
      expect(sm.getData(STATES.DETAIL)).toEqual({ foo: 'bar' })
      expect(sm.getData(STATES.FOCUS)).toEqual({ baz: 'qux' })
    })
  })

  describe('Events', () => {
    test('emits enter event on transition', () => {
      const handler = jest.fn()
      sm.on('enter', handler)

      sm.transition(STATES.DETAIL, { project: 'test' })

      expect(handler).toHaveBeenCalledWith({
        from: STATES.BROWSE,
        to: STATES.DETAIL,
        data: { project: 'test' }
      })
    })

    test('emits exit event on transition', () => {
      const handler = jest.fn()
      sm.on('exit', handler)

      sm.transition(STATES.DETAIL)

      expect(handler).toHaveBeenCalledWith({
        from: STATES.BROWSE,
        to: STATES.DETAIL,
        data: undefined
      })
    })

    test('emits specific enter:state event', () => {
      const handler = jest.fn()
      sm.on('enter:detail', handler)

      sm.transition(STATES.DETAIL)

      expect(handler).toHaveBeenCalledWith({
        from: STATES.BROWSE,
        data: {}
      })
    })

    test('emits specific exit:state event', () => {
      const handler = jest.fn()
      sm.on('exit:browse', handler)

      sm.transition(STATES.DETAIL)

      expect(handler).toHaveBeenCalledWith({
        to: STATES.DETAIL,
        data: undefined
      })
    })

    test('emits transition event', () => {
      const handler = jest.fn()
      sm.on('transition', handler)

      sm.transition(STATES.DETAIL)

      expect(handler).toHaveBeenCalledWith({
        from: STATES.BROWSE,
        to: STATES.DETAIL,
        data: {}
      })
    })

    test('on() returns unsubscribe function', () => {
      const handler = jest.fn()
      const unsubscribe = sm.on('enter', handler)

      sm.transition(STATES.DETAIL)
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()
      sm.transition(STATES.FOCUS)
      expect(handler).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })

  describe('destroy()', () => {
    test('clears all listeners', () => {
      const handler = jest.fn()
      sm.on('enter', handler)

      sm.destroy()
      sm.transition(STATES.DETAIL)

      expect(handler).not.toHaveBeenCalled()
    })

    test('clears all state data', () => {
      sm.transition(STATES.DETAIL, { foo: 'bar' })
      sm.destroy()
      expect(sm.getData(STATES.DETAIL)).toEqual({})
    })
  })

  describe('Complex Transition Scenarios', () => {
    test('BROWSE -> DETAIL -> FOCUS -> ZEN -> BROWSE', () => {
      expect(sm.transition(STATES.DETAIL)).toBe(true)
      expect(sm.transition(STATES.FOCUS)).toBe(true)
      expect(sm.transition(STATES.ZEN)).toBe(true)
      expect(sm.transition(STATES.BROWSE)).toBe(true)
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    test('tracks state history correctly', () => {
      sm.transition(STATES.DETAIL)
      sm.transition(STATES.FOCUS)
      sm.transition(STATES.ZEN)

      expect(sm.getState()).toBe(STATES.ZEN)
      expect(sm.getPreviousState()).toBe(STATES.FOCUS)
    })

    test('back() after multiple transitions respects allowed transitions', () => {
      sm.transition(STATES.DETAIL)
      sm.transition(STATES.FOCUS)
      // FOCUS -> DETAIL is not allowed, so back() fails
      const result = sm.back()

      // back() tries to go to DETAIL but that's not allowed from FOCUS
      // So it stays in FOCUS
      expect(result).toBe(false)
      expect(sm.getState()).toBe(STATES.FOCUS)
    })

    test('back() works when transition is allowed', () => {
      sm.transition(STATES.FOCUS)
      sm.transition(STATES.ZEN)
      // ZEN -> FOCUS is allowed
      const result = sm.back()

      expect(result).toBe(true)
      expect(sm.getState()).toBe(STATES.FOCUS)
    })
  })
})
