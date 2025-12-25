/**
 * CaptureIdeaUseCase - Quick capture for ideas and tasks
 * 
 * @module use-cases/capture/CaptureIdeaUseCase
 */

export class CaptureIdeaUseCase {
  constructor({ captureRepository, eventPublisher }) {
    this.captureRepository = captureRepository;
    this.eventPublisher = eventPublisher;
  }

  /**
   * Capture an idea or task
   * @param {Object} params - Capture parameters
   * @param {string} params.text - The captured text
   * @param {string} [params.type='idea'] - Type: idea|task|bug|note
   * @param {string} [params.project] - Associated project
   * @param {string[]} [params.tags] - Tags
   * @returns {Promise<Object>} - The captured item
   */
  async execute({ text, type = 'idea', project, tags = [] }) {
    if (!text?.trim()) {
      throw new Error('Capture text is required');
    }

    const capture = {
      id: this._generateId(),
      text: text.trim(),
      type,
      project: project || null,
      tags,
      status: 'inbox',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.captureRepository.save(capture);

    if (this.eventPublisher) {
      this.eventPublisher.publish({
        type: 'IdeaCaptured',
        payload: capture,
        timestamp: new Date().toISOString(),
      });
    }

    return capture;
  }

  _generateId() {
    return `cap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default CaptureIdeaUseCase;
