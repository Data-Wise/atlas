/**
 * Timer Manager
 *
 * Centralized timer management for Pomodoro and session tracking.
 * Provides clean lifecycle with proper cleanup.
 */

/**
 * Create a timer manager
 * @param {Object} options - Configuration
 * @param {number} options.defaultMinutes - Default Pomodoro duration (default: 25)
 * @returns {Object} Timer manager instance
 */
export function createTimerManager(options = {}) {
  const defaultMinutes = options.defaultMinutes || 25

  // Timer state
  let isRunning = false
  let isPaused = false
  let startTime = null
  let pausedAt = null
  let pausedDuration = 0
  let duration = defaultMinutes * 60 * 1000 // in ms
  let intervalId = null

  // History
  const history = []

  // Callbacks
  const callbacks = {
    onTick: null,
    onComplete: null,
    onStart: null,
    onPause: null,
    onResume: null,
    onReset: null
  }

  /**
   * Get remaining time in seconds
   * @returns {number} Remaining seconds
   */
  function getRemainingSeconds() {
    if (!startTime) return Math.floor(duration / 1000)

    const now = Date.now()
    const elapsed = now - startTime - pausedDuration
    const remaining = Math.max(0, duration - elapsed)
    return Math.floor(remaining / 1000)
  }

  /**
   * Get elapsed time in seconds
   * @returns {number} Elapsed seconds
   */
  function getElapsedSeconds() {
    if (!startTime) return 0

    const now = Date.now()
    const elapsed = now - startTime - pausedDuration
    return Math.floor(Math.min(elapsed, duration) / 1000)
  }

  /**
   * Get formatted time string (MM:SS)
   * @returns {string} Formatted time
   */
  function getFormattedTime() {
    const remaining = getRemainingSeconds()
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Get progress as percentage (0-100)
   * @returns {number} Progress percentage
   */
  function getProgress() {
    const elapsed = getElapsedSeconds()
    const total = Math.floor(duration / 1000)
    return total > 0 ? Math.min(100, (elapsed / total) * 100) : 0
  }

  /**
   * Internal tick handler
   */
  function tick() {
    if (callbacks.onTick) {
      callbacks.onTick({
        remaining: getRemainingSeconds(),
        elapsed: getElapsedSeconds(),
        formatted: getFormattedTime(),
        progress: getProgress(),
        isRunning,
        isPaused
      })
    }

    // Check for completion
    if (getRemainingSeconds() <= 0 && isRunning) {
      complete()
    }
  }

  /**
   * Handle timer completion
   */
  function complete() {
    // Stop the timer
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    isRunning = false

    // Record in history
    history.push({
      completed: new Date().toISOString(),
      duration: Math.floor(duration / 60000),
      elapsed: getElapsedSeconds()
    })

    if (callbacks.onComplete) {
      callbacks.onComplete({
        duration: Math.floor(duration / 60000),
        sessionNumber: history.length
      })
    }
  }

  /**
   * Start the timer
   * @param {number} minutes - Optional duration override
   */
  function start(minutes) {
    if (isRunning) return

    if (minutes) {
      duration = minutes * 60 * 1000
    }

    isRunning = true
    isPaused = false
    startTime = Date.now()
    pausedDuration = 0

    // Start interval
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(tick, 1000)

    // Initial tick
    tick()

    if (callbacks.onStart) {
      callbacks.onStart({ duration: Math.floor(duration / 60000) })
    }
  }

  /**
   * Pause the timer
   */
  function pause() {
    if (!isRunning || isPaused) return

    isPaused = true
    pausedAt = Date.now()

    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    if (callbacks.onPause) {
      callbacks.onPause({
        remaining: getRemainingSeconds(),
        elapsed: getElapsedSeconds()
      })
    }
  }

  /**
   * Resume the timer
   */
  function resume() {
    if (!isPaused) return

    isPaused = false
    pausedDuration += Date.now() - pausedAt
    pausedAt = null

    // Restart interval
    intervalId = setInterval(tick, 1000)
    tick()

    if (callbacks.onResume) {
      callbacks.onResume({
        remaining: getRemainingSeconds(),
        elapsed: getElapsedSeconds()
      })
    }
  }

  /**
   * Reset the timer
   * @param {number} minutes - Optional new duration
   */
  function reset(minutes) {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    isRunning = false
    isPaused = false
    startTime = null
    pausedAt = null
    pausedDuration = 0

    if (minutes) {
      duration = minutes * 60 * 1000
    }

    if (callbacks.onReset) {
      callbacks.onReset({ duration: Math.floor(duration / 60000) })
    }
  }

  /**
   * Adjust duration by delta minutes
   * @param {number} delta - Minutes to add (can be negative)
   */
  function adjustDuration(delta) {
    const newMinutes = Math.max(5, Math.min(60, Math.floor(duration / 60000) + delta))
    duration = newMinutes * 60 * 1000
    if (callbacks.onTick) tick()
  }

  /**
   * Set callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  function on(event, callback) {
    if (callbacks.hasOwnProperty(event)) {
      callbacks[event] = callback
    }
  }

  /**
   * Get timer status
   * @returns {Object} Timer status
   */
  function getStatus() {
    return {
      isRunning,
      isPaused,
      remaining: getRemainingSeconds(),
      elapsed: getElapsedSeconds(),
      formatted: getFormattedTime(),
      progress: getProgress(),
      duration: Math.floor(duration / 60000)
    }
  }

  /**
   * Get today's history
   * @returns {Array} Today's completed Pomodoros
   */
  function getTodayHistory() {
    const today = new Date().toISOString().split('T')[0]
    return history.filter(h => h.completed.startsWith(today))
  }

  /**
   * Get total history
   * @returns {Array} All completed Pomodoros
   */
  function getHistory() {
    return [...history]
  }

  /**
   * Clean up
   */
  function destroy() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    Object.keys(callbacks).forEach(k => callbacks[k] = null)
  }

  return {
    // Controls
    start,
    pause,
    resume,
    reset,
    adjustDuration,

    // Queries
    getStatus,
    getRemainingSeconds,
    getElapsedSeconds,
    getFormattedTime,
    getProgress,
    getTodayHistory,
    getHistory,

    // Events
    on,

    // Cleanup
    destroy
  }
}

export default createTimerManager
