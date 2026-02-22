/**
 * Unit tests for ThemeContext — theme system for Atlas Ink Dashboard
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import {
  ThemeProvider,
  useTheme,
  THEMES,
  THEME_NAMES,
} from '../../../../../src/cli/dashboard-ink/lib/ThemeContext.js';
import type { Theme } from '../../../../../src/cli/dashboard-ink/lib/ThemeContext.js';

// Helper component that renders theme values for inspection
const ThemeInspector: React.FC<{ field?: string }> = ({ field }) => {
  const theme = useTheme();
  if (field === 'name') return <Text>{theme.name}</Text>;
  if (field === 'borderActive') return <Text>{theme.panel.borderActive}</Text>;
  return <Text>{theme.name}</Text>;
};

describe('ThemeContext', () => {
  describe('THEMES registry', () => {
    it('should have exactly 5 built-in themes', () => {
      expect(THEME_NAMES).toHaveLength(5);
    });

    it('should include default, nord, solarized, mono, high-contrast', () => {
      expect(THEME_NAMES).toEqual(
        expect.arrayContaining(['default', 'nord', 'solarized', 'mono', 'high-contrast'])
      );
    });

    it.each(THEME_NAMES)('theme "%s" should have all required keys', (name) => {
      const theme = THEMES[name];
      expect(theme).toBeDefined();

      // Top-level keys
      expect(theme.name).toBe(name);
      expect(theme.panel).toBeDefined();
      expect(theme.status).toBeDefined();
      expect(theme.text).toBeDefined();
      expect(theme.chart).toBeDefined();
      expect(theme.focus).toBeDefined();
      expect(theme.focusTiers).toBeDefined();

      // Panel
      expect(theme.panel.borderActive).toBeTruthy();
      expect(theme.panel.borderInactive).toBeTruthy();
      expect(theme.panel.headerActive).toBeTruthy();
      expect(theme.panel.headerInactive).toBeTruthy();

      // Status — at minimum: active, paused, stable
      expect(theme.status.active).toBeTruthy();
      expect(theme.status.paused).toBeTruthy();
      expect(theme.status.stable).toBeTruthy();

      // Text
      expect(theme.text.primary).toBeTruthy();
      expect(theme.text.secondary).toBeTruthy();
      expect(theme.text.muted).toBeTruthy();
      expect(theme.text.accent).toBeTruthy();

      // Chart
      expect(theme.chart.sparkline).toBeTruthy();
      expect(theme.chart.sparklineUp).toBeTruthy();
      expect(theme.chart.sparklineDown).toBeTruthy();
      expect(theme.chart.heatmap).toHaveLength(5);
      expect(theme.chart.progressFilled).toBeTruthy();
      expect(theme.chart.progressEmpty).toBeTruthy();

      // Focus
      expect(theme.focus.timer).toBeTruthy();
      expect(theme.focus.paused).toBeTruthy();
      expect(theme.focus.break).toBeTruthy();

      // Focus tiers
      expect(theme.focusTiers).toHaveLength(5);
    });

    it('no theme should use red (ADHD design principle)', () => {
      for (const name of THEME_NAMES) {
        const theme = THEMES[name];
        // Check status colors — 'blocked' should not be red
        for (const [key, value] of Object.entries(theme.status)) {
          expect(value).not.toBe('red');
        }
        // sparklineDown should never be red
        expect(theme.chart.sparklineDown).not.toBe('red');
      }
    });
  });

  describe('ThemeProvider', () => {
    it('should provide default theme when no themeName specified', () => {
      const { lastFrame } = render(
        <ThemeProvider>
          <ThemeInspector field="name" />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('default');
    });

    it('should provide requested theme by name', () => {
      const { lastFrame } = render(
        <ThemeProvider themeName="nord">
          <ThemeInspector field="name" />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('nord');
    });

    it('should fall back to default for unknown theme name', () => {
      const { lastFrame } = render(
        <ThemeProvider themeName="nonexistent">
          <ThemeInspector field="name" />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('default');
    });
  });

  describe('useTheme', () => {
    it('should return default theme when used outside ThemeProvider', () => {
      const { lastFrame } = render(<ThemeInspector field="name" />);
      expect(lastFrame()).toContain('default');
    });

    it('should return theme values matching the provider', () => {
      const { lastFrame } = render(
        <ThemeProvider themeName="nord">
          <ThemeInspector field="borderActive" />
        </ThemeProvider>
      );
      expect(lastFrame()).toContain('#81A1C1');
    });
  });

  describe('default theme matches original hardcoded values', () => {
    const d = THEMES.default;

    it('should use cyan for active panel borders', () => {
      expect(d.panel.borderActive).toBe('cyan');
    });

    it('should use gray for inactive panel borders', () => {
      expect(d.panel.borderInactive).toBe('gray');
    });

    it('should use green for active status', () => {
      expect(d.status.active).toBe('green');
    });

    it('should use yellow for paused status', () => {
      expect(d.status.paused).toBe('yellow');
    });

    it('should use green for progress filled', () => {
      expect(d.chart.progressFilled).toBe('green');
    });

    it('should use green for focus timer', () => {
      expect(d.focus.timer).toBe('green');
    });
  });
});
