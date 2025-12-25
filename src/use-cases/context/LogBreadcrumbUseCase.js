/**
 * LogBreadcrumbUseCase - Leave trail markers for context reconstruction
 * 
 * @module use-cases/context/LogBreadcrumbUseCase
 */

export class LogBreadcrumbUseCase {
  constructor({ breadcrumbRepository, eventPublisher }) {
    this.breadcrumbRepository = breadcrumbRepository;
    this.eventPublisher = eventPublisher;
  }

  /**
   * Log a breadcrumb trail marker
   * @param {Object} params - Breadcrumb parameters
   * @param {string} params.text - The breadcrumb text
   * @param {string} [params.project] - Associated project
   * @param {string} [params.type='note'] - Type: note|stuck|progress|decision
   * @returns {Promise<Object>} - The logged breadcrumb
   */
  async execute({ text, project, type = 'note' }) {
    if (!text?.trim()) {
      throw new Error('Breadcrumb text is required');
    }

    const breadcrumb = {
      id: this._generateId(),
      text: text.trim(),
      type,
      project: project || null,
      createdAt: new Date().toISOString(),
    };

    await this.breadcrumbRepository.save(breadcrumb);

    if (this.eventPublisher) {
      this.eventPublisher.publish({
        type: 'BreadcrumbLogged',
        payload: breadcrumb,
        timestamp: new Date().toISOString(),
      });
    }

    return breadcrumb;
  }

  _generateId() {
    return `crumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default LogBreadcrumbUseCase;
