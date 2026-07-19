import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { GetInboxUseCase } from '../../../../src/use-cases/capture/GetInboxUseCase.js'
import { Capture } from '../../../../src/domain/entities/Capture.js'

describe('GetInboxUseCase', () => {
  let mockCaptureRepository

  beforeEach(() => {
    mockCaptureRepository = {
      findByStatus: jest.fn()
    }
  })

  it('includes pending-flush captures alongside inbox captures by default', async () => {
    const inboxItem = new Capture({ text: 'plain inbox idea', status: 'inbox' })
    const pendingItem = new Capture({ text: 'queued for vault', status: 'pending-flush' })

    mockCaptureRepository.findByStatus.mockImplementation(async (status) => {
      if (status === 'inbox') return [inboxItem]
      if (status === 'pending-flush') return [pendingItem]
      return []
    })

    const useCase = new GetInboxUseCase({ captureRepository: mockCaptureRepository })
    const result = await useCase.execute()

    const ids = result.map(i => i.id)
    expect(ids).toContain(inboxItem.id)
    expect(ids).toContain(pendingItem.id)
    expect(result).toHaveLength(2)
  })

  it('excludes flushed captures', async () => {
    const inboxItem = new Capture({ text: 'plain inbox idea', status: 'inbox' })

    mockCaptureRepository.findByStatus.mockImplementation(async (status) => {
      if (status === 'inbox') return [inboxItem]
      return []
    })

    const useCase = new GetInboxUseCase({ captureRepository: mockCaptureRepository })
    const result = await useCase.execute()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(inboxItem.id)
    // flushed items were never returned by findByStatus('pending-flush') or
    // findByStatus('inbox'), so this asserts the merge doesn't invent them
    expect(mockCaptureRepository.findByStatus).not.toHaveBeenCalledWith('flushed')
  })

  it('does not merge pending-flush when an explicit non-inbox status is requested', async () => {
    const triagedItem = new Capture({ text: 'triaged idea', status: 'triaged' })
    triagedItem.status = 'triaged'

    mockCaptureRepository.findByStatus.mockImplementation(async (status) => {
      if (status === 'triaged') return [triagedItem]
      return []
    })

    const useCase = new GetInboxUseCase({ captureRepository: mockCaptureRepository })
    const result = await useCase.execute({ status: 'triaged' })

    expect(result).toEqual([triagedItem])
    expect(mockCaptureRepository.findByStatus).toHaveBeenCalledTimes(1)
    expect(mockCaptureRepository.findByStatus).toHaveBeenCalledWith('triaged')
  })

  it('applies project/type filters and limit across the merged inbox+pending-flush set', async () => {
    const a = new Capture({ text: 'a', status: 'inbox', project: 'atlas', type: 'idea' })
    const b = new Capture({ text: 'b', status: 'pending-flush', project: 'atlas', type: 'bug' })
    const c = new Capture({ text: 'c', status: 'pending-flush', project: 'other', type: 'idea' })

    mockCaptureRepository.findByStatus.mockImplementation(async (status) => {
      if (status === 'inbox') return [a]
      if (status === 'pending-flush') return [b, c]
      return []
    })

    const useCase = new GetInboxUseCase({ captureRepository: mockCaptureRepository })
    const result = await useCase.execute({ project: 'atlas', limit: 10 })

    expect(result.map(i => i.id)).toEqual(expect.arrayContaining([a.id, b.id]))
    expect(result.map(i => i.id)).not.toContain(c.id)
  })
})
