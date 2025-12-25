/**
 * LogBreadcrumbUseCase - Leave trail markers for context reconstruction
 *
 * @module use-cases/context/LogBreadcrumbUseCase
 */

import { Breadcrumb } from '../../domain/entities/Breadcrumb.js';

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
   * @returns {Promise<Breadcrumb>} - The logged breadcrumb
   */
  async execute({ text, project, type = 'note' }) {
    if (!text?.trim()) {
      throw new Error('Breadcrumb text is required');
    }

    const breadcrumb = new Breadcrumb({
      text: text.trim(),
      type,
      project: project || null,
    });

    await this.breadcrumbRepository.save(breadcrumb);

    if (this.eventPublisher) {
      this.eventPublisher.publish({
        type: 'BreadcrumbLogged',
        payload: breadcrumb.toJSON(),
        timestamp: new Date().toISOString(),
      });
    }

    return breadcrumb;
  }
}

export default LogBreadcrumbUseCase;
