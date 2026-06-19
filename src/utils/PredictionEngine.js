/**
 * PredictionEngine
 *
 * Per-project time calibration via Bayesian-blended historical session data.
 * Compares proposed duration against actual session durations for a project,
 * returning a calibration factor with confidence level.
 */

const PRIOR_WEIGHT = 3

export class PredictionEngine {
  constructor(sessions) {
    this._sessions = sessions || []
  }

  /**
   * @param {string} projectName
   * @param {number} proposedDurationMinutes
   * @returns {{ calibrationFactor: number, confidence: string, adjustedEstimate: number, historicalN: number, outliersExcluded?: number }}
   */
  calibrate(projectName, proposedDurationMinutes) {
    if (proposedDurationMinutes <= 0) {
      throw new RangeError('proposedDurationMinutes must be > 0')
    }

    // Filter to completed sessions for this project with positive duration
    const projectSessions = this._sessions.filter(s => {
      const matchesProject = s.project === projectName
      const isCompleted = s.outcome === 'completed'
      const dur = typeof s.getDuration === 'function' ? s.getDuration() : 0
      return matchesProject && isCompleted && dur > 0
    })

    if (projectSessions.length === 0) {
      return {
        calibrationFactor: 1.0,
        confidence: 'low',
        adjustedEstimate: proposedDurationMinutes,
        historicalN: 0,
      }
    }

    const durations = projectSessions.map(s => s.getDuration())

    // Remove outliers (> 3σ from mean)
    const { filtered, outliersExcluded } = this._removeOutliers(durations)

    const n = filtered.length
    const meanActual = filtered.reduce((a, b) => a + b, 0) / n
    const empiricalFactor = meanActual / proposedDurationMinutes

    // Bayesian blend toward prior of 1.0
    const calibrationFactor = Math.round(((PRIOR_WEIGHT * 1.0 + n * empiricalFactor) / (PRIOR_WEIGHT + n)) * 100) / 100

    const confidence = n >= 10 ? 'high' : n >= 5 ? 'medium' : 'low'

    const adjustedEstimate = Math.max(1, Math.floor(proposedDurationMinutes * calibrationFactor))

    const result = { calibrationFactor, confidence, adjustedEstimate, historicalN: n }
    if (outliersExcluded > 0) result.outliersExcluded = outliersExcluded

    return result
  }

  _removeOutliers(durations) {
    if (durations.length < 2) {
      return { filtered: durations, outliersExcluded: 0 }
    }

    // Use median-based MAD (Median Absolute Deviation) for robust outlier detection.
    // Classical mean/σ fails with extreme single outliers because the outlier inflates σ.
    const sorted = [...durations].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

    const absDeviations = durations.map(v => Math.abs(v - median)).sort((a, b) => a - b)
    const madMid = Math.floor(absDeviations.length / 2)
    const mad = absDeviations.length % 2 === 0
      ? (absDeviations[madMid - 1] + absDeviations[madMid]) / 2
      : absDeviations[madMid]

    if (mad === 0) {
      if (median === 0) {
        // All values are zero — no outliers possible
        return { filtered: durations, outliersExcluded: 0 }
      }
      // MAD = 0 means most values are at the median but there may be extreme outliers.
      // Fall back to a ratio threshold: anything > 10x or < 0.1x the median is an outlier.
      const filtered = durations.filter(v => v <= median * 10 && v >= median * 0.1)
      return { filtered, outliersExcluded: durations.length - filtered.length }
    }

    // Robust Z-score: |0.6745 * (xi - median) / MAD| > 3 → outlier
    const filtered = durations.filter(v => (0.6745 * Math.abs(v - median)) / mad <= 3)
    return { filtered, outliersExcluded: durations.length - filtered.length }
  }
}
