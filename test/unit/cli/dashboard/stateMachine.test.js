/**
 * Tests for Dashboard State Machine
 *
 * Tests state transitions, event emission, and data management.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { createStateMachine, STATES } from '../../../../src/cli/dashboard/stateMachine.js'

describe('Dashboard State Machine', () => {
  describe('STATES constant', () => {
    it('should define all view states', () => {
      expect(STATES.BROWSE).toBe('browse')
      expect(STATES.DETAIL).toBe('detail')
      expect(STATES.FOCUS).toBe('focus')
      expect(STATES.ZEN).toBe('zen')
      expect(STATES.TIMELINE).toBe('timeline')
    })

    it('should have exactly 5 states', () => {
      expect(Object.keys(STATES)).toHaveLength(5)
    })
  })

  describe('createStateMachine()', () => {
    it('should create a state machine with default initial state', () => {
      const sm = createStateMachine()
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    it('should accept custom initial state', () => {
      const sm = createStateMachine({ initial: STATES.FOCUS })
      expect(sm.getState()).toBe(STATES.FOCUS)
    })

    it('should return an object with all expected methods', () => {
      const sm = createStateMachine()
      expect(typeof sm.getState).toBe('function')
      expect(typeof sm.getPreviousState).toBe('function')
      expect(typeof sm.is).toBe('function')
      expect(typeof sm.canTransition).toBe('function')
      expect(typeof sm.getData).toBe('function')
      expect(typeof sm.setData).toBe('function')
      expect(typeof sm.transition).toBe('function')
      expect(typeof sm.back).toBe('function')
      expect(typeof sm.on).toBe('function')
      expect(typeof sm.destroy).toBe('function')
      expect(sm.STATES).toBe(STATES)
    })

    it('should have null previous state initially', () => {
      const sm = createStateMachine()
      expect(sm.getPreviousState()).toBeNull()
    })
  })

  describe('is()', () => {
    it('should return true for current state', () => {
      const sm = createStateMachine()
      expect(sm.is(STATES.BROWSE)).toBe(true)
    })

    it('should return false for other states', () => {
      const sm = createStateMachine()
      expect(sm.is(STATES.DETAIL)).toBe(false)
      expect(sm.is(STATES.FOCUS)).toBe(false)
    })
  })

  describe('transition()', () => {
    let sm

    beforeEach(() => {
      sm = createStateMachine()
    })

    it('should allow valid transitions from BROWSE', () => {
      expect(sm.transition(STATES.DETAIL)).toBe(true)
      expect(sm.getState()).toBe(STATES.DETAIL)
    })

    it('should allow BROWSE -> FOCUS', () => {
      expect(sm.transition(STATES.FOCUS)).toBe(true)
      expect(sm.getState()).toBe(STATES.FOCUS)
    })

    it('should allow BROWSE -> ZEN', () => {
      expect(sm.transition(STATES.ZEN)).toBe(true)
      expect(sm.getState()).toBe(STATES.ZEN)
    })

    it('should allow BROWSE -> TIMELINE', () => {
      expect(sm.transition(STATES.TIMELINE)).toBe(true)
      expect(sm.getState()).toBe(STATES.TIMELINE)
    })

    it('should update previous state on transition', () => {
      sm.transition(STATES.DETAIL)
      expect(sm.getPreviousState()).toBe(STATES.BROWSE)
    })

    it('should reject invalid state names', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(sm.transition('invalid')).toBe(false)
      expect(sm.getState()).toBe(STATES.BROWSE)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid state: invalid')

      consoleSpy.mockRestore()
    })

    it('should handle same-state transition as refresh', () => {
      const refreshHandler = jest.fn()
      sm.on('refresh', refreshHandler)

      expect(sm.transition(STATES.BROWSE)).toBe(true)
      expect(refreshHandler).toHaveBeenCalledWith({
        state: STATES.BROWSE,
        data: {}
      })
    })

    it('should pass data with transition', () => {
      const data = { projectId: '123' }
      sm.transition(STATES.DETAIL, data)
      expect(sm.getData()).toEqual(data)
    })
  })

  describe('transition validation', () => {
    it('should not allow FOCUS -> DETAIL (must go through BROWSE)', () => {
      const sm = createStateMachine({ initial: STATES.FOCUS })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(sm.transition(STATES.DETAIL)).toBe(false)
      expect(sm.getState()).toBe(STATES.FOCUS)

      consoleSpy.mockRestore()
    })

    it('should allow FOCUS -> BROWSE', () => {
      const sm = createStateMachine({ initial: STATES.FOCUS })
      expect(sm.transition(STATES.BROWSE)).toBe(true)
    })

    it('should allow DETAIL -> BROWSE', () => {
      const sm = createStateMachine({ initial: STATES.DETAIL })
      expect(sm.transition(STATES.BROWSE)).toBe(true)
    })

    it('should allow DETAIL -> FOCUS', () => {
      const sm = createStateMachine({ initial: STATES.DETAIL })
      expect(sm.transition(STATES.FOCUS)).toBe(true)
    })

    it('should allow ZEN -> FOCUS', () => {
      const sm = createStateMachine({ initial: STATES.ZEN })
      expect(sm.transition(STATES.FOCUS)).toBe(true)
    })

    it('should allow TIMELINE -> BROWSE', () => {
      const sm = createStateMachine({ initial: STATES.TIMELINE })
      expect(sm.transition(STATES.BROWSE)).toBe(true)
    })
  })

  describe('canTransition()', () => {
    it('should return true for allowed transitions', () => {
      const sm = createStateMachine()
      expect(sm.canTransition(STATES.DETAIL)).toBe(true)
      expect(sm.canTransition(STATES.FOCUS)).toBe(true)
      expect(sm.canTransition(STATES.ZEN)).toBe(true)
      expect(sm.canTransition(STATES.TIMELINE)).toBe(true)
    })

    it('should return false for disallowed transitions', () => {
      const sm = createStateMachine({ initial: STATES.FOCUS })
      expect(sm.canTransition(STATES.DETAIL)).toBe(false)
    })
  })

  describe('back()', () => {
    it('should return to previous state when transition is allowed', () => {
      const sm = createStateMachine()
      sm.transition(STATES.DETAIL)  // BROWSE -> DETAIL, prev = BROWSE

      sm.back()  // DETAIL -> BROWSE is allowed
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    it('should fail when back transition is not allowed', () => {
      const sm = createStateMachine()
      sm.transition(STATES.DETAIL)   // BROWSE -> DETAIL, prev = BROWSE
      sm.transition(STATES.FOCUS)    // DETAIL -> FOCUS, prev = DETAIL

      // FOCUS -> DETAIL is NOT allowed (FOCUS can only go to BROWSE, ZEN, TIMELINE)
      const result = sm.back()
      expect(result).toBe(false)
      expect(sm.getState()).toBe(STATES.FOCUS)  // State unchanged
    })

    it('should default to BROWSE if no previous state', () => {
      const sm = createStateMachine({ initial: STATES.FOCUS })
      sm.back()
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    it('should return true on successful back', () => {
      const sm = createStateMachine()
      sm.transition(STATES.DETAIL)
      expect(sm.back()).toBe(true)
    })
  })

  describe('Event emission', () => {
    let sm
    let handlers

    beforeEach(() => {
      sm = createStateMachine()
      handlers = {
        enter: jest.fn(),
        exit: jest.fn(),
        transition: jest.fn(),
        enterDetail: jest.fn(),
        exitBrowse: jest.fn()
      }
      sm.on('enter', handlers.enter)
      sm.on('exit', handlers.exit)
      sm.on('transition', handlers.transition)
      sm.on('enter:detail', handlers.enterDetail)
      sm.on('exit:browse', handlers.exitBrowse)
    })

    it('should emit exit event with correct data', () => {
      sm.transition(STATES.DETAIL)

      expect(handlers.exit).toHaveBeenCalledWith({
        from: STATES.BROWSE,
        to: STATES.DETAIL,
        data: undefined
      })
    })

    it('should emit state-specific exit event', () => {
      sm.transition(STATES.DETAIL)

      expect(handlers.exitBrowse).toHaveBeenCalledWith({
        to: STATES.DETAIL,
        data: undefined
      })
    })

    it('should emit enter event with correct data', () => {
      const data = { project: 'test' }
      sm.transition(STATES.DETAIL, data)

      expect(handlers.enter).toHaveBeenCalledWith({
        from: STATES.BROWSE,
        to: STATES.DETAIL,
        data
      })
    })

    it('should emit state-specific enter event', () => {
      const data = { project: 'test' }
      sm.transition(STATES.DETAIL, data)

      expect(handlers.enterDetail).toHaveBeenCalledWith({
        from: STATES.BROWSE,
        data
      })
    })

    it('should emit transition event', () => {
      const data = { project: 'test' }
      sm.transition(STATES.DETAIL, data)

      expect(handlers.transition).toHaveBeenCalledWith({
        from: STATES.BROWSE,
        to: STATES.DETAIL,
        data
      })
    })

    it('should not emit enter/exit/transition events for same-state transition', () => {
      sm.transition(STATES.BROWSE)

      expect(handlers.enter).not.toHaveBeenCalled()
      expect(handlers.exit).not.toHaveBeenCalled()
      expect(handlers.transition).not.toHaveBeenCalled()
    })
  })

  describe('Event unsubscription', () => {
    it('should return unsubscribe function', () => {
      const sm = createStateMachine()
      const handler = jest.fn()
      const unsubscribe = sm.on('enter', handler)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should stop receiving events after unsubscribe', () => {
      const sm = createStateMachine()
      const handler = jest.fn()
      const unsubscribe = sm.on('enter', handler)

      unsubscribe()
      sm.transition(STATES.DETAIL)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should not affect other handlers when one unsubscribes', () => {
      const sm = createStateMachine()
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      const unsubscribe1 = sm.on('enter', handler1)
      sm.on('enter', handler2)

      unsubscribe1()
      sm.transition(STATES.DETAIL)

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('Data management', () => {
    it('should store data per state', () => {
      const sm = createStateMachine()
      const data = { projectId: '123' }

      sm.transition(STATES.DETAIL, data)
      expect(sm.getData()).toEqual(data)
    })

    it('should return empty object if no data stored', () => {
      const sm = createStateMachine()
      expect(sm.getData()).toEqual({})
    })

    it('should get data for specific state', () => {
      const sm = createStateMachine()
      const detailData = { projectId: '123' }

      sm.transition(STATES.DETAIL, detailData)
      sm.transition(STATES.FOCUS, { timer: 25 })

      expect(sm.getData(STATES.DETAIL)).toEqual(detailData)
    })

    it('should merge data with setData', () => {
      const sm = createStateMachine()
      sm.transition(STATES.DETAIL, { projectId: '123' })
      sm.setData({ name: 'Test Project' })

      expect(sm.getData()).toEqual({
        projectId: '123',
        name: 'Test Project'
      })
    })
  })

  describe('destroy()', () => {
    it('should clear all listeners', () => {
      const sm = createStateMachine()
      const handler = jest.fn()
      sm.on('enter', handler)

      sm.destroy()
      sm.transition(STATES.DETAIL)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should clear all state data', () => {
      const sm = createStateMachine()
      sm.transition(STATES.DETAIL, { projectId: '123' })

      sm.destroy()

      expect(sm.getData(STATES.DETAIL)).toEqual({})
    })
  })

  describe('Integration scenarios', () => {
    it('should handle typical user flow: browse -> detail -> focus -> browse', () => {
      const sm = createStateMachine()

      expect(sm.transition(STATES.DETAIL, { projectId: '123' })).toBe(true)
      expect(sm.getState()).toBe(STATES.DETAIL)

      expect(sm.transition(STATES.FOCUS, { duration: 25 })).toBe(true)
      expect(sm.getState()).toBe(STATES.FOCUS)

      expect(sm.transition(STATES.BROWSE)).toBe(true)
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    it('should handle zen mode toggle', () => {
      const sm = createStateMachine()

      sm.transition(STATES.ZEN)
      expect(sm.getState()).toBe(STATES.ZEN)

      sm.back()
      expect(sm.getState()).toBe(STATES.BROWSE)
    })

    it('should handle timeline view', () => {
      const sm = createStateMachine()

      sm.transition(STATES.TIMELINE)
      expect(sm.getState()).toBe(STATES.TIMELINE)

      expect(sm.canTransition(STATES.FOCUS)).toBe(true)
      sm.transition(STATES.FOCUS)
      expect(sm.getState()).toBe(STATES.FOCUS)
    })
  })
})
