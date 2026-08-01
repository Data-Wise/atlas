/**
 * AckNudgeUseCase
 *
 * Acknowledges a fired (or pending) Nudge. Behavior branches on `recurring`
 * (SPEC Design §3, v2.2 fix): a one-shot nudge has nothing left to fire, so
 * ack also unschedules it (unloads + deletes the launchd plist). A --daily
 * nudge stays scheduled — tomorrow's firing must still happen regardless of
 * today's ack, which is the whole point of "daily."
 */
import { Nudge } from '../../domain/entities/Nudge.js'

export class AckNudgeUseCase {
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
   * @returns {Promise<Nudge>} The acked nudge
   */
  async execute({ id }) {
    const nudge = await this.nudgeStore.get(id)
    if (!nudge) {
      throw new Error(`Nudge ${id} not found — cannot ack`)
    }

    const acked = new Nudge({ ...nudge.toJSON(), state: 'acked' })
    await this.nudgeStore.update(acked)

    if (!acked.recurring) {
      await this.scheduler.unschedule(acked)
    }

    return acked
  }
}
