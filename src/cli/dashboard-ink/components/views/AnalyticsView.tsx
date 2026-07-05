import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAnalytics } from '../../hooks/useAnalytics.js';
import { useProjectStats } from '../../hooks/useProjectStats.js';
import { useTheme } from '../../lib/ThemeContext.js';
import { formatPatternGrid, formatPatternCallout } from '../../../../adapters/presenters/PatternPresenter.js';
import type { Project, AnalyticsData } from '../../types.js';

interface AnalyticsViewProps {
  onBack: () => void;
  onFocus: () => void;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onBack,
  onFocus,
  projects,
  selectedProjectId,
  onSelectProject,
}) => {
  const theme = useTheme();
  const currentIdx = projects.findIndex(p => p.id === selectedProjectId);
  const project = projects[currentIdx] ?? null;
  const projectId = project?.id ?? null;

  const { data, velocityLoading, patternLoading, velocityError, patternError } = useAnalytics(projectId);
  const { focusScore, totalSessions } = useProjectStats(projectId);

  useInput((_input, key) => {
    if (key.leftArrow && projects.length > 1) {
      const prev = (currentIdx - 1 + projects.length) % projects.length;
      onSelectProject(projects[prev].id);
    } else if (key.rightArrow && projects.length > 1) {
      const next = (currentIdx + 1) % projects.length;
      onSelectProject(projects[next].id);
    }
  });

  if (!project) {
    return (
      <Box flexDirection="column" padding={1} width="100%" height="100%">
        <Text dimColor>No project selected.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} width="100%" height="100%">
      {/* Header */}
      <Box>
        <Text bold color={theme.text.accent}>
          {'\u25c9'} {project.name}
        </Text>
        <Box marginLeft={2}>
          <Text color={theme.text.secondary}>
            {currentIdx > 0 ? '\u2190' : ' '}
            {' '}
            {currentIdx < projects.length - 1 ? '\u2192' : ' '}
            {' '}project
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text dimColor>
            {!velocityLoading || !patternLoading ? 'updated now' : 'loading\u2026'}
          </Text>
        </Box>
      </Box>

      {/* Summary row */}
      <Box marginTop={1}>
        <Text>{'\u25cf'} Focus Score: </Text>
        <Text bold color={focusScore >= 70 ? theme.chart.sparklineUp : theme.chart.sparklineDown}>
          {focusScore}
        </Text>
        <Box marginLeft={2}>
          <Text dimColor>{'\u25cb'} Total: {totalSessions} sessions</Text>
        </Box>
      </Box>

      {/* Velocity panel */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.text.accent}>Focus Velocity</Text>
        {renderVelocityContent(data, velocityLoading, velocityError, theme)}
      </Box>

      {/* Patterns panel */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.text.accent}>Flow Patterns</Text>
        {renderPatternContent(data, patternLoading, patternError, theme)}
      </Box>
    </Box>
  );
};

function renderVelocityContent(
  data: AnalyticsData | null,
  loading: boolean,
  error: Error | null,
  theme: any,
) {
  if (error) {
    return (
      <Box marginTop={1}>
        <Text color={theme.chart.sparklineDown}>
          {'\u26a0'} Could not load velocity data
        </Text>
      </Box>
    );
  }

  if (loading && !data) {
    return (
      <Box marginTop={1}>
        <Text dimColor>{'\u258b'} Loading velocity data\u2026</Text>
      </Box>
    );
  }

  if (!data || data.velocitySparkline.length === 0) {
    return (
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>No session data yet. Start a session to see velocity trends.</Text>
      </Box>
    );
  }

  const sparklineStr = asciiSparkline(data.velocitySparkline);
  const trendSymbol = data.velocityTrend > 0 ? '\u2191' : data.velocityTrend < 0 ? '\u2193' : '\u2192';

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>{sparklineStr}</Text>
      <Box marginTop={0}>
        <Text dimColor>30-day: </Text>
        <Text color={data.velocityTrend >= 0 ? theme.chart.sparklineUp : theme.chart.sparklineDown}>
          {data.velocityTrend > 0 ? '+' : ''}{data.velocityTrend}% {trendSymbol}
        </Text>
        <Box marginLeft={2}>
          <Text dimColor>avg {data.velocityAvg} min/day</Text>
        </Box>
      </Box>

      {/* Weekly table */}
      {data.weeklySummaries.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <WeekTable summaries={data.weeklySummaries} theme={theme} />
        </Box>
      )}
    </Box>
  );
}

function renderPatternContent(
  data: AnalyticsData | null,
  loading: boolean,
  error: Error | null,
  theme: any,
) {
  if (error) {
    return (
      <Box marginTop={1}>
        <Text color={theme.chart.sparklineDown}>
          {'\u26a0'} Could not load pattern data
        </Text>
      </Box>
    );
  }

  if (loading && !data) {
    return (
      <Box marginTop={1}>
        <Text dimColor>{'\u258b'} Loading pattern data\u2026</Text>
      </Box>
    );
  }

  if (!data || !data.patternGrid || data.patternGrid.length < 7) {
    return (
      <Box marginTop={1}>
        <Text dimColor>Not enough session data for pattern analysis (need 90 days).</Text>
      </Box>
    );
  }

  const gridStr = formatPatternGrid(data.patternGrid);
  const callout = formatPatternCallout(data.patternBestDay, data.patternBestHour, data.patternDeadZones);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text>{gridStr}</Text>
      </Box>
      {callout && (
        <Box marginTop={1}>
          <Text color={theme.chart.sparklineUp}>{callout}</Text>
        </Box>
      )}
    </Box>
  );
}

interface WeekTableProps {
  summaries: Array<{ label: string; totalMinutes: number; sessionCount: number; trend: number; note?: string }>;
  theme: any;
}

function WeekTable({ summaries, theme }: WeekTableProps) {
  const rows = summaries.map((w, i) => {
    const hours = (w.totalMinutes / 60).toFixed(1);
    const trendSymbol = w.trend > 0 ? '\u2191' : w.trend < 0 ? '\u2193' : '\u2192';
    const trendColor = w.trend >= 0 ? theme.chart.sparklineUp : theme.chart.sparklineDown;
    return (
      <Box key={w.label}>
        <Text width={14}>{w.label}</Text>
        <Text width={8}>{hours}h</Text>
        <Text width={10}>{w.sessionCount}</Text>
        <Box width={8}>
          <Text color={trendColor}>
            {w.trend > 0 ? '+' : ''}{w.trend}% {trendSymbol}
          </Text>
        </Box>
        {w.note && <Text dimColor>{w.note}</Text>}
      </Box>
    );
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold width={14} dimColor>Week</Text>
        <Text bold width={8} dimColor>Hours</Text>
        <Text bold width={10} dimColor>Sessions</Text>
        <Text bold width={8} dimColor>Trend</Text>
      </Box>
      {rows}
    </Box>
  );
}

function asciiSparkline(values: number[]): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const chars = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  return values
    .map(v => chars[Math.min(Math.floor((v / max) * (chars.length - 1)), chars.length - 1)])
    .join('');
}
