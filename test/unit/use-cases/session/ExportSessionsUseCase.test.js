/**
 * Tests for ExportSessionsUseCase
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { ExportSessionsUseCase } from '../../../../src/use-cases/session/ExportSessionsUseCase.js'

describe('ExportSessionsUseCase', () => {
  let useCase
  let mockSessionRepository
  let mockSessions

  beforeEach(() => {
    // Create mock sessions
    const now = new Date()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    mockSessions = [
      createMockSession('session-1', 'atlas', yesterday, 30, 'completed'),
      createMockSession('session-2', 'flow-cli', now, 45, 'completed'),
      createMockSession('session-3', 'atlas', now, 15, 'interrupted')
    ]

    mockSessionRepository = {
      list: jest.fn().mockResolvedValue(mockSessions)
    }

    useCase = new ExportSessionsUseCase(mockSessionRepository)
  })

  function createMockSession(id, project, startTime, durationMinutes, outcome) {
    const session = {
      id,
      project,
      task: 'Work session',
      branch: 'main',
      startTime: new Date(startTime),
      endTime: new Date(startTime.getTime() + durationMinutes * 60 * 1000),
      outcome,
      getDuration: () => durationMinutes
    }
    return session
  }

  describe('execute', () => {
    it('should export sessions to iCal format by default', async () => {
      const result = await useCase.execute()

      expect(result.format).toBe('ical')
      expect(result.sessionCount).toBe(3)
      expect(result.content).toContain('BEGIN:VCALENDAR')
      expect(result.content).toContain('END:VCALENDAR')
      expect(result.content).toContain('BEGIN:VEVENT')
    })

    it('should include all sessions as VEVENTs', async () => {
      const result = await useCase.execute()

      const eventCount = (result.content.match(/BEGIN:VEVENT/g) || []).length
      expect(eventCount).toBe(3)
    })

    it('should include project name in SUMMARY', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('SUMMARY:Atlas: atlas')
      expect(result.content).toContain('SUMMARY:Atlas: flow-cli')
    })

    it('should include UID for each event', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('UID:session-1@atlas')
      expect(result.content).toContain('UID:session-2@atlas')
    })

    it('should include DTSTART and DTEND', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('DTSTART:')
      expect(result.content).toContain('DTEND:')
    })

    it('should include duration in description', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('Duration: 30 minutes')
      expect(result.content).toContain('Duration: 45 minutes')
    })

    it('should include outcome in description', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('Outcome: completed')
      expect(result.content).toContain('Outcome: interrupted')
    })

    it('should set STATUS based on outcome', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('STATUS:CONFIRMED')
      expect(result.content).toContain('STATUS:TENTATIVE')
    })
  })

  describe('JSON format', () => {
    it('should export sessions to JSON when format is json', async () => {
      const result = await useCase.execute({ format: 'json' })

      expect(result.format).toBe('json')
      const parsed = JSON.parse(result.content)
      expect(parsed).toHaveLength(3)
    })

    it('should include session properties in JSON', async () => {
      const result = await useCase.execute({ format: 'json' })

      const parsed = JSON.parse(result.content)
      expect(parsed[0]).toHaveProperty('id')
      expect(parsed[0]).toHaveProperty('project')
      expect(parsed[0]).toHaveProperty('startTime')
      expect(parsed[0]).toHaveProperty('duration')
      expect(parsed[0]).toHaveProperty('outcome')
    })
  })

  describe('period handling', () => {
    it('should default to 30 days', async () => {
      await useCase.execute()

      const call = mockSessionRepository.list.mock.calls[0][0]
      const daysDiff = (call.until - call.since) / (24 * 60 * 60 * 1000)
      expect(Math.round(daysDiff)).toBe(30)
    })

    it('should handle week period', async () => {
      await useCase.execute({ period: 'week' })

      const call = mockSessionRepository.list.mock.calls[0][0]
      const daysDiff = (call.until - call.since) / (24 * 60 * 60 * 1000)
      expect(Math.round(daysDiff)).toBe(7)
    })

    it('should handle month period', async () => {
      await useCase.execute({ period: 'month' })

      const call = mockSessionRepository.list.mock.calls[0][0]
      const daysDiff = (call.until - call.since) / (24 * 60 * 60 * 1000)
      expect(Math.round(daysDiff)).toBe(30)
    })

    it('should handle custom days', async () => {
      await useCase.execute({ days: 14 })

      const call = mockSessionRepository.list.mock.calls[0][0]
      const daysDiff = (call.until - call.since) / (24 * 60 * 60 * 1000)
      expect(Math.round(daysDiff)).toBe(14)
    })
  })

  describe('project filtering', () => {
    it('should filter by project when specified', async () => {
      await useCase.execute({ project: 'atlas' })

      const call = mockSessionRepository.list.mock.calls[0][0]
      expect(call.project).toBe('atlas')
    })

    it('should not filter when project is not specified', async () => {
      await useCase.execute()

      const call = mockSessionRepository.list.mock.calls[0][0]
      expect(call.project).toBeUndefined()
    })
  })

  describe('result metadata', () => {
    it('should include session count', async () => {
      const result = await useCase.execute()

      expect(result.sessionCount).toBe(3)
    })

    it('should include period info', async () => {
      const result = await useCase.execute({ days: 7 })

      expect(result.period.days).toBe(7)
      expect(result.period.startDate).toBeInstanceOf(Date)
      expect(result.period.endDate).toBeInstanceOf(Date)
    })

    it('should include project filter in result', async () => {
      const result = await useCase.execute({ project: 'atlas' })

      expect(result.project).toBe('atlas')
    })
  })

  describe('edge cases', () => {
    it('should handle empty sessions', async () => {
      mockSessionRepository.list.mockResolvedValue([])

      const result = await useCase.execute()

      expect(result.sessionCount).toBe(0)
      expect(result.content).toContain('BEGIN:VCALENDAR')
      expect(result.content).toContain('END:VCALENDAR')
      expect(result.content).not.toContain('BEGIN:VEVENT')
    })

    it('should handle sessions without endTime', async () => {
      const session = {
        id: 'test-id',
        project: 'test',
        startTime: new Date(),
        endTime: null,
        outcome: null,
        getDuration: () => 0
      }
      mockSessionRepository.list.mockResolvedValue([session])

      const result = await useCase.execute()

      expect(result.content).toContain('BEGIN:VEVENT')
    })

    it('should escape special characters in iCal', async () => {
      const session = {
        id: 'test-id',
        project: 'test; project, name',
        task: 'Task with; special, chars',
        startTime: new Date(),
        endTime: new Date(),
        getDuration: () => 30
      }
      mockSessionRepository.list.mockResolvedValue([session])

      const result = await useCase.execute()

      expect(result.content).toContain('test\\; project\\, name')
    })
  })

  describe('ICS format compliance', () => {
    it('should use CRLF line endings', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('\r\n')
    })

    it('should include required calendar properties', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('VERSION:2.0')
      expect(result.content).toContain('PRODID:-//Atlas//Session Export//EN')
      expect(result.content).toContain('CALSCALE:GREGORIAN')
    })

    it('should include DTSTAMP for each event', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('DTSTAMP:')
    })

    it('should include CATEGORIES for filtering', async () => {
      const result = await useCase.execute()

      expect(result.content).toContain('CATEGORIES:Atlas,Work Session')
    })
  })
})
