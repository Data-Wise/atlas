/**
 * SQLiteProjectRepository
 *
 * Implements IProjectRepository using SQLite storage.
 * Much faster than JSON for queries, especially with large datasets.
 */

import { Project } from '../../domain/entities/Project.js'
import { ProjectType } from '../../domain/value-objects/ProjectType.js'
import { IProjectRepository } from '../../domain/repositories/IProjectRepository.js'
import { SQLiteDatabase } from './SQLiteDatabase.js'

export class SQLiteProjectRepository extends IProjectRepository {
  /**
   * @param {SQLiteDatabase} database - Shared SQLite database instance
   */
  constructor(database) {
    super()
    this.db = database
  }

  /**
   * Serialize Project entity to database row
   * @private
   */
  _serialize(project) {
    return {
      id: project.id,
      name: project.name,
      type: project.type.value,
      path: project.path,
      description: project.description || null,
      tags: JSON.stringify(project.tags || []),
      metadata: JSON.stringify(project.metadata || {}),
      created_at: project.createdAt.toISOString(),
      last_accessed_at: project.lastAccessedAt.toISOString(),
      total_sessions: project.totalSessions || 0,
      total_duration: project.totalDuration || 0
    }
  }

  /**
   * Deserialize database row to Project entity
   * @private
   */
  _deserialize(row) {
    if (!row) return null

    return new Project(row.id, row.name, {
      type: row.type,
      path: row.path,
      description: row.description,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      lastAccessedAt: new Date(row.last_accessed_at),
      totalSessions: row.total_sessions,
      totalDuration: row.total_duration
    })
  }

  // IProjectRepository implementation

  async findById(projectId) {
    const row = this.db.queryOne(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    )
    return this._deserialize(row)
  }

  async findByPath(path) {
    const row = this.db.queryOne(
      'SELECT * FROM projects WHERE path = ?',
      [path]
    )
    return this._deserialize(row)
  }

  async findAll() {
    const rows = this.db.query('SELECT * FROM projects ORDER BY name')
    return rows.map(row => this._deserialize(row))
  }

  async findByType(type) {
    const rows = this.db.query(
      'SELECT * FROM projects WHERE type = ? ORDER BY name',
      [type]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByTag(tag) {
    // SQLite JSON contains check
    const rows = this.db.query(
      `SELECT * FROM projects WHERE tags LIKE ? ORDER BY name`,
      [`%"${tag}"%`]
    )
    return rows.map(row => this._deserialize(row))
  }

  async search(query) {
    const pattern = `%${query}%`
    const rows = this.db.query(
      `SELECT * FROM projects
       WHERE name LIKE ? OR description LIKE ? OR path LIKE ?
       ORDER BY name`,
      [pattern, pattern, pattern]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findRecent(hours = 24, limit = 10) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const rows = this.db.query(
      `SELECT * FROM projects
       WHERE last_accessed_at > ?
       ORDER BY last_accessed_at DESC
       LIMIT ?`,
      [cutoff, limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findTopBySessionCount(limit = 10) {
    const rows = this.db.query(
      `SELECT * FROM projects
       ORDER BY total_sessions DESC
       LIMIT ?`,
      [limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findTopByDuration(limit = 10) {
    const rows = this.db.query(
      `SELECT * FROM projects
       ORDER BY total_duration DESC
       LIMIT ?`,
      [limit]
    )
    return rows.map(row => this._deserialize(row))
  }

  async save(project) {
    const data = this._serialize(project)

    this.db.execute(
      `INSERT OR REPLACE INTO projects
       (id, name, type, path, description, tags, metadata,
        created_at, last_accessed_at, total_sessions, total_duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.type,
        data.path,
        data.description,
        data.tags,
        data.metadata,
        data.created_at,
        data.last_accessed_at,
        data.total_sessions,
        data.total_duration
      ]
    )

    return project
  }

  async delete(projectId) {
    const result = this.db.execute(
      'DELETE FROM projects WHERE id = ?',
      [projectId]
    )
    return result.changes > 0
  }

  async exists(projectId) {
    const row = this.db.queryOne(
      'SELECT 1 FROM projects WHERE id = ?',
      [projectId]
    )
    return !!row
  }

  async count() {
    const row = this.db.queryOne('SELECT COUNT(*) as count FROM projects')
    return row.count
  }

  /**
   * Note: scan() is not implemented for SQLite repository.
   * Scanning is a filesystem operation, not a database operation.
   * Use FileSystemProjectRepository.scan() then save results here.
   */
  async scan(rootPath) {
    throw new Error(
      'scan() not supported on SQLiteProjectRepository. ' +
      'Use FileSystemProjectRepository.scan() then save results to SQLite.'
    )
  }

  // Additional SQLite-specific methods

  /**
   * Bulk insert projects (much faster than individual saves)
   * @param {Project[]} projects
   * @returns {number} Number of inserted projects
   */
  bulkSave(projects) {
    const insert = this.db.db.prepare(
      `INSERT OR REPLACE INTO projects
       (id, name, type, path, description, tags, metadata,
        created_at, last_accessed_at, total_sessions, total_duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const insertMany = this.db.db.transaction((items) => {
      let count = 0
      for (const project of items) {
        const data = this._serialize(project)
        insert.run(
          data.id,
          data.name,
          data.type,
          data.path,
          data.description,
          data.tags,
          data.metadata,
          data.created_at,
          data.last_accessed_at,
          data.total_sessions,
          data.total_duration
        )
        count++
      }
      return count
    })

    return insertMany(projects)
  }

  /**
   * Get statistics about projects
   * @returns {Object} Project statistics
   */
  getStats() {
    const stats = this.db.queryOne(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(DISTINCT type) as unique_types,
        SUM(total_sessions) as total_sessions,
        SUM(total_duration) as total_duration,
        MAX(last_accessed_at) as last_activity
      FROM projects
    `)

    const typeBreakdown = this.db.query(`
      SELECT type, COUNT(*) as count
      FROM projects
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
}

export default SQLiteProjectRepository
