/**
 * PatternAnalyzer
 *
 * Identifies day-of-week and hour-of-day productivity windows from session history.
 * Uses flow-state detection (session ran >= 15 min and ended completed) as a proxy
 * for deep-work quality, since isInFlowState() only returns true for active sessions.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const FLOW_THRESHOLD_MINUTES = 15
const MIN_OBSERVATIONS = 3

/**
 * Returns true if an ended session qualifies as a flow session.
 * isInFlowState() only fires for active sessions; this is the analytical equivalent.
 */
function isFlowSession(session) {
  try {
    if (typeof session.isInFlowState === 'function' && session.state && session.state.isActive && session.state.isActive()) {
      return session.isInFlowState()
    }
    // For ended sessions: replicate the business rule without the active-state precondition
    const dur = typeof session.getDuration === 'function' ? session.getDuration() : 0
    return dur >= FLOW_THRESHOLD_MINUTES
  } catch {
    process.stderr.write('[PatternAnalyzer] Warning: could not determine flow state for session\n')
    return false
  }
}

export class PatternAnalyzer {
  constructor(sessions) {
    this._sessions = sessions || []
  }

  analyze() {
    if (this._sessions.length === 0) {
      return {
        bestDay: null,
        bestHour: null,
        deadZones: [],
        flowRateByHour: {},
        flowRateByDay: {},
      }
    }

    // Initialize accumulators
    const byHour = {}
    for (let h = 0; h < 24; h++) {
      byHour[h] = { total: 0, flow: 0 }
    }
    const byDay = {}
    for (const day of DAYS) {
      byDay[day] = { total: 0, flow: 0 }
    }

    for (const session of this._sessions) {
      if (!session.startTime) continue
      const t = session.startTime instanceof Date ? session.startTime : new Date(session.startTime)
      const hour = t.getHours()
      const day = DAYS[t.getDay()]
      const flow = isFlowSession(session) ? 1 : 0

      byHour[hour].total++
      byHour[hour].flow += flow
      byDay[day].total++
      byDay[day].flow += flow
    }

    // Compute flow rates
    const flowRateByHour = {}
    for (let h = 0; h < 24; h++) {
      flowRateByHour[h] = byHour[h].total > 0 ? byHour[h].flow / byHour[h].total : null
    }

    const flowRateByDay = {}
    for (const day of DAYS) {
      flowRateByDay[day] = byDay[day].total > 0 ? byDay[day].flow / byDay[day].total : null
    }

    // Best day: highest flow rate among days with >= 3 sessions
    let bestDay = null
    let bestDayRate = -1
    for (const day of DAYS) {
      if (byDay[day].total >= MIN_OBSERVATIONS && flowRateByDay[day] > bestDayRate) {
        bestDayRate = flowRateByDay[day]
        bestDay = day
      }
    }

    // Best hour: highest flow rate among hours with >= 3 sessions
    let bestHour = null
    let bestHourRate = -1
    for (let h = 0; h < 24; h++) {
      if (byHour[h].total >= MIN_OBSERVATIONS && flowRateByHour[h] > bestHourRate) {
        bestHourRate = flowRateByHour[h]
        bestHour = h
      }
    }

    // Dead zones: flowRate === 0 AND total >= 3
    const deadZones = []
    for (const day of DAYS) {
      if (byDay[day].total >= MIN_OBSERVATIONS && byDay[day].flow === 0) {
        deadZones.push({ day, type: 'day' })
      }
    }
    for (let h = 0; h < 24; h++) {
      if (byHour[h].total >= MIN_OBSERVATIONS && byHour[h].flow === 0) {
        deadZones.push({ hour: h, type: 'hour' })
      }
    }

    return { bestDay, bestHour, deadZones, flowRateByHour, flowRateByDay }
  }
}
