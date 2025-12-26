/**
 * ContextRestorationHelper Tests - Self-diagnosing unit tests
 *
 * Test categories:
 * 1. Context summary generation
 * 2. "Last time you were..." messages
 * 3. Breadcrumb summarization
 * 4. Re-entry point suggestions
 * 5. Welcome back messages
 */

import { ContextRestorationHelper } from '../../../src/utils/ContextRestorationHelper.js'

describe('ContextRestorationHelper', () => {
  // Sample test data
  const sampleSession = {
    project: 'atlas',
    task: 'Implement streak display',
    duration: 45,
    outcome: 'goodEnough',
    endTime: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  }

  const sampleBreadcrumbs = [
    { text: 'Fixed the test failures', timestamp: new Date(Date.now() - 30 * 60 * 1000), type: 'note' },
    {
      text: 'Need to add edge cases',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      type: 'todo'
    },
    { text: 'Started working on StreakCalculator', timestamp: new Date(Date.now() - 90 * 60 * 1000) }
  ]

  describe('getContextSummary - Complete context package', () => {
    test('returns structured context data', () => {
      const result = ContextRestorationHelper.getContextSummary(sampleSession, sampleBreadcrumbs)

      expect(result).toHaveProperty('lastTimeMessage')
      expect(result).toHaveProperty('timeSince')
      expect(result).toHaveProperty('breadcrumbSummary')
      expect(result).toHaveProperty('reentryPoints')
      expect(result).toHaveProperty('hasContext')
    })

    test('hasContext is true when session exists', () => {
      const result = ContextRestorationHelper.getContextSummary(sampleSession)
      expect(result.hasContext).toBe(true)
    })

    test('hasContext is true when only breadcrumbs exist', () => {
      const result = ContextRestorationHelper.getContextSummary(null, sampleBreadcrumbs)
      expect(result.hasContext).toBe(true)
    })

    test('hasContext is false when no context', () => {
      const result = ContextRestorationHelper.getContextSummary(null, [])
      expect(result.hasContext).toBe(false)
    })

    test('includes project name from session', () => {
      const result = ContextRestorationHelper.getContextSummary(sampleSession)
      expect(result.projectName).toBe('atlas')
    })
  })

  describe('_buildLastTimeMessage - "Where was I" messages', () => {
    test('returns fresh start for no session', () => {
      const result = ContextRestorationHelper._buildLastTimeMessage(null)
      expect(result).toContain('Fresh start')
    })

    test('includes task when present', () => {
      const result = ContextRestorationHelper._buildLastTimeMessage(sampleSession)
      expect(result).toContain('Implement streak display')
    })

    test('includes project when no task', () => {
      const session = { project: 'atlas', duration: 30 }
      const result = ContextRestorationHelper._buildLastTimeMessage(session)
      expect(result).toContain('atlas')
    })

    test('includes duration', () => {
      const result = ContextRestorationHelper._buildLastTimeMessage(sampleSession)
      expect(result).toContain('45 minutes')
    })

    test('includes outcome context for paused', () => {
      const session = { ...sampleSession, outcome: 'paused' }
      const result = ContextRestorationHelper._buildLastTimeMessage(session)
      expect(result).toContain('paused')
    })

    test('includes outcome context for blocked', () => {
      const session = { ...sampleSession, outcome: 'blocked' }
      const result = ContextRestorationHelper._buildLastTimeMessage(session)
      expect(result).toContain('blocked')
    })
  })

  describe('_summarizeBreadcrumbs - Trail display', () => {
    test('returns no items message when empty', () => {
      const result = ContextRestorationHelper._summarizeBreadcrumbs([])
      expect(result.hasItems).toBe(false)
      expect(result.message).toContain('No breadcrumbs')
    })

    test('returns recent breadcrumbs (max 3)', () => {
      const result = ContextRestorationHelper._summarizeBreadcrumbs(sampleBreadcrumbs)
      expect(result.items).toHaveLength(3)
      expect(result.hasItems).toBe(true)
    })

    test('includes time ago for each breadcrumb', () => {
      const result = ContextRestorationHelper._summarizeBreadcrumbs(sampleBreadcrumbs)
      expect(result.items[0].timeAgo).toBeTruthy()
    })

    test('preserves breadcrumb text', () => {
      const result = ContextRestorationHelper._summarizeBreadcrumbs(sampleBreadcrumbs)
      expect(result.items[0].text).toBe('Fixed the test failures')
    })

    test('reports total count', () => {
      const result = ContextRestorationHelper._summarizeBreadcrumbs(sampleBreadcrumbs)
      expect(result.totalCount).toBe(3)
    })
  })

  describe('_suggestReentryPoints - Where to start', () => {
    test('suggests continuing from breadcrumb when available', () => {
      const points = ContextRestorationHelper._suggestReentryPoints(null, sampleBreadcrumbs)
      const breadcrumbPoint = points.find((p) => p.type === 'breadcrumb')
      expect(breadcrumbPoint).toBeDefined()
      expect(breadcrumbPoint.suggestion).toContain('Fixed the test failures')
    })

    test('suggests picking up paused session', () => {
      const session = { ...sampleSession, outcome: 'paused' }
      const points = ContextRestorationHelper._suggestReentryPoints(session, [])
      const pausedPoint = points.find((p) => p.type === 'paused_session')
      expect(pausedPoint).toBeDefined()
    })

    test('suggests checking blocker for blocked session', () => {
      const session = { ...sampleSession, outcome: 'blocked' }
      const points = ContextRestorationHelper._suggestReentryPoints(session, [])
      const blockedPoint = points.find((p) => p.type === 'blocked')
      expect(blockedPoint).toBeDefined()
      expect(blockedPoint.suggestion).toContain('blocker')
    })

    test('always includes review and fresh start options', () => {
      const points = ContextRestorationHelper._suggestReentryPoints(null, [])
      expect(points.find((p) => p.type === 'review')).toBeDefined()
      expect(points.find((p) => p.type === 'fresh')).toBeDefined()
    })

    test('points are sorted by priority', () => {
      const points = ContextRestorationHelper._suggestReentryPoints(sampleSession, sampleBreadcrumbs)
      for (let i = 1; i < points.length; i++) {
        expect(points[i].priority).toBeGreaterThanOrEqual(points[i - 1].priority)
      }
    })
  })

  describe('_formatTimeSince - Human-friendly time', () => {
    test('formats "just now" for < 1 min', () => {
      const result = ContextRestorationHelper._formatTimeSince(new Date())
      expect(result).toBe('just now')
    })

    test('formats minutes correctly', () => {
      const date = new Date(Date.now() - 25 * 60 * 1000) // 25 min ago
      const result = ContextRestorationHelper._formatTimeSince(date)
      expect(result).toBe('25 min ago')
    })

    test('formats hours correctly', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      const result = ContextRestorationHelper._formatTimeSince(date)
      expect(result).toBe('3 hours ago')
    })

    test('formats "yesterday"', () => {
      const date = new Date(Date.now() - 30 * 60 * 60 * 1000) // ~30 hours ago
      const result = ContextRestorationHelper._formatTimeSince(date)
      expect(result).toBe('yesterday')
    })

    test('formats days correctly', () => {
      const date = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      const result = ContextRestorationHelper._formatTimeSince(date)
      expect(result).toBe('4 days ago')
    })

    test('formats weeks correctly', () => {
      const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 2 weeks ago
      const result = ContextRestorationHelper._formatTimeSince(date)
      expect(result).toBe('2 weeks ago')
    })
  })

  describe('getQuickContext - Dashboard display', () => {
    test('returns "No recent session" when empty', () => {
      const result = ContextRestorationHelper.getQuickContext(null)
      expect(result).toBe('No recent session')
    })

    test('includes task name when present', () => {
      const result = ContextRestorationHelper.getQuickContext(sampleSession)
      expect(result).toContain('Implement streak display')
    })

    test('includes time since', () => {
      const result = ContextRestorationHelper.getQuickContext(sampleSession)
      expect(result).toContain('ago')
    })

    test('truncates long task names', () => {
      const session = { task: 'A very long task name that should be truncated for display' }
      const result = ContextRestorationHelper.getQuickContext(session)
      expect(result.length).toBeLessThan(60)
    })
  })

  describe('getWelcomeBack - Warm greetings', () => {
    test('returns greeting when no session', () => {
      const result = ContextRestorationHelper.getWelcomeBack(null)
      expect(result).toContain("Let's get started")
    })

    test('includes time since last session', () => {
      const result = ContextRestorationHelper.getWelcomeBack(sampleSession)
      expect(result).toContain('hours ago')
    })

    test('celebrates streak when present', () => {
      const result = ContextRestorationHelper.getWelcomeBack(sampleSession, 5)
      expect(result).toContain('5-day streak')
    })

    test('is encouraging in tone', () => {
      const result = ContextRestorationHelper.getWelcomeBack(sampleSession)
      const positiveWords = ['Welcome', 'Good', 'Ready', 'Hey']
      const hasPositive = positiveWords.some((word) => result.includes(word))
      expect(hasPositive).toBe(true)
    })
  })

  describe('shouldShowContextRestore - When to show', () => {
    test('not recommended with no session', () => {
      const result = ContextRestorationHelper.shouldShowContextRestore(null)
      expect(result.recommended).toBe(false)
    })

    test('recommended after 24+ hours', () => {
      const session = {
        endTime: new Date(Date.now() - 30 * 60 * 60 * 1000) // 30 hours ago
      }
      const result = ContextRestorationHelper.shouldShowContextRestore(session)
      expect(result.recommended).toBe(true)
      expect(result.reason).toContain('while')
    })

    test('recommended after 4+ hours', () => {
      const session = {
        endTime: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      }
      const result = ContextRestorationHelper.shouldShowContextRestore(session)
      expect(result.recommended).toBe(true)
    })

    test('recommended for paused sessions', () => {
      const session = {
        outcome: 'paused',
        endTime: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      }
      const result = ContextRestorationHelper.shouldShowContextRestore(session)
      expect(result.recommended).toBe(true)
      expect(result.reason).toContain('paused')
    })

    test('recommended when task exists', () => {
      const session = {
        task: 'Some task',
        endTime: new Date(Date.now() - 60 * 60 * 1000)
      }
      const result = ContextRestorationHelper.shouldShowContextRestore(session)
      expect(result.recommended).toBe(true)
    })
  })

  describe('Self-Diagnostic Tests', () => {
    test('DIAGNOSTIC: all outcomes have friendly text', () => {
      const outcomes = ['completed', 'goodEnough', 'paused', 'blocked', 'pivoted', 'timeboxed']

      console.log('DIAGNOSTIC: Outcome texts:')
      for (const outcome of outcomes) {
        const text = ContextRestorationHelper._getOutcomeText(outcome)
        console.log(`DIAGNOSTIC: ${outcome} -> "${text}"`)
        expect(text).toBeTruthy()
        expect(text.length).toBeGreaterThan(5)
      }
    })

    test('DIAGNOSTIC: time formatting covers all ranges', () => {
      const testCases = [
        { ms: 0, label: 'just now' },
        { ms: 5 * 60 * 1000, label: '5 minutes' },
        { ms: 2 * 60 * 60 * 1000, label: '2 hours' },
        { ms: 30 * 60 * 60 * 1000, label: 'yesterday' },
        { ms: 5 * 24 * 60 * 60 * 1000, label: '5 days' },
        { ms: 14 * 24 * 60 * 60 * 1000, label: '2 weeks' }
      ]

      console.log('DIAGNOSTIC: Time formatting:')
      for (const { ms, label } of testCases) {
        const date = new Date(Date.now() - ms)
        const result = ContextRestorationHelper._formatTimeSince(date)
        console.log(`DIAGNOSTIC: ${label} -> "${result}"`)
        expect(result).toBeTruthy()
      }
    })

    test('DIAGNOSTIC: context summary is complete', () => {
      const result = ContextRestorationHelper.getContextSummary(sampleSession, sampleBreadcrumbs, {
        name: 'atlas'
      })

      console.log('DIAGNOSTIC: Full context summary:')
      console.log(`DIAGNOSTIC: lastTimeMessage: "${result.lastTimeMessage}"`)
      console.log(`DIAGNOSTIC: timeSince: "${result.timeSince}"`)
      console.log(`DIAGNOSTIC: breadcrumbs: ${result.breadcrumbSummary.items.length} items`)
      console.log(`DIAGNOSTIC: reentryPoints: ${result.reentryPoints.length} suggestions`)
      console.log(`DIAGNOSTIC: hasContext: ${result.hasContext}`)

      expect(result.lastTimeMessage.length).toBeGreaterThan(20)
      expect(result.reentryPoints.length).toBeGreaterThan(0)
    })

    test('DIAGNOSTIC: welcome messages are varied', () => {
      const messages = new Set()

      // Generate multiple welcome messages
      for (let i = 0; i < 20; i++) {
        const msg = ContextRestorationHelper.getWelcomeBack(sampleSession)
        messages.add(msg.split('!')[0] + '!') // Get just the greeting part
      }

      console.log('DIAGNOSTIC: Unique greetings found:', messages.size)
      // Should have some variety (at least 2 different greetings)
      expect(messages.size).toBeGreaterThanOrEqual(2)
    })
  })
})
