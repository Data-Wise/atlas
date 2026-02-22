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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InspectorProject {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
  focus?: string;
  path?: string;
  next?: string;
}

interface InspectorPanelProps {
  project?: InspectorProject;
  isActive: boolean;
  /** Seconds elapsed in the current work session (0 = no active session) */
  sessionSeconds?: number;
  /** Pomodoro block length in minutes */
  pomodoroLength?: number;
  /** Last N breadcrumbs (displayed newest-first, max 3) */
  breadcrumbs?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  active:   'green',
  paused:   'yellow',
  stable:   'cyan',
  complete: 'gray',
  planning: 'blue',
  blocked:  'red',
};

const STATUS_ICON: Record<string, string> = {
  active:   '●',
  paused:   '◐',
  stable:   '◆',
  complete: '✓',
  planning: '○',
  blocked:  '✗',
};

function statusColor(s: string): string { return STATUS_COLOR[s] ?? 'white'; }
function statusIcon(s: string): string  { return STATUS_ICON[s]  ?? '○'; }

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
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused]   = useState(false);

  const totalSecs = pomodoroLength * 60;
  const remaining = Math.max(0, totalSecs - elapsed);
  const isBreak   = remaining === 0;

  // Timer tick — only runs when inspector is in a session and not paused
  useEffect(() => {
    if (!hasSession || paused || isBreak) return;
    const id = setInterval(() => {
      setElapsed(p => Math.min(p + 1, totalSecs));
    }, 1000);
    return () => clearInterval(id);
  }, [hasSession, paused, isBreak, totalSecs]);

  // Reset when session changes
  useEffect(() => {
    setElapsed(0);
    setPaused(false);
  }, [hasSession]);

  // Keyboard – only responds when inspector panel is focused
  useInput((input, key) => {
    if (!isActive) return;
    if (input === ' ') setPaused(p => !p);
    if (input === 'r' && paused) setElapsed(0);
  });

  if (!hasSession) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="gray">⏱ SESSION</Text>
        <Text color="gray" dimColor> No active session</Text>
        <Text color="gray" dimColor> Press s in main panel</Text>
      </Box>
    );
  }

  const bar = progressBar((elapsed / totalSecs) * 100);
  const statusLabel = isBreak ? '☕ BREAK TIME' : paused ? '◑ PAUSED' : '● FOCUSING';
  const timerColor  = isBreak ? 'yellow' : paused ? 'yellow' : 'green';

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color={isActive ? 'cyan' : 'gray'}>⏱ SESSION</Text>

      {/* Timer */}
      <Box marginTop={1}>
        <Text bold color={timerColor}>{fmtTime(remaining)}</Text>
        <Text color="gray">  </Text>
        <Text color={bar.filled ? 'green' : 'gray'}>{bar.filled}</Text>
        <Text color="gray">{bar.empty}</Text>
      </Box>

      {/* Status */}
      <Box>
        <Text bold color={timerColor}>{statusLabel}</Text>
      </Box>

      {/* Pomodoro count */}
      <Box>
        <Text color="gray" dimColor>
          {pomodoroLength}m block
        </Text>
      </Box>

      {/* Hint — only when focused */}
      {isActive && (
        <Box marginTop={1}>
          <Text color="cyan">Space</Text>
          <Text color="gray"> {paused ? 'resume' : 'pause'} </Text>
          <Text color="cyan">r</Text>
          <Text color="gray"> reset</Text>
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
  const hasSession = sessionSeconds > 0;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!project) {
    return (
      <Box flexDirection="column" width="100%" height="100%">
        <Box paddingX={1} borderStyle="single" borderColor={isActive ? 'cyan' : 'gray'}>
          <Text bold color={isActive ? 'cyan' : 'gray'}>Inspector</Text>
        </Box>
        <Box flexGrow={1} paddingX={1} paddingTop={2} justifyContent="center">
          <Text color="gray" dimColor>Select a project</Text>
        </Box>
      </Box>
    );
  }

  const bar  = progressBar(project.progress);
  const sCol = statusColor(project.status);
  const sIco = statusIcon(project.status);

  // Parse next actions (comma-separated or newline-separated, up to 3)
  const nextItems: string[] = project.next
    ? project.next.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  // Breadcrumbs — newest first, up to 3
  const recentCrumbs = breadcrumbs.slice(0, 3);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" width="100%" height="100%">

      {/* Header */}
      <Box paddingX={1} borderStyle="single" borderColor={isActive ? 'cyan' : 'gray'}>
        <Text bold color={isActive ? 'cyan' : 'gray'}>Inspector</Text>
      </Box>

      <Box flexDirection="column" paddingX={1} flexGrow={1}>

        {/* Project name + type */}
        <Box marginTop={1}>
          <Text bold color="white">🎯 </Text>
          <Text bold color="white">{trunc(project.name, 18)}</Text>
        </Box>
        <Box>
          <Text color="gray" dimColor>{project.type}</Text>
        </Box>

        {/* Status + progress */}
        <Box marginTop={1}>
          <Text color={sCol}>{sIco} </Text>
          <Text color={sCol}>{project.status}</Text>
          <Text color="gray">  {project.progress}%  </Text>
          <Text color="green">{bar.filled}</Text>
          <Text color="gray">{bar.empty}</Text>
        </Box>

        {/* Separator */}
        <Box marginTop={1}>
          <Text color="gray" dimColor>{'─'.repeat(22)}</Text>
        </Box>

        {/* Focus */}
        {project.focus && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color="gray">Focus</Text>
            <Text color="cyan">{trunc(project.focus, 22)}</Text>
          </Box>
        )}

        {/* Next actions */}
        {nextItems.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color="gray">Next</Text>
            {nextItems.map((item, i) => (
              <Box key={i}>
                <Text color="gray">· </Text>
                <Text color="white">{trunc(item, 20)}</Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Separator */}
        <Box marginTop={1}>
          <Text color="gray" dimColor>{'─'.repeat(22)}</Text>
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
              <Text color="gray" dimColor>{'─'.repeat(22)}</Text>
            </Box>
            <Text bold color="gray">Recent</Text>
            {recentCrumbs.map((crumb, i) => (
              <Box key={i}>
                <Text color="gray">· </Text>
                <Text color="gray" dimColor>{trunc(crumb, 20)}</Text>
              </Box>
            ))}
          </Box>
        )}

      </Box>

      {/* Focus hint footer */}
      <Box paddingX={1} borderStyle="single" borderColor="gray">
        {isActive ? (
          <Text color="gray" dimColor>Space: pause  r: reset  Shift+Tab: switch</Text>
        ) : (
          <Text color="gray" dimColor>Shift+Tab: focus inspector</Text>
        )}
      </Box>
    </Box>
  );
};
