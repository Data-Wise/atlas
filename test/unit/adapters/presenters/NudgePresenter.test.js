import { describe, it, expect } from '@jest/globals'
import { formatNudgesTable, formatNudgesJson } from '../../../../src/adapters/presenters/NudgePresenter.js'
import { Nudge } from '../../../../src/domain/entities/Nudge.js'

describe('NudgePresenter', () => {
  describe('formatNudgesTable', () => {
    it('shows a friendly empty state for zero nudges', () => {
      expect(formatNudgesTable([])).toMatch(/no nudges/i)
    })

    it('lists id, time, message, and state for each nudge', () => {
      const nudges = [
        new Nudge({ id: 'ndg_1', time: '23:00', message: 'wrap up', state: 'fired' })
      ]
      const output = formatNudgesTable(nudges)
      expect(output).toContain('ndg_1')
      expect(output).toContain('23:00')
      expect(output).toContain('wrap up')
      expect(output).toContain('fired')
    })

    it('marks a --daily nudge distinctly from a one-shot', () => {
      const daily = new Nudge({ id: 'ndg_d', time: '09:00', message: 'standup', recurring: true })
      const oneshot = new Nudge({ id: 'ndg_o', time: '09:00', message: 'standup', recurring: false })
      expect(formatNudgesTable([daily])).toMatch(/daily/i)
      expect(formatNudgesTable([oneshot])).not.toMatch(/daily/i)
    })
  })

  describe('formatNudgesJson', () => {
    it('returns valid JSON serializing each nudge', () => {
      const nudges = [new Nudge({ id: 'ndg_1', time: '23:00', message: 'wrap up' })]
      const parsed = JSON.parse(formatNudgesJson(nudges))
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toMatchObject({ id: 'ndg_1', time: '23:00', message: 'wrap up' })
    })

    it('returns an empty array, not an error, for zero nudges', () => {
      expect(JSON.parse(formatNudgesJson([]))).toEqual([])
    })
  })
})
