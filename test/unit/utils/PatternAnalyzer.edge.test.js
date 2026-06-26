/**
 * PatternAnalyzer — edge cases (v0.10 temporal intelligence).
 *
 * Pins the well-defined boundaries: the 15-minute flow threshold (>=15 is
 * flow), the MIN_OBSERVATIONS=3 floor for best/dead-zone ranking, tie-breaking
 * (earliest slot wins), fractional flow rates, and null flow-rate for slots
 * with no sessions. Uses the fixed 2026-01-04 (Sunday) base so day/hour
 * bucketing is deterministic and timezone-stable for whole local hours.
 */
import { describe, test, expect } from '@jest/globals'
import { PatternAnalyzer } from '../../../src/utils/PatternAnalyzer.js'

const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }

function sessionOn(dayName, hour, durationMinutes = 60) {
  const base = new Date(2026, 0, 4) // 2026-01-04 is a Sunday (local)
  base.setDate(base.getDate() + DAY_INDEX[dayName])
  base.setHours(hour, 0, 0, 0)
  return {
    startTime: new Date(base),
    getDuration: () => durationMinutes,
    outcome: 'completed',
    state: { isActive: () => false, isEnded: () => true }
  }
}

const repeat = (n, make) => Array.from({ length: n }, make)

describe('PatternAnalyzer — flow threshold boundary (15 min)', () => {
  test('exactly 15-minute sessions count as flow; 14-minute do not', () => {
    const sessions = [
      ...repeat(3, () => sessionOn('Tuesday', 9, 15)), // flow
      ...repeat(3, () => sessionOn('Monday', 9, 14)) // not flow
    ]
    const { bestDay, deadZones, flowRateByDay } = new PatternAnalyzer(sessions).analyze()
    expect(flowRateByDay.Tuesday).toBe(1)
    expect(bestDay).toBe('Tuesday')
    expect(deadZones).toContainEqual({ day: 'Monday', type: 'day' }) // 3 obs, 0 flow
  })
})

describe('PatternAnalyzer — MIN_OBSERVATIONS floor and ranking', () => {
  test('exactly 3 observations qualify an hour for bestHour; 2 do not', () => {
    const sessions = [
      ...repeat(3, () => sessionOn('Monday', 9, 60)), // 3 obs, all flow
      ...repeat(2, () => sessionOn('Monday', 14, 60)) // only 2 obs → excluded
    ]
    const { bestHour } = new PatternAnalyzer(sessions).analyze()
    expect(bestHour).toBe(9)
  })

  test('ties break to the earliest day', () => {
    const sessions = [
      ...repeat(3, () => sessionOn('Wednesday', 10, 60)), // rate 1
      ...repeat(3, () => sessionOn('Monday', 10, 60)) // rate 1, earlier in week
    ]
    const { bestDay } = new PatternAnalyzer(sessions).analyze()
    expect(bestDay).toBe('Monday')
  })
})

describe('PatternAnalyzer — rate semantics', () => {
  test('a mixed slot yields a fractional flow rate', () => {
    const sessions = [
      sessionOn('Monday', 11, 60), // flow
      sessionOn('Monday', 11, 60), // flow
      sessionOn('Monday', 11, 5) // not flow
    ]
    const { flowRateByHour } = new PatternAnalyzer(sessions).analyze()
    expect(flowRateByHour[11]).toBeCloseTo(2 / 3, 5)
  })

  test('an hour with no sessions has a null flow rate (not 0)', () => {
    const sessions = repeat(3, () => sessionOn('Monday', 9, 60))
    const { flowRateByHour } = new PatternAnalyzer(sessions).analyze()
    expect(flowRateByHour[3]).toBeNull()
    expect(flowRateByHour[9]).toBe(1)
  })
})
