/**
 * ICaptureRepository - Interface for capture persistence
 * 
 * @module domain/repositories/ICaptureRepository
 */

export class ICaptureRepository {
  /**
   * Save a captured item
   * @param {Object} capture - The capture to save
   * @returns {Promise<void>}
   */
  async save(capture) {
    throw new Error('Method not implemented');
  }

  /**
   * Find capture by ID
   * @param {string} id - Capture ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find captures by status
   * @param {string} status - Status to filter by (inbox|triaged|done|archived)
   * @returns {Promise<Object[]>}
   */
  async findByStatus(status) {
    throw new Error('Method not implemented');
  }

  /**
   * Find captures by project
   * @param {string} project - Project name
   * @returns {Promise<Object[]>}
   */
  async findByProject(project) {
    throw new Error('Method not implemented');
  }

  /**
   * Update capture status
   * @param {string} id - Capture ID
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateStatus(id, status) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete a capture
   * @param {string} id - Capture ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }
}

export default ICaptureRepository;
