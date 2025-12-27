/**
 * ProjectPresenter Tests
 *
 * Tests for UI-agnostic project formatting functions.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import {
  formatTimeAgo,
  formatDuration,
  truncateText,
  formatProjectType,
  getStatusCategory,
  formatProjectSummary,
  formatSessionInfo
} from '../../../../src/adapters/presenters/ProjectPresenter.js'

describe('ProjectPresenter', () => {
  describe('formatTimeAgo', () => {
    it('returns "-" for null/undefined', () => {
      expect(formatTimeAgo(null)).toBe('-')
      expect(formatTimeAgo(undefined)).toBe('-')
    })

    it('returns "now" for very recent times', () => {
      const now = new Date()
      expect(formatTimeAgo(now)).toBe('now')
    })

    it('formats minutes correctly', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
      expect(formatTimeAgo(fiveMinAgo)).toBe('5m')
    })

    it('formats hours correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      expect(formatTimeAgo(twoHoursAgo)).toBe('2h')
    })

    it('formats days correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      expect(formatTimeAgo(threeDaysAgo)).toBe('3d')
    })

    it('formats weeks correctly', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      expect(formatTimeAgo(twoWeeksAgo)).toBe('2w')
    })

    it('handles string dates', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      expect(formatTimeAgo(fiveMinAgo)).toBe('5m')
    })
  })

  describe('formatDuration', () => {
    it('returns "0m" for zero/null/undefined', () => {
      expect(formatDuration(0)).toBe('0m')
      expect(formatDuration(null)).toBe('0m')
      expect(formatDuration(undefined)).toBe('0m')
    })

    it('formats minutes under an hour', () => {
      expect(formatDuration(25)).toBe('25m')
      expect(formatDuration(59)).toBe('59m')
    })

    it('formats exact hours', () => {
      expect(formatDuration(60)).toBe('1h')
      expect(formatDuration(120)).toBe('2h')
    })

    it('formats hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(145)).toBe('2h 25m')
    })
  })

  describe('truncateText', () => {
    it('returns empty string for null/undefined', () => {
      expect(truncateText(null, 10)).toBe('')
      expect(truncateText(undefined, 10)).toBe('')
    })

    it('returns text unchanged if shorter than max', () => {
      expect(truncateText('hello', 10)).toBe('hello')
    })

    it('returns text unchanged if equal to max', () => {
      expect(truncateText('hello', 5)).toBe('hello')
    })

    it('truncates with ellipsis if longer than max', () => {
      expect(truncateText('hello world', 8)).toBe('hello w…')
    })
  })

  describe('formatProjectType', () => {
    it('returns string type as-is', () => {
      expect(formatProjectType('node')).toBe('node')
      expect(formatProjectType('r-package')).toBe('r-package')
    })

    it('extracts value from value object', () => {
      expect(formatProjectType({ value: 'python' })).toBe('python')
      expect(formatProjectType({ _value: 'quarto' })).toBe('quarto')
    })

    it('returns "general" for null/undefined', () => {
      expect(formatProjectType(null)).toBe('general')
      expect(formatProjectType(undefined)).toBe('general')
    })

    it('returns "general" for empty object', () => {
      expect(formatProjectType({})).toBe('general')
    })
  })

  describe('getStatusCategory', () => {
    it('categorizes active statuses', () => {
      expect(getStatusCategory('active')).toBe('active')
      expect(getStatusCategory('working')).toBe('active')
      expect(getStatusCategory('in-progress')).toBe('active')
      expect(getStatusCategory('testing')).toBe('active')
    })

    it('categorizes paused statuses', () => {
      expect(getStatusCategory('paused')).toBe('paused')
      expect(getStatusCategory('blocked')).toBe('paused')
      expect(getStatusCategory('waiting')).toBe('paused')
    })

    it('categorizes stable statuses', () => {
      expect(getStatusCategory('stable')).toBe('stable')
      expect(getStatusCategory('complete')).toBe('stable')
      expect(getStatusCategory('released')).toBe('stable')
      expect(getStatusCategory('ready')).toBe('stable')
    })

    it('returns "other" for unknown statuses', () => {
      expect(getStatusCategory('unknown')).toBe('other')
      expect(getStatusCategory('draft')).toBe('other')
      expect(getStatusCategory('planning')).toBe('other')
    })
  })

  describe('formatProjectSummary', () => {
    it('formats a complete project', () => {
      const project = {
        name: 'atlas',
        type: { value: 'node' },
        status: 'active',
        lastAccessedAt: new Date(),
        progress: 75,
        next: 'Add tests',
        metadata: { focus: 'Refactoring' }
      }

      const summary = formatProjectSummary(project)

      expect(summary.name).toBe('atlas')
      expect(summary.type).toBe('node')
      expect(summary.status).toBe('active')
      expect(summary.statusCategory).toBe('active')
      expect(summary.progress).toBe(75)
      expect(summary.nextAction).toBe('Add tests')
    })

    it('falls back to metadata for next/focus', () => {
      const project = {
        name: 'test-project',
        type: 'python',
        status: 'paused',
        metadata: { next: 'Review PR', focus: 'Bug fix' }
      }

      const summary = formatProjectSummary(project)

      expect(summary.nextAction).toBe('Review PR')
      expect(summary.focus).toBe('Bug fix')
    })

    it('handles missing optional fields', () => {
      const project = {
        name: 'minimal',
        type: null,
        status: null
      }

      const summary = formatProjectSummary(project)

      expect(summary.name).toBe('minimal')
      expect(summary.type).toBe('general')
      expect(summary.status).toBe('unknown')
      expect(summary.progress).toBe(0)
      expect(summary.nextAction).toBe(null)
    })
  })

  describe('formatSessionInfo', () => {
    it('returns null for null session', () => {
      expect(formatSessionInfo(null)).toBe(null)
      expect(formatSessionInfo(undefined)).toBe(null)
    })

    it('formats active session', () => {
      const session = {
        project: 'atlas',
        task: 'Add presenters',
        getDuration: () => 45
      }

      const info = formatSessionInfo(session)

      expect(info.project).toBe('atlas')
      expect(info.task).toBe('Add presenters')
      expect(info.duration).toBe('45m')
      expect(info.durationMinutes).toBe(45)
      expect(info.isActive).toBe(true)
    })

    it('handles session without getDuration', () => {
      const session = {
        project: 'test',
        task: null
      }

      const info = formatSessionInfo(session)

      expect(info.project).toBe('test')
      expect(info.task).toBe('-')
      expect(info.duration).toBe('0m')
    })
  })
})
