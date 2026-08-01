# SPEC: Cross-Surface Wall-Clock Nudges + Multi-Repo Day-Activity Provider

**Date:** 2026-08-01 (revised same day — adversarial review invalidated the original scheduling design, see "Revision History")
**Status:** Draft — from [BRAINSTORM-cross-surface-nudges-and-day-activity-2026-08-01.md](../../BRAINSTORM-cross-surface-nudges-and-day-activity-2026-08-01.md)
**Tracks:** [Issue #114](https://github.com/Data-Wise/atlas/issues/114)

## Revision History

**v2 (2026-08-01, same day):** An adversarial review of v1 found the original
fire mechanism (`mcp__scheduled-tasks__create_scheduled_task`) doesn't do
what Goal #1 requires — that MCP's own documented contract is "runs while
this app is open; if closed when due, runs on next launch," which is late
delivery, not wall-clock firing, and directly reproduces the bug issue #114
was filed to fix. v2 replaces the entire scheduling backend with `launchd`
and drops the MCP tool from the design. See Design §3/§4 below for the
corrected mechanism; the BRAINSTORM doc's Q1/Q4 answers are superseded by
this revision.

**v2.2 (2026-08-01, same day):** A third adversarial pass (ADHD-coach +
backend + CLI/TUI-UX lenses) against the generated ORCHESTRATE plan, with
findings verified against the actual codebase rather than the spec text.
Six fixes: (1) the repository pattern was wrong for this feature —
`Container.js:185` branches repositories on SQLite-vs-FileSystem, but nudge
state must live in `guards.json` regardless of backend, so a
`SQLiteNudgeRepository` can never legitimately exist; replaced with the
**gateway** pattern (`INudgeStore` / `GuardsFileNudgeStore`), matching
`StatusFileGateway` (Design §1); (2) the hardcoded `~/.claude/guards.json`
path now has a stated resolution order and is documented as a *deliberate*
exception to v0.15.0's `resolveConfigDir()` centralization, rather than
reading as the drift that release existed to fix (Design §1); (3)
`launchctl load` had no failure handling — added post-load verification,
rollback, and an `atlas doctor` reconciliation check, since a silent load
failure would leave `atlas nudge ls` showing a reminder that never fires
(Design §3); (4) `--format` defaulted to `json`, diverging from the
`'table'` default at 8+ `bin/atlas.js` call sites (Design §6); (5) added
the missing guard-key-isolation test — an existing acceptance criterion
with no corresponding test, protecting cc-config's config from corruption
(Test Plan); (6) `atlas dash` surfacing is now an explicitly-stated v1
deferral with rationale, not an unstated omission (Design §6).

**v2.1 (2026-08-01, same day):** A second adversarial pass (coding lens +
ADHD-coach/UX lens) on v2 found four more issues, all fixed in this
revision: (1) `message` was string-interpolated into an `osascript -e`
AppleScript literal with no escaping — an unattended local-injection path,
fixed via `on run argv` + execFile argument array (Design §4); (2) every
nudge was silently daily-recurring with no way to request a one-time
reminder, contradicting the issue's own "stop me at 23:00" example — fixed
with `--daily` (default: one-shot) (Design §3); (3) `ack`'s "unload +
delete the plist" behavior was undifferentiated and self-contradicted
"daily" recurrence in the same paragraph — fixed by branching `ack` on
`recurring` and promoting `atlas nudge rm` from "future command" to
shipped-in-v1 (Design §3); (4) exact `HH:MM`-only input was flagged as an
ADHD-friction gap — resolved by explicitly scoping natural-language time
input out of v1 (Non-goals) rather than leaving it unaddressed.

## Problem

Two adaptations from `ravila4/claude-adhd-skills` need a home outside a
Claude Code hook, because both need to survive session end and/or work
across surfaces (Claude Code + Cowork, which has no hook mechanism):

1. **Wall-clock nudges** ("stop me at 23:00") — session-scoped hooks
   (`cc-config`'s `pacing-nudge.sh`) only fire on `UserPromptSubmit`, so a
   nudge set while nothing is being prompted never fires, and a nudge set in
   Claude Code is invisible in Cowork.
2. **Multi-repo day-activity** — `research-day-log` (a savant skill) needs a
   day's activity across four project trees (`r-packages/`, `research/`,
   `teaching/`, `dev-tools/`); upstream's reference implementation only
   reads one repo's git log.

Atlas is the state hub with registry + sessions + capture already in place,
so both land here.

## Goals

1. `atlas nudge add "23:00" "message"` schedules a wall-clock reminder that
   fires even if no Claude Code or Cowork session is open at fire time.
2. `atlas nudge ls` / `atlas nudge ack <id>` surface and clear pending
   nudges from any surface (shared state, not session-local).
3. `atlas day --date YYYY-MM-DD` returns a JSON summary of a day's activity
   (commits + `.STATUS` diffs + per-lane session time) across the
   registry's tracked project trees.
4. Nudge state lives in `~/.claude/guards.json`, alongside `cc-config`'s
   existing guard entries — one file, one source of truth, no new SQLite
   store for this feature.

## Non-goals (explicitly out of scope)

- **Session-scoped nudges** ("2h on this, stuck?") — stay owned by
  `cc-config`'s `pacing-nudge.sh`; this spec only covers the wall-clock
  class.
- **`atlas day` as a source of truth.** It is explicitly a memory aid; the
  consuming skill (`research-day-log`) must ask the user first and offer
  this data second. No behavior here should imply commits/`.STATUS` diffs
  are authoritative about what mattered in a day.
- **Cross-platform push notifications or scheduling.** macOS-only for v1:
  `launchd` for scheduling, `osascript` for notification. No Windows/Linux
  equivalent.
- **Using `mcp__scheduled-tasks__*` for firing.** Its documented contract
  ("runs while this app is open; if closed when due, runs on next launch")
  cannot satisfy Goal #1 — confirmed via `ToolSearch` during spec review,
  not a design preference. It is not used anywhere in this feature.
- **Locking `guards.json` against concurrent writers.** Writes from
  atlas and `cc-config` are human-paced and infrequent; a race is a known,
  accepted low risk, not solved here.
- **Deriving the 4-repo list from the project registry automatically** —
  v1 ships with the four trees named in the issue; wiring `atlas day`'s
  tree list to the existing `~/projects` registry scan is a fast-follow,
  not blocking v1.
- **Natural-language / relative time input** (`"+30m"`, `"tonight"`,
  `"11pm"`) for `atlas nudge add`. Flagged by adversarial review as a real
  ADHD-friction gap — the target audience benefits from not having to
  compute an exact `HH:MM` mid-task — but picking and validating a parser
  is its own scoped decision (which formats, which library/hand-rolled
  regex, ambiguity handling for "6" — 6am or 6pm?) that shouldn't block
  v1's core mechanism. v1 requires strict `HH:MM` (24h); a follow-up issue
  should scope the parser explicitly rather than bolting one on here.

## Design

### 1. `Nudge` domain entity (new, not a `ScheduleRecord` variant) — one-shot, no `recurrence` field

`ScheduleRecord` is date-scoped (`YYYY-MM-DD`) and sourced from
`.STATUS`/teach-config parsing with its own `TYPES` validation. A nudge is
wall-clock time-of-day + free-text message + ack state — different enough
lifecycle to warrant a new entity rather than bolting fields onto
`ScheduleRecord`.

**No `recurrence` field** (dropped in v2): recurrence is scheduling
information, and the only place scheduling now lives is the `launchd`
plist (Design §3). A "daily" nudge is a `launchd` job with a
`StartCalendarInterval` that re-invokes `atlas nudge fire <id>` every day —
atlas never caches a second copy of "how often" that could drift from the
actual OS job. `Nudge` itself becomes purely: was it fired, was it acked.

```javascript
// src/domain/entities/Nudge.js
export class Nudge {
  static STATES = ['pending', 'fired', 'acked']

  constructor({ id, time, message, recurring = false, state = 'pending', createdAt }) {
    this._validate(time, message)
    this.id = id || this._generateId()
    this.time = time // HH:MM, 24h — display only; the launchd plist is authoritative for actual firing
    this.message = message.trim()
    this.recurring = recurring // true only for --daily; the plist's StartCalendarInterval is still authoritative for the actual schedule — this is display/ack-branching state, not a second source of scheduling truth
    this.state = state
    this.createdAt = createdAt || new Date().toISOString()
  }

  _validate(time, message) {
    if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('Nudge time must be HH:MM')
    if (!message || !message.trim()) throw new Error('Nudge message cannot be empty')
  }
}
```

**Persistence: a gateway, not a repository (v2.2 fix).** The first draft
said this "follows the existing entity → repository-interface → FS/SQLite
pattern (`ScheduleRecord` → `IScheduleRecordRepository` → `FileSystem*` /
`SQLite*`)." That pattern is the wrong shape here and must not be copied:
`Container.js:185`'s `getScheduleRecordRepository()` branches on the
configured storage backend, returning `SQLiteScheduleRecordRepository` when
`storage: 'sqlite'`. Nudge state, by contrast, **must** live in
`~/.claude/guards.json` regardless of backend — that file is the
cross-surface contract (§2), read by cc-config and any other surface. So a
`SQLiteNudgeRepository` could never legitimately exist: writing nudges into
atlas's SQLite DB would break the very guarantee this feature exists for.
Copying the pattern would force either that broken second implementation,
or a repo registered in the backend-branching Container that silently
ignores the user's `storage: 'sqlite'` setting — an undocumented
inconsistency with every other repository there.

Use the **gateway** pattern instead — atlas already has this exact concept
for fixed-location external files (`StatusFileGateway`, `GitGateway` in
`src/adapters/gateways/`), which are backend-independent by design and are
*not* registered through the storage-branching repository accessors:

- `src/domain/gateways/INudgeStore.js` — interface (`add`, `get`, `list`,
  `update`, `remove`).
- `src/adapters/gateways/GuardsFileNudgeStore.js` — the single
  implementation; reads/writes the `nudges` key in `guards.json`.
- Registered in `Container.js` as a plain gateway accessor
  (`getNudgeStore()`), **not** via the `storage`-branching repository
  block — matching how `StatusFileGateway` is wired.

**Path resolution — a deliberate, documented exception to `resolveConfigDir()`.**
atlas v0.15.0 centralized config-dir resolution precisely to kill hardcoded
paths (`src/utils/configPath.js`, 8 call sites). `guards.json` is
nonetheless resolved **outside** that mechanism, because it is not atlas's
config file — it belongs to the shared Claude-surface layer, and relocating
atlas's own config dir (via `ATLAS_CONFIG`/XDG) must *not* move it, or the
cross-surface contract breaks. Resolution order for this one file:

1. `ATLAS_GUARDS_FILE` env var (escape hatch, testing).
2. `${CLAUDE_CONFIG_DIR:-~/.claude}/guards.json`.

This exception is stated here so it reads as intentional rather than as the
drift v0.15.0 was fixing; `resolveConfigDir()` is untouched and remains
authoritative for everything atlas actually owns.

### 2. Storage: `~/.claude/guards.json`, new `nudges` key

```json
{
  "guards": { "branch-guard": {...}, "no-switch-guard": {...}, "reference-scope-guard": {...} },
  "nudges": {
    "wall-clock": [
      { "id": "n_abc123", "time": "23:00", "message": "hard stop - wrap up and close the worktree", "state": "pending", "createdAt": "2026-08-01T14:00:00Z" }
    ]
  }
}
```

`FileSystemNudgeRepository` reads the whole file, merges its own key,
writes back — never touches the `guards` key. Direct read/write is chosen
over waiting for `cc-config` to expose a shared schema/lib, because
`cc-config` is not yet a bootstrapped repo (only draft issue files exist at
`~/Downloads/adhd-issues/`).

### 3. Scheduling backend: `launchd` (not MCP)

**v1 design invalidated by adversarial review — see Revision History.**
`mcp__scheduled-tasks__create_scheduled_task`'s own contract ("runs while
this app is open; if closed when due, runs on next launch") is a deferred-
delivery mechanism for agent automation, not an OS-level alarm — it cannot
fire at 23:00 if Claude Code was closed at 22:00. It is dropped from this
design entirely.

**`--once` (default) vs `--daily` (adversarial review fix):** v2's first
pass silently made every nudge daily-recurring by default with no way to
request a single reminder — contradicting the issue's own motivating
example ("stop me at 23:00," read naturally as tonight-only). Corrected CLI:

```
atlas nudge add <time> <message> [--daily]   # default: one-shot (fires once, today or tomorrow if HH:MM already passed)
```

`AddNudgeUseCase`:

1. Persists the `Nudge` to `guards.json` (§2), with `recurring` set from
   the `--daily` flag. This narrows (doesn't reverse) the dropped-
   `recurrence` decision above: `recurring` is a boolean the `Nudge`
   itself needs for `ack`-branching (below), not a schedule description —
   the actual schedule (which day, what interval) still lives solely in
   the `launchd` plist, never duplicated onto the entity.
2. Writes a per-nudge `launchd` plist to
   `~/Library/LaunchAgents/com.data-wise.atlas-nudge.<id>.plist`, with a
   `ProgramArguments` invoking `atlas nudge fire <id>` and a
   `StartCalendarInterval` set to the requested `HH:MM`:
   - `--daily` → interval omits `Day`/`Month` (launchd fires every day at
     that time).
   - default (one-shot) → interval includes the current calendar `Day`/
     `Month`/`Year` explicitly, so `launchd` fires exactly once.
3. Loads it: `launchctl load ~/Library/LaunchAgents/com.data-wise.atlas-nudge.<id>.plist`.
4. **Verifies the load actually took** — `launchctl list | grep
   com.data-wise.atlas-nudge.<id>` (or `launchctl print`). A silent
   `launchctl load` failure (malformed plist, a label already loaded from a
   prior same-id attempt, permission/SIP issue) would otherwise leave a
   `pending` record in `guards.json` and a plist on disk with **nothing
   scheduled** — `atlas nudge ls` confidently showing a reminder that will
   never fire, which is the worst possible failure for this feature.
5. **Rolls back on failure** — if step 4 doesn't find the loaded job, delete
   the plist file and remove the `Nudge` record from `guards.json`, then
   exit non-zero with the `launchctl` stderr. Never leave a half-registered
   nudge behind. (Ordering note: write the plist and load it *before*
   committing the `Nudge` record where practical, so the rollback surface is
   as small as possible.)

**Reconciliation (`atlas doctor` integration):** `atlas doctor` gains a
nudge-layer check comparing `guards.json` records against actually-loaded
`launchd` jobs — a record with no loaded job (or a loaded
`com.data-wise.atlas-nudge.*` job with no record) is reported as drift with
a `--fix` path (`nudge rm` the orphan, or re-load the missing job). This is
the standing repair mechanism for any partial failure that escapes the
step-5 rollback (e.g. a job unloaded out-of-band by the OS or the user).

This runs entirely at the OS level — no Claude app, MCP connection, or
open session required at fire time.

**`ack` vs `rm` — differentiated by `recurring` (adversarial review fix):**
v2's first pass had `ack` both clear `state` and delete the plist
unconditionally, which silently kills a daily reminder after its first
firing — contradicted "daily" in the same paragraph it was defined in.
Corrected:

- `atlas nudge ack <id>` — sets `state: 'acked'` in `guards.json` only.
  For a one-shot nudge (`recurring: false`), also unloads and deletes the
  plist (nothing left to fire again). For a `--daily` nudge, the plist
  stays loaded — tomorrow's firing sets `state` back to `'fired'`
  regardless of today's ack, which is the intended "remind me every day"
  behavior.
- `atlas nudge rm <id>` (**shipped in v1**, not deferred — the earlier
  draft mentioned this only as "a future command," which left no cleanup
  path at all for a forgotten nudge) — unloads and deletes the plist and
  removes the `Nudge` from `guards.json`, regardless of `recurring` or
  `state`. This is the only way to stop a `--daily` nudge, and the only
  cleanup path for a one-shot nudge nobody got around to acking.

### 4. Fire behavior: `atlas nudge fire <id>` (new CLI subcommand, invoked by launchd)

The `launchd` job's `ProgramArguments` is `["atlas", "nudge", "fire",
"<id>"]` — a plain shell invocation, fully self-contained, no Claude runtime
involved. `FireNudgeUseCase`:

1. Looks up the `Nudge` by `id` in `guards.json` and reads its `message`
   **from there** — the launchd `ProgramArguments` passes only the `id`,
   never the message text itself, so there is no message content on the
   command line to escape at invocation time.
2. Runs `osascript` with `-e` given as a **separate execFile argument
   array entry**, never string-concatenated with the message:
   `execFile('osascript', ['-e', 'on run argv', '-e', 'display
   notification (item 1 of argv) with title "atlas nudge"', '-e', 'end
   run', message])` — the message is passed as an AppleScript `argv` item
   (`on run argv`), not interpolated into the script text, closing the
   AppleScript-injection path a naive `-e 'display notification
   "<message>"...'` string build would have (adversarial review finding:
   an unescaped `"` in `message` could otherwise break out of the string
   literal and run arbitrary AppleScript unattended, since `launchd` fires
   with nobody present to notice).
3. Sets the `Nudge`'s `state: 'fired'` directly in `guards.json`.

**Applies to `AddNudgeUseCase` too:** `message` is written into `guards.json`
as plain JSON string data (never string-concatenated into a shell/AppleScript
command at *add* time), so the only place raw `message` text ever reaches an
interpreter is the argv-safe `osascript` call in `fire`, above.

Any surface (Claude Code, Cowork, a plain terminal) that later runs `atlas
nudge ls` reads `guards.json` live and sees the fired-but-unacked nudge
immediately — this is the cross-surface visibility mechanism. No polling
task, no MCP dependency, no queue beyond the `Nudge.STATES` model itself.
(A hybrid design using an MCP scheduled task to proactively ping open
sessions was considered and explicitly rejected as unnecessary complexity —
`atlas nudge ls` being queryable from any surface already satisfies the
cross-surface goal.)

### 5. `atlas day --date YYYY-MM-DD`

New use case `GetDayActivityUseCase`, iterating the four hardcoded trees
(`r-packages/`, `research/`, `teaching/`, `dev-tools/` under the user's
`~/projects` root), per tree:

- **Input validation, before any git call:** `--date` must match
  `/^\d{4}-\d{2}-\d{2}$/` — reject with a clean CLI error otherwise. This is
  defense-in-depth *in addition to* execFile (below), not a substitute for
  it (adversarial review finding: string-interpolated `exec()` + unvalidated
  CLI input is the execSync-class risk this project's own CLAUDE.md rule
  exists to prevent).
- **Two new `GitGateway` methods** (adversarial review finding: `GitGateway`
  today only has `getStatus()` — no log/date-range/pathspec capability
  exists to "reuse"; this is net-new, not a reuse of existing behavior):
  - `getCommitsSince(projectPath, date)` → `execFile('git', ['log',
    '--since=<date>', '--until=<date+1>', '--oneline'], {cwd: projectPath})`
  - `getStatusDiff(projectPath, date)` → `execFile('git', ['log', '-p',
    '--since=<date>', '--until=<date+1>', '--', '.STATUS'], {cwd:
    projectPath})`
  - Both use `execFile` with an argument array (never a string-interpolated
    `exec()`), matching the project's execFileSync-over-execSync rule.
  - `.STATUS`-only pathspec scoping is deliberate, not a full multi-file
    diff — a full diff was explicitly rejected (BRAINSTORM Q6) as it
    re-introduces the "commits are a bad proxy" problem this feature exists
    to avoid.
- Existing atlas session data: per-lane elapsed time for that date, if a
  session was tracked.

Output: merged JSON keyed by tree name, each with `{commits: [...],
statusDiffs: [...], sessionMinutes: N}`.

### 6. CLI surface

```
atlas nudge add <time> <message> [--daily]   # default: one-shot
atlas nudge fire <id>    # invoked by launchd, not meant for interactive use
atlas nudge ls [--format <table|json>]       # default: table
atlas nudge ack <id>
atlas nudge rm <id>      # v1 — cleanup path for daily nudges and forgotten one-shots
atlas day [--date YYYY-MM-DD] [--format <table|json>]   # default: table
```

**`--format` defaults to `table`, not `json` (v2.2 fix).** The earlier draft
had `atlas day [--format json]`, which would have made it the only atlas
command whose bare invocation dumps raw JSON at a human terminal.
`bin/atlas.js` establishes the opposite convention at 8+ call sites
(lines 78, 102, 348, 436, 1089, 1648, 1736):
`.option('--format <format>', 'Output format (table|json)', 'table')`.
`atlas day`'s programmatic consumer (savant's `research-day-log`) passes
`--format json` explicitly; the interactive user — who will absolutely run
`atlas day` bare first — gets a table like everywhere else.

**Dashboard surfacing (`atlas dash`) — v1 scope decision, stated not omitted.**
Fired-but-unacked nudges are **not** surfaced in the Ink dashboard in v1.
This is a real tension worth naming: a feature premised on "the user won't
remember on their own" that requires remembering to run `atlas nudge ls` is
partly self-defeating, and `NowView.tsx` is the natural host (it already
surfaces active session + pending captures via `usePendingCaptures`). It is
deferred rather than dropped because the OS notification — not the
dashboard — is v1's delivery guarantee, and a `useNudges` hook is a
self-contained additive change that doesn't alter any v1 contract. **Track
as a fast-follow issue at implementation time**, mirroring
`usePendingCaptures`'s 10s-poll pattern.

Two independent use-case additions in one PR (per the scope decision below)
— structured so each can be reviewed/rolled back on its own even though
they're tracked under one issue.

## Acceptance Criteria

- [ ] `atlas nudge add "23:00" "wrap up"` creates a `Nudge`, persists it to
      `guards.json` under `nudges.wall-clock`, and writes + loads a
      `launchd` plist at `~/Library/LaunchAgents/com.data-wise.atlas-nudge.<id>.plist`.
- [ ] **Killing every Claude surface entirely** (Claude Code quit, Cowork
      closed, no MCP connection alive) and waiting past the fire time still
      produces an OS notification at the correct wall-clock time — not on
      next app launch (manual E2E; this is the core guarantee the v1 design
      failed and v2 exists to fix).
- [ ] `atlas nudge fire <id>` run directly (simulating what launchd invokes)
      calls `osascript` and sets `state: 'fired'` in `guards.json` with no
      Claude runtime present in the process tree.
- [ ] `atlas nudge ls` shows pending and fired-but-unacked nudges from a
      **different** session/surface than the one that created it (proves
      shared-state via `guards.json`, not session-local).
- [ ] `atlas nudge ack <id>` on a one-shot (default) nudge sets
      `state: 'acked'`, unloads and deletes the `launchd` plist, and the
      nudge no longer appears in `atlas nudge ls` default output.
- [ ] `atlas nudge ack <id>` on a `--daily` nudge sets `state: 'acked'`
      but does **not** unload the plist; the next day's scheduled fire
      still runs and resets `state` to `'fired'`.
- [ ] `atlas nudge rm <id>` unloads and deletes the plist and removes the
      `Nudge` from `guards.json`, for both one-shot and `--daily` nudges,
      regardless of current `state`.
- [ ] A `message` containing a double-quote, backslash, and AppleScript
      metacharacters (e.g. `wrap up" & do shell script "echo pwned`) fires
      a plain, literal notification with that exact text — no shell/
      AppleScript side effect occurs (proves the `on run argv` fix closes
      the injection path).
- [ ] Existing `guards.json` guard keys (`branch-guard`, etc.) are
      byte-for-byte unaffected by a `nudge add`/`fire`/`ack` round-trip that
      touches no guard state.
- [ ] `atlas day --date 2026-08-01` returns JSON with all four tree keys
      present (empty arrays for trees with no activity that day, not
      omitted keys).
- [ ] `.STATUS` diffs in `atlas day` output come only from `.STATUS`
      pathspec-scoped `git log -p`, verified by a repo where a non-`.STATUS`
      file changed on the same date and does NOT appear in `statusDiffs`.
- [ ] `atlas day --date not-a-date` is rejected by CLI-level validation
      before any `git`/`execFile` call is made (no git error leaks through).

## Test Plan

Tiers: `unit` + `integration` (`launchd` plist read/write + `launchctl`
load/unload) + `count-cascade` dogfood (N/A until a CLI-command count
validator exists for atlas — revisit if one is added). No `dependency`
tier — MCP is no longer part of this design.

- `test/unit/domain/entities/Nudge.test.js` — time format validation,
  message validation, default state, confirms no `recurrence` field exists.
- `test/unit/use-cases/nudge/AddNudge.test.js` — persists under `nudges`
  key without touching `guards` key; writes a plist with the correct
  `StartCalendarInterval` for the given `HH:MM`, `Day`/`Month`/`Year`
  present for default (one-shot) and absent for `--daily`.
- `test/unit/use-cases/nudge/FireNudge.test.js` — calls `osascript` via
  `on run argv` with the message as an argv item (mocked execFile,
  asserting no string concatenation of `message` into the `-e` script
  text); sets `state: 'fired'`, with no dependency on any Claude/MCP
  runtime; a message containing `"`, `\`, and `` ` `` round-trips as
  literal text with no code execution.
- `test/unit/use-cases/nudge/AckNudge.test.js` — one-shot: unloads +
  deletes the plist. `--daily`: state set to `'acked'`, plist left loaded
  (asserts `launchctl unload` is NOT called).
- `test/unit/use-cases/nudge/RmNudge.test.js` — unloads + deletes the
  plist and removes the `Nudge` record, for both one-shot and `--daily`,
  regardless of current `state`.
- `test/unit/adapters/gateways/GuardsFileNudgeStore.test.js` — **guard-key
  isolation** (v2.2 fix — this was an acceptance criterion with no
  corresponding test): seed a `guards.json` containing real `guards`
  entries, run a full `add` → `fire` → `ack` → `rm` cycle, assert the
  `guards` key is byte-for-byte identical afterward. Without this, a
  read-modify-write bug (writing only the `nudges` object, or reformatting/
  reordering the JSON) would silently corrupt cc-config's `branch-guard`
  settings with nothing catching it.
- `test/unit/use-cases/nudge/AddNudge.rollback.test.js` — a failing
  `launchctl load` (mocked non-zero exit / absent from `launchctl list`)
  leaves **no** plist file and **no** `Nudge` record behind, and exits
  non-zero.
- `test/unit/use-cases/day/GetDayActivity.test.js` — `.STATUS`-only
  pathspec scoping; empty-tree-produces-empty-array (not omitted key);
  malformed `--date` rejected before any `execFile` call; asserts
  `execFile` (argument array) is used, not `exec` (string).
- Manual E2E (documented in PR body per `e2e-before-pr.md`): schedule a
  near-future nudge, **fully quit Claude Code and Cowork**, confirm the OS
  notification fires unattended at the correct wall-clock time, and
  `atlas nudge ls` from a fresh terminal shows it as fired-unacked.

## Documentation Scaffold

- [x] `docs/CLI-REFERENCE.md` — new `atlas nudge *` / `atlas day` commands.
- [x] `CHANGELOG.md` `[Unreleased]` — mirror entry.
- [ ] `docs/REFCARD.md` — N/A, defer until usage patterns settle.
- [ ] Demo GIF — N/A, not a visually distinct enough interaction yet.
- [ ] `docs/ARCHITECTURE.md` Mermaid diagram — N/A for v1; promote the
      BRAINSTORM's diagram here only if the `Nudge` entity pattern proves
      durable post-implementation.

## Risks

- **`guards.json` write races** — accepted, not solved (see Non-goals);
  now also written by `atlas nudge fire`, which runs unattended via
  `launchd` with no user present to notice a corrupt write.
- **`launchd`/`osascript` are macOS-only** — accepted for v1 (see
  Non-goals).
- **Per-nudge plist file management** — one plist file per active nudge
  under `~/Library/LaunchAgents/`; needs cleanup on `ack`/`rm` to avoid
  accumulating stale `launchd` jobs. Not present in v1's MCP-based design
  (which had no local files) — new operational surface introduced by the
  v2 fix.
- **Hardcoded 4-repo list will drift** — fast-follow to derive from the
  project registry, not blocking v1.

## Next Step

```bash
/craft:plan docs/specs/SPEC-cross-surface-nudges-and-day-activity-2026-08-01.md
```
or hand off via `--orch` for multi-agent implementation planning.
