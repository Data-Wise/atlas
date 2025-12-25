/**
 * GetInboxUseCase - Retrieve captured items in inbox
 * 
 * @module use-cases/capture/GetInboxUseCase
 */

export class GetInboxUseCase {
  constructor({ captureRepository }) {
    this.captureRepository = captureRepository;
  }

  /**
   * Get inbox items
   * @param {Object} [options] - Filter options
   * @param {string} [options.project] - Filter by project
   * @param {string} [options.type] - Filter by type
   * @param {string} [options.status='inbox'] - Filter by status
   * @param {number} [options.limit=50] - Max items to return
   * @returns {Promise<Object[]>} - Array of captured items
   */
  async execute(options = {}) {
    const { project, type, status = 'inbox', limit = 50 } = options;

    let items = await this.captureRepository.findByStatus(status);

    if (project) {
      items = items.filter(item => item.project === project);
    }

    if (type) {
      items = items.filter(item => item.type === type);
    }

    // Sort by creation date (newest first)
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return items.slice(0, limit);
  }
}

export default GetInboxUseCase;
