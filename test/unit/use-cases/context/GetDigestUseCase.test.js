/**
 * Unit tests for GetDigestUseCase
 *
 * Backs bare `atlas` (no args) — composes GetContextUseCase + PlanDayUseCase
 * + .STATUS focus/next into one digest object. No new storage.
 */

import { GetDigestUseCase } from '../../../../src/use-cases/context/GetDigestUseCase.js'

class FakeGetContextUseCase {
  constructor(result) {
    this.result = result
  }
  async execute() {
    return this.result
  }
}

class FakePlanDayUseCase {
  constructor(result) {
    this.result = result
  }
  async execute() {
    return this.result
  }
}

class FakeStatusFileGateway {
  constructor(data) {
    this.data = data
  }
  async read() {
    return this.data
  }
}

class FakeProjectRepository {
  constructor(project) {
    this.project = project
  }
  async findById() {
    return this.project
  }
  async findByPath() {
    return this.project
  }
}

describe('GetDigestUseCase', () => {
  test('throws when required dependencies are missing', () => {
    expect(() => new GetDigestUseCase({})).toThrow('getContextUseCase is required')
    expect(() => new GetDigestUseCase({ getContextUseCase: {} })).toThrow('planDayUseCase is required')
  })

  test('active session: surfaces session, focus/next from .STATUS, inbox, streak, top-3 suggestions', async () => {
    const digestUseCase = new GetDigestUseCase({
      getContextUseCase: new FakeGetContextUseCase({
        project: 'atlas',
        focus: 'context-level focus',
        session: { project: 'atlas', startTime: new Date(), duration: '5m' },
        inboxCount: 3
      }),
      planDayUseCase: new FakePlanDayUseCase({
        streak: { current: 4, display: '🔥🔥🔥🔥' },
        suggestions: [
          { type: 'focus', message: 'P1 focus: atlas', action: 'atlas session start atlas' },
          { type: 'triage', message: 'triage inbox', action: 'atlas triage' },
          { type: 'continue', message: 'continue yesterday', action: 'atlas session start atlas' },
          { type: 'streak', message: 'streak!', action: null }
        ]
      }),
      statusFileGateway: new FakeStatusFileGateway({
        checkpoint: 'status-file focus',
        next: [{ action: 'ship digest' }, 'write docs', { action: 'third' }, { action: 'fourth' }]
      }),
      projectRepository: new FakeProjectRepository({ path: '/tmp/atlas' })
    })

    const digest = await digestUseCase.execute({ project: 'atlas' })

    expect(digest.activeSession).toEqual({ project: 'atlas', startTime: expect.any(Date), duration: '5m' })
    expect(digest.project).toBe('atlas')
    // .STATUS checkpoint wins over the context-level focus when present
    expect(digest.focus).toBe('status-file focus')
    expect(digest.next).toEqual(['ship digest', 'write docs', 'third'])
    expect(digest.inboxCount).toBe(3)
    expect(digest.streak).toEqual({ current: 4, display: '🔥🔥🔥🔥' })
    expect(digest.suggestions).toHaveLength(3)
  })

  test('no active session: activeSession is null, falls back to context.focus when no .STATUS', async () => {
    const digestUseCase = new GetDigestUseCase({
      getContextUseCase: new FakeGetContextUseCase({
        project: null,
        focus: null,
        session: null,
        inboxCount: 0
      }),
      planDayUseCase: new FakePlanDayUseCase({ streak: null, suggestions: [] })
    })

    const digest = await digestUseCase.execute({})

    expect(digest.activeSession).toBeNull()
    expect(digest.project).toBeNull()
    expect(digest.focus).toBeNull()
    expect(digest.next).toEqual([])
    expect(digest.suggestions).toEqual([])
  })

  test('empty inbox: inboxCount is 0, not omitted', async () => {
    const digestUseCase = new GetDigestUseCase({
      getContextUseCase: new FakeGetContextUseCase({
        project: 'atlas',
        focus: 'f',
        session: null,
        inboxCount: 0
      }),
      planDayUseCase: new FakePlanDayUseCase({ streak: { current: 0 }, suggestions: [] })
    })

    const digest = await digestUseCase.execute({ project: 'atlas' })

    expect(digest.inboxCount).toBe(0)
  })

  test('missing .STATUS: degrades gracefully, keeps context-level focus, empty next', async () => {
    const digestUseCase = new GetDigestUseCase({
      getContextUseCase: new FakeGetContextUseCase({
        project: 'atlas',
        focus: 'context focus',
        session: null,
        inboxCount: 1
      }),
      planDayUseCase: new FakePlanDayUseCase({ streak: null, suggestions: [] }),
      statusFileGateway: { read: async () => { throw new Error('ENOENT: no .STATUS file') } },
      projectRepository: new FakeProjectRepository({ path: '/tmp/atlas' })
    })

    const digest = await digestUseCase.execute({ project: 'atlas' })

    expect(digest.focus).toBe('context focus')
    expect(digest.next).toEqual([])
  })

  test('statusFileGateway present but project has no registered path: falls back to context.focus', async () => {
    const digestUseCase = new GetDigestUseCase({
      getContextUseCase: new FakeGetContextUseCase({
        project: 'unregistered',
        focus: 'context focus only',
        session: null,
        inboxCount: 0
      }),
      planDayUseCase: new FakePlanDayUseCase({ streak: null, suggestions: [] }),
      statusFileGateway: new FakeStatusFileGateway({ checkpoint: 'should not be used' }),
      projectRepository: new FakeProjectRepository(null)
    })

    const digest = await digestUseCase.execute({ project: 'unregistered' })

    expect(digest.focus).toBe('context focus only')
    expect(digest.next).toEqual([])
  })
})
