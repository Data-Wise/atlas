/**
 * Unit tests for EndSessionUseCase
 */

import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EndSessionUseCase } from '../../../src/use-cases/session/EndSessionUseCase.js'
import { Session } from '../../../src/domain/entities/Session.js'
import { Project } from '../../../src/domain/entities/Project.js'
import { GitGateway } from '../../../src/adapters/gateways/GitGateway.js'

// Mock repositories
class MockSessionRepository {
  constructor() {
    this.sessions = []
  }

  async findActive() {
    return this.sessions.find(s => s.state.isActive()) || null
  }

  async findById(id) {
    return this.sessions.find(s => s.id === id) || null
  }

  async save(session) {
    const index = this.sessions.findIndex(s => s.id === session.id)
    if (index >= 0) {
      this.sessions[index] = session
    } else {
      this.sessions.push(session)
    }
    return session
  }
}

class MockProjectRepository {
  constructor() {
    this.projects = []
  }

  async findById(id) {
    return this.projects.find(p => p.id === id) || null
  }

  async save(project) {
    const index = this.projects.findIndex(p => p.id === project.id)
    if (index >= 0) {
      this.projects[index] = project
    } else {
      this.projects.push(project)
    }
    return project
  }
}

describe('EndSessionUseCase', () => {
  let useCase
  let sessionRepo
  let projectRepo

  beforeEach(() => {
    sessionRepo = new MockSessionRepository()
    projectRepo = new MockProjectRepository()
    useCase = new EndSessionUseCase(sessionRepo, projectRepo)
  })

  describe('Success Cases - Active Session', () => {
    test('ends active session with default outcome', async () => {
      const session = new Session('session-1', 'rmediation')
      sessionRepo.sessions.push(session)

      const { session: endedSession } = await useCase.execute()

      expect(endedSession.state.isEnded()).toBe(true)
      expect(endedSession.outcome).toBe('completed')
      expect(endedSession.endTime).toBeInstanceOf(Date)
    })

    test('ends active session with specified outcome', async () => {
      const session = new Session('session-1', 'rmediation')
      sessionRepo.sessions.push(session)

      const { session: endedSession } = await useCase.execute({ outcome: 'cancelled' })

      expect(endedSession.outcome).toBe('cancelled')
    })

    test('saves ended session to repository', async () => {
      const session = new Session('session-1', 'rmediation')
      sessionRepo.sessions.push(session)

      await useCase.execute()

      const savedSession = sessionRepo.sessions.find(s => s.id === 'session-1')
      expect(savedSession.state.isEnded()).toBe(true)
    })

    test('updates project statistics when session ends', async () => {
      const session = new Session('session-1', 'rmediation')
      // Simulate 30 minutes of work
      session.startTime = new Date(Date.now() - 30 * 60 * 1000)
      sessionRepo.sessions.push(session)

      const project = new Project('rmediation', 'rmediation')
      projectRepo.projects.push(project)

      await useCase.execute()

      expect(project.totalSessions).toBe(1)
      expect(project.totalDuration).toBeGreaterThanOrEqual(29)
      expect(project.totalDuration).toBeLessThanOrEqual(31)
    })

    test('does not fail if project does not exist', async () => {
      const session = new Session('session-1', 'nonexistent-project')
      sessionRepo.sessions.push(session)

      await expect(useCase.execute()).resolves.toBeTruthy()
    })
  })

  describe('Success Cases - Specific Session', () => {
    test('ends session by ID', async () => {
      const session = new Session('session-123', 'rmediation')
      sessionRepo.sessions.push(session)

      const { session: endedSession } = await useCase.execute({ sessionId: 'session-123' })

      expect(endedSession.id).toBe('session-123')
      expect(endedSession.state.isEnded()).toBe(true)
    })

    test('can end paused session by ID', async () => {
      const session = new Session('session-1', 'rmediation')
      session.pause()
      sessionRepo.sessions.push(session)

      const { session: endedSession } = await useCase.execute({ sessionId: 'session-1' })

      expect(endedSession.state.isEnded()).toBe(true)
    })
  })

  describe('Validation', () => {
    test('throws error if no active session found', async () => {
      await expect(useCase.execute()).rejects.toThrow('No active session found to end')
    })

    test('throws error if session ID not found', async () => {
      await expect(useCase.execute({ sessionId: 'nonexistent' })).rejects.toThrow(
        'Session not found: nonexistent'
      )
    })

    test('throws error for invalid outcome', async () => {
      const session = new Session('session-1', 'rmediation')
      sessionRepo.sessions.push(session)

      await expect(useCase.execute({ outcome: 'invalid' })).rejects.toThrow(
        'Invalid outcome: invalid'
      )
    })

    test('accepts all valid outcomes', async () => {
      const outcomes = ['completed', 'cancelled', 'interrupted']

      for (const outcome of outcomes) {
        const session = new Session(`session-${outcome}`, 'rmediation')
        sessionRepo.sessions.push(session)

        const { session: endedSession } = await useCase.execute({
          sessionId: session.id,
          outcome
        })

        expect(endedSession.outcome).toBe(outcome)
      }
    })
  })

  describe('Business Rules', () => {
    test('throws error when ending already ended session', async () => {
      const session = new Session('session-1', 'rmediation')
      session.end('completed')
      sessionRepo.sessions.push(session)

      await expect(useCase.execute({ sessionId: 'session-1' })).rejects.toThrow(
        "Cannot end session: invalid transition from 'ended' to 'ended'"
      )
    })

    test('calculates duration correctly for ended session', async () => {
      const session = new Session('session-1', 'rmediation')
      // Simulate 45 minutes of work
      session.startTime = new Date(Date.now() - 45 * 60 * 1000)
      sessionRepo.sessions.push(session)

      const { session: endedSession } = await useCase.execute()

      const duration = endedSession.getDuration()
      expect(duration).toBeGreaterThanOrEqual(44)
      expect(duration).toBeLessThanOrEqual(46)
    })

    test('excludes paused time from duration', async () => {
      const session = new Session('session-1', 'rmediation')
      // Started 60 minutes ago
      session.startTime = new Date(Date.now() - 60 * 60 * 1000)
      // Paused for 30 minutes
      session.totalPausedTime = 30 * 60 * 1000
      sessionRepo.sessions.push(session)

      const { session: endedSession } = await useCase.execute()

      const duration = endedSession.getDuration()
      expect(duration).toBeGreaterThanOrEqual(29)
      expect(duration).toBeLessThanOrEqual(31)
    })
  })

  describe('Evidence-linked done (git delta)', () => {
    let repoDir

    beforeEach(() => {
      repoDir = mkdtempSync(join(tmpdir(), 'atlas-endsession-fixture-'))
      execSync('git init -q', { cwd: repoDir })
      execSync('git config user.email test@example.com', { cwd: repoDir })
      execSync('git config user.name test', { cwd: repoDir })
    })

    afterEach(() => {
      rmSync(repoDir, { recursive: true, force: true })
    })

    test('delta present: reports commits/files made during the session', async () => {
      execSync('echo init > f.txt && git add f.txt && git commit -qm init', {
        cwd: repoDir,
        shell: '/bin/bash'
      })

      const session = new Session('session-1', 'fixture')
      session.startTime = new Date(Date.now() - 60 * 1000) // 1 minute ago
      sessionRepo.sessions.push(session)

      const project = new Project('fixture', 'fixture')
      project.path = repoDir
      projectRepo.projects.push(project)

      // Make a commit that lands after the session start
      execSync('echo more >> f.txt && git add f.txt && git commit -qm "work done"', {
        cwd: repoDir,
        shell: '/bin/bash'
      })

      const gitUseCase = new EndSessionUseCase(sessionRepo, projectRepo, new GitGateway())
      const { gitDelta } = await gitUseCase.execute({ sessionId: 'session-1' })

      expect(gitDelta).not.toBeNull()
      expect(gitDelta.hasActivity).toBe(true)
      expect(gitDelta.commits.length).toBeGreaterThanOrEqual(1)
      expect(gitDelta.commits[0].subject).toBe('work done')
      expect(gitDelta.files).toContain('f.txt')
    })

    test('delta empty: session with zero git activity degrades to empty commits, not an error', async () => {
      execSync('echo init > f.txt && git add f.txt && git commit -qm init', {
        cwd: repoDir,
        shell: '/bin/bash'
      })

      const session = new Session('session-1', 'fixture')
      session.startTime = new Date(Date.now() + 60 * 1000) // 1 minute in the future, no commits since
      sessionRepo.sessions.push(session)

      const project = new Project('fixture', 'fixture')
      project.path = repoDir
      projectRepo.projects.push(project)

      const gitUseCase = new EndSessionUseCase(sessionRepo, projectRepo, new GitGateway())
      const { gitDelta } = await gitUseCase.execute({ sessionId: 'session-1' })

      expect(gitDelta).not.toBeNull()
      expect(gitDelta.hasActivity).toBe(false)
      expect(gitDelta.commits).toEqual([])
    })

    test('non-git project: degrades gracefully to gitDelta: null, session still ends', async () => {
      const nonGitDir = mkdtempSync(join(tmpdir(), 'atlas-endsession-nongit-'))
      try {
        const session = new Session('session-1', 'plain')
        sessionRepo.sessions.push(session)

        const project = new Project('plain', 'plain')
        project.path = nonGitDir
        projectRepo.projects.push(project)

        const gitUseCase = new EndSessionUseCase(sessionRepo, projectRepo, new GitGateway())
        const { session: endedSession, gitDelta } = await gitUseCase.execute({ sessionId: 'session-1' })

        expect(gitDelta).toBeNull()
        expect(endedSession.state.isEnded()).toBe(true)
      } finally {
        rmSync(nonGitDir, { recursive: true, force: true })
      }
    })

    test('no gitGateway injected: gitDelta stays null (backward-compatible default)', async () => {
      const session = new Session('session-1', 'fixture')
      sessionRepo.sessions.push(session)

      const result = await useCase.execute({ sessionId: 'session-1' })

      expect(result.gitDelta).toBeNull()
      expect(result.synced).toBe(false)
    })
  })

  describe('Scoped auto-sync after session end', () => {
    test('runs sync scoped to the session project when syncFromStatusUseCase is provided', async () => {
      const session = new Session('session-1', 'fixture')
      sessionRepo.sessions.push(session)

      const project = new Project('fixture', 'fixture')
      project.path = '/tmp/does-not-matter'
      projectRepo.projects.push(project)

      let calledWith = null
      const fakeSync = { execute: async input => { calledWith = input; return {} } }

      const syncUseCase = new EndSessionUseCase(sessionRepo, projectRepo, null, fakeSync)
      const { synced } = await syncUseCase.execute({ sessionId: 'session-1' })

      expect(synced).toBe(true)
      expect(calledWith.rootPath).toBe('/tmp/does-not-matter')
    })

    test('sync failure does not block session end (best-effort)', async () => {
      const session = new Session('session-1', 'fixture')
      sessionRepo.sessions.push(session)

      const project = new Project('fixture', 'fixture')
      project.path = '/tmp/does-not-matter'
      projectRepo.projects.push(project)

      const failingSync = { execute: async () => { throw new Error('boom') } }

      const syncUseCase = new EndSessionUseCase(sessionRepo, projectRepo, null, failingSync)
      const { session: endedSession, synced } = await syncUseCase.execute({ sessionId: 'session-1' })

      expect(synced).toBe(false)
      expect(endedSession.state.isEnded()).toBe(true)
    })
  })
})
