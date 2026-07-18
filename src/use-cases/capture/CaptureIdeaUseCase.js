/**
 * CaptureIdeaUseCase - Quick capture for ideas and tasks
 *
 * @module use-cases/capture/CaptureIdeaUseCase
 */

import { Capture } from '../../domain/entities/Capture.js';

export class CaptureIdeaUseCase {
  constructor({ captureRepository, eventPublisher, obsidianGateway }) {
    this.captureRepository = captureRepository;
    this.eventPublisher = eventPublisher;
    this.obsidianGateway = obsidianGateway;
  }

  /**
   * Capture an idea or task. Lands locally first (never blocks on the
   * vault, per SPEC-ecosystem-integration-gaps-2026-06-20 D4), then
   * write-throughs to Obsidian (D2) when a gateway is configured: on
   * success the capture is marked `flushed`, on failure it's queued
   * `pending-flush` for `atlas flush` to retry later.
   * @param {Object} params - Capture parameters
   * @param {string} params.text - The captured text
   * @param {string} [params.type='idea'] - Type: idea|task|bug|note
   * @param {string} [params.project] - Associated project
   * @param {string[]} [params.tags] - Tags
   * @returns {Promise<Capture>} - The captured item
   */
  async execute({ text, type = 'idea', project, tags = [] }) {
    if (!text?.trim()) {
      throw new Error('Capture text is required');
    }

    const capture = new Capture({
      text: text.trim(),
      type,
      project: project || null,
      tags,
      status: 'inbox',
    });

    await this.captureRepository.save(capture);

    if (this.obsidianGateway) {
      const result = await this.obsidianGateway.write(capture);
      const finalStatus = result.ok ? 'flushed' : 'pending-flush';
      await this.captureRepository.updateStatus(capture.id, finalStatus);
      capture.status = finalStatus;
    }

    if (this.eventPublisher) {
      this.eventPublisher.publish({
        type: 'IdeaCaptured',
        payload: capture.toJSON(),
        timestamp: new Date().toISOString(),
      });
    }

    return capture;
  }
}

export default CaptureIdeaUseCase;
