# SPEC: flow-cli ↔ atlas CLI Integration Reconciliation

> Status: implemented (pending PR)
> Created: 2026-06-13
> Approved: 2026-06-13
> Implemented: 2026-06-13 (branch feature/flow-cli-contract-flags)
> From Brainstorm: /workflow:brainstorm -d -s (deep + save) — derived from live cross-repo audit
> Target Version: atlas **v0.9.3** (focused maintenance release, before v0.10.0 temporal intelligence), ATLAS-CONTRACT.md v1.1.0
> Scope: **atlas repo only** (flow-cli changes tracked as Out of Scope / sibling follow-up)
> Branch (when implemented): feature/flow-cli-contract-flags (off `dev`)

## Decisions (resolved 2026-06-13 via deep spec review)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Ship as **v0.9.3 maintenance release** | Keeps the v0.10.0 temporal-intelligence release thematically clean; this is unrelated plumbing. |
| D2 | First PR = **F1–F5 + ATLAS-CONTRACT.md v1.1.0** | All atlas-only, no entity changes. F6 (`win` type) deferred to its own spec. |
| D3 | **F3 `--suggest` = single most-recently-touched active project** | Reuse `GetRecentProjectsUseCase`; simplest, matches existing capability. flow-cli already does `head -1`. |
| D4 | **Keep F2 `--count`** | Cheap, consistent with `inbox --count` (F4); atlas-only scope means no flow-cli edit. |
| D5 | **F1 emits real structured JSON** (not just "stop erroring") | flow-cli currently only greps the output, so the default `Active: <p> (Xm)` line would also satisfy it — but structured JSON is forward-looking and lets future callers parse fields instead of scraping text. |

## Overview

flow-cli (ZSH shell wrapper) calls the `atlas` CLI across ~20 integration points. An audit found the `dash` command and all core verbs (session start/end, catch, where, crumb, focus, project add/list) are correctly wired, but **9 calls pass flags or command shapes that atlas does not implement**. Because atlas's Commander has no `allowUnknownOption()`, each unknown flag is a hard `exit 1` — most degrade silently to flow-cli's ZSH fallbacks, hiding a capability gap; one (`session status --format=json`) is a real bug on the project-switch path.

This spec adds the missing flags/output to atlas so flow-cli's existing calls light up, and reconciles `flow-cli/docs/ATLAS-CONTRACT.md` (currently ahead of the code) with the actual CLI surface.

## Primary User Story

**As a** developer using flow-cli on top of atlas,
**I want** atlas to honor the flags flow-cli already calls (`session status --format json`, `project list --count/--suggest`, `inbox --count`, `trail --limit`),
**So that** atlas-enriched data (conflict detection, project suggestions, counts) actually reaches the shell instead of silently falling back to degraded ZSH-native behavior.

## Acceptance Criteria

- [ ] **F1 (bug):** `atlas session status --format <table|json>` exits 0 and, for `json`, prints a single JSON object `{ "project", "durationMinutes", "state", "task", "startedAt" }` (or `null` / `{}` when no active session). Default `table` preserves today's `Active: <project> (Xm)` line.
- [ ] **F2:** `atlas project list --count` prints a single integer (project count after filters) and nothing else; composes with `--status`.
- [ ] **F3:** `atlas project list --suggest` prints exactly one project name — the **single most-recently-touched active project** (via `GetRecentProjectsUseCase`) — in `names` format, or empty + exit 0 when none.
- [ ] **F4:** `atlas inbox --count` prints a single integer (pending inbox count) and nothing else.
- [ ] **F5:** `atlas trail --limit <n>` caps breadcrumb entries shown; coexists with `-d --days`.
- [ ] **F6 (optional/deferred):** `atlas inbox --type <idea|task|bug|note|win> --limit <n>` filters captures by type. Requires a capture `win` type — see Open Questions.
- [ ] Unknown-flag behavior unchanged elsewhere (strict erroring retained — forward-compat resilience explicitly out of scope).
- [ ] `flow-cli/docs/ATLAS-CONTRACT.md` bumped to v1.1.0: documents the new flags and corrects the per-command `--format` support matrix.
- [ ] `tests/test-atlas-contract.zsh` (flow-cli) passes against the new atlas build.
- [ ] All atlas Jest + Ink tests pass; new tests cover F1–F5 flag parsing and output shape.

## Secondary User Stories

- **As a** flow-cli `_work` user switching projects, I want `atlas session status --format=json` to return the active session so conflict detection fires instead of silently allowing a clobbered switch.
- **As a** flow-cli `morning` user, I want `atlas project list --status=active --count` and `atlas inbox --count` to return numbers so the morning briefing shows real stats.
- **As an** atlas/flow-cli maintainer, I want the contract doc to match the code so future wrappers aren't written against promises atlas doesn't keep.

---

## Architecture

### Integration map (audited, verified against `bin/atlas.js`)

```
flow-cli (ZSH)                         atlas CLI (Node/Commander)        Status
─────────────────────────────────────────────────────────────────────────────
commands/dash.zsh:60   atlas dashboard ──► bin/atlas.js:650 dash/dashboard   ✅ match
atlas-bridge.zsh:537   session start   ──► :188 session start [project]      ✅
atlas-bridge.zsh:587   session end     ──► :238 session end [note]           ✅
work.zsh:136   session status --format=json ─► :281 status (NO options)      ❌ F1 (bug)
atlas-bridge.zsh:731   catch --project= ──► :424 catch -p                    ✅
atlas-bridge.zsh:765   inbox           ──► :434 inbox                         ✅
adhd.zsh:76    inbox --count           ──► :434 inbox (no --count)           ❌ F4
capture.zsh:361 inbox --type=win --limit=5 ► :434 (no --type/--limit)        ❌ F6
morning.zsh    inbox --stats           ──► :434 inbox --stats                ✅
atlas-bridge.zsh:807   where [project] ──► :561 where [project]              ✅
atlas-bridge.zsh:895   crumb --project=──► :569 crumb -p                     ✅
capture.zsh:82  trail --limit=N        ──► :578 trail (only -d --days)       ❌ F5
atlas-bridge.zsh:435 project list --status= --format=names ► :72 (supported) ✅
adhd.zsh:32    project list --suggest  ──► :72 (no --suggest)                ❌ F3
morning.zsh:181 project list --status=active --count ► :72 (no --count)      ❌ F2
status.zsh:207 project add <path>      ──► :62 project add [path]            ✅
adhd.zsh:286   focus <project> [text]  ──► :108 focus <project> [text]       ✅
status.zsh:110 status <name>           ──► :121 status [project]             ✅
doctor.zsh     config get backend      ──► no `config get` (has prefs get)   ❌ OOS-1 (flow-cli)
doctor.zsh     mcp status              ──► no `mcp` cmd; atlas-mcp is a binary❌ OOS-2 (flow-cli)
schedule.zsh:659 schedule push         ──► no `schedule` cmd (proposed)      ⏸ deferred
```

### Where the changes land (atlas)

```
bin/atlas.js
  ├─ session .command('status')   → add .option('--format <fmt>', ..., 'table')  [F1]
  ├─ project .command('list')     → add .option('--count') .option('--suggest') [F2,F3]
  ├─ program.command('inbox')     → add .option('--count') (.option('--type'),
  │                                     .option('--limit') deferred)            [F4,F6]
  └─ program.command('trail [p]') → add .option('--limit <n>')                  [F5]

src/use-cases/  (reuse existing use cases; add count/suggest projections)
  ├─ session/  GetContext or sessions.current() already returns active session  [F1]
  ├─ registry/ GetRecentProjects / project list use case → count + suggest      [F2,F3]
  └─ capture/  TriageInbox.getStats() already returns counts                     [F4]
```

No new entities or repositories. All features are CLI-surface projections over existing use-case output. F1 reuses `getAtlas().sessions.current()` (already called at `bin/atlas.js:284`).

---

## API Design (atlas CLI surface — the contract delta)

| Command | New flag | Output | Exit | Serves (flow-cli) |
|---------|----------|--------|------|-------------------|
| `session status` | `--format <table\|json>` | `table`: `Active: <p> (Xm)` (unchanged). `json`: `{project,durationMinutes,state,task,startedAt}` or `null` | 0 | `work.zsh:136` |
| `project list` | `--count` | integer only | 0 | `morning.zsh:181`, `doctor.zsh:372` |
| `project list` | `--suggest` | one project name (`names`) or empty | 0 | `adhd.zsh:32` |
| `inbox` | `--count` | integer only | 0 | `adhd.zsh:76` |
| `trail [project]` | `--limit <n>` | text, capped to n entries | 0 | `capture.zsh:82` |
| `inbox` *(deferred)* | `--type <t>` `--limit <n>` | filtered list | 0 | `capture.zsh:361` |

**JSON shape for F1 (`session status --format json`):**

```json
{ "project": "atlas", "durationMinutes": 42, "state": "active", "task": "spec writing", "startedAt": "2026-06-13T09:14:00Z" }
```

No active session → print `null` (valid JSON), exit 0. flow-cli currently greps for the project name; `null` parses cleanly and signals "no session".

**Conventions to honor (from ATLAS-CONTRACT.md):**
- `--count` and `--suggest` print to **stdout only**, nothing else — flow-cli pipes them directly.
- `names`/count output must never start with `{` or `[` (line 110 validation rule), else flow-cli treats it as a format violation and falls back.
- Exit codes stay 0/1/2 (contract §Exit Code Contract). New flags must not introduce new codes.

---

## Data Models

**N/A — No data model changes.** All features are read-only projections over existing `sessions.json`, `projects.json`, and `captures.json`. The optional F6 `win` type is the only data-model touch (a new `CaptureType` value) and is deferred — see Open Questions.

---

## Dependencies

- **N/A — no new libraries.** Uses existing Commander.js option parsing and the current DI Container use cases.
- Cross-repo: `flow-cli/docs/ATLAS-CONTRACT.md` and `flow-cli/tests/test-atlas-contract.zsh` must be updated in lockstep (sibling repo — separate session/PR per CLAUDE.md cross-project rules).

---

## UI/UX Specifications

**N/A — CLI only.** No TUI/dashboard changes. The dashboard (`atlas dash`) integration is already healthy and untouched by this spec. All output is machine-consumed by flow-cli (counts, single names, JSON) or unchanged human text (`session status` default).

---

## Contract Reconciliation (deliverable)

`ATLAS-CONTRACT.md` v1.0.0 → **v1.1.0**:

1. **Correct §"Output Format Specifications"** — it currently implies `--format` is universal. Replace with a per-command support matrix:
   - `--format <table|json|names>`: `project list`, `project show` (+`shell`)
   - `--format <table|json|text|md>`: `stats`
   - `--format <ical|json>`: `session export`
   - `--json`: `plan`
   - `--format <table|json>`: `session status` *(new in this spec)*
2. **Add the 5 new flags** (F1–F5) to the relevant command rows.
3. **Add `session status`** to the command tables (currently absent on both sides).
4. **Version compatibility table:** add row `flow-cli v7.x ↔ atlas v0.10.x` documenting the now-fulfilled flags.

---

## Open Questions

**Resolved in review (2026-06-13):**
- ~~F6 `win` capture type~~ → **Deferred** (D2). F6 is a separate spec; it's a data-model change, not a flag.
- ~~F1 `null` vs `{}`~~ → **Use `null`** for no active session. flow-cli `work.zsh:136` only greps the output for the project name, so `null` (empty grep result) correctly signals "no session." Confirmed flow-cli does not JSON-parse.

**Still open:**
1. **OOS-1 `config get backend`** — flow-cli's `doctor.zsh` calls a non-existent `atlas config get`. Atlas-only scope means the fix is flow-cli's (`atlas config prefs get` or `atlas config show`). Confirm we don't instead add a `config get <key>` convenience alias to atlas. *(Leaning: flow-cli fix.)*
2. **OOS-2 `atlas mcp status`** — MCP is the separate `atlas-mcp` binary (`package.json:9`), not an `atlas` subcommand. flow-cli should probe the binary. Optional: add a thin `atlas mcp status` wrapper that reports the server — decide if in scope. *(Leaning: flow-cli fix.)*

## Out of Scope

- **flow-cli-side fixes** (OOS-1, OOS-2) — wrong command shapes; belong in a flow-cli session/PR, not this atlas spec.
- **`atlas schedule push`** — already a *proposed* contract item (ATLAS-CONTRACT.md §Opportunistic); separate atlas feature PR. flow-cli ships a silent no-op until it lands.
- **Forward-compat `allowUnknownOption()`** — explicitly rejected; strict erroring is retained to catch typos. Drift is prevented by the contract doc, not by tolerating unknown flags.
- **Any dashboard / TUI change** — `dash` integration is healthy.

## Review Checklist

- [ ] F1 JSON shape agreed (fields, `null` for no session)
- [ ] `--count` / `--suggest` emit stdout-only, never JSON-prefixed (contract line 110)
- [ ] Exit codes remain 0/1/2
- [ ] New tests: F1–F5 parsing + output shape (atlas Jest)
- [ ] flow-cli `test-atlas-contract.zsh` green against new build
- [ ] ATLAS-CONTRACT.md bumped to v1.1.0 with corrected format matrix
- [ ] F6 + OOS items triaged (defer vs include) before coding
- [ ] CLI-REFERENCE.md updated for new flags

## Implementation Notes

- **Order:** F1 first (only real bug, highest user impact), then F2/F4 (trivial count projections), F3 (suggest — needs a "most recent active" heuristic), F5 (limit), F6 last (gated on Open Q1).
- **Reuse:** F1 → `sessions.current()`; F4 → `TriageInboxUseCase.getStats()` (already returns `inbox` count, see `bin/atlas.js` inbox `--stats` action); F2/F3 → existing project list use case output, just project it to count / single name.
- **Single PR feasible** for F1–F5 (all CLI-surface, no entity changes). F6 separate.
- **Cross-repo sequencing:** land atlas flags → update ATLAS-CONTRACT.md + contract test in flow-cli → verify `test-atlas-contract.zsh`. Per CLAUDE.md, the flow-cli doc/test update is a separate session (sibling repo).
- **Spec-only:** no code written in this session.

## History

- 2026-06-13 — Initial draft from deep brainstorm + live cross-repo audit (atlas-only scope; contract reconciled against flow-cli/docs/ATLAS-CONTRACT.md v1.0.0).
- 2026-06-13 — Deep spec review: resolved 5 decisions (D1–D5). Locked v0.9.3 maintenance release, F1–F5 + contract bump first PR, F3 = most-recent-active heuristic, kept F2, F1 emits structured JSON (`null` for no session). F6 + OOS items deferred.
- 2026-06-13 — **Implemented F1–F5** in `bin/atlas.js` + `src/index.js`. **Bonus fix (in scope):** discovered `project list --status` filter only checked `p.status`, never `p.metadata.status`, so `--status=active` matched 0 scanned projects — a pre-existing break of flow-cli's contracted `project list --status=active --format=names` call (`atlas-bridge.zsh:435`). Filter now resolves status like the output mapper. Added 12 e2e tests (all green); 1708 unit/integration pass (only the env-blocked SQLite suite fails — `better-sqlite3` won't build on Node 26). Updated `docs/CLI-REFERENCE.md`. ATLAS-CONTRACT.md v1.1.0 bump remains a flow-cli sibling-repo follow-up.
