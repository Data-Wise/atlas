/**
 * Tests for MCP Formatters
 *
 * Comprehensive unit tests for all formatting functions.
 */

import { describe, it, expect } from '@jest/globals'
import {
  formatDuration,
  formatContext,
  formatProjects,
  formatStats,
  formatTrail,
  formatInbox,
  formatPlan,
  formatSessionStart,
  formatSessionEnd,
  formatCapture,
  formatBreadcrumb
} from '../../../src/mcp/formatters.js'

describe('MCP Formatters', () => {
  describe('formatDuration', () => {
    it('returns 0m for null/undefined', () => {
      expect(formatDuration(null)).toBe('0m')
      expect(formatDuration(undefined)).toBe('0m')
    })

    it('returns 0m for zero and negative values', () => {
      expect(formatDuration(0)).toBe('0m')
      expect(formatDuration(-5)).toBe('0m')
      expect(formatDuration(-100)).toBe('0m')
    })

    it('formats minutes under 60', () => {
      expect(formatDuration(1)).toBe('1m')
      expect(formatDuration(15)).toBe('15m')
      expect(formatDuration(30)).toBe('30m')
      expect(formatDuration(59)).toBe('59m')
    })

    it('formats exactly 60 minutes as 1h', () => {
      expect(formatDuration(60)).toBe('1h')
    })

    it('formats hours with remaining minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(75)).toBe('1h 15m')
      expect(formatDuration(135)).toBe('2h 15m')
    })

    it('formats exact hours without minutes', () => {
      expect(formatDuration(120)).toBe('2h')
      expect(formatDuration(180)).toBe('3h')
      expect(formatDuration(480)).toBe('8h')
    })

    it('rounds fractional minutes', () => {
      expect(formatDuration(30.4)).toBe('30m')
      expect(formatDuration(30.6)).toBe('31m')
      expect(formatDuration(90.5)).toBe('1h 31m')
    })
  })

  describe('formatContext', () => {
    it('returns message for null context', () => {
      expect(formatContext(null)).toBe('No context available')
    })

    it('returns message for undefined context', () => {
      expect(formatContext(undefined)).toBe('No context available')
    })

    it('formats empty context', () => {
      const result = formatContext({})
      expect(result).toContain('=== Current Context ===')
      expect(result).toContain('No active session')
    })

    it('formats active session', () => {
      const context = {
        activeSession: {
          project: 'atlas',
          task: 'Fix bug',
          duration: 30,
          isFlowState: true
        }
      }
      const result = formatContext(context)
      expect(result).toContain('Active Session: atlas')
      expect(result).toContain('Task: Fix bug')
      expect(result).toContain('Duration: 30 min')
      expect(result).toContain('In flow state')
    })

    it('formats session without flow state', () => {
      const context = {
        activeSession: {
          project: 'atlas',
          duration: 5
        }
      }
      const result = formatContext(context)
      expect(result).not.toContain('In flow state')
    })

    it('formats project info', () => {
      const context = {
        project: 'atlas',
        focus: 'MCP integration'
      }
      const result = formatContext(context)
      expect(result).toContain('Project: atlas')
      expect(result).toContain('Focus: MCP integration')
    })

    it('formats recent breadcrumbs', () => {
      const context = {
        recentCrumbs: [
          { text: 'First crumb', ago: '5m ago' },
          { text: 'Second crumb', getAge: () => '10m ago' }
        ]
      }
      const result = formatContext(context)
      expect(result).toContain('Recent breadcrumbs:')
      expect(result).toContain('First crumb (5m ago)')
      expect(result).toContain('Second crumb (10m ago)')
    })

    it('limits breadcrumbs to 5', () => {
      const context = {
        recentCrumbs: [
          { text: 'Crumb 1' },
          { text: 'Crumb 2' },
          { text: 'Crumb 3' },
          { text: 'Crumb 4' },
          { text: 'Crumb 5' },
          { text: 'Crumb 6' },
          { text: 'Crumb 7' }
        ]
      }
      const result = formatContext(context)
      expect(result).toContain('Crumb 5')
      expect(result).not.toContain('Crumb 6')
    })

    it('formats inbox count', () => {
      const context = { inboxCount: 5 }
      const result = formatContext(context)
      expect(result).toContain('Inbox: 5 items awaiting triage')
    })

    it('hides inbox when count is 0', () => {
      const context = { inboxCount: 0 }
      const result = formatContext(context)
      expect(result).not.toContain('Inbox')
    })
  })

  describe('formatProjects', () => {
    it('returns message for empty list', () => {
      expect(formatProjects(null)).toBe('No projects found')
      expect(formatProjects([])).toBe('No projects found')
      expect(formatProjects(undefined)).toBe('No projects found')
    })

    it('formats single project', () => {
      const projects = [{
        name: 'atlas',
        type: 'nodejs',
        status: 'active',
        path: '/home/user/atlas'
      }]
      const result = formatProjects(projects)
      expect(result).toContain('=== Projects ===')
      expect(result).toContain('atlas')
      expect(result).toContain('Type: nodejs')
      expect(result).toContain('Status: active')
      expect(result).toContain('Path: /home/user/atlas')
    })

    it('formats multiple projects', () => {
      const projects = [
        { name: 'atlas', status: 'active' },
        { name: 'flow-cli', status: 'paused' }
      ]
      const result = formatProjects(projects)
      expect(result).toContain('atlas')
      expect(result).toContain('flow-cli')
    })

    it('handles missing type and status', () => {
      const projects = [{ name: 'test' }]
      const result = formatProjects(projects)
      expect(result).toContain('Type: unknown')
      expect(result).toContain('Status: unknown')
    })

    it('shows status icons', () => {
      const projects = [
        { name: 'active-project', status: 'active' },
        { name: 'paused-project', status: 'paused' }
      ]
      const result = formatProjects(projects)
      expect(result).toContain('🟢')
      expect(result).toContain('⏸️')
    })
  })

  describe('formatStats', () => {
    const baseStats = {
      period: { days: 7, projectFilter: null },
      summary: {
        totalSessions: 10,
        totalMinutes: 300,
        dailyAverageMinutes: 43,
        flowSessions: 6,
        flowPercentage: 60,
        completionRate: 80
      },
      streak: { current: 0, display: '', longest: 0 },
      bestDay: null,
      estimation: { hasData: false }
    }

    it('formats basic stats', () => {
      const result = formatStats(baseStats)
      expect(result).toContain('=== Session Statistics ===')
      expect(result).toContain('Period: Last 7 days')
      expect(result).toContain('Total Sessions: 10')
      expect(result).toContain('Total Time: 5h')
      expect(result).toContain('Daily Average: 43m')
      expect(result).toContain('Flow Sessions: 6 (60%)')
      expect(result).toContain('Completion Rate: 80%')
    })

    it('shows project filter when present', () => {
      const stats = { ...baseStats, period: { days: 7, projectFilter: 'atlas' } }
      const result = formatStats(stats)
      expect(result).toContain('Last 7 days (atlas)')
    })

    it('shows streak when active', () => {
      const stats = {
        ...baseStats,
        streak: { current: 5, display: '5 days', longest: 10 }
      }
      const result = formatStats(stats)
      expect(result).toContain('Streak: 5 days (longest: 10 days)')
    })

    it('hides streak when not active', () => {
      const result = formatStats(baseStats)
      expect(result).not.toContain('Streak:')
    })

    it('shows best day', () => {
      const stats = {
        ...baseStats,
        bestDay: { dayName: 'Tuesday', minutes: 120 }
      }
      const result = formatStats(stats)
      expect(result).toContain('Best Day: Tuesday (2h)')
    })

    it('shows estimation stats when available', () => {
      const stats = {
        ...baseStats,
        estimation: {
          hasData: true,
          message: 'Great estimation!',
          accuracyRate: 80
        }
      }
      const result = formatStats(stats)
      expect(result).toContain('Time Estimation:')
      expect(result).toContain('Great estimation!')
      expect(result).toContain('Accuracy: 80% within 10%')
    })
  })

  describe('formatTrail', () => {
    it('returns message for empty trail', () => {
      expect(formatTrail(null)).toBe('No breadcrumbs found')
      expect(formatTrail([])).toBe('No breadcrumbs found')
    })

    it('formats breadcrumbs', () => {
      const trail = [{
        text: 'Decided to use Redis',
        timestamp: new Date('2025-01-01T10:00:00'),
        project: 'atlas'
      }]
      const result = formatTrail(trail)
      expect(result).toContain('=== Breadcrumb Trail ===')
      expect(result).toContain('Decided to use Redis')
      expect(result).toContain('Project: atlas')
    })

    it('calls getIcon if available', () => {
      const trail = [{
        text: 'Test',
        getIcon: () => '💡'
      }]
      const result = formatTrail(trail)
      expect(result).toContain('💡 Test')
    })

    it('uses default icon when getIcon not available', () => {
      const trail = [{ text: 'Test' }]
      const result = formatTrail(trail)
      expect(result).toContain('🍞 Test')
    })

    it('limits to 20 breadcrumbs', () => {
      const trail = Array(25).fill(null).map((_, i) => ({ text: `Crumb ${i}` }))
      const result = formatTrail(trail)
      expect(result).toContain('Crumb 19')
      expect(result).not.toContain('Crumb 20')
    })
  })

  describe('formatInbox', () => {
    it('returns message for empty inbox', () => {
      expect(formatInbox(null)).toBe('Inbox empty')
      expect(formatInbox([])).toBe('Inbox empty')
    })

    it('formats single item', () => {
      const items = [{ text: 'Add caching', type: 'idea' }]
      const result = formatInbox(items)
      expect(result).toContain('=== Inbox (1 items) ===')
      expect(result).toContain('1. 💡 Add caching')
    })

    it('shows correct icons for types', () => {
      const items = [
        { text: 'Task', type: 'task' },
        { text: 'Bug', type: 'bug' },
        { text: 'Idea', type: 'idea' }
      ]
      const result = formatInbox(items)
      expect(result).toContain('☐ Task')
      expect(result).toContain('🐛 Bug')
      expect(result).toContain('💡 Idea')
    })

    it('shows project if available', () => {
      const items = [{ text: 'Test', project: 'atlas' }]
      const result = formatInbox(items)
      expect(result).toContain('Project: atlas')
    })

    it('shows age if available', () => {
      const items = [
        { text: 'Test1', age: '2 hours' },
        { text: 'Test2', getAge: () => '3 days' }
      ]
      const result = formatInbox(items)
      expect(result).toContain('Age: 2 hours')
      expect(result).toContain('Age: 3 days')
    })
  })

  describe('formatPlan', () => {
    it('uses greeting if provided', () => {
      const plan = { greeting: 'Good morning!' }
      const result = formatPlan(plan)
      expect(result).toContain('Good morning!')
    })

    it('uses default heading if no greeting', () => {
      const plan = {}
      const result = formatPlan(plan)
      expect(result).toContain('=== Morning Planning ===')
    })

    it('shows streak when active', () => {
      const plan = { streak: { current: 3, display: '3 days' } }
      const result = formatPlan(plan)
      expect(result).toContain('Streak: 3 days')
    })

    it('shows yesterday summary', () => {
      const plan = {
        yesterday: { sessions: 5, totalMinutes: 180 }
      }
      const result = formatPlan(plan)
      expect(result).toContain('Yesterday:')
      expect(result).toContain('Sessions: 5')
      expect(result).toContain('Time: 3h')
    })

    it('shows parked contexts', () => {
      const plan = {
        parked: [
          { project: 'atlas', reason: 'lunch break' },
          { project: 'flow-cli' }
        ]
      }
      const result = formatPlan(plan)
      expect(result).toContain('Parked contexts:')
      expect(result).toContain('atlas: lunch break')
      expect(result).toContain('flow-cli: no reason given')
    })

    it('shows inbox count', () => {
      const plan = { inbox: [1, 2, 3] }
      const result = formatPlan(plan)
      expect(result).toContain('Inbox: 3 items to triage')
    })

    it('shows suggestions (max 3)', () => {
      const plan = {
        suggestions: [
          { message: 'Suggestion 1' },
          { message: 'Suggestion 2' },
          { message: 'Suggestion 3' },
          { message: 'Suggestion 4' }
        ]
      }
      const result = formatPlan(plan)
      expect(result).toContain('Suggestions:')
      expect(result).toContain('Suggestion 1')
      expect(result).toContain('Suggestion 3')
      expect(result).not.toContain('Suggestion 4')
    })
  })

  describe('formatSessionStart', () => {
    it('formats basic session start', () => {
      const session = {
        project: 'atlas',
        startTime: new Date('2025-01-01T10:00:00')
      }
      const result = formatSessionStart(session)
      expect(result).toContain('Started session for "atlas"')
      expect(result).toContain('Started at:')
    })

    it('includes task if provided', () => {
      const session = {
        project: 'atlas',
        task: 'Fix bug',
        startTime: new Date()
      }
      const result = formatSessionStart(session)
      expect(result).toContain('Started session for "atlas": Fix bug')
    })

    it('includes estimated minutes if provided', () => {
      const session = {
        project: 'atlas',
        estimatedMinutes: 30,
        startTime: new Date()
      }
      const result = formatSessionStart(session)
      expect(result).toContain('Estimated: 30 minutes')
    })

    it('includes energy level if provided', () => {
      const session = {
        project: 'atlas',
        energyLevel: 'high',
        startTime: new Date()
      }
      const result = formatSessionStart(session)
      expect(result).toContain('Energy: high')
    })

    it('includes all optional fields', () => {
      const session = {
        project: 'atlas',
        task: 'MCP work',
        estimatedMinutes: 45,
        energyLevel: 'medium',
        startTime: new Date()
      }
      const result = formatSessionStart(session)
      expect(result).toContain('atlas')
      expect(result).toContain('MCP work')
      expect(result).toContain('45 minutes')
      expect(result).toContain('medium')
    })
  })

  describe('formatSessionEnd', () => {
    it('formats basic session end', () => {
      const result = formatSessionEnd({ duration: '30m' })
      expect(result).toBe('Session ended. Duration: 30m')
    })

    it('includes note if provided', () => {
      const result = formatSessionEnd({ duration: '1h' }, 'All tests passing')
      expect(result).toBe('Session ended. Duration: 1h\nNote: All tests passing')
    })

    it('handles empty note', () => {
      const result = formatSessionEnd({ duration: '45m' }, '')
      expect(result).toBe('Session ended. Duration: 45m')
    })
  })

  describe('formatCapture', () => {
    it('formats basic capture', () => {
      const result = formatCapture('Add caching', 'idea')
      expect(result).toBe('Captured idea: "Add caching"')
    })

    it('defaults to idea type', () => {
      const result = formatCapture('Test', null)
      expect(result).toBe('Captured idea: "Test"')
    })

    it('includes project if provided', () => {
      const result = formatCapture('Fix bug', 'task', 'atlas')
      expect(result).toBe('Captured task: "Fix bug" (atlas)')
    })

    it('includes tags if provided', () => {
      const result = formatCapture('Test', 'idea', null, ['urgent', 'v2'])
      expect(result).toBe('Captured idea: "Test" [urgent, v2]')
    })

    it('includes both project and tags', () => {
      const result = formatCapture('Test', 'bug', 'atlas', ['critical'])
      expect(result).toBe('Captured bug: "Test" (atlas) [critical]')
    })

    it('handles empty tags array', () => {
      const result = formatCapture('Test', 'idea', null, [])
      expect(result).toBe('Captured idea: "Test"')
    })
  })

  describe('formatBreadcrumb', () => {
    it('formats basic breadcrumb', () => {
      const result = formatBreadcrumb('Decided to use Redis')
      expect(result).toBe('Logged breadcrumb: "Decided to use Redis"')
    })

    it('includes project if provided', () => {
      const result = formatBreadcrumb('Working on API', 'atlas')
      expect(result).toBe('Logged breadcrumb: "Working on API" (atlas)')
    })

    it('handles empty project', () => {
      const result = formatBreadcrumb('Test', '')
      expect(result).toBe('Logged breadcrumb: "Test"')
    })
  })
})
