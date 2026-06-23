# SPEC — atlas: Research Registry + Tasks
> Repo: `atlas` (Node, Clean Arch, Jest). Parent: RFC-000. Status: proposed.

## 1. Context / problem
atlas registers `~/projects` git projects via `.STATUS` (`SyncFromStatus`). **Research items** (manuscripts, the 3 programs, the proposals) are NOT registered — so `atlas plan`/dashboard only see packages. We want atlas to be the single registry.

## 2. Goals / non-goals
**Goals:** atlas ingests research `.STATUS`; models program→proposal hierarchy via Tasks; `plan` surfaces research + packages with priority/next.
**Non-goals:** scanning iCloud; TUI redesign; any LLM.

## 3. Data contract — research `.STATUS` (RECONCILED to live convention, 2026-06-23)
> **Reality check (verified `atlas sync --from-status --paths ~/projects/research`):** atlas v0.10 **already parses research `.STATUS` and had registered all 15 research projects** (collider→"revise & resubmit" 95%, product-of-three→draft 95%, sensitivity→paused 40%, …). The **only** repo missing a header was `pmed-modern` (prose-only) — **fixed 2026-06-23**. So basic registry compat ALREADY EXISTS; this SPEC's real remaining scope is the **Tasks/kind enhancement**, not basic parsing.

**Live header that repos use + atlas reads (do NOT redesign — match it):**
```yaml
status: <free text>     # e.g. active | draft | paused | planning | "revise & resubmit"
priority: <free text>   # e.g. high | -- | P1   (atlas maps to an int internally)
progress: 0-100
next: <one-line next action>
type: research          # atlas project type
target: <venue>         # the venue field is `target`, NOT `venue`
```
**Additive (this SPEC proposes; atlas ignores unknown keys today → forward-compat, harmless now):**
```yaml
kind: manuscript | program | proposal   # for the program→proposal model
program: <program-id>                    # proposals only
tasks:                                   # → atlas Tasks (the ACTUAL new work in this SPEC)
  - text: "define estimand"; priority: P1; done: false
```
**Back-compat:** every current `.STATUS` already parses. Corrections vs my first draft: `priority` is **free-text** (not P0/P1/P2); the venue key is **`target`** (not `venue`); there is **no `schema:`** key — dropped.

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
**Core registry compat: DONE** (already worked once a load bug was fixed + one prose `.STATUS` got a header). **Remaining (Tasks/`kind`): S** (~half day). Branch `feature/research-registry` → PR → dev.

## 11. Implemented 2026-06-23 — registry-load robustness bug (found making research repos compatible)
`atlas sync --from-status` failed for ALL research repos with `Failed to load projects: Project description too long (max 500 characters)`. **Root cause:** `FileSystemProjectRepository.findAll()` deserializes every stored row into a `Project`, which throws when `description > 500`. One corrupt stored row (`me-exposure-recall`, 2053 chars, written by an earlier sync) therefore bricked the entire registry load — and thus every project's sync.

**Fixes (this branch):**
- `FileSystemProjectRepository._deserializeProject` — truncate `description` to 500 on read → a corrupt row degrades gracefully instead of crashing `findAll()`. Regression test: `test/unit/adapters/FileSystemProjectRepository.deserialize.test.js` (3 cases, green).
- `SyncRegistryUseCase._enrichProjectWithStatus` — truncate the next-action-derived `description` to 500 on write (parity with `metadata.notes`).
- Data repair — `~/.atlas/projects.json` one >500 row truncated (timestamped backup written alongside).

**Result:** `atlas sync --from-status --paths ~/projects/research` → **0 errors**; all 15 research `.STATUS` ingested (pmed-modern active 92%, product-of-three draft 95%, collider "revise & resubmit" 95%, sensitivity paused 40%, …). Installed `atlas project list` now shows them.

**Durability note:** the installed Homebrew binary (`@data-wise/atlas` 0.10.0) runs a published copy, so it won't carry the read-side guard until a release ships with this commit. The store is already repaired, so the installed `atlas` reads it fine today; a *future* `atlas sync` from the unpatched binary that re-introduces a >500 description could recur until the release. Fix = cut an atlas release with this branch, then `brew upgrade`.
