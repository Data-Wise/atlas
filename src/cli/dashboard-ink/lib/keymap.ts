/**
 * keymap.ts — Single source of truth for dashboard keybindings.
 *
 * Every key the Ink dashboard responds to is declared here, grouped by
 * scope. A key MUST be unique within its own scope — the same letter can
 * mean different things in different scopes (that's expected, e.g. `e` is
 * "toggle ecosystem" in `now` and "cycle energy" in `plan`), but it can
 * never be rebound to two different meanings *within* the same scope.
 *
 * `keymapTest.ts` (test/unit/cli/dashboard-ink/lib/keymap.test.tsx) asserts
 * this uniqueness mechanically — see that file for the planted-defect check
 * referenced in the PR body.
 */

export interface KeyBinding {
  /** The key or input string, e.g. 'j', 'q', 'Tab', 'Space', '?'. */
  key: string;
  /** One-line description shown in the help overlay. */
  description: string;
}

export type KeymapScope = 'global' | 'now' | 'timer' | 'plan' | 'help';

/**
 * Global keys — active in every view, dispatched once in App.tsx before
 * per-view handlers run.
 */
export const GLOBAL_KEYS: KeyBinding[] = [
  { key: '1 / n', description: 'Switch to Now view' },
  { key: '2 / t', description: 'Switch to Timer view' },
  { key: '3 / p', description: 'Switch to Plan view' },
  { key: 'Tab', description: 'Cycle layout (single / split / triple)' },
  { key: 'q', description: 'Quit' },
  { key: '?', description: 'Toggle this help overlay' },
];

/** Now view — project list + detail (absorbs Main/Detail/Inspector/Ecosystem). */
export const NOW_KEYS: KeyBinding[] = [
  { key: 'j / k / ↓ / ↑', description: 'Navigate project list' },
  { key: 'Enter', description: 'Select project' },
  { key: 'e', description: 'Toggle ecosystem-wide stats in the right pane' },
  { key: 'a', description: 'Ack all fired nudges' },
];

/** Timer view — the single Pomodoro implementation (absorbs Focus/Zen/Inspector timer). */
export const TIMER_KEYS: KeyBinding[] = [
  { key: 'Space', description: 'Pause / resume' },
  { key: 'r', description: 'Reset timer (while paused)' },
  { key: '+ / -', description: 'Adjust duration (while paused)' },
  { key: 'z', description: 'Toggle zen (minimal chrome)' },
];

/** Plan view — morning ritual (absorbs Plan/Analytics). */
export const PLAN_KEYS: KeyBinding[] = [
  { key: 'j / k / ↓ / ↑', description: 'Navigate suggestions' },
  { key: 'Enter', description: 'Execute suggestion' },
  { key: 'e', description: 'Cycle energy level' },
  { key: 's', description: 'Start session' },
  { key: 'a', description: 'Toggle analytics pane' },
];

export const KEYMAP: Record<KeymapScope, KeyBinding[]> = {
  global: GLOBAL_KEYS,
  now: NOW_KEYS,
  timer: TIMER_KEYS,
  plan: PLAN_KEYS,
  help: [{ key: '? / Esc', description: 'Close this overlay' }],
};

/**
 * Extract the literal key tokens declared for a scope (splits combos like
 * "j / k / ↓ / ↑" into individual tokens for the uniqueness check).
 */
export function scopeKeyTokens(scope: KeymapScope): string[] {
  return KEYMAP[scope].flatMap(b => b.key.split('/').map(s => s.trim()));
}

/** All scopes declared in the keymap. */
export function allScopes(): KeymapScope[] {
  return Object.keys(KEYMAP) as KeymapScope[];
}

export default KEYMAP;
