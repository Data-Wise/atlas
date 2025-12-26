/**
 * SessionCompletionHelper Tests - Self-diagnosing unit tests
 *
 * Test categories:
 * 1. Completion types and options
 * 2. Ending messages
 * 3. Progress validation (anti-perfectionism)
 * 4. Transition support
 * 5. Stop suggestions
 */

import { SessionCompletionHelper } from '../../../src/utils/SessionCompletionHelper.js'

describe('SessionCompletionHelper', () => {
  describe('getCompletionOptions - Available endings', () => {
    test('returns all 6 completion types', () => {
      const options = SessionCompletionHelper.getCompletionOptions()
      expect(options).toHaveLength(6)
    })

    test('each option has required fields', () => {
      const options = SessionCompletionHelper.getCompletionOptions()

      for (const option of options) {
        expect(option).toHaveProperty('type')
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('emoji')
        expect(option).toHaveProperty('description')
        expect(option).toHaveProperty('encouragement')
      }
    })

    test('includes "goodEnough" as explicit option', () => {
      const options = SessionCompletionHelper.getCompletionOptions()
      const goodEnough = options.find((o) => o.type === 'goodEnough')

      expect(goodEnough).toBeDefined()
      expect(goodEnough.label).toBe('Good Enough')
      expect(goodEnough.emoji).toBe('👍')
    })

    test('all completion types are positive/neutral', () => {
      const options = SessionCompletionHelper.getCompletionOptions()
      const negativeWords = ['failed', 'quit', 'gave up', 'abandoned', 'stopped']

      for (const option of options) {
        const combinedText = `${option.label} ${option.description} ${option.encouragement}`.toLowerCase()
        for (const word of negativeWords) {
          expect(combinedText).not.toContain(word)
        }
      }
    })
  })

  describe('getCompletionData - Specific type lookup', () => {
    test('returns data for valid type', () => {
      const data = SessionCompletionHelper.getCompletionData('completed')
      expect(data).toBeDefined()
      expect(data.label).toBe('Completed')
    })

    test('returns null for invalid type', () => {
      const data = SessionCompletionHelper.getCompletionData('invalid')
      expect(data).toBeNull()
    })
  })

  describe('getEndingMessage - Session end messages', () => {
    test('returns structured message object', () => {
      const result = SessionCompletionHelper.getEndingMessage('completed', 30)

      expect(result).toHaveProperty('primary')
      expect(result).toHaveProperty('encouragement')
      expect(result).toHaveProperty('nextSteps')
      expect(Array.isArray(result.nextSteps)).toBe(true)
    })

    test('includes duration in primary message', () => {
      const result = SessionCompletionHelper.getEndingMessage('completed', 45)
      expect(result.primary).toContain('45 min')
    })

    test('includes task description when provided', () => {
      const result = SessionCompletionHelper.getEndingMessage('completed', 30, 'Fix login bug')
      expect(result.primary).toContain('Fix login bug')
    })

    test('uses emoji for completion type', () => {
      const completed = SessionCompletionHelper.getEndingMessage('completed', 30)
      const goodEnough = SessionCompletionHelper.getEndingMessage('goodEnough', 30)

      expect(completed.primary).toContain('✅')
      expect(goodEnough.primary).toContain('👍')
    })

    test('provides relevant next steps', () => {
      const paused = SessionCompletionHelper.getEndingMessage('paused', 30)
      expect(paused.nextSteps.some((s) => s.toLowerCase().includes('breadcrumb'))).toBe(true)

      const blocked = SessionCompletionHelper.getEndingMessage('blocked', 30)
      expect(blocked.nextSteps.some((s) => s.toLowerCase().includes('document'))).toBe(true)
    })
  })

  describe('validateProgress - Anti-perfectionism', () => {
    test('validates 100% as complete', () => {
      const result = SessionCompletionHelper.validateProgress(100)
      expect(result.valid).toBe(true)
      expect(result.message).toContain('100%')
    })

    test('validates 80%+ as "done enough"', () => {
      const result = SessionCompletionHelper.validateProgress(85)
      expect(result.valid).toBe(true)
      expect(result.message).toContain('done enough')
    })

    test('validates 50%+ as real progress', () => {
      const result = SessionCompletionHelper.validateProgress(55)
      expect(result.valid).toBe(true)
      expect(result.message).toContain('halfway')
    })

    test('validates 25%+ as a real start', () => {
      const result = SessionCompletionHelper.validateProgress(30)
      expect(result.valid).toBe(true)
      expect(result.message).toContain('Quarter')
    })

    test('validates 10%+ as started (hardest part)', () => {
      const result = SessionCompletionHelper.validateProgress(15)
      expect(result.valid).toBe(true)
      expect(result.message).toContain('started')
    })

    test('validates even 1% as valid', () => {
      const result = SessionCompletionHelper.validateProgress(1)
      expect(result.valid).toBe(true)
      expect(result.message).toContain('more than 0%')
    })

    test('validates 0% - showing up counts', () => {
      const result = SessionCompletionHelper.validateProgress(0)
      expect(result.valid).toBe(true)
      expect(result.message).toContain('showed up')
    })

    test('all progress percentages are valid (key ADHD principle)', () => {
      for (let i = 0; i <= 100; i += 5) {
        const result = SessionCompletionHelper.validateProgress(i)
        expect(result.valid).toBe(true)
      }
    })
  })

  describe('getTransitionSupport - Context switching help', () => {
    test('returns steps and reminder', () => {
      const result = SessionCompletionHelper.getTransitionSupport('Bug fix')

      expect(result).toHaveProperty('steps')
      expect(result).toHaveProperty('reminder')
      expect(Array.isArray(result.steps)).toBe(true)
    })

    test('includes breathing/grounding step', () => {
      const result = SessionCompletionHelper.getTransitionSupport('Task A')
      expect(result.steps.some((s) => s.toLowerCase().includes('breath'))).toBe(true)
    })

    test('includes saying goodbye to task', () => {
      const result = SessionCompletionHelper.getTransitionSupport('Feature X')
      expect(result.steps.some((s) => s.includes('Feature X'))).toBe(true)
    })

    test('adapts when transitioning to specific task', () => {
      const result = SessionCompletionHelper.getTransitionSupport('Task A', 'Task B')
      expect(result.steps.some((s) => s.includes('Task B'))).toBe(true)
    })

    test('reminder acknowledges difficulty of context switching', () => {
      const result = SessionCompletionHelper.getTransitionSupport('Any task')
      expect(result.reminder.toLowerCase()).toContain('context switching')
      expect(result.reminder.toLowerCase()).toContain('hard')
    })
  })

  describe('shouldConsiderStopping - Gentle nudges', () => {
    test('does not suggest stopping for short sessions', () => {
      const result = SessionCompletionHelper.shouldConsiderStopping(30)
      expect(result.shouldConsiderStopping).toBe(false)
      expect(result.reason).toBeNull()
    })

    test('suggests stopping at 90+ minutes', () => {
      const result = SessionCompletionHelper.shouldConsiderStopping(95)
      expect(result.shouldConsiderStopping).toBe(true)
      expect(result.reason).toContain('90')
    })

    test('strongly suggests stopping at 180+ minutes', () => {
      const result = SessionCompletionHelper.shouldConsiderStopping(200)
      expect(result.shouldConsiderStopping).toBe(true)
      expect(result.reason).toContain('3+')
    })

    test('suggests stopping when exceeding planned time by 20%', () => {
      // Planned 60 min, at 75 min (25% over)
      const result = SessionCompletionHelper.shouldConsiderStopping(75, 60)
      expect(result.shouldConsiderStopping).toBe(true)
      expect(result.reason).toContain('over')
    })

    test('does not suggest stopping if under planned time', () => {
      const result = SessionCompletionHelper.shouldConsiderStopping(50, 60)
      expect(result.shouldConsiderStopping).toBe(false)
    })
  })

  describe('Self-Diagnostic Tests', () => {
    test('DIAGNOSTIC: all completion types have unique emojis', () => {
      const options = SessionCompletionHelper.getCompletionOptions()
      const emojis = options.map((o) => o.emoji)
      const uniqueEmojis = [...new Set(emojis)]

      console.log('DIAGNOSTIC: Completion emojis:', emojis)
      expect(uniqueEmojis.length).toBe(emojis.length)
    })

    test('DIAGNOSTIC: encouragement messages are concise', () => {
      const options = SessionCompletionHelper.getCompletionOptions()

      for (const option of options) {
        const wordCount = option.encouragement.split(' ').length
        console.log(`DIAGNOSTIC: ${option.type} encouragement: ${wordCount} words`)
        expect(wordCount).toBeLessThan(20) // Keep encouragement brief
      }
    })

    test('DIAGNOSTIC: all messages are encouraging, not judgmental', () => {
      const options = SessionCompletionHelper.getCompletionOptions()
      const judgmentalWords = ['should have', 'could have', 'lazy', 'failed', 'bad', 'wrong']

      for (const option of options) {
        const text = `${option.description} ${option.encouragement}`.toLowerCase()
        for (const word of judgmentalWords) {
          expect(text).not.toContain(word)
        }
      }

      console.log('DIAGNOSTIC: All messages passed judgment-free check')
    })

    test('DIAGNOSTIC: progress validation covers full range', () => {
      const testPoints = [0, 1, 5, 10, 15, 25, 30, 50, 60, 75, 80, 90, 95, 100]

      console.log('DIAGNOSTIC: Progress validation messages:')
      for (const percent of testPoints) {
        const result = SessionCompletionHelper.validateProgress(percent)
        console.log(`DIAGNOSTIC: ${percent}% -> "${result.message}"`)
        expect(result.valid).toBe(true)
        expect(result.message.length).toBeGreaterThan(10)
      }
    })

    test('DIAGNOSTIC: transition support is actionable', () => {
      const result = SessionCompletionHelper.getTransitionSupport('Task A', 'Task B')

      console.log('DIAGNOSTIC: Transition steps:')
      for (const step of result.steps) {
        console.log(`DIAGNOSTIC:   - ${step}`)
        // Each step should be an action
        expect(step.length).toBeGreaterThan(10)
      }

      expect(result.steps.length).toBeGreaterThanOrEqual(3)
    })
  })
})
