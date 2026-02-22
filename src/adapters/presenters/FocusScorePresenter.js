/**
 * FocusScorePresenter
 *
 * Formatting functions for focus score display.
 * Used by StatsPresenter (CLI) and dashboard components (TUI).
 */

const TIER_SYMBOLS = ['○', '◔', '◑', '◕', '●']
const TIER_LABELS = ['drift', 'warming', 'steady', 'strong', 'deep']
const TIER_COLORS = ['gray', 'yellow', 'cyan', 'green', 'greenBright']

/**
 * Format focus score as a display string
 * @param {number} score - Focus score 0-100
 * @returns {string} e.g. "◕ 72 strong"
 */
export function formatFocusScore(score) {
  const tier = getTierFromScore(score)
  return `${tier.symbol} ${score} ${tier.label}`
}

/**
 * Get the tier icon for a focus score
 * @param {number} score - Focus score 0-100
 * @returns {string} Unicode tier symbol
 */
export function focusTierIcon(score) {
  return getTierFromScore(score).symbol
}

/**
 * Get the display color for a focus score tier
 * @param {number} score - Focus score 0-100
 * @returns {string} Color name for Ink/chalk
 */
export function focusTierColor(score) {
  return getTierFromScore(score).color
}

/**
 * Get the label for a focus score tier
 * @param {number} score - Focus score 0-100
 * @returns {string} e.g. "strong", "drift"
 */
export function focusTierLabel(score) {
  return getTierFromScore(score).label
}

/**
 * Get complete tier object from a focus score
 * @param {number} score - Focus score 0-100
 * @returns {{ symbol: string, label: string, color: string, index: number }}
 */
export function getTierFromScore(score) {
  let index
  if (score >= 80) index = 4      // deep
  else if (score >= 60) index = 3  // strong
  else if (score >= 40) index = 2  // steady
  else if (score >= 20) index = 1  // warming
  else index = 0                    // drift

  return {
    symbol: TIER_SYMBOLS[index],
    label: TIER_LABELS[index],
    color: TIER_COLORS[index],
    index,
  }
}

export default {
  formatFocusScore,
  focusTierIcon,
  focusTierColor,
  focusTierLabel,
  getTierFromScore,
}
