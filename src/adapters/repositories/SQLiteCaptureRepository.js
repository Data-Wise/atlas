/**
 * SQLiteCaptureRepository
 *
 * Implements ICaptureRepository using SQLite storage.
 */

import { Capture } from '../../domain/entities/Capture.js'

export class SQLiteCaptureRepository {
  /**
   * @param {SQLiteDatabase} database - Shared SQLite database instance
   */
  constructor(database) {
    this.db = database
  }

  /**
   * Serialize Capture entity to database row
   * @private
   */
  _serialize(capture) {
    return {
      id: capture.id,
      text: capture.text,
      type: capture.type,
      status: capture.status,
      project: capture.project || null,
      tags: JSON.stringify(capture.tags || []),
      context: JSON.stringify(capture.context || {}),
      created_at: capture.createdAt.toISOString(),
      triaged_at: capture.triagedAt?.toISOString() || null
    }
  }

  /**
   * Deserialize database row to Capture entity
   * @private
   */
  _deserialize(row) {
    if (!row) return null

    return Capture.fromJSON({
      id: row.id,
      text: row.text,
      type: row.type,
      status: row.status,
      project: row.project,
      tags: JSON.parse(row.tags || '[]'),
      context: JSON.parse(row.context || '{}'),
      createdAt: row.created_at,
      triagedAt: row.triaged_at
    })
  }

  // ICaptureRepository implementation

  async findById(captureId) {
    const row = this.db.queryOne(
      'SELECT * FROM captures WHERE id = ?',
      [captureId]
    )
    return this._deserialize(row)
  }

  async findAll() {
    const rows = this.db.query(
      'SELECT * FROM captures ORDER BY created_at DESC'
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByStatus(status) {
    const rows = this.db.query(
      `SELECT * FROM captures
       WHERE status = ?
       ORDER BY created_at DESC`,
      [status]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findInbox() {
    return this.findByStatus('inbox')
  }

  async findByProject(project) {
    const rows = this.db.query(
      `SELECT * FROM captures
       WHERE project = ?
       ORDER BY created_at DESC`,
      [project]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByType(type) {
    const rows = this.db.query(
      `SELECT * FROM captures
       WHERE type = ?
       ORDER BY created_at DESC`,
      [type]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByTag(tag) {
    const rows = this.db.query(
      `SELECT * FROM captures
       WHERE tags LIKE ?
       ORDER BY created_at DESC`,
      [`%"${tag}"%`]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findRecent(limit = 20) {
    const rows = this.db.query(
      `SELECT * FROM captures
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  async save(capture) {
    const data = this._serialize(capture)

    this.db.execute(
      `INSERT OR REPLACE INTO captures
       (id, text, type, status, project, tags, context, created_at, triaged_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.text,
        data.type,
        data.status,
        data.project,
        data.tags,
        data.context,
        data.created_at,
        data.triaged_at
      ]
    )

    return capture
  }

  async delete(captureId) {
    const result = this.db.execute(
      'DELETE FROM captures WHERE id = ?',
      [captureId]
    )
    return result.changes > 0
  }

  async count() {
    const row = this.db.queryOne('SELECT COUNT(*) as count FROM captures')
    return row.count
  }

  async countByStatus(status) {
    const row = this.db.queryOne(
      'SELECT COUNT(*) as count FROM captures WHERE status = ?',
      [status]
    )
    return row.count
  }

  // Additional SQLite-specific methods

  /**
   * Get capture statistics
   * @returns {Object} Capture stats
   */
  getStats() {
    const stats = this.db.queryOne(`
      SELECT
        COUNT(*) as total_captures,
        SUM(CASE WHEN status = 'inbox' THEN 1 ELSE 0 END) as inbox_count,
        SUM(CASE WHEN status = 'triaged' THEN 1 ELSE 0 END) as triaged_count,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_count
      FROM captures
    `)

    const typeBreakdown = this.db.query(`
      SELECT type, COUNT(*) as count
      FROM captures
      WHERE status != 'archived'
      GROUP BY type
      ORDER BY count DESC
    `)

    return {
      ...stats,
      byType: typeBreakdown.reduce((acc, row) => {
        acc[row.type] = row.count
        return acc
      }, {})
    }
  }

  /**
   * Archive all triaged items older than given days
   * @param {number} days
   * @returns {number} Number of archived items
   */
  archiveOldTriaged(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const result = this.db.execute(
      `UPDATE captures
       SET status = 'archived'
       WHERE status = 'triaged' AND created_at < ?`,
      [cutoff]
    )

    return result.changes
  }
}

export default SQLiteCaptureRepository
