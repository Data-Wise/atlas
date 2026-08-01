import { jest, describe, it, expect } from '@jest/globals'
import { AckNudgeUseCase } from '../../../../src/use-cases/nudge/AckNudgeUseCase.js'
import { Nudge } from '../../../../src/domain/entities/Nudge.js'

function makeStore(nudge) {
  let current = nudge
  return {
    get: jest.fn(async (id) => (current && current.id === id ? current : null)),
    update: jest.fn(async (n) => {
      current = n
      return n
    })
  }
}

function makeScheduler() {
  return { unschedule: jest.fn(async () => {}) }
}

describe('AckNudgeUseCase', () => {
  it('sets state to acked', async () => {
    const nudge = new Nudge({ id: 'ndg_1', time: '23:00', message: 'm', state: 'fired' })
    const nudgeStore = makeStore(nudge)
    const scheduler = makeScheduler()
    const useCase = new AckNudgeUseCase({ nudgeStore, scheduler })

    const result = await useCase.execute({ id: 'ndg_1' })

    expect(result.state).toBe('acked')
    expect(nudgeStore.update).toHaveBeenCalledWith(expect.objectContaining({ state: 'acked' }))
  })

  it('unschedules (unloads + deletes plist) a one-shot nudge on ack', async () => {
    const nudge = new Nudge({ id: 'ndg_2', time: '23:00', message: 'm', state: 'fired', recurring: false })
    const scheduler = makeScheduler()
    const useCase = new AckNudgeUseCase({ nudgeStore: makeStore(nudge), scheduler })

    await useCase.execute({ id: 'ndg_2' })

    expect(scheduler.unschedule).toHaveBeenCalledWith(expect.objectContaining({ id: 'ndg_2' }))
  })

  it('does NOT unschedule a --daily nudge on ack — tomorrow must still fire', async () => {
    const nudge = new Nudge({ id: 'ndg_3', time: '23:00', message: 'm', state: 'fired', recurring: true })
    const scheduler = makeScheduler()
    const useCase = new AckNudgeUseCase({ nudgeStore: makeStore(nudge), scheduler })

    await useCase.execute({ id: 'ndg_3' })

    expect(scheduler.unschedule).not.toHaveBeenCalled()
  })

  it('throws for an unknown id', async () => {
    const useCase = new AckNudgeUseCase({ nudgeStore: makeStore(null), scheduler: makeScheduler() })
    await expect(useCase.execute({ id: 'ndg_missing' })).rejects.toThrow(/not found/)
  })

  it('is idempotent — acking an already-acked one-shot nudge does not throw', async () => {
    const nudge = new Nudge({ id: 'ndg_4', time: '23:00', message: 'm', state: 'acked', recurring: false })
    const scheduler = makeScheduler()
    const useCase = new AckNudgeUseCase({ nudgeStore: makeStore(nudge), scheduler })

    await expect(useCase.execute({ id: 'ndg_4' })).resolves.toBeDefined()
    expect(scheduler.unschedule).toHaveBeenCalled()
  })
})
