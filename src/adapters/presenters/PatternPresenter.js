/**
 * PatternPresenter
 *
 * Formatting functions for flow pattern data in the AnalyticsView.
 * Produces 7x24 heatmap grids and callout strings.
 */

const SYMBOLS = ['\xb7', '\u2591', '\u2592', '\u2593', '\u2588']

/**
 * Format a 7x24 pattern grid as a 7-line string.
 *
 * Each row = one day (Sun=0 .. Sat=6).
 * Each character = density symbol based on flow rate 0.0-1.0.
 *
 * @param {number[][]} grid - 7x24 array of flow rates 0.0-1.0
 * @param {Object} [options]
 * @param {boolean} [options.showHourLabels=true] - Show hour headers
 * @returns {string}
 */
export function formatPatternGrid(grid, { showHourLabels = true } = {}) {
  if (!grid || grid.length !== 7) return ''

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const maxIdx = SYMBOLS.length - 1

  let output = ''

  // Hour header row
  if (showHourLabels) {
    const labels = []
    for (let h = 6; h < 24; h += 2) {
      labels.push(h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`)
    }
    output += '         ' + labels.join('') + '\n'
  }

  for (let d = 0; d < 7; d++) {
    const row = grid[d]
    if (!row) continue

    const line = row
      .slice(0, 24)
      .map(v => {
        const idx = Math.max(0, Math.min(maxIdx, Math.round(v * maxIdx)))
        return SYMBOLS[idx]
      })
      .join('')

    output += `${DAYS[d]}  ${line}\n`
  }

  return output.trimEnd()
}

/**
 * Format a best-day/best-hour callout string.
 *
 * @param {string} bestDay - e.g. "Tuesday"
 * @param {string} bestHour - e.g. "12-2p"
 * @param {Array} deadZones - Array of { day, hour, intensity }
 * @returns {string}
 */
export function formatPatternCallout(bestDay, bestHour, deadZones = []) {
  const parts = []
  if (bestDay && bestHour) {
    parts.push(`Best: ${bestDay} ${bestHour}`)
  }
  for (const dz of deadZones.slice(0, 2)) {
    if (dz.day) {
      parts.push(`Dead: ${dz.day} before ${dz.hour || 'any'}`)
    }
  }
  return parts.join('   ')
}

/**
 * Build a 7x24 joint grid from raw sessions.
 *
 * PatternAnalyzer returns marginal rates only (flowRateByHour + flowRateByDay).
 * This function computes the joint grid from the same raw session data.
 *
 * @param {Array} sessions - Session entities with startTime and getDuration()
 * @param {number} [flowThresholdMinutes=15] - Minimum duration for flow
 * @returns {number[][]} 7x24 grid of flow rates 0.0-1.0
 */
export function buildPatternGrid(sessions, flowThresholdMinutes = 15) {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
  const counts = Array.from({ length: 7 }, () => Array(24).fill(0))

  for (const session of sessions) {
    if (!session.startTime) continue
    const t = session.startTime instanceof Date ? session.startTime : new Date(session.startTime)
    if (Number.isNaN(t.getTime())) continue
    const day = t.getDay()
    const hour = t.getHours()
    const dur = typeof session.getDuration === 'function' ? session.getDuration() : 0
    const isFlow = dur >= flowThresholdMinutes

    grid[day][hour] += isFlow ? 1 : 0
    counts[day][hour]++
  }

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      grid[d][h] = counts[d][h] > 0
        ? Math.min(grid[d][h] / counts[d][h], 1)
        : 0
    }
  }

  return grid
}
