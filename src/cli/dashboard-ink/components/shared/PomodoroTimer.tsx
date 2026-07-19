import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

export interface PomodoroTimerProps {
  /** Selected project name, if any */
  project?: string;
  /** Current focus/task text */
  task?: string;
  /** Exit callback (Esc/q) */
  onBack: () => void;
  /** Whether this component currently holds keyboard focus */
  isActive?: boolean;
  /** Zen density toggle — true renders the minimal, borderless chrome */
  dense?: boolean;
  /** Pomodoro length in minutes */
  pomodoroLength?: number;
  /** Streak days shown in dense mode */
  streakDays?: number;
  /** Sessions completed today */
  todayCount?: number;
  /** Minutes logged today */
  todayMinutes?: number;
}

/**
 * PomodoroTimer — the single Pomodoro timer implementation for the
 * dashboard (SPEC-tui-consolidation-2026-07-19.md). Replaces the three
 * duplicate timers previously in FocusView, ZenView, and InspectorPanel.
 *
 * `dense=false` renders the bordered, full-detail chrome (former FocusView).
 * `dense=true` renders the minimal, borderless chrome (former ZenView).
 * The `z` key (handled by the parent TimerView) toggles between the two —
 * this component only renders whichever mode it's given via props.
 */
export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  project,
  task,
  onBack,
  isActive = true,
  dense = false,
  pomodoroLength = 25,
  streakDays = 0,
  todayCount = 0,
  todayMinutes = 0,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(pomodoroLength);
  const [elapsed, setElapsed] = useState(0);

  useInput((input, key) => {
    if (!isActive) return;
    if (key.escape || input === 'q') {
      onBack();
    } else if (input === ' ') {
      setIsPaused(p => !p);
    } else if (input === 'r' && isPaused) {
      setElapsed(0);
    } else if ((input === '+' || input === '=') && isPaused && duration < 60) {
      setDuration(d => d + 5);
    } else if ((input === '-' || input === '_') && isPaused && duration > 5) {
      setDuration(d => d - 5);
    }
  });

  useEffect(() => {
    if (isPaused || elapsed >= duration * 60) return;
    const interval = setInterval(() => {
      setElapsed(prev => Math.min(prev + 1, duration * 60));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, elapsed, duration]);

  const remaining = Math.max(0, duration * 60 - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progress = duration > 0 ? Math.min(100, (elapsed / (duration * 60)) * 100) : 0;
  const barWidth = dense ? 30 : 30;
  const filled = Math.round((progress / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  const isBreakTime = remaining === 0;
  // Full chrome uses the FocusView-era labels; dense chrome uses the
  // shorter ZenView-era labels. Both read from the same isBreakTime/isPaused
  // state — this is the single Pomodoro state-label mapping.
  const statusLabel = isBreakTime
    ? (dense ? '☕ BREAK' : '☕ BREAK TIME')
    : isPaused
      ? '◑ PAUSED'
      : (dense ? '● FOCUS' : '● FOCUSING');
  const statusColor = isBreakTime ? 'yellow' : isPaused ? 'yellow' : 'green';

  if (dense) {
    // Minimal, borderless chrome (former ZenView)
    return (
      <Box flexDirection="column" width="100%" height="100%">
        <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
          <Box flexDirection="column" width={60}>
            <Box justifyContent="center" marginBottom={2}>
              {project ? <Text bold color="white">{project}</Text> : <Text color="white">No session</Text>}
            </Box>
            <Box justifyContent="center" marginBottom={2}>
              <Text bold color={statusColor}>{statusLabel}</Text>
            </Box>
            <Box justifyContent="center" marginBottom={2}>
              <Text bold color="white">{timeStr}</Text>
            </Box>
            <Box justifyContent="center" marginBottom={2}>
              <Text color="green">{bar.substring(0, filled)}</Text>
              <Text color="gray">{bar.substring(filled)}</Text>
            </Box>
            <Box justifyContent="center">
              <Text color="cyan">Day {streakDays || 1}</Text>
              <Text color="gray">  |  </Text>
              <Text color="cyan">{todayCount} 🍅 today</Text>
            </Box>
          </Box>
        </Box>
        <Box paddingX={1}>
          <Text color="cyan">Space</Text>
          <Text color="gray"> {isPaused ? 'Resume' : 'Pause'}  </Text>
          <Text color="cyan">z</Text>
          <Text color="gray"> Expand  </Text>
          <Text color="cyan">q</Text>
          <Text color="gray"> Quit</Text>
        </Box>
      </Box>
    );
  }

  // Full, bordered chrome (former FocusView)
  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
        <Box flexDirection="column" borderStyle="single" borderColor="green" padding={2} width={52}>
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

          {task && (
            <Box justifyContent="center" marginBottom={1}>
              <Text color="cyan">🎯 </Text>
              <Text color="cyan">{task.substring(0, 35)}</Text>
            </Box>
          )}

          <Box justifyContent="center" marginTop={1} marginBottom={1}>
            <Text bold color={statusColor}>{statusLabel}</Text>
          </Box>

          <Box justifyContent="center" marginBottom={1}>
            <Text bold color="white">{timeStr}</Text>
          </Box>

          <Box justifyContent="center" marginBottom={1}>
            <Text color="green">{bar.substring(0, filled)}</Text>
            <Text color="gray">{bar.substring(filled)}</Text>
          </Box>

          <Box justifyContent="center" marginBottom={1}>
            <Text color="gray">{duration} min session</Text>
          </Box>

          <Box justifyContent="center">
            {todayCount > 0 ? (
              <Text color="cyan">Today: {todayCount} 🍅 ({todayMinutes}m)</Text>
            ) : (
              <Text color="gray">Start your first Pomodoro!</Text>
            )}
          </Box>
        </Box>
      </Box>

      <Box paddingX={1}>
        <Text color="cyan">Esc</Text>
        <Text color="gray"> Exit  </Text>
        <Text color="cyan">Space</Text>
        <Text color="gray"> {isPaused ? 'Resume' : 'Pause'}  </Text>
        <Text color="cyan">r</Text>
        <Text color="gray"> Reset  </Text>
        <Text color="cyan">z</Text>
        <Text color="gray"> Zen  </Text>
        <Text color="cyan">+/-</Text>
        <Text color="gray"> Adjust Time</Text>
      </Box>
    </Box>
  );
};
