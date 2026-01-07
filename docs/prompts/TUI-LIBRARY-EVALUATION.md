# TUI Library Evaluation for Atlas v0.9.0

**Date:** 2026-01-07
**Sprint:** v0.9.0 Sprint 1 - TUI Modernization
**Purpose:** Evaluate blessed alternatives for dashboard modernization

## Executive Summary

Atlas currently uses **blessed v0.1.81** (last updated Sep 2015 - 9+ years old) for its TUI dashboard. The library is abandoned and poses maintenance risks. This evaluation compares three viable alternatives: **Ink**, **terminal-kit**, and **neo-blessed**.

**Recommendation:** Migrate to **Ink** for long-term maintainability and developer experience.

---

## Current State Analysis

### blessed Usage in Atlas

| Metric | Value |
|--------|-------|
| **Dashboard Lines** | 2,762 lines |
| **Files Using blessed** | 9 files |
| **blessed.box() Calls** | 102+ instances |
| **contrib Widgets** | 6 (gauge, log) |
| **Primary Pattern** | Imperative box-based layout |

**Key blessed Features Used:**
- `blessed.screen()` - Screen management
- `blessed.box()` - Container widgets (heavily used)
- `contrib.gauge()` - Progress visualization
- `contrib.log()` - Log displays
- Mouse events and keyboard handlers
- Theme support (colors, styles)

### Challenges with Current blessed

1. **Abandoned** - No updates since 2015
2. **Node.js compatibility** - May break with future Node versions
3. **Terminal compatibility** - Known issues with modern terminals (Ghostty, etc.)
4. **Canvas crashes** - Documented failures in pseudo-TTY/XPC contexts
5. **No TypeScript support** - Lacks modern type definitions
6. **Security concerns** - Unpatched vulnerabilities in old dependencies

---

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Maintenance** | 25% | Active development, community support |
| **Migration Effort** | 20% | Ease of migrating from blessed |
| **Developer Experience** | 20% | API clarity, documentation, debugging |
| **Feature Parity** | 15% | Can replicate current dashboard features |
| **Performance** | 10% | Rendering speed, memory usage |
| **Ecosystem** | 10% | Component libraries, plugins |

---

## Library Comparison Matrix

### 1. Ink (React for CLIs)

| Attribute | Details |
|-----------|---------|
| **Version** | 6.6.0 (Dec 2025 - 16 days ago) |
| **Maintainer** | Vadim Demedes (active) |
| **GitHub Stars** | 33,397 ⭐ |
| **Weekly Downloads** | 3,703,455 📦 |
| **Last Update** | 2025-12-22 ✅ |
| **License** | MIT |
| **Node Support** | >=18 |
| **TypeScript** | ✅ Full support |

**Pros:**
- ✅ **Most actively maintained** - Latest update 16 days ago
- ✅ **Huge adoption** - Used by Gatsby, Parcel, Yarn, Terraform, Prisma, Shopify, NYT
- ✅ **React paradigm** - Familiar to many developers (declarative, component-based)
- ✅ **Rich ecosystem** - `@inkjs/ui` provides ready-made components (spinners, select inputs, progress bars)
- ✅ **Excellent DX** - Hot reload, error boundaries, console.log interception
- ✅ **Flexbox layouts** - Uses Yoga for CSS-like positioning
- ✅ **Testing friendly** - React Testing Library compatible

**Cons:**
- ❌ **Paradigm shift** - Requires refactoring from imperative to declarative
- ❌ **Performance overhead** - React reconciliation (though Ink 3+ optimized)
- ❌ **Not 1:1 with blessed** - Different API, no direct port
- ⚠️ **Learning curve** - Developers unfamiliar with React need ramp-up

**Migration Complexity:** Medium-High (requires architectural refactor)

---

### 2. terminal-kit

| Attribute | Details |
|-----------|---------|
| **Version** | 3.1.2 (Jan 2025 - today!) |
| **Maintainer** | Cédric Ronvel (active) |
| **GitHub Stars** | 3,315 ⭐ |
| **Weekly Downloads** | 193,867 📦 |
| **Last Update** | 2025-01-11 ✅ |
| **License** | MIT |
| **Node Support** | >=14 |
| **TypeScript** | ⚠️ Community types only |

**Pros:**
- ✅ **Actively maintained** - Updated this month
- ✅ **Feature-rich** - 256 colors, mouse, input fields, progress bars, screen buffers, image loading
- ✅ **No ncurses dependency** - Pure JavaScript
- ✅ **Lower-level control** - Fine-grained terminal manipulation
- ✅ **Similar to blessed** - Easier conceptual migration
- ✅ **Comprehensive docs** - Extensive API documentation

**Cons:**
- ❌ **Smaller community** - 5.2% of Ink's downloads
- ❌ **Imperative API** - Less modern than declarative approaches
- ⚠️ **Component ecosystem** - Smaller than Ink's ecosystem
- ⚠️ **API differences** - Not drop-in replacement for blessed

**Migration Complexity:** Medium (similar patterns, different API)

---

### 3. neo-blessed

| Attribute | Details |
|-----------|---------|
| **Version** | 0.2.0 (May 2022 - 2.5 years ago) |
| **Maintainer** | Community fork |
| **GitHub Stars** | ~500 ⭐ (estimate) |
| **Weekly Downloads** | ~50,000 📦 (estimate) |
| **Last Update** | 2022-05-10 ⚠️ |
| **License** | MIT |
| **Node Support** | >=12 |
| **TypeScript** | ⚠️ Limited |

**Pros:**
- ✅ **Most blessed-compatible** - Direct fork with similar API
- ✅ **Drop-in replacement** - Minimal code changes
- ✅ **Familiar patterns** - Same widget-based approach

**Cons:**
- ❌ **Stale maintenance** - No updates in 2.5+ years
- ❌ **Small community** - Limited adoption
- ❌ **Unknown longevity** - May become abandoned like blessed
- ❌ **Same underlying issues** - Inherits blessed's architectural problems

**Migration Complexity:** Low (but defeats purpose of modernization)

---

## Detailed Scoring

| Criterion | Ink | terminal-kit | neo-blessed |
|-----------|-----|--------------|-------------|
| **Maintenance** (25%) | 25/25 ⭐ | 20/25 ✅ | 5/25 ❌ |
| **Migration Effort** (20%) | 8/20 ⚠️ | 14/20 ✅ | 19/20 ⭐ |
| **Developer Experience** (20%) | 20/20 ⭐ | 15/20 ✅ | 10/20 ⚠️ |
| **Feature Parity** (15%) | 15/15 ⭐ | 15/15 ⭐ | 15/15 ⭐ |
| **Performance** (10%) | 7/10 ✅ | 9/10 ⭐ | 8/10 ✅ |
| **Ecosystem** (10%) | 10/10 ⭐ | 6/10 ✅ | 4/10 ⚠️ |
| **TOTAL** | **85/100** 🥇 | **79/100** 🥈 | **61/100** 🥉 |

---

## Recommendation: Ink

### Why Ink?

1. **Future-proof** - Most actively maintained with strong community
2. **Industry standard** - Used by major projects (Terraform, Gatsby, Prisma)
3. **Modern architecture** - Declarative, testable, composable
4. **Rich ecosystem** - Ready-made components, growing tooling
5. **Developer velocity** - Faster development once initial migration complete

### Trade-offs Accepted

- ✅ **Higher migration cost** - Worth it for long-term maintainability
- ✅ **React dependency** - Acceptable given React's ubiquity
- ✅ **Performance overhead** - Negligible for Atlas's use case (dashboard, not high-frequency rendering)

### Why Not terminal-kit?

While terminal-kit is a solid choice and actively maintained:
- Smaller ecosystem means fewer ready-made components
- Imperative API doesn't address blessed's core architectural issues
- Migration effort nearly as high as Ink without declarative benefits

### Why Not neo-blessed?

- Defeats the purpose of modernization
- Same underlying problems as blessed (terminal compatibility, architecture)
- Uncertain future maintenance

---

## Migration Strategy (Ink)

### Phase 1: Foundation (Week 1)

**Goal:** Prove Ink can replicate core dashboard functionality

- [ ] Create proof-of-concept Ink app with screen management
- [ ] Replicate MainView card stack layout
- [ ] Implement keyboard navigation (j/k, Enter, q)
- [ ] Test mouse support
- [ ] Verify theme system compatibility

**Deliverables:**
- `src/cli/dashboard-ink/` directory with POC
- Side-by-side comparison screenshots
- Performance benchmarks

### Phase 2: Component Migration (Week 2-3)

**Goal:** Convert dashboard views to Ink components

- [ ] Extract MainView.js → `<MainView>` React component
- [ ] Extract DetailView.js → `<DetailView>` React component
- [ ] Extract FocusView.js → `<FocusView>` React component
- [ ] Extract ZenView.js → `<ZenView>` React component
- [ ] Extract TimelineView.js → `<TimelineView>` React component
- [ ] Extract EcosystemView.js → `<EcosystemView>` React component
- [ ] Extract PlanView.js → `<PlanView>` React component

**Component Structure:**
```
src/cli/dashboard-ink/
├── index.tsx                 # Entry point
├── components/
│   ├── App.tsx              # Root component
│   ├── views/
│   │   ├── MainView.tsx
│   │   ├── DetailView.tsx
│   │   ├── FocusView.tsx
│   │   ├── ZenView.tsx
│   │   ├── TimelineView.tsx
│   │   ├── EcosystemView.tsx
│   │   └── PlanView.tsx
│   ├── shared/
│   │   ├── Card.tsx         # Project card
│   │   ├── CommandBar.tsx
│   │   ├── ProgressBar.tsx
│   │   └── Header.tsx
│   └── dialogs/
│       ├── FilterDialog.tsx
│       ├── DecisionDialog.tsx
│       └── PomodoroDialog.tsx
├── hooks/
│   ├── useProjects.ts
│   ├── useKeyboard.ts
│   └── useTheme.ts
└── state/
    └── DashboardContext.tsx
```

### Phase 3: State Management (Week 3)

**Goal:** Centralize state with React patterns

- [ ] Implement React Context for global state
- [ ] Convert stateMachine.js to React reducer
- [ ] Convert timerManager.js to custom hook
- [ ] Migrate ViewStateManager to React state

### Phase 4: Integration & Testing (Week 4)

**Goal:** Full feature parity and testing

- [ ] Wire up all 7 views with state machine
- [ ] Implement all keyboard shortcuts
- [ ] Add integration tests with `ink-testing-library`
- [ ] Update documentation
- [ ] Performance testing

### Phase 5: Cleanup & Release (Week 5)

**Goal:** Remove blessed, ship v0.9.0

- [ ] Remove blessed dependencies from package.json
- [ ] Delete old dashboard.js and view files
- [ ] Update CLAUDE.md and ARCHITECTURE.md
- [ ] Release v0.9.0 with migration notes

---

## Code Examples

### blessed (Current)
```javascript
const card = blessed.box({
  top: offset,
  left: 0,
  width: '100%',
  height: CARD_HEIGHT,
  tags: true,
  style: {
    fg: 'white',
    bg: isSelected ? 'blue' : 'black',
    border: { fg: theme.primary }
  }
})
card.setContent(renderProjectCard(project))
```

### Ink (Proposed)
```tsx
<Card
  project={project}
  isSelected={isSelected}
  theme={theme}
  onSelect={() => setSelected(project.id)}
>
  {renderProjectCard(project)}
</Card>
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Migration takes longer than 5 weeks** | Medium | Medium | Run POC first, validate feasibility |
| **Performance regression** | Low | Medium | Benchmark early, optimize hot paths |
| **React learning curve for contributors** | Medium | Low | Provide examples, pair programming |
| **Breaking changes in future Ink versions** | Low | Low | Ink has stable API (v6.x mature) |
| **Terminal compatibility issues** | Low | Medium | Test across terminals early |

---

## Alternative Consideration: Hybrid Approach

If migration proves too costly, consider:

1. **Keep blessed for v0.9.0** - Focus on extraction/refactoring only
2. **Migrate to Ink in v0.10.0** - Dedicate full sprint to migration
3. **Gradual migration** - New features in Ink, legacy in blessed

**Verdict:** Not recommended. Delays inevitable modernization.

---

## Community Feedback & Validation

Before finalizing decision, consider:
- [ ] Post RFC in GitHub Discussions
- [ ] Survey Atlas users (if any external users exist)
- [ ] Prototype POC and gather feedback

---

## Resources

### Ink Documentation
- [GitHub - vadimdemedes/ink](https://github.com/vadimdemedes/ink)
- [Ink UI Components](https://github.com/vadimdemedes/ink-ui)
- [Building CLI tools with React using Ink](https://medium.com/trabe/building-cli-tools-with-react-using-ink-and-pastel-2e5b0d3e2793)
- [Using Ink UI with React](https://blog.logrocket.com/using-ink-ui-react-build-interactive-custom-clis/)
- [Ink 3 Announcement](https://vadimdemedes.com/posts/ink-3)

### terminal-kit Documentation
- [GitHub - cronvel/terminal-kit](https://github.com/cronvel/terminal-kit)
- [terminal-kit npm](https://www.npmjs.com/package/terminal-kit)

### Comparison Resources
- [npm trends: blessed vs ink vs terminal-kit](https://npmtrends.com/blessed-vs-ink-vs-ncurses-vs-react-blessed-vs-terminal-kit)
- [Building Terminal Interfaces with Node.js](https://blog.openreplay.com/building-terminal-interfaces-nodejs/)
- [7 TUI libraries comparison](https://blog.logrocket.com/7-tui-libraries-interactive-terminal-apps/)

### Atlas Context
- Current dashboard: `src/cli/dashboard.js` (2,762 lines)
- View components: `src/cli/dashboard/views/`
- State machine: `src/cli/dashboard/stateMachine.js`
- Timer manager: `src/cli/dashboard/timerManager.js`

---

## Decision Log

**Decision:** Migrate to Ink for v0.9.0 Sprint 1
**Date:** 2026-01-07
**Reasoning:** Long-term maintainability, industry adoption, modern architecture
**Next Steps:** Build POC to validate feasibility (Phase 1)

---

## Appendix: Alternative Libraries Considered

### Why Not These?

- **blessed-contrib** - Extends abandoned blessed, same problems
- **react-blessed** - Wrapper around blessed, doesn't solve core issues
- **charm** - Too low-level, would need to build widget layer
- **enquirer** - Prompt-focused, not suitable for full TUI
- **ncurses/curses** - C bindings, adds complexity

---

**Sources:**
- [GitHub - vadimdemedes/ink](https://github.com/vadimdemedes/ink)
- [Building CLI tools with React using Ink](https://medium.com/trabe/building-cli-tools-with-react-using-ink-and-pastel-2e5b0d3e2793)
- [Ink: React for interactive CLI apps | Hacker News](https://news.ycombinator.com/item?id=42016639)
- [Using Ink UI with React](https://blog.logrocket.com/using-ink-ui-react-build-interactive-custom-clis/)
- [Building Terminal Interfaces with Node.js](https://blog.openreplay.com/building-terminal-interfaces-nodejs/)
- [GitHub - rothgar/awesome-tuis](https://github.com/rothgar/awesome-tuis)
- [7 TUI libraries comparison](https://blog.logrocket.com/7-tui-libraries-interactive-terminal-apps/)
- [npm trends comparison](https://npmtrends.com/blessed-vs-ink-vs-ncurses-vs-react-blessed-vs-terminal-kit)
