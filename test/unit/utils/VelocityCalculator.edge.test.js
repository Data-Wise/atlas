/**
 * VelocityCalculator — edge cases (v0.10 temporal intelligence).
 *
 * Two robust, well-defined cases that avoid the timezone/week-boundary
 * fragility the source warns about: a single session aggregates to one
 * sessionCount with hours = minutes/60 and a 'stable' trend (<2 weeks), and a
 * window of only zero-duration sessions collapses to the empty-input result.
 * Dates are built in LOCAL time to match the calculator's ISO-week bucketing.
 */
import { describe, test, expect } from '@jest/globals'
import { VelocityCalculator } from '../../../src/utils/VelocityCalculator.js'

function mockSession(startTime, durationMinutes) {
  return {
    startTime,
    getDuration: () => durationMinutes,
    outcome: 'completed',
    state: { isActive: () => false, isEnded: () => true }
  }
}

function weeksAgoMonday(n) {
  const now = new Date()
  const day = now.getDay() || 7
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  thisMonday.setDate(thisMonday.getDate() - (day - 1))
  const target = new Date(thisMonday)
  target.setDate(target.getDate() - n * 7)
  return target
}

describe('VelocityCalculator — edge cases', () => {
  test('a single session aggregates to one count and minutes/60 hours, trend stable', () => {
    const result = new VelocityCalculator([mockSession(weeksAgoMonday(1), 90)]).calculate()
    const totalCount = result.weeksData.reduce((s, w) => s + w.sessionCount, 0)
    const totalHours = result.weeksData.reduce((s, w) => s + w.focusHours, 0)
    expect(totalCount).toBe(1)
    expect(totalHours).toBeCloseTo(1.5, 5) // 90 minutes
    expect(result.trend).toBe('stable') // fewer than 2 weeks of data
    expect(result.sparkline.length).toBeGreaterThan(0)
  })

  test('a window of only zero-duration sessions collapses to the empty result', () => {
    const sessions = [
      mockSession(weeksAgoMonday(1), 0),
      mockSession(weeksAgoMonday(2), 0)
    ]
    const result = new VelocityCalculator(sessions).calculate()
    expect(result.weeksData).toEqual([])
    expect(result.trend).toBe('stable')
    expect(result.sparkline).toBe('')
  })
})
