# Atlas Roadmap

> Living document tracking planned features and improvements.

**Last Updated:** 2026-01-07

---

## Current Version: v0.8.0

Ecosystem Hub, Morning Ritual, MCP Server, Time Estimation.

---

## v0.9.0 - TUI Modernization + Visual Evolution (In Progress - 75%)

**Theme:** Technical debt reduction, then visual enhancements

### Sprint 1: TUI Modernization 🔧 ✅ COMPLETE (6/6)
- [x] Evaluate blessed alternatives (ink, terminal-kit, neo-blessed) ✅
- [x] Build Ink POC with MainView and Card components ✅
- [x] Migrate all 7 views to Ink (Detail, Focus, Zen, Timeline, Ecosystem, Plan) ✅
- [x] Implement state management with React integration ✅
- [x] Add integration tests (25 tests, all passing) ✅
- [x] Remove blessed dependency and switch to Ink as default ✅

**Progress:** Sprint 1 COMPLETE! Ink is now default, 73% code reduction achieved.

### Sprint 2: Visual Evolution 🎨 (In Progress)
- [x] **LayoutManager** — SINGLE/SPLIT/TRIPLE layout engine (`Tab` key) ✅ D1 done
- [x] **SidebarPanel** — compact project list column (25-28%) ✅ D2 done
- [x] **InspectorPanel** — detail + Pomodoro right panel (28%) ✅ D3 done
- [x] **Wire App.tsx** — useLayout + LayoutManager + panels + LayoutStatusBar ✅ D4 done
- [ ] GitHub-style heatmap view (`h` key)
- [ ] Sparkline history per project card
- [ ] Focus score calculator
- [ ] Enhanced theme system (dracula, nord, gruvbox)

**Branch:** `feature/multi-panel-dashboard`  
**Detailed plan:** [prompts/V0.9.0-ROADMAP.md](prompts/V0.9.0-ROADMAP.md)

---

## v0.10.0 - Temporal Intelligence

### Analytics
- [ ] Pattern detection ("most productive Tuesday mornings")
- [ ] Velocity analytics (sessions/week, trends)
- [ ] Prediction engine ("this will take ~2.5 hours")

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

### v0.9.x Series
- [x] v0.9.0 Sprint 1: TUI Modernization — Ink replaces blessed, 7 views migrated, 73% code reduction
- [x] v0.9.1 D1: LayoutManager — SINGLE/SPLIT/TRIPLE engine, Tab key cycle
- [x] v0.9.1 D2: SidebarPanel — compact list, j/k, windowing, inbox badge
- [x] v0.9.1 D3: InspectorPanel — detail + live Pomodoro timer, breadcrumbs
- [x] v0.9.1 D4: Wire into App.tsx \u2705

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
