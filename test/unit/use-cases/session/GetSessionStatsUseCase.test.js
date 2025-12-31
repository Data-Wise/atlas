/**
 * Tests for GetSessionStatsUseCase
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { GetSessionStatsUseCase } from '../../../../src/use-cases/session/GetSessionStatsUseCase.js'

describe('GetSessionStatsUseCase', () => {
  let useCase
  let mockSessionRepository

  // Helper to create mock sessions
  function createMockSession(overrides = {}) {
    const now = new Date()
    const startTime = overrides.startTime || new Date(now - 60 * 60 * 1000) // 1 hour ago
    const duration = overrides.duration || 30

    return {
      id: overrides.id || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      project: overrides.project || 'test-project',
      startTime,
      endTime: overrides.endTime || new Date(startTime.getTime() + duration * 60 * 1000),
      outcome: overrides.outcome || 'completed',
      estimatedMinutes: overrides.estimatedMinutes || null,
      getDuration: () => duration,
      ...overrides
    }
  }

  beforeEach(() => {
    mockSessionRepository = {
      list: jest.fn().mockResolvedValue([])
    }
    useCase = new GetSessionStatsUseCase(mockSessionRepository)
  })

  describe('execute', () => {
    it('should return empty stats when no sessions', async () => {
      const result = await useCase.execute()

      expect(result.summary.totalSessions).toBe(0)
      expect(result.summary.totalMinutes).toBe(0)
      expect(result.summary.flowPercentage).toBe(0)
      expect(result.streak.current).toBe(0)
    })

    it('should calculate total sessions and time', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 30 }),
        createMockSession({ duration: 45 }),
        createMockSession({ duration: 20 })
      ])

      const result = await useCase.execute()

      expect(result.summary.totalSessions).toBe(3)
      expect(result.summary.totalMinutes).toBe(95)
    })

    it('should calculate flow sessions (>= 15 min)', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 10 }),  // Not flow
        createMockSession({ duration: 15 }),  // Flow
        createMockSession({ duration: 25 }),  // Flow
        createMockSession({ duration: 5 })    // Not flow
      ])

      const result = await useCase.execute()

      expect(result.summary.flowSessions).toBe(2)
      expect(result.summary.flowPercentage).toBe(50)
    })

    it('should calculate completion rate', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ outcome: 'completed' }),
        createMockSession({ outcome: 'completed' }),
        createMockSession({ outcome: 'cancelled' }),
        createMockSession({ outcome: 'completed' })
      ])

      const result = await useCase.execute()

      expect(result.summary.completedSessions).toBe(3)
      expect(result.summary.completionRate).toBe(75)
    })

    it('should use default 7 days when no period specified', async () => {
      await useCase.execute()

      expect(mockSessionRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'startTime',
          order: 'desc'
        })
      )

      const call = mockSessionRepository.list.mock.calls[0][0]
      const now = new Date()
      const daysDiff = Math.round((now - call.since) / (24 * 60 * 60 * 1000))
      expect(daysDiff).toBe(7)
    })

    it('should handle period shortcuts', async () => {
      await useCase.execute({ period: 'week' })
      let call = mockSessionRepository.list.mock.calls[0][0]
      let daysDiff = Math.round((new Date() - call.since) / (24 * 60 * 60 * 1000))
      expect(daysDiff).toBe(7)

      mockSessionRepository.list.mockClear()
      await useCase.execute({ period: 'month' })
      call = mockSessionRepository.list.mock.calls[0][0]
      daysDiff = Math.round((new Date() - call.since) / (24 * 60 * 60 * 1000))
      expect(daysDiff).toBe(30)
    })

    it('should filter by project', async () => {
      await useCase.execute({ project: 'my-project' })

      expect(mockSessionRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'my-project'
        })
      )
    })

    it('should include project in result period', async () => {
      const result = await useCase.execute({ project: 'my-project' })

      expect(result.period.projectFilter).toBe('my-project')
    })
  })

  describe('streak calculation', () => {
    it('should calculate current streak from consecutive days', async () => {
      const today = new Date()
      const yesterday = new Date(today - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(today - 2 * 24 * 60 * 60 * 1000)

      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ startTime: today }),
        createMockSession({ startTime: yesterday }),
        createMockSession({ startTime: twoDaysAgo })
      ])

      const result = await useCase.execute()

      expect(result.streak.current).toBe(3)
    })

    it('should show no streak if last session was before yesterday', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ startTime: threeDaysAgo })
      ])

      const result = await useCase.execute()

      expect(result.streak.current).toBe(0)
    })
  })

  describe('best day calculation', () => {
    it('should find the day with most minutes', async () => {
      const monday = new Date('2025-12-22T10:00:00') // Monday
      const tuesday = new Date('2025-12-23T10:00:00') // Tuesday

      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ startTime: monday, duration: 30 }),
        createMockSession({ startTime: tuesday, duration: 60 }),
        createMockSession({ startTime: tuesday, duration: 30 })
      ])

      const result = await useCase.execute()

      expect(result.bestDay.dayName).toBe('Tuesday')
      expect(result.bestDay.minutes).toBe(90)
    })

    it('should return null when no sessions', async () => {
      const result = await useCase.execute()

      expect(result.bestDay).toBeNull()
    })
  })

  describe('hourly distribution', () => {
    it('should calculate minutes per hour', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({
          startTime: new Date('2025-12-28T09:00:00'),
          duration: 30
        }),
        createMockSession({
          startTime: new Date('2025-12-28T09:30:00'),
          duration: 20
        }),
        createMockSession({
          startTime: new Date('2025-12-28T14:00:00'),
          duration: 45
        })
      ])

      const result = await useCase.execute()

      expect(result.hourlyDistribution).toHaveLength(24)
      expect(result.hourlyDistribution[9]).toBe(50) // 30 + 20 at 9am
      expect(result.hourlyDistribution[14]).toBe(45) // 45 at 2pm
    })
  })

  describe('project breakdown', () => {
    it('should calculate stats per project', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ project: 'atlas', duration: 30 }),
        createMockSession({ project: 'atlas', duration: 20 }),
        createMockSession({ project: 'flow-cli', duration: 45 })
      ])

      const result = await useCase.execute()

      expect(result.byProject).toHaveLength(2)

      const atlasStats = result.byProject.find(p => p.name === 'atlas')
      expect(atlasStats.sessions).toBe(2)
      expect(atlasStats.totalMinutes).toBe(50)

      const flowStats = result.byProject.find(p => p.name === 'flow-cli')
      expect(flowStats.sessions).toBe(1)
      expect(flowStats.totalMinutes).toBe(45)
    })

    it('should sort by total time descending', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ project: 'a', duration: 10 }),
        createMockSession({ project: 'b', duration: 50 }),
        createMockSession({ project: 'c', duration: 30 })
      ])

      const result = await useCase.execute()

      expect(result.byProject[0].name).toBe('b')
      expect(result.byProject[1].name).toBe('c')
      expect(result.byProject[2].name).toBe('a')
    })

    it('should calculate flow percentage per project', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ project: 'atlas', duration: 20 }),  // Flow
        createMockSession({ project: 'atlas', duration: 10 }),  // Not flow
        createMockSession({ project: 'atlas', duration: 25 })   // Flow
      ])

      const result = await useCase.execute()

      const atlasStats = result.byProject.find(p => p.name === 'atlas')
      expect(atlasStats.flowSessions).toBe(2)
      expect(atlasStats.flowPercentage).toBe(67)
    })
  })

  describe('daily breakdown', () => {
    it('should include all days in range', async () => {
      const result = await useCase.execute({ days: 7 })

      expect(result.dailyBreakdown).toHaveLength(7)
    })

    it('should fill in session data for active days', async () => {
      const today = new Date()

      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ startTime: today, duration: 30 }),
        createMockSession({ startTime: today, duration: 25 })
      ])

      const result = await useCase.execute({ days: 7 })

      const todayEntry = result.dailyBreakdown[0] // Most recent first
      expect(todayEntry.sessions).toBe(2)
      expect(todayEntry.minutes).toBe(55)
    })
  })

  describe('input normalization', () => {
    it('should handle invalid days gracefully', async () => {
      const result = await useCase.execute({ days: 'invalid' })

      expect(result.period.days).toBe(7) // Falls back to default
    })

    it('should handle negative days', async () => {
      const result = await useCase.execute({ days: -5 })

      expect(result.period.days).toBe(7) // Falls back to default
    })

    it('should handle zero days', async () => {
      const result = await useCase.execute({ days: 0 })

      expect(result.period.days).toBe(7) // Falls back to default
    })
  })

  describe('estimation stats calculation', () => {
    it('should return hasData: false when no sessions have estimates', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 30 }),
        createMockSession({ duration: 45 })
      ])

      const result = await useCase.execute()

      expect(result.estimation.hasData).toBe(false)
      expect(result.estimation.sessionsWithEstimates).toBe(0)
      expect(result.estimation.message).toBe('No sessions with time estimates yet')
    })

    it('should only count completed sessions with estimates', async () => {
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 30, estimatedMinutes: 25, outcome: 'completed' }),
        createMockSession({ duration: 30, estimatedMinutes: 25, outcome: 'cancelled' }), // Not counted
        createMockSession({ duration: 30, outcome: 'completed' }) // No estimate
      ])

      const result = await useCase.execute()

      expect(result.estimation.hasData).toBe(true)
      expect(result.estimation.sessionsWithEstimates).toBe(1)
    })

    it('should calculate underestimate bias correctly', async () => {
      // Estimated 20 min, took 30 min = underestimate by 50%
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 30, estimatedMinutes: 20, outcome: 'completed' })
      ])

      const result = await useCase.execute()

      expect(result.estimation.hasData).toBe(true)
      expect(result.estimation.averagePercentageOff).toBe(50) // (30-20)/20 * 100
      expect(result.estimation.bias).toBe('underestimate')
      expect(result.estimation.underestimates).toBe(1)
      expect(result.estimation.overestimates).toBe(0)
    })

    it('should calculate overestimate bias correctly', async () => {
      // Estimated 40 min, took 20 min = overestimate by 50%
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 20, estimatedMinutes: 40, outcome: 'completed' })
      ])

      const result = await useCase.execute()

      expect(result.estimation.hasData).toBe(true)
      expect(result.estimation.averagePercentageOff).toBe(-50) // (20-40)/40 * 100
      expect(result.estimation.bias).toBe('overestimate')
      expect(result.estimation.underestimates).toBe(0)
      expect(result.estimation.overestimates).toBe(1)
    })

    it('should count accurate estimates (within 10%)', async () => {
      // Estimated 30 min, took 32 min = 6.7% off (accurate)
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 32, estimatedMinutes: 30, outcome: 'completed' })
      ])

      const result = await useCase.execute()

      expect(result.estimation.accurate).toBe(1)
      expect(result.estimation.accuracyRate).toBe(100)
    })

    it('should calculate average across multiple sessions', async () => {
      mockSessionRepository.list.mockResolvedValue([
        // Session 1: estimated 20, actual 30 = +50% off
        createMockSession({ duration: 30, estimatedMinutes: 20, outcome: 'completed' }),
        // Session 2: estimated 40, actual 20 = -50% off
        createMockSession({ duration: 20, estimatedMinutes: 40, outcome: 'completed' })
      ])

      const result = await useCase.execute()

      expect(result.estimation.sessionsWithEstimates).toBe(2)
      expect(result.estimation.averagePercentageOff).toBe(0) // (50 + -50) / 2
      expect(result.estimation.bias).toBe('balanced')
    })

    it('should generate positive message for high accuracy', async () => {
      // All within 10%
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 30, estimatedMinutes: 30, outcome: 'completed' }),
        createMockSession({ duration: 31, estimatedMinutes: 30, outcome: 'completed' }),
        createMockSession({ duration: 29, estimatedMinutes: 30, outcome: 'completed' })
      ])

      const result = await useCase.execute()

      expect(result.estimation.accuracyRate).toBe(100)
      expect(result.estimation.message).toContain('Great estimation')
    })

    it('should suggest buffer for chronic underestimators', async () => {
      // Consistently underestimate by >20%
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 40, estimatedMinutes: 20, outcome: 'completed' }),
        createMockSession({ duration: 50, estimatedMinutes: 25, outcome: 'completed' })
      ])

      const result = await useCase.execute()

      expect(result.estimation.bias).toBe('underestimate')
      expect(result.estimation.message).toContain('underestimate')
      expect(result.estimation.message).toContain('buffer')
    })

    it('should encourage overestimators', async () => {
      // Consistently overestimate by >20%
      mockSessionRepository.list.mockResolvedValue([
        createMockSession({ duration: 15, estimatedMinutes: 30, outcome: 'completed' }),
        createMockSession({ duration: 20, estimatedMinutes: 40, outcome: 'completed' })
      ])

      const result = await useCase.execute()

      expect(result.estimation.bias).toBe('overestimate')
      expect(result.estimation.message).toContain('overestimate')
      expect(result.estimation.message).toContain('faster than you think')
    })
  })
})
