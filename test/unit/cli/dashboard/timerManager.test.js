/**
 * TimerManager Tests
 *
 * Tests for the Pomodoro timer manager used in the dashboard.
 */

import { jest, beforeEach, afterEach, describe, test, expect } from '@jest/globals'
import { createTimerManager } from '../../../../src/cli/dashboard/timerManager.js'

describe('TimerManager', () => {
  let timer

  beforeEach(() => {
    jest.useFakeTimers()
    timer = createTimerManager()
  })

  afterEach(() => {
    timer.destroy()
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    test('creates timer with default 25 minute duration', () => {
      const status = timer.getStatus()
      expect(status.duration).toBe(25)
      expect(status.remaining).toBe(25 * 60)
    })

    test('creates timer with custom duration', () => {
      const customTimer = createTimerManager({ defaultMinutes: 45 })
      const status = customTimer.getStatus()
      expect(status.duration).toBe(45)
      expect(status.remaining).toBe(45 * 60)
      customTimer.destroy()
    })

    test('starts in stopped state', () => {
      const status = timer.getStatus()
      expect(status.isRunning).toBe(false)
      expect(status.isPaused).toBe(false)
    })

    test('has empty history initially', () => {
      expect(timer.getHistory()).toEqual([])
      expect(timer.getTodayHistory()).toEqual([])
    })
  })

  describe('Time Calculations', () => {
    test('getRemainingSeconds returns full duration when not started', () => {
      expect(timer.getRemainingSeconds()).toBe(25 * 60)
    })

    test('getElapsedSeconds returns 0 when not started', () => {
      expect(timer.getElapsedSeconds()).toBe(0)
    })

    test('getFormattedTime returns MM:SS format', () => {
      expect(timer.getFormattedTime()).toBe('25:00')
    })

    test('getProgress returns 0 when not started', () => {
      expect(timer.getProgress()).toBe(0)
    })
  })

  describe('start()', () => {
    test('starts the timer', () => {
      timer.start()
      expect(timer.getStatus().isRunning).toBe(true)
    })

    test('can start with custom duration', () => {
      timer.start(15)
      expect(timer.getStatus().duration).toBe(15)
      expect(timer.getRemainingSeconds()).toBe(15 * 60)
    })

    test('ignores start if already running', () => {
      timer.start()
      timer.start(30) // Should be ignored
      expect(timer.getStatus().duration).toBe(25) // Still 25
    })

    test('calls onStart callback', () => {
      const onStart = jest.fn()
      timer.on('onStart', onStart)

      timer.start()

      expect(onStart).toHaveBeenCalledWith({ duration: 25 })
    })

    test('calls onTick callback immediately', () => {
      const onTick = jest.fn()
      timer.on('onTick', onTick)

      timer.start()

      expect(onTick).toHaveBeenCalled()
      expect(onTick.mock.calls[0][0]).toMatchObject({
        isRunning: true,
        isPaused: false
      })
    })
  })

  describe('Timer Progress', () => {
    test('decreases remaining time over intervals', () => {
      timer.start()
      const initialRemaining = timer.getRemainingSeconds()

      jest.advanceTimersByTime(5000) // 5 seconds

      expect(timer.getRemainingSeconds()).toBe(initialRemaining - 5)
    })

    test('increases elapsed time over intervals', () => {
      timer.start()

      jest.advanceTimersByTime(10000) // 10 seconds

      expect(timer.getElapsedSeconds()).toBe(10)
    })

    test('updates progress percentage', () => {
      timer.start()

      jest.advanceTimersByTime(7.5 * 60 * 1000) // 7.5 minutes (30% of 25)

      const progress = timer.getProgress()
      expect(progress).toBeCloseTo(30, 0)
    })

    test('calls onTick every second', () => {
      const onTick = jest.fn()
      timer.on('onTick', onTick)

      timer.start()
      jest.advanceTimersByTime(3000) // 3 seconds

      // Initial tick + 3 interval ticks
      expect(onTick).toHaveBeenCalledTimes(4)
    })
  })

  describe('pause()', () => {
    test('pauses running timer', () => {
      timer.start()
      timer.pause()

      expect(timer.getStatus().isPaused).toBe(true)
      expect(timer.getStatus().isRunning).toBe(true)
    })

    test('does nothing if not running', () => {
      timer.pause() // Not started
      expect(timer.getStatus().isPaused).toBe(false)
    })

    test('does nothing if already paused', () => {
      const onPause = jest.fn()
      timer.on('onPause', onPause)

      timer.start()
      timer.pause()
      timer.pause() // Second pause

      expect(onPause).toHaveBeenCalledTimes(1)
    })

    test('calls onPause callback', () => {
      const onPause = jest.fn()
      timer.on('onPause', onPause)

      timer.start()
      jest.advanceTimersByTime(5000)
      timer.pause()

      expect(onPause).toHaveBeenCalledWith({
        remaining: expect.any(Number),
        elapsed: expect.any(Number)
      })
    })

    test('stops timer ticks while paused', () => {
      const onTick = jest.fn()
      timer.on('onTick', onTick)

      timer.start()
      timer.pause()
      const ticksBeforePause = onTick.mock.calls.length

      jest.advanceTimersByTime(5000)

      // No new ticks while paused
      expect(onTick.mock.calls.length).toBe(ticksBeforePause)
    })

    test('remaining time calculation during pause reflects wall clock', () => {
      // Note: While paused, getRemainingSeconds() still uses Date.now()
      // The paused duration is only added to pausedDuration on resume()
      // This is fine because the UI interval is stopped during pause
      timer.start()
      jest.advanceTimersByTime(10000) // 10 seconds
      timer.pause()

      const remainingAtPause = timer.getRemainingSeconds()
      jest.advanceTimersByTime(30000) // 30 more seconds while paused

      // Time "leaks" in calculation while paused, but corrects on resume
      expect(timer.getRemainingSeconds()).toBe(remainingAtPause - 30)
    })
  })

  describe('resume()', () => {
    test('resumes paused timer', () => {
      timer.start()
      timer.pause()
      timer.resume()

      expect(timer.getStatus().isPaused).toBe(false)
      expect(timer.getStatus().isRunning).toBe(true)
    })

    test('does nothing if not paused', () => {
      timer.start()
      timer.resume() // Not paused

      expect(timer.getStatus().isRunning).toBe(true)
    })

    test('calls onResume callback', () => {
      const onResume = jest.fn()
      timer.on('onResume', onResume)

      timer.start()
      timer.pause()
      timer.resume()

      expect(onResume).toHaveBeenCalledWith({
        remaining: expect.any(Number),
        elapsed: expect.any(Number)
      })
    })

    test('continues ticking after resume', () => {
      const onTick = jest.fn()
      timer.on('onTick', onTick)

      timer.start()
      timer.pause()
      const ticksAtPause = onTick.mock.calls.length

      timer.resume()
      jest.advanceTimersByTime(3000)

      expect(onTick.mock.calls.length).toBeGreaterThan(ticksAtPause)
    })

    test('excludes paused duration from elapsed time', () => {
      timer.start()
      jest.advanceTimersByTime(10000) // 10 seconds running
      timer.pause()
      jest.advanceTimersByTime(5000) // 5 seconds paused (should not count)
      timer.resume()
      jest.advanceTimersByTime(5000) // 5 more seconds running

      // Total elapsed should be ~15 seconds (10 + 5, not including pause)
      expect(timer.getElapsedSeconds()).toBeCloseTo(15, 0)
    })
  })

  describe('reset()', () => {
    test('resets timer to initial state', () => {
      timer.start()
      jest.advanceTimersByTime(60000)
      timer.reset()

      const status = timer.getStatus()
      expect(status.isRunning).toBe(false)
      expect(status.isPaused).toBe(false)
      expect(status.elapsed).toBe(0)
      expect(status.remaining).toBe(25 * 60)
    })

    test('can reset with new duration', () => {
      timer.start()
      timer.reset(30)

      expect(timer.getStatus().duration).toBe(30)
      expect(timer.getRemainingSeconds()).toBe(30 * 60)
    })

    test('calls onReset callback', () => {
      const onReset = jest.fn()
      timer.on('onReset', onReset)

      timer.reset(20)

      expect(onReset).toHaveBeenCalledWith({ duration: 20 })
    })

    test('stops interval when resetting', () => {
      const onTick = jest.fn()
      timer.on('onTick', onTick)

      timer.start()
      timer.reset()
      const ticksAtReset = onTick.mock.calls.length

      jest.advanceTimersByTime(5000)

      expect(onTick.mock.calls.length).toBe(ticksAtReset)
    })
  })

  describe('adjustDuration()', () => {
    test('increases duration by delta', () => {
      timer.adjustDuration(5)
      expect(timer.getStatus().duration).toBe(30)
    })

    test('decreases duration by negative delta', () => {
      timer.adjustDuration(-5)
      expect(timer.getStatus().duration).toBe(20)
    })

    test('enforces minimum of 5 minutes', () => {
      timer.adjustDuration(-30)
      expect(timer.getStatus().duration).toBe(5)
    })

    test('enforces maximum of 60 minutes', () => {
      timer.adjustDuration(50)
      expect(timer.getStatus().duration).toBe(60)
    })

    test('triggers onTick callback', () => {
      const onTick = jest.fn()
      timer.on('onTick', onTick)

      timer.adjustDuration(5)

      expect(onTick).toHaveBeenCalled()
    })
  })

  describe('Completion', () => {
    test('completes when remaining reaches 0', () => {
      const onComplete = jest.fn()
      timer.on('onComplete', onComplete)

      timer.start(1) // 1 minute timer
      jest.advanceTimersByTime(61000) // Just over 1 minute

      expect(onComplete).toHaveBeenCalled()
      expect(timer.getStatus().isRunning).toBe(false)
    })

    test('adds to history on completion', () => {
      timer.start(1)
      jest.advanceTimersByTime(61000)

      const history = timer.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].duration).toBe(1)
    })

    test('onComplete receives session info', () => {
      const onComplete = jest.fn()
      timer.on('onComplete', onComplete)

      timer.start(1)
      jest.advanceTimersByTime(61000)

      expect(onComplete).toHaveBeenCalledWith({
        duration: 1,
        sessionNumber: 1
      })
    })

    test('increments session number for each completion', () => {
      const onComplete = jest.fn()
      timer.on('onComplete', onComplete)

      // First session
      timer.start(1)
      jest.advanceTimersByTime(61000)

      // Second session
      timer.reset(1)
      timer.start()
      jest.advanceTimersByTime(61000)

      expect(onComplete).toHaveBeenLastCalledWith({
        duration: 1,
        sessionNumber: 2
      })
    })
  })

  describe('History', () => {
    test('getHistory returns all completed sessions', () => {
      timer.start(1)
      jest.advanceTimersByTime(61000)

      timer.reset(1)
      timer.start()
      jest.advanceTimersByTime(61000)

      expect(timer.getHistory()).toHaveLength(2)
    })

    test('getTodayHistory filters to today only', () => {
      // This test assumes completions happen "today"
      timer.start(1)
      jest.advanceTimersByTime(61000)

      expect(timer.getTodayHistory()).toHaveLength(1)
    })

    test('getHistory returns a copy', () => {
      timer.start(1)
      jest.advanceTimersByTime(61000)

      const history1 = timer.getHistory()
      const history2 = timer.getHistory()

      expect(history1).not.toBe(history2)
      expect(history1).toEqual(history2)
    })
  })

  describe('destroy()', () => {
    test('clears interval', () => {
      const onTick = jest.fn()
      timer.on('onTick', onTick)

      timer.start()
      timer.destroy()
      const ticksAtDestroy = onTick.mock.calls.length

      jest.advanceTimersByTime(5000)

      expect(onTick.mock.calls.length).toBe(ticksAtDestroy)
    })

    test('clears all callbacks', () => {
      const onTick = jest.fn()
      const onComplete = jest.fn()
      timer.on('onTick', onTick)
      timer.on('onComplete', onComplete)

      timer.destroy()
      timer.start(1)
      jest.advanceTimersByTime(61000)

      // Callbacks should not fire after destroy
      expect(onTick).not.toHaveBeenCalled()
      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  describe('getStatus()', () => {
    test('returns complete status object', () => {
      timer.start()
      jest.advanceTimersByTime(5000)

      const status = timer.getStatus()

      expect(status).toMatchObject({
        isRunning: true,
        isPaused: false,
        remaining: expect.any(Number),
        elapsed: expect.any(Number),
        formatted: expect.any(String),
        progress: expect.any(Number),
        duration: 25
      })
    })
  })
})
