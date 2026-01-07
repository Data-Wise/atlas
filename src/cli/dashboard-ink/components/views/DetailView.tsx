import React from 'react';
import { Box, Text, useInput } from 'ink';

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
  focus?: string;
  path?: string;
  next?: string;
}

interface DetailViewProps {
  project: Project;
  onBack: () => void;
}

/**
 * Detail View Component
 *
 * Shows detailed information about a single project including:
 * - Project metadata (name, type, path, status)
 * - Current session status
 * - Today's progress
 * - Recent breadcrumbs
 * - Recent captures
 */
export const DetailView: React.FC<DetailViewProps> = ({ project, onBack }) => {
  // Keyboard navigation
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
    }
  });

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

  // Get status icon
  const getStatusIcon = (status: string): string => {
    const iconMap: Record<string, string> = {
      active: '●',
      paused: '◐',
      stable: '◆',
      complete: '✓',
    };
    return iconMap[status] || '○';
  };

  // Get type display string
  const getTypeStr = (type: string): string => {
    const typeMap: Record<string, string> = {
      'node-package': 'Node.js Package',
      'r-package': 'R Package',
      'zsh-package': 'ZSH Package',
      'mcp-server': 'MCP Server',
      'teaching': 'Teaching',
      'research': 'Research',
    };
    return typeMap[type] || type;
  };

  // Format path to show last 3 segments
  const formatPath = (path?: string): string => {
    if (!path) return 'N/A';
    return path.split('/').slice(-3).join('/');
  };

  const statusColor = getStatusColor(project.status);
  const statusIcon = getStatusIcon(project.status);

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor="green" paddingX={1}>
        <Text color="gray">← Esc</Text>
        <Text> │ </Text>
        <Text bold>{project.name}</Text>
        <Text> │ </Text>
        <Text color={statusColor}>{statusIcon} {project.status}</Text>
        <Text> │ </Text>
        <Text color="gray">{getTypeStr(project.type)}</Text>
      </Box>

      {/* Main content area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left panel - Project info */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="single"
          borderColor="green"
          paddingX={1}
          marginRight={1}
        >
          <Text bold underline>Project Info</Text>
          <Box marginTop={1} flexDirection="column">
            <Text><Text bold>Name:   </Text>{project.name}</Text>
            <Text><Text bold>Status: </Text><Text color={statusColor}>{statusIcon} {project.status}</Text></Text>
            <Text><Text bold>Type:   </Text>{getTypeStr(project.type)}</Text>
            <Text><Text bold>Path:   </Text><Text color="gray">{formatPath(project.path)}</Text></Text>

            {project.next && (
              <Box marginTop={1}>
                <Text bold color="yellow">Next: </Text>
                <Text color="yellow">{project.next.substring(0, 35)}</Text>
              </Box>
            )}

            {project.focus && (
              <Box marginTop={1}>
                <Text bold color="cyan">Focus: </Text>
                <Text color="cyan">{project.focus.substring(0, 35)}</Text>
              </Box>
            )}
          </Box>

          <Box marginTop={2} flexDirection="column">
            <Text bold underline>Today's Progress</Text>
            <Box marginTop={1} borderStyle="single" paddingX={1}>
              <Text color="gray">Progress: </Text>
              <Text color="cyan">{project.progress}%</Text>
            </Box>
          </Box>

          <Box marginTop={2} flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
            <Text bold>Current Session</Text>
            <Box marginTop={1}>
              <Text color="gray">No active session</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">Press </Text>
              <Text color="cyan">s</Text>
              <Text color="gray"> to start</Text>
            </Box>
          </Box>
        </Box>

        {/* Right panel - Activity */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="single"
          borderColor="blue"
          paddingX={1}
        >
          <Text bold underline>Activity</Text>

          {/* Breadcrumbs section */}
          <Box marginTop={1} flexDirection="column" borderStyle="single" paddingX={1}>
            <Text bold>🍞 Breadcrumbs</Text>
            <Box marginTop={1}>
              <Text color="gray">No breadcrumbs yet</Text>
            </Box>
          </Box>

          {/* Captures section */}
          <Box marginTop={2} flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
            <Text bold>💡 Captures</Text>
            <Box marginTop={1}>
              <Text color="gray">No captures yet</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Command bar */}
      <Box borderStyle="single" paddingX={1}>
        <Text color="yellow">Esc</Text>
        <Text> Back  </Text>
        <Text color="cyan">s</Text>
        <Text> Session  </Text>
        <Text color="cyan">c</Text>
        <Text> Capture  </Text>
        <Text color="cyan">o</Text>
        <Text> Open  </Text>
        <Text color="gray">│ </Text>
        <Text color="yellow">↑↓</Text>
        <Text> Scroll</Text>
      </Box>
    </Box>
  );
};
