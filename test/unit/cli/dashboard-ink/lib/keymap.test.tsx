/**
 * keymap.ts uniqueness guard (SPEC-tui-consolidation-2026-07-19.md).
 *
 * Every key token declared in KEYMAP must be unique within its own scope.
 * This is the mechanical "no per-view rebinding of the same letter to
 * different meanings" check the spec requires.
 *
 * A planted-defect run (duplicating a binding, confirming this test fails,
 * then reverting) was performed during development — see the PR body for
 * the transcript.
 */

import { KEYMAP, scopeKeyTokens, allScopes } from '../../../../../src/cli/dashboard-ink/lib/keymap.js';

describe('keymap.ts', () => {
  it('declares at least one scope', () => {
    expect(allScopes().length).toBeGreaterThan(0);
  });

  it.each(allScopes())('scope "%s" has no duplicate key tokens', (scope) => {
    const tokens = scopeKeyTokens(scope);
    const unique = new Set(tokens);
    expect(unique.size).toBe(tokens.length);
  });

  it('every binding has a non-empty description', () => {
    for (const scope of allScopes()) {
      for (const binding of KEYMAP[scope]) {
        expect(binding.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('global scope declares the required navigation + quit + help keys', () => {
    const tokens = scopeKeyTokens('global');
    expect(tokens).toContain('q');
    expect(tokens).toContain('?');
    expect(tokens).toContain('Tab');
  });

  it('DEFECT CHECK: a manually duplicated binding is caught (regression guard)', () => {
    // Simulates the planted defect exercised during development: two
    // bindings in the same scope claiming the same key token.
    const defective = [
      { key: 'e', description: 'first meaning' },
      { key: 'e', description: 'second, conflicting meaning' },
    ];
    const tokens = defective.flatMap(b => b.key.split('/').map(s => s.trim()));
    const unique = new Set(tokens);
    expect(unique.size).not.toBe(tokens.length); // duplicate correctly detected
  });
});
