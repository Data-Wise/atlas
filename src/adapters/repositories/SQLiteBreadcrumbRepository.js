/**
 * SQLiteBreadcrumbRepository
 *
 * Implements IBreadcrumbRepository using SQLite storage.
 */

import { Breadcrumb } from '../../domain/entities/Breadcrumb.js'

export class SQLiteBreadcrumbRepository {
  /**
   * @param {SQLiteDatabase} database - Shared SQLite database instance
   */
  constructor(database) {
    this.db = database
  }

  /**
   * Serialize Breadcrumb entity to database row
   * @private
   */
  _serialize(breadcrumb) {
    return {
      id: breadcrumb.id,
      text: breadcrumb.text,
      type: breadcrumb.type,
      project: breadcrumb.project || null,
      session: breadcrumb.session || null,
      file: breadcrumb.file || null,
      line: breadcrumb.line || null,
      timestamp: breadcrumb.timestamp.toISOString()
    }
  }

  /**
   * Deserialize database row to Breadcrumb entity
   * @private
   */
  _deserialize(row) {
    if (!row) return null

    return Breadcrumb.fromJSON({
      id: row.id,
      text: row.text,
      type: row.type,
      project: row.project,
      session: row.session,
      file: row.file,
      line: row.line,
      timestamp: row.timestamp
    })
  }

  // IBreadcrumbRepository implementation

  async findById(breadcrumbId) {
    const row = this.db.queryOne(
      'SELECT * FROM breadcrumbs WHERE id = ?',
      [breadcrumbId]
    )
    return this._deserialize(row)
  }

  async findAll() {
    const rows = this.db.query(
      'SELECT * FROM breadcrumbs ORDER BY timestamp DESC'
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByProject(project, limit = 50) {
    const rows = this.db.query(
      `SELECT * FROM breadcrumbs
       WHERE project = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [project, limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findBySession(session) {
    const rows = this.db.query(
      `SELECT * FROM breadcrumbs
       WHERE session = ?
       ORDER BY timestamp ASC`,
      [session]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByType(type) {
    const rows = this.db.query(
      `SELECT * FROM breadcrumbs
       WHERE type = ?
       ORDER BY timestamp DESC`,
      [type]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findRecent(limit = 20) {
    const rows = this.db.query(
      `SELECT * FROM breadcrumbs
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByDateRange(startDate, endDate) {
    const rows = this.db.query(
      `SELECT * FROM breadcrumbs
       WHERE timestamp BETWEEN ? AND ?
       ORDER BY timestamp DESC`,
      [startDate.toISOString(), endDate.toISOString()]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findTrail(project, days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const rows = this.db.query(
      `SELECT * FROM breadcrumbs
       WHERE project = ? AND timestamp > ?
       ORDER BY timestamp DESC`,
      [project, cutoff]
    )

    return rows.map(row => this._deserialize(row))
  }

  async save(breadcrumb) {
    const data = this._serialize(breadcrumb)

    this.db.execute(
      `INSERT OR REPLACE INTO breadcrumbs
       (id, text, type, project, session, file, line, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.text,
        data.type,
        data.project,
        data.session,
        data.file,
        data.line,
        data.timestamp
      ]
    )

    return breadcrumb
  }

  async delete(breadcrumbId) {
    const result = this.db.execute(
      'DELETE FROM breadcrumbs WHERE id = ?',
      [breadcrumbId]
    )
    return result.changes > 0
  }

  async count() {
    const row = this.db.queryOne('SELECT COUNT(*) as count FROM breadcrumbs')
    return row.count
  }

  // Additional SQLite-specific methods

  /**
   * Get breadcrumb statistics
   * @returns {Object} Breadcrumb stats
   */
  getStats() {
    const stats = this.db.queryOne(`
      SELECT
        COUNT(*) as total_breadcrumbs,
        COUNT(DISTINCT project) as unique_projects,
        COUNT(DISTINCT session) as unique_sessions
      FROM breadcrumbs
    `)

    const typeBreakdown = this.db.query(`
      SELECT type, COUNT(*) as count
      FROM breadcrumbs
      GROUP BY type
      ORDER BY count DESC
    `)

    const recentActivity = this.db.query(`
      SELECT
        date(timestamp) as date,
        COUNT(*) as count
      FROM breadcrumbs
      WHERE timestamp > datetime('now', '-7 days')
      GROUP BY date(timestamp)
      ORDER BY date DESC
    `)

    return {
      ...stats,
      byType: typeBreakdown.reduce((acc, row) => {
        acc[row.type] = row.count
        return acc
      }, {}),
      recentActivity
    }
  }

  /**
   * Get the most recent "stuck" breadcrumbs
   * @param {number} limit
   * @returns {Array} Stuck breadcrumbs
   */
  findStuckPoints(limit = 10) {
    const rows = this.db.query(
      `SELECT * FROM breadcrumbs
       WHERE type = 'stuck'
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  /**
   * Get next actions
   * @param {string} [project]
   * @returns {Array} Next action breadcrumbs
   */
  findNextActions(project = null) {
    let query = `SELECT * FROM breadcrumbs WHERE type = 'next'`
    const params = []

    if (project) {
      query += ` AND project = ?`
      params.push(project)
    }

    query += ` ORDER BY timestamp DESC`

    const rows = this.db.query(query, params)
    return rows.map(row => this._deserialize(row))
  }

  /**
   * Delete old breadcrumbs
   * @param {number} days - Delete breadcrumbs older than this
   * @returns {number} Number of deleted breadcrumbs
   */
  pruneOld(days = 90) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const result = this.db.execute(
      `DELETE FROM breadcrumbs WHERE timestamp < ?`,
      [cutoff]
    )

    return result.changes
  }
}

export default SQLiteBreadcrumbRepository
