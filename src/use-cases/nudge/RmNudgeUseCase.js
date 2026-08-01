/**
 * RmNudgeUseCase
 *
 * Unconditional cleanup: unloads + deletes the launchd plist and removes
 * the Nudge record, regardless of `recurring` or `state`. Ships in v1
 * (SPEC Design §3, v2.2 fix) — it's the only way to stop a --daily nudge
 * (ack deliberately leaves it scheduled), and the cleanup path for a
 * one-shot nudge nobody got around to acking.
 */
export class RmNudgeUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../domain/gateways/INudgeStore.js').INudgeStore} dependencies.nudgeStore
   * @param {import('../../adapters/gateways/LaunchdNudgeScheduler.js').LaunchdNudgeScheduler} dependencies.scheduler
   */
  constructor({ nudgeStore, scheduler }) {
    this.nudgeStore = nudgeStore
    this.scheduler = scheduler
  }

  /**
   * @param {Object} params
   * @param {string} params.id
   * @returns {Promise<boolean>} True if a record was removed
   */
  async execute({ id }) {
    const nudge = await this.nudgeStore.get(id)
    if (!nudge) {
      throw new Error(`Nudge ${id} not found — cannot remove`)
    }

    await this.scheduler.unschedule(nudge)
    return await this.nudgeStore.remove(id)
  }
}
