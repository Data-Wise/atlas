import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { FlushCapturesUseCase } from '../../../../src/use-cases/capture/FlushCapturesUseCase.js'
import { Capture } from '../../../../src/domain/entities/Capture.js'

describe('FlushCapturesUseCase', () => {
  let mockCaptureRepository
  let mockObsidianGateway
  let mockEventPublisher

  const pendingCapture = (text) => new Capture({ text, status: 'pending-flush' })

  beforeEach(() => {
    mockCaptureRepository = {
      findByStatus: jest.fn(),
      updateStatus: jest.fn()
    }
    mockObsidianGateway = {
      write: jest.fn()
    }
    mockEventPublisher = {
      publish: jest.fn()
    }
  })

  it('flushes all pending captures and marks them flushed', async () => {
    const a = pendingCapture('idea one')
    const b = pendingCapture('idea two')
    mockCaptureRepository.findByStatus.mockResolvedValue([a, b])
    mockObsidianGateway.write.mockResolvedValue({ ok: true, path: 'note.md' })

    const useCase = new FlushCapturesUseCase({
      captureRepository: mockCaptureRepository,
      obsidianGateway: mockObsidianGateway,
      eventPublisher: mockEventPublisher
    })

    const result = await useCase.execute()

    expect(result).toEqual({ flushed: 2, remaining: 0, errors: [] })
    expect(mockCaptureRepository.updateStatus).toHaveBeenCalledWith(a.id, 'flushed')
    expect(mockCaptureRepository.updateStatus).toHaveBeenCalledWith(b.id, 'flushed')
    expect(mockEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CapturesFlushed', payload: { flushed: 2, remaining: 0 } })
    )
  })

  it('leaves captures pending when the gateway fails, and reports the error', async () => {
    const a = pendingCapture('idea one')
    mockCaptureRepository.findByStatus.mockResolvedValue([a])
    mockObsidianGateway.write.mockResolvedValue({ ok: false, error: 'obs not installed' })

    const useCase = new FlushCapturesUseCase({
      captureRepository: mockCaptureRepository,
      obsidianGateway: mockObsidianGateway,
      eventPublisher: mockEventPublisher
    })

    const result = await useCase.execute()

    expect(result).toEqual({
      flushed: 0,
      remaining: 1,
      errors: [{ id: a.id, error: 'obs not installed' }]
    })
    expect(mockCaptureRepository.updateStatus).not.toHaveBeenCalled()
    expect(mockEventPublisher.publish).not.toHaveBeenCalled()
  })

  it('is a no-op when there is nothing pending', async () => {
    mockCaptureRepository.findByStatus.mockResolvedValue([])

    const useCase = new FlushCapturesUseCase({
      captureRepository: mockCaptureRepository,
      obsidianGateway: mockObsidianGateway,
      eventPublisher: mockEventPublisher
    })

    const result = await useCase.execute()

    expect(result).toEqual({ flushed: 0, remaining: 0, errors: [] })
    expect(mockObsidianGateway.write).not.toHaveBeenCalled()
  })

  it('passes the vault option through to the gateway', async () => {
    const a = pendingCapture('idea')
    mockCaptureRepository.findByStatus.mockResolvedValue([a])
    mockObsidianGateway.write.mockResolvedValue({ ok: true, path: 'note.md' })

    const useCase = new FlushCapturesUseCase({
      captureRepository: mockCaptureRepository,
      obsidianGateway: mockObsidianGateway,
      eventPublisher: mockEventPublisher
    })

    await useCase.execute({ vault: 'a812d844' })

    expect(mockObsidianGateway.write).toHaveBeenCalledWith(a, { vault: 'a812d844' })
  })
})
