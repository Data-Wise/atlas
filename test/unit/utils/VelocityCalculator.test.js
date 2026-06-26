import { VelocityCalculator } from '../../../src/utils/VelocityCalculator.js'

// Helper: create a mock session with a given startTime and duration in minutes
function mockSession(startTime, durationMinutes) {
  return {
    startTime,
    getDuration: () => durationMinutes,
    outcome: 'completed',
    state: { isActive: () => false, isEnded: () => true },
  }
}

// Helper: get the Monday of the ISO week N weeks before the current week
function weeksAgoMonday(n) {
  // Build dates in LOCAL time to match VelocityCalculator's local-date ISO-week
  // bucketing. UTC-midnight dates shift to the previous day in negative-offset
  // timezones (e.g. ABQ, UTC-6/7) and bucket into the wrong week — the source of
  // the prior date-dependent flakiness.
  const now = new Date()
  const day = now.getDay() || 7
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  thisMonday.setDate(thisMonday.getDate() - (day - 1))
  const target = new Date(thisMonday)
  target.setDate(target.getDate() - n * 7)
  return target
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

describe('VelocityCalculator', () => {
  describe('empty input', () => {
    it('returns stable defaults for empty array', () => {
      const calc = new VelocityCalculator([])
      const result = calc.calculate()
      expect(result.weeksData).toEqual([])
      expect(result.trend).toBe('stable')
      expect(result.sparkline).toBe('')
    })
  })

  describe('week bucketing', () => {
    it('returns up to 4 weeks when given 4 weeks of sessions', () => {
      const sessions = []
      for (let w = 4; w >= 1; w--) {
        const monday = weeksAgoMonday(w)
        sessions.push(mockSession(addDays(monday, 1), 60)) // Tuesday of each past week
      }
      const calc = new VelocityCalculator(sessions)
      const { weeksData } = calc.calculate()
      expect(weeksData.length).toBe(4)
    })

    it('returns fewer weeks when history is shorter than 4 weeks', () => {
      const monday = weeksAgoMonday(2)
      const sessions = [mockSession(addDays(monday, 0), 60)]
      const calc = new VelocityCalculator(sessions)
      const { weeksData } = calc.calculate()
      expect(weeksData.length).toBeLessThan(4)
      expect(weeksData.length).toBeGreaterThan(0)
    })
  })

  describe('focusHours computation', () => {
    it('computes focusHours as sum of durations in hours', () => {
      const monday = weeksAgoMonday(4)
      // 3 sessions × 60 min = 3 hours
      const sessions = [
        mockSession(addDays(monday, 0), 60),
        mockSession(addDays(monday, 1), 60),
        mockSession(addDays(monday, 2), 60),
      ]
      const calc = new VelocityCalculator(sessions)
      const { weeksData } = calc.calculate()
      const week = weeksData.find(w => w.sessionCount === 3)
      expect(week).toBeDefined()
      expect(week.focusHours).toBeCloseTo(3, 1)
    })

    it('skips sessions with null/zero duration', () => {
      const monday = weeksAgoMonday(4)
      const sessions = [
        mockSession(addDays(monday, 0), 0),  // zero duration — skipped
        mockSession(addDays(monday, 1), 90),
      ]
      const calc = new VelocityCalculator(sessions)
      const { weeksData } = calc.calculate()
      const week = weeksData.find(w => w.week)
      expect(week.focusHours).toBeCloseTo(1.5, 1)
    })
  })

  describe('consistency', () => {
    it('computes consistency as distinct days / 7', () => {
      const monday = weeksAgoMonday(4)
      // 3 sessions on 3 different days → consistency = 3/7
      const sessions = [
        mockSession(addDays(monday, 0), 60),
        mockSession(addDays(monday, 1), 60),
        mockSession(addDays(monday, 2), 60),
      ]
      const calc = new VelocityCalculator(sessions)
      const { weeksData } = calc.calculate()
      const week = weeksData.find(w => w.sessionCount === 3)
      expect(week.consistency).toBeCloseTo(3 / 7, 2)
    })
  })

  describe('trend detection', () => {
    it('returns "up" when recent 2 weeks exceed earlier 2 weeks by > 10%', () => {
      // Weeks 3-4 ago: 5h each; weeks 1-2 ago: 6h each → +20% → up
      const sessions = []
      for (let w = 4; w >= 3; w--) {
        sessions.push(mockSession(addDays(weeksAgoMonday(w), 1), 300)) // 5h
      }
      for (let w = 2; w >= 1; w--) {
        sessions.push(mockSession(addDays(weeksAgoMonday(w), 1), 360)) // 6h
      }
      const { trend } = new VelocityCalculator(sessions).calculate()
      expect(trend).toBe('up')
    })

    it('returns "down" when recent 2 weeks lag earlier 2 weeks by > 10%', () => {
      // Weeks 3-4 ago: 6h each; weeks 1-2 ago: 5h each → -17% → down
      const sessions = []
      for (let w = 4; w >= 3; w--) {
        sessions.push(mockSession(addDays(weeksAgoMonday(w), 1), 360)) // 6h
      }
      for (let w = 2; w >= 1; w--) {
        sessions.push(mockSession(addDays(weeksAgoMonday(w), 1), 300)) // 5h
      }
      const { trend } = new VelocityCalculator(sessions).calculate()
      expect(trend).toBe('down')
    })

    it('returns "stable" when delta is within ±10%', () => {
      // All weeks: 300 min = 5h → 0% delta → stable
      const sessions = []
      for (let w = 4; w >= 1; w--) {
        sessions.push(mockSession(addDays(weeksAgoMonday(w), 1), 300))
      }
      const { trend } = new VelocityCalculator(sessions).calculate()
      expect(trend).toBe('stable')
    })

    it('returns "stable" for fewer than 2 weeks of data', () => {
      const sessions = [mockSession(addDays(weeksAgoMonday(1), 1), 300)]
      const { trend } = new VelocityCalculator(sessions).calculate()
      expect(trend).toBe('stable')
    })
  })
})
