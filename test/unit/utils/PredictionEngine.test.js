import { PredictionEngine } from '../../../src/utils/PredictionEngine.js'

function completedSession(project, durationMinutes) {
  return {
    project,
    getDuration: () => durationMinutes,
    outcome: 'completed',
    state: { isActive: () => false, isEnded: () => true },
  }
}

function cancelledSession(project, durationMinutes) {
  return {
    project,
    getDuration: () => durationMinutes,
    outcome: 'cancelled',
    state: { isActive: () => false, isEnded: () => true },
  }
}

describe('PredictionEngine', () => {
  describe('no history', () => {
    it('returns calibrationFactor 1.0 with zero history for project', () => {
      const engine = new PredictionEngine([completedSession('other', 30)])
      const result = engine.calibrate('atlas', 30)
      expect(result.calibrationFactor).toBe(1.0)
      expect(result.confidence).toBe('low')
      expect(result.adjustedEstimate).toBe(30)
      expect(result.historicalN).toBe(0)
    })

    it('ignores cancelled sessions', () => {
      const engine = new PredictionEngine([cancelledSession('atlas', 60)])
      const result = engine.calibrate('atlas', 30)
      expect(result.historicalN).toBe(0)
    })
  })

  describe('calibration factor', () => {
    it('factor > 1 when historical sessions run longer than proposed', () => {
      // Sessions average 60 min; proposed 30 min → raw factor = 2.0
      const sessions = Array.from({ length: 10 }, () => completedSession('atlas', 60))
      const { calibrationFactor } = new PredictionEngine(sessions).calibrate('atlas', 30)
      expect(calibrationFactor).toBeGreaterThan(1)
    })

    it('factor < 1 when historical sessions run shorter than proposed', () => {
      // Sessions average 15 min; proposed 30 min → raw factor = 0.5
      const sessions = Array.from({ length: 10 }, () => completedSession('atlas', 15))
      const { calibrationFactor } = new PredictionEngine(sessions).calibrate('atlas', 30)
      expect(calibrationFactor).toBeLessThan(1)
    })

    it('Bayesian prior pulls extreme factor toward 1.0 with n=1', () => {
      // 1 session of 120 min proposed 30 → raw = 4.0; Bayesian: (3*1+1*4)/4 = 1.75
      const sessions = [completedSession('atlas', 120)]
      const { calibrationFactor } = new PredictionEngine(sessions).calibrate('atlas', 30)
      expect(calibrationFactor).toBeLessThan(4.0)
      expect(calibrationFactor).toBeGreaterThan(1.0)
      expect(calibrationFactor).toBeCloseTo(1.75, 1)
    })
  })

  describe('confidence thresholds', () => {
    it('confidence = "low" for n < 5', () => {
      const sessions = Array.from({ length: 3 }, () => completedSession('atlas', 30))
      const { confidence } = new PredictionEngine(sessions).calibrate('atlas', 30)
      expect(confidence).toBe('low')
    })

    it('confidence = "medium" for 5 <= n < 10', () => {
      const sessions = Array.from({ length: 7 }, () => completedSession('atlas', 30))
      const { confidence } = new PredictionEngine(sessions).calibrate('atlas', 30)
      expect(confidence).toBe('medium')
    })

    it('confidence = "high" for n >= 10', () => {
      const sessions = Array.from({ length: 12 }, () => completedSession('atlas', 30))
      const { confidence } = new PredictionEngine(sessions).calibrate('atlas', 30)
      expect(confidence).toBe('high')
    })
  })

  describe('input validation', () => {
    it('throws RangeError for proposedDurationMinutes <= 0', () => {
      const engine = new PredictionEngine([])
      expect(() => engine.calibrate('atlas', 0)).toThrow(RangeError)
      expect(() => engine.calibrate('atlas', -5)).toThrow(RangeError)
      expect(() => engine.calibrate('atlas', 0)).toThrow('proposedDurationMinutes must be > 0')
    })
  })

  describe('outlier exclusion', () => {
    it('excludes outlier sessions (>3σ from mean) from the calibration', () => {
      // 9 sessions at 30 min, 1 outlier at 10000 min
      const sessions = [
        ...Array.from({ length: 9 }, () => completedSession('atlas', 30)),
        completedSession('atlas', 10000),
      ]
      const result = new PredictionEngine(sessions).calibrate('atlas', 30)
      // Without outlier removal, mean would be vastly inflated
      // With removal, factor should be near 1.0 (30 min actual vs 30 min proposed)
      expect(result.calibrationFactor).toBeLessThan(2.0)
      expect(result.outliersExcluded).toBeGreaterThan(0)
    })
  })
})
