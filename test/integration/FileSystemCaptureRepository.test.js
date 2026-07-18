/**
 * Integration tests for FileSystemCaptureRepository
 *
 * These tests use actual file system I/O (in a temp directory)
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { FileSystemCaptureRepository } from '../../src/adapters/repositories/FileSystemCaptureRepository.js'
import { Capture } from '../../src/domain/entities/Capture.js'

describe('FileSystemCaptureRepository Integration', () => {
  let repo
  let testDir

  beforeEach(async () => {
    const uniqueId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    testDir = join(tmpdir(), `atlas-capture-test-${uniqueId}`)
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

  describe('updateStatus', () => {
    test('persists the new status and survives a re-read', async () => {
      const capture = new Capture({ text: 'plant a flag', status: 'pending-flush' })
      await repo.save(capture)

      const updated = await repo.updateStatus(capture.id, 'flushed')
      expect(updated.status).toBe('flushed')

      const reread = await repo.findById(capture.id)
      expect(reread.status).toBe('flushed')
    })

    test('leaves other fields untouched', async () => {
      const capture = new Capture({ text: 'keep my text', type: 'bug', status: 'pending-flush' })
      await repo.save(capture)

      await repo.updateStatus(capture.id, 'flushed')

      const reread = await repo.findById(capture.id)
      expect(reread.text).toBe('keep my text')
      expect(reread.type).toBe('bug')
    })

    test('throws when the capture does not exist', async () => {
      await expect(repo.updateStatus('cap_does_not_exist', 'flushed')).rejects.toThrow(
        'Capture not found'
      )
    })
  })
})
