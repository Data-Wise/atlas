import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../lib/ThemeContext.js';
import { STATES } from '../lib/stateMachine.js';
import { LAYOUT } from '../lib/LayoutManager.js';
import type { LayoutMode } from '../lib/LayoutManager.js';

interface StatusBarProps {
  currentView: string;
  layout: LayoutMode;
  focusPanel: 'sidebar' | 'main' | 'inspector';
  hasActiveSession: boolean;
  activeProjectName: string | null;
  sessionSeconds: number;
  pendingCaptures: number;
}

// Unicode chars as JS strings (not JSX text — JSX treats \uXXXX as literal)
const ICON_DOT_ACTIVE = '\u25c9';     // ◉
const ICON_DOT_IDLE = '\u25cb';       // ○
const ICON_LAYOUT_SINGLE = '\u25a3';  // ▣
const ICON_LAYOUT_SPLIT = '\u25a5';   // ▥
const ICON_LAYOUT_TRIPLE = '\u25a6';  // ▦
const ICON_SEPARATOR = '\u2502';      // │
const ICON_CAPTURE = '\u25c6';        // ◆

const LAYOUT_INFO: Record<string, { icon: string; label: string }> = {
  [LAYOUT.SINGLE]: { icon: ICON_LAYOUT_SINGLE, label: 'Single' },
  [LAYOUT.SPLIT]:  { icon: ICON_LAYOUT_SPLIT, label: 'Split' },
  [LAYOUT.TRIPLE]: { icon: ICON_LAYOUT_TRIPLE, label: 'Triple' },
};

const KEY_HINTS: Record<string, string> = {
  [STATES.NOW]:   'j/k:nav Enter:select e:Eco  1/2/3:views  ?:help',
  [STATES.TIMER]: 'Space:pause r:reset z:zen  1/2/3:views  ?:help',
  [STATES.PLAN]:  'j/k:nav e:energy a:analytics  1/2/3:views  ?:help',
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentView, layout,
  hasActiveSession, activeProjectName, sessionSeconds,
  pendingCaptures,
}) => {
  const theme = useTheme();
  const hints = KEY_HINTS[currentView] ?? '';
  const layoutInfo = LAYOUT_INFO[layout] ?? { icon: ICON_LAYOUT_SINGLE, label: 'Single' };

  return (
    <Box width="100%">
      <Box flexGrow={1}>
        <Text color={hasActiveSession ? theme.chart.sparklineUp : theme.text.muted}>
          {hasActiveSession ? ICON_DOT_ACTIVE : ICON_DOT_IDLE}
        </Text>
        <Text> </Text>
        {hasActiveSession ? (
          <Text bold>{activeProjectName}</Text>
        ) : (
          <Text dimColor>idle</Text>
        )}
        {hasActiveSession && (
          <Text dimColor>  {formatElapsed(sessionSeconds)}</Text>
        )}
      </Box>

      <Box flexGrow={1}>
        <Text dimColor>  {hints}</Text>
      </Box>

      <Box>
        <Text>  {layoutInfo.icon} {layoutInfo.label}</Text>
        {pendingCaptures > 0 && (
          <Text>  {ICON_SEPARATOR}  {ICON_CAPTURE} {pendingCaptures}</Text>
        )}
      </Box>
    </Box>
  );
};
