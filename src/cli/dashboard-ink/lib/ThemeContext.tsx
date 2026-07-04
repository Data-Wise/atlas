/**
 * ThemeContext — Theme system for the Atlas Ink Dashboard
 *
 * Provides 5 built-in themes via React Context. Components use `useTheme()`
 * to access color tokens instead of hardcoding ANSI colors.
 *
 * ADHD design principle: never use red. Yellow = "needs attention".
 */

import React, { createContext, useContext } from 'react';

// ─── Theme Interface ─────────────────────────────────────────────────────────

export interface Theme {
  name: string;
  panel: {
    borderActive: string;
    borderInactive: string;
    headerActive: string;
    headerInactive: string;
    highlightBg: string;
  };
  status: Record<string, string>;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    accent: string;
  };
  chart: {
    sparkline: string;
    sparklineUp: string;
    sparklineDown: string;
    heatmap: [string, string, string, string, string];
    progressFilled: string;
    progressEmpty: string;
  };
  focus: {
    timer: string;
    paused: string;
    break: string;
  };
  focusTiers: [string, string, string, string, string];
}

// ─── Built-in Themes ─────────────────────────────────────────────────────────

const defaultTheme: Theme = {
  name: 'default',
  panel: {
    borderActive: 'cyan',
    borderInactive: 'gray',
    headerActive: 'cyan',
    headerInactive: 'gray',
    highlightBg: '#1a3a1a',
  },
  status: {
    active: 'green',
    paused: 'yellow',
    stable: 'cyan',
    complete: 'gray',
    planning: 'blue',
    blocked: 'yellow',
    draft: 'gray',
  },
  text: {
    primary: 'white',
    secondary: 'gray',
    muted: 'gray',
    accent: 'cyan',
  },
  chart: {
    sparkline: 'white',
    sparklineUp: 'green',
    sparklineDown: 'yellow',
    heatmap: ['#626262', '#5f875f', '#5faf5f', '#00af00', '#00d700'],
    progressFilled: 'green',
    progressEmpty: 'gray',
  },
  focus: {
    timer: 'green',
    paused: 'yellow',
    break: 'yellow',
  },
  focusTiers: ['gray', 'yellow', 'cyan', 'green', 'greenBright'],
};

const nordTheme: Theme = {
  name: 'nord',
  panel: {
    borderActive: '#81A1C1',
    borderInactive: '#4C566A',
    headerActive: '#81A1C1',
    headerInactive: '#4C566A',
    highlightBg: '#2e3440',
  },
  status: {
    active: '#8FBCBB',
    paused: '#EBCB8B',
    stable: '#81A1C1',
    complete: '#4C566A',
    planning: '#5E81AC',
    blocked: '#EBCB8B',
    draft: '#4C566A',
  },
  text: {
    primary: '#ECEFF4',
    secondary: '#D8DEE9',
    muted: '#4C566A',
    accent: '#88C0D0',
  },
  chart: {
    sparkline: '#D8DEE9',
    sparklineUp: '#A3BE8C',
    sparklineDown: '#EBCB8B',
    heatmap: ['#4C566A', '#5f7a6f', '#6b8f6b', '#8FBCBB', '#A3BE8C'],
    progressFilled: '#A3BE8C',
    progressEmpty: '#4C566A',
  },
  focus: {
    timer: '#A3BE8C',
    paused: '#EBCB8B',
    break: '#EBCB8B',
  },
  focusTiers: ['#4C566A', '#EBCB8B', '#88C0D0', '#A3BE8C', '#8FBCBB'],
};

const solarizedTheme: Theme = {
  name: 'solarized',
  panel: {
    borderActive: '#268BD2',
    borderInactive: '#586E75',
    headerActive: '#268BD2',
    headerInactive: '#586E75',
    highlightBg: '#073642',
  },
  status: {
    active: '#859900',
    paused: '#B58900',
    stable: '#268BD2',
    complete: '#586E75',
    planning: '#6C71C4',
    blocked: '#B58900',
    draft: '#586E75',
  },
  text: {
    primary: '#FDF6E3',
    secondary: '#93A1A1',
    muted: '#586E75',
    accent: '#2AA198',
  },
  chart: {
    sparkline: '#93A1A1',
    sparklineUp: '#859900',
    sparklineDown: '#B58900',
    heatmap: ['#586E75', '#6b7a2a', '#748f00', '#859900', '#96ab00'],
    progressFilled: '#859900',
    progressEmpty: '#586E75',
  },
  focus: {
    timer: '#859900',
    paused: '#B58900',
    break: '#B58900',
  },
  focusTiers: ['#586E75', '#B58900', '#2AA198', '#859900', '#b5e300'],
};

const monoTheme: Theme = {
  name: 'mono',
  panel: {
    borderActive: 'white',
    borderInactive: 'gray',
    headerActive: 'white',
    headerInactive: 'gray',
    highlightBg: '#3a3a3a',
  },
  status: {
    active: 'white',
    paused: 'whiteBright',
    stable: 'gray',
    complete: 'gray',
    planning: 'gray',
    blocked: 'whiteBright',
    draft: 'gray',
  },
  text: {
    primary: 'white',
    secondary: 'gray',
    muted: 'gray',
    accent: 'whiteBright',
  },
  chart: {
    sparkline: 'gray',
    sparklineUp: 'white',
    sparklineDown: 'whiteBright',
    heatmap: ['#3a3a3a', '#585858', '#808080', '#a8a8a8', '#d0d0d0'],
    progressFilled: 'white',
    progressEmpty: 'gray',
  },
  focus: {
    timer: 'white',
    paused: 'whiteBright',
    break: 'whiteBright',
  },
  focusTiers: ['gray', 'whiteBright', 'gray', 'white', 'whiteBright'],
};

const highContrastTheme: Theme = {
  name: 'high-contrast',
  panel: {
    borderActive: 'cyanBright',
    borderInactive: 'white',
    headerActive: 'cyanBright',
    headerInactive: 'white',
    highlightBg: '#1a1a1a',
  },
  status: {
    active: 'greenBright',
    paused: 'yellowBright',
    stable: 'cyanBright',
    complete: 'white',
    planning: 'blueBright',
    blocked: 'yellowBright',
    draft: 'white',
  },
  text: {
    primary: 'whiteBright',
    secondary: 'white',
    muted: 'white',
    accent: 'cyanBright',
  },
  chart: {
    sparkline: 'white',
    sparklineUp: 'greenBright',
    sparklineDown: 'yellowBright',
    heatmap: ['white', '#87d787', '#5fd75f', '#00ff00', '#00ff5f'],
    progressFilled: 'greenBright',
    progressEmpty: 'white',
  },
  focus: {
    timer: 'greenBright',
    paused: 'yellowBright',
    break: 'yellowBright',
  },
  focusTiers: ['white', 'yellowBright', 'cyanBright', 'greenBright', 'greenBright'],
};

// ─── Theme Registry ──────────────────────────────────────────────────────────

export const THEMES: Record<string, Theme> = {
  default: defaultTheme,
  nord: nordTheme,
  solarized: solarizedTheme,
  mono: monoTheme,
  'high-contrast': highContrastTheme,
};

export const THEME_NAMES = Object.keys(THEMES);

// ─── React Context ───────────────────────────────────────────────────────────

const ThemeContext = createContext<Theme>(defaultTheme);

interface ThemeProviderProps {
  themeName?: string;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ themeName, children }) => {
  const theme = THEMES[themeName ?? 'default'] ?? defaultTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
