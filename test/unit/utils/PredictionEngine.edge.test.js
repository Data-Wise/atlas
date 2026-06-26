/**
 * PredictionEngine — edge cases (v0.10 temporal intelligence).
 *
 * Pins the confidence-tier boundaries (n>=10 high, n>=5 medium, else low),
 * the MAD===0 identical-duration path, and a robustness guarantee: the median
 * always survives _removeOutliers, so historicalN>=1 and the calibration
 * factor is always finite (no divide-by-zero on pathological bimodal input).
 */
import { describe, test, expect } from '@jest/globals'
import { PredictionEngine } from '../../../src/utils/PredictionEngine.js'

function completedSession(project, durationMinutes) {
  return {
    project,
    getDuration: () => durationMinutes,
    outcome: 'completed',
    state: { isActive: () => false, isEnded: () => true }
  }
}

// n identical-duration completed sessions: MAD===0, median!==0, so the ratio
// path keeps them all → no outliers removed → historicalN === n. With duration
// equal to the proposed estimate the factor is exactly 1.0, isolating `confidence`.
function nSessions(project, count, duration) {
  return Array.from({ length: count }, () => completedSession(project, duration))
}

describe('PredictionEngine — confidence tier boundaries', () => {
  const cases = [
    { n: 4, expected: 'low' },
    { n: 5, expected: 'medium' },
    { n: 9, expected: 'medium' },
    { n: 10, expected: 'high' }
  ]
  for (const { n, expected } of cases) {
    test(`n=${n} → ${expected}`, () => {
      const engine = new PredictionEngine(nSessions('atlas', n, 30))
      const result = engine.calibrate('atlas', 30)
      expect(result.historicalN).toBe(n)
      expect(result.confidence).toBe(expected)
      expect(result.calibrationFactor).toBe(1.0) // identical to proposed
    })
  }
})

describe('PredictionEngine — outlier paths', () => {
  test('identical durations (MAD=0) exclude nothing', () => {
    const engine = new PredictionEngine(nSessions('atlas', 6, 50))
    const result = engine.calibrate('atlas', 50)
    expect(result.historicalN).toBe(6)
    expect(result.outliersExcluded).toBeUndefined() // 0 → omitted
  })

  test('pathological bimodal input still yields a finite factor (median survives)', () => {
    // [10,10,10,1000,1000] — whatever the filter does, the median is kept,
    // so historicalN>=1 and the factor is a real number, never NaN.
    const sessions = [
      ...nSessions('atlas', 3, 10),
      ...nSessions('atlas', 2, 1000)
    ]
    const result = new PredictionEngine(sessions).calibrate('atlas', 30)
    expect(result.historicalN).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(result.calibrationFactor)).toBe(true)
    expect(Number.isFinite(result.adjustedEstimate)).toBe(true)
  })
})
