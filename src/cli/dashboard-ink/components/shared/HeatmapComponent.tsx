/**
 * HeatmapComponent — GitHub-style activity heatmap
 *
 * Renders a grid of block density characters showing activity over time.
 * Supports full (7-day) and compact (4-day) modes.
 *
 * Characters: · ░ ▒ ▓ █ (5 levels, theme-colored)
 * Layout: rows = days of week, columns = weeks
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../lib/ThemeContext.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeatmapCell {
  date: string;
  value: number;
  level: number; // 0-4
}

interface HeatmapComponentProps {
  /** 7-row × N-col grid from formatHeatmapGrid */
  grid: HeatmapCell[][];
  /** Number of weeks (columns) */
  weeks?: number;
  /** Compact mode: show 4 rows (Mon/Wed/Fri/Sat) instead of 7 */
  compact?: boolean;
  /** Current streak in days */
  streakDays?: number;
  /** Best day info */
  bestDay?: string;
  /** Total session count */
  totalSessions?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HEATMAP_CHARS = ['·', '░', '▒', '▓', '█'];
const DAY_LABELS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_COMPACT_INDICES = [0, 2, 4, 5]; // Mon, Wed, Fri, Sat

// ─── Component ───────────────────────────────────────────────────────────────

export const HeatmapComponent: React.FC<HeatmapComponentProps> = ({
  grid,
  weeks = 13,
  compact = false,
  streakDays,
  bestDay,
  totalSessions,
}) => {
  const theme = useTheme();

  if (!grid || grid.length === 0) return null;

  const rowIndices = compact ? DAY_LABELS_COMPACT_INDICES : [0, 1, 2, 3, 4, 5, 6];

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text bold color={theme.text.secondary}>
          Activity ({weeks}w)
        </Text>
        {/* Legend — right side */}
        <Text color={theme.text.muted}>{'  '}less </Text>
        {HEATMAP_CHARS.map((ch, i) => (
          <Text key={i} color={theme.chart.heatmap[i]}>{ch}</Text>
        ))}
        <Text color={theme.text.muted}> more</Text>
      </Box>

      {/* Grid rows */}
      <Box flexDirection="column" marginTop={1}>
        {rowIndices.map((rowIdx) => {
          const row = grid[rowIdx];
          if (!row) return null;

          const label = DAY_LABELS_FULL[rowIdx];

          return (
            <Box key={rowIdx}>
              <Text color={theme.text.muted}>{label} </Text>
              <Text color={theme.text.muted}>│</Text>
              {row.map((cell, colIdx) => (
                <Text key={colIdx} color={theme.chart.heatmap[cell.level]}>
                  {HEATMAP_CHARS[cell.level]}
                </Text>
              ))}
              <Text color={theme.text.muted}>│</Text>
            </Box>
          );
        })}
      </Box>

      {/* Summary line */}
      {(streakDays != null || bestDay || totalSessions != null) && (
        <Box marginTop={1}>
          {streakDays != null && (
            <Text color={theme.chart.sparklineUp}>{streakDays}d streak</Text>
          )}
          {bestDay && (
            <>
              <Text color={theme.text.muted}> · Best: </Text>
              <Text color={theme.text.primary}>{bestDay}</Text>
            </>
          )}
          {totalSessions != null && (
            <>
              <Text color={theme.text.muted}> · </Text>
              <Text color={theme.text.primary}>{totalSessions} sessions</Text>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};
