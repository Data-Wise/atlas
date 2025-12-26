/**
 * StreakCalculator Tests - Self-diagnosing unit tests
 *
 * Test categories:
 * 1. Basic streak calculation
 * 2. Edge cases (empty, single day, gaps)
 * 3. Longest streak tracking
 * 4. Display formatting
 * 5. ADHD-friendly messages
 */

import { StreakCalculator } from '../../../src/utils/StreakCalculator.js'

describe('StreakCalculator', () => {
  // Helper to create session-like objects
  const createSession = (daysAgo) => ({
    startTime: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  })

  const createSessionOnDate = (dateStr) => ({
    startTime: new Date(dateStr)
  })

  describe('calculateStreak - Basic Cases', () => {
    test('returns 0 for empty sessions array', () => {
      const result = StreakCalculator.calculateStreak([])
      expect(result.current).toBe(0)
      expect(result.longest).toBe(0)
      expect(result.lastActiveDate).toBeNull()
    })

    test('returns 0 for null/undefined sessions', () => {
      expect(StreakCalculator.calculateStreak(null).current).toBe(0)
      expect(StreakCalculator.calculateStreak(undefined).current).toBe(0)
    })

    test('returns 1 for single session today', () => {
      const sessions = [createSession(0)]
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(1)
      expect(result.longest).toBe(1)
    })

    test('returns 1 for single session yesterday', () => {
      const sessions = [createSession(1)]
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(1)
      expect(result.longest).toBe(1)
    })

    test('returns 0 for session 2+ days ago (streak broken)', () => {
      const sessions = [createSession(2)]
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(0)
      expect(result.longest).toBe(1) // Still counted in longest
    })
  })

  describe('calculateStreak - Consecutive Days', () => {
    test('counts consecutive days correctly', () => {
      // Sessions for today, yesterday, and day before
      const sessions = [
        createSession(0),
        createSession(1),
        createSession(2)
      ]
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(3)
      expect(result.longest).toBe(3)
    })

    test('handles multiple sessions on same day', () => {
      // 3 sessions today, 2 yesterday
      const sessions = [
        createSession(0),
        createSession(0),
        createSession(0),
        createSession(1),
        createSession(1)
      ]
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(2) // Only 2 unique days
      expect(result.longest).toBe(2)
    })

    test('detects gap in streak', () => {
      // Today and 3 days ago (gap of 1 day)
      const sessions = [
        createSession(0),
        createSession(3)
      ]
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(1) // Only today counts
    })

    test('7 day streak', () => {
      const sessions = Array.from({ length: 7 }, (_, i) => createSession(i))
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(7)
      expect(result.longest).toBe(7)
    })
  })

  describe('calculateStreak - Longest Streak Tracking', () => {
    test('tracks longest streak separately from current', () => {
      // Had a 5-day streak last week, now on day 2
      const sessions = [
        createSession(0),  // today
        createSession(1),  // yesterday
        // gap
        createSession(10), // 10 days ago
        createSession(11),
        createSession(12),
        createSession(13),
        createSession(14)  // 5 days in a row
      ]
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(2)
      expect(result.longest).toBe(5)
    })

    test('updates longest when current exceeds it', () => {
      const sessions = Array.from({ length: 10 }, (_, i) => createSession(i))
      const result = StreakCalculator.calculateStreak(sessions)
      expect(result.current).toBe(10)
      expect(result.longest).toBe(10)
    })
  })

  describe('normalizeDate', () => {
    test('normalizes date to YYYY-MM-DD format', () => {
      const date = new Date('2025-12-25T14:30:00')
      expect(StreakCalculator.normalizeDate(date)).toBe('2025-12-25')
    })

    test('handles single digit months and days', () => {
      const date = new Date('2025-01-05T00:00:00')
      expect(StreakCalculator.normalizeDate(date)).toBe('2025-01-05')
    })
  })

  describe('getStreakDisplay', () => {
    test('returns empty string for 0 streak', () => {
      expect(StreakCalculator.getStreakDisplay(0)).toBe('')
    })

    test('returns single fire for 1-6 days', () => {
      expect(StreakCalculator.getStreakDisplay(1)).toBe('🔥 1 day')
      expect(StreakCalculator.getStreakDisplay(3)).toBe('🔥 3 days')
      expect(StreakCalculator.getStreakDisplay(6)).toBe('🔥 6 days')
    })

    test('returns double fire for 7-29 days', () => {
      expect(StreakCalculator.getStreakDisplay(7)).toBe('🔥🔥 7 days')
      expect(StreakCalculator.getStreakDisplay(14)).toBe('🔥🔥 14 days')
      expect(StreakCalculator.getStreakDisplay(29)).toBe('🔥🔥 29 days')
    })

    test('returns triple fire for 30+ days', () => {
      expect(StreakCalculator.getStreakDisplay(30)).toBe('🔥🔥🔥 30 days')
      expect(StreakCalculator.getStreakDisplay(100)).toBe('🔥🔥🔥 100 days')
    })
  })

  describe('getStreakMessage - ADHD Encouragement', () => {
    test('encourages starting for 0 streak', () => {
      const msg = StreakCalculator.getStreakMessage(0, 0)
      expect(msg).toContain('Start')
    })

    test('celebrates day 1', () => {
      const msg = StreakCalculator.getStreakMessage(1, 1)
      expect(msg).toContain('Day 1')
    })

    test('celebrates new personal best', () => {
      const msg = StreakCalculator.getStreakMessage(5, 5)
      expect(msg).toContain('personal best')
    })

    test('celebrates week milestone', () => {
      const msg = StreakCalculator.getStreakMessage(7, 10)
      expect(msg).toContain('7 days')
    })

    test('acknowledges building momentum', () => {
      const msg = StreakCalculator.getStreakMessage(3, 10)
      expect(msg).toContain('momentum')
    })
  })

  describe('Self-Diagnostic Tests', () => {
    test('DIAGNOSTIC: streak calculation handles real-world session data', () => {
      // Simulate real usage pattern: active user with some gaps
      const sessions = [
        createSession(0),   // today
        createSession(1),   // yesterday
        createSession(2),   // 2 days ago
        // weekend break
        createSession(5),   // 5 days ago
        createSession(6),
        createSession(7),
        createSession(8),
        // another break
        createSession(15),
        createSession(16)
      ]

      const result = StreakCalculator.calculateStreak(sessions)

      // Self-diagnostic assertions
      console.log('DIAGNOSTIC: Streak result:', JSON.stringify(result))
      console.log(`DIAGNOSTIC: Current streak: ${result.current}`)
      console.log(`DIAGNOSTIC: Longest streak: ${result.longest}`)

      expect(result.current).toBeGreaterThanOrEqual(0)
      expect(result.longest).toBeGreaterThanOrEqual(result.current)
      expect(result.lastActiveDate).toBeInstanceOf(Date)
    })

    test('DIAGNOSTIC: performance with large session history', () => {
      // Generate 1000 sessions over 2 years
      const sessions = Array.from({ length: 1000 }, (_, i) => ({
        startTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000 * 0.7) // ~70% daily rate
      }))

      const start = Date.now()
      const result = StreakCalculator.calculateStreak(sessions)
      const duration = Date.now() - start

      console.log(`DIAGNOSTIC: Processed 1000 sessions in ${duration}ms`)
      console.log(`DIAGNOSTIC: Result: current=${result.current}, longest=${result.longest}`)

      expect(duration).toBeLessThan(500) // Should complete in <500ms (generous for CI)
      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('longest')
    })
  })
})
