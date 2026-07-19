/**
 * NowView (detail pane) Integration Tests
 *
 * Migrated from the pre-consolidation inspectorPanel.test.js
 * (SPEC-tui-consolidation-2026-07-19.md — InspectorPanel's project-detail
 * logic now lives in NowView.tsx; its timer logic moved to
 * shared/PomodoroTimer.tsx, covered separately in pomodoroTimer.test.js).
 *
 * Tests pure logic extracted from NowView.tsx:
 *   - STATUS_COLOR / STATUS_ICON parity (matches shared/ProjectList contract)
 *   - progressBar: filled + empty always sum to bar width
 *   - trunc: ellipsis truncation contract
 *   - nextItems parsing: comma-separated, newline-separated, slices to 3
 *   - breadcrumbs: newest-first slice to 3
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);

const fs   = require('fs');
const path = require('path');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC = path.resolve(
  __dirname,
  '../../../src/cli/dashboard-ink/components/views/NowView.tsx'
);

// ─── Mirror pure-logic helpers from NowView.tsx ──────────────────────────────

const STATUS_COLOR = {
  active:   'green',
  paused:   'yellow',
  stable:   'cyan',
  complete: 'gray',
  planning: 'blue',
  blocked:  'red',
};

const STATUS_ICON = {
  active:   '●',
  paused:   '◐',
  stable:   '◆',
  complete: '✓',
  planning: '○',
  blocked:  '✗',
};

const BAR_WIDTH = 16;

/** Mirror of progressBar() in NowView.tsx */
function progressBar(pct) {
  const n = Math.round(Math.max(0, Math.min(100, pct)) / 100 * BAR_WIDTH);
  return { filled: '█'.repeat(n), empty: '░'.repeat(BAR_WIDTH - n) };
}

/** Mirror of trunc() in NowView.tsx */
function trunc(s, max = 40) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Mirror of nextItems parsing in NowView.tsx */
function parseNextItems(next) {
  if (!next) return [];
  return next.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 3);
}

// ─── STATUS_COLOR / STATUS_ICON parity ───────────────────────────────────────

describe('STATUS_COLOR + STATUS_ICON (NowView)', () => {
  it('has colour + icon for all 6 statuses', () => {
    const statuses = ['active', 'paused', 'stable', 'complete', 'planning', 'blocked'];
    statuses.forEach(s => {
      expect(STATUS_COLOR[s]).toBeDefined();
      expect(STATUS_ICON[s]).toBeDefined();
    });
  });

  it('active is green + filled circle', () => {
    expect(STATUS_COLOR.active).toBe('green');
    expect(STATUS_ICON.active).toBe('●');
  });

  it('blocked is red + cross', () => {
    expect(STATUS_COLOR.blocked).toBe('red');
    expect(STATUS_ICON.blocked).toBe('✗');
  });

  it('icon and colour maps have the same keys (parity with shared/ProjectList)', () => {
    expect(Object.keys(STATUS_COLOR).sort()).toEqual(Object.keys(STATUS_ICON).sort());
  });
});

// ─── progressBar() ────────────────────────────────────────────────────────────

describe('progressBar()', () => {
  it('filled + empty always sum to BAR_WIDTH (16)', () => {
    [0, 10, 25, 50, 75, 90, 100].forEach(pct => {
      const { filled, empty } = progressBar(pct);
      expect(filled.length + empty.length).toBe(BAR_WIDTH);
    });
  });

  it('0% → all empty', () => {
    const { filled, empty } = progressBar(0);
    expect(filled).toBe('');
    expect(empty).toBe('░'.repeat(BAR_WIDTH));
  });

  it('100% → all filled', () => {
    const { filled, empty } = progressBar(100);
    expect(filled).toBe('█'.repeat(BAR_WIDTH));
    expect(empty).toBe('');
  });

  it('clamps > 100 to 100', () => {
    const { filled } = progressBar(150);
    expect(filled).toBe('█'.repeat(BAR_WIDTH));
  });

  it('clamps < 0 to 0', () => {
    const { empty } = progressBar(-50);
    expect(empty).toBe('░'.repeat(BAR_WIDTH));
  });
});

// ─── trunc() ──────────────────────────────────────────────────────────────────

describe('trunc() with 40-char default', () => {
  it('passes through strings ≤ 40 chars', () => {
    expect(trunc('short')).toBe('short');
  });

  it('truncates at 40 chars with Unicode ellipsis', () => {
    const result = trunc('a'.repeat(50));
    expect(result).toHaveLength(40);
    expect(result.endsWith('…')).toBe(true);
  });

  it('respects custom max', () => {
    const result = trunc('hello world', 8);
    expect(result).toHaveLength(8);
    expect(result.endsWith('…')).toBe(true);
  });
});

// ─── parseNextItems() ─────────────────────────────────────────────────────────

describe('parseNextItems()', () => {
  it('returns [] for undefined', () => {
    expect(parseNextItems(undefined)).toEqual([]);
  });

  it('parses comma-separated items', () => {
    const result = parseNextItems('Add OAuth provider, Write tests, Deploy');
    expect(result).toEqual(['Add OAuth provider', 'Write tests', 'Deploy']);
  });

  it('parses newline-separated items', () => {
    const result = parseNextItems('Task A\nTask B\nTask C');
    expect(result).toEqual(['Task A', 'Task B', 'Task C']);
  });

  it('slices to max 3 items', () => {
    const result = parseNextItems('A, B, C, D, E');
    expect(result).toHaveLength(3);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('trims whitespace from items', () => {
    const result = parseNextItems('  A  ,  B  ,  C  ');
    expect(result).toEqual(['A', 'B', 'C']);
  });
});

// ─── breadcrumbs slice ────────────────────────────────────────────────────────

describe('Breadcrumbs (newest-first, max 3 displayed)', () => {
  it('shows all crumbs when ≤ 3', () => {
    const crumbs = ['crumb1', 'crumb2'];
    expect(crumbs.slice(0, 3)).toEqual(['crumb1', 'crumb2']);
  });

  it('slices to 3 when > 3 provided', () => {
    const crumbs = ['c1', 'c2', 'c3', 'c4', 'c5'];
    expect(crumbs.slice(0, 3)).toHaveLength(3);
  });
});

// ─── Source-verification checks ───────────────────────────────────────────────

describe('NowView source contract', () => {
  let src;
  beforeAll(() => { src = fs.readFileSync(SRC, 'utf-8'); });

  it('exports NowView component', () => {
    expect(src).toContain('export const NowView');
  });

  it('imports the shared ProjectList component', () => {
    expect(src).toContain("from '../shared/ProjectList.js'");
  });

  it('renders empty state when no project selected', () => {
    expect(src).toContain('Select a project');
  });

  it('breadcrumbs sliced to 3', () => {
    expect(src).toContain('slice(0, 3)');
  });

  it('next actions parsed with regex split', () => {
    expect(src).toContain('split(/[,\\n]/)');
  });

  it('toggles ecosystem mode with the e key', () => {
    expect(src).toContain("input === 'e'");
    expect(src).toContain('setEcosystemMode');
  });
});
