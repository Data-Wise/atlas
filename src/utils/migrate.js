/**
 * Storage Migration Utility
 *
 * Migrates data between storage backends (FileSystem ↔ SQLite)
 */

import { join } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

// Import repositories
import { SQLiteDatabase } from '../adapters/repositories/SQLiteDatabase.js'
import { SQLiteProjectRepository } from '../adapters/repositories/SQLiteProjectRepository.js'
import { SQLiteSessionRepository } from '../adapters/repositories/SQLiteSessionRepository.js'
import { SQLiteCaptureRepository } from '../adapters/repositories/SQLiteCaptureRepository.js'
import { SQLiteBreadcrumbRepository } from '../adapters/repositories/SQLiteBreadcrumbRepository.js'
import { FileSystemProjectRepository } from '../adapters/repositories/FileSystemProjectRepository.js'
import { FileSystemSessionRepository } from '../adapters/repositories/FileSystemSessionRepository.js'
import { FileSystemCaptureRepository } from '../adapters/repositories/FileSystemCaptureRepository.js'
import { FileSystemBreadcrumbRepository } from '../adapters/repositories/FileSystemBreadcrumbRepository.js'

/**
 * Migrate storage from one backend to another
 *
 * @param {Object} options
 * @param {string} options.from - Source storage type ('filesystem' or 'sqlite')
 * @param {string} options.to - Target storage type ('filesystem' or 'sqlite')
 * @param {string} options.dataDir - Data directory path
 * @param {boolean} [options.dryRun=false] - If true, show what would be migrated
 * @returns {Promise<MigrationResult>}
 */
export async function migrateStorage(options) {
  const { from, to, dataDir, dryRun = false } = options

  if (from === to) {
    return {
      success: false,
      message: `Source and target storage are the same: ${from}`
    }
  }

  if (!['filesystem', 'sqlite'].includes(from)) {
    return {
      success: false,
      message: `Invalid source storage type: ${from}. Use 'filesystem' or 'sqlite'.`
    }
  }

  if (!['filesystem', 'sqlite'].includes(to)) {
    return {
      success: false,
      message: `Invalid target storage type: ${to}. Use 'filesystem' or 'sqlite'.`
    }
  }

  const result = {
    success: true,
    from,
    to,
    counts: {
      projects: 0,
      sessions: 0,
      captures: 0,
      breadcrumbs: 0
    },
    errors: [],
    message: ''
  }

  try {
    if (from === 'filesystem' && to === 'sqlite') {
      await migrateFileSystemToSQLite(dataDir, result, dryRun)
    } else if (from === 'sqlite' && to === 'filesystem') {
      await migrateSQLiteToFileSystem(dataDir, result, dryRun)
    }

    const prefix = dryRun ? '[DRY RUN] Would migrate' : 'Migrated'
    result.message = `${prefix}: ${result.counts.projects} projects, ${result.counts.sessions} sessions, ${result.counts.captures} captures, ${result.counts.breadcrumbs} breadcrumbs`

    if (result.errors.length > 0) {
      result.message += ` (${result.errors.length} errors)`
    }
  } catch (error) {
    result.success = false
    result.message = `Migration failed: ${error.message}`
    result.errors.push(error.message)
  }

  return result
}

/**
 * Migrate from FileSystem JSON files to SQLite
 */
async function migrateFileSystemToSQLite(dataDir, result, dryRun) {
  const dbPath = join(dataDir, 'atlas.db')

  // Check if SQLite already exists
  if (existsSync(dbPath) && !dryRun) {
    throw new Error(`SQLite database already exists at ${dbPath}. Remove it first or use a different directory.`)
  }

  // Create source repositories (FileSystem)
  const fsProjectRepo = new FileSystemProjectRepository(join(dataDir, 'projects.json'))
  const fsSessionRepo = new FileSystemSessionRepository(join(dataDir, 'sessions.json'))
  const fsCaptureRepo = new FileSystemCaptureRepository(dataDir)
  const fsBreadcrumbRepo = new FileSystemBreadcrumbRepository(dataDir)

  // Load data from FileSystem
  const projects = await loadIfExists(fsProjectRepo)
  const sessions = await loadIfExists(fsSessionRepo)
  const captures = await loadIfExists(fsCaptureRepo)
  const breadcrumbs = await loadIfExists(fsBreadcrumbRepo)

  result.counts.projects = projects.length
  result.counts.sessions = sessions.length
  result.counts.captures = captures.length
  result.counts.breadcrumbs = breadcrumbs.length

  if (dryRun) {
    return // Don't actually migrate in dry run
  }

  // Create SQLite database and repositories
  const db = new SQLiteDatabase(dbPath)
  db.init()

  const sqliteProjectRepo = new SQLiteProjectRepository(db)
  const sqliteSessionRepo = new SQLiteSessionRepository(db)
  const sqliteCaptureRepo = new SQLiteCaptureRepository(db)
  const sqliteBreadcrumbRepo = new SQLiteBreadcrumbRepository(db)

  // Migrate projects (bulk for efficiency)
  if (projects.length > 0) {
    try {
      sqliteProjectRepo.bulkSave(projects)
    } catch (error) {
      result.errors.push(`Projects: ${error.message}`)
    }
  }

  // Migrate sessions
  for (const session of sessions) {
    try {
      await sqliteSessionRepo.save(session)
    } catch (error) {
      result.errors.push(`Session ${session.id}: ${error.message}`)
    }
  }

  // Migrate captures
  for (const capture of captures) {
    try {
      await sqliteCaptureRepo.save(capture)
    } catch (error) {
      result.errors.push(`Capture ${capture.id}: ${error.message}`)
    }
  }

  // Migrate breadcrumbs
  for (const breadcrumb of breadcrumbs) {
    try {
      await sqliteBreadcrumbRepo.save(breadcrumb)
    } catch (error) {
      result.errors.push(`Breadcrumb ${breadcrumb.id}: ${error.message}`)
    }
  }

  db.close()
}

/**
 * Migrate from SQLite to FileSystem JSON files
 */
async function migrateSQLiteToFileSystem(dataDir, result, dryRun) {
  const dbPath = join(dataDir, 'atlas.db')

  // Check if SQLite exists
  if (!existsSync(dbPath)) {
    throw new Error(`SQLite database not found at ${dbPath}`)
  }

  // Create SQLite database and repositories
  const db = new SQLiteDatabase(dbPath)
  db.init()

  const sqliteProjectRepo = new SQLiteProjectRepository(db)
  const sqliteSessionRepo = new SQLiteSessionRepository(db)
  const sqliteCaptureRepo = new SQLiteCaptureRepository(db)
  const sqliteBreadcrumbRepo = new SQLiteBreadcrumbRepository(db)

  // Load data from SQLite
  const projects = await sqliteProjectRepo.findAll()
  const sessions = await sqliteSessionRepo.findRecent(10000) // Get all
  const captures = await sqliteCaptureRepo.findAll()
  const breadcrumbs = await sqliteBreadcrumbRepo.findAll()

  result.counts.projects = projects.length
  result.counts.sessions = sessions.length
  result.counts.captures = captures.length
  result.counts.breadcrumbs = breadcrumbs.length

  db.close()

  if (dryRun) {
    return // Don't actually migrate in dry run
  }

  // Create FileSystem repositories
  const fsProjectRepo = new FileSystemProjectRepository(join(dataDir, 'projects.json'))
  const fsSessionRepo = new FileSystemSessionRepository(join(dataDir, 'sessions.json'))
  const fsCaptureRepo = new FileSystemCaptureRepository(dataDir)
  const fsBreadcrumbRepo = new FileSystemBreadcrumbRepository(dataDir)

  // Migrate projects
  for (const project of projects) {
    try {
      await fsProjectRepo.save(project)
    } catch (error) {
      result.errors.push(`Project ${project.id}: ${error.message}`)
    }
  }

  // Migrate sessions
  for (const session of sessions) {
    try {
      await fsSessionRepo.save(session)
    } catch (error) {
      result.errors.push(`Session ${session.id}: ${error.message}`)
    }
  }

  // Migrate captures
  for (const capture of captures) {
    try {
      await fsCaptureRepo.save(capture)
    } catch (error) {
      result.errors.push(`Capture ${capture.id}: ${error.message}`)
    }
  }

  // Migrate breadcrumbs
  for (const breadcrumb of breadcrumbs) {
    try {
      await fsBreadcrumbRepo.save(breadcrumb)
    } catch (error) {
      result.errors.push(`Breadcrumb ${breadcrumb.id}: ${error.message}`)
    }
  }
}

/**
 * Helper to load data from a repository if the underlying file exists
 */
async function loadIfExists(repo) {
  try {
    return await repo.findAll()
  } catch (error) {
    if (error.message?.includes('ENOENT') || error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export default { migrateStorage }
