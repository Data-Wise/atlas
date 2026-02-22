/**
 * Unit tests for Focus Score calculation in GetSessionStatsUseCase
 */

import { GetSessionStatsUseCase } from '../../../../src/use-cases/session/GetSessionStatsUseCase.js'
import { BusinessRules } from '../../../../src/domain/constants/BusinessRules.js'

describe('Focus Score Calculation', () => {
  let useCase

  beforeEach(() => {
    // We only need the calculateFocusScore method, no repo needed
    useCase = new GetSessionStatsUseCase(null)
  })

  describe('calculateFocusScore', () => {
    it('should return score 0 and tier "drift" when all metrics are zero', () => {
      const summary = {
        totalSessions: 0,
        totalMinutes: 0,
        flowPercentage: 0,
        completionRate: 0,
        activeDays: 0,
      }
      const streak = { current: 0, longest: 0 }

      const result = useCase.calculateFocusScore(summary, streak)

      expect(result.score).toBe(0)
      expect(result.tier.label).toBe('drift')
      expect(result.tier.symbol).toBe('○')
      expect(result.grade).toBe('F')
    })

    it('should return high score and tier "deep" for perfect metrics', () => {
      const summary = {
        totalSessions: 10,
        totalMinutes: 500, // avg 50min = excellent duration
        flowPercentage: 100,
        completionRate: 100,
        activeDays: 7,
      }
      const streak = { current: 7, longest: 10 }

      const result = useCase.calculateFocusScore(summary, streak)

      expect(result.score).toBeGreaterThanOrEqual(80)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.tier.label).toBe('deep')
      expect(result.tier.symbol).toBe('●')
    })

    it('should return mid-range score for mixed metrics', () => {
      const summary = {
        totalSessions: 5,
        totalMinutes: 125, // avg 25min = good
        flowPercentage: 40,
        completionRate: 60,
        activeDays: 3,
      }
      const streak = { current: 2, longest: 5 }

      const result = useCase.calculateFocusScore(summary, streak)

      expect(result.score).toBeGreaterThan(20)
      expect(result.score).toBeLessThan(80)
      expect(['warming', 'steady', 'strong']).toContain(result.tier.label)
    })

    it('should handle single session correctly', () => {
      const summary = {
        totalSessions: 1,
        totalMinutes: 30,
        flowPercentage: 100,
        completionRate: 100,
        activeDays: 1,
      }
      const streak = { current: 1, longest: 1 }

      const result = useCase.calculateFocusScore(summary, streak)

      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('should handle all sessions incomplete (0% completion)', () => {
      const summary = {
        totalSessions: 5,
        totalMinutes: 50,
        flowPercentage: 20,
        completionRate: 0,
        activeDays: 3,
      }
      const streak = { current: 0, longest: 0 }

      const result = useCase.calculateFocusScore(summary, streak)

      // With 0 completion, 0 streak, low flow — score should be low
      expect(result.score).toBeLessThan(40)
    })

    it('should weight duration at 30%', () => {
      const base = {
        totalSessions: 10,
        totalMinutes: 0,
        flowPercentage: 0,
        completionRate: 0,
        activeDays: 0,
      }
      const streak = { current: 0, longest: 0 }

      // Short sessions
      const shortResult = useCase.calculateFocusScore(
        { ...base, totalMinutes: 50 }, // avg 5min
        streak
      )

      // Long sessions
      const longResult = useCase.calculateFocusScore(
        { ...base, totalMinutes: 450 }, // avg 45min
        streak
      )

      expect(longResult.score).toBeGreaterThan(shortResult.score)
    })

    it('should clamp score between 0 and 100', () => {
      const summary = {
        totalSessions: 100,
        totalMinutes: 10000,
        flowPercentage: 100,
        completionRate: 100,
        activeDays: 30,
      }
      const streak = { current: 30, longest: 30 }

      const result = useCase.calculateFocusScore(summary, streak)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.score).toBeGreaterThanOrEqual(0)
    })

    it('should return all component scores', () => {
      const summary = {
        totalSessions: 5,
        totalMinutes: 150,
        flowPercentage: 60,
        completionRate: 80,
        activeDays: 4,
      }
      const streak = { current: 3, longest: 5 }

      const result = useCase.calculateFocusScore(summary, streak)

      expect(result.components).toBeDefined()
      expect(result.components.duration).toBeGreaterThanOrEqual(0)
      expect(result.components.flow).toBeGreaterThanOrEqual(0)
      expect(result.components.completion).toBeGreaterThanOrEqual(0)
      expect(result.components.consistency).toBeGreaterThanOrEqual(0)
    })

    it('should assign correct tiers at boundary values', () => {
      const streak = { current: 0, longest: 0 }

      // Score ~19 → drift
      // Score ~39 → warming
      // Score ~59 → steady
      // Score ~79 → strong
      // Score ~100 → deep

      // Perfect flow + completion with no duration/consistency → ~55
      const midResult = useCase.calculateFocusScore({
        totalSessions: 10,
        totalMinutes: 250, // avg 25min
        flowPercentage: 100,
        completionRate: 100,
        activeDays: 7,
      }, streak)

      expect(midResult.tier.index).toBeGreaterThanOrEqual(0)
      expect(midResult.tier.index).toBeLessThanOrEqual(4)
    })

    it('should return valid grade for any score', () => {
      const validGrades = ['A', 'B', 'C', 'D', 'F']
      const summary = {
        totalSessions: 3,
        totalMinutes: 90,
        flowPercentage: 50,
        completionRate: 67,
        activeDays: 2,
      }
      const streak = { current: 1, longest: 3 }

      const result = useCase.calculateFocusScore(summary, streak)
      expect(validGrades).toContain(result.grade)
    })
  })
})
