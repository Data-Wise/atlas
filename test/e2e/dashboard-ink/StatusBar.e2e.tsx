/**
 * E2E tests for StatusBar component — ink-testing-library + vitest
 *
 * Tests 3-zone status bar rendering: session indicator, per-view key hints,
 * layout mode, capture count, and edge cases.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import { STATES } from '../../../src/cli/dashboard-ink/lib/stateMachine.js'
import { LAYOUT } from '../../../src/cli/dashboard-ink/lib/LayoutManager.js'

vi.mock('../../../src/cli/dashboard-ink/lib/ThemeContext.js', () => {
  const mockTheme = {
    name: 'test',
    text: { primary: 'white', secondary: 'gray', muted: 'gray', accent: 'cyan' },
    chart: { sparkline: 'white', sparklineUp: 'green', sparklineDown: 'yellow' },
    panel: { borderActive: 'cyan', borderInactive: 'gray', headerActive: 'cyan', headerInactive: 'gray', highlightBg: '#1a3a1a' },
    status: { active: 'green', paused: 'yellow' },
    focus: { timer: 'green' },
    focusTiers: ['gray', 'yellow', 'cyan', 'green', 'greenBright'],
  }
  return {
    useTheme: () => mockTheme,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    THEMES: { test: mockTheme },
    THEME_NAMES: ['test'],
  }
})

import { StatusBar } from '../../../src/cli/dashboard-ink/components/StatusBar.js'

// ─── Default props ────────────────────────────────────────────────────────────

const defaultProps = {
  currentView: STATES.NOW,
  layout: LAYOUT.SINGLE as string,
  focusPanel: 'main' as 'sidebar' | 'main' | 'inspector',
  hasActiveSession: true,
  activeProjectName: 'atlas',
  sessionSeconds: 754,
  pendingCaptures: 3,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StatusBar E2E', () => {
  describe('Session indicator (left zone)', () => {
    it('shows active session dot + project name + elapsed time', () => {
      const { lastFrame } = render(<StatusBar {...defaultProps} />)
      const frame = lastFrame() ?? ''
      expect(frame).toContain('\u25c9')
      expect(frame).toContain('atlas')
      expect(frame).toContain('12m 34s')
    })

    it('shows idle dot + dimmed "idle" text when no active session', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} hasActiveSession={false} sessionSeconds={0} />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('\u25cb')
      expect(frame).toContain('idle')
      expect(frame).not.toContain('atlas')
      expect(frame).not.toContain('12m')
    })

    it('formats zero seconds as 0m 0s', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} sessionSeconds={0} />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('0m 0s')
    })

    it('formats sub-minute as 0m Xs', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} sessionSeconds={45} />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('0m 45s')
    })

    it('formats exact hour as 60m 0s', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} sessionSeconds={3600} />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('60m 0s')
    })
  })

  describe('Key hints (center zone)', () => {
    const viewCases: Array<{ view: string; label: string; checks: string[] }> = [
      { view: STATES.NOW,   label: 'NOW',   checks: ['j/k:nav', 'Enter:select', 'e:Eco'] },
      { view: STATES.TIMER, label: 'TIMER', checks: ['Space:pause', 'r:reset', 'z:zen'] },
      { view: STATES.PLAN,  label: 'PLAN',  checks: ['j/k:nav', 'e:energy', 'a:analytics'] },
    ]

    viewCases.forEach(({ view, label, checks }) => {
      it(`shows ${label} key hints`, () => {
        const { lastFrame } = render(
          <StatusBar {...defaultProps} currentView={view} />
        )
        const frame = lastFrame() ?? ''
        checks.forEach(hint => {
          expect(frame).toContain(hint)
        })
      })
    })
  })

  describe('Layout + captures (right zone)', () => {
    it('shows current layout mode icon and label', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} layout={LAYOUT.SPLIT} />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('\u25a5')
      expect(frame).toContain('Split')
    })

    it('shows TRIPLE layout', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} layout={LAYOUT.TRIPLE} />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('\u25a6')
      expect(frame).toContain('Triple')
    })

    it('shows capture count with separator when > 0', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} pendingCaptures={5} />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('\u2502')
      expect(frame).toContain('\u25c6')
      expect(frame).toContain('5')
    })

    it('hides capture separator when count is 0', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} pendingCaptures={0} />
      )
      const frame = lastFrame() ?? ''
      expect(frame).not.toContain('\u2502')
      expect(frame).not.toContain('\u25c6')
    })

    it('shows SINGLE by default', () => {
      const { lastFrame } = render(<StatusBar {...defaultProps} />)
      const frame = lastFrame() ?? ''
      expect(frame).toContain('\u25a3')
      expect(frame).toContain('Single')
    })
  })

  describe('Edge cases', () => {
    it('handles null project name without crashing', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} activeProjectName={null} />
      )
      const frame = lastFrame() ?? ''
      // null → falls through to hasActiveSession=true branch, renders null as "null"
      expect(frame).toBeDefined()
    })

    it('handles unknown view state by showing empty hints', () => {
      const { lastFrame } = render(
        <StatusBar {...defaultProps} currentView="UNKNOWN" />
      )
      const frame = lastFrame() ?? ''
      // Center zone should be empty
      expect(frame).toBeDefined()
      expect(frame).not.toContain('j/k:nav')
      expect(frame).not.toContain('q:back')
    })

    it('renders something for all 3 view states', () => {
      const views = Object.values(STATES)
      views.forEach(view => {
        const { lastFrame } = render(
          <StatusBar {...defaultProps} currentView={view} />
        )
        const frame = lastFrame() ?? ''
        expect(frame.length).toBeGreaterThan(0)
      })
    })

    it('renders combined idle-with-captures state', () => {
      const { lastFrame } = render(
        <StatusBar
          {...defaultProps}
          hasActiveSession={false}
          sessionSeconds={0}
          pendingCaptures={2}
        />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('\u25cb')
      expect(frame).toContain('idle')
      expect(frame).toContain('\u25c6')
      expect(frame).toContain('2')
    })
  })
})
