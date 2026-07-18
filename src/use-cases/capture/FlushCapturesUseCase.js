/**
 * FlushCapturesUseCase - Drain the pending-flush write-ahead queue to the vault
 *
 * Captures land locally first (write-through with offline fallback, per
 * SPEC-ecosystem-integration-gaps-2026-06-20 D4) and are marked
 * `pending-flush` when `obs` was unreachable at capture time. This use
 * case retries them via ObsidianGateway and marks each one `flushed` on
 * success. Idempotent — already-flushed captures are never revisited.
 *
 * @module use-cases/capture/FlushCapturesUseCase
 */

export class FlushCapturesUseCase {
  constructor({ captureRepository, obsidianGateway, eventPublisher }) {
    this.captureRepository = captureRepository
    this.obsidianGateway = obsidianGateway
    this.eventPublisher = eventPublisher
  }

  /**
   * @param {Object} [opts]
   * @param {string} [opts.vault] - Vault id to pass through to obs
   * @returns {Promise<{flushed: number, remaining: number, errors: Array}>}
   */
  async execute({ vault } = {}) {
    const pending = await this.captureRepository.findByStatus('pending-flush')

    let flushed = 0
    const errors = []

    for (const capture of pending) {
      const result = await this.obsidianGateway.write(capture, { vault })

      if (result.ok) {
        await this.captureRepository.updateStatus(capture.id, 'flushed')
        flushed++
      } else {
        errors.push({ id: capture.id, error: result.error })
      }
    }

    if (this.eventPublisher && flushed > 0) {
      this.eventPublisher.publish({
        type: 'CapturesFlushed',
        payload: { flushed, remaining: pending.length - flushed },
        timestamp: new Date().toISOString(),
      })
    }

    return { flushed, remaining: pending.length - flushed, errors }
  }
}

export default FlushCapturesUseCase
