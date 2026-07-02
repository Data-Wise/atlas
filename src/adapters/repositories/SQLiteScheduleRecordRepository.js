/**
 * SQLiteScheduleRecordRepository
 *
 * Implements IScheduleRecordRepository using SQLite storage.
 */
import { ScheduleRecord } from '../../domain/entities/ScheduleRecord.js'
import { IScheduleRecordRepository } from '../../domain/repositories/IScheduleRecordRepository.js'

export class SQLiteScheduleRecordRepository extends IScheduleRecordRepository {
  /**
   * @param {SQLiteDatabase} database - Shared SQLite database instance
   */
  constructor(database) {
    super()
    this.db = database
  }

  /**
   * Serialize ScheduleRecord to database row
   * @private
   */
  _serialize(record) {
    return {
      id: record.id,
      date: record.date,
      label: record.label,
      type: record.type,
      project: record.project || null,
      recurrence: record.recurrence || 'none',
      source: record.source
    }
  }

  /**
   * Deserialize database row to ScheduleRecord entity
   * @private
   */
  _deserialize(row) {
    if (!row) return null

    return ScheduleRecord.fromJSON({
      id: row.id,
      date: row.date,
      label: row.label,
      type: row.type,
      project: row.project,
      recurrence: row.recurrence,
      source: row.source
    })
  }

  async findById(id) {
    const row = this.db.queryOne('SELECT * FROM schedule_records WHERE id = ?', [id])
    return this._deserialize(row)
  }

  async findAll() {
    const rows = this.db.query('SELECT * FROM schedule_records ORDER BY date ASC, label ASC')
    return rows.map(row => this._deserialize(row))
  }

  async findByProject(project) {
    const rows = this.db.query('SELECT * FROM schedule_records WHERE project = ? ORDER BY date ASC', [project])
    return rows.map(row => this._deserialize(row))
  }

  async save(record) {
    const data = this._serialize(record)

    this.db.execute(
      `INSERT OR REPLACE INTO schedule_records
       (id, date, label, type, project, recurrence, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.date,
        data.label,
        data.type,
        data.project,
        data.recurrence,
        data.source
      ]
    )

    return record
  }

  async saveAll(records) {
    this.db.transaction(() => {
      for (const record of records) {
        const data = this._serialize(record)
        this.db.execute(
          `INSERT OR REPLACE INTO schedule_records
           (id, date, label, type, project, recurrence, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.date,
            data.label,
            data.type,
            data.project,
            data.recurrence,
            data.source
          ]
        )
      }
    })
    return records
  }

  async delete(id) {
    const result = this.db.execute('DELETE FROM schedule_records WHERE id = ?', [id])
    return result.changes > 0
  }
}

export default SQLiteScheduleRecordRepository
