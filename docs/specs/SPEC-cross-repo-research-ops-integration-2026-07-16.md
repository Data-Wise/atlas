# SPEC: Cross-Repo Research-Ops Integration — Adversarial Review Findings

**Status:** proposed
**Repos:** atlas, obsidian-cli-ops (obs), savant
**Origin:** adversarial review of atlas's cross-repo backlog items (FW-2, FW-8, FW-13) against live code in obs and savant, 2026-07-16 — dispatched after the earlier same-session backlog value-review had already cut/narrowed FW-6/12/13/26 based on atlas-side evidence alone. This review reads the *other* side of each boundary.
**Date:** 2026-07-16

---

## Headline finding: FW-13's "CUT" verdict was wrong — reopening, redirected

Earlier today (see `docs/plans/FUTURE-WORK.md`, commit `9ecfe99`), FW-13 (`.flow/obsidian-sync.yml` → `.obs/sync.yml` migration) was cut as "pure tidiness, zero functional payoff" — reasoning that atlas's `DoctorUseCase` already treats both paths as equally valid, so forcing a migration buys nothing.

That reasoning assumed `.obs/sync.yml` is a live, valid alternative schema. **It is not.** Cross-repo evidence:

- `obsidian-cli-ops/docs_mkdocs/changelog.md:15` (Unreleased, 2026-07-12 audit): *"Removed `.obs/sync.yml` / `obs link` (ADR-001) — deleted `research/obs_link.py`, `tests/test_obs_link.py`, `docs_mkdocs/obs-sync-yml.md`; removed `obs link` CLI subcommand and zsh dispatcher; `.flow/obsidian-sync.yml` is now the sole vault↔repo mirror-map contract."*
- `obsidian-cli-ops/docs_mkdocs/refcard.md:171`: `obs link` marked *"(Removed in v4.3.1 — superseded by `obs flow init` / `.flow/obsidian-sync.yml`.)"*
- Grepping all of `obsidian-cli-ops/src/python` for `.obs/sync` and `obs_link`: **zero hits.** No writer, no reader, no CLI command exists for this path anywhere in the codebase.
- The literal file `obsidian-cli-ops/.obs/sync.yml` on disk contains `schema: 1 / mirror: none` and is untracked — a stub, not a live config.

Meanwhile, atlas's `DoctorUseCase.js` still references the dead path in 4 places:

```
src/use-cases/registry/DoctorUseCase.js:8   — "[info — `obs link` owns it]"
src/use-cases/registry/DoctorUseCase.js:11  — "that schema belongs to `obs link`"
src/use-cases/registry/DoctorUseCase.js:104 — "that belongs to `obs link` (ADR-001)"
src/use-cases/registry/DoctorUseCase.js:129 — generated CLAUDE.md stub text:
  "Settings contract (`atlas doctor`): `.STATUS` + `CLAUDE.md` + `.obs/sync.yml`."
```

Line 129 is the most consequential: it's the text atlas's own `doctor --fix --write` **writes into every new project's `CLAUDE.md`**, actively propagating a reference to a command that no longer exists.

**This is not a migration-of-preference. This is atlas code that's factually wrong about a dependency that changed underneath it**, discovered only because this review checked obs's side instead of trusting atlas's own comments.

## Design

### Item 1 (was FW-13, reopened) — Fix `DoctorUseCase`'s dead-path reference

Replace all 4 `.obs/sync.yml`/`obs link` references in `DoctorUseCase.js` with `.flow/obsidian-sync.yml` as the sole recognized path (matching what obs actually implements). Specifically:

- `_rows()`'s `has.obsSync` check (currently checks both paths — keep dual-path acceptance for a transition window on *existing* repos that may still have a stray `.obs/sync.yml`, but stop describing `.obs/sync.yml` as the current/preferred one).
- The generated `CLAUDE.md` stub (line 129) must say `.flow/obsidian-sync.yml`, not `.obs/sync.yml` — this is actively spreading misinformation today.
- Doc comments (lines 8, 11, 104) corrected to name the real writer: savant's `/obs:sync` command / `flow_init.py`'s `.flow/obsidian-sync.yml`, not the removed `obs link`.

**Acceptance:** `grep -r "obs link\|\.obs/sync\.yml" src/` returns zero hits outside of a single historical-note comment (if kept for context); newly-generated `CLAUDE.md` stubs reference `.flow/obsidian-sync.yml`.

### Item 2 (was FW-8, redefined) — Scaffolder vault-registration gap, corrected target

Original FW-8 ("wire scaffolders to call `obs link` at birth") targets a command that doesn't exist. Corrected scope, per the savant-side review:

- `research-scaffold`'s `--mode repo` (`savant/src/plugin-api/skills/research-scaffold/SKILL.md:89`) already writes `.STATUS`, `CLAUDE.md`, `README.md`, and calls `atlas project add` — 2 of 3 settings-contract legs are already handled at birth.
- The missing third leg (vault registration) should call savant's own existing `/obs:sync`-pattern (`savant/src/plugin-api/commands/obs/sync.md`, which scaffolds `.flow/obsidian-sync.yml` directly as reviewable markdown-driven config, not a shell-out to an external binary) — matching the precedent savant already set for exactly this reason: branch-guard hooks block new executable files, so savant deliberately avoided shelling out to `obs` for the equivalent case.
- Do NOT reintroduce a dependency on an external `obs` binary call from a skill — savant's existing pattern already solved that constraint differently, and FW-8 should follow it, not fight it.

**Acceptance:** `research-scaffold --mode repo` also produces a `.flow/obsidian-sync.yml` scaffold (or a completion-block instruction to run the existing `/savant:repo config new --artifact obsidian-sync` path), closing the third settings-contract leg without introducing a new external-binary dependency.

### Item 3 (was FW-2, rescoped) — Package dashboard is NOT a simple filter add

Original FW-2 acceptance criterion ("`obs research board --kind package` returns the 7 packages") undersells the actual gap. Confirmed via code read, not assumption:

- `research_board.py`'s `load_research_projects()` (line 132-137) is **hardcoded** to fetch only `kind in (manuscript, program)` — it never calls `atlas project list --kind package`. Package projects don't reach the renderer at all today, not even partially.
- `render_action_board`'s catch-all bucket (line 73-91) *can* display arbitrary non-manuscript/program kinds, but through the generic 5-column table with no CRAN-state column — cosmetically wrong for a package dashboard even if the data did arrive.
- **No CRAN-state field exists anywhere** — not in obs, not in atlas's `Project.js` entity (grepped, confirmed absent), and not even in the bespoke script FW-2 is meant to replace (`mediationverse-status-sync.py` derives status/progress from raw `.STATUS` text, no CRAN field). This is a genuine **cross-repo schema addition** (atlas needs a new field; obs needs a new column/template), not a filter toggle.

**Acceptance (revised):** (a) atlas's `Project` entity/`.STATUS` schema gains a CRAN-state field with a parser test; (b) `load_research_projects` extended to also fetch `kind: package`; (c) `render_action_board` gets a package-specific row template with a CRAN-state column; (d) golden-test match against the hand-built `MediationVerse_Dashboard.md`.

### Item 4 (new finding, not in original backlog) — obs has zero error-handling parity with atlas's new parser hardening

Today's atlas work (PR #87) added `_parseWarnings` so malformed `.STATUS` data is visible instead of silently wrong. `research_board.py`'s `load_projects`/`load_research_projects` (line 123-137) have **no error handling at all** on the atlas integration call: `subprocess.run(..., check=True)` raises uncaught `CalledProcessError` if the `atlas` binary exits non-zero or is missing (`FileNotFoundError`), and `json.loads(out)` raises uncaught `JSONDecodeError` on malformed output. There is no degrade path — a single atlas-side hiccup crashes the entire board render, with no visibility into which project or field caused it.

This is a **real, present-day gap**, independent of FW-2 — it affects every existing `obs research board` render today, not just a future package feature. Given atlas's parser is now emitting more structured warnings than before, obs currently has no way to surface them even if it wanted to.

**Acceptance:** `load_projects`/`load_research_projects` wrap the subprocess call and JSON parse in a try/except that degrades to "board renders with a warning banner + partial data" rather than crashing; a golden test with a deliberately-broken atlas call (non-zero exit, malformed JSON) confirms graceful degradation.

## Implementation status (2026-07-16)

All 4 items implemented, PRs opened, none merged pending explicit go-ahead:

- **Item 1** (DoctorUseCase dead-path fix) — MERGED, atlas [PR #88](https://github.com/Data-Wise/atlas/pull/88).
- **Item 4** (obs error-handling) — open, obsidian-cli-ops [PR #88](https://github.com/Data-Wise/obsidian-cli-ops/pull/88).
- **Item 2** (scaffolder vault-registration) — open, savant [PR #210](https://github.com/Data-Wise/savant/pull/210). Auto-scaffolds `.flow/obsidian-sync.yml` in `--mode repo` (not just a completion-block pointer), mirroring `/savant:repo init`'s Step 5.5 precedent for cheap/decision-free artifacts.
- **Item 3** (package dashboard) — open, atlas [PR #89](https://github.com/Data-Wise/atlas/pull/89) + obsidian-cli-ops [PR #89](https://github.com/Data-Wise/obsidian-cli-ops/pull/89) (based on item 4's branch, per the sequencing below). Two corrections to the original scope, discovered during implementation:
  - **"No CRAN-state field exists anywhere" was half-wrong.** It's absent from atlas/obs, but already exists as an informal author convention — `cran_state:` is set in 4 of 7 `~/projects/r-packages/active/*/.STATUS` files (`planned`/`hold`/`dev`). Implementation teaches the parser to read a field authors already write, not a from-scratch schema invention.
  - **Acceptance criterion (d) — literal golden-test match against `MediationVerse_Dashboard.md` — was not implemented.** That dashboard is generated by an unrelated bespoke script (`mediationverse-status-sync.py`) with a structurally incompatible table shape (Priority/Status/Progress/prose-Next, hand-curated cascade/architecture sections, no CRAN column at all). Matching it literally would require either forking obs's generic renderer to imitate a one-off script, or migrating the hand-curated dashboard onto obs's shape — a real design decision, not a wiring task. Deferred as an open question rather than silently dropped.
  - Follow-up spotted in passing (not fixed): RMediation has `kind: package` in its `.STATUS` but is absent from atlas's package registry — flagged as a separate background task, not part of this spec's scope.

## Priority / sequencing

1. **Item 1 (DoctorUseCase dead-path fix)** — small, atlas-only, no cross-repo coordination needed, actively wrong today. Do first.
2. **Item 4 (obs error-handling)** — small, obs-only, no cross-repo coordination needed, real production risk. Do alongside item 1.
3. **Item 2 (scaffolder redefinition)** — medium, savant-only once the target is corrected (`.flow/obsidian-sync.yml` not `obs link`), no atlas/obs code changes required.
4. **Item 3 (package dashboard)** — largest, genuinely cross-repo (atlas schema + obs render path), correctly gated behind items 1 and 4 landing first (no point building on the dead-path-referencing doctor logic or the crash-prone integration call).

## Out of scope

- FW-6, FW-26 (cut earlier today, atlas-only, not touched by this cross-repo review — no new evidence changes those verdicts).
- FW-12 (narrowed earlier today, scheduler-only, no cross-repo dependency).
- FW-14 (obs config bootstrap) — confirmed orthogonal to `research_board.py`, not a blocker for anything in this spec; leave as-is pending a real load-bearing consumer.
