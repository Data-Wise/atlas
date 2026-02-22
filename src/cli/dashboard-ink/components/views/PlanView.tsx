import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Suggestion {
  type: string;
  message: string;
  action?: string;
}

interface PlanViewProps {
  onBack: () => void;
  onQuit: () => void;
  onStartSession?: () => void;
}

/**
 * Plan View Component (Morning Ritual)
 *
 * Guided daily planning with smart suggestions.
 * Features:
 * - Yesterday's productivity summary
 * - Streak tracking for motivation
 * - Smart suggestions (unpark, triage, focus, continue)
 * - Energy level selection
 * - Inbox/parked/active counts
 *
 * Keyboard shortcuts:
 * - ↑↓/j/k: Navigate suggestions
 * - Enter: Execute suggestion
 * - e: Cycle energy level (high/medium/low)
 * - s: Start session
 * - Esc/p: Back to main view
 * - q: Quit
 */
export const PlanView: React.FC<PlanViewProps> = ({ onBack, onQuit, onStartSession }) => {
  // Mock plan data for POC
  const [suggestions] = useState<Suggestion[]>([
    {
      type: 'unpark',
      message: 'Resume: atlas v0.9.0 TUI Modernization',
      action: 'Start session with parked context',
    },
    {
      type: 'triage',
      message: 'Triage 3 inbox captures',
      action: 'Review and organize captured ideas',
    },
    {
      type: 'focus',
      message: 'Continue: Migrate remaining views to Ink',
      action: 'Pick up where you left off',
    },
    {
      type: 'streak',
      message: 'Maintain your 7-day streak!',
      action: 'Log at least 25 minutes today',
    },
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);

  // Mock data
  const yesterday = {
    hasSessions: true,
    sessionCount: 3,
    hours: 2,
    minutes: 30,
    completionRate: 85,
    lastProject: 'atlas',
  };

  const streak = {
    current: 7,
    longest: 12,
    display: '🔥🔥🔥🔥🔥🔥🔥',
    message: 'Keep the momentum!',
  };

  const stats = {
    inbox: 3,
    parked: 1,
    active: 3,
  };

  // Keyboard navigation
  useInput((input, key) => {
    if (key.escape || input === 'p') {
      onBack();
    } else if (input === 'j' || key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (input === 'k' || key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (input === 'e') {
      // Cycle energy level
      const levels = [null, 'high', 'medium', 'low'];
      const currentIndex = levels.indexOf(energyLevel);
      setEnergyLevel(levels[(currentIndex + 1) % levels.length]);
    } else if (input === 's' && onStartSession) {
      onStartSession();
    } else if (input === 'q') {
      onQuit();
    }
  });

  // Suggestion icons
  const SUGGESTION_ICONS: Record<string, string> = {
    unpark: '⏸️',
    triage: '📥',
    focus: '🎯',
    continue: '▶️',
    streak: '🔥',
  };

  // Energy level display
  const energyStr = energyLevel ? `Energy: ${energyLevel}` : 'Energy: not set';
  const energyColor = energyLevel === 'high' ? 'green' : energyLevel === 'medium' ? 'yellow' : energyLevel === 'low' ? 'red' : 'gray';

  // Greeting
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Title bar */}
      <Box paddingX={1}>
        <Text bold>{greeting}</Text>
        <Text>  ─────────────────────────  </Text>
        <Text color={energyColor}>{energyStr}</Text>
      </Box>

      {/* Two-column layout: Yesterday and Streak */}
      <Box flexDirection="row" marginTop={1} paddingX={1}>
        {/* Yesterday summary */}
        <Box width="50%" borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1} marginRight={1}>
          <Text bold>📅 Yesterday</Text>
          {yesterday.hasSessions ? (
            <Box flexDirection="column" marginTop={1}>
              <Text color="white">{yesterday.sessionCount} sessions</Text>
              <Text color="cyan">
                {yesterday.hours}h {yesterday.minutes}m total
              </Text>
              <Text color="green">{yesterday.completionRate}% completed</Text>
              <Text>
                Last: <Text color="yellow">{yesterday.lastProject}</Text>
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">No sessions yesterday</Text>
              <Text color="yellow">Fresh start today!</Text>
            </Box>
          )}
        </Box>

        {/* Streak display */}
        <Box width="50%" borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1}>
          <Text bold>🔥 Streak</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>
              Current: <Text bold color="green">{streak.current} days</Text>
            </Text>
            <Text>
              Longest: <Text color="cyan">{streak.longest} days</Text>
            </Text>
            <Text>{streak.display}</Text>
            <Text color="gray">{streak.message}</Text>
          </Box>
        </Box>
      </Box>

      {/* Suggestions list */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        flexDirection="column"
        flexGrow={1}
        marginTop={1}
        paddingX={1}
        marginX={1}
      >
        <Text bold>💡 Suggestions</Text>
        <Box flexDirection="column" marginTop={1}>
          {suggestions.length === 0 ? (
            <Text color="gray">No suggestions - start fresh!</Text>
          ) : (
            suggestions.map((s, i) => {
              const isSelected = i === selectedIndex;
              const icon = SUGGESTION_ICONS[s.type] || '💡';

              return (
                <Box key={i} flexDirection="column" marginBottom={1}>
                  <Box>
                    <Text>{isSelected ? '► ' : '   '}</Text>
                    <Text>{icon} </Text>
                    <Text color="white">{s.message}</Text>
                  </Box>
                  {s.action && isSelected && (
                    <Box marginLeft={5}>
                      <Text color="cyan">→ {s.action}</Text>
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* Stats footer */}
      <Box paddingX={1}>
        <Text color="cyan">📥 {stats.inbox} inbox</Text>
        <Text>  │  </Text>
        <Text color="yellow">⏸️ {stats.parked} parked</Text>
        <Text>  │  </Text>
        <Text color="green">🟢 {stats.active} active</Text>
      </Box>

      {/* Command bar */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="cyan">↑↓</Text>
        <Text> Navigate  </Text>
        <Text color="cyan">Enter</Text>
        <Text> Execute  </Text>
        <Text color="cyan">e</Text>
        <Text> Energy  </Text>
        <Text color="cyan">s</Text>
        <Text> Start Session  </Text>
        <Text color="cyan">Esc</Text>
        <Text> Back</Text>
      </Box>
    </Box>
  );
};
