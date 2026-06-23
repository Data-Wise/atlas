# SPEC — atlas: Research Registry + Tasks
> Repo: `atlas` (Node, Clean Arch, Jest). Parent: RFC-000. Status: proposed.

## 1. Context / problem
atlas registers `~/projects` git projects via `.STATUS` (`SyncFromStatus`). **Research items** (manuscripts, the 3 programs, the proposals) are NOT registered — so `atlas plan`/dashboard only see packages. We want atlas to be the single registry.

## 2. Goals / non-goals
**Goals:** atlas ingests research `.STATUS`; models program→proposal hierarchy via Tasks; `plan` surfaces research + packages with priority/next.
**Non-goals:** scanning iCloud; TUI redesign; any LLM.

## 3. Data contract — research `.STATUS` (additive)
Machine-readable header, superset of the package header:
```yaml
status: active | released | blocked | planning      # existing
priority: P0 | P1 | P2 | "—"                         # existing
progress: 0-100                                      # existing
next: <one-line next action>                         # existing
kind: manuscript | program | proposal | package      # NEW (default: package)
program: <program-id | "—">                          # NEW (proposals only)
venue: <venue | "—">                                 # NEW
schema: 1                                             # NEW (compat gate)
tasks:                                               # NEW (optional → atlas Tasks)
  - text: "define estimand"; priority: P1; est: "2d"; done: false
updated: YYYY-MM-DD
```
**Back-compat:** existing parser reads `status/priority/progress/next` unchanged; all new keys optional.

## 4. Canonical locations (decision A)
`~/projects/research/<manuscript|program>/.STATUS`; per-proposal `.STATUS` under the program repo. **Not iCloud** (atlas reads git; obs renders to iCloud).

## 5. Design / changes
- **domain:** extend `ProjectType` value-object with `kind`; add `parentProgram` to `Project`; reuse existing `Task` entity.
- **use-cases:** `SyncFromStatus` parses `kind/program/tasks`; `RegisterProject` links proposals to parent program; (decision B) proposals → Tasks under the program Project.
- **adapters:** `StatusFileParser` additive; `ProjectPresenter` shows a `kind` badge + program grouping.
- **CLI:** `atlas sync --from-status --include ~/projects/research`; `atlas project list --kind=research`; `atlas task list --project=<program>`.
- **MCP:** surface `kind/program/tasks` in `get_context` + project tools (obs consumes via JSON, not MCP-required).

## 6. Tests (Jest)
- parser: research `.STATUS` → Project (+Tasks); missing optional keys default; **package `.STATUS` output unchanged** (regression).
- sync: a program with N proposals → 1 Project + N Tasks; priorities preserved.
- compat: `schema: 2` (future) → warn, don't crash.

## 7. Observability
`atlas doctor`/`stats` report research item count; warn on `.STATUS` schema mismatch or missing `next`.

## 8. Migration / rollback
Purely additive. Rollback = revert PR; package behavior untouched. Migration step = drop `.STATUS` into each research home (drafts provided separately) + run sync.

## 9. Acceptance
`atlas plan` lists the 4 manuscripts + 3 programs (proposals as Tasks) alongside the 7 packages, with priority/next sourced from `.STATUS`; `--json` exposes them for obs.

## 10. Estimate
**M** (1–2 days). Branch `feature/research-registry` → PR → dev (atlas uses `main ← feature/*`).
