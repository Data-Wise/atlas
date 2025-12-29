# Atlas Roadmap

> Living document tracking planned features and improvements.

**Last Updated:** 2025-12-29

---

## Current Version: v0.6.3

Stats export feature complete. Ready for v0.7.0 feature development.

---

## v0.7.0 - Enhanced Focus & Calendar (Next)

**Theme:** Task-based focus, calendar integration, improved workflows

See [V0.7.0-ROADMAP.md](./planning/V0.7.0-ROADMAP.md) for detailed planning.

### Tier 1: Core Features
- [ ] **Task-Based Focus** - Set specific task before starting Pomodoro
- [ ] **Session Export** - Export sessions to iCal/ics format
- [ ] **Time Block View** - Dashboard timeline view of today's sessions

### Tier 2: Nice to Have
- [ ] Calendar Import - Import time blocks from iCal
- [ ] Desktop Notifications - Break reminders, streak alerts
- [ ] Multi-Pomodoro Tracking - Track completed pomodoros per session

### Future Considerations
- [ ] Google Calendar Sync (two-way)
- [ ] Web Dashboard (REST API + browser)
- [ ] Apple Notes Sync (daily summary)
- [ ] GitHub Activity Correlation

---

## v0.8.0 - Dashboard Evolution

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

## v0.9.0 - Integrations

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
