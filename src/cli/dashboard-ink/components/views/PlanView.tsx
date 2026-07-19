/**
 * PlanView — morning ritual. Absorbs the old PlanView + AnalyticsView
 * (SPEC-tui-consolidation-2026-07-19.md). `a` toggles the analytics pane
 * (focus velocity + flow patterns for the currently-selected project) in
 * place of the suggestions list.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAnalytics } from '../../hooks/useAnalytics.js';
import { useProjectStats } from '../../hooks/useProjectStats.js';
import { useTheme } from '../../lib/ThemeContext.js';
import { formatPatternGrid, formatPatternCallout } from '../../../../adapters/presenters/PatternPresenter.js';
import type { Project, AnalyticsData } from '../../types.js';

interface Suggestion {
  type: string;
  message: string;
  action?: string;
}

interface PlanViewProps {
  onBack: () => void;
  onQuit: () => void;
  onStartSession?: () => void;
  isActive?: boolean;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
}

function asciiSparkline(values: number[]): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  return values
    .map(v => chars[Math.min(Math.floor((v / max) * (chars.length - 1)), chars.length - 1)])
    .join('');
}

const AnalyticsPane: React.FC<{
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  isActive: boolean;
}> = ({ projects, selectedProjectId, onSelectProject, isActive }) => {
  const theme = useTheme();
  const currentIdx = projects.findIndex(p => p.id === selectedProjectId);
  const project = projects[currentIdx] ?? null;
  const projectId = project?.id ?? null;

  const { data, velocityLoading, patternLoading, velocityError, patternError } = useAnalytics(projectId);
  const { focusScore, totalSessions } = useProjectStats(projectId);

  useInput((_input, key) => {
    if (!isActive) return;
    if (key.leftArrow && projects.length > 1) {
      onSelectProject(projects[(currentIdx - 1 + projects.length) % projects.length].id);
    } else if (key.rightArrow && projects.length > 1) {
      onSelectProject(projects[(currentIdx + 1) % projects.length].id);
    }
  });

  if (!project) {
    return (
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        <Text dimColor>No project selected.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} marginTop={1}>
      <Box>
        <Text bold color={theme.text.accent}>◉ {project.name}</Text>
        <Box marginLeft={2}>
          <Text dimColor>{!velocityLoading || !patternLoading ? 'updated now' : 'loading…'}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text>● Focus Score: </Text>
        <Text bold color={focusScore >= 70 ? theme.chart.sparklineUp : theme.chart.sparklineDown}>{focusScore}</Text>
        <Box marginLeft={2}><Text dimColor>○ Total: {totalSessions} sessions</Text></Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.text.accent}>Focus Velocity</Text>
        {velocityError ? (
          <Text color={theme.chart.sparklineDown}>⚠ Could not load velocity data</Text>
        ) : velocityLoading && !data ? (
          <Text dimColor>▋ Loading velocity data…</Text>
        ) : !data || data.velocitySparkline.length === 0 ? (
          <Text dimColor>No session data yet.</Text>
        ) : (
          <Box flexDirection="column">
            <Text>{asciiSparkline(data.velocitySparkline)}</Text>
            <Text dimColor>30-day: </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.text.accent}>Flow Patterns</Text>
        {patternError ? (
          <Text color={theme.chart.sparklineDown}>⚠ Could not load pattern data</Text>
        ) : patternLoading && !data ? (
          <Text dimColor>▋ Loading pattern data…</Text>
        ) : !data || !data.patternGrid || data.patternGrid.length < 7 ? (
          <Text dimColor>Not enough session data for pattern analysis (need 90 days).</Text>
        ) : (
          <Box flexDirection="column">
            <Text>{formatPatternGrid(data.patternGrid)}</Text>
            {formatPatternCallout(data.patternBestDay, data.patternBestHour, data.patternDeadZones) && (
              <Text color={theme.chart.sparklineUp}>
                {formatPatternCallout(data.patternBestDay, data.patternBestHour, data.patternDeadZones)}
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export const PlanView: React.FC<PlanViewProps> = ({
  onBack,
  onQuit,
  onStartSession,
  isActive = true,
  projects,
  selectedProjectId,
  onSelectProject,
}) => {
  // Mock plan data — morning-ritual suggestions (parity with pre-consolidation PlanView)
  const [suggestions] = useState<Suggestion[]>([
    { type: 'unpark', message: 'Resume: atlas v0.9.0 TUI Modernization', action: 'Start session with parked context' },
    { type: 'triage', message: 'Triage 3 inbox captures', action: 'Review and organize captured ideas' },
    { type: 'focus', message: 'Continue: Migrate remaining views to Ink', action: 'Pick up where you left off' },
    { type: 'streak', message: 'Maintain your 7-day streak!', action: 'Log at least 25 minutes today' },
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const yesterday = { hasSessions: true, sessionCount: 3, hours: 2, minutes: 30, completionRate: 85, lastProject: 'atlas' };
  const streak = { current: 7, longest: 12, display: '🔥🔥🔥🔥🔥🔥🔥', message: 'Keep the momentum!' };
  const stats = { inbox: 3, parked: 1, active: 3 };

  useInput((input, key) => {
    if (!isActive) return;
    if (key.escape || input === 'p') {
      onBack();
    } else if (input === 'a') {
      setShowAnalytics(s => !s);
    } else if (showAnalytics) {
      // Analytics pane owns j/k/left/right while visible
      return;
    } else if (input === 'j' || key.downArrow) {
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (input === 'k' || key.upArrow) {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (input === 'e') {
      const levels = [null, 'high', 'medium', 'low'];
      const currentIndex = levels.indexOf(energyLevel);
      setEnergyLevel(levels[(currentIndex + 1) % levels.length]);
    } else if (input === 's' && onStartSession) {
      onStartSession();
    } else if (input === 'q') {
      onQuit();
    }
  });

  const SUGGESTION_ICONS: Record<string, string> = {
    unpark: '⏸️', triage: '📥', focus: '🎯', continue: '▶️', streak: '🔥',
  };

  const energyStr = energyLevel ? `Energy: ${energyLevel}` : 'Energy: not set';
  const energyColor = energyLevel === 'high' ? 'green' : energyLevel === 'medium' ? 'yellow' : energyLevel === 'low' ? 'red' : 'gray';

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box paddingX={1}>
        <Text bold>{greeting}</Text>
        <Text>  ─────────────────────────  </Text>
        <Text color={energyColor}>{energyStr}</Text>
      </Box>

      <Box flexDirection="row" marginTop={1} paddingX={1}>
        <Box width="50%" borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1} marginRight={1}>
          <Text bold>📅 Yesterday</Text>
          {yesterday.hasSessions ? (
            <Box flexDirection="column" marginTop={1}>
              <Text color="white">{yesterday.sessionCount} sessions</Text>
              <Text color="cyan">{yesterday.hours}h {yesterday.minutes}m total</Text>
              <Text color="green">{yesterday.completionRate}% completed</Text>
              <Text>Last: <Text color="yellow">{yesterday.lastProject}</Text></Text>
            </Box>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">No sessions yesterday</Text>
              <Text color="yellow">Fresh start today!</Text>
            </Box>
          )}
        </Box>

        <Box width="50%" borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1}>
          <Text bold>🔥 Streak</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>Current: <Text bold color="green">{streak.current} days</Text></Text>
            <Text>Longest: <Text color="cyan">{streak.longest} days</Text></Text>
            <Text>{streak.display}</Text>
            <Text color="gray">{streak.message}</Text>
          </Box>
        </Box>
      </Box>

      <Box borderStyle="single" borderColor="cyan" flexDirection="column" flexGrow={1} marginTop={1} paddingX={1} marginX={1}>
        <Text bold>{showAnalytics ? '📊 Analytics' : '💡 Suggestions'}</Text>

        {showAnalytics ? (
          <AnalyticsPane
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={onSelectProject}
            isActive={isActive}
          />
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {suggestions.length === 0 ? (
              <Text color="gray">No suggestions - start fresh!</Text>
            ) : (
              suggestions.map((s, i) => {
                const isSelected = i === selectedIndex;
                const icon = SUGGESTION_ICONS[s.type] || '💡';
                return (
                  <Box key={i} flexDirection="column" marginBottom={1}>
                    <Box>
                      <Text>{isSelected ? '► ' : '   '}</Text>
                      <Text>{icon} </Text>
                      <Text color="white">{s.message}</Text>
                    </Box>
                    {s.action && isSelected && (
                      <Box marginLeft={5}>
                        <Text color="cyan">→ {s.action}</Text>
                      </Box>
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </Box>

      <Box paddingX={1}>
        <Text color="cyan">📥 {stats.inbox} inbox</Text>
        <Text>  │  </Text>
        <Text color="yellow">⏸️ {stats.parked} parked</Text>
        <Text>  │  </Text>
        <Text color="green">🟢 {stats.active} active</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="cyan">↑↓</Text>
        <Text> Navigate  </Text>
        <Text color="cyan">Enter</Text>
        <Text> Execute  </Text>
        <Text color="cyan">e</Text>
        <Text> Energy  </Text>
        <Text color="cyan">a</Text>
        <Text> Analytics  </Text>
        <Text color="cyan">s</Text>
        <Text> Start Session  </Text>
        <Text color="cyan">Esc</Text>
        <Text> Back</Text>
      </Box>
    </Box>
  );
};
