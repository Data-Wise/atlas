/**
 * FileSystemSessionRepository
 *
 * Adapter: Implements ISessionRepository using JSON file storage
 *
 * Persistence Strategy:
 * - Single JSON file: ~/.flow-cli/sessions.json
 * - Array of session objects
 * - Atomic writes (write to temp file, then rename)
 * - Auto-create directory if missing
 *
 * This is the adapter layer - it knows about files, paths, and JSON serialization.
 * The domain layer knows nothing about this implementation.
 */

import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { Session } from '../../domain/entities/Session.js'
import { SessionState } from '../../domain/value-objects/SessionState.js'
import { ISessionRepository } from '../../domain/repositories/ISessionRepository.js'

/**
 * Simple in-memory cache with TTL
 * @private
 */
class SessionCache {
  constructor(ttl = 30000) { // 30 seconds default TTL
    this._cache = null
    this._cacheTime = 0
    this._ttl = ttl
  }

  get() {
    if (this._cache !== null && (Date.now() - this._cacheTime) < this._ttl) {
      return this._cache
    }
    return null
  }

  set(data) {
    this._cache = data
    this._cacheTime = Date.now()
  }

  invalidate() {
    this._cache = null
    this._cacheTime = 0
  }
}

export class FileSystemSessionRepository extends ISessionRepository {
  /**
   * @param {string} filePath - Path to sessions.json file
   * @param {Object} [cacheOptions] - Cache configuration
   * @param {number} [cacheOptions.ttl=30000] - Cache TTL in milliseconds
   */
  constructor(filePath, cacheOptions = {}) {
    super()
    this.filePath = filePath

    // Initialize cache with configurable TTL
    this._cache = new SessionCache(cacheOptions.ttl)
  }

  /**
   * Load all sessions from file (with caching)
   * @private
   */
  async _loadSessions() {
    // Return cached sessions if valid
    const cached = this._cache.get()
    if (cached !== null) {
      return cached
    }

    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      const sessionsData = JSON.parse(data)

      const sessions = sessionsData.map(data => this._deserializeSession(data))

      // Update cache
      this._cache.set(sessions)

      return sessions
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet - return empty array
        this._cache.set([])
        return []
      }
      throw new Error(`Failed to load sessions: ${error.message}`)
    }
  }

  /**
   * Save all sessions to file
   * @private
   */
  async _saveSessions(sessions) {
    try {
      // Ensure directory exists
      await fs.mkdir(dirname(this.filePath), { recursive: true })

      // Serialize sessions
      const sessionsData = sessions.map(session => this._serializeSession(session))

      // Atomic write: write to temp file, then rename
      const tempFile = `${this.filePath}.tmp`
      await fs.writeFile(tempFile, JSON.stringify(sessionsData, null, 2), 'utf-8')
      await fs.rename(tempFile, this.filePath)

      // Invalidate cache after successful write
      this._cache.invalidate()
    } catch (error) {
      throw new Error(`Failed to save sessions: ${error.message}`)
    }
  }

  /**
   * Serialize Session entity to plain object
   * @private
   */
  _serializeSession(session) {
    return {
      id: session.id,
      project: session.project,
      task: session.task,
      branch: session.branch,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime ? session.endTime.toISOString() : null,
      pausedAt: session.pausedAt ? session.pausedAt.toISOString() : null,
      resumedAt: session.resumedAt ? session.resumedAt.toISOString() : null,
      totalPausedTime: session.totalPausedTime,
      state: session.state.value,
      outcome: session.outcome,
      context: session.context
    }
  }

  /**
   * Deserialize plain object to Session entity
   * @private
   */
  _deserializeSession(data) {
    const session = new Session(data.id, data.project, {
      task: data.task,
      branch: data.branch,
      startTime: new Date(data.startTime),
      context: data.context,
      _skipEvents: true // Don't emit events when rehydrating
    })

    // Restore state
    session.state = new SessionState(data.state)
    session.endTime = data.endTime ? new Date(data.endTime) : null
    session.pausedAt = data.pausedAt ? new Date(data.pausedAt) : null
    session.resumedAt = data.resumedAt ? new Date(data.resumedAt) : null
    session.totalPausedTime = data.totalPausedTime
    session.outcome = data.outcome

    return session
  }

  // ISessionRepository implementation

  async findById(sessionId) {
    const sessions = await this._loadSessions()
    return sessions.find(s => s.id === sessionId) || null
  }

  async findActive() {
    const sessions = await this._loadSessions()
    return sessions.find(s => s.state.isActive()) || null
  }

  async findByProject(projectName) {
    const sessions = await this._loadSessions()
    return sessions.filter(s => s.project === projectName)
  }

  async save(session) {
    const sessions = await this._loadSessions()

    const index = sessions.findIndex(s => s.id === session.id)
    if (index >= 0) {
      sessions[index] = session
    } else {
      sessions.push(session)
    }

    await this._saveSessions(sessions)
    return session
  }

  async delete(sessionId) {
    const sessions = await this._loadSessions()

    const index = sessions.findIndex(s => s.id === sessionId)
    if (index >= 0) {
      sessions.splice(index, 1)
      await this._saveSessions(sessions)
      return true
    }

    return false
  }

  async list(filters = {}) {
    let sessions = await this._loadSessions()

    // Apply filters
    if (filters.state) {
      sessions = sessions.filter(s => s.state.value === filters.state)
    }

    if (filters.project) {
      sessions = sessions.filter(s => s.project === filters.project)
    }

    if (filters.since) {
      sessions = sessions.filter(s => s.startTime >= filters.since)
    }

    if (filters.until) {
      sessions = sessions.filter(s => s.startTime <= filters.until)
    }

    // Sort
    if (filters.orderBy === 'duration') {
      sessions.sort((a, b) => {
        const durationA = a.getDuration()
        const durationB = b.getDuration()
        return filters.order === 'desc' ? durationB - durationA : durationA - durationB
      })
    } else {
      // Default: sort by startTime
      sessions.sort((a, b) => {
        const timeA = a.startTime.getTime()
        const timeB = b.startTime.getTime()
        return filters.order === 'desc' ? timeB - timeA : timeA - timeB
      })
    }

    // Limit
    if (filters.limit) {
      sessions = sessions.slice(0, filters.limit)
    }

    return sessions
  }

  async count(filters = {}) {
    const sessions = await this.list(filters)
    return sessions.length
  }

  async findByDateRange(startDate, endDate) {
    const sessions = await this._loadSessions()
    return sessions.filter(s => s.startTime >= startDate && s.startTime <= endDate)
  }

  /**
   * Find all sessions (alias for list without filters)
   * @returns {Promise<Session[]>}
   */
  async findAll() {
    return this.list()
  }

  async getDailyFocusMinutes(projectName, days) {
    const sessions = await this._loadSessions()
    const buckets = new Array(days).fill(0)
    const now = Date.now()
    const msPerDay = 24 * 60 * 60 * 1000

    for (const session of sessions) {
      if (session.project !== projectName) continue
      if (!session.startTime) continue

      const startMs = session.startTime.getTime()
      const daysAgo = Math.floor((now - startMs) / msPerDay)

      if (daysAgo >= 0 && daysAgo < days) {
        const minutes = session.getDuration() / 60
        const idx = days - 1 - daysAgo // oldest first
        buckets[idx] += minutes
      }
    }

    return buckets
  }
}
