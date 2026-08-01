/**
 * Nudge Entity
 *
 * A wall-clock reminder that fires at a time-of-day via a launchd job,
 * independently of whether any Claude surface is open. Deliberately NOT a
 * ScheduleRecord variant: ScheduleRecord is date-scoped (YYYY-MM-DD) and
 * parsed from .STATUS/teach-config, while a Nudge is time-of-day + message
 * + a fired/acked lifecycle.
 *
 * The launchd plist's StartCalendarInterval is the authoritative schedule.
 * `time` here is display state, and `recurring` exists only to branch `ack`
 * behavior — neither is a second source of scheduling truth.
 * See docs/specs/SPEC-cross-surface-nudges-and-day-activity-2026-08-01.md
 */
const ID_RE = /^[A-Za-z0-9_-]+$/

export class Nudge {
  static STATES = ['pending', 'fired', 'acked']

  constructor({ id, time, message, recurring = false, state = 'pending', createdAt }) {
    this._validate(id, time, message, state)

    this.id = id || this._generateId()
    this.time = time
    this.message = message.trim()
    this.recurring = Boolean(recurring)
    this.state = state
    this.createdAt = createdAt || new Date().toISOString()
  }

  _validate(id, time, message, state) {
    // id flows unescaped into a launchd plist filename (LaunchdNudgeScheduler
    // ._plistPath) — a self-generated id is always safe, but a hand-edited
    // or corrupted guards.json entry could carry a path-traversal or shell
    // metacharacter payload. Restrict to the generator's own alphabet.
    if (id !== undefined && id !== null && !ID_RE.test(id)) {
      throw new Error('Nudge id may only contain letters, digits, underscore, and hyphen')
    }
    if (!time || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error('Nudge time must be in HH:MM 24-hour format')
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Nudge message cannot be empty')
    }
    if (message.length > 500) {
      throw new Error('Nudge message cannot exceed 500 characters')
    }
    if (!Nudge.STATES.includes(state)) {
      throw new Error(`Invalid Nudge state: ${state}. Valid states: ${Nudge.STATES.join(', ')}`)
    }
  }

  _generateId() {
    return `ndg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * The launchd job label for this nudge. Single source of the naming
   * convention — plist filename, launchctl load/unload, and doctor's
   * reconciliation check all derive from here.
   * @returns {string}
   */
  get launchdLabel() {
    return `com.data-wise.atlas-nudge.${this.id}`
  }

  /**
   * Hour and minute as integers, for building a StartCalendarInterval.
   * @returns {{hour: number, minute: number}}
   */
  get schedule() {
    const [hour, minute] = this.time.split(':').map(Number)
    return { hour, minute }
  }

  /**
   * Whether this nudge should still be shown to the user in `nudge ls`.
   * @returns {boolean}
   */
  isOutstanding() {
    return this.state !== 'acked'
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      time: this.time,
      message: this.message,
      recurring: this.recurring,
      state: this.state,
      createdAt: this.createdAt
    }
  }

  /**
   * Deserialize from JSON
   * @param {Object} json
   * @returns {Nudge|null}
   */
  static fromJSON(json) {
    if (!json) return null
    return new Nudge(json)
  }
}
