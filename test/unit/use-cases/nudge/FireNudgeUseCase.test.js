import { jest, describe, it, expect } from '@jest/globals'
import { FireNudgeUseCase } from '../../../../src/use-cases/nudge/FireNudgeUseCase.js'
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

describe('FireNudgeUseCase', () => {
  it('looks the message up from the store by id, never from the execute() params', async () => {
    const nudge = new Nudge({ id: 'ndg_1', time: '23:00', message: 'stored message' })
    const nudgeStore = makeStore(nudge)
    const execFileFn = jest.fn(async () => ({ stdout: '', stderr: '' }))
    const useCase = new FireNudgeUseCase({ nudgeStore, execFileFn })

    await useCase.execute({ id: 'ndg_1' })

    const [, args] = execFileFn.mock.calls[0]
    expect(args[args.length - 1]).toBe('stored message')
  })

  it('sets state to fired and persists via update', async () => {
    const nudge = new Nudge({ id: 'ndg_2', time: '23:00', message: 'msg' })
    const nudgeStore = makeStore(nudge)
    const useCase = new FireNudgeUseCase({
      nudgeStore,
      execFileFn: jest.fn(async () => ({ stdout: '', stderr: '' }))
    })

    const result = await useCase.execute({ id: 'ndg_2' })

    expect(result.state).toBe('fired')
    expect(nudgeStore.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'ndg_2', state: 'fired' }))
  })

  it('throws for an unknown id without calling osascript', async () => {
    const nudgeStore = makeStore(null)
    const execFileFn = jest.fn()
    const useCase = new FireNudgeUseCase({ nudgeStore, execFileFn })

    await expect(useCase.execute({ id: 'ndg_missing' })).rejects.toThrow(/not found/)
    expect(execFileFn).not.toHaveBeenCalled()
  })

  describe('injection safety (adversarial-review fix)', () => {
    // The message must reach osascript as a distinct argv item, not woven
    // into the -e script text. These fixtures are exactly the kind of
    // content that would break out of a naive
    // `-e 'display notification "<message>"...'` string build.
    const dangerousMessages = [
      'wrap up" & do shell script "echo pwned',
      'contains a backtick ` and a backslash \\',
      "single 'quotes' too",
      'newline\nin the middle'
    ]

    it.each(dangerousMessages)('passes %j through as a single argv entry, never concatenated into the script', async (message) => {
      const nudge = new Nudge({ id: 'ndg_danger', time: '23:00', message })
      const nudgeStore = makeStore(nudge)
      const execFileFn = jest.fn(async () => ({ stdout: '', stderr: '' }))
      const useCase = new FireNudgeUseCase({ nudgeStore, execFileFn })

      await useCase.execute({ id: 'ndg_danger' })

      const [command, args] = execFileFn.mock.calls[0]
      expect(command).toBe('osascript')
      // The message is the LAST array element — a distinct argv item — and
      // no -e script fragment contains the raw message text anywhere.
      expect(args[args.length - 1]).toBe(message)
      const scriptFragments = args.slice(0, -1)
      for (const fragment of scriptFragments) {
        expect(fragment).not.toContain(message)
      }
      // The script uses `on run argv` / `item 1 of argv`, confirming argv
      // passing is actually wired up, not just coincidentally absent.
      expect(args.join(' ')).toMatch(/on run argv/)
      expect(args.join(' ')).toMatch(/item 1 of argv/)
    })
  })
})
