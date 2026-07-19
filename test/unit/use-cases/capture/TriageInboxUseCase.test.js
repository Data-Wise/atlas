import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { TriageInboxUseCase } from '../../../../src/use-cases/capture/TriageInboxUseCase.js'
import { Capture } from '../../../../src/domain/entities/Capture.js'

describe('TriageInboxUseCase.getStats() — flow-cli `inbox --count` semantics', () => {
  let mockCaptureRepository

  beforeEach(() => {
    mockCaptureRepository = {
      findByStatus: jest.fn()
    }
  })

  it('counts pending-flush captures as inbox for the badge/count surface', async () => {
    const inboxItem = new Capture({ text: 'plain inbox idea', status: 'inbox' })
    const pendingItem = new Capture({ text: 'queued for vault', status: 'pending-flush' })

    mockCaptureRepository.findByStatus.mockImplementation(async (status) => {
      if (status === 'inbox') return [inboxItem]
      if (status === 'pending-flush') return [pendingItem]
      return []
    })

    const useCase = new TriageInboxUseCase({ captureRepository: mockCaptureRepository })
    const stats = await useCase.getStats()

    expect(stats.inbox).toBe(2)
  })

  it('does not count flushed captures', async () => {
    const inboxItem = new Capture({ text: 'plain inbox idea', status: 'inbox' })

    mockCaptureRepository.findByStatus.mockImplementation(async (status) => {
      if (status === 'inbox') return [inboxItem]
      return []
    })

    const useCase = new TriageInboxUseCase({ captureRepository: mockCaptureRepository })
    const stats = await useCase.getStats()

    expect(stats.inbox).toBe(1)
    expect(mockCaptureRepository.findByStatus).not.toHaveBeenCalledWith('flushed')
  })

  it('reflects pending-flush items in the byType breakdown', async () => {
    const inboxItem = new Capture({ text: 'plain inbox idea', status: 'inbox', type: 'idea' })
    const pendingItem = new Capture({ text: 'queued bug', status: 'pending-flush', type: 'bug' })

    mockCaptureRepository.findByStatus.mockImplementation(async (status) => {
      if (status === 'inbox') return [inboxItem]
      if (status === 'pending-flush') return [pendingItem]
      return []
    })

    const useCase = new TriageInboxUseCase({ captureRepository: mockCaptureRepository })
    const stats = await useCase.getStats()

    expect(stats.byType).toEqual({ idea: 1, bug: 1 })
  })
})
