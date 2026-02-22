/**
 * InspectorPanel
 *
 * Right-hand detail + Pomodoro panel rendered in TRIPLE layout mode (28% width).
 * Sits to the right of the main content panel and shows:
 *
 *   ┌─────────────────────────┐
 *   │ 🎯 atlas                │  ← project name + type
 *   │ ● active  75%  ████░░░  │  ← status + progress bar
 *   ├─────────────────────────┤
 *   │ Focus                   │
 *   │ Implementing auth flow  │  ← current focus text
 *   ├─────────────────────────┤
 *   │ Next                    │
 *   │ · Add OAuth provider    │  ← next actions (up to 3)
 *   │ · Write tests           │
 *   ├─────────────────────────┤
 *   │ ⏱ SESSION               │
 *   │ 24:10  ██████████░░░░   │  ← live Pomodoro timer (reuses FocusView logic)
 *   │ ● FOCUSING / ◑ PAUSED   │
 *   │ Space: pause  r: reset  │
 *   ├─────────────────────────┤
 *   │ Recent                  │
 *   │ · breadcrumb 1  (5m)    │  ← last 3 breadcrumbs
 *   └─────────────────────────┘
 *
 * Props:
 *   project         - currently selected project (or undefined = empty state)
 *   isActive        - whether this panel holds keyboard focus
 *   sessionSeconds  - seconds elapsed in current session (0 = no session)
 *   pomodoroLength  - Pomodoro duration in minutes (default: 25)
 *   breadcrumbs     - recent breadcrumb strings (max 3 shown)
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Project } from '../types.js';
import { statusIcon } from '../constants.js';
import { useTheme } from '../lib/ThemeContext.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InspectorPanelProps {
  project?: Project;
  isActive: boolean;
  /** Seconds elapsed in the current work session (0 = no active session) */
  sessionSeconds?: number;
  /** Pomodoro block length in minutes */
  pomodoroLength?: number;
  /** Last N breadcrumbs (displayed newest-first, max 3) */
  breadcrumbs?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 8-char progress bar */
function progressBar(pct: number): { filled: string; empty: string } {
  const W = 8;
  const n = Math.round(Math.max(0, Math.min(100, pct)) / 100 * W);
  return { filled: '█'.repeat(n), empty: '░'.repeat(W - n) };
}

/** Format seconds → MM:SS */
function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Truncate for narrow inspector column */
function trunc(s: string, max = 22): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ─── Focus Score Breakdown ────────────────────────────────────────────────────

interface FocusScoreBreakdownProps {
  focusScore?: number;
  focusTier?: { symbol: string; color: string; label: string };
}

/** Mini bar for a focus component (0-100 scale, 8 chars wide) */
function componentBar(value: number): string {
  const W = 8;
  const n = Math.round(Math.max(0, Math.min(100, value)) / 100 * W);
  return '█'.repeat(n) + '░'.repeat(W - n);
}

const FocusScoreBreakdown: React.FC<FocusScoreBreakdownProps> = ({ focusScore, focusTier }) => {
  const theme = useTheme();

  if (focusScore == null || focusTier == null) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Score headline */}
      <Box>
        <Text bold color={theme.text.secondary}>Focus  </Text>
        <Text bold color={focusTier.color}>{focusTier.symbol} {focusScore} {focusTier.label}</Text>
      </Box>
    </Box>
  );
};

// ─── Pomodoro mini-block ──────────────────────────────────────────────────────

interface PomodoroBlockProps {
  isActive: boolean;
  pomodoroLength: number;
  hasSession: boolean;
}

const PomodoroBlock: React.FC<PomodoroBlockProps> = ({
  isActive,
  pomodoroLength,
  hasSession,
}) => {
  const theme = useTheme();
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused]   = useState(false);

  const totalSecs = pomodoroLength * 60;
  const remaining = Math.max(0, totalSecs - elapsed);
  const isBreak   = remaining === 0;

  useEffect(() => {
    if (!hasSession || paused || isBreak) return;
    const id = setInterval(() => {
      setElapsed(p => Math.min(p + 1, totalSecs));
    }, 1000);
    return () => clearInterval(id);
  }, [hasSession, paused, isBreak, totalSecs]);

  useEffect(() => {
    setElapsed(0);
    setPaused(false);
  }, [hasSession]);

  useInput((input, key) => {
    if (!isActive) return;
    if (input === ' ') setPaused(p => !p);
    if (input === 'r' && paused) setElapsed(0);
  });

  if (!hasSession) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold color={theme.text.secondary}>⏱ SESSION</Text>
        <Text color={theme.text.muted} dimColor> No active session</Text>
        <Text color={theme.text.muted} dimColor> Press s in main panel</Text>
      </Box>
    );
  }

  const bar = progressBar((elapsed / totalSecs) * 100);
  const statusLabel = isBreak ? '☕ BREAK TIME' : paused ? '◑ PAUSED' : '● FOCUSING';
  const timerColor  = isBreak ? theme.focus.break : paused ? theme.focus.paused : theme.focus.timer;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color={isActive ? theme.panel.headerActive : theme.text.secondary}>⏱ SESSION</Text>

      <Box marginTop={1}>
        <Text bold color={timerColor}>{fmtTime(remaining)}</Text>
        <Text color={theme.text.secondary}>  </Text>
        <Text color={bar.filled ? theme.chart.progressFilled : theme.text.secondary}>{bar.filled}</Text>
        <Text color={theme.chart.progressEmpty}>{bar.empty}</Text>
      </Box>

      <Box>
        <Text bold color={timerColor}>{statusLabel}</Text>
      </Box>

      <Box>
        <Text color={theme.text.muted} dimColor>
          {pomodoroLength}m block
        </Text>
      </Box>

      {isActive && (
        <Box marginTop={1}>
          <Text color={theme.text.accent}>Space</Text>
          <Text color={theme.text.secondary}> {paused ? 'resume' : 'pause'} </Text>
          <Text color={theme.text.accent}>r</Text>
          <Text color={theme.text.secondary}> reset</Text>
        </Box>
      )}
    </Box>
  );
};

// ─── InspectorPanel ───────────────────────────────────────────────────────────

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  project,
  isActive,
  sessionSeconds = 0,
  pomodoroLength = 25,
  breadcrumbs = [],
}) => {
  const theme = useTheme();
  const hasSession = sessionSeconds > 0;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!project) {
    return (
      <Box flexDirection="column" width="100%" height="100%">
        <Box paddingX={1} borderStyle="single" borderColor={isActive ? theme.panel.borderActive : theme.panel.borderInactive}>
          <Text bold color={isActive ? theme.panel.headerActive : theme.panel.headerInactive}>Inspector</Text>
        </Box>
        <Box flexGrow={1} paddingX={1} paddingTop={2} justifyContent="center">
          <Text color={theme.text.muted} dimColor>Select a project</Text>
        </Box>
      </Box>
    );
  }

  const bar  = progressBar(project.progress);
  const sCol = theme.status[project.status] ?? theme.text.secondary;
  const sIco = statusIcon(project.status);

  const nextItems: string[] = project.next
    ? project.next.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  const recentCrumbs = breadcrumbs.slice(0, 3);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" width="100%" height="100%">

      {/* Header */}
      <Box paddingX={1} borderStyle="single" borderColor={isActive ? theme.panel.borderActive : theme.panel.borderInactive}>
        <Text bold color={isActive ? theme.panel.headerActive : theme.panel.headerInactive}>Inspector</Text>
      </Box>

      <Box flexDirection="column" paddingX={1} flexGrow={1}>

        {/* Project name + type */}
        <Box marginTop={1}>
          <Text bold color={theme.text.primary}>🎯 </Text>
          <Text bold color={theme.text.primary}>{trunc(project.name, 18)}</Text>
        </Box>
        <Box>
          <Text color={theme.text.muted} dimColor>{project.type}</Text>
        </Box>

        {/* Status + progress */}
        <Box marginTop={1}>
          <Text color={sCol}>{sIco} </Text>
          <Text color={sCol}>{project.status}</Text>
          <Text color={theme.text.secondary}>  {project.progress}%  </Text>
          <Text color={theme.chart.progressFilled}>{bar.filled}</Text>
          <Text color={theme.chart.progressEmpty}>{bar.empty}</Text>
        </Box>

        {/* Focus score breakdown */}
        <FocusScoreBreakdown focusScore={project.focusScore} focusTier={project.focusTier} />

        {/* Separator */}
        <Box marginTop={1}>
          <Text color={theme.text.muted} dimColor>{'─'.repeat(22)}</Text>
        </Box>

        {/* Focus */}
        {project.focus && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color={theme.text.secondary}>Focus</Text>
            <Text color={theme.text.accent}>{trunc(project.focus, 22)}</Text>
          </Box>
        )}

        {/* Next actions */}
        {nextItems.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color={theme.text.secondary}>Next</Text>
            {nextItems.map((item, i) => (
              <Box key={i}>
                <Text color={theme.text.secondary}>· </Text>
                <Text color={theme.text.primary}>{trunc(item, 20)}</Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Separator */}
        <Box marginTop={1}>
          <Text color={theme.text.muted} dimColor>{'─'.repeat(22)}</Text>
        </Box>

        {/* Pomodoro block */}
        <PomodoroBlock
          isActive={isActive}
          pomodoroLength={pomodoroLength}
          hasSession={hasSession}
        />

        {/* Recent breadcrumbs */}
        {recentCrumbs.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Box marginTop={1}>
              <Text color={theme.text.muted} dimColor>{'─'.repeat(22)}</Text>
            </Box>
            <Text bold color={theme.text.secondary}>Recent</Text>
            {recentCrumbs.map((crumb, i) => (
              <Box key={i}>
                <Text color={theme.text.secondary}>· </Text>
                <Text color={theme.text.muted} dimColor>{trunc(crumb, 20)}</Text>
              </Box>
            ))}
          </Box>
        )}

      </Box>

      {/* Focus hint footer */}
      <Box paddingX={1} borderStyle="single" borderColor={theme.panel.borderInactive}>
        {isActive ? (
          <Text color={theme.text.muted} dimColor>Space: pause  r: reset  Shift+Tab: switch</Text>
        ) : (
          <Text color={theme.text.muted} dimColor>Shift+Tab: focus inspector</Text>
        )}
      </Box>
    </Box>
  );
};
