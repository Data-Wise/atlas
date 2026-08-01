/**
 * ListNudgesUseCase
 * Lists nudges, reading guards.json live (no cache) for cross-surface
 * accuracy — a nudge fired by launchd in another surface must be visible
 * immediately here.
 */
export class ListNudgesUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../domain/gateways/INudgeStore.js').INudgeStore} dependencies.nudgeStore
   */
  constructor({ nudgeStore }) {
    this.nudgeStore = nudgeStore
  }

  /**
   * @param {Object} [options]
   * @param {boolean} [options.outstandingOnly] - Exclude acked nudges
   * @returns {Promise<Array<import('../../domain/entities/Nudge.js').Nudge>>}
   */
  async execute({ outstandingOnly } = {}) {
    return await this.nudgeStore.list(outstandingOnly !== undefined ? { outstandingOnly } : {})
  }
}
