import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Card } from '../shared/Card.js';
import type { Project } from '../../types.js';

interface MainViewProps {
  projects: Project[];
  onQuit: () => void;
  onSelectProject?: (project: Project) => void;
  onFocus?: () => void;
  onZen?: () => void;
  onTimeline?: () => void;
  onEcosystem?: () => void;
  onPlan?: () => void;
}

/**
 * MainView Component
 *
 * Displays the main dashboard with a card stack of projects.
 * Replicates the functionality of the blessed MainView.
 *
 * Keyboard shortcuts:
 * - j/k or ↓/↑: Navigate cards
 * - Enter: Select project (detail view - not implemented in POC)
 * - q: Quit
 */
export const MainView: React.FC<MainViewProps> = ({ projects, onQuit, onSelectProject, onFocus, onZen, onTimeline, onEcosystem, onPlan }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard navigation
  useInput((input, key) => {
    if (input === 'q') {
      onQuit();
    } else if (input === 'j' || key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, projects.length - 1));
    } else if (input === 'k' || key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (key.return && onSelectProject) {
      // Show detail view for selected project
      const selectedProject = projects[selectedIndex];
      if (selectedProject) {
        onSelectProject(selectedProject);
      }
    } else if (input === 'f' && onFocus) {
      // Enter focus mode
      onFocus();
    } else if (input === 'z' && onZen) {
      // Enter zen mode
      onZen();
    } else if (input === 'T' && onTimeline) {
      // Enter timeline view (Shift+t)
      onTimeline();
    } else if (input === 'e' && onEcosystem) {
      // Enter ecosystem view
      onEcosystem();
    } else if (input === 'p' && onPlan) {
      // Enter plan view (morning ritual)
      onPlan();
    }
  });

  // Auto-scroll to keep selected card visible (simple implementation)
  const visibleProjects = projects.slice(
    Math.max(0, selectedIndex - 2),
    Math.min(projects.length, selectedIndex + 3)
  );

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          Atlas Dashboard (Ink POC)
        </Text>
        <Text color="gray"> - {projects.length} projects</Text>
      </Box>

      {/* Card Stack */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleProjects.map((project, index) => {
          const actualIndex = projects.indexOf(project);
          return (
            <Card
              key={project.id}
              project={project}
              isSelected={actualIndex === selectedIndex}
              onSelect={() => setSelectedIndex(actualIndex)}
            />
          );
        })}
      </Box>

      {/* Command Bar */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginTop={1}
      >
        <Text color="gray">
          j/k: Nav • Enter: Select • f: Focus • z: Zen • T: Timeline • e: Eco • p: Plan • q: Quit
        </Text>
        <Text color="cyan"> [{selectedIndex + 1}/{projects.length}]</Text>
      </Box>
    </Box>
  );
};
