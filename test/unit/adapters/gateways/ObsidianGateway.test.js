import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { ObsidianGateway } from '../../../../src/adapters/gateways/ObsidianGateway.js'

describe('ObsidianGateway', () => {
  let mockExec

  beforeEach(() => {
    mockExec = jest.fn()
  })

  describe('isAvailable', () => {
    it('returns true when `obs` is on PATH', async () => {
      mockExec.mockResolvedValueOnce({ stdout: '/opt/homebrew/bin/obs\n' })
      const gateway = new ObsidianGateway({ execFn: mockExec })

      await expect(gateway.isAvailable()).resolves.toBe(true)
      expect(mockExec).toHaveBeenCalledWith('which', ['obs'])
    })

    it('returns false when `obs` is not installed', async () => {
      mockExec.mockRejectedValueOnce(new Error('not found'))
      const gateway = new ObsidianGateway({ execFn: mockExec })

      await expect(gateway.isAvailable()).resolves.toBe(false)
    })

    it('caches the probe result across calls', async () => {
      mockExec.mockResolvedValueOnce({ stdout: '/opt/homebrew/bin/obs\n' })
      const gateway = new ObsidianGateway({ execFn: mockExec })

      await gateway.isAvailable()
      await gateway.isAvailable()

      expect(mockExec).toHaveBeenCalledTimes(1)
    })
  })

  describe('write', () => {
    it('fails closed when obs is not installed', async () => {
      mockExec.mockRejectedValueOnce(new Error('not found'))
      const gateway = new ObsidianGateway({ execFn: mockExec })

      const result = await gateway.write({ text: 'a captured idea' })

      expect(result).toEqual({ ok: false, error: 'obs not installed' })
      expect(mockExec).toHaveBeenCalledTimes(1)
    })

    it('writes via `obs write` and returns the note path', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: '/opt/homebrew/bin/obs\n' })
        .mockResolvedValueOnce({ stdout: 'Research/inbox/note.md\n' })
      const gateway = new ObsidianGateway({ execFn: mockExec })

      const result = await gateway.write({ text: 'a captured idea' })

      expect(result).toEqual({ ok: true, path: 'Research/inbox/note.md' })
      expect(mockExec).toHaveBeenLastCalledWith('obs', [
        'write',
        '--title',
        'a captured idea',
        '--content',
        'a captured idea'
      ])
    })

    it('passes the vault flag when provided', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: '/opt/homebrew/bin/obs\n' })
        .mockResolvedValueOnce({ stdout: 'note.md\n' })
      const gateway = new ObsidianGateway({ execFn: mockExec })

      await gateway.write({ text: 'idea' }, { vault: 'a812d844' })

      expect(mockExec).toHaveBeenLastCalledWith('obs', [
        '--vault',
        'a812d844',
        'write',
        '--title',
        'idea',
        '--content',
        'idea'
      ])
    })

    it('returns a failure result instead of throwing when obs write errors', async () => {
      mockExec
        .mockResolvedValueOnce({ stdout: '/opt/homebrew/bin/obs\n' })
        .mockRejectedValueOnce(new Error('Unknown command: write'))
      const gateway = new ObsidianGateway({ execFn: mockExec })

      const result = await gateway.write({ text: 'idea' })

      expect(result).toEqual({ ok: false, error: 'Unknown command: write' })
    })
  })
})
