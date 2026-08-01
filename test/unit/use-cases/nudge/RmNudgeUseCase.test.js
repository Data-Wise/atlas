import { jest, describe, it, expect } from '@jest/globals'
import { RmNudgeUseCase } from '../../../../src/use-cases/nudge/RmNudgeUseCase.js'
import { Nudge } from '../../../../src/domain/entities/Nudge.js'

function makeStore(nudge) {
  return {
    get: jest.fn(async (id) => (nudge && nudge.id === id ? nudge : null)),
    remove: jest.fn(async () => true)
  }
}

function makeScheduler() {
  return { unschedule: jest.fn(async () => {}) }
}

describe('RmNudgeUseCase', () => {
  it('unschedules and removes the record, unconditionally', async () => {
    const nudge = new Nudge({ id: 'ndg_1', time: '23:00', message: 'm' })
    const nudgeStore = makeStore(nudge)
    const scheduler = makeScheduler()
    const useCase = new RmNudgeUseCase({ nudgeStore, scheduler })

    await useCase.execute({ id: 'ndg_1' })

    expect(scheduler.unschedule).toHaveBeenCalledWith(expect.objectContaining({ id: 'ndg_1' }))
    expect(nudgeStore.remove).toHaveBeenCalledWith('ndg_1')
  })

  it.each([
    ['pending', false],
    ['fired', false],
    ['acked', false],
    ['pending', true],
    ['fired', true],
    ['acked', true]
  ])('removes regardless of state=%s / recurring=%s — the only real cleanup path for --daily', async (state, recurring) => {
    const nudge = new Nudge({ id: 'ndg_x', time: '23:00', message: 'm', state, recurring })
    const scheduler = makeScheduler()
    const useCase = new RmNudgeUseCase({ nudgeStore: makeStore(nudge), scheduler })

    await useCase.execute({ id: 'ndg_x' })

    expect(scheduler.unschedule).toHaveBeenCalled()
  })

  it('throws for an unknown id without calling the scheduler', async () => {
    const scheduler = makeScheduler()
    const useCase = new RmNudgeUseCase({ nudgeStore: makeStore(null), scheduler })

    await expect(useCase.execute({ id: 'ndg_ghost' })).rejects.toThrow(/not found/)
    expect(scheduler.unschedule).not.toHaveBeenCalled()
  })

  it('returns true when a record was actually removed', async () => {
    const nudge = new Nudge({ id: 'ndg_2', time: '23:00', message: 'm' })
    const useCase = new RmNudgeUseCase({ nudgeStore: makeStore(nudge), scheduler: makeScheduler() })

    expect(await useCase.execute({ id: 'ndg_2' })).toBe(true)
  })
})
