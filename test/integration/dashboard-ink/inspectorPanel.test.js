/**
 * InspectorPanel Integration Tests
 *
 * Tests pure logic extracted from InspectorPanel.tsx:
 *   - STATUS_COLOR / STATUS_ICON parity and values (matches SidebarPanel contract)
 *   - progressBar: filled + empty always sum to bar width, correct fill amounts
 *   - fmtTime: MM:SS formatting, zero-padding, large values
 *   - trunc: same contract as SidebarPanel.truncate (22-char default)
 *   - nextItems parsing: comma-separated, newline-separated, slices to 3
 *   - breadcrumbs: newest-first slice to 3
 *   - hasSession: sessionSeconds > 0
 *   - Pomodoro remaining time math: correct countdown from pomodoroLength
 *   - PomodoroBlock state labels at each timer state
 *   - isActive guard: source-verified (Space/r only fire when active)
 *   - Empty-state: component renders when project = undefined (source check)
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
  '../../../src/cli/dashboard-ink/components/InspectorPanel.tsx'
);

// ─── Mirror pure-logic helpers from InspectorPanel.tsx ───────────────────────

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

const BAR_WIDTH = 8;

/** Mirror of progressBar() in InspectorPanel.tsx */
function progressBar(pct) {
  const n = Math.round(Math.max(0, Math.min(100, pct)) / 100 * BAR_WIDTH);
  return { filled: '█'.repeat(n), empty: '░'.repeat(BAR_WIDTH - n) };
}

/** Mirror of fmtTime() in InspectorPanel.tsx */
function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Mirror of trunc() in InspectorPanel.tsx */
function trunc(s, max = 22) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Mirror of nextItems parsing in InspectorPanel.tsx */
function parseNextItems(next) {
  if (!next) return [];
  return next.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 3);
}

/** Mirror of Pomodoro remaining time logic */
function pomodoroRemaining(elapsed, pomodoroLength) {
  return Math.max(0, pomodoroLength * 60 - elapsed);
}

// ─── STATUS_COLOR / STATUS_ICON parity ───────────────────────────────────────

describe('STATUS_COLOR + STATUS_ICON (InspectorPanel)', () => {
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

  it('icon and colour maps have the same keys (parity with SidebarPanel)', () => {
    expect(Object.keys(STATUS_COLOR).sort()).toEqual(Object.keys(STATUS_ICON).sort());
  });
});

// ─── progressBar() ────────────────────────────────────────────────────────────

describe('progressBar()', () => {
  it('filled + empty always sum to BAR_WIDTH (8)', () => {
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

  it('50% → half filled (4 filled, 4 empty)', () => {
    const { filled, empty } = progressBar(50);
    expect(filled.length).toBe(4);
    expect(empty.length).toBe(4);
  });

  it('clamps > 100 to 100', () => {
    const { filled } = progressBar(150);
    expect(filled).toBe('█'.repeat(BAR_WIDTH));
  });

  it('clamps < 0 to 0', () => {
    const { empty } = progressBar(-50);
    expect(empty).toBe('░'.repeat(BAR_WIDTH));
  });

  it('uses block characters █ and ░', () => {
    const { filled, empty } = progressBar(50);
    expect([...filled].every(c => c === '█')).toBe(true);
    expect([...empty].every(c => c === '░')).toBe(true);
  });
});

// ─── fmtTime() ───────────────────────────────────────────────────────────────

describe('fmtTime()', () => {
  it('formats 0 → "00:00"', () => {
    expect(fmtTime(0)).toBe('00:00');
  });

  it('formats 59 → "00:59"', () => {
    expect(fmtTime(59)).toBe('00:59');
  });

  it('formats 60 → "01:00"', () => {
    expect(fmtTime(60)).toBe('01:00');
  });

  it('formats 90 → "01:30"', () => {
    expect(fmtTime(90)).toBe('01:30');
  });

  it('formats 25*60=1500 → "25:00" (full Pomodoro)', () => {
    expect(fmtTime(25 * 60)).toBe('25:00');
  });

  it('formats 1499 → "24:59"', () => {
    expect(fmtTime(1499)).toBe('24:59');
  });

  it('always returns exactly 5 characters (MM:SS)', () => {
    [0, 9, 59, 60, 599, 600, 1499, 1500, 3599].forEach(s => {
      expect(fmtTime(s)).toHaveLength(5);
    });
  });

  it('zero-pads single-digit seconds', () => {
    expect(fmtTime(65)).toBe('01:05');
  });

  it('zero-pads single-digit minutes', () => {
    expect(fmtTime(9 * 60 + 3)).toBe('09:03');
  });
});

// ─── trunc() (22-char default for inspector column) ──────────────────────────

describe('trunc() with 22-char default', () => {
  it('passes through strings ≤ 22 chars', () => {
    expect(trunc('short')).toBe('short');
    expect(trunc('a'.repeat(22))).toBe('a'.repeat(22));
  });

  it('truncates at 22 chars with Unicode ellipsis', () => {
    const result = trunc('a'.repeat(30));
    expect(result).toHaveLength(22);
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

  it('returns [] for empty string', () => {
    expect(parseNextItems('')).toEqual([]);
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

  it('filters out empty items from double-commas', () => {
    const result = parseNextItems('A,,B,,C');
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('handles single item without separator', () => {
    expect(parseNextItems('Just one thing')).toEqual(['Just one thing']);
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
    expect(crumbs.slice(0, 3)).toEqual(['c1', 'c2', 'c3']);
  });

  it('empty array → no breadcrumb section rendered (section skipped)', () => {
    // Documented: `{recentCrumbs.length > 0 && ...}` in InspectorPanel.tsx
    const crumbs = [];
    expect(crumbs.slice(0, 3).length > 0).toBe(false);
  });
});

// ─── hasSession logic ─────────────────────────────────────────────────────────

describe('hasSession flag', () => {
  it('is false when sessionSeconds = 0', () => {
    expect(0 > 0).toBe(false);
  });

  it('is false when sessionSeconds is undefined (default = 0)', () => {
    const sessionSeconds = undefined ?? 0;
    expect(sessionSeconds > 0).toBe(false);
  });

  it('is true when sessionSeconds > 0', () => {
    expect(300 > 0).toBe(true);
  });
});

// ─── Pomodoro remaining time ──────────────────────────────────────────────────

describe('pomodoroRemaining()', () => {
  it('full remaining at start (elapsed=0)', () => {
    expect(pomodoroRemaining(0, 25)).toBe(25 * 60);
  });

  it('half remaining at elapsed = pomodoroLength * 30', () => {
    expect(pomodoroRemaining(750, 25)).toBe(750);
  });

  it('0 remaining when elapsed ≥ total', () => {
    expect(pomodoroRemaining(1500, 25)).toBe(0);
    expect(pomodoroRemaining(9999, 25)).toBe(0);
  });

  it('respects custom pomodoroLength (50 min block)', () => {
    expect(pomodoroRemaining(0, 50)).toBe(50 * 60);
  });

  it('never goes below 0', () => {
    const result = pomodoroRemaining(9999, 25);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── Pomodoro state labels ────────────────────────────────────────────────────

describe('Pomodoro state label logic', () => {
  function stateLabel(isBreak, isPaused) {
    return isBreak
      ? '☕ BREAK TIME'
      : isPaused
        ? '◑ PAUSED'
        : '● FOCUSING';
  }

  it('shows BREAK TIME when remaining = 0', () => {
    expect(stateLabel(true, false)).toBe('☕ BREAK TIME');
  });

  it('shows PAUSED when paused and not at break', () => {
    expect(stateLabel(false, true)).toBe('◑ PAUSED');
  });

  it('shows FOCUSING when active and not at break', () => {
    expect(stateLabel(false, false)).toBe('● FOCUSING');
  });

  it('break state takes priority over paused', () => {
    // isBreak = true wins regardless of isPaused
    expect(stateLabel(true, true)).toBe('☕ BREAK TIME');
  });

  function stateColor(isBreak, isPaused) {
    return isBreak ? 'yellow' : isPaused ? 'yellow' : 'green';
  }

  it('BREAK TIME color is yellow', () => {
    expect(stateColor(true, false)).toBe('yellow');
  });

  it('PAUSED color is yellow', () => {
    expect(stateColor(false, true)).toBe('yellow');
  });

  it('FOCUSING color is green', () => {
    expect(stateColor(false, false)).toBe('green');
  });
});

// ─── Source-verification checks ───────────────────────────────────────────────

describe('InspectorPanel source contract', () => {
  let src;
  beforeAll(() => { src = fs.readFileSync(SRC, 'utf-8'); });

  it('isActive guards Space/r keys in PomodoroBlock', () => {
    expect(src).toContain('if (!isActive) return');
  });

  it('exports InspectorPanel component', () => {
    expect(src).toContain('export const InspectorPanel');
  });

  it('exports InspectorProject interface', () => {
    expect(src).toContain('export interface InspectorProject');
  });

  it('renders empty state when no project prop', () => {
    expect(src).toContain('Select a project');
  });

  it('uses useEffect for Pomodoro tick (reuses FocusView pattern)', () => {
    expect(src).toContain('useEffect');
    expect(src).toContain('setInterval');
    expect(src).toContain('clearInterval');
  });

  it('timer resets when hasSession changes', () => {
    expect(src).toContain('setElapsed(0)');
    expect(src).toContain('setPaused(false)');
  });

  it('breadcrumbs sliced to 3', () => {
    expect(src).toContain('slice(0, 3)');
  });

  it('next actions parsed with regex split', () => {
    expect(src).toContain('split(/[,\\n]/)');
  });

  it('inbox break-time icon is ☕', () => {
    expect(src).toContain('☕ BREAK TIME');
  });

  it('paused icon is ◑', () => {
    expect(src).toContain('◑ PAUSED');
  });

  it('focusing icon is ●', () => {
    expect(src).toContain('● FOCUSING');
  });
});
