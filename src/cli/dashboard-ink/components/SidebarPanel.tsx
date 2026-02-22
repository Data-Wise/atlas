/**
 * SidebarPanel
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
import type { Project } from '../types.js';
import { statusIcon, statusColor } from '../constants.js';

interface SidebarPanelProps {
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

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  project: Project;
  isHighlighted: boolean;
  isActiveSession: boolean;
}

const Row: React.FC<RowProps> = ({ project, isHighlighted, isActiveSession }) => {
  const icon   = statusIcon(project.status);
  const color  = statusColor(project.status);
  // Name column: narrow — 14 chars leaves room for icon + progress
  const name   = truncate(project.name, 14);
  const pct    = fmtProgress(project.progress);

  // Highlight logic:
  //   isHighlighted → blue reverse-video selection bar
  //   isActiveSession (running timer) → green name even when not selected
  const nameBold  = isHighlighted || isActiveSession;
  const nameColor = isHighlighted
    ? 'blueBright'
    : isActiveSession
      ? 'greenBright'
      : 'white';

  return (
    <Box
      paddingX={1}
      // Ink doesn't support true background fills; simulate selection with bold + color
    >
      {/* Status icon */}
      <Text color={isHighlighted ? 'blueBright' : color}>
        {icon}
      </Text>
      <Text> </Text>

      {/* Project name */}
      <Text bold={nameBold} color={nameColor}>
        {name}
      </Text>

      {/* Spacer */}
      <Text color="gray"> </Text>

      {/* Progress — right-aligned visually by padding name to fixed width */}
      <Text color={isHighlighted ? 'cyan' : 'gray'}>
        {pct}
      </Text>

      {/* Active session dot */}
      {isActiveSession && (
        <Text color="green"> ⏱</Text>
      )}
    </Box>
  );
};

// ─── SidebarPanel ─────────────────────────────────────────────────────────────

export const SidebarPanel: React.FC<SidebarPanelProps> = ({
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
  return (
    <Box flexDirection="column" width="100%" height="100%">

      {/* Header */}
      <Box paddingX={1} borderStyle="single" borderColor={isActive ? 'cyan' : 'gray'}>
        <Text bold color={isActive ? 'cyan' : 'gray'}>
          Projects
        </Text>
        <Text color="gray"> {projects.length}</Text>

        {/* Inbox badge */}
        {pendingCaptures > 0 && (
          <>
            <Text color="gray">  </Text>
            <Text color="yellow" bold>
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
          <Text color="gray" dimColor>
            {windowStart + 1}–{Math.min(windowStart + WINDOW, projects.length)}/{projects.length}
          </Text>
        </Box>
      )}

      {/* Focus hint */}
      <Box paddingX={1} borderStyle="single" borderColor="gray">
        {isActive ? (
          <Text color="gray" dimColor>j/k: nav  Enter: open  Shift+Tab: switch</Text>
        ) : (
          <Text color="gray" dimColor>Shift+Tab: focus sidebar</Text>
        )}
      </Box>
    </Box>
  );
};
