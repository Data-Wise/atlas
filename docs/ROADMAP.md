# Atlas Roadmap

> Living document tracking planned features and improvements.

**Last Updated:** 2025-12-28

---

## Current Version: v0.5.6

Architecture refinements complete. Ready for v0.6.0 feature development.

---

## v0.6.0 - Dashboard & Workflow (In Progress)

**Theme:** Code quality improvements + workflow automation

### Plan A: Quick Wins (Priority 1) ✅ COMPLETE
- [x] Fix CARD_HEIGHT constant duplication (MainView.js)
- [x] Add error boundaries in renderCards
- [x] Centralize dialog dimensions in constants.js
- [x] Add screen.on('destroy') cleanup for dialogs
- [x] Remove helpers.js re-export indirection layer

### Plan B: Performance (Priority 2) ✅ COMPLETE
- [x] Virtual scrolling for 50+ projects
- [x] Card pooling (object reuse pattern)
- [x] Debounced rendering (60fps target)

### Session Analytics (Complete)
- [x] Session analytics (`atlas stats`)
  - Weekly/monthly summaries
  - Streak history
  - Flow state percentage
  - Hourly distribution sparkline
  - Per-project breakdown

### Features
- [ ] Data export (`atlas export`)
  - JSON export of all data
  - CSV for sessions/captures
  - Markdown report generation

---

## v0.6.1 - Workflow Automation

### Plan E: Smart Workflows
- [ ] Smart session suggestions (time-of-day + patterns)
- [ ] Batch operations (`atlas batch`)
- [ ] Workflow templates (YAML-based automation)

### Features
- [ ] `atlas stats week` - Weekly summary report
- [ ] `atlas export --format markdown` - Obsidian-compatible export
- [ ] Notification integrations (optional desktop notifications)

---

## v0.7.0 - Dashboard Evolution

### Plan C: State Management ✅ COMPLETE (moved to v0.6.0)
- [x] Centralized ViewStateManager
- [x] Single source of truth for all dashboard state
- [x] Simplified view updates via subscriptions

### Plan D: Multi-Panel Layout
- [ ] Split layout option (sidebar + main panel)
- [ ] Triple layout for power users
- [ ] Panel resize with keyboard
- [ ] Persistent layout preference

### Features
- [ ] Keyboard macro system
- [ ] Custom dashboard keybindings
- [ ] Project grouping/folders

---

## v0.8.0 - Integrations

### Remote Sync
- [ ] GitHub Issues sync (read project issues)
- [ ] GitLab integration
- [ ] Linear.app integration

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
