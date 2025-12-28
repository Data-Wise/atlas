/**
 * Tests for StatsPresenter
 */

import { describe, it, expect } from '@jest/globals'
import {
  formatStatsTable,
  formatStatsJson,
  formatStatsText,
  formatHourlySparkline,
  formatStreakDisplay,
  formatFlowDisplay,
  getPeriodLabel
} from '../../../../src/adapters/presenters/StatsPresenter.js'

describe('StatsPresenter', () => {
  // Helper to create mock stats object
  function createMockStats(overrides = {}) {
    return {
      period: {
        days: 7,
        startDate: new Date('2025-12-21'),
        endDate: new Date('2025-12-28'),
        projectFilter: null,
        ...overrides.period
      },
      summary: {
        totalSessions: 10,
        totalMinutes: 300,
        flowSessions: 6,
        flowPercentage: 60,
        completedSessions: 8,
        completionRate: 80,
        dailyAverageMinutes: 43,
        activeDays: 7,
        ...overrides.summary
      },
      streak: {
        current: 3,
        longest: 10,
        display: '🔥 3 days',
        message: 'Building momentum!',
        ...overrides.streak
      },
      bestDay: {
        date: '2025-12-27',
        dayName: 'Friday',
        minutes: 120,
        sessions: 4,
        ...overrides.bestDay
      },
      hourlyDistribution: overrides.hourlyDistribution || Array(24).fill(0),
      byProject: overrides.byProject || [
        { name: 'atlas', sessions: 5, totalMinutes: 150, flowPercentage: 80 },
        { name: 'flow-cli', sessions: 3, totalMinutes: 100, flowPercentage: 67 }
      ],
      dailyBreakdown: overrides.dailyBreakdown || []
    }
  }

  describe('formatStatsTable', () => {
    it('should include header with period', () => {
      const stats = createMockStats()
      const output = formatStatsTable(stats)

      expect(output).toContain('Session Analytics')
      expect(output).toContain('Last 7 Days')
    })

    it('should include summary section', () => {
      const stats = createMockStats()
      const output = formatStatsTable(stats)

      expect(output).toContain('Total Sessions:')
      expect(output).toContain('10')
      expect(output).toContain('Total Time:')
      expect(output).toContain('5h')
      expect(output).toContain('Flow Sessions:')
      expect(output).toContain('60%')
    })

    it('should include streak when active', () => {
      const stats = createMockStats()
      const output = formatStatsTable(stats)

      expect(output).toContain('Streak:')
      expect(output).toContain('🔥 3 days')
      expect(output).toContain('longest: 10')
    })

    it('should show no active streak message when streak is 0', () => {
      const stats = createMockStats({ streak: { current: 0, longest: 5 } })
      const output = formatStatsTable(stats)

      expect(output).toContain('No active streak')
    })

    it('should include best day', () => {
      const stats = createMockStats()
      const output = formatStatsTable(stats)

      expect(output).toContain('Best Day:')
      expect(output).toContain('Friday')
      expect(output).toContain('2h')
    })

    it('should include project breakdown table', () => {
      const stats = createMockStats()
      const output = formatStatsTable(stats)

      expect(output).toContain('By Project:')
      expect(output).toContain('atlas')
      expect(output).toContain('flow-cli')
      expect(output).toContain('Sessions')
      expect(output).toContain('Time')
      expect(output).toContain('Flow %')
    })

    it('should include project filter in header when filtering', () => {
      const stats = createMockStats({ period: { projectFilter: 'atlas' } })
      const output = formatStatsTable(stats)

      expect(output).toContain('atlas (Last 7 Days)')
    })

    it('should not show project breakdown when filtering by project', () => {
      const stats = createMockStats({ period: { projectFilter: 'atlas' } })
      const output = formatStatsTable(stats)

      expect(output).not.toContain('By Project:')
    })
  })

  describe('formatStatsJson', () => {
    it('should return valid JSON', () => {
      const stats = createMockStats()
      const output = formatStatsJson(stats)

      expect(() => JSON.parse(output)).not.toThrow()
    })

    it('should include all stats fields', () => {
      const stats = createMockStats()
      const output = formatStatsJson(stats)
      const parsed = JSON.parse(output)

      expect(parsed).toHaveProperty('period')
      expect(parsed).toHaveProperty('summary')
      expect(parsed).toHaveProperty('streak')
      expect(parsed).toHaveProperty('bestDay')
      expect(parsed).toHaveProperty('byProject')
    })
  })

  describe('formatStatsText', () => {
    it('should return concise summary', () => {
      const stats = createMockStats()
      const output = formatStatsText(stats)

      expect(output).toContain('last 7 days')
      expect(output).toContain('10 sessions')
      expect(output).toContain('60% flow state')
      expect(output).toContain('80% completion')
    })

    it('should include streak when active', () => {
      const stats = createMockStats()
      const output = formatStatsText(stats)

      expect(output).toContain('🔥 3 days')
    })

    it('should not include streak line when streak is 0', () => {
      const stats = createMockStats({ streak: { current: 0 } })
      const output = formatStatsText(stats)

      expect(output).not.toContain('🔥')
    })

    it('should include project filter when present', () => {
      const stats = createMockStats({ period: { projectFilter: 'atlas' } })
      const output = formatStatsText(stats)

      expect(output).toContain('(atlas)')
    })
  })

  describe('formatHourlySparkline', () => {
    it('should return 24-character sparkline', () => {
      const hourly = Array(24).fill(10)
      const output = formatHourlySparkline(hourly)

      expect(output).toHaveLength(24)
    })

    it('should rotate to start at 6am', () => {
      // Create data with peak at midnight (hour 0)
      const hourly = Array(24).fill(0)
      hourly[0] = 100 // Midnight peak

      const output = formatHourlySparkline(hourly)

      // After rotation, midnight (0) should be at position 18 (24 - 6 = 18)
      expect(output[18]).toBe('█')
    })

    it('should show variation with sparkline chars', () => {
      const hourly = [0, 10, 20, 30, 40, 50, 60, 70, ...Array(16).fill(0)]
      const output = formatHourlySparkline(hourly)

      // Should contain multiple sparkline characters
      expect(output).toMatch(/[▁▂▃▄▅▆▇█]/)
    })
  })

  describe('formatStreakDisplay', () => {
    it('should return gray for no streak', () => {
      const result = formatStreakDisplay({ current: 0 })

      expect(result.display).toBe('No streak')
      expect(result.color).toBe('gray')
    })

    it('should return white for short streaks', () => {
      const result = formatStreakDisplay({ current: 2, display: '🔥 2 days' })

      expect(result.color).toBe('white')
    })

    it('should return yellow for medium streaks', () => {
      const result = formatStreakDisplay({ current: 5, display: '🔥 5 days' })

      expect(result.color).toBe('yellow')
    })

    it('should return green for long streaks', () => {
      const result = formatStreakDisplay({ current: 10, display: '🔥🔥 10 days' })

      expect(result.color).toBe('green')
    })
  })

  describe('formatFlowDisplay', () => {
    it('should show green with target icon for high flow', () => {
      const result = formatFlowDisplay(75)

      expect(result.display).toContain('75%')
      expect(result.display).toContain('🎯')
      expect(result.color).toBe('green')
    })

    it('should show yellow for medium flow', () => {
      const result = formatFlowDisplay(55)

      expect(result.display).toBe('55%')
      expect(result.color).toBe('yellow')
    })

    it('should show gray for low flow', () => {
      const result = formatFlowDisplay(30)

      expect(result.display).toBe('30%')
      expect(result.color).toBe('gray')
    })
  })

  describe('getPeriodLabel', () => {
    it('should return "Today" for 1 day', () => {
      expect(getPeriodLabel(1)).toBe('Today')
    })

    it('should return "This Week" for 7 days', () => {
      expect(getPeriodLabel(7)).toBe('This Week')
    })

    it('should return "This Month" for 30 days', () => {
      expect(getPeriodLabel(30)).toBe('This Month')
    })

    it('should return "This Year" for 365 days', () => {
      expect(getPeriodLabel(365)).toBe('This Year')
    })

    it('should return "Last N Days" for custom periods', () => {
      expect(getPeriodLabel(14)).toBe('Last 14 Days')
      expect(getPeriodLabel(90)).toBe('Last 90 Days')
    })
  })
})
