# Atlas Fix Plan — research-ops hardening (docs + tests first)

> **Status:** Proposed · **Date:** 2026-06-26 · **Owner:** DT · **Branch model:** `feature/*` → `dev` → `main`
> **Scope:** the data-integrity fixes found this session (FW-27/28/29), the FW-15 doc note, the deferred
> atlas docs/test deep-dives (FW-16/18/20), and the `0.11.1` patch that ships the already-merged FW-15 fix.
> Every work item carries an explicit **Testing** deliverable and **Documentation** deliverable — no fix is
> "done" until both are green. Out of scope: obs/website/savant items, and dashboard surfaces (FW-2/5/6/7).

---

## 1. Context

This session shipped atlas **v0.11.0** (research registry + `doctor` + board-truth) and fixed two real bugs
(`ATLAS_DATA_DIR` store-isolation #34; plain-sync metadata-strip #36/#37). Three follow-ups and three
docs/test deep-dives remain. The standing risk is **silent research-data loss in the registry**, so the
plan front-loads data-safety (FW-27) and gets the merged fix into the installed binary (`0.11.1`).

**Current truth:** registry ≈ 62 audited, `doctor` 54/62; installed binary is `0.11.0` (lacks #37);
research metadata (`kind/target/tasks/priorityLabel`) is restored and preserved on `dev`.

## 2. Conventions this plan follows

**Testing pyramid (atlas already has all four layers):**

```
        e2e (test/e2e/cli.test.js) ........ few, spawn the real CLI
     integration (test/integration) ....... some, real FS in tmpdir
   dogfood (test/dogfood-noninteractive) .. CLI smoke against an isolated store
  unit (test/unit, jest, mocks) ........... many, fast, business logic
```

- **Cover:** data-integrity paths (sync upsert/preserve), parser edge cases, `--kind` filter, MCP field
  forwarding, scanner boundary behavior. **Skip:** trivial getters, framework code, generated `site/`.
- **Coverage target:** ≥ 90% lines on touched files; **100%** on the sync/parse data-integrity paths.
- **Isolation rule (post-#34):** every test/dogfood path that runs the real CLI **must** set
  `ATLAS_CONFIG`/`ATLAS_DATA_DIR` (and override `HOME` for spawned processes) so nothing touches `~/.atlas`.

**Documentation set (all exist — these are updates, not new files):** `README.md`, `CLI-REFERENCE.md`,
`REFCARD.md`, `ARCHITECTURE.md`, `RESEARCH-REGISTRY.md`, `MCP-SERVER.md`, `CONFIGURATION.md`, `CHANGELOG.md`,
`docs/tutorials/`. **Principles:** write for the reader, lead with the most useful info, show commands/examples,
keep current, link don't duplicate.

**Definition of Done (per item):** code + unit/integration tests green · `mkdocs build --strict` clean ·
CHANGELOG entry · doc updated · `R CMD`-equivalent (here: `npm test` + dogfood + e2e) green in CI.

---

## 3. Work items

Effort: **S** ≤½d · **M** ½–2d. Risk: 🟢 low · 🟡 medium.

### R0 — Release `0.11.1` (ship the merged FW-15 fix) · S · 🟢

**Problem.** The plain-sync metadata-strip fix (#37) is on `dev` but the **installed** `0.11.0` still
silently wipes research metadata on any `atlas sync`. Users (incl. this workflow) must avoid plain sync until shipped.

**Implementation.** Bump `package.json` 0.11.0→0.11.1 · roll `CHANGELOG [Unreleased]`→`[0.11.1]` · `dev`→`main`
PR · publish GitHub Release `v0.11.1` (triggers `homebrew-release.yml` → tap bump) · `brew upgrade atlas`.

**Testing.** Reuse CI gates (unit/integration/e2e/dogfood). Post-release smoke: `atlas --version` = 0.11.1;
`atlas sync --from-status --paths ~/projects/research` then a plain `atlas sync`; assert `atlas project list
--kind manuscript` is still non-empty (the regression that motivated #37, now at the binary level).

**Documentation.** CHANGELOG `[0.11.1]` Fixed entry (link #36/#37). Close #36 on merge to `main`.

**Acceptance.** Installed `atlas` is 0.11.1; plain sync no longer empties `--kind manuscript`.

---

### FW-27 — Make sync research-safe *by design* · M · 🟡  (decision → ADR-002)

**Problem.** #37 stops plain sync from *destroying* research metadata, but plain sync is still not the
**authority** for it — a user expecting `atlas sync` to refresh a manuscript's venue/tasks gets stale data
with no signal. We want a principled, documented contract for which sync path owns research metadata.

**Design — ADR-002 (embedded):**

| Option | Complexity | Behavior | Trade-off |
|---|---|---|---|
| **A. Preserve-only (today, post-#37)** | Low | plain sync keeps existing research meta, never updates it | safe but silently stale; two mental models |
| **B. Warn on touch** | Low–Med | plain sync preserves **and prints** "research project X not refreshed; run `sync --from-status`" | safe + discoverable; no behavior change to data |
| **C. `--from-status` becomes the default** | Med | one sync path; `--packages-only` opt-out for speed | one mental model; risk of perf regression on large trees; bigger blast radius |

**Decision (proposed): B now, C later.** Ship **B** (a warning + a `sync --research` convenience alias that
forwards to `--from-status`) as the low-risk, high-clarity step; revisit **C** once `--from-status` scan perf
is benchmarked (FW-27b). Rationale: B removes the silent-staleness footgun without changing data semantics or
risking a perf regression mid-release-train.

**Implementation.** In the sync controller, after a plain sync, detect registry entries whose stored
`metadata.kind` ∈ {manuscript, program} and emit a one-line warning with the exact remedy command. Add
`atlas sync --research` alias. Keep `_preserveResearchMetadata` (#37) as the safety net.

**Testing** (unit + e2e):
- *unit* — `SyncRegistryUseCase`/controller: given an existing manuscript entry, a plain sync result includes
  a `warnings[]` entry naming it; a packages-only project produces none. (≥3 cases: manuscript, program, none.)
- *e2e* — `cli.test.js` (isolated `HOME`): seed `.STATUS` with `kind: manuscript`, `sync --from-status`, then
  plain `sync`; assert stderr/stdout contains the warning and `--kind manuscript` is unchanged.
- coverage target 100% on the new warn branch.

**Documentation.** `CLI-REFERENCE.md` `atlas sync` — document the warning + `--research` alias + the
"`--from-status` owns research metadata" contract. `ARCHITECTURE.md` — note the two sync paths and ownership.
New `adr/ADR-002-sync-research-ownership.md` in **docs-standards** (cross-tool home), linked from RESEARCH-REGISTRY.

**Acceptance.** A plain sync over a research project prints the remedy; `--research` works; ADR-002 merged.

---

### FW-28 — Scanner depth / umbrella sub-repo policy · M · 🟡  (decision → ADR-003)

**Problem.** `_scanRecursive` (maxDepth 3) **stops at the first project-dir**, so an umbrella that is itself a
project (`mcp-servers`, `claude-plugins`) hides its child repos. But some children (`craft`, `rforge`) are
**first-class** dev-tools. Result: inconsistent tracking + children that re-orphan on every `sync --remove-orphans`.

**Design — ADR-003 (embedded):**

| Option | Complexity | Behavior | Trade-off |
|---|---|---|---|
| **A. Umbrella-only (current default)** | Low | track the umbrella; children untracked | stable + simple; first-class nested repos invisible |
| **B. Opt-in recurse marker** | Med | a `.atlas-scan-children` (or `atlas.scanChildren: true` in the umbrella's `.STATUS`) tells the scanner to descend | precise; only the umbrellas that want it recurse; one new convention |
| **C. Promote first-class repos to top-level** | Low (manual) | move/symlink `craft`,`rforge` to `~/projects/dev-tools/` | no scanner change; touches the filesystem layout |

**Decision (proposed): B, with C for the two known first-class repos as an interim.** Add an opt-in marker so
umbrellas like `mcp-servers` can expose children deliberately, and (interim) register `craft`/`rforge` explicitly
and exclude them from orphan-removal. Rationale: B is the durable fix (no whack-a-mole), C unblocks the two
known cases immediately.

**Implementation.** `_scanRecursive`: when a project-dir also has the opt-in marker, continue recursing into
its children (don't `return`). Honor an `excludeFromOrphans` set for explicitly-registered nested repos.
Document umbrella-only as the default policy.

**Testing** (unit + integration):
- *unit* — `_scanRecursive` on a fixture tree: umbrella **without** marker → 1 project (umbrella); umbrella
  **with** marker → umbrella + N children; depth cap still respected (no recurse past maxDepth).
- *integration* — `FileSystemProjectRepository.scan` over a real tmpdir umbrella; assert child set matches.
- *unit* — orphan-removal skips `excludeFromOrphans` entries.

**Documentation.** `CLI-REFERENCE.md` (sync/scan section) + `ARCHITECTURE.md` — document the scan-depth rule,
the opt-in marker, and umbrella-only as the default. `CONFIGURATION.md` — the marker + `excludeFromOrphans`.
ADR-003 in docs-standards.

**Acceptance.** `mcp-servers` stays single by default; adding the marker exposes children; `craft`/`rforge`
no longer re-orphan; tests green.

---

### FW-29 — Strip trailing inline comments from venue/target · S · 🟢

**Problem.** `target: CSDA … # was JASA — retargeted` stores the whole string (incl. the `#` comment) as the
venue; the board/`--kind` show the comment. Two parse paths affected (`StatusFileParser` markdown case ~L158
and yaml case ~L264).

**Implementation.** In both `case 'target'/'venue'/'journal'`, strip a trailing ` #…` comment before assigning:
`data.target = cleanValue.replace(/\s+#.*$/, '').trim()`. Guard against a `#` that is part of the venue (rare;
require whitespace before `#`).

**Testing** (unit):
- `StatusFileParser.kind-tasks.test.js` (or a focused case): `target: CSDA # was JASA` → `target === 'CSDA'`;
  `venue: Journal #3 of X` (no leading space before `#`? define behavior) — pick the whitespace-anchored rule
  and assert both the strip case and the no-false-positive case. ≥4 cases across both parse paths.

**Documentation.** `RESEARCH-REGISTRY.md` — note that `#` begins an inline comment in `target:`/`venue:`.
CHANGELOG Fixed entry.

**Acceptance.** product-of-three venue renders `CSDA`; comment dropped; both parsers covered.

---

### FW-15-doc — Plain-sync ownership note in CLI-REFERENCE · S · 🟢

**Problem.** `CLI-REFERENCE.md` documents `--from-status` but not that **plain** `atlas sync` *preserves but
does not parse* research metadata (the post-#37 contract). Readers need to know which path refreshes what.

**Implementation.** Add a short callout under `### atlas sync`: plain sync = packages-only registry refresh
(preserves existing `kind/target/tasks`); `--from-status` = the authority that parses + updates them.

**Testing.** Docs-only → `mkdocs build --strict` must stay clean (link/nav check).

**Documentation.** The callout itself + a cross-link to RESEARCH-REGISTRY and (once merged) ADR-002.

**Acceptance.** The caveat is documented; strict build passes. (Folds into FW-27's doc PR if sequenced together.)

---

### FW-16 — Focused tests: `ProjectsAPI.list()` fields, `--kind`, MCP `kind` · S · 🟢

**Problem.** Coverage of the research surface is **transitive** today (via formatters/sync tests). No test
calls `ProjectsAPI.list()` directly for `kind/target/taskCount/progress/next/priority`, the `--kind` filter,
or asserts the MCP `atlas_get_projects` handler forwards `kind`. These were the ⚠️ rows in the docs gap analysis.

**Implementation.** Add direct unit tests (no new product code).

**Testing** (unit, the whole item *is* the test deliverable):
- `ProjectsAPI.list()` — seed a registry (in-memory repo via Container test seam or a temp store): assert each
  research field is returned, and `--kind manuscript|program|package` narrows correctly + is case-insensitive.
- MCP — `atlas_get_projects` handler returns `kind`/`progress`/`next` (parity with `--json`); a `kind` arg filters.
- Edge: a project with no research metadata returns nulls, not crashes.
- Coverage target: the `list()` + MCP handler branches to ≥95%.

**Documentation.** None required (test-only), but update the docs gap-analysis matrix to flip the ⚠️ rows to ✅.

**Acceptance.** Direct (not transitive) coverage on all three; suite green.

---

### FW-18 — `ARCHITECTURE.md` update: DoctorUseCase + research data flow (+ mermaid) · M · 🟢

**Problem.** `ARCHITECTURE.md` predates the research registry + `doctor`. It should show the new use-cases and
the `.STATUS → parser → registry → list/MCP/doctor → obs board` data flow.

**Implementation (documentation item).** Add a "Research registry & doctor" section: the two sync use-cases
(`SyncRegistryUseCase` packages-only vs `SyncFromStatusUseCase` research-aware), `DoctorUseCase` (audit + fix),
`StatusFileParser`'s two formats, and a **mermaid** data-flow diagram. Cross-link RESEARCH-REGISTRY + MCP-SERVER.

**Testing.** `mkdocs build --strict` clean; mermaid renders (DIAGRAMS.md/mermaid plugin already in the site);
a link-check that the referenced source files exist (optional CI doc-lint).

**Documentation.** This *is* the deliverable. Keep the diagram source in the doc (not a binary) so it stays current.

**Acceptance.** Architecture reflects v0.11.x use-cases; diagram renders; strict build passes.

---

### FW-20 — `RESEARCH-REGISTRY.md` + `MCP-SERVER.md` refresh · S · 🟢

**Problem.** Both predate `doctor`, the `progress`/`next` MCP fields, and the full pipeline; they should
mention the FW-15 ownership contract and (once merged) the FW-27 warning + FW-29 comment rule.

**Implementation (documentation item).** RESEARCH-REGISTRY: add `doctor`, the `.STATUS→atlas→obs board`
pipeline, the plain-vs-from-status ownership contract, the venue-comment rule. MCP-SERVER: document
`progress`/`next` in `atlas_get_projects` returns + the `kind` filter arg.

**Testing.** `mkdocs build --strict` clean; the documented MCP fields match `src/mcp/formatters.js` (a tiny
doc-vs-code assertion or manual diff at review).

**Documentation.** The deliverable. Link, don't duplicate ARCHITECTURE/ADR-002/ADR-003.

**Acceptance.** Both guides current with v0.11.x; strict build passes.

---

## 4. Sequencing & milestones

```
P0 data-safety   : R0 (0.11.1 ship)  →  FW-27 (warn + --research, ADR-002)
P1 correctness   : FW-29 (venue parse)  ‖  FW-16 (focused tests)        [parallel, independent]
P2 policy        : FW-28 (scanner marker + ADR-003)
P3 docs          : FW-15-doc → FW-20 → FW-18   (CLI-REF note, then guides, then architecture+mermaid)
```

- **Critical path:** R0 → FW-27 (the user-facing safety story).
- **Parallelizable:** FW-29 and FW-16 are independent S items; good first PRs.
- **Effort:** ~3–4 focused days total; P0 alone ~1 day.
- Each item ships as its own `feature/*` PR into `dev`; docs items may batch into one `docs/research-ops-refresh` PR.

## 5. Release plan

- **0.11.1** (R0) — patch: ships #37 (plain-sync preserve). Cut immediately.
- **0.12.0** — minor: FW-27 (warn + `--research`), FW-28 (scan marker), FW-29 (venue parse), FW-16 tests, and
  the FW-15/18/20 docs. Cut after P0–P3 merge to `dev` and CI is green; promote `dev`→`main`, tag, tap auto-bump.

## 6. Tracking

One GitHub issue per item (labels `research-ops`, milestone `0.12.0` except R0 = `0.11.1`), each with a
checklist of **impl · unit/integration/e2e tests · docs · CHANGELOG · acceptance**. ADR-002/ADR-003 land in
`dev-tools/docs-standards/adr/`. This plan is the index; issues are the execution surface.

## 7. Risks & mitigations

- **Perf regression if FW-27 ever goes to option C** → benchmark `--from-status` on the full tree first (FW-27b).
- **Scanner marker (FW-28-B) mis-recurses** → depth cap retained; unit test asserts no recurse past maxDepth.
- **Docs drift** → tie `mkdocs build --strict` into the docs PRs; keep mermaid/diagram source inline.
- **Installed-binary lag** → R0 first, so the safety fix is live before the rest lands.
