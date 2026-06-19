# Atlas Roadmap

> Living document tracking planned features and improvements.

**Last Updated:** 2026-06-19

---

## Current Version: v0.9.3

Real Data Pipeline — all mock data replaced with live `~/.atlas` data via React hooks.

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

## v0.11.0 - Platform Expansion

### Remote Sync
- [ ] GitHub Issues sync (read project issues)
- [ ] GitLab integration
- [ ] Google Calendar Sync (two-way)

### IDE Extensions
- [ ] VS Code extension for .STATUS editing
- [ ] Neovim plugin (telescope picker)

### Terminal Integrations
- [ ] Native Zellij integration
- [ ] tmux status line component
- [ ] Starship prompt segment

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
