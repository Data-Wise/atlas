/**
 * SQLiteSessionRepository
 *
 * Implements ISessionRepository using SQLite storage.
 */

import { Session } from '../../domain/entities/Session.js'
import { SessionState } from '../../domain/value-objects/SessionState.js'
import { ISessionRepository } from '../../domain/repositories/ISessionRepository.js'

export class SQLiteSessionRepository {
  /**
   * @param {SQLiteDatabase} database - Shared SQLite database instance
   */
  constructor(database) {
    this.db = database
  }

  /**
   * Serialize Session entity to database row
   * @private
   */
  _serialize(session) {
    return {
      id: session.id,
      project: session.project,
      task: session.task,
      branch: session.branch || null,
      state: session.state.value,
      outcome: session.outcome || null,
      context: JSON.stringify(session.context || {}),
      start_time: session.startTime.toISOString(),
      end_time: session.endTime?.toISOString() || null,
      paused_at: session.pausedAt?.toISOString() || null,
      resumed_at: session.resumedAt?.toISOString() || null,
      total_paused_time: session.totalPausedTime || 0
    }
  }

  /**
   * Deserialize database row to Session entity
   * @private
   */
  _deserialize(row) {
    if (!row) return null

    const session = new Session(row.id, row.project, {
      task: row.task,
      branch: row.branch,
      context: JSON.parse(row.context || '{}')
    })

    // Restore internal state
    session.state = new SessionState(row.state)
    session.outcome = row.outcome
    session.startTime = new Date(row.start_time)
    session.endTime = row.end_time ? new Date(row.end_time) : null
    session.pausedAt = row.paused_at ? new Date(row.paused_at) : null
    session.resumedAt = row.resumed_at ? new Date(row.resumed_at) : null
    session.totalPausedTime = row.total_paused_time
    session.clearEvents() // Clear creation event since this is restored

    return session
  }

  // ISessionRepository implementation

  async findById(sessionId) {
    const row = this.db.queryOne(
      'SELECT * FROM sessions WHERE id = ?',
      [sessionId]
    )
    return this._deserialize(row)
  }

  async findActive() {
    const rows = this.db.query(
      `SELECT * FROM sessions WHERE state = 'active' ORDER BY start_time DESC`
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByProject(project, limit = 10) {
    const rows = this.db.query(
      `SELECT * FROM sessions
       WHERE project = ?
       ORDER BY start_time DESC
       LIMIT ?`,
      [project, limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findRecent(limit = 10) {
    const rows = this.db.query(
      `SELECT * FROM sessions
       ORDER BY start_time DESC
       LIMIT ?`,
      [limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByDateRange(startDate, endDate) {
    const rows = this.db.query(
      `SELECT * FROM sessions
       WHERE start_time BETWEEN ? AND ?
       ORDER BY start_time DESC`,
      [startDate.toISOString(), endDate.toISOString()]
    )
    return rows.map(row => this._deserialize(row))
  }

  async save(session) {
    const data = this._serialize(session)

    this.db.execute(
      `INSERT OR REPLACE INTO sessions
       (id, project, task, branch, state, outcome, context,
        start_time, end_time, paused_at, resumed_at, total_paused_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.project,
        data.task,
        data.branch,
        data.state,
        data.outcome,
        data.context,
        data.start_time,
        data.end_time,
        data.paused_at,
        data.resumed_at,
        data.total_paused_time
      ]
    )

    return session
  }

  async delete(sessionId) {
    const result = this.db.execute(
      'DELETE FROM sessions WHERE id = ?',
      [sessionId]
    )
    return result.changes > 0
  }

  async count() {
    const row = this.db.queryOne('SELECT COUNT(*) as count FROM sessions')
    return row.count
  }

  async countByProject(project) {
    const row = this.db.queryOne(
      'SELECT COUNT(*) as count FROM sessions WHERE project = ?',
      [project]
    )
    return row.count
  }

  // Additional SQLite-specific methods

  /**
   * Get session statistics
   * @returns {Object} Session stats
   */
  getStats() {
    const stats = this.db.queryOne(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active_sessions,
        SUM(CASE WHEN state = 'ended' THEN 1 ELSE 0 END) as completed_sessions,
        AVG(CASE
          WHEN end_time IS NOT NULL
          THEN (julianday(end_time) - julianday(start_time)) * 24 * 60
          ELSE NULL
        END) as avg_duration_minutes
      FROM sessions
    `)

    const projectBreakdown = this.db.query(`
      SELECT project, COUNT(*) as count, SUM(total_paused_time) as paused_time
      FROM sessions
      GROUP BY project
      ORDER BY count DESC
      LIMIT 10
    `)

    return {
      ...stats,
      topProjects: projectBreakdown
    }
  }

  /**
   * Get sessions with duration calculated
   * @param {number} limit
   * @returns {Array} Sessions with duration
   */
  findRecentWithDuration(limit = 10) {
    const rows = this.db.query(`
      SELECT *,
        CASE
          WHEN end_time IS NOT NULL
          THEN ROUND((julianday(end_time) - julianday(start_time)) * 24 * 60 - total_paused_time / 60000, 1)
          ELSE ROUND((julianday('now') - julianday(start_time)) * 24 * 60 - total_paused_time / 60000, 1)
        END as duration_minutes
      FROM sessions
      ORDER BY start_time DESC
      LIMIT ?
    `, [limit])

    return rows.map(row => ({
      session: this._deserialize(row),
      durationMinutes: row.duration_minutes
    }))
  }
}

export default SQLiteSessionRepository
