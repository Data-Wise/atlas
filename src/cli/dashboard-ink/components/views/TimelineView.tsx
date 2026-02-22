import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface TimelineViewProps {
  onBack: () => void;
  onQuit: () => void;
  onFocus?: () => void;
}

interface Session {
  startTime: string;
  endTime?: string;
  project: string;
  task?: string;
  duration: number; // minutes
}

/**
 * Timeline View Component
 *
 * Horizontal timeline visualization of today's focus sessions.
 * Features:
 * - Timeline bar showing sessions by time (6 AM - 11 PM)
 * - Session list with details
 * - Today's statistics
 * - Quick access to focus mode
 *
 * Keyboard shortcuts:
 * - Esc/T: Back to main view
 * - r: Refresh
 * - f: Start focus mode
 * - q: Quit
 */
export const TimelineView: React.FC<TimelineViewProps> = ({ onBack, onQuit, onFocus }) => {
  // Mock today's sessions for POC
  const [sessions] = useState<Session[]>([
    {
      startTime: '2025-01-07T08:30:00',
      endTime: '2025-01-07T08:55:00',
      project: 'atlas',
      task: 'Migrate TimelineView to Ink',
      duration: 25
    },
    {
      startTime: '2025-01-07T10:15:00',
      endTime: '2025-01-07T10:40:00',
      project: 'rmediation',
      task: 'Update documentation',
      duration: 25
    },
    {
      startTime: '2025-01-07T14:00:00',
      endTime: '2025-01-07T14:50:00',
      project: 'atlas',
      task: 'Code review and testing',
      duration: 50
    }
  ]);

  // Keyboard navigation
  useInput((input, key) => {
    if (key.escape || input === 'T') {
      onBack();
    } else if (input === 'f' && onFocus) {
      onFocus();
    } else if (input === 'q') {
      onQuit();
    }
  });

  // Calculate statistics
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const avgDuration = sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0;

  // Today's date
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Build simplified timeline bar
  const buildTimeline = () => {
    const width = 60;
    const startHour = 6; // 6 AM
    const endHour = 23; // 11 PM
    const minutesInDay = (endHour - startHour) * 60;
    const charPerMinute = width / minutesInDay;

    let timeline = '';
    let currentMinute = 0;

    // Sort sessions by start time
    const sortedSessions = [...sessions].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (const session of sortedSessions) {
      const start = new Date(session.startTime);
      const end = session.endTime ? new Date(session.endTime) : new Date();

      const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
      const endMinutes = (end.getHours() - startHour) * 60 + end.getMinutes();

      // Skip if outside visible range
      if (endMinutes < 0 || startMinutes > minutesInDay) continue;

      // Gap before this session
      if (startMinutes > currentMinute) {
        const gapChars = Math.max(0, Math.floor((startMinutes - currentMinute) * charPerMinute));
        timeline += '░'.repeat(gapChars);
      }

      // Session block
      const sessionChars = Math.max(1, Math.floor((endMinutes - startMinutes) * charPerMinute));
      timeline += '█'.repeat(sessionChars);

      currentMinute = Math.max(currentMinute, endMinutes);
    }

    // Fill remaining time with gray
    const now = new Date();
    const nowMinutes = (now.getHours() - startHour) * 60 + now.getMinutes();
    if (currentMinute < nowMinutes) {
      const remaining = Math.floor((nowMinutes - currentMinute) * charPerMinute);
      timeline += '░'.repeat(remaining);
    }

    return timeline;
  };

  const timelineBar = buildTimeline();

  // Project color mapping (simplified)
  const getProjectColor = (project: string): string => {
    const colors: Record<string, string> = {
      atlas: 'green',
      rmediation: 'cyan',
      'flow-cli': 'blue',
      'mcp-server-statistical-research': 'magenta',
    };
    return colors[project] || 'white';
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          📅 {dayName}, {dateStr}
        </Text>
        <Text>  |  </Text>
        <Text color="green">{sessions.length} sessions</Text>
        <Text>  |  </Text>
        <Text color="yellow">{totalMinutes} min focused</Text>
      </Box>

      {/* Content area */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {sessions.length === 0 ? (
          <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color="gray">No sessions recorded today.</Text>
            <Box marginTop={1}>
              <Text color="gray">Press </Text>
              <Text color="cyan">f</Text>
              <Text color="gray"> to start a focus session!</Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            {/* Hour labels */}
            <Box marginBottom={1}>
              <Text color="gray">  06  08  10  12  14  16  18  20  22</Text>
            </Box>

            {/* Timeline bar */}
            <Box marginBottom={1}>
              <Text color="green">{timelineBar.substring(0, timelineBar.indexOf('░'))}</Text>
              <Text color="gray">{timelineBar.substring(timelineBar.indexOf('░'))}</Text>
            </Box>

            {/* Session list */}
            <Box marginTop={2} flexDirection="column">
              <Text bold>Sessions:</Text>
              <Box marginTop={1} flexDirection="column">
                {sessions.map((session, idx) => {
                  const start = new Date(session.startTime);
                  const timeStr = start.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const color = getProjectColor(session.project);
                  const task = session.task ? ` - ${session.task.slice(0, 40)}` : '';

                  return (
                    <Box key={idx}>
                      <Text color="gray">{timeStr}  </Text>
                      <Text color={color}>█ </Text>
                      <Text bold>{session.project}</Text>
                      <Text color="gray"> ({session.duration}m){task}</Text>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Summary */}
            <Box marginTop={2} flexDirection="column">
              <Text color="gray">────────────────────────────────────────</Text>
              <Box marginTop={1}>
                <Text color="cyan">Focus blocks: {sessions.length}</Text>
                <Text>  |  </Text>
                <Text color="yellow">Avg: {avgDuration}m</Text>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Command bar */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="cyan">Esc</Text>
        <Text> Back  </Text>
        <Text color="cyan">r</Text>
        <Text> Refresh  </Text>
        <Text color="cyan">f</Text>
        <Text> Focus Mode  </Text>
        <Text color="cyan">q</Text>
        <Text> Quit</Text>
      </Box>
    </Box>
  );
};
