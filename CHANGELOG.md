# Changelog

All notable changes to Atlas are documented here.

## [Unreleased]

### Added
- **Dashboard nudge awareness** (`atlas dash`, #115) — the Now view surfaces fired-but-unacked wall-clock nudges without a separate `atlas nudge ls`: a bordered banner (up to 3 fired nudges + `+N more`, never showing pending), `●N`/`○N` fired/pending count badges on the sidebar project list, and a standalone fired-count chip on the status bar visible from every view. Press `a` in the Now view to ack every fired nudge in one keystroke — sequential, partial-failure-tolerant, and it never touches a pending (not-yet-fired) nudge. New `useNudges` hook polls `guards.json` every 10s and is the dashboard's first hook to return a write action, not just data; its post-ack refresh guards against a poll already in flight resurrecting a just-cleared badge (verified with a planted-defect test). See `docs/specs/SPEC-dashboard-nudge-awareness-2026-08-01.md`.

## [0.17.0] - 2026-08-01

### Added
- **Wall-clock nudges** (`atlas nudge add/fire/ack/rm/ls`) — reminders that fire via macOS `launchd`, unlike every other atlas command, even when no Claude surface (app or terminal) is open. State lives in `~/.claude/guards.json` (shared across surfaces) via a new `INudgeStore` gateway (`GuardsFileNudgeStore`), never through the storage-backend-branching repository path, since it's a fixed external file, not swappable storage. One-shot and `--daily` recurring nudges branch differently on `ack` (one-shot unschedules; `--daily` stays loaded for tomorrow) and `rm` (unconditional stop, the only way to kill a `--daily` nudge). `atlas nudge fire` takes its message from the stored `Nudge` record, never from `launchd`-supplied arguments, and passes it to `osascript` via `on run argv` (argument array, not string interpolation) to close an AppleScript-injection path. `atlas doctor`/`doctor --fix` gained nudge-drift reconciliation (a scheduled nudge with no matching `launchctl` job).
- **`atlas day [--date YYYY-MM-DD] [--format table|json]`** — multi-repo activity provider: commits and `.STATUS` changes across the `r-packages/`, `research/`, `teaching/`, and `dev-tools/` project trees, plus tracked session minutes per tree. Feeds savant's `research-day-log` skill via `--format json`. All four tree keys are always present in the output, even with no activity. `GitGateway` gained `getCommitsSince`/`getStatusDiff`, both using `execFile` with an argument array (never a string-interpolated `exec()` call) and pathspec-scoped to `.STATUS` for the diff variant.

### Fixed
- A bare `git log --since=YYYY-MM-DD` defaults its time-of-day to *now* (wall-clock time when the command runs), not midnight — silently excluding same-day commits made earlier in the day. `GitGateway`'s new date-range methods pin an explicit `00:00:00` on both `--since`/`--until`.
- `GuardsFileNudgeStore` performed every nudge write as an unlocked read-modify-write of `guards.json` — a `launchd` fire updating state could race an interactive `nudge add`/`ack` and silently drop one write. Added a lock file (`${guardsFile}.lock`, atomic create, stale-PID reclaim) serializing writes, plus write-then-rename for atomicity.
- `LaunchdNudgeScheduler`'s generated plist XML did not escape its interpolated path values, so a `&`, `<`, or `>` in an install path could produce malformed XML with a confusing "launchctl load failed" error.
- `Nudge`'s constructor validated `time`/`message`/`state` but not `id`, which flows unescaped into a filesystem path via `launchdLabel`. Restricted to the id generator's own alphabet.

## [0.16.0] - 2026-07-20

### Added
- **ADHD-friendly docs-site redesign** — implements the full "Suggested next steps" table from `docs/specs/PROPOSAL-docs-site-design-audit-2026-07-19.md`:
  - Nav bar collapsed from 7 tabs to Home + 4 color pills (Learn/Do/Build/Code) + a sidebar search filter (`overrides/partials/tabs.html`).
  - The previously-dead `--atlas-learn/do/build/code` CSS tokens are now wired into the sidebar via a `data-atlas-section` body attribute set by the new `docs/assets/javascripts/section-nav.js`, tinting the active nav item and pill dot to match the current section.
  - Single-open sidebar accordion with item-count badges — required dropping `navigation.sections` from `mkdocs.yml`, since that Material feature forces L2 nav groups always-expanded via CSS and silently defeated the checkbox-based collapse.
  - Homepage card grid rebalanced to 6 (added an ADHD Guide card), and the 5-row ADHD-principles table replaced with a scannable chip row.
  - Retuned background/type tokens: off-white/near-black surfaces instead of pure white/black, 16.5px/1.65 body type for long reading sessions.

### Fixed
- Both reduced-motion media-query blocks (`extra.css` and `fonts.css` each had their own) were missing the nav-arrow rotate and tabs-link hover transitions — extended to cover both.

## [0.15.0] - 2026-07-20

### Added
- **XDG Base Directory support** — new installs default to `$XDG_CONFIG_HOME/atlas` (or `~/.config/atlas`); existing `~/.atlas` installs keep working unchanged until you opt in. `resolveConfigDir()` centralizes the resolution logic (explicit `ATLAS_CONFIG`/`ATLAS_DATA_DIR` override → legacy `~/.atlas` if present → XDG default) across all 8 places atlas previously hardcoded the path, including a fix for a dead `dataDir` option in the MCP server that was silently ignored.
- **`atlas migrate --xdg [--apply] [--force]`** — relocates `~/.atlas` to the XDG location. Dry-run by default (reports file count/size); refuses to overwrite an existing XDG target (never bypassed, even with `--force`); guards against a concurrently running `atlas-mcp`/`atlas dash` via a PID lock (stale locks auto-clear; `--force` overrides a live one); falls back to a safe copy+rename+delete when the move crosses filesystems (`EXDEV`); writes a migration marker so re-runs and the resolver know it's done. See [Migrating to the XDG location](docs/CONFIGURATION.md#migrating-to-the-xdg-location).
- **`atlas doctor` XDG nudge** — bare `doctor` mentions (informationally, never a warning) when legacy data is still unmigrated; `doctor --fix`/`--fix --write` preview and apply the migration through the same guarded path.

### Fixed
- `Container.js` (the entry point `atlas dash` constructs directly) previously fell back to a hardcoded `~/.atlas` instead of the shared resolver — now consistent with every other call site.

## [0.14.0] - 2026-07-19

### Added
- **Bare `atlas` digest** — running `atlas` with no arguments now prints one glanceable screen (active session, project focus + next, inbox count, streak, top-3 suggestions) via the new `GetDigestUseCase`, composing the existing `GetContextUseCase`/`PlanDayUseCase` read paths. Additive only: `where`, `plan`, `session status --format json`, `inbox --count`, and `trail --limit` keep their exact prior output (flow-cli contract).
- **Evidence-linked `session end`** — computes the git delta (commits/files) since session start via `GitGateway`, prints it as evidence, prompts for the outcome only when stdin is a TTY (non-interactive runs keep the prior default-completed behavior), and auto-runs a registry sync scoped to the session's project. Non-git projects and zero-activity sessions degrade gracefully.
- **`status --complete` evidence** — records closing evidence (active session id, current git HEAD sha) into the `.STATUS` `metrics.closingEvidence` block when a next action is completed.

### Deprecated

| Command | Replacement | Removal |
|---|---|---|
| `atlas crumb` | `atlas session note <text>` | v0.15.0 |
| `atlas trail` | bare `atlas` (digest) or `atlas where` | v0.15.0 |
| `atlas park` | `atlas catch --type=note` (single parking concept on Capture) | v0.15.0 |
| `atlas unpark` | `atlas catch --type=note` | v0.15.0 |
| `atlas parked` | `atlas catch --type=note` | v0.15.0 |

Each deprecated command prints a one-line stderr pointer to its replacement; stdout output is unchanged in v0.14.0.

### Added — `.STATUS` schema
- **Canonical `.STATUS` schema `atlas/v1` (SPEC-status-schema-yaml-canonical-2026-07-19)** — one normative schema, documented in the new [docs/STATUS-SCHEMA.md](docs/STATUS-SCHEMA.md).
- **`atlas migrate --status [path]`** — converts a legacy `.STATUS` (markdown `## Key:` or bare `key: value`) to canonical YAML frontmatter. Dry-run by default (prints a field-level diff); `--apply` writes; `--all-scanned` batches a directory tree.
- **Unified read path** — `StatusFileGateway.read()` now delegates to `StatusFileParser.parseContent()`/`.normalize()`, so canonical frontmatter, legacy markdown, and legacy bare-yaml all produce the same normalized object, with the PR#87 duplicate-key / non-numeric-progress warning machinery now covering all three formats (previously markdown+yaml only).

### Fixed
- **Data-loss on write (audit finding)** — `StatusFileGateway.write()` previously silently dropped `kind`/`target`/`cran_state`/`tasks` when rewriting a markdown-format `.STATUS`. The writer now **refuses** to overwrite a legacy-format file (`LegacyStatusFileError`, naming `atlas migrate`) unless the caller explicitly opts in via `{ migrate: true }` — and when it does migrate, unknown keys and the markdown body are preserved.
- **`{{user}}` template placeholder never substituted by `atlas init -t <template>`** — `init` only passed `{name}`; `{{user}}` now resolves via `templateVariables.user` → `git config user.name` → `$USER` → `'user'`.
- **Validator/parser/template drift** — `StatusFileValidator.VALID_STATUSES` extended with `planning`/`blocked`/`stable` (the `research` template already shipped `status: planning`); `type` is now optional (the `minimal` template omits it); `next` is normalized to an array everywhere (was a bare string on the markdown/bare-yaml read paths).

### Changed
- All 6 builtin templates (`node`, `r-package`, `python`, `quarto`, `research`, `minimal`) now emit canonical YAML frontmatter instead of `## Key:` markdown headers.

### Docs
- **Docs site ADHD-first redesign** — landing page (`docs/index.md`) rebuilt with a 3-command
  quickstart above the fold and a Material `grid cards` pillar nav; `mkdocs.yml` nav regrouped
  to 7 top-level sections (Home / Get Started / Guide / Reference / Architecture / Integrations /
  Changelog), no page dropped from nav; `CLI-REFERENCE.md` gets a "Core 5" quick-start table up
  top with the rest tiered (legacy `atlas migrate` collapsed behind a `??? note`); every top-level
  nav landing page ends with a single "Now what?" next-step link. See
  `docs/specs/SPEC-docs-adhd-redesign-2026-07-19.md`.

### Removed
- **Legacy blessed dashboards (~5.9k LOC)** — deleted `src/cli/dashboard-blessed.js` (2,765 LOC), `src/cli/dashboard/` (3,125 LOC across `CardPool.js`, `ViewStateManager.js`, `constants.js`, `dialogs.js`, `helpers.js`, `stateMachine.js`, `timerManager.js`, `views/*.js`), and their 6 associated test files under `test/unit/cli/dashboard/` (1,597 LOC). Neither was reachable from `bin/atlas.js` or any live `src/` code — the `atlas dashboard`/`atlas dash` commands have used the Ink dashboard (`src/cli/dashboard-ink-launcher.js`) exclusively since v0.9.0. Confirmed via `grep -r "dashboard-blessed\|cli/dashboard/" src/ bin/ test/` returning zero hits before deletion. The `blessed`/`blessed-contrib` npm dependencies are retained for now because `src/ui/Dashboard.js` (a separate, also-unreferenced legacy component outside this change's scope) still imports them.
- **`src/ui/Dashboard.js` (425 LOC) + its sole referencer `test/e2e/dashboard.test.js`** — the last remaining `blessed`/`blessed-contrib` importer, confirmed unreachable from `bin/` or any live `src/` code. With this gone, `blessed` and `blessed-contrib` are removed from `package.json` dependencies (`grep -r "blessed" src/ bin/` now returns only comment/doc mentions, zero real imports) and the lockfile refreshed via `npm install`.

### Changed — TUI 3-view consolidation (SPEC-tui-consolidation-2026-07-19.md)
- **Ink dashboard: 8 views → 3** — `MainView`/`DetailView`/`InspectorPanel`/`EcosystemView` merged into **Now** (default; project list + selected-project detail, `e` toggles an ecosystem-wide stats pane); `FocusView`/`ZenView`/the InspectorPanel timer merged into **Timer** (single `PomodoroTimer` component, `z` toggles zen/dense chrome); `PlanView`/`AnalyticsView` merged into **Plan** (`a` toggles an analytics pane). `TimelineView` (time-block view) is dropped rather than re-homed — it had no natural absorption target in the 3-view design and is not restored elsewhere.
- **State machine: 8 states → 3** (`NOW`/`TIMER`/`PLAN`, `src/cli/dashboard-ink/lib/stateMachine.ts`).
- **New `lib/keymap.ts`** — single source of truth for every dashboard keybinding, grouped by scope (`global`/`now`/`timer`/`plan`/`help`); a mechanical test (`test/unit/cli/dashboard-ink/lib/keymap.test.tsx`) asserts no duplicate key within a scope. **New `?` help overlay** (`components/HelpOverlay.tsx`) renders directly from the keymap.
- **Shared components extracted:** `components/shared/ProjectList.tsx` (moved from `SidebarPanel.tsx`, used by Now's left pane) and `components/shared/PomodoroTimer.tsx` (the one Pomodoro timer implementation, replacing three separate copies in `FocusView`/`ZenView`/`InspectorPanel`).
- **`src/cli/dashboard-ink` LOC: 4,358 → 3,216 (26% reduction)** this PR; combined with the #94 deletion PR, the TUI layer is well past the spec's ≥55%-reduction target from the original 10,250-line baseline.

#### Keybinding migration (before → after)

| Action | Before | After |
|---|---|---|
| Switch view | per-view only (`f`/`z`/`T`/`e`/`p` from Browse) | `1`/`2`/`3` or `n`/`t`/`p` from anywhere |
| Ecosystem stats | dedicated `ECOSYSTEM` view (`e` from Browse) | `e` toggles ecosystem pane inside **Now** |
| Zen mode | dedicated `ZEN` view (`z` from Browse) | `z` toggles dense chrome inside **Timer** |
| Analytics | dedicated `ANALYTICS` view (`a`, any view) | `a` toggles analytics pane inside **Plan** |
| Help | none | `?` opens the new help overlay |
| Pause / resume timer | `Space` (3 separate implementations) | `Space` (1 implementation, `shared/PomodoroTimer.tsx`) |

No user-facing CLI change: `atlas dash` keeps working; only internal dashboard navigation changed.

## [0.13.1] - 2026-07-17

Code for this release was substantially complete by 2026-07-11 but the version
bump/tag/GitHub-release step was missed at the time — this entry now covers
everything actually merged to `main` in the v0.13.0..v0.13.1 range, not just
the original 2026-07-11 subset.

### Fixed
- **YAML passthrough (#65)** — StatusFileGateway now uses `yaml.stringify()`/`yaml.parse()` instead of hand-rolled template; unknown fields (research metadata, custom fields like `venue`, `tasks`) survive read-write round-trip.
- **.STATUS parser hardening (#87)** — `atlas sync --from-status`/`--research` and `atlas doctor` now warn (never silently swallow) on a non-numeric `progress:` value or a duplicate top-level key, instead of a stale/wrong value winning silently.
- **Dead `.obs/sync.yml` path references removed (#88)** — `DoctorUseCase` and related code no longer propagate references to obsidian-cli-ops's removed `obs link`/`.obs/sync.yml` schema (superseded by `.flow/obsidian-sync.yml`, v4.3.1).
- **Doctor/sync orphan & duplicate-name detection (#90, #91)** — a registered project whose path no longer exists on disk is now flagged `orphaned` (distinct from "missing CLAUDE.md") instead of silently shadowing a same-named real project in `atlas doctor` output; `atlas sync --remove-orphans` now checks real filesystem existence instead of "discovered by this scan," so a narrow `--paths` scope can no longer false-positive orphan unrelated registered projects.
- **PatternPresenter import path** in `useAnalytics.ts` corrected.
- **StatusBar dogfood tests** updated to match the current `LayoutStateMachine` implementation.
- **CHANGELOG link** in generated output now points to GitHub instead of a missing `docs/CHANGELOG` path.
- **Progress coercion** — `.STATUS` progress values are coerced to a number consistently; `get_val` fixed under `set -euo pipefail`.

### Added
- **Inbox --type flag (F6)** — `atlas inbox --type <type>` filters captures by type (`idea`, `task`, `bug`, `note`, `question`, `parked`, `win`).
- **Inbox --limit flag (F6)** — `atlas inbox --limit <n>` caps the number of items returned.
- **'win' capture type** — Added `'win'` to `Capture.TYPES` for quick-win tracking.
- **`cran_state:`/`cranState` field (#89)** — parsed from package-kind `.STATUS` files and exposed via `project list --kind`, `--format json`, and MCP `atlas_get_projects`.
- **E2E tests for inbox flags** — 6 new tests covering `--type`, `--limit`, help output, and combined flags.
- **YAML round-trip unit tests** — 2 new tests verifying unknown fields and research metadata survive write/read cycles.
- **YAML passthrough dogfood test** — `test/dogfood/dashboard-ink/yaml-passthrough.sh` (5 dual-path verified tests).
- **CLI testing tools research** — Evaluated vitest-command-line, clet, repterm, tui-test, node-cli-testing. Saved to `docs/internal/CLI-TESTING-TOOLS.md`.
- **Research sync + board render wrapper script (FW-12)** — new automation for the research-board pipeline.

### Changed
- **Documentation site redesign** — nav restructure (Getting Started / User Guide / Reference), ADHD-friendly design system (color-coded nav, foldable sidebar sections, prominent search), cookbook/workflow docs reorganized into `user-guide/` subfolders, internal specs/planning docs excluded from the published site.
- **CI: Node 20 → 22** — Node 20 was deprecated on GitHub Actions runners.
- Man pages and zsh completions regenerated to match current commands.

## [0.13.0] - 2026-07-04

### Added
- **AnalyticsView Dashboard View** — New full-screen view (`a` key) providing deep productivity insights:
  - **Focus Velocity**: 30-day ASCII sparkline, trend indicator, and 4-week summary table.
  - **Flow Patterns**: 7×24 hour-day heatmap for productivity distribution, including best day/hour and dead zone callouts.
  - **Navigation**: Tab-locked single-panel layout with project cycling (← →) and quick-links to Focus (`f`) and Detail (`Enter`).
- **StatusBar Component** — Unified 3-zone status bar for the Ink dashboard:
  - **Session Zone**: Active session dot, project name, and elapsed timer.
  - **Key Hints Zone**: Context-aware key-binding hints for the current view state.
  - **Layout Zone**: Current layout mode icon and pending capture count.
- **Testing Infrastructure** — Expanded E2E testing suite:
  - Integrated Vitest + `ink-testing-library` for component-level E2E.
  - Integrated Playwright for CLI subprocess E2E.
  - Added analytics dogfood tests for dual-path verification (code vs oracle).

### Fixed
- **CLI project remove resolution** — Resolves project remove command using case-insensitive project names rather than strictly UUIDs. Handles duplicate project name collision by prompting the user with paths and UUIDs of conflicting projects. (#22)

## [0.12.2] - 2026-06-26

### Chore
- **ESLint flat config** (`eslint.config.js`) — opt-in flat config (ESLint 8.57 `ESLINT_USE_FLAT_CONFIG=true`); lints `src/` + `test/` plain-JS files; TypeScript (`**/*.ts`, `**/*.tsx`) and legacy `dashboard-blessed.js` ignored. Rules: `args:none` + `caughtErrors:none` for interface-stub and catch-probe idioms; `no-empty: allowEmptyCatch`. (#56)
- **Zero-warning cleanup** — pruned all 135 pre-existing `no-unused-vars` warnings across 34 files (`src/` and `test/`); `npm run lint` now exits 0 with 0 warnings/errors. Notable: `StatusFileGateway.js` write-only `indentLevel` removed (declaration + assignment cascade); `dashboard-blessed.js` ignored (unimported legacy, side-effecting widget bindings kept as `_`-prefixed bindings where parent-attachment is a side effect). (`aec0784`)

### CI
- **Lint gate** — new `Lint` job in `test.yml` runs `npm run lint` on every PR; exits non-zero on errors (warnings are non-blocking). (#57)

## [0.12.1] - 2026-06-26

### Fixed
- **Sync id convergence** — plain `atlas sync` now resolves an existing project by **path** when the id misses, so it updates the entry `sync --from-status` registered (which uses a different id scheme) instead of creating a duplicate. Research metadata is preserved through the convergence; regression test added. (#49)
- **Node 26 support** — bumped `better-sqlite3` `^12.5.0` → `^12.11.1`. The old release capped its `engines` at Node 25 and its native addon failed to build on Node 26 (V8 removed `v8::PropertyCallbackInfo::This()`), which surfaced as 29 failing SQLite integration tests on Node 26. The full suite is now green on Node 18/20/22/26.
- **PatternAnalyzer crash on malformed `startTime`** — a session whose `startTime` was an unparseable string produced an Invalid Date, so `DAYS[NaN]` was `undefined` and `byDay[undefined].total++` threw a `TypeError`, crashing the entire `analyze()` call. Such rows are now skipped via a `Number.isNaN(t.getTime())` guard. (#58)

### Tests
- **Edge-case hardening** — 42 new characterization/edge tests across the v0.11–v0.12 research-sync surface (parser comment-stripping, tasks-block, sync research-safe preserve + FW-30 convergence, doctor audit, scanner marker) and the v0.10 temporal-intelligence modules (VelocityCalculator, PatternAnalyzer, PredictionEngine), plus a `scanDirectory` depth-convention characterization test. Suite: 1947 passing (89 suites). (#58)

### Documentation
- New **Cookbook** (`docs/COOKBOOK.md`) — 10 research-ops recipes (tag a manuscript, research-safe sync, doctor audit, retarget a venue, monorepo marker, recover after a plain sync, render the vault board, MCP, hygiene). API-GUIDE documents the research `list()` fields + the **Doctor API**; the research-registry tutorial + ARCHITECTURE cover `--research`, the `.atlas-scan-children` marker, and id convergence. Cookbook added to the mkdocs nav.

## [0.12.0] - 2026-06-26

### Added
- **`atlas sync --research`** — research-aware sync alias (forwards to `--from-status`, defaults to `~/projects/research`). (#40)
- **Plain-sync research warning** — a plain `atlas sync` now warns and names the research projects it preserved but did not refresh, with the remedy (`atlas sync --from-status`). Ownership contract: docs-standards ADR-002. Unit + e2e tests. (#40)

### Fixed
- **Venue/target inline comments** — `target:` / `venue:` / `journal:` now strip a trailing whitespace-anchored `# comment` (e.g. `CSDA # was JASA` → `CSDA`); a `#` without a preceding space is kept. (#42)
- **Scanner umbrella policy** — a project-dir is a scan leaf by default (umbrella-only); a `.atlas-scan-children` marker opts an umbrella in to having its child repos scanned too (bounded by maxDepth). Integration test added. Policy: docs-standards ADR-003. (#41)

### Tests
- **Focused research-surface coverage** — direct unit tests for `ProjectsAPI.list()` research fields + `--kind` filter (previously only transitive). (#44)

## [0.11.1] - 2026-06-26

### Fixed
- **Plain sync no longer strips research metadata** — `atlas sync` / `sync --remove-orphans` (`SyncRegistryUseCase`) used to null `kind`/`target`/`tasks`/`priorityLabel` that `sync --from-status` had populated, silently emptying the research registry on every routine sync. It now carries those fields forward on update (`_preserveResearchMetadata`). Regression test added. (#36)

### Documentation
- Brought reference docs current to v0.11.x: `atlas doctor` + the plain-sync vs `--from-status` ownership contract in RESEARCH-REGISTRY and CLI-REFERENCE; `progress`/`next`/`priority` in MCP-SERVER; a research-registry + doctor data-flow (mermaid) in ARCHITECTURE; REFCARD bumped to v0.11.0. Added `docs/plans/ATLAS-FIX-PLAN.md` (the research-ops fix plan) and cross-linked `FUTURE-WORK.md` with the tracking issues (#39–#46).

## [0.11.0] - 2026-06-25

### Added
- **Research registry** — `sync --from-status` now parses research `.STATUS` metadata so manuscripts and programs appear in the registry alongside packages:
  - `kind:` (`manuscript` | `program`), `target:`/`venue:` (publication venue), and a `tasks:` block (`- text: ...; priority: ...; done: ...`) capturing a program's proposals as task entries.
  - `StatusFileParser.summarize()` groups projects `byKind`.
  - `atlas project list --kind <manuscript|program|package>` filter.
  - `kind` / `target` / `taskCount` exposed in `project list --format json` and MCP `atlas_get_projects` (consumed by the obs research board).
  - New parser / sync / formatter tests; full unit suite green (1470).
- **`atlas doctor`** — read-only audit of the Project Settings Contract (`.STATUS`, `CLAUDE.md`, `.obs/sync.yml`) with `--kind`, `--all-registered`, and `--fix`/`--write` (creates missing `CLAUDE.md`). Excludes worktrees/tmp by default; exits 1 on missing `.STATUS` (CI/launchd drift guard).
- **`project list --json`** now also returns `progress`, `next`, and `priority` (research-board fidelity).
- **Docs** — [Research Registry guide](docs/RESEARCH-REGISTRY.md), [Research Registry & Doctor tutorial](docs/tutorials/research-registry.md), gap analysis, and Phase-3 roadmap.

### Fixed
- **Registry-load robustness** — a single stored project whose `description` exceeded the 500-char limit threw inside `FileSystemProjectRepository.findAll()`, cascading "Failed to load projects" to every sync target (one corrupt row bricked the whole registry). `_deserializeProject` now truncates `description` on read; `SyncRegistryUseCase` truncates the next-action-derived description on write (parity with `metadata.notes`). Regression test added.
- **Store-isolation env var** — the CLI now honors `ATLAS_DATA_DIR` (documented in `docs/CONFIGURATION.md` and already honored by the MCP entry point) as a fallback after `ATLAS_CONFIG`, so the documented data-dir override actually works for `bin/atlas.js`. Previously the CLI silently ignored it and wrote to `~/.atlas`, which let `test/dogfood-interactive-v2.sh` (which set only `ATLAS_DATA_DIR`) leak its `mktemp` fixtures into the real registry; that script now also exports `ATLAS_CONFIG`. New `Config` env-precedence tests (`ATLAS_CONFIG` > `ATLAS_DATA_DIR` > `~/.atlas`).

## [0.10.0] - 2026-06-19

### Added
- **VelocityCalculator** — 4-week rolling velocity analytics over existing session history
  - ISO-week bucketing: sessions/week, focus hours, consistency score
  - Trend detection: compares mean(weeks 1-2) vs mean(weeks 3-4), ±10% threshold → ↑/↓/→
  - Sparkline output using block characters `▁▂▃▄▅▆▇█`
  - `atlas stats --velocity`
- **PatternAnalyzer** — 90-day productivity pattern detection
  - Best day and best hour by flow rate (sessions where `getDuration() >= 15min`)
  - Dead zones: hour/day slots with 0 flow rate and ≥3 sessions observed
  - `atlas stats --patterns`
- **PredictionEngine** — Bayesian per-project time calibration
  - Filters completed sessions for a project, removes outliers via MAD-based robust Z-score
  - Ratio fallback when MAD = 0 (all durations identical); priorWeight = 3 toward 1.0
  - Confidence tiers: low (<5 sessions), medium (5-9), high (≥10)
  - `atlas stats --calibrate <project> --minutes <n>`
- 31 new unit tests across 3 test files

## [0.9.3] - 2026-06-14

### Added
- **flow-cli integration flags** — CLI flags that flow-cli already calls, now honored by atlas:
  - `atlas session status --format <table|json>` — JSON emits `{project, durationMinutes, state, task, startedAt}` (or `null` when no active session); fixes flow-cli's silent conflict-detection on project switch
  - `atlas project list --count` — bare integer count of matching projects
  - `atlas project list --suggest` — the most-recently-touched active project name
  - `atlas inbox --count` — bare integer pending inbox count
  - `atlas trail --limit <n>` — cap breadcrumbs to the N most recent
- `ProjectsAPI.suggest()` and a `limit` parameter on `context.trail()`
- `docs/INTEGRATIONS.md` — live flow-cli ↔ atlas integration (contract surface + architecture diagram)
- Strict docs CI (`mkdocs build --strict` validate job, runs on PRs)

### Fixed
- `atlas project list --status <s>` now resolves status from project metadata — previously matched zero scanned projects, silently breaking flow-cli's contracted `project list --status=active --format=names`

## [0.7.0] - 2025-12-29

### Added
- **Session Export** (`atlas session export`):
  - Export sessions to iCal/ICS format for calendar apps
  - Compatible with Apple Calendar, Google Calendar, Outlook
  - Filter by days, project, or period (week/month/year/all)
  - JSON export option for data analysis
  - Examples:
    ```bash
    atlas session export sessions.ics        # Export to iCal
    atlas session export --days 60           # Last 60 days
    atlas session export --project myproject # Filter by project
    atlas session export --format json       # JSON output
    ```

- **Task-Based Focus** (Dashboard):
  - "What will you focus on?" prompt before starting Pomodoro
  - Task displayed prominently during focus timer
  - Completion tracking after timer ends:
    - `c` - Completed
    - `p` - Partial progress
    - `n` - Pivoted to something else
  - Outcomes stored in session history

- **Timeline View** (Dashboard):
  - Press `T` (Shift+T) to enter timeline view
  - Visual timeline of today's sessions
  - Color-coded time blocks by project
  - Shows gaps and total work time
  - Helps with time blindness awareness

### Changed
- Dashboard state machine now supports TIMELINE state
- Focus mode integrates task prompts and outcome tracking
- Updated help dialog with new keybindings

### Documentation
- Updated CLI-REFERENCE.md with session export command
- Updated REFCARD.md with v0.7.0 features
- Updated TUTORIAL.md with focus mode and export sections
- Updated WORKFLOWS.md with new workflow diagrams
- Updated index.md with v0.7.0 feature cards

### Tests
- 1,192 tests passing (+26 new for ExportSessionsUseCase)

## [0.6.3] - 2025-12-29

### Added
- **Stats Export** (`atlas stats --export`):
  - Export analytics to markdown or JSON files
  - Auto-generate filename with date: `atlas-stats-YYYY-MM-DD.md`
  - Markdown format with full report: `--format md`
  - Examples:
    ```bash
    atlas stats --export                    # Auto-named markdown
    atlas stats --export weekly.md          # Custom filename
    atlas stats --format json --export      # JSON export
    ```
- **CLI Documentation**: Updated CLI-REFERENCE.md with export examples

### Tests
- 1,166 tests passing (+10 new for markdown export)

## [0.6.2] - 2025-12-28

### Added
- **Demo GIFs CI Workflow** (`.github/workflows/demos.yml`):
  - Validates VHS tape file syntax
  - Generates GIFs on macOS runner
  - Optimizes with gifsicle (~30% smaller)
  - Posts PR comment with file sizes table
  - Auto-commits regenerated GIFs on main
- **Demo Section in README**: Embedded getting-started GIF with link to all demos
- **Demos Documentation Page**: `docs/DEMOS.md` with all 5 embedded terminal demos
- **Reusable Prompts**: `docs/prompts/DEMO-WORKFLOWS.md` for demo creation workflow

### Fixed
- **GitGateway Detached HEAD**: Handle CI environments where `git branch --show-current` returns empty
  - Falls back to `HEAD@<sha>` format
  - Fixes flaky test in GitHub Actions PR checkouts

## [0.6.1] - 2025-12-28

### Fixed
- **Friendly Error Messages**: Session commands now show user-friendly messages instead of stack traces
  - `atlas session start` when session already active: "⚠️ Session already active. End it first with: atlas session end"
  - `atlas session end` when no active session: "ℹ️ No active session to end"
- **VHS Demo Tapes**: Fixed tape files to use correct syntax (removed typed comments that caused zsh errors)

### Changed
- Terminal demo GIFs optimized with gifsicle (~30% smaller)

## [0.6.0] - 2025-12-28

### Added
- **Session Analytics** (`atlas stats`):
  - Weekly/monthly productivity summaries
  - Total sessions, time, and daily averages
  - Flow state percentage (sessions ≥15 min)
  - Completion rate tracking
  - Current and longest streak display
  - Best day highlight
  - Hourly distribution sparkline
  - Per-project breakdown
  - Multiple output formats: `--format table|json|text`
  - Project filtering: `--project <name>`
  - Custom periods: `--days <n>`, `week`, `month`
- **Documentation Website**:
  - MkDocs Material theme with dark/light mode
  - Live site: https://data-wise.github.io/atlas/
  - Auto-deploy via GitHub Actions on docs changes
  - Feature grid homepage, installation guide
  - Navigation tabs for all documentation
  - Mermaid diagram support

### Changed
- **Performance Improvements** (Plan B):
  - Virtual scrolling for 50+ projects in dashboard
  - Card pooling with object reuse pattern
  - Debounced rendering at 60fps target
- **State Management** (Plan C):
  - Centralized ViewStateManager with subscription pattern
  - Single source of truth for dashboard state
  - Simplified view updates

### Fixed
- CARD_HEIGHT constant duplication in MainView.js
- Dialog cleanup on screen destroy
- Helpers.js re-export indirection removed

### Tests
- 1,156 tests passing (up from 1,023)
- 50 new stats-related tests (use case + presenter)
- 9 new E2E tests for stats command

## [0.5.4] - 2025-12-26

### Changed
- **Release Sync**: Aligned tagged release with latest documentation improvements
- Homebrew formula updated to v0.5.4

### Notes
- This release ensures Homebrew users get all documentation and workflow enhancements from v0.5.3

## [0.5.3] - 2025-12-26

### Added
- **Comprehensive Documentation**:
  - `docs/CLI-REFERENCE.md` - Complete CLI command reference
  - `docs/ARCHITECTURE.md` - Clean Architecture overview with Mermaid diagrams
  - `docs/API-GUIDE.md` - Programmatic API usage guide
  - `docs/CONFIGURATION.md` - All settings and preferences
  - `docs/TUTORIAL.md` - Step-by-step getting started guide (15 min)
  - `docs/DIAGRAMS.md` - 10 Mermaid architecture diagrams
  - `CLAUDE.md` - Project intelligence file for Claude Code
- **Installation Options**:
  - `install.sh` - Curl-based installer script
  - Homebrew formula updated in Data-Wise/homebrew-tap
  - Installation docs updated (Homebrew, curl, source)
- **Tutorial Enhancements**:
  - Zellij terminal multiplexer integration guide
  - ADHD-friendly workflow patterns
  - Keybindings cheatsheet

### Fixed
- Tutorial: Corrected `atlas catch` syntax (use `-p` flag for project)
- Tutorial: Clarified `.STATUS` file requirement for status updates

## [0.5.2] - 2025-12-26

### Added
- **Template Variables from Config**: Custom variables in `preferences.templateVariables`
  - Variables replaced as `{{variable_name}}` in templates
  - Priority: defaults < config < CLI values
  - Common vars: `author`, `github_user`, `email`, `company`
- **Template Inheritance**: Extend built-in templates
  - Create with `atlas template create my-node --extends node`
  - Use `{{parent}}` to include parent template content
  - Frontmatter: `extends: node`

## [0.5.1] - 2025-12-26

### Added
- **Park Feature** (ADHD-friendly context switching):
  - `atlas park [note]` - Save session state with breadcrumbs
  - `atlas unpark [id]` - Restore parked context and start session
  - `atlas parked` - List all parked contexts
  - Captures: project, task, duration, breadcrumbs, note
  - Shows "where you left off" on restore
- **Template Management CLI**:
  - `atlas template list` - Show built-in + custom templates
  - `atlas template show <id>` - Display template content
  - `atlas template create <id>` - Create custom template
  - `atlas template export <id>` - Export built-in for editing
  - `atlas template delete <id>` - Remove custom template
  - `atlas template dir` - Show templates directory
- **Custom Templates**: Store in `~/.atlas/templates/`
  - YAML frontmatter for name/description
  - Override built-in templates
- **Comprehensive Tests**: 958 tests (unit + e2e)

### Changed
- Capture entity now supports `parked` type and status

## [0.5.0] - 2025-12-26

### Added
- **Project Templates**: `atlas init --template <type>` with 6 templates
  - `node` - Node.js/npm package
  - `r-package` - R package with roxygen2/testthat
  - `python` - Python package with pytest
  - `quarto` - Quarto manuscript/presentation
  - `research` - Academic research project
  - `minimal` - Bare minimum .STATUS file
- **Configuration Wizard**: `atlas config setup` for interactive configuration
- **Preferences System**: Dot-notation access for nested preferences
  - `atlas config prefs show/get/set/reset/defaults`
  - ADHD preferences (streak, time cues, celebrations)
  - Session preferences (pomodoro length, breaks)
  - Dashboard preferences (refresh rate, zen mode)
- **Non-interactive Dogfood Test**: 45 automated CLI tests
- **GitHub Actions**: CI runs on dev and main branches

### Changed
- Configuration now uses deep merge for nested preferences
- Config respects `ATLAS_CONFIG` environment variable

## [0.4.1] - 2025-12-26

### Added
- **ADHD-Friendly Utilities** (5 new helpers):
  - `StreakCalculator` - Consecutive day tracking with emoji display
  - `TimeBlindnessHelper` - Gentle time awareness without breaking flow
  - `SessionCompletionHelper` - "Good enough" endings, anti-perfectionism
  - `ContextRestorationHelper` - "Last time you were..." messages
  - `CelebrationHelper` - Positive reinforcement, milestone recognition
- Dashboard integration: streak display, time cues, celebrations
- CLI integration: context restoration on start, celebration on end

## [0.4.0] - 2025-12-25

### Added
- **Card Stack Layout**: Replaced table view with visual project cards
- **Enhanced Cards**: Progress bars, next actions, contextual information
- **Zen Mode**: Minimal distraction mode (`z` key)
- **Contextual Command Bar**: Shows available actions based on state
- **State Machine**: Reliable view transitions in dashboard
- **Timer Manager**: Centralized Pomodoro handling

### Changed
- Dashboard UI completely redesigned
- Improved terminal size handling

## [0.3.1] - 2025-12-25

### Added
- **Theme Cycling**: Press `t` to cycle through themes
- **Time-aware Suggestions**: Decision helper adapts to time of day
- **Pomodoro Stats**: Shows today's completed sessions
- **Break Enforcement**: Modal dialog after Pomodoro completes

## [0.3.0] - 2025-12-25

### Added
- **Focus Mode**: Minimal UI with Pomodoro timer (`f` key)
- **Decision Helper**: "What should I work on?" suggestions (`d` key)
- **Break Reminders**: Notifications after work periods
- **Terminal Adaptive**: Adjusts to size, warns if too small

## [0.2.0] - 2025-12-25

### Added
- **Dashboard TUI**: Interactive terminal dashboard (`atlas dashboard`)
- **Focus Indicator**: Active session highlighting
- **Quick Filters**: Filter by status with `a/p/s/*`
- **Search**: Fuzzy search with `/`
- **Inline Capture**: Quick capture without leaving dashboard
- **Session Gauge**: Visual progress toward daily goal
- **Sparkline**: Weekly activity graph

## [0.1.0] - 2025-12-25

### Added
- Initial release
- **Clean Architecture**: Domain-driven design
- **Project Registry**: Track projects with metadata
- **Session Management**: Work sessions with duration tracking
- **Quick Capture**: Ideas, tasks, bugs with triage workflow
- **Breadcrumb Trail**: Context markers for "where was I?"
- **Status Management**: .STATUS file integration
- **Storage Backends**: Filesystem (JSON) and SQLite
- **Shell Completions**: zsh, bash, fish
- **Sync Command**: Import from .STATUS files
- **Migration Tool**: Switch between storage backends
