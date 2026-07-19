import React from 'react';
import { Box, Text } from 'ink';
import { KEYMAP, GLOBAL_KEYS, type KeymapScope } from '../lib/keymap.js';
import { useTheme } from '../lib/ThemeContext.js';

interface HelpOverlayProps {
  /** Which per-view scope to show alongside the global keys */
  scope: Exclude<KeymapScope, 'global' | 'help'>;
}

const SCOPE_LABEL: Record<string, string> = {
  now: 'Now',
  timer: 'Timer',
  plan: 'Plan',
};

/**
 * HelpOverlay — renders directly from keymap.ts (`?` toggles it globally).
 * Shows global keys plus the keys scoped to whichever view is active.
 */
export const HelpOverlay: React.FC<HelpOverlayProps> = ({ scope }) => {
  const theme = useTheme();
  const scopedKeys = KEYMAP[scope] ?? [];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.panel.borderActive}
      padding={1}
      width={66}
    >
      <Text bold color={theme.text.accent}>Keyboard Shortcuts</Text>

      <Box flexDirection="column" marginTop={1}>
        <Text bold color={theme.text.secondary}>Global</Text>
        {GLOBAL_KEYS.map((b, i) => (
          <Box key={i}>
            <Text color={theme.text.accent}>{b.key.padEnd(18)}</Text>
            <Text color={theme.text.primary}>{b.description}</Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold color={theme.text.secondary}>{SCOPE_LABEL[scope] ?? scope}</Text>
        {scopedKeys.map((b, i) => (
          <Box key={i}>
            <Text color={theme.text.accent}>{b.key.padEnd(18)}</Text>
            <Text color={theme.text.primary}>{b.description}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press ? or Esc to close</Text>
      </Box>
    </Box>
  );
};
