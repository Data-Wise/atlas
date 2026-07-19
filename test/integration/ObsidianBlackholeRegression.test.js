/**
 * Regression coverage for the 2026-07-19 near-miss: wiring ObsidianGateway
 * into CaptureIdeaUseCase before `obs write` ships would "blackhole" every
 * capture the moment the gateway fails (obs not installed/running) unless
 * pending-flush captures stay inbox-visible everywhere a user looks for
 * them (GetInbox, PlanDay).
 *
 * SPEC-obsidian-captures-scope-2026-07-19.md — Execution, pre-P0 slice,
 * task 3. Runs against real FileSystemCaptureRepository in an isolated
 * temp dir — never touches ~/.atlas.
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { CaptureIdeaUseCase } from '../../src/use-cases/capture/CaptureIdeaUseCase.js'
import { FlushCapturesUseCase } from '../../src/use-cases/capture/FlushCapturesUseCase.js'
import { GetInboxUseCase } from '../../src/use-cases/capture/GetInboxUseCase.js'
import { PlanDayUseCase } from '../../src/use-cases/session/PlanDayUseCase.js'
import { FileSystemCaptureRepository } from '../../src/adapters/repositories/FileSystemCaptureRepository.js'

// Minimal stand-ins for PlanDayUseCase's other collaborators — not under
// test here, just need to satisfy the constructor + return empty results.
class StubSessionRepository {
  async list() { return [] }
}
class StubProjectRepository {
  async list() { return [] }
}

async function makeTempRepo(prefix) {
  const uniqueId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const dir = join(tmpdir(), `atlas-${prefix}-${uniqueId}`)
  await fs.mkdir(dir, { recursive: true })
  return { dir, repo: new FileSystemCaptureRepository(dir) }
}

describe('Obsidian blackhole regression (real FileSystemCaptureRepository)', () => {
  let dir
  let captureRepository

  afterEach(async () => {
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  })

  test('a capture stays visible in the inbox even when the obsidian gateway fails at capture time', async () => {
    ;({ dir, repo: captureRepository } = await makeTempRepo('blackhole-inbox'))

    const failingGateway = { write: async () => ({ ok: false, error: 'obs not installed' }) }
    const captureIdea = new CaptureIdeaUseCase({
      captureRepository,
      obsidianGateway: failingGateway
    })

    const capture = await captureIdea.execute({ text: 'do not get lost' })
    expect(capture.status).toBe('pending-flush')

    const getInbox = new GetInboxUseCase({ captureRepository })
    const inbox = await getInbox.execute()

    expect(inbox.map(i => i.id)).toContain(capture.id)
  })

  test('a capture stays visible in the morning plan even when the obsidian gateway fails at capture time', async () => {
    ;({ dir, repo: captureRepository } = await makeTempRepo('blackhole-plan'))

    const failingGateway = { write: async () => ({ ok: false, error: 'obs not installed' }) }
    const captureIdea = new CaptureIdeaUseCase({
      captureRepository,
      obsidianGateway: failingGateway
    })

    const capture = await captureIdea.execute({ text: 'still on the radar' })
    expect(capture.status).toBe('pending-flush')

    const planDay = new PlanDayUseCase({
      sessionRepository: new StubSessionRepository(),
      captureRepository,
      projectRepository: new StubProjectRepository()
    })
    const plan = await planDay.execute({})

    expect(plan.inbox.map(i => i.id)).toContain(capture.id)
  })

  test('a capture with no gateway configured (D5: inert) still lands and stays inbox-visible', async () => {
    ;({ dir, repo: captureRepository } = await makeTempRepo('blackhole-inert'))

    const captureIdea = new CaptureIdeaUseCase({ captureRepository })
    const capture = await captureIdea.execute({ text: 'gateway not wired yet' })

    expect(capture.status).toBe('inbox')

    const getInbox = new GetInboxUseCase({ captureRepository })
    const inbox = await getInbox.execute()
    expect(inbox.map(i => i.id)).toContain(capture.id)
  })
})

describe('Idempotent flush loop (100 captures, real FileSystemCaptureRepository)', () => {
  let dir
  let captureRepository

  afterEach(async () => {
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  })

  test('captures survive a down obs, drain on a working flush, and a second flush is a no-op', async () => {
    ;({ dir, repo: captureRepository } = await makeTempRepo('flush-loop'))

    const failingGateway = { write: async () => ({ ok: false, error: 'obs not installed' }) }
    const captureIdea = new CaptureIdeaUseCase({
      captureRepository,
      obsidianGateway: failingGateway
    })

    // 100 catches while obs is down.
    const captures = []
    for (let i = 0; i < 100; i++) {
      captures.push(await captureIdea.execute({ text: `crash-consistency idea ${i}` }))
    }
    expect(captures).toHaveLength(100)
    expect(captures.every(c => c.status === 'pending-flush')).toBe(true)

    // All 100 stay inbox-visible while stuck pending-flush.
    const getInbox = new GetInboxUseCase({ captureRepository })
    const inboxWhileDown = await getInbox.execute({ limit: 200 })
    const capturedIds = new Set(captures.map(c => c.id))
    const visibleIds = new Set(inboxWhileDown.map(i => i.id))
    for (const id of capturedIds) {
      expect(visibleIds.has(id)).toBe(true)
    }

    // obs comes back up — flush drains everything in one pass.
    const workingGateway = { write: async () => ({ ok: true, path: 'note.md' }) }
    const flush = new FlushCapturesUseCase({ captureRepository, obsidianGateway: workingGateway })

    const firstFlush = await flush.execute()
    expect(firstFlush.flushed).toBe(100)
    expect(firstFlush.remaining).toBe(0)
    expect(firstFlush.errors).toEqual([])

    // Idempotent: nothing left pending, second flush is a no-op.
    const secondFlush = await flush.execute()
    expect(secondFlush.flushed).toBe(0)
    expect(secondFlush.remaining).toBe(0)

    // Flushed captures drop out of the (now-default) inbox view.
    const inboxAfterFlush = await getInbox.execute({ limit: 200 })
    const stillVisible = inboxAfterFlush.filter(i => capturedIds.has(i.id))
    expect(stillVisible).toHaveLength(0)
  }, 30000)
})
