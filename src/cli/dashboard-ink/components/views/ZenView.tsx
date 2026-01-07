import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface ZenViewProps {
  project?: string;
  task?: string;
  onBack: () => void;
}

/**
 * Zen View Component
 *
 * Ultra-minimal distraction-free Pomodoro timer.
 * Features:
 * - No borders or visual clutter
 * - Large centered timer
 * - Black background
 * - Session/project name
 * - Progress bar
 * - Streak tracking
 * - Today's stats
 *
 * Keyboard shortcuts:
 * - Esc: Exit zen mode (expand)
 * - Space: Pause/resume
 * - r: Reset timer
 * - c: Quick capture
 * - q: Quit
 * - +/-: Adjust time (when paused)
 */
export const ZenView: React.FC<ZenViewProps> = ({ project, task, onBack }) => {
  // Timer state (simplified for POC - full implementation would have actual timer)
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(25); // minutes
  const [elapsed, setElapsed] = useState(0); // seconds
  const [streakDays, setStreakDays] = useState(7); // mock data
  const [todayCount, setTodayCount] = useState(2); // mock data

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
    ? '☕ BREAK'
    : isPaused
      ? '◑ PAUSED'
      : '● FOCUS';
  const statusColor = isBreakTime ? 'yellow' : isPaused ? 'yellow' : 'green';

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Main content - centered, no borders */}
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
      >
        <Box flexDirection="column" width={60}>
          {/* Project name */}
          <Box justifyContent="center" marginBottom={2}>
            {project ? (
              <Text bold color="white">{project}</Text>
            ) : (
              <Text color="white">No session</Text>
            )}
          </Box>

          {/* Status */}
          <Box justifyContent="center" marginBottom={2}>
            <Text bold color={statusColor}>{statusIcon}</Text>
          </Box>

          {/* Timer */}
          <Box justifyContent="center" marginBottom={2}>
            <Text bold color="white">{timeStr}</Text>
          </Box>

          {/* Progress bar */}
          <Box justifyContent="center" marginBottom={2}>
            <Text color="green">{progressBar.substring(0, filled)}</Text>
            <Text color="gray">{progressBar.substring(filled)}</Text>
          </Box>

          {/* Streak and today's stats */}
          <Box justifyContent="center">
            <Text color="cyan">Day {streakDays || 1}</Text>
            <Text color="gray">  |  </Text>
            <Text color="cyan">{todayCount} 🍅 today</Text>
          </Box>
        </Box>
      </Box>

      {/* Minimal command bar */}
      <Box paddingX={1}>
        <Text color="cyan">Space</Text>
        <Text color="gray"> {isPaused ? 'Resume' : 'Pause'}  </Text>
        <Text color="cyan">c</Text>
        <Text color="gray"> Capture  </Text>
        <Text color="cyan">Esc</Text>
        <Text color="gray"> Expand  </Text>
        <Text color="cyan">q</Text>
        <Text color="gray"> Quit</Text>
      </Box>
    </Box>
  );
};
