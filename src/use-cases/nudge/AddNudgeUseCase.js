/**
 * AddNudgeUseCase
 * Creates a Nudge, persists it, and schedules its OS-level fire via launchd.
 */
import { Nudge } from '../../domain/entities/Nudge.js'

export class AddNudgeUseCase {
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
   * Execute the use case.
   * @param {Object} params
   * @param {string} params.time - HH:MM, 24h
   * @param {string} params.message
   * @param {boolean} [params.daily] - Recurring daily instead of one-shot
   * @returns {Promise<Nudge>} The scheduled nudge
   */
  async execute({ time, message, daily = false }) {
    const nudge = new Nudge({ time, message, recurring: daily })

    await this.nudgeStore.add(nudge)

    try {
      await this.scheduler.schedule(nudge)
    } catch (err) {
      // Roll back the store write too — never leave a Nudge record with no
      // actual schedule behind it (SPEC Design §3, steps 4-5).
      await this.nudgeStore.remove(nudge.id).catch(() => {})
      throw err
    }

    return nudge
  }
}
