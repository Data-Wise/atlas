/**
 * IScheduleRecordRepository - Port (Interface)
 *
 * Defines the contract for ScheduleRecord persistence.
 * Implementations will be in the adapters layer.
 */
export class IScheduleRecordRepository {
  /**
   * Find schedule record by ID
   * @param {string} id
   * @returns {Promise<ScheduleRecord|null>}
   */
  async findById(id) {
    throw new Error('findById() not implemented')
  }

  /**
   * Find all schedule records
   * @returns {Promise<ScheduleRecord[]>}
   */
  async findAll() {
    throw new Error('findAll() not implemented')
  }

  /**
   * Find schedule records by project
   * @param {string} project
   * @returns {Promise<ScheduleRecord[]>}
   */
  async findByProject(project) {
    throw new Error('findByProject() not implemented')
  }

  /**
   * Save a single schedule record
   * @param {ScheduleRecord} record
   * @returns {Promise<ScheduleRecord>}
   */
  async save(record) {
    throw new Error('save() not implemented')
  }

  /**
   * Save multiple schedule records
   * @param {ScheduleRecord[]} records
   * @returns {Promise<ScheduleRecord[]>}
   */
  async saveAll(records) {
    throw new Error('saveAll() not implemented')
  }

  /**
   * Delete a schedule record
   * @param {string} id
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    throw new Error('delete() not implemented')
  }
}
