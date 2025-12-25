/**
 * IBreadcrumbRepository - Interface for breadcrumb trail persistence
 * 
 * @module domain/repositories/IBreadcrumbRepository
 */

export class IBreadcrumbRepository {
  /**
   * Save a breadcrumb
   * @param {Object} breadcrumb - The breadcrumb to save
   * @returns {Promise<void>}
   */
  async save(breadcrumb) {
    throw new Error('Method not implemented');
  }

  /**
   * Find breadcrumbs since a given timestamp
   * @param {string} since - ISO timestamp
   * @returns {Promise<Object[]>}
   */
  async findSince(since) {
    throw new Error('Method not implemented');
  }

  /**
   * Find recent breadcrumbs for a project
   * @param {string} project - Project name
   * @param {number} limit - Max number to return
   * @returns {Promise<Object[]>}
   */
  async findRecent(project, limit) {
    throw new Error('Method not implemented');
  }

  /**
   * Find all breadcrumbs for a project
   * @param {string} project - Project name
   * @returns {Promise<Object[]>}
   */
  async findByProject(project) {
    throw new Error('Method not implemented');
  }
}

export default IBreadcrumbRepository;
