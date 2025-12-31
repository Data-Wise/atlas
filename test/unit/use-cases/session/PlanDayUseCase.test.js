/**
 * PlanDayUseCase Tests
 *
 * Tests for the morning planning ritual use case.
 */

import { jest, beforeEach, describe, test, expect } from '@jest/globals'
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
  async list() {
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
  })
})
