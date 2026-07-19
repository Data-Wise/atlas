/**
 * PomodoroTimer Integration Tests
 *
 * Migrated from the pre-consolidation inspectorPanel.test.js /
 * FocusView / ZenView (SPEC-tui-consolidation-2026-07-19.md — there is now
 * exactly ONE Pomodoro timer implementation: shared/PomodoroTimer.tsx).
 *
 * Tests pure logic extracted from shared/PomodoroTimer.tsx:
 *   - fmtTime: MM:SS formatting, zero-padding, large values
 *   - pomodoroRemaining: countdown math
 *   - Pomodoro state labels at each timer state, in both dense/full chrome
 *   - isActive guard: source-verified (Space/r/Esc only fire when active)
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
  '../../../src/cli/dashboard-ink/components/shared/PomodoroTimer.tsx'
);

/** Mirror of fmtTime formatting in PomodoroTimer.tsx */
function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Mirror of the `remaining` calc in PomodoroTimer.tsx */
function pomodoroRemaining(elapsed, durationMinutes) {
  return Math.max(0, durationMinutes * 60 - elapsed);
}

/** Mirror of the statusLabel mapping in PomodoroTimer.tsx */
function stateLabel(isBreak, isPaused, dense) {
  return isBreak
    ? (dense ? '☕ BREAK' : '☕ BREAK TIME')
    : isPaused
      ? '◑ PAUSED'
      : (dense ? '● FOCUS' : '● FOCUSING');
}

function stateColor(isBreak, isPaused) {
  return isBreak ? 'yellow' : isPaused ? 'yellow' : 'green';
}

// ─── fmtTime() ───────────────────────────────────────────────────────────────

describe('fmtTime()', () => {
  it('formats 0 → "00:00"', () => {
    expect(fmtTime(0)).toBe('00:00');
  });

  it('formats 90 → "01:30"', () => {
    expect(fmtTime(90)).toBe('01:30');
  });

  it('formats 25*60=1500 → "25:00" (full Pomodoro)', () => {
    expect(fmtTime(25 * 60)).toBe('25:00');
  });

  it('always returns exactly 5 characters (MM:SS)', () => {
    [0, 9, 59, 60, 599, 600, 1499, 1500, 3599].forEach(s => {
      expect(fmtTime(s)).toHaveLength(5);
    });
  });

  it('zero-pads single-digit minutes and seconds', () => {
    expect(fmtTime(65)).toBe('01:05');
    expect(fmtTime(9 * 60 + 3)).toBe('09:03');
  });
});

// ─── pomodoroRemaining() ──────────────────────────────────────────────────────

describe('pomodoroRemaining()', () => {
  it('full remaining at start (elapsed=0)', () => {
    expect(pomodoroRemaining(0, 25)).toBe(25 * 60);
  });

  it('0 remaining when elapsed >= total', () => {
    expect(pomodoroRemaining(1500, 25)).toBe(0);
    expect(pomodoroRemaining(9999, 25)).toBe(0);
  });

  it('respects custom duration (50 min block)', () => {
    expect(pomodoroRemaining(0, 50)).toBe(50 * 60);
  });

  it('never goes below 0', () => {
    expect(pomodoroRemaining(9999, 25)).toBeGreaterThanOrEqual(0);
  });
});

// ─── Pomodoro state labels (both chrome modes) ───────────────────────────────

describe('Pomodoro state label logic', () => {
  it('full chrome: shows BREAK TIME / PAUSED / FOCUSING', () => {
    expect(stateLabel(true, false, false)).toBe('☕ BREAK TIME');
    expect(stateLabel(false, true, false)).toBe('◑ PAUSED');
    expect(stateLabel(false, false, false)).toBe('● FOCUSING');
  });

  it('dense (zen) chrome: shows shorter BREAK / PAUSED / FOCUS', () => {
    expect(stateLabel(true, false, true)).toBe('☕ BREAK');
    expect(stateLabel(false, true, true)).toBe('◑ PAUSED');
    expect(stateLabel(false, false, true)).toBe('● FOCUS');
  });

  it('break state takes priority over paused, in both modes', () => {
    expect(stateLabel(true, true, false)).toBe('☕ BREAK TIME');
    expect(stateLabel(true, true, true)).toBe('☕ BREAK');
  });

  it('colors: BREAK/PAUSED yellow, FOCUS green', () => {
    expect(stateColor(true, false)).toBe('yellow');
    expect(stateColor(false, true)).toBe('yellow');
    expect(stateColor(false, false)).toBe('green');
  });
});

// ─── Source-verification checks ───────────────────────────────────────────────

describe('PomodoroTimer source contract (single implementation)', () => {
  let src;
  beforeAll(() => { src = fs.readFileSync(SRC, 'utf-8'); });

  it('exports exactly one PomodoroTimer component', () => {
    const matches = src.match(/export const PomodoroTimer/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('isActive guards Space/r/Esc keys', () => {
    expect(src).toContain('if (!isActive) return');
  });

  it('supports the dense (zen) chrome toggle', () => {
    expect(src).toContain('dense');
  });

  it('uses useEffect for the tick (single timer loop)', () => {
    expect(src).toContain('useEffect');
    expect(src).toContain('setInterval');
    expect(src).toContain('clearInterval');
  });

  it('there is exactly one Pomodoro timer implementation in dashboard-ink', () => {
    // Mechanical guard for the spec's "exactly 1 timer implementation"
    // acceptance criterion: no other component file defines its own
    // setInterval-based countdown against a Pomodoro duration.
    const componentsDir = path.resolve(__dirname, '../../../src/cli/dashboard-ink/components');
    const files = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.tsx')) files.push(full);
      }
    })(componentsDir);

    const timerImpls = files.filter(f => {
      const content = fs.readFileSync(f, 'utf-8');
      const hasTick = content.includes('setInterval');
      const hasCountdown = content.includes('duration * 60') || content.includes('totalSecs');
      return hasTick && hasCountdown;
    });

    expect(timerImpls).toHaveLength(1);
    expect(timerImpls[0]).toBe(SRC);
  });
});
