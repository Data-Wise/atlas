# SPEC: `.STATUS` Parser Hardening (progress-field misparse + duplicate-key silent overwrite)

**Status:** proposed
**Effort:** small — 1 file, additive validation, no schema change
**Origin:** adversarial backend/frontend review of atlas, 2026-07-16 (findings #2/#3), grounded in real footguns hit the same session normalizing 7 research repos' `.STATUS` files (`pmed` progress-as-prose, `measurement error` duplicate stale header block)
**Date:** 2026-07-16

---

## Problem

`StatusFileParser` (`src/adapters/gateways/StatusFileParser.js`) has two silent-failure modes that this session's research-registry normalization work hit directly and had to hand-fix, one `.STATUS` file at a time, with no tooling support:

1. **Progress-field misparse (markdown line 162, YAML line 267)**
   `data.progress = parseInt(value, 10) || 0`. A hand-edited value like
   `progress: manuscript submission prep ON HOLD for manual review...` parses to `0`
   (or, worse, a plausible-but-wrong number if the prose starts with a digit, e.g.
   `Progress: Phase 3 of 5, ~60%` → `3`). No warning, no validation, indistinguishable
   from a genuine 0%/3% project.

2. **Duplicate-key silent overwrite (markdown lines 145–192, YAML lines 224–305)**
   Both parse paths iterate every matching line and unconditionally overwrite
   `data[key]` — last occurrence wins. A `.STATUS` file with a "preserved original
   content" block below an active header (a real pattern in this codebase's own
   research repos) silently produces whichever value happens to appear last, with
   zero signal that a collision occurred.

Both bugs produce **wrong data that looks like valid data** — the worst kind, because
nothing downstream (atlas CLI, obs `manuscript_list`, dashboards) has any way to tell
a real 0% from a misparsed one.

## Non-goals

- No `.STATUS` schema/format change. This is parser-side defense, not a new contract.
- No retroactive re-scan/fix of existing files — this session already hand-fixed the
  7 known-bad repos (PRs merged 2026-07-16). This spec prevents recurrence, not backfill.
- No UI/dashboard changes. Frontend findings (#1, #4 — Inspector stale-data leak,
  Pomodoro timer) are tracked separately and explicitly deferred (see Deferred below).

## Design

### 1. `progress:` validation

Replace the silent `parseInt(value, 10) || 0` coercion with an explicit numeric-only
parse:

```js
function parseProgress(raw, warnings) {
  const trimmed = String(raw).trim();
  const match = trimmed.match(/^(\d{1,3})%?$/);
  if (!match) {
    warnings.push(`progress: non-numeric value "${trimmed}" — parsed as 0, needs a plain integer 0-100`);
    return 0;
  }
  const n = Number(match[1]);
  return Math.min(100, Math.max(0, n));
}
```

Applies to both `_parseMarkdownFormat` (line 162) and `_parseYAMLFormat` (line 267).
Strict match (`^\d{1,3}%?$`) rejects anything with prose attached — `"3"` and `"3%"`
parse; `"Phase 3 of 5"` does not silently become `3`.

### 2. Duplicate-key detection

Track first-seen line number per key during the parse loop; on a second occurrence of
the same top-level key (`status`, `progress`, `priority`, `target`, `next`, `type`,
`kind`), push a warning instead of silently overwriting:

```js
if (data[key] !== undefined && seenAt[key] !== undefined) {
  warnings.push(`duplicate key "${key}" at line ${lineNum} (first seen line ${seenAt[key]}) — using the LAST occurrence, as before`);
}
seenAt[key] = lineNum;
data[key] = value; // behavior unchanged: last-wins — this only adds visibility
```

Deliberately **not** changing which value wins (last-occurrence, matching current
behavior and what `atlas doctor` / `sync --research` users already expect) — only
making the collision visible instead of silent.

### 3. Surface warnings

`StatusFileParser.parse()` already returns a `data` object; extend the return shape
to `{ data, warnings }` (or attach `data._parseWarnings` if changing the return shape
touches too many call sites — pick whichever is the smaller diff once inside the code).
Wire into:
- `atlas sync --from-status` — print warnings inline per project, same place progress/
  status changes are already reported (`~ project: progress: X% → Y%` lines).
- `atlas doctor` — add a check that surfaces any `_parseWarnings` as a doctor finding,
  since doctor already audits `.STATUS`/`CLAUDE.md`/`.obs/sync.yml` contracts.

## Acceptance criteria

- [ ] A `.STATUS` with `progress: some prose here` parses to `progress: 0` **and**
      emits a warning naming the file and the bad value (no more, no less — still 0,
      just not silently).
- [ ] A `.STATUS` with `progress: 45%` or `progress: 45` parses to `45` (unchanged
      correct-input behavior).
- [ ] A `.STATUS` with duplicate `status:`/`progress:`/`target:` keys still resolves
      to the last-occurrence value (unchanged output) **and** emits one warning per
      duplicated key.
- [ ] `atlas sync --from-status` prints these warnings without failing the sync (advisory,
      not blocking — matches existing "research-safe" plain-sync philosophy in
      `CLAUDE.md`'s Research Registry section).
- [ ] `atlas doctor` surfaces the same warnings as findings.
- [ ] Existing parser tests (`test/unit/adapters/gateways/StatusFileParser*.test.js` or
      equivalent — locate via `find test -iname '*statusfile*'`) still pass; add new
      cases for both bugs (prose-progress, duplicate-key).
- [ ] Re-run against this session's already-fixed files (`me-review`, `pmed`, etc.) —
      confirm zero warnings now that they're clean, proving the check isn't overly
      aggressive on well-formed files.

## Test plan

1. Unit tests, new file or extending existing `StatusFileParser.test.js`:
   - `progress: 45` → `{progress: 45, warnings: []}`
   - `progress: some prose 60% done` → `{progress: 0, warnings: [/non-numeric/]}`
   - duplicate `status:` lines → last value wins, one warning
   - duplicate `progress:`/`target:` in a "preserved original content" block (mirrors
     the real `measurement error/.STATUS` shape pre-fix) → warnings for each duplicated
     key, values match current last-wins behavior
2. Integration: run `atlas sync --research` against `~/projects/research/*` (dogfood,
   read-only) — expect **zero** warnings post-fix, confirming this session's manual
   fixes are now enforceable rather than one-off.
3. `atlas doctor` — confirm warnings surface as findings, `--fix` does NOT attempt to
   auto-correct progress/duplicate issues (out of scope — these need human judgment
   about which value is correct).

## Deferred (from the same review, not in this spec's scope)

- **Frontend #1** (`useProjectStats` cross-project stale-data leak on fetch failure,
  [useProjectStats.ts:43,90-94](../../src/cli/dashboard-ink/hooks/useProjectStats.ts))
  — key `lastGoodStats` ref by `projectId`, reset on project-switch effect re-run.
- **Frontend #4** (`PomodoroBlock` ignores real `sessionSeconds`,
  [InspectorPanel.tsx:133-151](../../src/cli/dashboard-ink/components/InspectorPanel.tsx))
  — wire the timer to actual elapsed session time instead of an independent counter.
- **Backend #5** (duplicate `FileSystemProjectRepository` singletons with independent
  caches, `Container.js:135-154`) — collapse to one memoized instance.
- **Backend #6** (FS-vs-SQLite field-coercion drift on `progress`/`description`) —
  move coercion into a shared deserialize helper both repos call.
- **Debug logging leak** (`console.error('[DEBUG scan] ...')` unconditional in
  `FileSystemProjectRepository.scan()`) — gate behind `DEBUG=atlas:*` per CLAUDE.md's
  existing debug convention.

Rationale for deferring: this spec's fix has the highest leverage-to-risk ratio — it
prevents the exact data-corruption class already hit today, is additive/non-breaking,
and touches one file. The frontend/cache items are real but lower urgency (no data
corruption, just UI staleness or wiring debt) and deserve their own spec + worktree
rather than being bundled in.

## Implementation notes

- Branch: `feature/status-parser-hardening` off `dev` (worktree, per CLAUDE.md
  worktree-required-for-code-changes rule).
- Single file touched for the core fix: `src/adapters/gateways/StatusFileParser.js`.
  Secondary touch points: wherever `sync --from-status` reports per-project changes
  (likely `src/use-cases/registry/SyncFromStatus.js` or similar — locate via
  `grep -rl "sync --from-status\|SyncFromStatus" src/use-cases/`), and `atlas doctor`'s
  check list (`src/use-cases/status/` or wherever doctor's checks live —
  `grep -rl "doctor" src/use-cases/`).
- No version bump required for this alone; can ride the next release or ship standalone
  as a patch (`fix:` conventional commit).
