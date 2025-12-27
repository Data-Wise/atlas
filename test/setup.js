/**
 * Jest setup file
 *
 * Ensures proper cleanup of timers and resources between tests.
 * This prevents the "worker process has failed to exit gracefully" warning.
 */

import { jest, afterEach, afterAll } from '@jest/globals'

// Clear all timers after each test
afterEach(() => {
  // Clear any pending timers
  jest.clearAllTimers()
})

// Ensure all timers are cleared after the entire test suite
afterAll(() => {
  jest.clearAllTimers()
})
