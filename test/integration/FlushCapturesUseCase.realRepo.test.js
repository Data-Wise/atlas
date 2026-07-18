/**
 * FlushCapturesUseCase against a real FileSystemCaptureRepository.
 *
 * The unit test suite mocks captureRepository entirely, which hid a real
 * bug: FlushCapturesUseCase calls `captureRepository.updateStatus()`, a
 * method that didn't exist on FileSystemCaptureRepository/
 * SQLiteCaptureRepository until this repository gained it. Only the
 * gateway-failure branch was ever exercised against real storage (the
 * success branch calls updateStatus and would have thrown). This test
 * exercises the success path against a real repository so that gap can't
 * silently reopen.
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { FlushCapturesUseCase } from '../../src/use-cases/capture/FlushCapturesUseCase.js'
import { FileSystemCaptureRepository } from '../../src/adapters/repositories/FileSystemCaptureRepository.js'
import { Capture } from '../../src/domain/entities/Capture.js'

describe('FlushCapturesUseCase Integration (real FileSystemCaptureRepository)', () => {
  let repo
  let testDir

  beforeEach(async () => {
    const uniqueId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    testDir = join(tmpdir(), `atlas-flush-test-${uniqueId}`)
    await fs.mkdir(testDir, { recursive: true })
    repo = new FileSystemCaptureRepository(testDir)
  })

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  })

  test('marks a successfully-written capture flushed and persists it', async () => {
    const capture = new Capture({ text: 'real repo flush', status: 'pending-flush' })
    await repo.save(capture)

    const obsidianGateway = { write: async () => ({ ok: true, path: 'note.md' }) }
    const useCase = new FlushCapturesUseCase({ captureRepository: repo, obsidianGateway })

    const result = await useCase.execute()

    expect(result).toEqual({ flushed: 1, remaining: 0, errors: [] })

    const reread = await repo.findById(capture.id)
    expect(reread.status).toBe('flushed')
  })

  test('leaves a failed capture pending-flush in real storage', async () => {
    const capture = new Capture({ text: 'still queued', status: 'pending-flush' })
    await repo.save(capture)

    const obsidianGateway = { write: async () => ({ ok: false, error: 'obs not installed' }) }
    const useCase = new FlushCapturesUseCase({ captureRepository: repo, obsidianGateway })

    const result = await useCase.execute()

    expect(result.remaining).toBe(1)

    const reread = await repo.findById(capture.id)
    expect(reread.status).toBe('pending-flush')
  })
})
