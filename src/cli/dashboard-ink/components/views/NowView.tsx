/**
 * NowView — default view. Absorbs MainView + DetailView + InspectorPanel +
 * EcosystemView (SPEC-tui-consolidation-2026-07-19.md).
 *
 * Left:  ProjectList (shared component) — j/k navigate, Enter selects.
 * Right: selected project detail (focus/next + heatmap strip), or, when `e`
 *        is pressed, ecosystem-wide stats aggregated across all projects.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ProjectList } from '../shared/ProjectList.js';
import { HeatmapComponent } from '../shared/HeatmapComponent.js';
import type { Project } from '../../types.js';
import { statusIcon } from '../../constants.js';
import { useTheme } from '../../lib/ThemeContext.js';

interface HeatmapCell {
  date: string;
  value: number;
  level: number;
}

interface NowViewProps {
  projects: Project[];
  onQuit: () => void;
  isActive: boolean;
  pendingCaptures?: number;
  activeProjectId?: string | null;
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  selectedIndex: number;
  onSelectedIndexChange: (idx: number) => void;
  heatmapGrid?: HeatmapCell[][];
  streakDays?: number;
  totalSessions?: number;
  breadcrumbs?: string[];
}

function progressBar(pct: number): { filled: string; empty: string } {
  const W = 16;
  const n = Math.round(Math.max(0, Math.min(100, pct)) / 100 * W);
  return { filled: '█'.repeat(n), empty: '░'.repeat(W - n) };
}

function trunc(s: string, max = 40): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Right pane: single project detail (focus/next + heatmap strip). */
const ProjectDetail: React.FC<{
  project: Project | null;
  heatmapGrid?: HeatmapCell[][];
  streakDays?: number;
  totalSessions?: number;
  breadcrumbs?: string[];
}> = ({ project, heatmapGrid, streakDays, totalSessions, breadcrumbs = [] }) => {
  const theme = useTheme();

  if (!project) {
    return (
      <Box flexGrow={1} paddingX={1} paddingTop={2} justifyContent="center">
        <Text color={theme.text.muted} dimColor>Select a project</Text>
      </Box>
    );
  }

  const bar = progressBar(project.progress);
  const sCol = theme.status[project.status] ?? theme.text.secondary;
  const sIco = statusIcon(project.status);
  const nextItems = project.next
    ? project.next.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
      <Box marginTop={1}>
        <Text bold color={theme.text.primary}>🎯 {trunc(project.name, 30)}</Text>
      </Box>
      <Box>
        <Text color={theme.text.muted} dimColor>{project.type}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={sCol}>{sIco} {project.status}</Text>
        <Text color={theme.text.secondary}>  {project.progress}%  </Text>
        <Text color={theme.chart.progressFilled}>{bar.filled}</Text>
        <Text color={theme.chart.progressEmpty}>{bar.empty}</Text>
      </Box>

      {project.focus && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.text.secondary}>Focus</Text>
          <Text color={theme.text.accent}>{trunc(project.focus, 40)}</Text>
        </Box>
      )}

      {nextItems.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.text.secondary}>Next</Text>
          {nextItems.map((item, i) => (
            <Box key={i}>
              <Text color={theme.text.secondary}>· </Text>
              <Text color={theme.text.primary}>{trunc(item, 36)}</Text>
            </Box>
          ))}
        </Box>
      )}

      {heatmapGrid && heatmapGrid.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <HeatmapComponent
            grid={heatmapGrid}
            weeks={heatmapGrid[0]?.length ?? 13}
            compact={false}
            streakDays={streakDays}
            totalSessions={totalSessions}
          />
        </Box>
      )}

      {breadcrumbs.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.text.secondary}>Recent</Text>
          {breadcrumbs.slice(0, 3).map((crumb, i) => (
            <Box key={i}>
              <Text color={theme.text.secondary}>· </Text>
              <Text color={theme.text.muted} dimColor>{trunc(crumb, 36)}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

/** Right pane: ecosystem-wide aggregate (toggled with `e`). */
const EcosystemStats: React.FC<{
  projects: Project[];
  heatmapGrid?: HeatmapCell[][];
  streakDays?: number;
  totalSessions?: number;
}> = ({ projects, heatmapGrid, streakDays, totalSessions }) => {
  const theme = useTheme();
  const activeCount = projects.filter(p => p.status === 'active').length;
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;

  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
      <Box marginTop={1}>
        <Text bold color={theme.text.primary}>🌐 Ecosystem</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.status.active}>{activeCount}</Text>
        <Text color={theme.text.secondary}> active  │  </Text>
        <Text color={theme.text.accent}>{projects.length}</Text>
        <Text color={theme.text.secondary}> total  │  </Text>
        <Text color={theme.focus.paused}>{avgProgress}%</Text>
        <Text color={theme.text.secondary}> avg progress</Text>
      </Box>

      {heatmapGrid && heatmapGrid.length > 0 && (
        <Box marginTop={1}>
          <HeatmapComponent
            grid={heatmapGrid}
            weeks={heatmapGrid[0]?.length ?? 13}
            compact={true}
            streakDays={streakDays}
            totalSessions={totalSessions}
          />
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        {(['active', 'stable', 'paused', 'draft'] as const).map(status => {
          const group = projects.filter(p => p.status === status);
          if (group.length === 0) return null;
          return (
            <Box key={status} flexDirection="column" marginTop={1}>
              <Text bold color={theme.text.secondary}>{status} ({group.length})</Text>
              {group.slice(0, 5).map(p => (
                <Box key={p.id}>
                  <Text color={theme.text.secondary}>· </Text>
                  <Text color={theme.text.primary}>{trunc(p.name, 24)}</Text>
                  <Text color={theme.text.secondary}>  {p.progress}%</Text>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export const NowView: React.FC<NowViewProps> = ({
  projects,
  onQuit,
  isActive,
  pendingCaptures = 0,
  activeProjectId,
  selectedProject,
  onSelectProject,
  selectedIndex,
  onSelectedIndexChange,
  heatmapGrid,
  streakDays,
  totalSessions,
  breadcrumbs,
}) => {
  const theme = useTheme();
  const [ecosystemMode, setEcosystemMode] = useState(false);

  useInput((input) => {
    if (!isActive) return;
    if (input === 'q') {
      onQuit();
    } else if (input === 'e') {
      setEcosystemMode(m => !m);
    }
  });

  return (
    <Box flexDirection="row" width="100%" height="100%">
      <Box width="35%" height="100%">
        <ProjectList
          projects={projects}
          selectedIndex={selectedIndex}
          onSelect={onSelectedIndexChange}
          onSelectProject={onSelectProject}
          isActive={isActive}
          pendingCaptures={pendingCaptures}
          activeProjectId={activeProjectId ?? undefined}
        />
      </Box>

      <Box width="65%" height="100%" flexDirection="column">
        <Box paddingX={1} borderStyle="single" borderColor={isActive ? theme.panel.borderActive : theme.panel.borderInactive}>
          <Text bold color={isActive ? theme.panel.headerActive : theme.panel.headerInactive}>
            {ecosystemMode ? 'Ecosystem' : 'Detail'}
          </Text>
        </Box>

        {ecosystemMode ? (
          <EcosystemStats
            projects={projects}
            heatmapGrid={heatmapGrid}
            streakDays={streakDays}
            totalSessions={totalSessions}
          />
        ) : (
          <ProjectDetail
            project={selectedProject}
            heatmapGrid={heatmapGrid}
            streakDays={streakDays}
            totalSessions={totalSessions}
            breadcrumbs={breadcrumbs}
          />
        )}

        <Box paddingX={1} borderStyle="single" borderColor={theme.panel.borderInactive}>
          <Text color={theme.text.muted} dimColor>e: toggle ecosystem  q: quit  ?: help</Text>
        </Box>
      </Box>
    </Box>
  );
};
