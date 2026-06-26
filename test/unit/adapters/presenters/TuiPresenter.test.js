/**
 * TuiPresenter Tests
 *
 * Tests for blessed-specific TUI formatting functions.
 */

import { describe, it, expect } from '@jest/globals'
import {
  sparkline,
  progressBar,
  createMiniProgressBar,
  getStatusIcon,
  formatStatusWithIcon,
  formatProjectName,
  formatNextAction,
  formatSessionIndicator,
  formatStreak,
  themes,
  themeNames
} from '../../../../src/adapters/presenters/TuiPresenter.js'

describe('TuiPresenter', () => {
  describe('sparkline', () => {
    it('creates sparkline from data', () => {
      const data = [1, 2, 3, 4, 5]
      const result = sparkline(data)

      expect(result).toHaveLength(5)
      // Should use block characters
      expect(result).toMatch(/[▁▂▃▄▅▆▇█]+/)
    })

    it('handles single value', () => {
      const result = sparkline([5])
      expect(result).toHaveLength(1)
    })

    it('handles all zeros', () => {
      const result = sparkline([0, 0, 0])
      expect(result).toHaveLength(3)
    })

    it('handles max value correctly', () => {
      const result = sparkline([10, 10, 10])
      // All values at max should be top block
      expect(result).toBe('███')
    })
  })

  describe('progressBar', () => {
    it('creates empty bar for 0%', () => {
      const result = progressBar(0, 10)
      expect(result).toContain('░'.repeat(10))
      expect(result).not.toContain('█')
    })

    it('creates full bar for 100%', () => {
      const result = progressBar(100, 10)
      expect(result).toContain('█'.repeat(10))
    })

    it('creates partial bar for 50%', () => {
      const result = progressBar(50, 10)
      expect(result).toContain('█'.repeat(5))
      expect(result).toContain('░'.repeat(5))
    })

    it('includes blessed color tags', () => {
      const result = progressBar(50)
      expect(result).toContain('{green-fg}')
      expect(result).toContain('{gray-fg}')
      expect(result).toContain('{/}')
    })
  })

  describe('createMiniProgressBar', () => {
    it('uses blue for low progress', () => {
      const result = createMiniProgressBar(20)
      expect(result).toContain('{blue-fg}')
      expect(result).toContain('20%')
    })

    it('uses yellow for medium progress', () => {
      const result = createMiniProgressBar(50)
      expect(result).toContain('{yellow-fg}')
      expect(result).toContain('50%')
    })

    it('uses green for high progress', () => {
      const result = createMiniProgressBar(80)
      expect(result).toContain('{green-fg}')
      expect(result).toContain('80%')
    })

    it('handles boundary values', () => {
      expect(createMiniProgressBar(0)).toContain('0%')
      expect(createMiniProgressBar(100)).toContain('100%')
    })
  })

  describe('getStatusIcon', () => {
    it('returns green circle for active statuses', () => {
      expect(getStatusIcon('active')).toContain('{green-fg}')
      expect(getStatusIcon('active')).toContain('●')
    })

    it('returns yellow for paused statuses', () => {
      expect(getStatusIcon('paused')).toContain('{yellow-fg}')
    })

    it('returns red for blocked status', () => {
      expect(getStatusIcon('blocked')).toContain('{red-fg}')
      expect(getStatusIcon('blocked')).toContain('✖')
    })

    it('returns cyan checkmark for complete', () => {
      expect(getStatusIcon('complete')).toContain('{cyan-fg}')
      expect(getStatusIcon('complete')).toContain('✓')
    })

    it('returns gray question for unknown', () => {
      expect(getStatusIcon('unknown')).toContain('{gray-fg}')
      expect(getStatusIcon('unknown')).toContain('?')
    })

    it('defaults to unknown for unrecognized status', () => {
      expect(getStatusIcon('foobar')).toBe(getStatusIcon('unknown'))
    })
  })

  describe('formatStatusWithIcon', () => {
    it('combines icon and status text', () => {
      const result = formatStatusWithIcon('active')
      expect(result).toContain('active')
      expect(result).toContain('{green-fg}')
    })
  })

  describe('formatProjectName', () => {
    it('formats normal name in white', () => {
      const result = formatProjectName('atlas')
      expect(result).toContain('{white-fg}')
      expect(result).toContain('atlas')
      expect(result).toContain('{bold}')
    })

    it('formats active project in green', () => {
      const result = formatProjectName('atlas', true, false)
      expect(result).toContain('{green-fg}')
    })

    it('formats selected project in cyan', () => {
      const result = formatProjectName('atlas', false, true)
      expect(result).toContain('{cyan-fg}')
    })

    it('prioritizes active over selected', () => {
      const result = formatProjectName('atlas', true, true)
      expect(result).toContain('{green-fg}')
    })
  })

  describe('formatNextAction', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatNextAction(null)).toBe('')
      expect(formatNextAction(undefined)).toBe('')
      expect(formatNextAction('')).toBe('')
    })

    it('formats action with arrow indicator', () => {
      const result = formatNextAction('Add tests')
      expect(result).toContain('{yellow-fg}→{/}')
      expect(result).toContain('Add tests')
    })

    it('truncates long actions', () => {
      const longAction = 'This is a very long action that should be truncated to fit'
      const result = formatNextAction(longAction, 20)
      expect(result.length).toBeLessThan(longAction.length + 20)
    })
  })

  describe('formatSessionIndicator', () => {
    it('shows no session message when null', () => {
      const result = formatSessionIndicator(null, 0)
      expect(result).toContain('No active session')
      expect(result).toContain('{gray-fg}')
    })

    it('shows active session with green dot', () => {
      const result = formatSessionIndicator('atlas', 25)
      expect(result).toContain('{green-fg}●{/}')
      expect(result).toContain('atlas')
      expect(result).toContain('25m')
    })
  })

  describe('formatStreak', () => {
    it('returns empty string for no streak', () => {
      expect(formatStreak(null)).toBe('')
      expect(formatStreak({})).toBe('')
      expect(formatStreak({ current: 0 })).toBe('')
    })

    it('uses display string if available', () => {
      const result = formatStreak({ current: 5, display: '🔥 5 day streak!' })
      expect(result).toBe('🔥 5 day streak!')
    })

    it('generates default display if no display string', () => {
      const result = formatStreak({ current: 3 })
      expect(result).toContain('🔥')
      expect(result).toContain('Day 3')
      expect(result).toContain('{yellow-fg}')
    })
  })

  describe('themes', () => {
    it('has default theme', () => {
      expect(themes.default).toBeDefined()
      expect(themes.default.primary).toBe('blue')
    })

    it('has dark theme', () => {
      expect(themes.dark).toBeDefined()
      expect(themes.dark.primary).toBe('magenta')
    })

    it('has minimal theme', () => {
      expect(themes.minimal).toBeDefined()
      expect(themes.minimal.primary).toBe('white')
    })

    it('exports theme names', () => {
      expect(themeNames).toContain('default')
      expect(themeNames).toContain('dark')
      expect(themeNames).toContain('minimal')
    })

    it('all themes have required properties', () => {
      const requiredProps = ['primary', 'secondary', 'accent', 'warning', 'error', 'muted']

      for (const themeName of themeNames) {
        for (const prop of requiredProps) {
          expect(themes[themeName][prop]).toBeDefined()
        }
      }
    })
  })
})
