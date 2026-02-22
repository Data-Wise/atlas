import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Project } from '../../types.js';
import { useTheme } from '../../lib/ThemeContext.js';
import { HeatmapComponent } from '../shared/HeatmapComponent.js';
import { formatHeatmapGrid } from '../../../../adapters/presenters/StatsPresenter.js';

interface HeatmapCell {
  date: string;
  value: number;
  level: number;
}

interface EcosystemViewProps {
  onBack: () => void;
  onQuit: () => void;
  onSelectProject?: (project: Project) => void;
  onFocus?: () => void;
  /** Pre-computed heatmap grid for global activity */
  heatmapGrid?: HeatmapCell[][];
  /** Streak days for heatmap summary */
  streakDays?: number;
  /** Total sessions for heatmap summary */
  totalSessions?: number;
}

/**
 * Ecosystem View Component
 *
 * Multi-project overview across the development ecosystem.
 * Features:
 * - Projects grouped by status (Active, Stable, Paused, Draft)
 * - Summary statistics
 * - Priority indicators
 * - Progress bars
 * - Scrollable project list
 *
 * Keyboard shortcuts:
 * - ↑↓/j/k: Navigate projects
 * - Enter: View project details
 * - f: Start focus mode
 * - Esc/e: Back to main view
 * - q: Quit
 */
export const EcosystemView: React.FC<EcosystemViewProps> = ({ onBack, onQuit, onSelectProject, onFocus, heatmapGrid, streakDays, totalSessions }) => {
  const theme = useTheme();
  // Mock ecosystem projects for POC
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'atlas',
      type: 'node-package',
      status: 'active',
      progress: 100,
      priority: 1,
      focus: 'v0.9.0 Sprint 1 - TUI Modernization',
    },
    {
      id: '2',
      name: 'flow-cli',
      type: 'zsh-package',
      status: 'stable',
      progress: 95,
      priority: 3,
      focus: 'Maintenance mode',
    },
    {
      id: '3',
      name: 'mcp-server-statistical-research',
      type: 'mcp-server',
      status: 'active',
      progress: 80,
      priority: 2,
      focus: 'Add Zotero integration',
    },
    {
      id: '4',
      name: 'rmediation',
      type: 'r-package',
      status: 'paused',
      progress: 60,
      priority: 3,
      next: 'CRAN submission prep',
    },
    {
      id: '5',
      name: 'causal-inference',
      type: 'teaching',
      status: 'active',
      progress: 45,
      priority: 1,
      focus: 'Week 3 lecture materials',
    },
    {
      id: '6',
      name: 'examify',
      type: 'app',
      status: 'draft',
      progress: 30,
      priority: 3,
      next: 'Complete quiz engine',
    },
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard navigation
  useInput((input, key) => {
    if (key.escape || input === 'e') {
      onBack();
    } else if (input === 'j' || key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, projects.length - 1));
    } else if (input === 'k' || key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (key.return && onSelectProject) {
      const selectedProject = projects[selectedIndex];
      if (selectedProject) {
        onSelectProject(selectedProject);
      }
    } else if (input === 'f' && onFocus) {
      onFocus();
    } else if (input === 'q') {
      onQuit();
    }
  });

  // Status icons
  const STATUS_ICONS: Record<string, string> = {
    active: '🟢',
    stable: '✅',
    released: '🚀',
    paused: '⏸️',
    draft: '📝',
    archived: '📦',
    unknown: '❓',
  };

  // Priority colors (never use red — ADHD principle)
  const getPriorityColor = (priority: number): string => {
    const colors: Record<number, string> = { 1: theme.focus.paused, 2: theme.text.accent, 3: theme.text.secondary };
    return colors[priority] || theme.text.primary;
  };

  // Calculate statistics
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const totalProgress = projects.reduce((sum, p) => sum + p.progress, 0);
  const avgProgress = projects.length > 0 ? Math.round(totalProgress / projects.length) : 0;

  // Group projects by status
  const grouped = {
    active: projects.filter((p) => p.status === 'active'),
    stable: projects.filter((p) => ['stable', 'released'].includes(p.status)),
    paused: projects.filter((p) => p.status === 'paused'),
    draft: projects.filter((p) => p.status === 'draft'),
  };

  // Build flat list for navigation
  const flatProjects: Array<{ title?: string; project?: Project; globalIndex: number }> = [];
  let globalIndex = 0;

  const addGroup = (title: string, groupProjects: Project[]) => {
    if (groupProjects.length === 0) return;
    flatProjects.push({ title, globalIndex: -1 });
    groupProjects.forEach((project) => {
      flatProjects.push({ project, globalIndex: globalIndex++ });
    });
  };

  addGroup('🔥 Active Projects', grouped.active);
  addGroup('✅ Stable/Released', grouped.stable);
  addGroup('⏸️ Paused', grouped.paused);
  addGroup('📝 Draft', grouped.draft);

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box paddingX={1}>
        <Text bold>ECOSYSTEM</Text>
        <Text color="gray"> ────────────────────────────────────────────────</Text>
      </Box>

      {/* Stats bar */}
      <Box paddingX={1}>
        <Text color={theme.status.active}>{activeCount}</Text>
        <Text> Active  │  </Text>
        <Text color={theme.text.accent}>{projects.length}</Text>
        <Text> Total  │  </Text>
        <Text color={theme.focus.paused}>{avgProgress}%</Text>
        <Text> Avg Progress</Text>
      </Box>

      {/* Global activity heatmap (compact 4-day mode) */}
      {heatmapGrid && heatmapGrid.length > 0 && (
        <Box paddingX={1} marginTop={1}>
          <HeatmapComponent
            grid={heatmapGrid}
            weeks={heatmapGrid[0]?.length ?? 13}
            compact={true}
            streakDays={streakDays}
            totalSessions={totalSessions}
          />
        </Box>
      )}

      {/* Project list */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingTop={1}>
        {flatProjects.map((item, idx) => {
          if (item.title) {
            // Group header
            return (
              <Box key={idx} marginTop={idx > 0 ? 1 : 0}>
                <Text bold color="white">
                  {item.title}
                </Text>
              </Box>
            );
          } else if (item.project) {
            // Project item
            const project = item.project;
            const isSelected = item.globalIndex === selectedIndex;
            const statusIcon = STATUS_ICONS[project.status] || STATUS_ICONS.unknown;
            const priorityColor = getPriorityColor(project.priority ?? 3);

            // Progress bar
            const barWidth = 12;
            const filled = Math.round((project.progress / 100) * barWidth);
            const empty = barWidth - filled;
            const color =
              project.progress >= 75 ? theme.chart.progressFilled : project.progress >= 50 ? theme.focus.paused : theme.text.accent;
            const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

            return (
              <Box key={idx} flexDirection="column">
                <Box>
                  <Text>{isSelected ? '► ' : '   '}</Text>
                  <Text>{statusIcon} </Text>
                  <Text bold>{project.name.padEnd(20).slice(0, 20)}</Text>
                  <Text> </Text>
                  <Text color={color}>{progressBar.substring(0, filled)}</Text>
                  <Text color={theme.chart.progressEmpty}>{progressBar.substring(filled)}</Text>
                  <Text> </Text>
                  <Text color={priorityColor}>P{project.priority ?? 3}</Text>
                  <Text> </Text>
                  <Text color={theme.text.muted}>{(project.type || '').slice(0, 12).padEnd(12)}</Text>
                </Box>

                {/* Show focus/next for selected project */}
                {isSelected && (project.focus || project.next) && (
                  <Box marginLeft={5}>
                    <Text color={theme.text.accent}>
                      → {(project.focus || project.next || '').slice(0, 50)}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          }
          return null;
        })}
      </Box>

      {/* Command bar */}
      <Box borderStyle="single" borderColor={theme.panel.borderInactive} paddingX={1}>
        <Text color={theme.text.accent}>↑↓</Text>
        <Text> Navigate  </Text>
        <Text color={theme.text.accent}>Enter</Text>
        <Text> View  </Text>
        <Text color={theme.text.accent}>f</Text>
        <Text> Focus  </Text>
        <Text color={theme.text.accent}>Esc</Text>
        <Text> Back  </Text>
        <Text color={theme.text.accent}>q</Text>
        <Text> Quit</Text>
      </Box>
    </Box>
  );
};
