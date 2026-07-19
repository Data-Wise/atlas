/**
 * ProjectList
 *
 * Compact project list column rendered in SPLIT and TRIPLE layout modes.
 * Replaces the card stack with a dense list optimised for narrow widths (25–28%).
 *
 * Features:
 *   - j/k or ↑↓ navigation (independent from main panel)
 *   - One-line rows: icon + name + status colour + progress %
 *   - Active session row highlighted in green
 *   - Inbox badge when pendingCaptures > 0
 *   - Enter fires onSelectProject; does NOT steal focus from main panel when
 *     isActive=false (keypresses pass through)
 *
 * Props:
 *   projects         - project list (same shape as App.tsx mockProjects)
 *   selectedIndex    - currently highlighted row index (controlled by parent)
 *   onSelect         - called when index changes (parent keeps state)
 *   onSelectProject  - called on Enter with the highlighted project
 *   isActive         - whether this panel holds keyboard focus
 *   pendingCaptures  - inbox count (shows badge if > 0)
 *   activeProjectId  - id of project with running session (highlights row)
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Project } from '../../types.js';
import { statusIcon } from '../../constants.js';
import { useTheme } from '../../lib/ThemeContext.js';
import type { Theme } from '../../lib/ThemeContext.js';

interface ProjectListProps {
  projects: Project[];
  /** Controlled selection index */
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSelectProject: (project: Project) => void;
  /** Whether this panel currently holds keyboard focus */
  isActive: boolean;
  /** Inbox badge count */
  pendingCaptures?: number;
  /** ID of project with an active session */
  activeProjectId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Abbreviate progress to a 3-char string e.g. "75%" " 5%" */
function fmtProgress(p: number): string {
  const clamped = Math.max(0, Math.min(100, p));
  return `${clamped}%`.padStart(4);
}

/** Truncate name to fit in the sidebar's narrow column */
function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

/** Render a 5-char sparkline from an array of numbers */
function renderSparkline(data: number[]): string {
  const max = Math.max(...data);
  if (max === 0) return '·····';
  return data
    .map(v => v === 0 ? '·' : SPARK_CHARS[Math.min(Math.floor((v / max) * 7), 7)])
    .join('');
}

/** Determine trend color: rising=sparklineUp, falling=sparklineDown, flat=primary */
function sparklineTrendColor(data: number[], theme: Theme): string {
  if (data.length < 4) return theme.chart.sparkline;
  const first2 = (data[0] + data[1]) / 2;
  const last2 = (data[data.length - 2] + data[data.length - 1]) / 2;
  if (last2 > first2) return theme.chart.sparklineUp;
  if (last2 < first2) return theme.chart.sparklineDown;
  return theme.text.primary;
}

interface InlineSparklineProps {
  data: number[];
}

const InlineSparkline: React.FC<InlineSparklineProps> = ({ data }) => {
  const theme = useTheme();
  const chars = renderSparkline(data);
  const color = sparklineTrendColor(data, theme);
  return <Text color={color}>{chars}</Text>;
};

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  project: Project;
  isHighlighted: boolean;
  isActiveSession: boolean;
}

const Row: React.FC<RowProps> = ({ project, isHighlighted, isActiveSession }) => {
  const theme  = useTheme();

  // Focus tier icon replaces status icon when focusTier is available
  const icon = project.focusTier?.symbol ?? statusIcon(project.status);
  const iconColor = project.focusTier
    ? (isHighlighted ? 'blueBright' : project.focusTier.color)
    : (isHighlighted ? 'blueBright' : (theme.status[project.status] ?? theme.text.secondary));

  const name   = truncate(project.name, 14);
  const pct    = fmtProgress(project.progress);

  const nameBold  = isHighlighted || isActiveSession;
  const nameColor = isHighlighted
    ? 'blueBright'
    : isActiveSession
      ? theme.focus.timer
      : theme.text.primary;

  const hasSparkline = project.recentActivity && project.recentActivity.length > 0;

  return (
    <Box paddingX={1}>
      <Text color={iconColor}>
        {icon}
      </Text>
      <Text> </Text>

      <Text bold={nameBold} color={nameColor}>
        {name}
      </Text>

      <Text color={theme.text.muted}> </Text>

      <Text color={isHighlighted ? theme.text.accent : theme.text.secondary}>
        {pct}
      </Text>

      {/* Sparkline when data is available */}
      {hasSparkline && (
        <>
          <Text> </Text>
          <InlineSparkline data={project.recentActivity!} />
        </>
      )}

      {isActiveSession && (
        <Text color={theme.focus.timer}> ⏱</Text>
      )}
    </Box>
  );
};

// ─── ProjectList ─────────────────────────────────────────────────────────────

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedIndex,
  onSelect,
  onSelectProject,
  isActive,
  pendingCaptures = 0,
  activeProjectId,
}) => {
  // ── Keyboard navigation (only when focused) ──────────────────────────────
  useInput((input, key) => {
    if (!isActive) return;

    if (input === 'j' || key.downArrow) {
      onSelect(Math.min(selectedIndex + 1, projects.length - 1));
    } else if (input === 'k' || key.upArrow) {
      onSelect(Math.max(selectedIndex - 1, 0));
    } else if (key.return) {
      const p = projects[selectedIndex];
      if (p) onSelectProject(p);
    }
  });

  // ── Windowing: show up to 12 rows, keep selected visible ─────────────────
  const WINDOW = 12;
  const windowStart = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(WINDOW / 2), projects.length - WINDOW)
  );
  const visible = projects.slice(windowStart, windowStart + WINDOW);

  // ─── Render ────────────────────────────────────────────────────────────────
  const theme = useTheme();

  return (
    <Box flexDirection="column" width="100%" height="100%">

      {/* Header */}
      <Box paddingX={1} borderStyle="single" borderColor={isActive ? theme.panel.borderActive : theme.panel.borderInactive}>
        <Text bold color={isActive ? theme.panel.headerActive : theme.panel.headerInactive}>
          Projects
        </Text>
        <Text color={theme.text.secondary}> {projects.length}</Text>

        {/* Inbox badge */}
        {pendingCaptures > 0 && (
          <>
            <Text color={theme.text.secondary}>  </Text>
            <Text color={theme.focus.paused} bold>
              📥{pendingCaptures}
            </Text>
          </>
        )}
      </Box>

      {/* Project rows */}
      <Box flexDirection="column" flexGrow={1} paddingTop={1}>
        {visible.map((project) => {
          const actualIndex = projects.indexOf(project);
          return (
            <Row
              key={project.id}
              project={project}
              isHighlighted={actualIndex === selectedIndex}
              isActiveSession={project.id === activeProjectId}
            />
          );
        })}
      </Box>

      {/* Scroll indicator when list overflows */}
      {projects.length > WINDOW && (
        <Box paddingX={1}>
          <Text color={theme.text.muted} dimColor>
            {windowStart + 1}–{Math.min(windowStart + WINDOW, projects.length)}/{projects.length}
          </Text>
        </Box>
      )}

      {/* Focus hint */}
      <Box paddingX={1} borderStyle="single" borderColor={theme.panel.borderInactive}>
        {isActive ? (
          <Text color={theme.text.muted} dimColor>j/k: nav  Enter: open  Shift+Tab: switch</Text>
        ) : (
          <Text color={theme.text.muted} dimColor>Shift+Tab: focus sidebar</Text>
        )}
      </Box>
    </Box>
  );
};
