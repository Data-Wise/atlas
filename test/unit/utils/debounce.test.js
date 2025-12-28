/**
 * Tests for debounce utility
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { debounce, throttle } from '../../../src/utils/debounce.js'

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('basic functionality', () => {
    it('should delay function execution', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced()
      expect(func).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should only call once for rapid calls', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced()
      debounced()
      debounced()

      jest.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should reset timer on each call', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced()
      jest.advanceTimersByTime(50)
      debounced()
      jest.advanceTimersByTime(50)
      expect(func).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to the function', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced('arg1', 'arg2')
      jest.advanceTimersByTime(100)

      expect(func).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should use last arguments when called multiple times', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced('first')
      debounced('second')
      debounced('third')

      jest.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledWith('third')
    })
  })

  describe('immediate option', () => {
    it('should execute immediately on first call when immediate=true', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100, true)

      debounced()
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should not execute again during wait period', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100, true)

      debounced()
      debounced()
      debounced()

      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should allow execution again after wait period', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100, true)

      debounced()
      expect(func).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(100)

      debounced()
      expect(func).toHaveBeenCalledTimes(2)
    })
  })

  describe('cancel method', () => {
    it('should cancel pending execution', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced()
      debounced.cancel()

      jest.advanceTimersByTime(100)
      expect(func).not.toHaveBeenCalled()
    })

    it('should allow new calls after cancel', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced()
      debounced.cancel()
      debounced()

      jest.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })
  })

  describe('flush method', () => {
    it('should execute immediately when flushed', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced('flushed')
      debounced.flush()

      expect(func).toHaveBeenCalledTimes(1)
      expect(func).toHaveBeenCalledWith('flushed')
    })

    it('should not execute twice after flush', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced()
      debounced.flush()

      jest.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should not execute when nothing pending', () => {
      const func = jest.fn()
      const debounced = debounce(func, 100)

      debounced.flush()
      expect(func).not.toHaveBeenCalled()
    })
  })
})

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should execute immediately on first call', () => {
    const func = jest.fn()
    const throttled = throttle(func, 100)

    throttled()
    expect(func).toHaveBeenCalledTimes(1)
  })

  it('should throttle subsequent calls', () => {
    const func = jest.fn()
    const throttled = throttle(func, 100)

    throttled()
    throttled()
    throttled()

    expect(func).toHaveBeenCalledTimes(1)
  })

  it('should execute pending call after wait period', () => {
    const func = jest.fn()
    const throttled = throttle(func, 100)

    throttled('first')
    throttled('second')

    jest.advanceTimersByTime(100)
    expect(func).toHaveBeenCalledTimes(2)
    expect(func).toHaveBeenLastCalledWith('second')
  })

  it('should allow calls after wait period', () => {
    const func = jest.fn()
    const throttled = throttle(func, 100)

    throttled()
    jest.advanceTimersByTime(100)
    throttled()

    expect(func).toHaveBeenCalledTimes(2)
  })

  describe('cancel method', () => {
    it('should cancel pending execution', () => {
      const func = jest.fn()
      const throttled = throttle(func, 100)

      throttled()
      throttled() // This would be pending
      throttled.cancel()

      jest.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1) // Only first immediate call
    })
  })
})
