# SPEC: ADHD Workflow Streamline — bare `atlas` digest, evidence-linked done, deprecation tier

**Date:** 2026-07-19 · **Status:** approved (grilled 2026-07-19) · **Release:** v0.14.0 (digest + evidence), v0.15.0 (removals)
**Origin:** 5-part ADHD audit + adversarial review + grill session, 2026-07-19.

## Goals (ADHD-cost removed)

- **One answer to "what am I doing / what's next."** Today four surfaces (`plan`, `where`, `status`, `dash`) recompute the same question and can disagree (.STATUS `next` vs PlanDay suggestions). Cost removed: choosing which command to trust.
- **"Done" backed by evidence, not faith.** `session end` currently defaults outcome to `completed` unchecked; `status --complete` pops items with no record; registry rots without manual `sync`. Cost removed: state that silently lies, and the discipline burden of remembering `sync --from-status`.
- **Fewer concepts.** 55 command registrations, "parked" meaning two things, crumb/trail as opt-in memory aids nobody remembers to use.

## Decisions (locked)

1. **Bare `atlas` = the digest.** Running `atlas` with no args prints one glanceable screen: active session (or "none"), current project focus + next action (from .STATUS), inbox count, streak, and at most 3 plan suggestions. It merges the read paths of `where` + `plan` + `status`; those commands remain but become thin aliases into sections of the same renderer.
2. **Evidence-linked done.** `session end` computes the git delta since session start (commits, files touched, branch) via GitGateway, displays it, and asks ONE confirm for the outcome. `status --complete` records which session/commit closed the item (stored in .STATUS metrics). `sync --from-status` auto-runs (scoped to the session's project) after `session end` — registry rot ends.
3. **Deprecate-with-warning tier (nothing hard-removed in v0.14):**
   - `crumb`/`trail` → fold into session notes (`session note <text>`, shown by digest/`where`).
   - `park`/`unpark`/`parked` → single parking concept on Capture; Session pause stays `session pause`.
   - `template` group shrinks to `list|show` once SPEC-status-schema lands (templates become schema-driven).
   - Deprecated commands print a one-line pointer to the replacement; removal in v0.15.0.

## Deliverables

- `src/use-cases/context/GetDigestUseCase.js` — one use case backing bare `atlas`, `where`, `plan` (composes existing GetContext/PlanDay internals; no new storage).
- `bin/atlas.js`: default action → digest; deprecation warnings on crumb/trail/park aliases.
- `src/use-cases/session/EndSessionUseCase.js`: git-delta evidence + confirm + scoped auto-sync.
- `src/use-cases/status/UpdateStatusFileUseCase.js`: `--complete` writes closing evidence (session id, commit sha).
- Docs: CLI-REFERENCE, TUTORIAL, REFCARD updated; CHANGELOG deprecation table.

## Verification

- **Tests:** unit tests for GetDigestUseCase (session/no-session, empty inbox, missing .STATUS); EndSession evidence tests with a fixture git repo (delta present, delta empty, non-git project → skip gracefully); regression tests proving `where`/`plan` output preserved for flow-cli consumers.
- **E2E transcript (required in PR body):** fresh `ATLAS_DATA_DIR`, scripted run: `session start` → commit in a fixture repo → `session end` shows the real commit sha and asks confirm → registry reflects the session without a manual sync. Failure mode planted: end a session with zero git activity and confirm the flow degrades to today's behavior.
- **Acceptance criteria:** bare `atlas` renders in <300ms on the real registry; happy path is exactly 3 commands (`atlas` → `atlas session start X` → `atlas session end`); zero flow-cli contract calls broken (run flow-cli's ATLAS-CONTRACT checks against the branch).

## Non-goals

- No entity merging (Capture/Task/Breadcrumb schemas untouched — killed in adversarial review; revisit ≥v0.15 after D3 executes).
- No removal of any command in v0.14.
- No change to MCP tool surface.

## Migration / compat

- flow-cli calls ~20 atlas points per ATLAS-CONTRACT.md — `where`, `session status --format json`, `inbox --count`, `trail --limit` must keep exact output shape. `trail` deprecation is CLI-warning only; JSON path unchanged until flow-cli releases off it.

## Release mapping

- **v0.14.0:** digest, evidence-linked end, auto-sync, deprecation warnings.
- **v0.15.0:** remove deprecated commands; fold parking concepts.

## Execution (drivable by /craft:orch:drive or agent fleet)

**Worktree:** `~/.git-worktrees/atlas/feature-adhd-digest` · **Branch:** `feature/adhd-digest` (base `dev`) · **PR title:** `feat(cli): bare atlas digest, evidence-linked session end, deprecation tier`

| # | Task | Acceptance |
|---|---|---|
| 1 | `GetDigestUseCase` composing GetContext + PlanDay + .STATUS read | unit tests: session/no-session, empty inbox, missing .STATUS |
| 2 | Bare `atlas` → digest; `where`/`plan` render sections of same output (JSON paths unchanged) | flow-cli contract outputs byte-compatible (`--format json` snapshots) |
| 3 | EndSession: git delta (GitGateway) + single confirm + scoped auto-sync | fixture-repo tests: delta present / empty / non-git graceful |
| 4 | `status --complete` records closing evidence (session id, sha) into metrics | evidence appears in .STATUS after complete |
| 5 | Deprecation warnings on crumb/trail/park/unpark/parked | warning text test; JSON outputs untouched |
| 6 | Docs: CLI-REFERENCE, TUTORIAL, REFCARD, CHANGELOG | `mkdocs build --strict` green |

**Verify gate:** `npm test` green + E2E transcript (fresh ATLAS_DATA_DIR: start → real commit → end shows sha → registry synced without manual sync) in PR body. Depends on nothing; coordinate bin/atlas.js merge order with WS1/WS2 at review time.
