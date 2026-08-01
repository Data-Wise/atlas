import { describe, test, expect } from '@jest/globals'
import { formatDayActivityTable, formatDayActivityJson } from '../../../../src/adapters/presenters/DayActivityPresenter.js'

const sampleActivity = {
  'dev-tools': {
    commits: [{ repo: 'atlas', commits: [{ sha: 'abc123', subject: 'fix: thing' }] }],
    statusDiffs: [{ repo: 'atlas', diff: '+progress: 80' }],
    sessionMinutes: 90
  },
  research: { commits: [], statusDiffs: [], sessionMinutes: 0 },
  teaching: { commits: [], statusDiffs: [], sessionMinutes: 0 },
  'r-packages': { commits: [], statusDiffs: [], sessionMinutes: 0 }
}

describe('DayActivityPresenter', () => {
  describe('formatDayActivityTable', () => {
    test('shows each tree, with activity trees expanded and quiet trees compact', () => {
      const output = formatDayActivityTable(sampleActivity)
      expect(output).toContain('dev-tools')
      expect(output).toContain('atlas')
      expect(output).toContain('fix: thing');
      expect(output).toContain('90');
      // Purely-quiet trees shouldn't dump empty commit/diff sections.
      expect(output).toMatch(/research.*no activity/is);
    })

    test('handles an all-quiet day without error', () => {
      const allQuiet = {
        'dev-tools': { commits: [], statusDiffs: [], sessionMinutes: 0 },
        research: { commits: [], statusDiffs: [], sessionMinutes: 0 },
        teaching: { commits: [], statusDiffs: [], sessionMinutes: 0 },
        'r-packages': { commits: [], statusDiffs: [], sessionMinutes: 0 }
      }
      expect(() => formatDayActivityTable(allQuiet)).not.toThrow()
      expect(formatDayActivityTable(allQuiet)).toMatch(/no activity/i)
    })
  })

  describe('formatDayActivityJson', () => {
    test('round-trips the raw activity object as JSON', () => {
      const parsed = JSON.parse(formatDayActivityJson(sampleActivity))
      expect(parsed).toEqual(sampleActivity)
    })
  })
})
