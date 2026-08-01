import { jest, describe, it, expect } from '@jest/globals'
import { AddNudgeUseCase } from '../../../../src/use-cases/nudge/AddNudgeUseCase.js'

function makeStore() {
  const byId = new Map()
  return {
    byId,
    add: jest.fn(async (nudge) => {
      byId.set(nudge.id, nudge)
      return nudge
    }),
    remove: jest.fn(async (id) => byId.delete(id))
  }
}

function makeScheduler({ shouldFail = false } = {}) {
  return {
    schedule: jest.fn(async () => {
      if (shouldFail) throw new Error('launchctl load failed for com.data-wise.atlas-nudge.x: boom')
    })
  }
}

describe('AddNudgeUseCase', () => {
  it('persists the nudge and schedules it, in that order', async () => {
    const nudgeStore = makeStore()
    const scheduler = makeScheduler()
    const useCase = new AddNudgeUseCase({ nudgeStore, scheduler })

    const nudge = await useCase.execute({ time: '23:00', message: 'wrap up' })

    expect(nudgeStore.add).toHaveBeenCalledWith(nudge)
    expect(scheduler.schedule).toHaveBeenCalledWith(nudge)
    expect(nudgeStore.byId.has(nudge.id)).toBe(true)
  })

  it('defaults to one-shot (recurring: false) when --daily is not passed', async () => {
    const useCase = new AddNudgeUseCase({ nudgeStore: makeStore(), scheduler: makeScheduler() })
    const nudge = await useCase.execute({ time: '23:00', message: 'wrap up' })
    expect(nudge.recurring).toBe(false)
  })

  it('sets recurring: true when daily is passed', async () => {
    const useCase = new AddNudgeUseCase({ nudgeStore: makeStore(), scheduler: makeScheduler() })
    const nudge = await useCase.execute({ time: '23:00', message: 'wrap up', daily: true })
    expect(nudge.recurring).toBe(true)
  })

  it('rolls back the store write when scheduling fails — never leaves an orphaned record', async () => {
    const nudgeStore = makeStore()
    const scheduler = makeScheduler({ shouldFail: true })
    const useCase = new AddNudgeUseCase({ nudgeStore, scheduler })

    await expect(useCase.execute({ time: '23:00', message: 'wrap up' })).rejects.toThrow(
      /launchctl load failed/
    )

    expect(nudgeStore.remove).toHaveBeenCalled()
    expect(nudgeStore.byId.size).toBe(0)
  })

  it('propagates entity validation errors before ever touching the store', async () => {
    const nudgeStore = makeStore()
    const useCase = new AddNudgeUseCase({ nudgeStore, scheduler: makeScheduler() })

    await expect(useCase.execute({ time: 'not-a-time', message: 'x' })).rejects.toThrow(/HH:MM/)
    expect(nudgeStore.add).not.toHaveBeenCalled()
  })
})
