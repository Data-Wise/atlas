/**
 * GetTrailUseCase - Retrieve breadcrumb trail history
 * 
 * @module use-cases/context/GetTrailUseCase
 */

export class GetTrailUseCase {
  constructor({ breadcrumbRepository }) {
    this.breadcrumbRepository = breadcrumbRepository;
  }

  /**
   * Get breadcrumb trail
   * @param {Object} [options] - Filter options
   * @param {string} [options.project] - Filter by project
   * @param {number} [options.days=7] - Days to look back
   * @param {number} [options.limit=50] - Max items to return
   * @returns {Promise<Object[]>} - Array of breadcrumbs
   */
  async execute(options = {}) {
    const { project, days = 7, limit = 50 } = options;

    const since = new Date();
    since.setDate(since.getDate() - days);

    let crumbs = await this.breadcrumbRepository.findSince(since.toISOString());

    if (project) {
      crumbs = crumbs.filter(c => c.project === project);
    }

    // Sort by timestamp (newest first)
    crumbs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return crumbs.slice(0, limit).map(c => ({
      ...c,
      formattedTime: this._formatTimestamp(c.timestamp),
      ago: this._formatAgo(c.timestamp),
    }));
  }

  _formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  _formatAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const minutes = Math.floor((now - date) / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

export default GetTrailUseCase;
