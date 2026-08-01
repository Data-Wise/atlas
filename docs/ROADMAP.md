# Atlas Roadmap

> Living document tracking planned features and improvements.

**Last Updated:** 2026-08-01

---

## Current Version: v0.17.0 ✅ SHIPPED

Wall-clock nudges + multi-repo day activity — not on the v0.17.0 Candidates list below; shipped
ad hoc from issue #114, same pattern as v0.16.0's docs-site redesign.

- [x] **`atlas nudge {add,fire,ack,rm,ls}`** — wall-clock reminders via macOS `launchd`, firing even with every Claude surface closed; delivered as an OS notification via `osascript` (argv-safe against injection); state shared cross-surface via `~/.claude/guards.json`'s `nudges.wall-clock` key (`GuardsFileNudgeStore` gateway, lock-protected against concurrent writers)
- [x] **`atlas day [--date] [--format table|json]`** — multi-repo commit + `.STATUS`-diff + session-minutes activity provider across the four project trees, feeding savant's `research-day-log` skill
- [x] **`atlas doctor` nudge-drift reconciliation** — flags a scheduled nudge record with no matching loaded `launchd` job
- Two real bugs found via live E2E (not just unit tests): a `launchd` PATH resolution issue (`process.execPath` now invoked directly, bypassing the `#!/usr/bin/env node` shebang) and a macOS Notification Alert Style gotcha (documented as a setup prerequisite)

See `docs/specs/SPEC-cross-surface-nudges-and-day-activity-2026-08-01.md` for the full spec.

---

## v0.16.0 - ADHD-Friendly Docs-Site Redesign ✅ COMPLETE

Implements the full "Suggested next steps" table from
`docs/specs/PROPOSAL-docs-site-design-audit-2026-07-19.md`.

- [x] **Pill nav** — 7-tab bar collapsed to Home + 4 color pills (Learn/Do/Build/Code) + a sidebar search filter (`overrides/partials/tabs.html`)
- [x] **Section-color theming** — previously-dead `--atlas-learn/do/build/code` tokens now wired into the sidebar via a `data-atlas-section` body attribute (`docs/assets/javascripts/section-nav.js`)
- [x] **Single-open sidebar accordion** with item-count badges — required dropping `navigation.sections` from `mkdocs.yml` (it forced L2 nav groups always-expanded, silently defeating the checkbox collapse)
- [x] **Homepage** — card grid rebalanced to 6 (added ADHD Guide), 5-row ADHD-principles table replaced with a scannable chip row
- [x] **Retuned tokens** — off-white/near-black surfaces instead of pure white/black, 16.5px/1.65 body type for long reading sessions; extended both reduced-motion blocks (nav-arrow rotate, tabs-link hover)
- [x] Retired `WEB-DESIGN-PROPOSAL.md` from the nav (moved to `docs/specs/`)

See `docs/specs/PROPOSAL-docs-site-design-audit-2026-07-19.md` for the full audit.

---

## v0.15.0 - XDG Base Directory Support ✅ COMPLETE

XDG Base Directory support — new installs default to `$XDG_CONFIG_HOME/atlas` (or `~/.config/atlas`);
existing `~/.atlas` installs are unaffected until an explicit, guarded migration.

- [x] **`resolveConfigDir()`** — single resolver (env override → legacy `~/.atlas` → XDG default) across all 8 previously-hardcoded call sites
- [x] **`atlas migrate --xdg [--apply] [--force]`** — dry-run by default; hard refusal on an existing XDG target (never bypassed); PID-lock guard against a running `atlas-mcp`/`atlas dash`; EXDEV-safe move; migration marker (see [Migrating to the XDG location](CONFIGURATION.md#migrating-to-the-xdg-location))
- [x] **`atlas doctor` XDG nudge** — informational only; `--fix`/`--fix --write` apply through the same guarded path

See `docs/specs/SPEC-xdg-config-migration-2026-07-19.md` for the full spec and its 19-decision grill ledger.

---

## v0.14.0 - TUI Consolidation & Evidence-Linked Workflow ✅ COMPLETE

TUI consolidation + evidence-linked workflow — the bare `atlas` digest, evidence-linked session
end, `.STATUS` migration tooling, and a 3-view dashboard rebuild.

- [x] **Bare `atlas` digest** — running `atlas` with no args shows "what am I doing / what's next" (`plan`/`where` now views onto the same digest data)
- [x] **Evidence-linked session end** — `atlas session end` shows the git delta and auto-syncs the registry
- [x] **`.STATUS` atlas/v1 frontmatter** — canonical YAML schema; legacy `## Key:` headers still read, never silently rewritten (see [.STATUS Schema](STATUS-SCHEMA.md))
- [x] **`atlas migrate --status`** — dry-run diff + `--apply`, `--all-scanned` batch mode for legacy `.STATUS` files
- [x] **3-view Ink dashboard** — 8 views → 3 (Now/Timer/Plan), 8 state-machine states → 3, one Pomodoro implementation (was 3), central `lib/keymap.ts`, new `?` help overlay (see [Architecture](ARCHITECTURE.md))
- [x] **SwiftBar plugin** — menu-bar digest, no dashboard required (see [SwiftBar](user-guide/swiftbar.md))
- [x] Node 18/20/22/26 CI matrix, ESLint flat config carried forward from v0.12.2

See `docs/specs/SPEC-tui-consolidation-2026-07-19.md` and `docs/specs/SPEC-status-schema-yaml-canonical-2026-07-19.md` for the full specs.

---

## ⏳ v0.18.0 Candidates (Planned)

Not yet started — priority order, top first (renumbered from "v0.17.0 Candidates": v0.17.0 was
used for the ad-hoc wall-clock nudges + `atlas day` feature instead — none of the items below
shipped). #115 (surface fired-but-unacked nudges in `atlas dash`'s NowView) is a new fast-follow
candidate, unblocked now that v0.17.0's `Nudge`/`INudgeStore` exist — not added to the numbered
list below since it wasn't part of the original candidates pass.

1. **Ecosystem Integration / `catch-obs-bridge` (P0)** — `atlas catch` write-through to Obsidian (`obs write`) + `atlas flush` offline queue. Gated on obsidian-cli-ops v4.2.0 (vault CRUD via IPC bridge). Needs a feature worktree; see `docs/specs/SPEC-ecosystem-integration-gaps-2026-06-20.md`.
2. **Legacy `.STATUS` read-path sunset warning** — surfaces a nudge (not a block) when atlas reads a legacy-format file, per the compatibility note in [.STATUS Schema](STATUS-SCHEMA.md).
3. **Ambient surfaces expansion** — SwiftBar refresh-interval tuning, additional menu-bar item types beyond the digest.
4. **Deprecation removals** — drop any remaining v0.13-era compatibility shims once v0.14 has soaked (candidates tracked per-PR, not yet finalized).
5. **Dead-zone iCal export** — focus block calendar events from `--patterns` dead zones *(carried forward from v0.13.0, still not scheduled)*.
6. **Multi-project calibration comparison** — `atlas stats --calibrate` across the whole registry at once *(carried forward from v0.13.0, still not scheduled)*.

---

## v0.9.x - Visual Evolution & Real Data ✅ COMPLETE

**Theme:** Technical debt reduction, visual enhancements, real data wiring

### Sprint 1: TUI Modernization 🔧 ✅ COMPLETE (6/6)
- [x] Evaluate blessed alternatives (ink, terminal-kit, neo-blessed) ✅
- [x] Build Ink POC with MainView and Card components ✅
- [x] Migrate all 7 views to Ink (Detail, Focus, Zen, Timeline, Ecosystem, Plan) ✅
- [x] Implement state management with React integration ✅
- [x] Add integration tests (25 tests, all passing) ✅
- [x] Remove blessed dependency and switch to Ink as default ✅

### Sprint 2: Visual Evolution 🎨 ✅ COMPLETE (8/8)
- [x] **LayoutManager** — SINGLE/SPLIT/TRIPLE layout engine (`Tab` key) ✅
- [x] **SidebarPanel** — compact project list column (25-28%) ✅
- [x] **InspectorPanel** — detail + Pomodoro right panel (28%) ✅
- [x] **Wire App.tsx** — useLayout + LayoutManager + panels + LayoutStatusBar ✅
- [x] **Theme system** — 5 themes (default, nord, solarized, mono, high-contrast) ✅
- [x] **Focus score** — weighted quality metric with tier classification ✅
- [x] **Sidebar sparklines** — inline activity charts with trend coloring ✅
- [x] **Activity heatmap** — GitHub-style grid in full and compact modes ✅

### Sprint 3: Real Data Pipeline 🔌 ✅ COMPLETE (6/6)
- [x] **AtlasContext** — React Context wrapping DI Container ✅
- [x] **useProjects** — project list with focus scores, sparklines, filtering (5s poll) ✅
- [x] **useActiveSession** — session detection + 1s elapsed timer ✅
- [x] **useProjectStats** — heatmap, streak, breadcrumbs (10s poll) ✅
- [x] **usePendingCaptures** — inbox count from CaptureRepository (10s poll) ✅
- [x] **Project filtering** — removes tmp.*, archived, deduplicates by name ✅

**Branch:** `feature/ink-real-data`

---

## v0.10.0 - Temporal Intelligence

### Analytics
- [x] Pattern detection — `atlas stats --patterns` (best day/hour, dead zones) *(implemented 2026-06-19)*
- [x] Velocity analytics — `atlas stats --velocity` (4-week rolling window, trend, sparkline) *(implemented 2026-06-19)*
- [x] Prediction engine — `atlas stats --calibrate <proj> --minutes <n>` (Bayesian calibration) *(implemented 2026-06-19)*

### Deferred to v0.11
- [ ] AnalyticsView in Ink dashboard (key `a`)
- [ ] Dead-zone calendar export (iCal)
- [ ] Multi-project calibration comparison

---

## v0.13.0 – v0.13.1 - Task CLI & Schedule Push/Agenda ✅ COMPLETE

- [x] Native Task CRUD (`atlas task add/list/done/rm`)
- [x] `atlas schedule push` + `atlas agenda` — merged task+schedule view
- [x] AnalyticsView in the (now-retired) 8-view Ink dashboard, key `a` — deferred from v0.10.0, later folded into the v0.14 Plan view's analytics pane
- [x] StatusBar, Vitest + ink-testing-library + Playwright E2E
- [x] Man pages, Zsh completions, ADHD nav design

*(Dead-zone iCal export and multi-project calibration comparison did not ship in v0.13 — carried forward, see v0.15 candidates above.)*

---

## Future Considerations

### Web Dashboard
- Real-time sync via WebSocket
- Mobile-responsive design
- PWA for offline support

### Team Features
- Shared project registry
- Team dashboards
- Activity feeds

### Advanced ADHD Features
- Body doubling mode (co-working timer)
- Gamification (achievements, XP)
- Habit linking (pair with existing habits)

---

## Completed Milestones

### v0.12.x Series
- [x] v0.12.2: ESLint adoption — flat config, CI lint gate, zero-warning cleanup across all sources
- [x] v0.12.1: Patch — Node 26 support (better-sqlite3 12.11.1), FW-30 id convergence, PatternAnalyzer crash fix, +42 edge tests, research-ops Cookbook
- [x] v0.12.0: Research-safe sync — `sync --research` alias, plain-sync warning, `.atlas-scan-children` marker, venue comment strip

### v0.11.x Series
- [x] v0.11.1: Plain sync metadata preserve — `kind`/`target`/`tasks`/`priorityLabel` carried forward via `_preserveResearchMetadata`; regression test
- [x] v0.11.0: Research registry + Doctor — `sync --from-status` parses research `.STATUS` (kind/target/tasks); `project list --kind`; `atlas doctor` contract audit with `--fix`; registry-load robustness; `ATLAS_DATA_DIR` env precedence

### v0.10.x Series
- [x] v0.10.0: Temporal Intelligence — `VelocityCalculator`, `PatternAnalyzer`, `PredictionEngine`; `atlas stats --velocity / --patterns / --calibrate`; 31 unit tests

### v0.9.x Series
- [x] v0.9.3: flow-cli Integration — `--format json`, `--count`, `--suggest`, `--limit`, `--days` flags; live integration docs (INTEGRATIONS.md)
- [x] v0.9.2: Real Data Pipeline — AtlasContext + 4 hooks, project filtering, cross-validated dogfood tests
- [x] v0.9.1: Visual Enhancements — themes, focus score, sparklines, heatmap
- [x] v0.9.0: TUI Modernization — Ink replaces blessed, 7 views migrated, 73% code reduction

### v0.8.x Series
- [x] v0.8.0: Ecosystem Hub, Morning Ritual, MCP Server, Time Estimation
  - `atlas plan` - Guided daily planning with energy tracking
  - `atlas sync --from-status` - Import from .STATUS files
  - EcosystemView (`e` key) - Cross-project dashboard
  - PlanView (`p` key) - Morning ritual in dashboard
  - Homebrew auto-update workflow

### v0.7.x Series
- [x] v0.7.0: Task-Based Focus, Session Export (iCal), Timeline View

### v0.6.x Series
- [x] v0.6.3: Stats export (`--export`, `--format md`)
- [x] v0.6.2: Demo GIFs CI workflow, GitGateway detached HEAD fix
- [x] v0.6.1: Friendly error handling for session commands
- [x] v0.6.0: Session analytics (`atlas stats`), MkDocs site, ViewStateManager

### v0.5.x Series
- [x] v0.5.6: Presenter layer, caching, constants extraction
- [x] v0.5.5: Breadcrumb timestamp fix
- [x] v0.5.3: Comprehensive documentation (6 docs, 5200+ lines)
- [x] v0.5.2: Template variables and inheritance
- [x] v0.5.1: Park/unpark, template management CLI
- [x] v0.5.0: Configuration system, project templates, wizard

### v0.4.x Series
- [x] v0.4.1: ADHD utilities (5 helpers, 174 tests)
- [x] v0.4.0: Card stack layout, zen mode, state machine

### v0.3.x Series
- [x] v0.3.1: Themes, time-aware suggestions, Pomodoro stats
- [x] v0.3.0: Focus mode, decision helper, break reminders

### v0.2.x - v0.1.x
- [x] Dashboard TUI, inline capture, sparklines
- [x] Initial release, Clean Architecture, dual storage

---

## Contributing

See [ARCHITECTURE.md](./ARCHITECTURE.md) for codebase structure.

Priority areas for contribution:
1. Dashboard performance optimization
2. Additional ADHD-friendly utilities
3. IDE/editor integrations
4. Documentation improvements

---

**Now what?** → [What's New](WHAT-S-NEW.md) for the release-by-release changelog
