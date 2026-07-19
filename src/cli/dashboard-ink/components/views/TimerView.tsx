/**
 * TimerView — absorbs FocusView + ZenView + InspectorPanel's timer
 * (SPEC-tui-consolidation-2026-07-19.md). Wraps the single PomodoroTimer
 * implementation and owns the `z` zen-density toggle.
 */

import React, { useState } from 'react';
import { useInput } from 'ink';
import { PomodoroTimer } from '../shared/PomodoroTimer.js';

interface TimerViewProps {
  project?: string;
  task?: string;
  onBack: () => void;
  isActive?: boolean;
  streakDays?: number;
  todayCount?: number;
  todayMinutes?: number;
}

export const TimerView: React.FC<TimerViewProps> = ({
  project,
  task,
  onBack,
  isActive = true,
  streakDays,
  todayCount,
  todayMinutes,
}) => {
  const [dense, setDense] = useState(false);

  // Only the 'z' toggle lives at this level — PomodoroTimer owns the rest
  // of the keys (Space/r/+/-/Esc/q) so they aren't duplicated here.
  useInput((input) => {
    if (!isActive) return;
    if (input === 'z') setDense(d => !d);
  });

  return (
    <PomodoroTimer
      project={project}
      task={task}
      onBack={onBack}
      isActive={isActive}
      dense={dense}
      streakDays={streakDays}
      todayCount={todayCount}
      todayMinutes={todayMinutes}
    />
  );
};
