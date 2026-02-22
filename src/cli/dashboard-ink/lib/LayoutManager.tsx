/**
 * LayoutManager
 *
 * Controls the multi-panel layout mode for the Atlas Ink dashboard.
 *
 * Modes:
 *   SINGLE  - Full-screen single view  (current default, backwards-compatible)
 *   SPLIT   - Sidebar (28%) + Main panel (72%)
 *   TRIPLE  - Sidebar (25%) + Main (47%) + Inspector (28%)
 *
 * Consumers:
 *   - App.tsx uses <LayoutManager> to wrap views
 *   - Tab key cycles SINGLE → SPLIT → TRIPLE → SINGLE
 *   - Each mode exposes typed panel props to children via render prop
 *
 * Design principles:
 *   - Ink's flexbox handles all sizing; no absolute positioning
 *   - Percentage widths keep panels responsive to terminal width
 *   - SINGLE mode is a transparent pass-through (zero overhead)
 *   - Panel borders use consistent color tokens for visual hierarchy
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

// ─── Layout Mode ──────────────────────────────────────────────────────────────

export const LAYOUT = {
  SINGLE: 'single',   // current full-screen mode (default)
  SPLIT:  'split',    // sidebar + main
  TRIPLE: 'triple',   // sidebar + main + inspector
} as const;

export type LayoutMode = typeof LAYOUT[keyof typeof LAYOUT];

// Ordered cycle for Tab key rotation
const LAYOUT_CYCLE: LayoutMode[] = [LAYOUT.SINGLE, LAYOUT.SPLIT, LAYOUT.TRIPLE];

// ─── Panel dimension config per mode ──────────────────────────────────────────

interface PanelConfig {
  /** Sidebar column (left): project list */
  sidebar?: { widthPct: number; borderColor: string };
  /** Main panel (center): active view content */
  main:     { widthPct: number; borderColor: string };
  /** Inspector panel (right): detail/timer overlay */
  inspector?: { widthPct: number; borderColor: string };
}

const PANEL_CONFIG: Record<LayoutMode, PanelConfig> = {
  [LAYOUT.SINGLE]: {
    main: { widthPct: 100, borderColor: 'cyan' },
  },
  [LAYOUT.SPLIT]: {
    sidebar:  { widthPct: 28, borderColor: 'gray'  },
    main:     { widthPct: 72, borderColor: 'cyan'  },
  },
  [LAYOUT.TRIPLE]: {
    sidebar:  { widthPct: 25, borderColor: 'gray'  },
    main:     { widthPct: 47, borderColor: 'cyan'  },
    inspector:{ widthPct: 28, borderColor: 'green' },
  },
};

// ─── Panel render-prop shape ───────────────────────────────────────────────────

export interface PanelRenderProps {
  /** Integer percentage of terminal width, e.g. 72 */
  widthPct: number;
  /** Whether this panel is currently active / focused */
  isActive: boolean;
}

export interface LayoutRenderProps {
  layout:   LayoutMode;
  sidebar?: PanelRenderProps;
  main:     PanelRenderProps;
  inspector?: PanelRenderProps;
}

// ─── useLayout hook ────────────────────────────────────────────────────────────

interface UseLayoutOptions {
  /** Starting layout mode. Defaults to SINGLE. */
  initial?: LayoutMode;
  /** Which panel is keyboard-focused. Defaults to 'main'. */
  initialFocus?: 'sidebar' | 'main' | 'inspector';
}

interface UseLayoutResult {
  layout:     LayoutMode;
  focusPanel: 'sidebar' | 'main' | 'inspector';
  cycleLayout: () => void;
  setLayout:   (mode: LayoutMode) => void;
  setFocus:    (panel: 'sidebar' | 'main' | 'inspector') => void;
  renderProps: LayoutRenderProps;
}

/**
 * useLayout — manages layout mode + panel focus.
 *
 * Handles Tab key internally; consumers pass this hook's result into
 * <LayoutManager> or use renderProps directly.
 *
 * @example
 *   const layout = useLayout({ initial: LAYOUT.SPLIT });
 *   // Tab cycles modes automatically
 *   return <LayoutManager {...layout}>{...}</LayoutManager>;
 */
export function useLayout(options: UseLayoutOptions = {}): UseLayoutResult {
  const [layout, setLayout] = useState<LayoutMode>(options.initial ?? LAYOUT.SINGLE);
  const [focusPanel, setFocus] = useState<'sidebar' | 'main' | 'inspector'>(
    options.initialFocus ?? 'main'
  );

  const cycleLayout = useCallback(() => {
    setLayout(prev => {
      const idx  = LAYOUT_CYCLE.indexOf(prev);
      const next = LAYOUT_CYCLE[(idx + 1) % LAYOUT_CYCLE.length];

      // When collapsing back to SINGLE, restore focus to main
      if (next === LAYOUT.SINGLE) setFocus('main');
      return next;
    });
  }, []);

  // Tab key: cycle layout
  useInput((input, key) => {
    if (key.tab && !key.shift) {
      cycleLayout();
    } else if (key.shift && key.tab && layout !== LAYOUT.SINGLE) {
      setFocus(prev => {
        if (layout === LAYOUT.SPLIT) {
          return prev === 'sidebar' ? 'main' : 'sidebar';
        }
        // TRIPLE: sidebar → main → inspector → sidebar
        const order: Array<'sidebar' | 'main' | 'inspector'> = ['sidebar', 'main', 'inspector'];
        const i = order.indexOf(prev);
        return order[(i + 1) % order.length];
      });
    }
  });

  // Build render props from current config
  const cfg = PANEL_CONFIG[layout];
  const renderProps: LayoutRenderProps = {
    layout,
    main: {
      widthPct: cfg.main.widthPct,
      isActive: focusPanel === 'main',
    },
    ...(cfg.sidebar && {
      sidebar: {
        widthPct: cfg.sidebar.widthPct,
        isActive: focusPanel === 'sidebar',
      },
    }),
    ...(cfg.inspector && {
      inspector: {
        widthPct: cfg.inspector.widthPct,
        isActive: focusPanel === 'inspector',
      },
    }),
  };

  return { layout, focusPanel, cycleLayout, setLayout, setFocus, renderProps };
}

// ─── LayoutStatusBar ──────────────────────────────────────────────────────────

interface LayoutStatusBarProps {
  layout: LayoutMode;
  focusPanel: 'sidebar' | 'main' | 'inspector';
}

/**
 * Small indicator showing current layout mode.
 * Intended for the bottom command bar — import and render alongside other hints.
 *
 * @example
 *   <LayoutStatusBar layout={layout} focusPanel={focusPanel} />
 */
export const LayoutStatusBar: React.FC<LayoutStatusBarProps> = ({ layout, focusPanel }) => {
  const icon: Record<LayoutMode, string> = {
    [LAYOUT.SINGLE]: '▣',
    [LAYOUT.SPLIT]:  '▥',
    [LAYOUT.TRIPLE]: '▦',
  };
  const label: Record<LayoutMode, string> = {
    [LAYOUT.SINGLE]: 'Single',
    [LAYOUT.SPLIT]:  'Split',
    [LAYOUT.TRIPLE]: 'Triple',
  };

  return (
    <Box>
      <Text color="gray">Tab: </Text>
      <Text color="magenta" bold>{icon[layout]} {label[layout]}</Text>
      {layout !== LAYOUT.SINGLE && (
        <>
          <Text color="gray">  focus: </Text>
          <Text color="cyan">{focusPanel}</Text>
        </>
      )}
    </Box>
  );
};

// ─── LayoutManager component ──────────────────────────────────────────────────

interface LayoutManagerProps {
  layout:     LayoutMode;
  focusPanel: 'sidebar' | 'main' | 'inspector';
  /**
   * Render prop — receives per-panel width/focus props.
   * The parent composes sidebar, main, and inspector children.
   */
  children: (props: LayoutRenderProps) => React.ReactNode;
}

/**
 * LayoutManager — render component that applies Ink Box layout
 * for the current mode and delegates content to the children render prop.
 *
 * SINGLE: children fills full width (no wrapper overhead).
 * SPLIT:  side-by-side Box row, sidebar 28% + main 72%.
 * TRIPLE: three-column Box row, 25% + 47% + 28%.
 *
 * @example
 *   <LayoutManager layout={layout} focusPanel={focusPanel}>
 *     {({ sidebar, main, inspector }) => (
 *       <>
 *         {sidebar && <SidebarPanel {...sidebar} projects={projects} />}
 *         <MainPanel {...main}>
 *           {renderCurrentView()}
 *         </MainPanel>
 *         {inspector && <InspectorPanel {...inspector} project={selected} />}
 *       </>
 *     )}
 *   </LayoutManager>
 */
export const LayoutManager: React.FC<LayoutManagerProps> = ({
  layout,
  focusPanel,
  children,
}) => {
  const cfg = PANEL_CONFIG[layout];

  // Build the same renderProps shape as useLayout
  const renderProps: LayoutRenderProps = {
    layout,
    main: {
      widthPct: cfg.main.widthPct,
      isActive: focusPanel === 'main',
    },
    ...(cfg.sidebar && {
      sidebar: {
        widthPct: cfg.sidebar.widthPct,
        isActive: focusPanel === 'sidebar',
      },
    }),
    ...(cfg.inspector && {
      inspector: {
        widthPct: cfg.inspector.widthPct,
        isActive: focusPanel === 'inspector',
      },
    }),
  };

  if (layout === LAYOUT.SINGLE) {
    // Transparent pass-through — no extra wrapper boxes
    return <>{children(renderProps)}</>;
  }

  return (
    <Box flexDirection="row" width="100%" height="100%">
      {children(renderProps)}
    </Box>
  );
};

// ─── Panel wrapper helpers ────────────────────────────────────────────────────

interface PanelBoxProps {
  widthPct: number;
  isActive: boolean;
  borderColor?: string;
  children: React.ReactNode;
}

/**
 * PanelBox — thin wrapper that applies the correct percentage width and
 * highlights the active panel border.
 *
 * Use this inside your render prop to avoid repeating Box props.
 *
 * @example
 *   <PanelBox widthPct={sidebar.widthPct} isActive={sidebar.isActive} borderColor="gray">
 *     <SidebarPanel projects={projects} />
 *   </PanelBox>
 */
export const PanelBox: React.FC<PanelBoxProps> = ({
  widthPct,
  isActive,
  borderColor = 'gray',
  children,
}) => (
  <Box
    flexDirection="column"
    width={`${widthPct}%`}
    height="100%"
    borderStyle="single"
    borderColor={isActive ? 'cyan' : borderColor}
    overflow="hidden"
  >
    {children}
  </Box>
);
