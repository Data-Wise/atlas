import { Nudge } from '../../../../src/domain/entities/Nudge.js'

describe('Nudge', () => {
  const valid = { time: '23:00', message: 'wrap up and close the worktree' }

  describe('validation', () => {
    it('accepts a valid HH:MM time and message', () => {
      const nudge = new Nudge(valid)
      expect(nudge.time).toBe('23:00')
      expect(nudge.message).toBe('wrap up and close the worktree')
    })

    it.each([
      ['5:00', 'single-digit hour'],
      ['25:00', 'hour out of range'],
      ['23:60', 'minute out of range'],
      ['2300', 'missing separator'],
      ['11:00pm', '12-hour suffix'],
      ['', 'empty string']
    ])('rejects %s (%s)', (time) => {
      expect(() => new Nudge({ ...valid, time })).toThrow(/HH:MM/)
    })

    it('rejects a missing or whitespace-only message', () => {
      expect(() => new Nudge({ ...valid, message: '' })).toThrow(/cannot be empty/)
      expect(() => new Nudge({ ...valid, message: '   ' })).toThrow(/cannot be empty/)
    })

    it('rejects a message over 500 characters', () => {
      expect(() => new Nudge({ ...valid, message: 'x'.repeat(501) })).toThrow(/500/)
    })

    it('rejects an unknown state', () => {
      expect(() => new Nudge({ ...valid, state: 'snoozed' })).toThrow(/Invalid Nudge state/)
    })

    it('trims surrounding whitespace from the message', () => {
      expect(new Nudge({ ...valid, message: '  padded  ' }).message).toBe('padded')
    })
  })

  describe('defaults', () => {
    it('defaults to pending, non-recurring, with a generated id and timestamp', () => {
      const nudge = new Nudge(valid)
      expect(nudge.state).toBe('pending')
      expect(nudge.recurring).toBe(false)
      expect(nudge.id).toMatch(/^ndg_/)
      expect(Date.parse(nudge.createdAt)).not.toBeNaN()
    })

    it('preserves an explicitly supplied id', () => {
      expect(new Nudge({ ...valid, id: 'ndg_fixed' }).id).toBe('ndg_fixed')
    })

    it('coerces recurring to a boolean', () => {
      expect(new Nudge({ ...valid, recurring: 1 }).recurring).toBe(true)
    })
  })

  describe('no schedule duplication', () => {
    it('has no recurrence field — the launchd plist owns the schedule', () => {
      // Guards SPEC Design §1: `recurring` is an ack-branching boolean, not a
      // schedule description. A `recurrence` string would be a second source
      // of scheduling truth that could drift from the actual launchd job.
      const nudge = new Nudge({ ...valid, recurrence: 'daily' })
      expect(nudge.recurrence).toBeUndefined()
      expect(nudge.toJSON()).not.toHaveProperty('recurrence')
    })
  })

  describe('launchdLabel', () => {
    it('derives the job label from the id', () => {
      expect(new Nudge({ ...valid, id: 'ndg_abc' }).launchdLabel)
        .toBe('com.data-wise.atlas-nudge.ndg_abc')
    })
  })

  describe('schedule', () => {
    it('splits HH:MM into integer hour and minute', () => {
      expect(new Nudge({ ...valid, time: '09:05' }).schedule).toEqual({ hour: 9, minute: 5 })
    })

    it('handles midnight without producing NaN', () => {
      expect(new Nudge({ ...valid, time: '00:00' }).schedule).toEqual({ hour: 0, minute: 0 })
    })
  })

  describe('isOutstanding', () => {
    it.each([
      ['pending', true],
      ['fired', true],
      ['acked', false]
    ])('is %s → %s', (state, expected) => {
      expect(new Nudge({ ...valid, state }).isOutstanding()).toBe(expected)
    })
  })

  describe('serialization', () => {
    it('round-trips through toJSON/fromJSON', () => {
      const original = new Nudge({ ...valid, recurring: true, state: 'fired' })
      const restored = Nudge.fromJSON(original.toJSON())
      expect(restored.toJSON()).toEqual(original.toJSON())
    })

    it('returns null for a null input', () => {
      expect(Nudge.fromJSON(null)).toBeNull()
    })
  })
})
