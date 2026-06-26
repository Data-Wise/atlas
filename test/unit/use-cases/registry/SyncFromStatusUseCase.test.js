/**
 * SyncFromStatusUseCase Tests
 *
 * Tests for ecosystem sync from .STATUS files.
 */

import { beforeEach, describe, test, expect } from '@jest/globals'
import { SyncFromStatusUseCase } from '../../../../src/use-cases/registry/SyncFromStatusUseCase.js'
import { Project } from '../../../../src/domain/entities/Project.js'

// Mock StatusFileParser
class MockStatusFileParser {
  constructor() {
    this.scanResults = []
  }

  async scanDirectory(rootPath, options) {
    return this.scanResults
  }

  summarize(results) {
    const summary = {
      total: results.length,
      byStatus: {},
      byPriority: { 1: [], 2: [], 3: [] },
      byProgress: { complete: [], inProgress: [], notStarted: [] }
    }

    for (const { path, parsed } of results) {
      // Skip entries with null/undefined parsed data
      if (!parsed) continue

      const status = parsed.status || 'unknown'
      if (!summary.byStatus[status]) summary.byStatus[status] = []
      summary.byStatus[status].push({ path, ...parsed })

      const priority = Math.min(3, Math.max(1, parsed.priority || 3))
      summary.byPriority[priority].push({ path, ...parsed })

      const progress = parsed.progress || 0
      if (progress >= 100) summary.byProgress.complete.push({ path, ...parsed })
      else if (progress > 0) summary.byProgress.inProgress.push({ path, ...parsed })
      else summary.byProgress.notStarted.push({ path, ...parsed })
    }

    return summary
  }
}

// Mock ProjectRepository
class MockProjectRepository {
  constructor() {
    this.projects = new Map()
  }

  async findByPath(path) {
    for (const project of this.projects.values()) {
      if (project.path === path) return project
    }
    return null
  }

  async findById(id) {
    return this.projects.get(id) || null
  }

  async save(project) {
    this.projects.set(project.id, project)
    return project
  }
}

describe('SyncFromStatusUseCase', () => {
  let useCase
  let projectRepo
  let statusParser

  beforeEach(() => {
    projectRepo = new MockProjectRepository()
    statusParser = new MockStatusFileParser()
    useCase = new SyncFromStatusUseCase({
      projectRepository: projectRepo,
      statusFileParser: statusParser
    })
  })

  describe('Constructor validation', () => {
    test('throws if projectRepository not provided', () => {
      expect(() => new SyncFromStatusUseCase({
        statusFileParser: statusParser
      })).toThrow('projectRepository is required')
    })

    test('throws if statusFileParser not provided', () => {
      expect(() => new SyncFromStatusUseCase({
        projectRepository: projectRepo
      })).toThrow('statusFileParser is required')
    })
  })

  describe('execute() - Basic functionality', () => {
    test('throws if rootPath not provided', async () => {
      await expect(useCase.execute({})).rejects.toThrow('rootPath is required')
    })

    test('returns scan results with summary', async () => {
      statusParser.scanResults = [
        { path: '/projects/a', file: '/projects/a/.STATUS', parsed: { name: 'project-a', status: 'active', progress: 50, priority: 1 } },
        { path: '/projects/b', file: '/projects/b/.STATUS', parsed: { name: 'project-b', status: 'paused', progress: 25, priority: 2 } }
      ]

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.scanned).toBe(2)
      expect(result.summary).toBeDefined()
      expect(result.summary.total).toBe(2)
      expect(result.summary.byStatus.active).toHaveLength(1)
      expect(result.summary.byStatus.paused).toHaveLength(1)
    })
  })

  describe('execute() - Report only mode', () => {
    test('does not modify repository in report mode', async () => {
      statusParser.scanResults = [
        { path: '/projects/a', file: '/projects/a/.STATUS', parsed: { name: 'project-a', status: 'active', progress: 50, priority: 1 } }
      ]

      const result = await useCase.execute({
        rootPath: '/projects',
        reportOnly: true
      })

      expect(result.scanned).toBe(1)
      expect(result.created).toHaveLength(0)
      expect(result.updated).toHaveLength(0)
      expect(projectRepo.projects.size).toBe(0)
    })
  })

  describe('execute() - Create new projects', () => {
    test('creates new project from .STATUS data', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/new-project',
          file: '/projects/new-project/.STATUS',
          parsed: {
            name: 'new-project',
            status: 'active',
            progress: 50,
            priority: 1,
            type: 'node-package',
            focus: 'Implement feature X',
            format: 'markdown'
          }
        }
      ]

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.created).toHaveLength(1)
      expect(result.created[0].name).toBe('new-project')

      const saved = await projectRepo.findByPath('/projects/new-project')
      expect(saved).not.toBeNull()
      expect(saved.metadata.status).toBe('active')
      expect(saved.metadata.progress).toBe(50)
      expect(saved.metadata.priority).toBe(1)
      expect(saved.description).toBe('Implement feature X')
    })

    test('uses next as description if no focus', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/p1',
          file: '/projects/p1/.STATUS',
          parsed: {
            name: 'p1',
            status: 'active',
            next: 'Complete API'
          }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/p1')
      expect(saved.description).toBe('Complete API')
    })
  })

  describe('execute() - Update existing projects', () => {
    test('updates existing project with new status data', async () => {
      // Pre-populate with existing project (use options object for path)
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.metadata = { status: 'draft', progress: 10 }
      existing.totalSessions = 5
      existing.totalDuration = 120
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: {
            name: 'existing',
            status: 'active',
            progress: 75,
            priority: 1
          }
        }
      ]

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.updated).toHaveLength(1)
      expect(result.updated[0].changes).toContain('status: draft → active')
      expect(result.updated[0].changes).toContain('progress: 10% → 75%')

      const saved = await projectRepo.findByPath('/projects/existing')
      expect(saved.metadata.status).toBe('active')
      expect(saved.metadata.progress).toBe(75)
      // Preserves statistics
      expect(saved.totalSessions).toBe(5)
      expect(saved.totalDuration).toBe(120)
    })

    test('skips projects with no changes', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.metadata = { status: 'active', progress: 50, priority: 1 }
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: {
            name: 'existing',
            status: 'active',
            progress: 50,
            priority: 1
          }
        }
      ]

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0].reason).toBe('no changes')
    })
  })

  describe('execute() - Dry run mode', () => {
    test('does not save changes in dry run mode', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/new',
          file: '/projects/new/.STATUS',
          parsed: { name: 'new', status: 'active' }
        }
      ]

      const result = await useCase.execute({
        rootPath: '/projects',
        dryRun: true
      })

      expect(result.created).toHaveLength(1)
      expect(projectRepo.projects.size).toBe(0) // Not actually saved
    })
  })

  describe('execute() - Error handling', () => {
    test('captures errors for individual projects', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/good',
          file: '/projects/good/.STATUS',
          parsed: { name: 'good', status: 'active' }
        },
        {
          path: '/projects/bad',
          file: '/projects/bad/.STATUS',
          parsed: null // This will cause an error
        }
      ]

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.synced).toHaveLength(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].path).toBe('/projects/bad')
    })
  })

  describe('execute() - Progress callback', () => {
    test('calls onProgress for each project', async () => {
      const progressCalls = []

      statusParser.scanResults = [
        { path: '/a', file: '/a/.STATUS', parsed: { name: 'a', status: 'active' } },
        { path: '/b', file: '/b/.STATUS', parsed: { name: 'b', status: 'paused' } }
      ]

      await useCase.execute({
        rootPath: '/projects',
        onProgress: ({ path, parsed }) => {
          progressCalls.push({ path, name: parsed.name })
        }
      })

      expect(progressCalls).toHaveLength(2)
      expect(progressCalls[0].name).toBe('a')
      expect(progressCalls[1].name).toBe('b')
    })
  })

  describe('execute() - Type handling', () => {
    test('sets project type from parsed data', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/r-pkg',
          file: '/projects/r-pkg/.STATUS',
          parsed: { name: 'r-pkg', status: 'active', type: 'r-package' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/r-pkg')
      expect(saved.type.value).toBe('r-package')
    })

    test('falls back to general for invalid type', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/unknown',
          file: '/projects/unknown/.STATUS',
          parsed: { name: 'unknown', status: 'active', type: 'invalid-type-xyz' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/unknown')
      expect(saved.type.value).toBe('general')
    })

    test('preserves existing type when updating with invalid type', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.type = { value: 'node' }
      existing.metadata = { status: 'draft' }
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: { name: 'existing', status: 'active', type: 'not-a-real-type' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/existing')
      expect(saved.type.value).toBe('node')
    })
  })

  describe('execute() - Description handling', () => {
    test('preserves existing description when updating', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.description = 'Original description'
      existing.metadata = { status: 'draft' }
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: { name: 'existing', status: 'active', focus: 'New focus' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/existing')
      expect(saved.description).toBe('Original description')
    })

    test('sets description from focus when no existing description', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.metadata = { status: 'draft' }
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: { name: 'existing', status: 'active', focus: 'New focus' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/existing')
      expect(saved.description).toBe('New focus')
    })
  })

  describe('execute() - Metadata handling', () => {
    test('preserves extra metadata fields when updating', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.metadata = { status: 'draft', customField: 'preserved', tags: ['important'] }
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: { name: 'existing', status: 'active', progress: 50 }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/existing')
      expect(saved.metadata.status).toBe('active')
      expect(saved.metadata.progress).toBe(50)
      expect(saved.metadata.customField).toBe('preserved')
      expect(saved.metadata.tags).toEqual(['important'])
    })

    test('stores phase and version from parsed data', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/versioned',
          file: '/projects/versioned/.STATUS',
          parsed: {
            name: 'versioned',
            status: 'released',
            phase: 'v2.0.0 Development',
            version: '1.5.0'
          }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/versioned')
      expect(saved.metadata.phase).toBe('v2.0.0 Development')
      expect(saved.metadata.version).toBe('1.5.0')
    })

    test('adds syncedAt timestamp', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/synced',
          file: '/projects/synced/.STATUS',
          parsed: { name: 'synced', status: 'active' }
        }
      ]

      const beforeSync = new Date()
      await useCase.execute({ rootPath: '/projects' })
      const afterSync = new Date()

      const saved = await projectRepo.findByPath('/projects/synced')
      const syncedAt = new Date(saved.metadata.syncedAt)
      expect(syncedAt.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime())
      expect(syncedAt.getTime()).toBeLessThanOrEqual(afterSync.getTime())
    })
  })

  describe('execute() - Change detection', () => {
    test('detects phase changes', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.metadata = { status: 'active', phase: 'Phase 1' }
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: { name: 'existing', status: 'active', phase: 'Phase 2' }
        }
      ]

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.updated).toHaveLength(1)
      expect(result.updated[0].changes).toContain('phase: Phase 1 → Phase 2')
    })

    test('detects priority changes', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.metadata = { status: 'active', priority: 3 }
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: { name: 'existing', status: 'active', priority: 1 }
        }
      ]

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.updated).toHaveLength(1)
      expect(result.updated[0].changes).toContain('priority: 3 → 1')
    })

    test('handles undefined metadata gracefully', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      // No metadata set at all
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: { name: 'existing', status: 'active' }
        }
      ]

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.updated).toHaveLength(1)
      expect(result.updated[0].changes).toContain('status: none → active')
    })
  })

  describe('execute() - ID generation', () => {
    test('generates ID from project name', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/my-project',
          file: '/projects/my-project/.STATUS',
          parsed: { name: 'My Project', status: 'active' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/my-project')
      expect(saved.id).toBe('my-project')
    })

    test('sanitizes special characters in ID', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/special',
          file: '/projects/special/.STATUS',
          parsed: { name: 'Project @#$ Special!', status: 'active' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/special')
      expect(saved.id).toBe('project-special')
    })

    test('handles names with leading/trailing dashes', async () => {
      statusParser.scanResults = [
        {
          path: '/projects/dashed',
          file: '/projects/dashed/.STATUS',
          parsed: { name: '---Dashed Project---', status: 'active' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/dashed')
      expect(saved.id).toBe('dashed-project')
    })
  })

  describe('execute() - Scan options passthrough', () => {
    test('passes maxDepth option to scanner', async () => {
      let receivedOptions = null
      statusParser.scanDirectory = async (rootPath, options) => {
        receivedOptions = options
        return []
      }

      await useCase.execute({
        rootPath: '/projects',
        options: { maxDepth: 5 }
      })

      expect(receivedOptions.maxDepth).toBe(5)
    })

    test('passes exclude option to scanner', async () => {
      let receivedOptions = null
      statusParser.scanDirectory = async (rootPath, options) => {
        receivedOptions = options
        return []
      }

      await useCase.execute({
        rootPath: '/projects',
        options: { exclude: ['node_modules', '.git', 'vendor'] }
      })

      expect(receivedOptions.exclude).toEqual(['node_modules', '.git', 'vendor'])
    })
  })

  describe('execute() - Statistics preservation', () => {
    test('preserves lastAccessedAt when updating', async () => {
      const existing = new Project('existing-id', 'existing', { path: '/projects/existing' })
      existing.metadata = { status: 'draft' }
      existing.lastAccessedAt = new Date('2025-01-01')
      await projectRepo.save(existing)

      statusParser.scanResults = [
        {
          path: '/projects/existing',
          file: '/projects/existing/.STATUS',
          parsed: { name: 'existing', status: 'active' }
        }
      ]

      await useCase.execute({ rootPath: '/projects' })

      const saved = await projectRepo.findByPath('/projects/existing')
      expect(saved.lastAccessedAt.toISOString()).toBe(new Date('2025-01-01').toISOString())
    })
  })

  describe('execute() - Empty results', () => {
    test('returns empty results when no .STATUS files found', async () => {
      statusParser.scanResults = []

      const result = await useCase.execute({ rootPath: '/projects' })

      expect(result.scanned).toBe(0)
      expect(result.synced).toEqual([])
      expect(result.created).toEqual([])
      expect(result.updated).toEqual([])
      expect(result.summary.total).toBe(0)
    })
  })
})
