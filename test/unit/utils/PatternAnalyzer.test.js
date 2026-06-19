import { PatternAnalyzer } from '../../../src/utils/PatternAnalyzer.js'

// Helper: create a session starting at given hour on a given day name
// duration >= 15 min → qualifies as flow session
function mockSession(dayName, hour, durationMinutes = 60) {
  const days = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }
  const dayOffset = days[dayName]
  // Pick a reference Sunday so we can set exact day-of-week
  const base = new Date(2026, 0, 4) // 2026-01-04 is a Sunday
  base.setDate(base.getDate() + dayOffset)
  base.setHours(hour, 0, 0, 0)
  return {
    startTime: new Date(base),
    getDuration: () => durationMinutes,
    outcome: 'completed',
    state: { isActive: () => false, isEnded: () => true },
  }
}

function shortSession(dayName, hour) {
  return mockSession(dayName, hour, 5) // 5 min — not a flow session
}

describe('PatternAnalyzer', () => {
  describe('empty input', () => {
    it('returns null fields for empty array', () => {
      const result = new PatternAnalyzer([]).analyze()
      expect(result.bestDay).toBeNull()
      expect(result.bestHour).toBeNull()
      expect(result.deadZones).toEqual([])
    })
  })

  describe('bestDay', () => {
    it('bestDay is the day with highest flow rate among days with >= 3 sessions', () => {
      const sessions = [
        // Tuesday: 3 sessions, all flow
        mockSession('Tuesday', 9), mockSession('Tuesday', 10), mockSession('Tuesday', 11),
        // Monday: 3 sessions, no flow
        shortSession('Monday', 9), shortSession('Monday', 10), shortSession('Monday', 11),
      ]
      const { bestDay } = new PatternAnalyzer(sessions).analyze()
      expect(bestDay).toBe('Tuesday')
    })

    it('excludes days with fewer than 3 sessions from bestDay ranking', () => {
      const sessions = [
        // Wednesday: 2 sessions, all flow → excluded from ranking
        mockSession('Wednesday', 9), mockSession('Wednesday', 10),
        // Monday: 3 sessions, all flow
        mockSession('Monday', 9), mockSession('Monday', 10), mockSession('Monday', 11),
      ]
      const { bestDay } = new PatternAnalyzer(sessions).analyze()
      expect(bestDay).toBe('Monday')
    })
  })

  describe('bestHour', () => {
    it('bestHour is the hour with highest flow rate among hours with >= 3 sessions', () => {
      const sessions = [
        // Hour 9: 3 flow sessions
        mockSession('Monday', 9), mockSession('Tuesday', 9), mockSession('Wednesday', 9),
        // Hour 14: 3 short (non-flow) sessions
        shortSession('Monday', 14), shortSession('Tuesday', 14), shortSession('Wednesday', 14),
      ]
      const { bestHour } = new PatternAnalyzer(sessions).analyze()
      expect(bestHour).toBe(9)
    })

    it('excludes hours with fewer than 3 sessions from bestHour ranking', () => {
      const sessions = [
        // Hour 10: 2 flow sessions → excluded
        mockSession('Monday', 10), mockSession('Tuesday', 10),
        // Hour 14: 3 flow sessions
        mockSession('Monday', 14), mockSession('Tuesday', 14), mockSession('Wednesday', 14),
      ]
      const { bestHour } = new PatternAnalyzer(sessions).analyze()
      expect(bestHour).toBe(14)
    })
  })

  describe('deadZones', () => {
    it('includes days with flowRate === 0 and sessionCount >= 3', () => {
      const sessions = [
        shortSession('Friday', 9), shortSession('Friday', 10), shortSession('Friday', 11),
        mockSession('Monday', 9), mockSession('Monday', 10), mockSession('Monday', 11),
      ]
      const { deadZones } = new PatternAnalyzer(sessions).analyze()
      const fridayZone = deadZones.find(z => z.day === 'Friday' && z.type === 'day')
      expect(fridayZone).toBeDefined()
    })

    it('excludes days with flowRate > 0 from deadZones', () => {
      const sessions = [
        mockSession('Tuesday', 9), mockSession('Tuesday', 10), mockSession('Tuesday', 11),
      ]
      const { deadZones } = new PatternAnalyzer(sessions).analyze()
      const tuesdayZone = deadZones.find(z => z.day === 'Tuesday' && z.type === 'day')
      expect(tuesdayZone).toBeUndefined()
    })

    it('excludes days with sessionCount < 3 from deadZones', () => {
      const sessions = [
        shortSession('Saturday', 9), shortSession('Saturday', 10), // only 2 — not a dead zone
      ]
      const { deadZones } = new PatternAnalyzer(sessions).analyze()
      const saturdayZone = deadZones.find(z => z.day === 'Saturday')
      expect(saturdayZone).toBeUndefined()
    })

    it('returns empty deadZones when all sessions are flow sessions', () => {
      const sessions = [
        mockSession('Monday', 9), mockSession('Monday', 10), mockSession('Monday', 11),
      ]
      const { deadZones } = new PatternAnalyzer(sessions).analyze()
      expect(deadZones).toEqual([])
    })
  })

  describe('flowRateByHour and flowRateByDay coverage', () => {
    it('flowRateByHour covers all 24 hours', () => {
      const sessions = [mockSession('Monday', 9)]
      const { flowRateByHour } = new PatternAnalyzer(sessions).analyze()
      expect(Object.keys(flowRateByHour).length).toBe(24)
    })

    it('flowRateByDay covers all 7 days', () => {
      const sessions = [mockSession('Monday', 9)]
      const { flowRateByDay } = new PatternAnalyzer(sessions).analyze()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      for (const day of days) {
        expect(day in flowRateByDay).toBe(true)
      }
    })
  })
})
