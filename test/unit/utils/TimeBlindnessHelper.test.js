/**
 * TimeBlindnessHelper Tests - Self-diagnosing unit tests
 *
 * Test categories:
 * 1. Time awareness messaging
 * 2. Milestone detection
 * 3. Break suggestions
 * 4. Duration formatting
 * 5. Completion estimates
 * 6. Reminder throttling
 */

import { TimeBlindnessHelper } from '../../../src/utils/TimeBlindnessHelper.js'

describe('TimeBlindnessHelper', () => {
  describe('getGentleCue - ADHD-friendly messages', () => {
    test('returns "Just getting started" for < 5 min', () => {
      expect(TimeBlindnessHelper.getGentleCue(0)).toBe('Just getting started...')
      expect(TimeBlindnessHelper.getGentleCue(3)).toBe('Just getting started...')
      expect(TimeBlindnessHelper.getGentleCue(4.9)).toBe('Just getting started...')
    })

    test('returns "Building momentum" for 5-14 min', () => {
      expect(TimeBlindnessHelper.getGentleCue(5)).toBe('Building momentum')
      expect(TimeBlindnessHelper.getGentleCue(10)).toBe('Building momentum')
      expect(TimeBlindnessHelper.getGentleCue(14)).toBe('Building momentum')
    })

    test('returns flow message for 15-29 min', () => {
      expect(TimeBlindnessHelper.getGentleCue(15)).toContain('flow')
      expect(TimeBlindnessHelper.getGentleCue(25)).toContain('flow')
    })

    test('returns deep work message for 30-44 min', () => {
      expect(TimeBlindnessHelper.getGentleCue(30)).toContain('Deep work')
      expect(TimeBlindnessHelper.getGentleCue(40)).toContain('Deep work')
    })

    test('returns strong focus for 45-59 min', () => {
      expect(TimeBlindnessHelper.getGentleCue(45)).toContain('Strong focus')
    })

    test('suggests break for extended sessions', () => {
      expect(TimeBlindnessHelper.getGentleCue(120)).toContain('break')
      expect(TimeBlindnessHelper.getGentleCue(180)).toContain('break')
    })
  })

  describe('getTimeAwareness - Complete awareness package', () => {
    test('returns structured awareness data', () => {
      const result = TimeBlindnessHelper.getTimeAwareness(30)

      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('milestone')
      expect(result).toHaveProperty('suggestBreak')
      expect(result).toHaveProperty('breakType')
      expect(result).toHaveProperty('formattedDuration')
    })

    test('detects 15-minute milestone', () => {
      const result = TimeBlindnessHelper.getTimeAwareness(15)
      expect(result.milestone).toBe(15)
      expect(result.message).toContain('15 minutes')
    })

    test('detects 30-minute milestone', () => {
      const result = TimeBlindnessHelper.getTimeAwareness(30)
      expect(result.milestone).toBe(30)
      expect(result.message).toContain('Half hour')
    })

    test('detects 60-minute milestone', () => {
      const result = TimeBlindnessHelper.getTimeAwareness(60)
      expect(result.milestone).toBe(60)
      expect(result.message).toContain('1 hour')
    })

    test('milestone window is 2 minutes', () => {
      // Just past milestone - still detected
      expect(TimeBlindnessHelper.getTimeAwareness(15.5).milestone).toBe(15)
      expect(TimeBlindnessHelper.getTimeAwareness(16.9).milestone).toBe(15)

      // Outside window - not detected
      expect(TimeBlindnessHelper.getTimeAwareness(17.1).milestone).toBeNull()
      expect(TimeBlindnessHelper.getTimeAwareness(14).milestone).toBeNull()
    })
  })

  describe('getBreakMessage - Break suggestions', () => {
    test('returns null for short sessions', () => {
      expect(TimeBlindnessHelper.getBreakMessage(10)).toBeNull()
      expect(TimeBlindnessHelper.getBreakMessage(20)).toBeNull()
    })

    test('suggests micro break at ~25 min (Pomodoro)', () => {
      const msg = TimeBlindnessHelper.getBreakMessage(25)
      expect(msg).toContain('stretch')
      expect(msg).toContain('25')
    })

    test('suggests short break at ~50 min', () => {
      const msg = TimeBlindnessHelper.getBreakMessage(50)
      expect(msg).toContain('short break')
      expect(msg).toContain('50')
    })

    test('suggests long break at ~90 min (ultradian)', () => {
      const msg = TimeBlindnessHelper.getBreakMessage(90)
      expect(msg).toContain('energy')
      expect(msg).toContain('90')
    })

    test('suggests extended break at ~180 min', () => {
      const msg = TimeBlindnessHelper.getBreakMessage(180)
      expect(msg).toContain('Walk')
      expect(msg).toContain('3+')
    })
  })

  describe('_formatDuration - Human-friendly time', () => {
    test('formats sub-minute as "Just started"', () => {
      expect(TimeBlindnessHelper._formatDuration(0)).toBe('Just started')
      expect(TimeBlindnessHelper._formatDuration(0.5)).toBe('Just started')
    })

    test('formats minutes correctly', () => {
      expect(TimeBlindnessHelper._formatDuration(5)).toBe('5 min')
      expect(TimeBlindnessHelper._formatDuration(45)).toBe('45 min')
      expect(TimeBlindnessHelper._formatDuration(59)).toBe('59 min')
    })

    test('formats hours correctly', () => {
      expect(TimeBlindnessHelper._formatDuration(60)).toBe('1h')
      expect(TimeBlindnessHelper._formatDuration(120)).toBe('2h')
    })

    test('formats hours and minutes', () => {
      expect(TimeBlindnessHelper._formatDuration(75)).toBe('1h 15m')
      expect(TimeBlindnessHelper._formatDuration(90)).toBe('1h 30m')
      expect(TimeBlindnessHelper._formatDuration(150)).toBe('2h 30m')
    })
  })

  describe('estimateCompletion - ADHD-realistic estimates', () => {
    test('returns done message for 100%', () => {
      const result = TimeBlindnessHelper.estimateCompletion(100, 60)
      expect(result.message).toBe('Done!')
      expect(result.estimate).toBe(0)
    })

    test('returns getting started for 0%', () => {
      const result = TimeBlindnessHelper.estimateCompletion(0, 5)
      expect(result.message).toBe('Getting started...')
    })

    test('estimates remaining time with ADHD buffer', () => {
      // 50% done in 30 min -> linear would be 30 min more
      // With 1.25 buffer -> 37.5 min
      const result = TimeBlindnessHelper.estimateCompletion(50, 30)
      expect(result.estimate).toBeGreaterThan(30)
      expect(result.estimate).toBeLessThan(45)
    })

    test('confidence increases with progress', () => {
      const early = TimeBlindnessHelper.estimateCompletion(10, 10)
      const mid = TimeBlindnessHelper.estimateCompletion(30, 30)
      const late = TimeBlindnessHelper.estimateCompletion(75, 75)

      expect(early.confidence).toBe('low')
      expect(mid.confidence).toBe('medium')
      expect(late.confidence).toBe('high')
    })

    test('includes confidence note in message', () => {
      const low = TimeBlindnessHelper.estimateCompletion(10, 10)
      const high = TimeBlindnessHelper.estimateCompletion(75, 75)

      expect(low.message).toContain('rough guess')
      expect(high.message).toContain('reliable')
    })
  })

  describe('shouldRemind - Reminder throttling', () => {
    test('prevents reminders within 10 minutes', () => {
      expect(TimeBlindnessHelper.shouldRemind(5, 30)).toBe(false)
      expect(TimeBlindnessHelper.shouldRemind(9, 30)).toBe(false)
    })

    test('allows reminders after minimum interval', () => {
      expect(TimeBlindnessHelper.shouldRemind(15, 20)).toBe(true)
    })

    test('increases interval for longer sessions', () => {
      // Early session - 15 min interval
      expect(TimeBlindnessHelper.shouldRemind(15, 20)).toBe(true)
      expect(TimeBlindnessHelper.shouldRemind(14, 20)).toBe(false)

      // Mid session - 20 min interval
      expect(TimeBlindnessHelper.shouldRemind(20, 45)).toBe(true)
      expect(TimeBlindnessHelper.shouldRemind(19, 45)).toBe(false)

      // Long session - 25 min interval
      expect(TimeBlindnessHelper.shouldRemind(25, 90)).toBe(true)
      expect(TimeBlindnessHelper.shouldRemind(24, 90)).toBe(false)

      // Very long session - 30 min interval
      expect(TimeBlindnessHelper.shouldRemind(30, 150)).toBe(true)
      expect(TimeBlindnessHelper.shouldRemind(29, 150)).toBe(false)
    })
  })

  describe('Self-Diagnostic Tests', () => {
    test('DIAGNOSTIC: all milestones have messages', () => {
      const milestones = TimeBlindnessHelper.MILESTONES

      console.log('DIAGNOSTIC: Testing milestones:', milestones)

      for (const milestone of milestones) {
        const result = TimeBlindnessHelper.getTimeAwareness(milestone)
        console.log(`DIAGNOSTIC: ${milestone}min -> "${result.message}"`)

        expect(result.message).toBeTruthy()
        expect(result.message.length).toBeGreaterThan(10)
      }
    })

    test('DIAGNOSTIC: break intervals are properly configured', () => {
      const intervals = TimeBlindnessHelper.BREAK_INTERVALS

      console.log('DIAGNOSTIC: Break intervals:', intervals)

      // Verify intervals are increasing
      const values = Object.values(intervals)
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })

    test('DIAGNOSTIC: messages are encouraging, not nagging', () => {
      // Check that messages don't contain negative language
      const negativeWords = ['should', 'must', 'need to', 'have to', 'stop', 'warning']

      for (let i = 0; i <= 180; i += 15) {
        const cue = TimeBlindnessHelper.getGentleCue(i)

        for (const word of negativeWords) {
          const hasNegative = cue.toLowerCase().includes(word)
          if (hasNegative) {
            console.log(`DIAGNOSTIC WARNING: Found "${word}" in message at ${i}min: "${cue}"`)
          }
          expect(hasNegative).toBe(false)
        }
      }

      console.log('DIAGNOSTIC: All messages passed encouragement check')
    })

    test('DIAGNOSTIC: estimate accuracy simulation', () => {
      // Simulate a task that takes 60 minutes
      const actualDuration = 60
      const checkpoints = [10, 25, 50, 75, 90]

      console.log('DIAGNOSTIC: Estimate accuracy test (60 min actual task)')

      for (const percent of checkpoints) {
        const elapsed = (actualDuration * percent) / 100
        const result = TimeBlindnessHelper.estimateCompletion(percent, elapsed)
        const remaining = actualDuration - elapsed
        const accuracy = Math.abs(result.estimate - remaining) / remaining

        console.log(
          `DIAGNOSTIC: At ${percent}% (${elapsed}min elapsed) -> ` +
            `Estimate: ${result.estimate}min, Actual remaining: ${remaining}min, ` +
            `Accuracy: ${((1 - accuracy) * 100).toFixed(0)}%`
        )

        // Estimates should be within 50% of actual (generous for ADHD buffer)
        expect(accuracy).toBeLessThan(0.5)
      }
    })
  })
})
