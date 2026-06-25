# Gap Analysis — Research Registry

> Companion to [`SPEC-atlas-research-registry.md`](SPEC-atlas-research-registry.md). Date: 2026-06-25.
> Scope: the research-registry feature on PR #21 (`feature/research-ops-spec-20260623`), plus the
> cross-repo program (RFC-000: atlas → obs → savant).

## TL;DR
- **Bugfix + Phase 1 + Phase 2 are done, tested (1470 unit tests green), and documented.**
- **Biggest remaining gaps:** (1) the obs `research board` that consumes the JSON, (2) parser **parity**
  (the plain `atlas sync` path doesn't parse `kind`/`tasks`), (3) the **table view** lacks a `kind` column.
- **Durability risk:** the installed Homebrew binary won't carry the fixes until a release is cut.

---

## 1. Coverage matrix

| Capability | Implemented | Tested | Documented |
|---|---|---|---|
| Parse `kind` / `target`(`venue`) from `.STATUS` | ✅ `StatusFileParser` | ✅ | ✅ README/CLI-REF/guide |
| Parse `tasks:` block (proposals) | ✅ `StatusFileParser._parseTaskItem` | ✅ | ✅ guide |
| `summarize()` groups `byKind` | ✅ | ✅ | ➖ (internal) |
| Carry `kind`/`target`/`tasks` → `metadata` (create+update) | ✅ `SyncFromStatusUseCase` | ✅ | ✅ |
| Change detection for `kind` + task count | ✅ (null-normalized) | ✅ | ➖ |
| `project list --kind` filter | ✅ `ProjectsAPI.list` + `bin` | ⚠️ via formatter only | ✅ CLI-REF |
| `kind`/`target`/`taskCount` in `--format json` | ✅ | ⚠️ indirect | ✅ |
| MCP `atlas_get_projects` returns + `kind` filter | ✅ handler + schema | ⚠️ formatter only | ✅ MCP-SERVER |
| Registry-load robustness (description truncation) | ✅ read+write guards | ✅ regression | ✅ CHANGELOG/SPEC §11 |
| Table-view `kind` column | ❌ | ❌ | ❌ (noted) |
| `atlas plan` surfaces research/kind explicitly | ❌ (projects appear, kind not highlighted) | ❌ | ❌ |
| Formal `Task` entities + `atlas task` over proposals | ❌ (deferred → `metadata.tasks`) | ❌ | ➖ |
| Plain `atlas sync` path (`StatusFileGateway`) parses kind/tasks | ❌ parity gap | ❌ | ❌ |
| obs `research board` consuming JSON | ❌ (separate repo, SPEC-obs) | ❌ | ➖ |

Legend: ✅ done · ⚠️ partial/indirect · ❌ missing · ➖ n/a or intentionally internal.

---

## 2. Gaps & risks (prioritized)

### 🔴 High
1. **obs `research board` not built.** The JSON/MCP surface exists and is the contract, but nothing
   renders it yet. This is the user-visible payoff. *Owner:* `obsidian-cli-ops` (SPEC-obs). *Effort:* M.
2. **Parser parity.** Two parsers exist: `StatusFileParser` (`sync --from-status`, **now** kind/tasks-aware)
   and `StatusFileGateway` (`SyncRegistryUseCase`, the plain `atlas sync` — **not** kind/tasks-aware, and
   requires `---` frontmatter). A user running plain `atlas sync` won't get research fields. *Effort:* S–M.

### 🟡 Medium
3. **Table view lacks `kind`.** `project list` (default table) shows name/path/status/type; `kind`/venue/
   tasks only appear in `--format json` and MCP. Add a column or a `🔬` marker. *Effort:* S.
4. **`atlas plan` doesn't highlight research.** Research projects are registered (so they appear), but
   `plan` doesn't group/badge manuscripts vs programs or show proposal task counts. *Effort:* S–M.
5. **Direct unit coverage for `ProjectsAPI.list()` research fields + `--kind` filter.** Currently covered
   transitively (formatter tests + the live e2e); add a focused use-case test. *Effort:* S.

### 🟢 Low / watch
6. **Tasks-block parsing edges.** Comment/blank lines don't close a `tasks:` block, so a stray prose
   bullet `- key: value` immediately after (separated only by comments) could be mis-read; mitigated by
   dropping items without `text:`. Consider closing the block on a blank line. *Effort:* S.
7. **Markdown-format shadowing.** If a research `.STATUS` contains a `## Word:` line, `StatusFileParser`
   switches to markdown mode and a YAML-style `kind:` header would be ignored. Real research files use
   YAML-style headers, so this is latent. Document the convention (done in the guide). *Effort:* S.
8. **No `kind` validation.** Free-text; a typo (`progam`) is silently accepted. Optional enum-warn. *Effort:* S.
9. **`target`-only changes don't trigger re-sync** (only `kind` + task count are in change detection).
   Low impact. *Effort:* S.
10. **Durability:** installed Homebrew `@data-wise/atlas` 0.10.0 runs a published copy; fixes land only
    after a release + `brew upgrade`. Store is already data-repaired. *Owner:* release. *Effort:* S.

---

## 3. Phase-3 roadmap (proposed)

| # | Item | Repo | Effort | Why |
|---|---|---|---|---|
| 1 | obs `research board` reading `atlas project list --kind … --format json` / MCP | obsidian-cli-ops | **M** | the payoff — a live manuscripts/programs board in the vault |
| 2 | `kind` column / `🔬` marker in `project list` table + `atlas plan` research grouping | atlas | **S–M** | human-facing parity with JSON |
| 3 | Parser parity: teach `StatusFileGateway` (plain `atlas sync`) the research fields, or converge on one parser | atlas | **S–M** | consistent behavior regardless of sync path |
| 4 | Focused tests: `ProjectsAPI.list()` research fields + `--kind` filter; MCP handler forwards `kind` | atlas | **S** | close the ⚠️ rows above |
| 5 | (Optional) promote `metadata.tasks` → formal `Task` entities + `atlas task list --project=<program>` | atlas | **M–L** | only if proposal-level workflow (status, done-toggles) is wanted |
| 6 | Cut an atlas release so the installed binary carries the fixes | atlas/release | **S** | durability |
| 7 | Roll `kind:`/`tasks:` into the remaining research `.STATUS` headers (collider, product-of-three, sensitivity, sequential) | research repos | **S** | light up the board with real data |

**Recommended next:** #1 (obs board) — it turns this plumbing into something visible — paired with #2
(table/plan surface). #5 is deferred unless proposal-level task workflow is actually needed.

---

## 4. Decisions needed
- **Parser strategy (gap #2):** extend `StatusFileGateway`, or make `sync --from-status` the single
  research path and document plain `sync` as packages-only? (Recommend the latter — less code, clear split.)
- **Proposals model (gap #5 / roadmap #5):** keep lightweight `metadata.tasks`, or invest in formal
  `Task` entities? (Recommend staying lightweight until a concrete `atlas task` workflow is requested.)
