/**
 * E2E tests for AnalyticsView — component rendering with ink-testing-library
 *
 * Tests full component rendering including mock data, keyboard navigation,
 * loading/error/empty states, and visual output validation.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import type { Project, AnalyticsData } from '../../../src/cli/dashboard-ink/types.js'

// ─── Mock data factories ──────────────────────────────────────────────────────

const emptyGrid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))

const baseAnalyticsData: AnalyticsData = {
  velocitySparkline: [0, 2, 5, 8, 12, 15, 18, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 52, 55, 58, 60, 62, 65, 68, 70, 72, 75, 78],
  velocityTrend: 25,
  velocityAvg: 12.5,
  weeklySummaries: [
    { label: 'Jun 8', totalMinutes: 120, sessionCount: 3, trend: 10 },
    { label: 'Jun 15', totalMinutes: 180, sessionCount: 5, trend: 15 },
    { label: 'Jun 22', totalMinutes: 240, sessionCount: 7, trend: 20 },
    { label: 'Jun 29', totalMinutes: 300, sessionCount: 9, trend: 25 },
  ],
  patternGrid: emptyGrid,
  patternBestDay: 'Wednesday',
  patternBestHour: '10:00 AM',
  patternDeadZones: [
    { day: 'Saturday', hour: '3:00 AM', intensity: 0.02 },
    { day: 'Sunday', hour: '4:00 AM', intensity: 0.01 },
  ],
}

// ─── Dynamic mocks ────────────────────────────────────────────────────────────

let mockAnalyticsReturn = {
  data: baseAnalyticsData,
  velocityLoading: false,
  patternLoading: false,
  velocityError: null as string | null,
  patternError: null as string | null,
}
let mockProjectStatsReturn = { focusScore: 72, totalSessions: 24 }

vi.mock('../../../src/cli/dashboard-ink/hooks/useAnalytics.js', () => ({
  useAnalytics: () => mockAnalyticsReturn,
}))

vi.mock('../../../src/cli/dashboard-ink/hooks/useProjectStats.js', () => ({
  useProjectStats: () => mockProjectStatsReturn,
}))

vi.mock('../../../src/cli/dashboard-ink/lib/ThemeContext.js', () => {
  const mockTheme = {
    name: 'test',
    panel: { borderActive: 'cyan', borderInactive: 'gray', headerActive: 'cyan', headerInactive: 'gray', highlightBg: '#1a3a1a' },
    status: { active: 'green', paused: 'yellow', stable: 'cyan', complete: 'gray', planning: 'blue', blocked: 'yellow', draft: 'gray' },
    text: { primary: 'white', secondary: 'gray', muted: 'gray', accent: 'cyan' },
    chart: {
      sparkline: 'white',
      sparklineUp: 'green',
      sparklineDown: 'yellow',
      heatmap: ['#3a3a3a', '#5f875f', '#5faf5f', '#00af00', '#00d700'],
      progressFilled: 'green',
      progressEmpty: 'gray',
    },
    focus: { timer: 'green', paused: 'yellow', break: 'yellow' },
    focusTiers: ['gray', 'yellow', 'cyan', 'green', 'greenBright'],
  }
  return {
    useTheme: () => mockTheme,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    THEMES: { test: mockTheme },
    THEME_NAMES: ['test'],
  }
})

vi.mock('../../../src/cli/dashboard-ink/lib/AtlasContext.js', () => ({
  useAtlas: () => ({
    getSessionRepository: () => ({}),
    getProjectRepository: () => ({}),
    getGetSessionStatsUseCase: () => ({}),
  }),
  AtlasProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../../../src/adapters/presenters/PatternPresenter.js', () => ({
  formatPatternGrid: () =>
    '  Sun \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\n  Mon \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\n  Tue \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\n  Wed \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\n  Thu \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\n  Fri \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\n  Sat \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591',
  formatPatternCallout: () => 'Best: Wednesday 10:00 AM',
  buildPatternGrid: () => Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
}))

// ─── Test data ────────────────────────────────────────────────────────────────

const mockProjects: Project[] = [
  { id: '1', name: 'project-alpha', type: 'node-package', status: 'active', progress: 80, focus: 'Feature A' },
  { id: '2', name: 'project-beta', type: 'r-package', status: 'stable', progress: 95, focus: 'Bug fix' },
  { id: '3', name: 'project-gamma', type: 'zsh-package', status: 'paused', progress: 60, focus: null },
]

import { AnalyticsView } from '../../../src/cli/dashboard-ink/components/views/AnalyticsView.js'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AnalyticsView E2E', () => {
  let onBack: ReturnType<typeof vi.fn>
  let onFocus: ReturnType<typeof vi.fn>
  let onSelectProject: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onBack = vi.fn()
    onFocus = vi.fn()
    onSelectProject = vi.fn()
    mockAnalyticsReturn = {
      data: baseAnalyticsData,
      velocityLoading: false,
      patternLoading: false,
      velocityError: null,
      patternError: null,
    }
    mockProjectStatsReturn = { focusScore: 72, totalSessions: 24 }
  })

  describe('Rendering', () => {
    it('renders project name in header', () => {
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('project-alpha')
    })

    it('renders focus score and session count in summary', () => {
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('72')
      expect(frame).toContain('24')
    })

    it('renders velocity section with sparkline characters', () => {
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toMatch(/[▁▂▃▄▅▆▇█]/)
    })

    it('renders trend percentage in velocity section', () => {
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      // velocityTrend=25 → renders as "+25% ↑"
      expect(frame).toContain('+25%')
    })

    it('renders weekly table with session counts', () => {
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toMatch(/Week|Hours|Sessions|Trend/)
      expect(frame).toContain('3')
      expect(frame).toContain('5')
    })

    it('renders empty state when no project selected', () => {
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId={null}
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('No project')
    })

    it('renders loading state when velocity is loading', () => {
      mockAnalyticsReturn = { ...mockAnalyticsReturn, data: null, velocityLoading: true }
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('Loading')
    })

    it('renders error state in velocity section', () => {
      const err = new Error('API error')
      mockAnalyticsReturn = { ...mockAnalyticsReturn, data: null, velocityError: err }
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      // Component renders: "⚠ Could not load velocity data"
      expect(frame).toContain('Could not load velocity data')
    })

    it('renders zero state when there are no sessions', () => {
      const emptyData: AnalyticsData = {
        velocitySparkline: [],
        velocityTrend: 0,
        velocityAvg: 0,
        weeklySummaries: [],
        patternGrid: [],
        patternBestDay: '',
        patternBestHour: '',
        patternDeadZones: [],
      }
      mockAnalyticsReturn = { ...mockAnalyticsReturn, data: emptyData }
      mockProjectStatsReturn = { focusScore: 0, totalSessions: 0 }
      const { lastFrame } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      const frame = lastFrame() ?? ''
      expect(frame).toContain('No session data')
    })
  })

  describe('Keyboard Navigation', () => {
    it('navigates to next project with right arrow', () => {
      const { stdin } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      stdin.write('\x1B[C')
      expect(onSelectProject).toHaveBeenCalledWith('2')
    })

    it('navigates to previous project with left arrow', () => {
      const { stdin } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="2"
          onSelectProject={onSelectProject}
        />
      )
      stdin.write('\x1B[D')
      expect(onSelectProject).toHaveBeenCalledWith('1')
    })

    it('wraps around when left arrow on first project', () => {
      const { stdin } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="1"
          onSelectProject={onSelectProject}
        />
      )
      stdin.write('\x1B[D')
      expect(onSelectProject).toHaveBeenCalledWith('3')
    })

    it('wraps around when right arrow on last project', () => {
      const { stdin } = render(
        <AnalyticsView
          onBack={onBack}
          onFocus={onFocus}
          projects={mockProjects}
          selectedProjectId="3"
          onSelectProject={onSelectProject}
        />
      )
      stdin.write('\x1B[C')
      expect(onSelectProject).toHaveBeenCalledWith('1')
    })
  })
})
