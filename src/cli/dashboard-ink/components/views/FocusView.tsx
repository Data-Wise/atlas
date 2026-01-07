import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface FocusViewProps {
  project?: string;
  task?: string;
  onBack: () => void;
}

/**
 * Focus View Component
 *
 * Minimal, distraction-free Pomodoro timer view.
 * Features:
 * - Large centered timer display
 * - Session/project name
 * - Task being worked on
 * - Progress bar
 * - Pause/resume functionality
 * - Today's stats
 *
 * Keyboard shortcuts:
 * - Esc/q: Exit focus mode
 * - Space: Pause/resume
 * - r: Reset timer
 * - c: Quick capture
 * - +/-: Adjust time (when paused)
 */
export const FocusView: React.FC<FocusViewProps> = ({ project, task, onBack }) => {
  // Timer state (simplified for POC - full implementation would have actual timer)
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(25); // minutes
  const [elapsed, setElapsed] = useState(0); // seconds
  const [todayCount, setTodayCount] = useState(2); // mock data
  const [todayMinutes, setTodayMinutes] = useState(50); // mock data

  // Keyboard shortcuts
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
    } else if (input === ' ') {
      setIsPaused(!isPaused);
    } else if (input === 'r' && isPaused) {
      setElapsed(0);
    } else if (input === '+' || input === '=') {
      if (isPaused && duration < 60) {
        setDuration(duration + 5);
      }
    } else if (input === '-' || input === '_') {
      if (isPaused && duration > 5) {
        setDuration(duration - 5);
      }
    }
  });

  // Timer logic (mock - increments elapsed time)
  useEffect(() => {
    if (!isPaused && elapsed < duration * 60) {
      const interval = setInterval(() => {
        setElapsed(prev => Math.min(prev + 1, duration * 60));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused, elapsed, duration]);

  // Calculate remaining time
  const remaining = Math.max(0, (duration * 60) - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Progress bar
  const progress = duration > 0 ? Math.min(100, (elapsed / (duration * 60)) * 100) : 0;
  const barWidth = 30;
  const filled = Math.round((progress / 100) * barWidth);
  const progressBar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  // Status
  const isBreakTime = remaining === 0;
  const statusIcon = isBreakTime
    ? '☕ BREAK TIME'
    : isPaused
      ? '◑ PAUSED'
      : '● FOCUSING';
  const statusColor = isBreakTime ? 'yellow' : isPaused ? 'yellow' : 'green';

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Main content - centered large timer */}
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
      >
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="green"
          padding={2}
          width={52}
        >
          {/* Session info */}
          {project ? (
            <Box justifyContent="center" marginBottom={1}>
              <Text color="green">● </Text>
              <Text bold>{project}</Text>
            </Box>
          ) : (
            <Box justifyContent="center" marginBottom={1}>
              <Text color="gray">No active session</Text>
            </Box>
          )}

          {/* Task */}
          {task && (
            <Box justifyContent="center" marginBottom={1}>
              <Text color="cyan">🎯 </Text>
              <Text color="cyan">{task.substring(0, 35)}</Text>
            </Box>
          )}

          {/* Status */}
          <Box justifyContent="center" marginTop={1} marginBottom={1}>
            <Text bold color={statusColor}>{statusIcon}</Text>
          </Box>

          {/* Timer */}
          <Box justifyContent="center" marginBottom={1}>
            <Text bold color="white" fontSize={24}>{timeStr}</Text>
          </Box>

          {/* Progress bar */}
          <Box justifyContent="center" marginBottom={1}>
            <Text color="green">{progressBar.substring(0, filled)}</Text>
            <Text color="gray">{progressBar.substring(filled)}</Text>
          </Box>

          {/* Duration */}
          <Box justifyContent="center" marginBottom={1}>
            <Text color="gray">{duration} min session</Text>
          </Box>

          {/* Today's stats */}
          <Box justifyContent="center">
            {todayCount > 0 ? (
              <Text color="cyan">Today: {todayCount} 🍅 ({todayMinutes}m)</Text>
            ) : (
              <Text color="gray">Start your first Pomodoro!</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Command bar */}
      <Box paddingX={1}>
        <Text color="cyan">Esc</Text>
        <Text color="gray"> Exit Focus  </Text>
        <Text color="cyan">Space</Text>
        <Text color="gray"> {isPaused ? 'Resume' : 'Pause'}  </Text>
        <Text color="cyan">r</Text>
        <Text color="gray"> Reset  </Text>
        <Text color="cyan">c</Text>
        <Text color="gray"> Capture  </Text>
        <Text color="cyan">+/-</Text>
        <Text color="gray"> Adjust Time</Text>
      </Box>
    </Box>
  );
};
