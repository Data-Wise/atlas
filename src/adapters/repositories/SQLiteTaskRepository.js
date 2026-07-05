/**
 * SQLiteTaskRepository
 *
 * Implements ITaskRepository using SQLite storage.
 */
import { Task } from '../../domain/entities/Task.js'
import { ITaskRepository } from '../../domain/repositories/ITaskRepository.js'

export class SQLiteTaskRepository extends ITaskRepository {
  /**
   * @param {SQLiteDatabase} database - Shared SQLite database instance
   */
  constructor(database) {
    super()
    this.db = database
  }

  /**
   * Serialize Task entity to database row
   * @private
   */
  _serialize(task) {
    return {
      id: task.id,
      description: task.description,
      priority: task.priority.value,
      project_id: task.projectId || null,
      session_id: task.sessionId || null,
      completed: task.completed ? 1 : 0,
      completed_at: task.completedAt instanceof Date ? task.completedAt.toISOString() : (task.completedAt || null),
      tags: JSON.stringify(task.tags || []),
      metadata: JSON.stringify(task.metadata || {}),
      created_at: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
      updated_at: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
      due_date: task.dueDate instanceof Date ? task.dueDate.toISOString() : (task.dueDate || null),
      estimated_minutes: task.estimatedMinutes,
      actual_minutes: task.actualMinutes
    }
  }

  /**
   * Deserialize database row to Task entity
   * @private
   */
  _deserialize(row) {
    if (!row) return null

    return Task.fromJSON({
      id: row.id,
      description: row.description,
      priority: row.priority,
      projectId: row.project_id,
      sessionId: row.session_id,
      completed: row.completed === 1,
      completedAt: row.completed_at,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dueDate: row.due_date,
      estimatedMinutes: row.estimated_minutes,
      actualMinutes: row.actual_minutes
    })
  }

  async findById(taskId) {
    const row = this.db.queryOne('SELECT * FROM tasks WHERE id = ?', [taskId])
    return this._deserialize(row)
  }

  async findAll() {
    const rows = this.db.query('SELECT * FROM tasks ORDER BY created_at DESC')
    return rows.map(row => this._deserialize(row))
  }

  async findByProject(projectId) {
    const rows = this.db.query('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC', [projectId])
    return rows.map(row => this._deserialize(row))
  }

  async findBySession(sessionId) {
    const rows = this.db.query('SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at DESC', [sessionId])
    return rows.map(row => this._deserialize(row))
  }

  async findIncomplete() {
    const rows = this.db.query('SELECT * FROM tasks WHERE completed = 0 ORDER BY created_at DESC')
    return rows.map(row => this._deserialize(row))
  }

  async findCompleted() {
    const rows = this.db.query('SELECT * FROM tasks WHERE completed = 1 ORDER BY created_at DESC')
    return rows.map(row => this._deserialize(row))
  }

  async findByPriority(priority) {
    const rows = this.db.query('SELECT * FROM tasks WHERE priority = ? ORDER BY created_at DESC', [priority])
    return rows.map(row => this._deserialize(row))
  }

  async findOverdue() {
    const now = new Date().toISOString()
    const rows = this.db.query('SELECT * FROM tasks WHERE completed = 0 AND due_date IS NOT NULL AND due_date < ? ORDER BY due_date ASC', [now])
    return rows.map(row => this._deserialize(row))
  }

  async findDueSoon(hours = 24) {
    const now = new Date()
    const soon = new Date(Date.now() + hours * 60 * 60 * 1000)
    const rows = this.db.query(
      'SELECT * FROM tasks WHERE completed = 0 AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ? ORDER BY due_date ASC',
      [now.toISOString(), soon.toISOString()]
    )
    return rows.map(row => this._deserialize(row))
  }

  async findByTag(tag) {
    const rows = this.db.query('SELECT * FROM tasks WHERE tags LIKE ? ORDER BY created_at DESC', [`%"${tag}"%`])
    return rows.map(row => this._deserialize(row))
  }

  async search(query) {
    // Rely on matchesSearch for robust matching across fields
    const tasks = await this.findAll()
    return tasks.filter(t => t.matchesSearch(query))
  }

  async save(task) {
    const data = this._serialize(task)

    this.db.execute(
      `INSERT OR REPLACE INTO tasks
       (id, description, priority, project_id, session_id, completed, completed_at, tags, metadata, created_at, updated_at, due_date, estimated_minutes, actual_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.description,
        data.priority,
        data.project_id,
        data.session_id,
        data.completed,
        data.completed_at,
        data.tags,
        data.metadata,
        data.created_at,
        data.updated_at,
        data.due_date,
        data.estimated_minutes,
        data.actual_minutes
      ]
    )

    return task
  }

  async delete(taskId) {
    const result = this.db.execute('DELETE FROM tasks WHERE id = ?', [taskId])
    return result.changes > 0
  }

  async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as count FROM tasks WHERE 1=1'
    const params = []

    if (filters.completed !== undefined) {
      sql += ' AND completed = ?'
      params.push(filters.completed ? 1 : 0)
    }
    if (filters.projectId) {
      sql += ' AND project_id = ?'
      params.push(filters.projectId)
    }
    if (filters.priority) {
      sql += ' AND priority = ?'
      params.push(filters.priority)
    }

    const row = this.db.queryOne(sql, params)
    return row.count
  }
}

export default SQLiteTaskRepository
