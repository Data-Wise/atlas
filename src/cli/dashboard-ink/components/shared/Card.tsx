import React from 'react';
import { Box, Text } from 'ink';

interface CardProps {
  project: {
    id: string;
    name: string;
    type: string;
    status: string;
    progress: number;
    focus?: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Project Card Component
 *
 * Displays a single project card with status, progress, and focus information.
 * Equivalent to blessed.box() card rendering in the original dashboard.
 */
export const Card: React.FC<CardProps> = ({ project, isSelected }) => {
  // Map project status to color
  const getStatusColor = (status: string): string => {
    const statusMap: Record<string, string> = {
      active: 'green',
      paused: 'yellow',
      stable: 'cyan',
      complete: 'gray',
    };
    return statusMap[status] || 'white';
  };

  // Create progress bar
  const createProgressBar = (progress: number): string => {
    const width = 20;
    // Clamp progress to 0-100 range for visual display
    const clampedProgress = Math.max(0, Math.min(100, progress));
    const filled = Math.round((clampedProgress / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  };

  const statusColor = getStatusColor(project.status);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isSelected ? 'blue' : 'gray'}
      paddingX={1}
      marginBottom={1}
      width="100%"
    >
      {/* Header: Name and Type */}
      <Box>
        <Text bold color={isSelected ? 'blueBright' : 'white'}>
          {project.name}
        </Text>
        <Text color="gray"> ({project.type})</Text>
      </Box>

      {/* Status and Progress */}
      <Box marginTop={0} flexDirection="row" justifyContent="space-between">
        <Box>
          <Text color="gray">Status: </Text>
          <Text color={statusColor}>{project.status}</Text>
        </Box>
        <Box>
          <Text color="gray">Progress: </Text>
          <Text color="cyan">{project.progress}%</Text>
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box marginTop={0}>
        <Text color="cyan">{createProgressBar(project.progress)}</Text>
      </Box>

      {/* Focus (if present) */}
      {project.focus && (
        <Box marginTop={0}>
          <Text color="gray">Focus: </Text>
          <Text color="yellow">{project.focus}</Text>
        </Box>
      )}
    </Box>
  );
};
