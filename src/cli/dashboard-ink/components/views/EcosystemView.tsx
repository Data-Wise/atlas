import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface EcosystemProject {
  name: string;
  type: string;
  status: string;
  progress: number;
  priority: number;
  focus?: string;
  next?: string;
}

interface EcosystemViewProps {
  onBack: () => void;
  onSelectProject?: (project: any) => void;
  onFocus?: () => void;
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
export const EcosystemView: React.FC<EcosystemViewProps> = ({ onBack, onSelectProject, onFocus }) => {
  // Mock ecosystem projects for POC
  const [projects] = useState<EcosystemProject[]>([
    {
      name: 'atlas',
      type: 'node-package',
      status: 'active',
      progress: 100,
      priority: 1,
      focus: 'v0.9.0 Sprint 1 - TUI Modernization',
    },
    {
      name: 'flow-cli',
      type: 'zsh-package',
      status: 'stable',
      progress: 95,
      priority: 3,
      focus: 'Maintenance mode',
    },
    {
      name: 'mcp-server-statistical-research',
      type: 'mcp-server',
      status: 'active',
      progress: 80,
      priority: 2,
      focus: 'Add Zotero integration',
    },
    {
      name: 'rmediation',
      type: 'r-package',
      status: 'paused',
      progress: 60,
      priority: 3,
      next: 'CRAN submission prep',
    },
    {
      name: 'causal-inference',
      type: 'teaching',
      status: 'active',
      progress: 45,
      priority: 1,
      focus: 'Week 3 lecture materials',
    },
    {
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
        // Convert to full project format for compatibility
        onSelectProject({
          id: selectedIndex.toString(),
          name: selectedProject.name,
          type: selectedProject.type,
          status: selectedProject.status,
          progress: selectedProject.progress,
          focus: selectedProject.focus,
          next: selectedProject.next,
        });
      }
    } else if (input === 'f' && onFocus) {
      onFocus();
    } else if (input === 'q') {
      process.exit(0);
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

  // Priority colors
  const getPriorityColor = (priority: number): string => {
    const colors: Record<number, string> = { 1: 'red', 2: 'yellow', 3: 'cyan' };
    return colors[priority] || 'white';
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
  const flatProjects: Array<{ title?: string; project?: EcosystemProject; globalIndex: number }> = [];
  let globalIndex = 0;

  const addGroup = (title: string, groupProjects: EcosystemProject[]) => {
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
        <Text color="green">{activeCount}</Text>
        <Text> Active  │  </Text>
        <Text color="cyan">{projects.length}</Text>
        <Text> Total  │  </Text>
        <Text color="yellow">{avgProgress}%</Text>
        <Text> Avg Progress</Text>
      </Box>

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
            const priorityColor = getPriorityColor(project.priority);

            // Progress bar
            const barWidth = 12;
            const filled = Math.round((project.progress / 100) * barWidth);
            const empty = barWidth - filled;
            const color =
              project.progress >= 75 ? 'green' : project.progress >= 50 ? 'yellow' : 'cyan';
            const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

            return (
              <Box key={idx} flexDirection="column">
                <Box>
                  <Text>{isSelected ? '► ' : '   '}</Text>
                  <Text>{statusIcon} </Text>
                  <Text bold>{project.name.padEnd(20).slice(0, 20)}</Text>
                  <Text> </Text>
                  <Text color={color}>{progressBar.substring(0, filled)}</Text>
                  <Text color="gray">{progressBar.substring(filled)}</Text>
                  <Text> </Text>
                  <Text color={priorityColor}>P{project.priority}</Text>
                  <Text> </Text>
                  <Text color="gray">{(project.type || '').slice(0, 12).padEnd(12)}</Text>
                </Box>

                {/* Show focus/next for selected project */}
                {isSelected && (project.focus || project.next) && (
                  <Box marginLeft={5}>
                    <Text color="cyan">
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
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="cyan">↑↓</Text>
        <Text> Navigate  </Text>
        <Text color="cyan">Enter</Text>
        <Text> View  </Text>
        <Text color="cyan">f</Text>
        <Text> Focus  </Text>
        <Text color="cyan">Esc</Text>
        <Text> Back  </Text>
        <Text color="cyan">q</Text>
        <Text> Quit</Text>
      </Box>
    </Box>
  );
};
