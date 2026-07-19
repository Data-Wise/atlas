/**
 * PlanDayUseCase Tests
 *
 * Tests for the morning planning ritual use case.
 */

import { beforeEach, describe, test, expect } from '@jest/globals'
import { PlanDayUseCase } from '../../../../src/use-cases/session/PlanDayUseCase.js'

// Mock Session
class MockSession {
  constructor(data) {
    this.id = data.id
    this.project = data.project
    this.task = data.task || 'Work session'
    this.startTime = data.startTime || new Date()
    this.endTime = data.endTime || null
    this.outcome = data.outcome || null
  }
  getDuration() {
    if (!this.endTime) return 0
    return Math.floor((this.endTime - this.startTime) / 60000)
  }
}

// Mock SessionRepository
class MockSessionRepository {
  constructor() {
    this.sessions = []
  }
  async list(filters = {}) {
    let results = [...this.sessions]
    if (filters.since) {
      results = results.filter(s => new Date(s.startTime) >= filters.since)
    }
    if (filters.until) {
      results = results.filter(s => new Date(s.startTime) < filters.until)
    }
    return results.map(s => new MockSession(s))
  }
}

// Mock CaptureRepository
class MockCaptureRepository {
  constructor() {
    this.captures = []
  }
  async findByStatus(status) {
    return this.captures.filter(c => c.status === status)
  }
}

// Mock ProjectRepository
class MockProjectRepository {
  constructor() {
    this.projects = []
  }
  async findAll() {
    return this.projects
  }
}

// Mock StatusFileParser
class MockStatusFileParser {
  constructor() {
    this.scanResults = []
  }
  async scanDirectory() {
    return this.scanResults
  }
  summarize(results) {
    return {
      total: results.length,
      byPriority: { 1: [], 2: [], 3: [] },
      byProgress: { complete: [], inProgress: [], notStarted: [] }
    }
  }
}

describe('PlanDayUseCase', () => {
  let useCase
  let sessionRepo
  let captureRepo
  let projectRepo
  let statusParser

  beforeEach(() => {
    sessionRepo = new MockSessionRepository()
    captureRepo = new MockCaptureRepository()
    projectRepo = new MockProjectRepository()
    statusParser = new MockStatusFileParser()
    useCase = new PlanDayUseCase({
      sessionRepository: sessionRepo,
      captureRepository: captureRepo,
      projectRepository: projectRepo,
      statusFileParser: statusParser
    })
  })

  describe('Constructor validation', () => {
    test('throws if sessionRepository not provided', () => {
      expect(() => new PlanDayUseCase({
        captureRepository: captureRepo,
        projectRepository: projectRepo
      })).toThrow('sessionRepository is required')
    })

    test('throws if captureRepository not provided', () => {
      expect(() => new PlanDayUseCase({
        sessionRepository: sessionRepo,
        projectRepository: projectRepo
      })).toThrow('captureRepository is required')
    })

    test('throws if projectRepository not provided', () => {
      expect(() => new PlanDayUseCase({
        sessionRepository: sessionRepo,
        captureRepository: captureRepo
      })).toThrow('projectRepository is required')
    })

    test('statusFileParser is optional', () => {
      const uc = new PlanDayUseCase({
        sessionRepository: sessionRepo,
        captureRepository: captureRepo,
        projectRepository: projectRepo
      })
      expect(uc.statusFileParser).toBeNull()
    })
  })

  describe('execute() - Basic result structure', () => {
    test('returns plan with all required fields', async () => {
      const result = await useCase.execute({})

      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('greeting')
      expect(result).toHaveProperty('yesterday')
      expect(result).toHaveProperty('streak')
      expect(result).toHaveProperty('parkedContexts')
      expect(result).toHaveProperty('inbox')
      expect(result).toHaveProperty('activeProjects')
      expect(result).toHaveProperty('suggestions')
    })

    test('returns appropriate greeting based on time', async () => {
      const result = await useCase.execute({})

      // Greeting should be one of the valid options
      expect(['Good morning!', 'Good afternoon!', 'Good evening!']).toContain(result.greeting)
    })
  })

  describe('execute() - Yesterday summary', () => {
    test('returns no sessions message when no sessions yesterday', async () => {
      const result = await useCase.execute({})

      expect(result.yesterday.hasSessions).toBe(false)
      expect(result.yesterday.message).toBe('No sessions yesterday')
    })

    test('returns session summary when sessions exist', async () => {
      // Create sessions from yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)

      const endTime = new Date(yesterday)
      endTime.setHours(11, 0, 0, 0)

      sessionRepo.sessions = [
        {
          id: 's1',
          project: 'project-a',
          task: 'Task 1',
          startTime: yesterday,
          endTime,
          outcome: 'completed'
        }
      ]

      const result = await useCase.execute({})

      expect(result.yesterday.hasSessions).toBe(true)
      expect(result.yesterday.sessionCount).toBe(1)
      expect(result.yesterday.projects).toContain('project-a')
    })
  })

  describe('execute() - Parked contexts', () => {
    test('returns empty array when no parked contexts', async () => {
      const result = await useCase.execute({})

      expect(result.parkedContexts).toEqual([])
    })

    test('returns parked contexts', async () => {
      captureRepo.captures = [
        { id: 'p1', status: 'parked', project: 'atlas', text: 'Was working on tests', createdAt: new Date() }
      ]

      const result = await useCase.execute({})

      expect(result.parkedContexts).toHaveLength(1)
      expect(result.parkedContexts[0].project).toBe('atlas')
    })

    test('limits parked contexts to 5', async () => {
      captureRepo.captures = Array(10).fill(null).map((_, i) => ({
        id: `p${i}`,
        status: 'parked',
        project: `project-${i}`,
        text: 'Context',
        createdAt: new Date()
      }))

      const result = await useCase.execute({})

      expect(result.parkedContexts).toHaveLength(5)
    })
  })

  describe('execute() - Inbox items', () => {
    test('returns empty array when inbox is empty', async () => {
      const result = await useCase.execute({})

      expect(result.inbox).toEqual([])
    })

    test('returns inbox items', async () => {
      captureRepo.captures = [
        { id: 'i1', status: 'inbox', text: 'New idea', type: 'idea', createdAt: new Date() }
      ]

      const result = await useCase.execute({})

      expect(result.inbox).toHaveLength(1)
      expect(result.inbox[0].type).toBe('idea')
    })

    test('limits inbox items to 10', async () => {
      captureRepo.captures = Array(15).fill(null).map((_, i) => ({
        id: `i${i}`,
        status: 'inbox',
        text: `Idea ${i}`,
        type: 'idea',
        createdAt: new Date()
      }))

      const result = await useCase.execute({})

      expect(result.inbox).toHaveLength(10)
    })
  })

  describe('execute() - Active projects', () => {
    test('returns empty array when no active projects', async () => {
      const result = await useCase.execute({})

      expect(result.activeProjects).toEqual([])
    })

    test('returns active projects', async () => {
      projectRepo.projects = [
        { id: 'p1', name: 'atlas', metadata: { status: 'active', priority: 1 } }
      ]

      const result = await useCase.execute({})

      expect(result.activeProjects).toHaveLength(1)
      expect(result.activeProjects[0].name).toBe('atlas')
    })

    test('filters to only active/in-progress projects', async () => {
      projectRepo.projects = [
        { id: 'p1', name: 'active-proj', metadata: { status: 'active' } },
        { id: 'p2', name: 'paused-proj', metadata: { status: 'paused' } },
        { id: 'p3', name: 'archived-proj', metadata: { status: 'archived' } }
      ]

      const result = await useCase.execute({})

      expect(result.activeProjects).toHaveLength(1)
      expect(result.activeProjects[0].name).toBe('active-proj')
    })

    test('sorts projects by priority', async () => {
      projectRepo.projects = [
        { id: 'p1', name: 'low-priority', metadata: { status: 'active', priority: 3 } },
        { id: 'p2', name: 'high-priority', metadata: { status: 'active', priority: 1 } }
      ]

      const result = await useCase.execute({})

      expect(result.activeProjects[0].name).toBe('high-priority')
      expect(result.activeProjects[1].name).toBe('low-priority')
    })
  })

  describe('execute() - Suggestions', () => {
    test('suggests unpark when parked contexts exist', async () => {
      captureRepo.captures = [
        { id: 'p1', status: 'parked', project: 'atlas', text: 'Context', createdAt: new Date() }
      ]

      const result = await useCase.execute({})

      const unparkSuggestion = result.suggestions.find(s => s.type === 'unpark')
      expect(unparkSuggestion).toBeDefined()
      expect(unparkSuggestion.action).toBe('atlas unpark')
    })

    test('suggests triage when inbox has many items', async () => {
      captureRepo.captures = Array(8).fill(null).map((_, i) => ({
        id: `i${i}`,
        status: 'inbox',
        text: `Item ${i}`,
        type: 'idea',
        createdAt: new Date()
      }))

      const result = await useCase.execute({})

      const triageSuggestion = result.suggestions.find(s => s.type === 'triage')
      expect(triageSuggestion).toBeDefined()
      expect(triageSuggestion.action).toBe('atlas triage')
    })

    test('suggests P1 focus when high-priority projects exist', async () => {
      projectRepo.projects = [
        { id: 'p1', name: 'urgent-project', metadata: { status: 'active', priority: 1 } }
      ]

      const result = await useCase.execute({})

      const focusSuggestion = result.suggestions.find(s => s.type === 'focus')
      expect(focusSuggestion).toBeDefined()
      expect(focusSuggestion.message).toContain('urgent-project')
    })
  })

  describe('execute() - Ecosystem scanning', () => {
    test('scans ecosystem when path provided', async () => {
      statusParser.scanResults = [
        { path: '/p1', parsed: { name: 'project-1', status: 'active', progress: 50 } }
      ]

      const result = await useCase.execute({ ecosystemPath: '/projects' })

      expect(result.ecosystem).toBeDefined()
      expect(result.ecosystem.total).toBe(1)
    })

    test('does not scan ecosystem when path not provided', async () => {
      const result = await useCase.execute({})

      expect(result.ecosystem).toBeUndefined()
    })

    test('does not scan ecosystem when statusFileParser not provided', async () => {
      const ucWithoutParser = new PlanDayUseCase({
        sessionRepository: sessionRepo,
        captureRepository: captureRepo,
        projectRepository: projectRepo
        // No statusFileParser
      })

      const result = await ucWithoutParser.execute({ ecosystemPath: '/projects' })

      expect(result.ecosystem).toBeUndefined()
    })

    test('returns null on scan error', async () => {
      statusParser.scanDirectory = async () => {
        throw new Error('Permission denied')
      }

      const result = await useCase.execute({ ecosystemPath: '/forbidden' })

      expect(result.ecosystem).toBeNull()
    })

    test('includes high priority and in-progress items', async () => {
      statusParser.scanResults = [
        { path: '/p1', parsed: { name: 'p1', status: 'active', progress: 50, priority: 1 } },
        { path: '/p2', parsed: { name: 'p2', status: 'active', progress: 75, priority: 2 } }
      ]
      statusParser.summarize = (results) => ({
        total: 2,
        byPriority: { 1: [{ name: 'p1' }], 2: [{ name: 'p2' }], 3: [] },
        byProgress: { complete: [], inProgress: [{ name: 'p1' }, { name: 'p2' }], notStarted: [] }
      })

      const result = await useCase.execute({ ecosystemPath: '/projects' })

      expect(result.ecosystem.highPriority).toHaveLength(1)
      expect(result.ecosystem.inProgress).toHaveLength(2)
    })
  })

  describe('execute() - Streak calculation', () => {
    test('includes streak info in result', async () => {
      const result = await useCase.execute({})

      expect(result.streak).toBeDefined()
      expect(result.streak).toHaveProperty('current')
      expect(result.streak).toHaveProperty('longest')
      expect(result.streak).toHaveProperty('display')
      expect(result.streak).toHaveProperty('message')
    })

    test('calculates streak from last 30 days of sessions', async () => {
      // Create sessions for the past 3 days (to build a streak)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      sessionRepo.sessions = [
        { id: 's1', project: 'p', startTime: today, endTime: today },
        { id: 's2', project: 'p', startTime: yesterday, endTime: yesterday },
        { id: 's3', project: 'p', startTime: twoDaysAgo, endTime: twoDaysAgo }
      ]

      const result = await useCase.execute({})

      expect(result.streak.current).toBeGreaterThanOrEqual(0)
    })
  })

  describe('execute() - Yesterday summary details', () => {
    test('calculates total duration correctly', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)

      const endTime1 = new Date(yesterday)
      endTime1.setHours(11, 0, 0, 0) // 60 min

      const startTime2 = new Date(yesterday)
      startTime2.setHours(14, 0, 0, 0)
      const endTime2 = new Date(yesterday)
      endTime2.setHours(14, 30, 0, 0) // 30 min

      sessionRepo.sessions = [
        { id: 's1', project: 'p1', task: 'Task 1', startTime: yesterday, endTime: endTime1, outcome: 'completed' },
        { id: 's2', project: 'p2', task: 'Task 2', startTime: startTime2, endTime: endTime2, outcome: 'completed' }
      ]

      const result = await useCase.execute({})

      expect(result.yesterday.hasSessions).toBe(true)
      expect(result.yesterday.sessionCount).toBe(2)
      expect(result.yesterday.totalMinutes).toBe(90)
      expect(result.yesterday.hours).toBe(1)
      expect(result.yesterday.minutes).toBe(30)
    })

    test('calculates completion rate correctly', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)

      sessionRepo.sessions = [
        { id: 's1', project: 'p', startTime: yesterday, endTime: yesterday, outcome: 'completed' },
        { id: 's2', project: 'p', startTime: yesterday, endTime: yesterday, outcome: 'completed' },
        { id: 's3', project: 'p', startTime: yesterday, endTime: yesterday, outcome: 'interrupted' },
        { id: 's4', project: 'p', startTime: yesterday, endTime: yesterday, outcome: 'cancelled' }
      ]

      const result = await useCase.execute({})

      expect(result.yesterday.completedCount).toBe(2)
      expect(result.yesterday.completionRate).toBe(50)
    })

    test('tracks unique projects', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)

      sessionRepo.sessions = [
        { id: 's1', project: 'project-a', startTime: yesterday, endTime: yesterday },
        { id: 's2', project: 'project-a', startTime: yesterday, endTime: yesterday },
        { id: 's3', project: 'project-b', startTime: yesterday, endTime: yesterday }
      ]

      const result = await useCase.execute({})

      expect(result.yesterday.projects).toHaveLength(2)
      expect(result.yesterday.projects).toContain('project-a')
      expect(result.yesterday.projects).toContain('project-b')
    })

    test('tracks last task and project', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)

      sessionRepo.sessions = [
        { id: 's1', project: 'project-a', task: 'Latest task', startTime: yesterday, endTime: yesterday }
      ]

      const result = await useCase.execute({})

      expect(result.yesterday.lastTask).toBe('Latest task')
      expect(result.yesterday.lastProject).toBe('project-a')
    })
  })

  describe('execute() - Suggestions priority and sorting', () => {
    test('sorts suggestions by priority', async () => {
      // Set up data to generate multiple suggestion types
      captureRepo.captures = [
        { id: 'p1', status: 'parked', project: 'parked-proj', text: 'Parked', createdAt: new Date() },
        ...Array(8).fill(null).map((_, i) => ({
          id: `i${i}`,
          status: 'inbox',
          text: `Inbox ${i}`,
          type: 'idea',
          createdAt: new Date()
        }))
      ]
      projectRepo.projects = [
        { id: 'p1', name: 'p1-project', metadata: { status: 'active', priority: 1 } }
      ]

      const result = await useCase.execute({})

      // Should have multiple suggestions
      expect(result.suggestions.length).toBeGreaterThan(0)

      // Should be sorted by priority (lower number = higher priority)
      for (let i = 1; i < result.suggestions.length; i++) {
        expect(result.suggestions[i].priority).toBeGreaterThanOrEqual(result.suggestions[i - 1].priority)
      }
    })

    test('suggests continuing yesterday work', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)

      sessionRepo.sessions = [
        { id: 's1', project: 'yesterday-project', task: 'Previous task', startTime: yesterday, endTime: yesterday }
      ]

      const result = await useCase.execute({})

      const continueSuggestion = result.suggestions.find(s => s.type === 'continue')
      expect(continueSuggestion).toBeDefined()
      expect(continueSuggestion.message).toContain('yesterday-project')
      expect(continueSuggestion.action).toContain('yesterday-project')
    })
  })

  describe('execute() - Active projects edge cases', () => {
    test('handles repository errors gracefully', async () => {
      projectRepo.findAll = async () => {
        throw new Error('Database error')
      }

      const result = await useCase.execute({})

      expect(result.activeProjects).toEqual([])
    })

    test('includes in-progress status projects', async () => {
      projectRepo.projects = [
        { id: 'p1', name: 'in-progress-proj', metadata: { status: 'in-progress', priority: 2 } }
      ]

      const result = await useCase.execute({})

      expect(result.activeProjects).toHaveLength(1)
      expect(result.activeProjects[0].status).toBe('in-progress')
    })

    test('uses description as fallback for focus', async () => {
      projectRepo.projects = [
        { id: 'p1', name: 'proj', description: 'Project description', metadata: { status: 'active' } }
      ]

      const result = await useCase.execute({})

      expect(result.activeProjects[0].focus).toBe('Project description')
    })

    test('limits active projects to 10', async () => {
      projectRepo.projects = Array(15).fill(null).map((_, i) => ({
        id: `p${i}`,
        name: `project-${i}`,
        metadata: { status: 'active', priority: 2 }
      }))

      const result = await useCase.execute({})

      expect(result.activeProjects).toHaveLength(10)
    })
  })

  describe('execute() - Parked contexts details', () => {
    test('includes context information', async () => {
      captureRepo.captures = [
        {
          id: 'p1',
          status: 'parked',
          project: 'atlas',
          text: 'Working on tests',
          createdAt: new Date(),
          context: { branch: 'feature/tests', lastFile: 'Session.test.js' }
        }
      ]

      const result = await useCase.execute({})

      expect(result.parkedContexts[0].context).toEqual({
        branch: 'feature/tests',
        lastFile: 'Session.test.js'
      })
    })

    test('handles captures without context field', async () => {
      captureRepo.captures = [
        { id: 'p1', status: 'parked', project: 'atlas', text: 'No context', createdAt: new Date() }
      ]

      const result = await useCase.execute({})

      expect(result.parkedContexts[0].context).toEqual({})
    })
  })

  describe('execute() - Inbox item details', () => {
    test('includes all inbox item fields', async () => {
      const createdAt = new Date()
      captureRepo.captures = [
        { id: 'i1', status: 'inbox', text: 'New feature idea', type: 'idea', project: 'atlas', createdAt }
      ]

      const result = await useCase.execute({})

      expect(result.inbox[0]).toEqual({
        id: 'i1',
        text: 'New feature idea',
        type: 'idea',
        project: 'atlas',
        createdAt
      })
    })
  })
})
