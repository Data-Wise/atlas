/**
 * UpdateStatusUseCase Tests
 *
 * Tests programmatic .STATUS file updates including:
 * - Status changes (active, paused, blocked, archived, complete)
 * - Progress updates
 * - Focus/checkpoint changes
 * - Next action management
 * - Metrics updates
 * - Helper methods (incrementProgress, completeNextAction)
 */

import { UpdateStatusUseCase } from '../../../src/use-cases/status/UpdateStatusUseCase.js'

// Mock project repository
class MockProjectRepository {
  constructor() {
    this.projects = new Map()
  }

  async findById(id) {
    return this.projects.get(id) || null
  }

  async findByPath(path) {
    for (const project of this.projects.values()) {
      if (project.path === path) return project
    }
    return null
  }

  async save(project) {
    this.projects.set(project.id || project.path, project)
  }

  addProject(project) {
    this.projects.set(project.id || project.path, project)
  }
}

// Mock status file gateway
class MockStatusFileGateway {
  constructor() {
    this.files = new Map()
  }

  async read(path) {
    return this.files.get(path) || null
  }

  async write(path, data) {
    this.files.set(path, data)
  }

  setFile(path, data) {
    this.files.set(path, data)
  }

  getFile(path) {
    return this.files.get(path)
  }
}

describe('UpdateStatusUseCase', () => {
  let useCase
  let mockProjectRepo
  let mockStatusFileGateway
  let defaultStatusData

  beforeEach(() => {
    mockProjectRepo = new MockProjectRepository()
    mockStatusFileGateway = new MockStatusFileGateway()

    defaultStatusData = {
      status: 'active',
      progress: 25,
      type: 'node-package',
      next: [{ action: 'Write tests', priority: 'high' }],
      metrics: {},
      body: ''
    }

    // Set up default .STATUS file
    mockStatusFileGateway.setFile('/test/project', { ...defaultStatusData })

    useCase = new UpdateStatusUseCase({
      projectRepository: mockProjectRepo,
      statusFileGateway: mockStatusFileGateway
    })
  })

  describe('constructor', () => {
    test('stores dependencies', () => {
      expect(useCase.projectRepository).toBe(mockProjectRepo)
      expect(useCase.statusFileGateway).toBe(mockStatusFileGateway)
    })
  })

  describe('execute() - basic validation', () => {
    test('throws error when project is not provided', async () => {
      await expect(useCase.execute({})).rejects.toThrow('project is required')
    })

    test('throws error for invalid status value', async () => {
      await expect(useCase.execute({
        project: '/test/project',
        updates: { status: 'invalid' }
      })).rejects.toThrow('Invalid status')
    })

    test('throws error for invalid progress value', async () => {
      await expect(useCase.execute({
        project: '/test/project',
        updates: { progress: 150 }
      })).rejects.toThrow('Progress must be a number between 0 and 100')
    })

    test('throws error for negative progress value', async () => {
      await expect(useCase.execute({
        project: '/test/project',
        updates: { progress: -10 }
      })).rejects.toThrow('Progress must be a number between 0 and 100')
    })
  })

  describe('execute() - finding project', () => {
    test('uses project path directly when not found by ID', async () => {
      await useCase.execute({
        project: '/test/project',
        updates: { status: 'active' }
      })

      expect(mockStatusFileGateway.getFile('/test/project')).toBeTruthy()
    })

    test('uses project path from repository when found by ID', async () => {
      mockProjectRepo.addProject({
        id: 'my-project',
        path: '/actual/path',
        metadata: {},
        touch: () => {}
      })
      mockStatusFileGateway.setFile('/actual/path', { ...defaultStatusData })

      await useCase.execute({
        project: 'my-project',
        updates: { status: 'paused' }
      })

      expect(mockStatusFileGateway.getFile('/actual/path').status).toBe('paused')
    })

    test('uses project path from repository when found by path', async () => {
      mockProjectRepo.addProject({
        path: '/search/path',
        metadata: {},
        touch: () => {}
      })
      mockStatusFileGateway.setFile('/search/path', { ...defaultStatusData })

      await useCase.execute({
        project: '/search/path',
        updates: { status: 'active' }
      })

      expect(mockStatusFileGateway.getFile('/search/path')).toBeTruthy()
    })
  })

  describe('execute() - .STATUS file missing', () => {
    test('returns error when .STATUS missing and createIfMissing is false', async () => {
      const result = await useCase.execute({
        project: '/missing/project',
        updates: { status: 'active' }
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain('No .STATUS file found')
      expect(mockStatusFileGateway.getFile('/missing/project')).toBeUndefined()
    })

    test('creates new .STATUS when createIfMissing is true', async () => {
      const result = await useCase.execute({
        project: '/new/project',
        updates: { status: 'active' },
        createIfMissing: true
      })

      expect(result.success).toBe(true)
      expect(mockStatusFileGateway.getFile('/new/project')).toBeTruthy()
    })

    test('initializes new .STATUS with defaults', async () => {
      await useCase.execute({
        project: '/new/project',
        updates: {},
        createIfMissing: true
      })

      const statusData = mockStatusFileGateway.getFile('/new/project')
      expect(statusData.status).toBe('active')
      expect(statusData.progress).toBe(0)
      expect(statusData.type).toBe('generic')
      expect(statusData.next).toEqual([])
    })
  })

  describe('execute() - status updates', () => {
    test('updates status field', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { status: 'paused' }
      })

      expect(result.success).toBe(true)
      expect(result.changes).toContain('status: active \u2192 paused')
      expect(mockStatusFileGateway.getFile('/test/project').status).toBe('paused')
    })

    test('accepts all valid status values', async () => {
      const validStatuses = ['active', 'paused', 'blocked', 'archived', 'complete', 'draft']

      for (const status of validStatuses) {
        mockStatusFileGateway.setFile('/test/project', {
          status: 'active',
          progress: 0,
          next: [],
          metrics: {}
        })

        const result = await useCase.execute({
          project: '/test/project',
          updates: { status }
        })

        expect(result.success).toBe(true)
      }
    })

    test('no change when status is same', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { status: 'active' }
      })

      expect(result.success).toBe(true)
      expect(result.changes.some(c => c.includes('status'))).toBe(false)
    })
  })

  describe('execute() - progress updates', () => {
    test('updates progress field', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { progress: 75 }
      })

      expect(result.success).toBe(true)
      expect(result.changes).toContain('progress: 25% \u2192 75%')
      expect(mockStatusFileGateway.getFile('/test/project').progress).toBe(75)
    })

    test('accepts progress as string', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { progress: '50' }
      })

      expect(result.success).toBe(true)
      expect(mockStatusFileGateway.getFile('/test/project').progress).toBe(50)
    })

    test('no change when progress is same', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { progress: 25 }
      })

      expect(result.changes.some(c => c.includes('progress'))).toBe(false)
    })
  })

  describe('execute() - focus updates', () => {
    test('updates focus/checkpoint field', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { focus: 'Implementing feature X' }
      })

      expect(result.success).toBe(true)
      expect(result.changes).toContain('focus: "Implementing feature X"')
      expect(mockStatusFileGateway.getFile('/test/project').checkpoint).toBe('Implementing feature X')
    })
  })

  describe('execute() - type updates', () => {
    test('updates type field', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { type: 'r-package' }
      })

      expect(result.success).toBe(true)
      expect(result.changes).toContain('type: node-package \u2192 r-package')
      expect(mockStatusFileGateway.getFile('/test/project').type).toBe('r-package')
    })
  })

  describe('execute() - next actions updates', () => {
    test('updates next actions from string', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { next: 'Add more tests' }
      })

      expect(result.success).toBe(true)
      expect(mockStatusFileGateway.getFile('/test/project').next).toEqual([
        { action: 'Add more tests', priority: 'medium' }
      ])
    })

    test('updates next actions from array of strings', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { next: ['Task 1', 'Task 2', 'Task 3'] }
      })

      expect(result.success).toBe(true)
      expect(mockStatusFileGateway.getFile('/test/project').next).toEqual([
        { action: 'Task 1', priority: 'medium' },
        { action: 'Task 2', priority: 'medium' },
        { action: 'Task 3', priority: 'medium' }
      ])
    })

    test('updates next actions from array of objects', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: {
          next: [
            { action: 'High priority task', priority: 'high' },
            { action: 'Low priority task', priority: 'low' }
          ]
        }
      })

      expect(result.success).toBe(true)
      expect(mockStatusFileGateway.getFile('/test/project').next).toEqual([
        { action: 'High priority task', priority: 'high' },
        { action: 'Low priority task', priority: 'low' }
      ])
    })

    test('reports action count in changes', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { next: ['Task 1', 'Task 2'] }
      })

      expect(result.changes).toContain('next: 2 action(s)')
    })
  })

  describe('execute() - metrics updates', () => {
    test('updates metrics by merging', async () => {
      mockStatusFileGateway.setFile('/test/project', {
        status: 'active',
        progress: 25,
        next: [],
        metrics: { tests_passed: 100 }
      })

      const result = await useCase.execute({
        project: '/test/project',
        updates: { metrics: { coverage: 85 } }
      })

      expect(result.success).toBe(true)
      const metrics = mockStatusFileGateway.getFile('/test/project').metrics
      expect(metrics.tests_passed).toBe(100)
      expect(metrics.coverage).toBe(85)
    })

    test('adds last_updated to metrics', async () => {
      await useCase.execute({
        project: '/test/project',
        updates: { progress: 50 }
      })

      const metrics = mockStatusFileGateway.getFile('/test/project').metrics
      expect(metrics.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('execute() - body updates', () => {
    test('updates body content', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { body: '# New content\n\nSome text here.' }
      })

      expect(result.success).toBe(true)
      expect(result.changes).toContain('body: updated')
      expect(mockStatusFileGateway.getFile('/test/project').body).toBe('# New content\n\nSome text here.')
    })
  })

  describe('execute() - project repository updates', () => {
    test('updates project in registry when project exists', async () => {
      let touchCalled = false
      const mockProject = {
        id: 'my-project',
        path: '/test/project',
        metadata: {},
        touch: () => { touchCalled = true }
      }
      mockProjectRepo.addProject(mockProject)

      await useCase.execute({
        project: 'my-project',
        updates: { status: 'paused', progress: 50 }
      })

      expect(touchCalled).toBe(true)
      expect(mockProject.metadata.status).toBe('paused')
      expect(mockProject.metadata.progress).toBe(50)
    })

    test('updates nextAction from first next action', async () => {
      const mockProject = {
        id: 'my-project',
        path: '/test/project',
        metadata: {},
        touch: () => {}
      }
      mockProjectRepo.addProject(mockProject)

      await useCase.execute({
        project: 'my-project',
        updates: { next: ['First task', 'Second task'] }
      })

      expect(mockProject.metadata.nextAction).toBe('First task')
    })
  })

  describe('execute() - result object', () => {
    test('returns success with path and changes', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: { status: 'blocked', progress: 30 }
      })

      expect(result.success).toBe(true)
      expect(result.path).toBe('/test/project')
      expect(result.changes).toBeInstanceOf(Array)
      expect(result.message).toContain('Updated .STATUS')
    })

    test('returns "No changes made" when nothing changes', async () => {
      mockStatusFileGateway.setFile('/test/project', {
        status: 'active',
        progress: 25,
        type: 'node-package',
        next: [],
        metrics: {}
      })

      const result = await useCase.execute({
        project: '/test/project',
        updates: { status: 'active', progress: 25 }
      })

      expect(result.message).toBe('No changes made')
      expect(result.changes).toEqual([])
    })
  })

  describe('incrementProgress()', () => {
    test('increments progress by default amount (10)', async () => {
      await useCase.incrementProgress('/test/project')

      expect(mockStatusFileGateway.getFile('/test/project').progress).toBe(35) // 25 + 10
    })

    test('increments progress by custom amount', async () => {
      await useCase.incrementProgress('/test/project', 25)

      expect(mockStatusFileGateway.getFile('/test/project').progress).toBe(50) // 25 + 25
    })

    test('caps progress at 100', async () => {
      mockStatusFileGateway.setFile('/test/project', {
        status: 'active',
        progress: 90,
        next: [],
        metrics: {}
      })

      await useCase.incrementProgress('/test/project', 20)

      expect(mockStatusFileGateway.getFile('/test/project').progress).toBe(100)
    })

    test('throws error when .STATUS file not found', async () => {
      await expect(useCase.incrementProgress('/missing/project'))
        .rejects.toThrow('No .STATUS file found')
    })

    test('handles project lookup by ID', async () => {
      mockProjectRepo.addProject({
        id: 'my-project',
        path: '/actual/path',
        metadata: {},
        touch: () => {}
      })
      mockStatusFileGateway.setFile('/actual/path', { ...defaultStatusData })

      await useCase.incrementProgress('my-project', 10)

      expect(mockStatusFileGateway.getFile('/actual/path').progress).toBe(35)
    })
  })

  describe('completeNextAction()', () => {
    test('removes first action from next array', async () => {
      mockStatusFileGateway.setFile('/test/project', {
        status: 'active',
        progress: 25,
        next: [
          { action: 'First task', priority: 'high' },
          { action: 'Second task', priority: 'medium' }
        ],
        metrics: {}
      })

      const result = await useCase.completeNextAction('/test/project')

      expect(result.success).toBe(true)
      expect(result.completedAction).toBe('First task')
      expect(result.message).toContain('Completed: "First task"')
      expect(mockStatusFileGateway.getFile('/test/project').next).toEqual([
        { action: 'Second task', priority: 'medium' }
      ])
    })

    test('adds new action when provided', async () => {
      mockStatusFileGateway.setFile('/test/project', {
        status: 'active',
        progress: 25,
        next: [{ action: 'Current task', priority: 'high' }],
        metrics: {}
      })

      const result = await useCase.completeNextAction('/test/project', 'New task')

      expect(result.message).toContain('Next: "New task"')
      expect(mockStatusFileGateway.getFile('/test/project').next).toEqual([
        { action: 'New task', priority: 'medium' }
      ])
    })

    test('handles empty next array', async () => {
      mockStatusFileGateway.setFile('/test/project', {
        status: 'active',
        progress: 25,
        next: [],
        metrics: {}
      })

      const result = await useCase.completeNextAction('/test/project')

      expect(result.success).toBe(true)
      expect(result.completedAction).toBeUndefined()
      expect(result.message).toBe('No action to complete')
    })

    test('throws error when .STATUS file not found', async () => {
      await expect(useCase.completeNextAction('/missing/project'))
        .rejects.toThrow('No .STATUS file found')
    })

    test('creates next array when undefined and new action provided', async () => {
      mockStatusFileGateway.setFile('/test/project', {
        status: 'active',
        progress: 25,
        metrics: {}
      })

      await useCase.completeNextAction('/test/project', 'First task')

      expect(mockStatusFileGateway.getFile('/test/project').next).toEqual([
        { action: 'First task', priority: 'medium' }
      ])
    })
  })

  describe('multiple updates at once', () => {
    test('applies multiple updates in single call', async () => {
      const result = await useCase.execute({
        project: '/test/project',
        updates: {
          status: 'blocked',
          progress: 50,
          focus: 'Waiting for dependency',
          next: ['Resolve blocker', 'Continue work']
        }
      })

      expect(result.success).toBe(true)
      expect(result.changes.length).toBe(4)

      const statusData = mockStatusFileGateway.getFile('/test/project')
      expect(statusData.status).toBe('blocked')
      expect(statusData.progress).toBe(50)
      expect(statusData.checkpoint).toBe('Waiting for dependency')
      expect(statusData.next.length).toBe(2)
    })
  })
})
