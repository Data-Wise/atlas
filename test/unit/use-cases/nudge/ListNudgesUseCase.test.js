import { jest, describe, it, expect } from '@jest/globals'
import { ListNudgesUseCase } from '../../../../src/use-cases/nudge/ListNudgesUseCase.js'

describe('ListNudgesUseCase', () => {
  it('delegates to the store, reading live (no cache) for cross-surface accuracy', async () => {
    const nudges = [{ id: 'ndg_1' }, { id: 'ndg_2' }]
    const nudgeStore = { list: jest.fn(async () => nudges) }
    const useCase = new ListNudgesUseCase({ nudgeStore })

    const result = await useCase.execute()

    expect(result).toBe(nudges)
    expect(nudgeStore.list).toHaveBeenCalledWith({})
  })

  it('passes outstandingOnly through when requested', async () => {
    const nudgeStore = { list: jest.fn(async () => []) }
    const useCase = new ListNudgesUseCase({ nudgeStore })

    await useCase.execute({ outstandingOnly: true })

    expect(nudgeStore.list).toHaveBeenCalledWith({ outstandingOnly: true })
  })
})
