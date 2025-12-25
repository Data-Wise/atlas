/**
 * Integration tests for SQLite repositories
 */

import { join } from 'path'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { SQLiteDatabase } from '../../src/adapters/repositories/SQLiteDatabase.js'
import { SQLiteProjectRepository } from '../../src/adapters/repositories/SQLiteProjectRepository.js'
import { SQLiteSessionRepository } from '../../src/adapters/repositories/SQLiteSessionRepository.js'
import { SQLiteCaptureRepository } from '../../src/adapters/repositories/SQLiteCaptureRepository.js'
import { SQLiteBreadcrumbRepository } from '../../src/adapters/repositories/SQLiteBreadcrumbRepository.js'
import { Project } from '../../src/domain/entities/Project.js'
import { Session } from '../../src/domain/entities/Session.js'
import { Capture } from '../../src/domain/entities/Capture.js'
import { Breadcrumb } from '../../src/domain/entities/Breadcrumb.js'
import { Container } from '../../src/adapters/Container.js'

describe('SQLite Repositories Integration', () => {
  let tempDir
  let db
  let projectRepo
  let sessionRepo
  let captureRepo
  let breadcrumbRepo

  beforeAll(() => {
    // Create temp directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'atlas-test-'))
    const dbPath = join(tempDir, 'test.db')

    // Initialize database
    db = new SQLiteDatabase(dbPath)
    db.init()

    // Create repositories
    projectRepo = new SQLiteProjectRepository(db)
    sessionRepo = new SQLiteSessionRepository(db)
    captureRepo = new SQLiteCaptureRepository(db)
    breadcrumbRepo = new SQLiteBreadcrumbRepository(db)
  })

  afterAll(() => {
    // Close database and clean up
    db.close()
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('SQLiteDatabase', () => {
    test('creates tables on initialization', () => {
      const tables = db.query(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `)

      expect(tables.map(t => t.name)).toEqual([
        'breadcrumbs',
        'captures',
        'projects',
        'schema_version',
        'sessions'
      ])
    })

    test('tracks schema version', () => {
      const version = db.queryOne('SELECT version FROM schema_version')
      expect(version.version).toBe(1)
    })

    test('enables WAL mode', () => {
      const mode = db.queryOne('PRAGMA journal_mode')
      expect(mode.journal_mode).toBe('wal')
    })
  })

  describe('SQLiteProjectRepository', () => {
    test('saves and retrieves project', async () => {
      const project = new Project('test-proj', 'Test Project', {
        type: 'node',
        path: '/path/to/project',
        description: 'A test project',
        tags: ['test', 'node']
      })

      await projectRepo.save(project)
      const retrieved = await projectRepo.findById('test-proj')

      expect(retrieved).not.toBeNull()
      expect(retrieved.id).toBe('test-proj')
      expect(retrieved.name).toBe('Test Project')
      expect(retrieved.type.value).toBe('node')
      expect(retrieved.tags).toContain('test')
    })

    test('finds project by path', async () => {
      const found = await projectRepo.findByPath('/path/to/project')
      expect(found).not.toBeNull()
      expect(found.id).toBe('test-proj')
    })

    test('finds projects by type', async () => {
      const projects = await projectRepo.findByType('node')
      expect(projects.length).toBeGreaterThan(0)
      expect(projects[0].type.value).toBe('node')
    })

    test('finds projects by tag', async () => {
      const projects = await projectRepo.findByTag('test')
      expect(projects.length).toBeGreaterThan(0)
      expect(projects[0].tags).toContain('test')
    })

    test('searches projects', async () => {
      const projects = await projectRepo.search('Test')
      expect(projects.length).toBeGreaterThan(0)
    })

    test('counts projects', async () => {
      const count = await projectRepo.count()
      expect(count).toBeGreaterThan(0)
    })

    test('bulk saves projects', () => {
      const projects = [
        new Project('bulk-1', 'Bulk One', { type: 'python', path: '/bulk/1' }),
        new Project('bulk-2', 'Bulk Two', { type: 'r-package', path: '/bulk/2' }),
        new Project('bulk-3', 'Bulk Three', { type: 'quarto', path: '/bulk/3' })
      ]

      const count = projectRepo.bulkSave(projects)
      expect(count).toBe(3)
    })

    test('gets statistics', () => {
      const stats = projectRepo.getStats()
      expect(stats.total_projects).toBeGreaterThan(0)
      expect(stats.byType).toBeDefined()
    })

    test('deletes project', async () => {
      const deleted = await projectRepo.delete('bulk-3')
      expect(deleted).toBe(true)

      const found = await projectRepo.findById('bulk-3')
      expect(found).toBeNull()
    })
  })

  describe('SQLiteSessionRepository', () => {
    test('saves and retrieves session', async () => {
      const session = new Session('sess-1', 'test-proj', {
        task: 'Working on tests',
        branch: 'feature/tests'
      })

      await sessionRepo.save(session)
      const retrieved = await sessionRepo.findById('sess-1')

      expect(retrieved).not.toBeNull()
      expect(retrieved.id).toBe('sess-1')
      expect(retrieved.project).toBe('test-proj')
      expect(retrieved.task).toBe('Working on tests')
    })

    test('finds active sessions', async () => {
      const active = await sessionRepo.findActive()
      expect(active.length).toBeGreaterThan(0)
      expect(active[0].state.isActive()).toBe(true)
    })

    test('finds sessions by project', async () => {
      const sessions = await sessionRepo.findByProject('test-proj')
      expect(sessions.length).toBeGreaterThan(0)
    })

    test('ends session and retrieves', async () => {
      const session = await sessionRepo.findById('sess-1')
      session.end('completed')
      await sessionRepo.save(session)

      const ended = await sessionRepo.findById('sess-1')
      expect(ended.state.isEnded()).toBe(true)
      expect(ended.outcome).toBe('completed')
    })

    test('gets statistics', () => {
      const stats = sessionRepo.getStats()
      expect(stats.total_sessions).toBeGreaterThan(0)
    })
  })

  describe('SQLiteCaptureRepository', () => {
    test('saves and retrieves capture', async () => {
      const capture = new Capture({
        text: 'Important idea',
        type: 'idea',
        tags: ['important']
      })

      await captureRepo.save(capture)
      const retrieved = await captureRepo.findById(capture.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved.text).toBe('Important idea')
      expect(retrieved.type).toBe('idea')
      expect(retrieved.status).toBe('inbox')
    })

    test('finds inbox items', async () => {
      const inbox = await captureRepo.findInbox()
      expect(inbox.length).toBeGreaterThan(0)
      expect(inbox[0].status).toBe('inbox')
    })

    test('finds by type', async () => {
      const ideas = await captureRepo.findByType('idea')
      expect(ideas.length).toBeGreaterThan(0)
    })

    test('counts by status', async () => {
      const count = await captureRepo.countByStatus('inbox')
      expect(count).toBeGreaterThan(0)
    })

    test('gets statistics', () => {
      const stats = captureRepo.getStats()
      expect(stats.total_captures).toBeGreaterThan(0)
      expect(stats.inbox_count).toBeGreaterThan(0)
    })
  })

  describe('SQLiteBreadcrumbRepository', () => {
    test('saves and retrieves breadcrumb', async () => {
      const crumb = new Breadcrumb({
        text: 'Working on auth',
        type: 'thought',
        project: 'test-proj',
        file: 'src/auth.js',
        line: 42
      })

      await breadcrumbRepo.save(crumb)
      const retrieved = await breadcrumbRepo.findById(crumb.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved.text).toBe('Working on auth')
      expect(retrieved.type).toBe('thought')
      expect(retrieved.file).toBe('src/auth.js')
      expect(retrieved.line).toBe(42)
    })

    test('finds by project', async () => {
      const crumbs = await breadcrumbRepo.findByProject('test-proj')
      expect(crumbs.length).toBeGreaterThan(0)
    })

    test('finds recent breadcrumbs', async () => {
      const recent = await breadcrumbRepo.findRecent(10)
      expect(recent.length).toBeGreaterThan(0)
    })

    test('finds trail', async () => {
      const trail = await breadcrumbRepo.findTrail('test-proj', 7)
      expect(trail.length).toBeGreaterThan(0)
    })

    test('gets statistics', () => {
      const stats = breadcrumbRepo.getStats()
      expect(stats.total_breadcrumbs).toBeGreaterThan(0)
    })
  })

  describe('Container with SQLite storage', () => {
    test('creates container with sqlite storage', () => {
      const container = new Container({
        dataDir: tempDir,
        storage: 'sqlite'
      })

      expect(container.usingSQLite()).toBe(true)
      container.close()
    })

    test('container uses SQLite repositories', () => {
      const container = new Container({
        dataDir: join(tempDir, 'container-test'),
        storage: 'sqlite'
      })

      const projectRepo = container.getProjectRepository()
      expect(projectRepo).toBeInstanceOf(SQLiteProjectRepository)

      container.close()
    })
  })
})
