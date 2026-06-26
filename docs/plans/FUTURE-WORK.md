# Future-Work Plan — Research-Ops Platform

> The platform is **built, merged, documented, and live** (atlas registry + `doctor`, ADR-001 contract,
> `obs link`, `obs research board` → vault). This plans everything deferred: board completeness,
> born-ready automation, model decisions, architecture/docs deep-dives, release, and stretch.
> Effort: **S** ≤½d · **M** ½–2d · **L** 2–4d. Date: 2026-06-25.
>
> *Research-manuscript work (collider R&R, product-of-three JASA, pmed proposals, sequential/sensitivity)
> is tracked separately in `RESEARCH_HUB` / `_ACTION-BOARD`; the standing #1 there is `medrobust submit_cran()`.
> This doc covers the **platform/tooling** backlog only.*

---

## Status — updated 2026-06-26

**Shipped since this plan was written:**

- ✅ **M1 board-truth (FW-1, FW-3, FW-4)** — `journal:`→venue alias, raw priority label preserved, MCP `progress`/`next` parity. (PR #33)
- ✅ **FW-10 registry hygiene** — removed 204 leaked test-temp entries (`/var/folders/.../T/tmp.*`) + 20 orphans (dead paths + stale `probmed` worktrees). Root cause was the CLI ignoring the documented `ATLAS_DATA_DIR`, so `dogfood-interactive-v2.sh` leaked fixtures into `~/.atlas`; **fixed** (PR #34) + dogfood version assertion made release-agnostic. Registry now reflects real projects; `doctor` honest at ~46/62.
- ✅ **FW-24 release** — **atlas v0.11.0** cut (dev→main #35, GitHub Release, tap auto-bumped via `homebrew-release.yml`, `brew upgrade`). Installed binary now carries registry/`doctor`/`--kind`/board-truth. Reconciled a pre-existing dev↔main squash-merge divergence with a verified `-s ours` back-merge.
- ✅ **FW-15 (the real bug)** — plain `sync` was **stripping** research `kind/target/tasks/priorityLabel` (not merely ignoring them); any `atlas sync` wiped the research registry. **Fixed**: `SyncRegistryUseCase._preserveResearchMetadata` carries them forward on update; regression test added. Issue #36.

**Decisions locked this session:**

- **mcp-servers → umbrella-only.** The 9 child repos (own `.git`, 3 levels deep) are not tracked individually; atlas's scanner is 2-deep, so they'd re-orphan every sync. Track the umbrella `mcp-servers` only.

**Still open from this plan:** FW-9 (curated `CLAUDE.md` backfill — 7 dev-tools + `examark` `.STATUS`, in progress), FW-15 doc note (CLI-REFERENCE), FW-2/5/6/7 (dashboard surfaces), FW-8/11–14 (born-ready + scheduler), FW-16/18–23 (tests + docs), FW-25 (obs release), FW-17/26 (stretch).

**New follow-ups discovered this session** — now planned in detail in [`ATLAS-FIX-PLAN.md`](ATLAS-FIX-PLAN.md)
(per-item design, tests, docs, acceptance). Tracking issues: **#40 (FW-27)**, **#41 (FW-28)**, **#42 (FW-29)**,
the docs/test deep-dives **#43–#46** (FW-15-doc/16/18/20), and the 0.11.1 ship **#39**.

| ID | Task | Repo | Effort | Acceptance |
|----|------|------|--------|-----------|
| FW-27 | Make sync research-safe by design: either make `--from-status` the default, or have plain `sync` **warn** when it would touch a project carrying research metadata (belt-and-suspenders over the FW-15 preserve-fix) | atlas | **S–M** | plain sync never silently degrades a research project; warn or no-op |
| FW-28 | Scanner depth / sub-repo tracking: either support an explicit deeper scan path for monorepo-style dirs (`mcp-servers/*`) or document umbrella-only as policy in CLI-REFERENCE | atlas | **S** | sub-repos either tracked stably or explicitly out-of-scope |
| FW-29 | Venue parse strips trailing inline comments: `target: CSDA … # was JASA` currently stores the comment in the venue string | atlas (StatusFileParser) | **S** | venue = `CSDA`, comment dropped; test |

---

## E1 — Board completeness & data fidelity
Make the dashboard show everything, accurately.

| ID | Task | Repo | Effort | Depends | Acceptance |
|----|------|------|--------|---------|-----------|
| FW-1 | Map collider `journal:` → venue (board shows `—`); generalize `.STATUS` venue aliases (`journal`/`venue`/`target`) | atlas (StatusFileParser) | **S** | — | collider row shows `AMPPS`; test |
| FW-2 | **`MediationVerse_Dashboard` render target**: package table + CRAN cascade (medfit→…→mediationverse) | obs (research_board) | **M** | FW-7 | `obs research board --target dashboard` matches the hand-built dashboard (golden) |
| FW-3 | Better priority encoding: keep raw `.STATUS` priority (P0/P1/high) instead of mapping to int `3`; board ranks by it | atlas + obs | **S** | — | `priority` in json is the source string; board orders P0<P1<… |
| FW-4 | MCP `atlas_get_projects` returns `progress`/`next` (parity with `--json`) | atlas (mcp) | **S** | — | MCP return includes them; test |
| FW-5 | Table-view `kind` column / `🔬` marker in `atlas project list` (currently json/MCP only) | atlas | **S–M** | — | `project list` table shows kind; snapshot updated |
| FW-6 | `atlas plan` research grouping (Manuscripts/Programs section w/ next + taskCount) | atlas | **M** | — | `atlas plan` lists research items; test on fixture |
| FW-7 | Select packages for the dashboard (atlas `kind: package` or `type=r-package` filter + CRAN-state field) | atlas + obs | **S–M** | — | `obs research board --kind package` returns the 7 packages |

## E2 — Born-ready automation (close the coverage loop)
New projects satisfy the contract automatically; existing gaps backfilled.

| ID | Task | Repo | Effort | Depends | Acceptance |
|----|------|------|--------|---------|-----------|
| FW-8 | Wire scaffolders to call **`obs link`** at birth (`research-scaffold`, `atlas init`) | savant + atlas | **M** | — | a new project has `.STATUS`+`CLAUDE.md`+`.obs/sync.yml`+atlas reg; `doctor` green |
| FW-9 | `atlas doctor --fix --write` **curated CLAUDE.md backfill** (review preview, exclude junk dirs) | atlas + repos | **M** | — | real projects get a meaningful `CLAUDE.md`; `doctor` count improves |
| FW-10 | Registry hygiene: `atlas sync --remove-orphans` + drop `/tmp/focus-test` scan path + prune deprecated entries | atlas (config) | **S** | — | `doctor` total reflects real projects (not 276) |
| FW-11 | Retire `mediationverse-status-sync` prompt (flag-gated; keep disabled one cycle) once `obs research board` proven | scheduler/savant | **S** | FW-2 | dashboard generated by obs, not the prompt; rollback flag exists |
| FW-12 | Schedule `obs research board --dry-run` **drift guard** (launchd/cron) + write step on cadence (Mon pipeline) | scheduler | **S** | — | nonzero exit on drift; board auto-refreshes |
| FW-13 | `.flow/obsidian-sync.yml` → `.obs/sync.yml` migration (obs reads both; relocate + shim one release) | obs + repos | **S–M** | — | mirror maps live under `.obs/`; `obs link` is the writer |
| FW-14 | obs unified config bootstrap (`~/.config/obs/config.yaml`) — currently unset; `obs config init` | obs | **S** | — | `obs config show` returns a valid config |

## E3 — Model & parser decisions (realize the ADR choices)

| ID | Task | Repo | Effort | Depends | Acceptance |
|----|------|------|--------|---------|-----------|
| FW-15 | **Parser parity (single path)**: document plain `atlas sync` = packages-only; add a guard test that it ignores research keys | atlas | **S** | — | `plain sync ignores kind/tasks` test; CLI-REF note |
| FW-16 | Focused tests for `ProjectsAPI.list()` research fields + `--kind` filter + MCP `kind` forwarding (close the ⚠️ rows) | atlas | **S** | — | direct unit coverage, not transitive |
| FW-17 | *(Deferred unless needed)* Formal `Task` entities + `atlas task list --project` over proposals | atlas | **M–L** | — | only if proposal-level workflow (toggle done/due) is wanted |

## E4 — Architecture & docs deep-dives (the docs-plan leftovers)

| ID | Task | Repo | Effort | Depends | Acceptance |
|----|------|------|--------|---------|-----------|
| FW-18 | atlas `ARCHITECTURE.md` — `DoctorUseCase` + research-registry data flow (+ mermaid) | atlas | **S–M** | — | architecture reflects the new use-cases |
| FW-19 | obs `developer/architecture.md` + `api-reference.md` — `research_board.py`, `obs_link.py` | obs | **S–M** | — | modules documented |
| FW-20 | atlas `RESEARCH-REGISTRY.md` / `MCP-SERVER.md` refresh (doctor, progress/next, full pipeline) | atlas | **S** | FW-4 | guide mentions doctor + new fields |
| FW-21 | docs-standards `research-ops/overview.md` — cross-cutting front-door + pipeline diagram | docs-standards | **M** | — | one canonical overview linked from each repo + website |
| FW-22 | savant skills index — list the 4 new skills (collider/cran/s7/longitudinal) in the docs site | savant | **S** | — | skills discoverable in savant docs |
| FW-23 | Public **Research-Ops page** on data-wise.github.io (beyond the software-list blurb) | website | **M** | FW-21 | a public platform showcase page |

## E5 — Release & ops

| ID | Task | Repo | Effort | Depends | Acceptance |
|----|------|------|--------|---------|-----------|
| FW-24 | **Cut an atlas release** (version bump, CHANGELOG, dev→main) so the installed Homebrew binary carries the registry/doctor fixes; `brew upgrade` | atlas (Claude Code) | **S–M** | E1–E3 merged | installed `atlas` has `--kind`/`doctor`; obs board works against installed atlas |
| FW-25 | obs release carrying `obs link` + `obs research board` | obs (Claude Code) | **S** | — | installed `obs` has the new commands |

## E6 — Stretch

| ID | Task | Repo | Effort | Depends | Acceptance |
|----|------|------|--------|---------|-----------|
| FW-26 | Interactive **HTML research dashboard** (reads atlas MCP live; KPI cards + filterable proposal table + CRAN cascade) | new | **M** | FW-4/FW-7 | a live HTML board complementing the vault one |

---

## Sequencing & milestones
```
M1 (board truth)  : FW-1, FW-3, FW-4, FW-7  → board shows venue/progress/priority + package data
M2 (dashboard)    : FW-2, FW-5, FW-6        → MediationVerse_Dashboard + table/plan surfaces
M3 (born-ready)   : FW-8, FW-9, FW-10        → new+existing projects contract-complete
M4 (retire+sched) : FW-11, FW-12, FW-13, FW-14 → obs supersedes status-sync; scheduled; .obs migration
M5 (harden+docs)  : FW-15, FW-16, FW-18–FW-22  → tests + architecture/docs deep-dives
M6 (release)      : FW-24, FW-25              → installed binaries carry everything
M7 (optional)     : FW-17, FW-23, FW-26
```
Critical-path-ish: **FW-7 → FW-2** (package dashboard) and **FW-24** (release) gate the "installed tools just work" experience. ~**5–8 focused days** for M1–M6; M1 alone ~½–1 day.

## Recommended first batch (highest leverage, low risk)
1. **FW-1 + FW-3 + FW-4** — board data truth (venue, priority, MCP parity). *~½ day, makes the live board fully accurate.*
2. **FW-10 + FW-9** — registry hygiene + curated `CLAUDE.md` backfill. *Turns `doctor` 47/276 into an honest, mostly-green number.*
3. **FW-24** — cut the atlas release so the **installed** `atlas`/`obs` work end-to-end (today the live board needs the dev binary).

## Out of scope here (separate backlog → `RESEARCH_HUB` / `_ACTION-BOARD`)
medrobust `submit_cran()` (cascade unblock — **the standing #1**) · collider R&R upload (AMPPS, Aug 7) ·
product-of-three JASA submission · pmed-modern proposals 01–05 · sequential + sensitivity manuscripts · Data-Fusion P_med.

## How to track
Recommend filing **GitHub issues** per epic (labels `research-ops`, `M1`–`M7`) so the backlog lives next to
the code; mirror the milestone list into atlas `docs/plans/`. (I can create the issues on request.)
