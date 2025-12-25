/**
 * SQLiteDatabase - Base class for SQLite repositories
 *
 * Provides database initialization, schema management, and common utilities.
 * Uses better-sqlite3 for synchronous, simple SQLite operations.
 */

import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { mkdirSync, existsSync } from 'fs'

export class SQLiteDatabase {
  static SCHEMA_VERSION = 1

  /**
   * @param {string} dbPath - Path to SQLite database file
   * @param {Object} [options] - Database options
   * @param {boolean} [options.verbose=false] - Enable verbose logging
   */
  constructor(dbPath, options = {}) {
    this.dbPath = dbPath
    this.options = options
    this.db = null
  }

  /**
   * Initialize the database
   */
  init() {
    // Ensure directory exists
    const dir = dirname(this.dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Open database
    this.db = new Database(this.dbPath, {
      verbose: this.options.verbose ? console.log : undefined
    })

    // Enable WAL mode for better concurrent performance
    this.db.pragma('journal_mode = WAL')

    // Run migrations
    this._migrate()
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  /**
   * Run schema migrations
   * @private
   */
  _migrate() {
    const currentVersion = this._getSchemaVersion()

    if (currentVersion < 1) {
      this._migrateV1()
    }

    // Add future migrations here:
    // if (currentVersion < 2) { this._migrateV2() }
  }

  /**
   * Get current schema version
   * @private
   */
  _getSchemaVersion() {
    try {
      const result = this.db.prepare('SELECT version FROM schema_version').get()
      return result ? result.version : 0
    } catch {
      return 0
    }
  }

  /**
   * Set schema version
   * @private
   */
  _setSchemaVersion(version) {
    this.db.prepare(`
      INSERT OR REPLACE INTO schema_version (id, version, updated_at)
      VALUES (1, ?, datetime('now'))
    `).run(version)
  }

  /**
   * Migration to version 1: Initial schema
   * @private
   */
  _migrateV1() {
    this.db.exec(`
      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Projects table
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        path TEXT UNIQUE NOT NULL,
        description TEXT,
        tags TEXT, -- JSON array
        metadata TEXT, -- JSON object
        created_at TEXT NOT NULL,
        last_accessed_at TEXT NOT NULL,
        total_sessions INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0
      );

      -- Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        task TEXT,
        branch TEXT,
        state TEXT NOT NULL,
        outcome TEXT,
        context TEXT, -- JSON object
        start_time TEXT NOT NULL,
        end_time TEXT,
        paused_at TEXT,
        resumed_at TEXT,
        total_paused_time INTEGER DEFAULT 0,
        FOREIGN KEY (project) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Captures table
      CREATE TABLE IF NOT EXISTS captures (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        project TEXT,
        tags TEXT, -- JSON array
        context TEXT, -- JSON object
        created_at TEXT NOT NULL,
        triaged_at TEXT,
        FOREIGN KEY (project) REFERENCES projects(id) ON DELETE SET NULL
      );

      -- Breadcrumbs table
      CREATE TABLE IF NOT EXISTS breadcrumbs (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        project TEXT,
        session TEXT,
        file TEXT,
        line INTEGER,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (project) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (session) REFERENCES sessions(id) ON DELETE SET NULL
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
      CREATE INDEX IF NOT EXISTS idx_projects_last_accessed ON projects(last_accessed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
      CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state);
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);
      CREATE INDEX IF NOT EXISTS idx_captures_status ON captures(status);
      CREATE INDEX IF NOT EXISTS idx_captures_project ON captures(project);
      CREATE INDEX IF NOT EXISTS idx_captures_created_at ON captures(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_breadcrumbs_project ON breadcrumbs(project);
      CREATE INDEX IF NOT EXISTS idx_breadcrumbs_session ON breadcrumbs(session);
      CREATE INDEX IF NOT EXISTS idx_breadcrumbs_timestamp ON breadcrumbs(timestamp DESC);
    `)

    this._setSchemaVersion(1)
  }

  /**
   * Execute a query that returns rows
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array} Result rows
   */
  query(sql, params = []) {
    return this.db.prepare(sql).all(...params)
  }

  /**
   * Execute a query that returns a single row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object|undefined} Result row
   */
  queryOne(sql, params = []) {
    return this.db.prepare(sql).get(...params)
  }

  /**
   * Execute a statement that modifies data
   * @param {string} sql - SQL statement
   * @param {Array} params - Statement parameters
   * @returns {Object} Result info (changes, lastInsertRowid)
   */
  execute(sql, params = []) {
    return this.db.prepare(sql).run(...params)
  }

  /**
   * Run multiple statements in a transaction
   * @param {Function} fn - Function to execute in transaction
   * @returns {*} Result of the function
   */
  transaction(fn) {
    return this.db.transaction(fn)()
  }
}

export default SQLiteDatabase
