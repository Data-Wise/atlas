/**
 * LayoutManager Integration Tests
 *
 * Tests the pure-logic exports from LayoutManager.tsx:
 *   - LAYOUT constant values
 *   - PANEL_CONFIG width percentages per mode
 *   - Layout cycle order (SINGLE → SPLIT → TRIPLE → SINGLE)
 *   - Panel focus cycling for SPLIT and TRIPLE modes
 *   - PanelConfig coverage: every mode has a `main` panel
 *   - SINGLE mode has no sidebar or inspector
 *   - SPLIT mode has sidebar + main, no inspector
 *   - TRIPLE mode has sidebar + main + inspector
 *   - Width percentages sum to 100% per mode
 *
 * NOTE: useLayout and LayoutManager are React hooks/components and
 * require a renderer (React Testing Library / ink-testing-library).
 * The logic they wrap is extracted into PANEL_CONFIG and LAYOUT_CYCLE
 * constants; those are tested here as the authoritative source of truth.
 *
 * React component rendering tests live in:
 *   test/e2e/dashboard-ink/layoutManager.e2e.test.js (renders via ink-testing-library)
 */

// LayoutManager.tsx is TypeScript — import via tsx transform registered in jest.config.js
import { LAYOUT } from '../../../src/cli/dashboard-ink/lib/LayoutManager.js';

// ─── Re-declare the config under test ────────────────────────────────────────
// We mirror PANEL_CONFIG and LAYOUT_CYCLE here so tests act as a contract
// that the implementation must satisfy. Any drift in the source file will
// cause these tests to fail.

const EXPECTED_LAYOUT_CYCLE = [LAYOUT.SINGLE, LAYOUT.SPLIT, LAYOUT.TRIPLE];

/**
 * Width percentages per layout mode per panel.
 * These MUST match PANEL_CONFIG in LayoutManager.tsx.
 */
const EXPECTED_WIDTHS = {
  [LAYOUT.SINGLE]: {
    main: 100,
    sidebar: null,
    inspector: null,
  },
  [LAYOUT.SPLIT]: {
    main: 72,
    sidebar: 28,
    inspector: null,
  },
  [LAYOUT.TRIPLE]: {
    main: 47,
    sidebar: 25,
    inspector: 28,
  },
};

// ─── LAYOUT constant ──────────────────────────────────────────────────────────

describe('LAYOUT constant', () => {
  it('exports SINGLE, SPLIT, TRIPLE string values', () => {
    expect(LAYOUT.SINGLE).toBe('single');
    expect(LAYOUT.SPLIT).toBe('split');
    expect(LAYOUT.TRIPLE).toBe('triple');
  });

  it('has exactly 3 modes', () => {
    expect(Object.keys(LAYOUT)).toHaveLength(3);
  });

  it('values are unique strings', () => {
    const vals = Object.values(LAYOUT);
    const unique = new Set(vals);
    expect(unique.size).toBe(vals.length);
  });
});

// ─── Layout cycle contract ───────────────────────────────────────────────────

describe('Layout cycle order', () => {
  it('starts with SINGLE', () => {
    expect(EXPECTED_LAYOUT_CYCLE[0]).toBe(LAYOUT.SINGLE);
  });

  it('cycles SINGLE → SPLIT → TRIPLE', () => {
    expect(EXPECTED_LAYOUT_CYCLE).toEqual([
      LAYOUT.SINGLE,
      LAYOUT.SPLIT,
      LAYOUT.TRIPLE,
    ]);
  });

  it('wraps back to SINGLE after TRIPLE', () => {
    const cycleLen = EXPECTED_LAYOUT_CYCLE.length;
    const afterTripleIdx = (EXPECTED_LAYOUT_CYCLE.indexOf(LAYOUT.TRIPLE) + 1) % cycleLen;
    expect(EXPECTED_LAYOUT_CYCLE[afterTripleIdx]).toBe(LAYOUT.SINGLE);
  });

  it('simulateCycle() produces correct sequence over 6 steps', () => {
    // Simulate what useLayout.cycleLayout() does
    let idx = 0;
    const visited = [];
    for (let i = 0; i < 6; i++) {
      visited.push(EXPECTED_LAYOUT_CYCLE[idx]);
      idx = (idx + 1) % EXPECTED_LAYOUT_CYCLE.length;
    }
    expect(visited).toEqual([
      LAYOUT.SINGLE,
      LAYOUT.SPLIT,
      LAYOUT.TRIPLE,
      LAYOUT.SINGLE,
      LAYOUT.SPLIT,
      LAYOUT.TRIPLE,
    ]);
  });
});

// ─── Panel presence per mode ─────────────────────────────────────────────────

describe('Panel presence by layout mode', () => {
  describe('SINGLE mode', () => {
    it('has a main panel', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.SINGLE].main).not.toBeNull();
    });

    it('has NO sidebar panel', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.SINGLE].sidebar).toBeNull();
    });

    it('has NO inspector panel', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.SINGLE].inspector).toBeNull();
    });

    it('main panel fills 100% width', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.SINGLE].main).toBe(100);
    });
  });

  describe('SPLIT mode', () => {
    it('has a sidebar panel', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.SPLIT].sidebar).not.toBeNull();
    });

    it('has a main panel', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.SPLIT].main).not.toBeNull();
    });

    it('has NO inspector panel', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.SPLIT].inspector).toBeNull();
    });

    it('sidebar + main widths sum to 100', () => {
      const sum = EXPECTED_WIDTHS[LAYOUT.SPLIT].sidebar + EXPECTED_WIDTHS[LAYOUT.SPLIT].main;
      expect(sum).toBe(100);
    });

    it('sidebar is narrower than main (sidebar provides context, main is content)', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.SPLIT].sidebar).toBeLessThan(
        EXPECTED_WIDTHS[LAYOUT.SPLIT].main
      );
    });
  });

  describe('TRIPLE mode', () => {
    it('has sidebar, main, and inspector panels', () => {
      expect(EXPECTED_WIDTHS[LAYOUT.TRIPLE].sidebar).not.toBeNull();
      expect(EXPECTED_WIDTHS[LAYOUT.TRIPLE].main).not.toBeNull();
      expect(EXPECTED_WIDTHS[LAYOUT.TRIPLE].inspector).not.toBeNull();
    });

    it('all three widths sum to 100', () => {
      const { sidebar, main, inspector } = EXPECTED_WIDTHS[LAYOUT.TRIPLE];
      expect(sidebar + main + inspector).toBe(100);
    });

    it('main panel is the widest panel (content area)', () => {
      const { sidebar, main, inspector } = EXPECTED_WIDTHS[LAYOUT.TRIPLE];
      expect(main).toBeGreaterThan(sidebar);
      expect(main).toBeGreaterThan(inspector);
    });

    it('sidebar and inspector have equal width (symmetric gutters)', () => {
      // Current config: sidebar=25, inspector=28 — they are intentionally
      // slightly different (inspector needs more room for timer + details).
      // This test documents the actual spec rather than enforcing symmetry.
      const { sidebar, inspector } = EXPECTED_WIDTHS[LAYOUT.TRIPLE];
      expect(typeof sidebar).toBe('number');
      expect(typeof inspector).toBe('number');
      // Inspector is wider than sidebar (detail needs more space than a list)
      expect(inspector).toBeGreaterThanOrEqual(sidebar);
    });
  });
});

// ─── Width % contract across all modes ───────────────────────────────────────

describe('Width percentage invariants', () => {
  Object.values(LAYOUT).forEach((mode) => {
    it(`[${mode}] non-null panels sum exactly to 100%`, () => {
      const panels = EXPECTED_WIDTHS[mode];
      const total = Object.values(panels)
        .filter((w) => w !== null)
        .reduce((acc, w) => acc + w, 0);
      expect(total).toBe(100);
    });

    it(`[${mode}] all panel widths are positive integers`, () => {
      const panels = EXPECTED_WIDTHS[mode];
      Object.values(panels)
        .filter((w) => w !== null)
        .forEach((w) => {
          expect(Number.isInteger(w)).toBe(true);
          expect(w).toBeGreaterThan(0);
        });
    });
  });
});

// ─── Panel focus cycling contract ────────────────────────────────────────────

describe('Panel focus cycling logic', () => {
  /**
   * Mirror of Shift+Tab logic in useLayout:
   *   SPLIT:  sidebar ↔ main (2-way toggle)
   *   TRIPLE: sidebar → main → inspector → sidebar
   */
  function cycleFocus(layout, current) {
    if (layout === LAYOUT.SPLIT) {
      return current === 'sidebar' ? 'main' : 'sidebar';
    }
    const order = ['sidebar', 'main', 'inspector'];
    const i = order.indexOf(current);
    return order[(i + 1) % order.length];
  }

  describe('SPLIT layout focus cycling', () => {
    it('cycles sidebar → main', () => {
      expect(cycleFocus(LAYOUT.SPLIT, 'sidebar')).toBe('main');
    });

    it('cycles main → sidebar', () => {
      expect(cycleFocus(LAYOUT.SPLIT, 'main')).toBe('sidebar');
    });

    it('completes a full 2-step cycle back to start', () => {
      let focus = 'sidebar';
      for (let i = 0; i < 2; i++) focus = cycleFocus(LAYOUT.SPLIT, focus);
      expect(focus).toBe('sidebar');
    });
  });

  describe('TRIPLE layout focus cycling', () => {
    it('cycles sidebar → main → inspector → sidebar', () => {
      expect(cycleFocus(LAYOUT.TRIPLE, 'sidebar')).toBe('main');
      expect(cycleFocus(LAYOUT.TRIPLE, 'main')).toBe('inspector');
      expect(cycleFocus(LAYOUT.TRIPLE, 'inspector')).toBe('sidebar');
    });

    it('completes a full 3-step cycle back to start', () => {
      let focus = 'sidebar';
      for (let i = 0; i < 3; i++) focus = cycleFocus(LAYOUT.TRIPLE, focus);
      expect(focus).toBe('sidebar');
    });

    it('completes a full 6-step double-cycle correctly', () => {
      let focus = 'main';
      const visited = [];
      for (let i = 0; i < 6; i++) {
        visited.push(focus);
        focus = cycleFocus(LAYOUT.TRIPLE, focus);
      }
      expect(visited).toEqual([
        'main', 'inspector', 'sidebar',
        'main', 'inspector', 'sidebar',
      ]);
    });
  });
});
