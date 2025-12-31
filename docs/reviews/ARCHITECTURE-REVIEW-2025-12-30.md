# Atlas Architecture Review

**Date:** 2025-12-30
**Version:** 0.7.0
**Reviewer:** Claude Code (Architecture Review Agent)

---

## Executive Summary

Atlas demonstrates **solid Clean Architecture foundations** with proper separation between domain, use cases, and adapters. The codebase follows DDD principles with rich domain entities, value objects, and repository patterns. However, several areas warrant attention for alignment with modern Node.js practices (2024-2025).

### Overall Scores

| Category | Score | Assessment |
|----------|-------|------------|
| Clean Architecture | 8/10 | Strong layering, minor violations |
| Domain Design (DDD) | 7.5/10 | Good entities, missing some value objects |
| SOLID Principles | 8/10 | Excellent DI, good ISP |
| Testability | 7/10 | Good coverage, gaps in dashboard/repos |
| Modern Node.js | 6/10 | Solid async, missing modern patterns |
| Dependency Health | 5/10 | blessed is abandoned, updates needed |
| **Overall** | **7/10** | Solid foundation, specific improvements needed |

---

## 1. Domain Layer Assessment

### Strengths

| Pattern | Implementation | Example |
|---------|---------------|---------|
| Self-validating entities | All entities call `validate()` on construction | `Project.js:42-72` |
| Rich domain models | Entities contain behavior, not just data | `Session.end()`, `Task.complete()` |
| Domain events | Session collects events for publishing | `SessionStartedEvent`, `SessionEndedEvent` |
| Value object immutability | All use `Object.freeze(this)` | `ProjectType.js:44` |
| State machine | `SessionState.canTransitionTo()` | `SessionState.js:60-68` |

### Issues to Address

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **Mutable state exposure** | All entities expose `tags[]`, `metadata{}` | External mutation bypasses validation | Use defensive copying |
| **Inconsistent constructors** | `Breadcrumb`, `Capture` use destructured; others positional | API learning curve | Standardize on one pattern |
| **UI in value objects** | `getIcon()`, `getColor()` in `TaskPriority`, `ProjectType` | Domain/UI coupling | Move to presenters |
| **Missing value objects** | `Session.outcome`, `Capture.type`, `Capture.status` | Stringly-typed domain | Add `SessionOutcome`, `CaptureType` VOs |
| **State machine unused** | `canTransitionTo()` exists but not called | State corruption risk | Use in `Session.end()`, `Session.pause()` |
| **Missing aggregate roots** | `Task` has both `projectId` and `sessionId` | Ambiguous ownership | Define clear boundaries |

### Quick Wins

```javascript
// 1. Add freeze to SessionEvent base class (SessionEvent.js:4-9)
export class SessionEvent {
  constructor(sessionId) {
    this.sessionId = sessionId
    this.timestamp = new Date()
    Object.freeze(this)  // ADD THIS
  }
}

// 2. Extract business rule constants (new file: domain/constants/BusinessRules.js)
export const BusinessRules = {
  TASK_DESCRIPTION_MAX_LENGTH: 500,
  PROJECT_NAME_MAX_LENGTH: 100,
  BREADCRUMB_MAX_LENGTH: 280,
  PROJECT_DESCRIPTION_MAX_LENGTH: 500
}

// 3. Use canTransitionTo in Session.end() (Session.js:74-89)
end(outcome = 'completed') {
  const newState = new SessionState(SessionState.ENDED)
  if (!this.state.canTransitionTo(newState)) {
    throw new Error(`Cannot transition from ${this.state.value} to ended`)
  }
  // ... rest of method
}
```

---

## 2. Adapters Layer Assessment

### Strengths

| Pattern | Implementation | Location |
|---------|---------------|----------|
| Dual storage backends | FileSystem and SQLite honor same interface | `src/adapters/repositories/` |
| Atomic file writes | temp-file-then-rename pattern | `FileSystemProjectRepository.js:133-135` |
| Smart caching | 30s TTL with ID/path lookups | `FileSystemProjectRepository.js:51-56` |
| SQLite best practices | WAL mode, migrations, parameterized queries | `SQLiteDatabase.js:42` |
| Presenter layer | Pure functions for formatting | `ProjectPresenter.js` |

### Issues to Address

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **No gateway interfaces** | `GitGateway`, `StatusFileGateway` | Testability, DIP violation | Add `IGitGateway`, `IStatusFileGateway` |
| **Custom YAML parser** | `StatusFileGateway.js:44-130` | 86 lines, incomplete spec | Use `yaml` package |
| **`scan()` in repository** | `IProjectRepository.js:133-139` | Infrastructure in domain | Move to gateway |
| **Large Container** | `Container.js` at 456 lines | Maintenance burden | Split into sub-containers |
| **StatusController size** | 515 lines with display logic | SRP violation | Extract to presenter |

### Modern Node.js Patterns to Adopt

```javascript
// 1. Use node: protocol prefix (all files)
// Before:
import { promises as fs } from 'fs'
// After:
import * as fs from 'node:fs/promises'

// 2. Add Symbol.dispose for cleanup (SQLiteDatabase.js)
export class SQLiteDatabase {
  [Symbol.dispose]() {
    this.close()
  }
}
// Usage with `using` keyword (Node.js 20+)

// 3. Use execa instead of child_process (GitGateway.js)
import { execa } from 'execa'
const { stdout } = await execa('git', ['status', '--porcelain'], { cwd: path })
```

---

## 3. CLI & Dashboard Assessment

### CLI Issues

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **bin/atlas.js is 1,175 lines** | All commands in one file | Hard to maintain | Extract to `src/cli/commands/` |
| **Inconsistent DI** | Some commands use container, others dynamic import | Confusion | Standardize on container |
| **Version workaround** | Manual `-v` handling bypasses Commander | Tech debt | Fix Commander config |

### Dashboard Issues

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **dashboard.js is 2,303 lines** | Main orchestration file | Hard to maintain | Use modular views more |
| **Duplicate timer state** | Both `timerManager` and manual variables | Bugs, confusion | Consolidate on timerManager |
| **Legacy aliases** | Dead code from refactoring | Confusion | Remove |
| **Abandoned blessed** | TUI framework (2017, unmaintained) | Security, bugs | Evaluate alternatives |

### Recommended CLI Structure

```
src/cli/
├── commands/
│   ├── project.js      # atlas project add/list/show/remove
│   ├── session.js      # atlas session start/end/status
│   ├── capture.js      # atlas catch/inbox/triage
│   ├── context.js      # atlas where/trail/park/unpark
│   ├── config.js       # atlas config
│   └── template.js     # atlas template
├── dashboard/
│   ├── views/          # (existing, good)
│   ├── stateMachine.js # (existing, good)
│   └── index.js        # Orchestration only
└── formatters/
    └── output.js       # Table, JSON, shell formatting
```

---

## 4. Test Coverage Assessment

### Current State

| Test Type | Files | Coverage |
|-----------|-------|----------|
| Unit | 35+ | Entities, use cases, utils - good |
| Integration | 8 | Repositories, scanning - good |
| E2E | 2 | CLI commands - comprehensive |
| **Dashboard** | 2 | CardPool, ViewStateManager - **gaps** |

### Missing Tests

| Component | Priority | Effort |
|-----------|----------|--------|
| `stateMachine.js` | High | 1hr |
| `timerManager.js` | High | 1hr |
| Repository implementations | Medium | 2-3hr |
| Container.js | Medium | 2hr |
| View modules | Low | 3-4hr |

### Test Config Issue

```javascript
// jest.config.js
forceExit: true  // Indicates leaked handles
```

**Fix:** Add proper cleanup in test setup:
```javascript
afterAll(async () => {
  await container?.close()
  jest.clearAllTimers()
})
```

---

## 5. Dependency Health

### Critical: Blessed is Abandoned

| Package | Version | Last Update | Issues | Status |
|---------|---------|-------------|--------|--------|
| blessed | 0.1.81 | 2017 | 400+ open | **Abandoned** |
| blessed-contrib | 4.11.0 | 2023 | Semi-active | At risk |

**Alternatives:**
- **ink** - React for CLI (Sindre Sorhus, actively maintained)
- **terminal-kit** - Feature-rich, maintained
- **neo-blessed** - Community fork with patches

### Outdated Packages

| Package | Current | Latest | Priority |
|---------|---------|--------|----------|
| commander | 11.1.0 | 14.0.2 | Low |
| eslint | 8.57.1 | 9.39.2 | Medium |
| jest | 29.7.0 | 30.2.0 | Low |
| glob | 10.5.0 | 13.0.0 | Low |

### Missing Modern Tools

| Tool | Purpose | Recommendation |
|------|---------|----------------|
| TypeScript | Type safety | Add for new modules |
| Vitest | Modern test runner | Consider migration |
| c8 | Native coverage | Faster than Istanbul |
| ESLint 9 | Flat config | Upgrade |

---

## 6. Prioritized Recommendations

### Phase 1: Quick Wins (< 2 hours each)

- [ ] Add `Object.freeze(this)` to `SessionEvent` base class
- [ ] Extract business rule constants to `domain/constants/`
- [ ] Use `canTransitionTo()` in `Session.end()` and `Session.pause()`
- [ ] Add `node:` prefix to all Node.js imports
- [ ] Remove legacy aliases from dashboard.js

### Phase 2: Medium Effort (2-4 hours each)

- [ ] Add tests for `stateMachine.js` and `timerManager.js`
- [ ] Create `SessionOutcome`, `CaptureType`, `CaptureStatus` value objects
- [ ] Move `getIcon()`, `getColor()` from value objects to presenters
- [ ] Add `IGitGateway`, `IStatusFileGateway` interfaces
- [ ] Replace custom YAML parser with `yaml` package
- [ ] Consolidate dashboard timer state to use only `timerManager`

### Phase 3: Strategic (4+ hours)

- [ ] Extract CLI commands from `bin/atlas.js` to `src/cli/commands/`
- [ ] Split `StatusController` into controller + presenter
- [ ] Split `Container.js` into sub-containers
- [ ] Add repository integration tests
- [ ] Evaluate blessed replacement (ink, terminal-kit)

### Phase 4: Long-term

- [ ] Consider TypeScript for new code (gradual migration)
- [ ] Implement Unit of Work pattern for transactional consistency
- [ ] Add event sourcing for all aggregates (not just Session)
- [ ] Implement Specification pattern for complex queries

---

## 7. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Layer                                │
│  bin/atlas.js ────► Commander.js ────► Atlas Facade            │
│                                              │                  │
├──────────────────────────────────────────────┼──────────────────┤
│                    Use Cases Layer           │                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────┴────────┐         │
│  │ Session     │  │ Project      │  │ Capture        │         │
│  │ Use Cases   │  │ Use Cases    │  │ Use Cases      │         │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘         │
│         │                │                  │                   │
├─────────┼────────────────┼──────────────────┼───────────────────┤
│         ▼          Domain Layer             ▼                   │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Entities: Project, Session, Task, Capture       │          │
│  │  Value Objects: ProjectType, SessionState        │          │
│  │  Events: SessionStarted, SessionEnded            │          │
│  │  Repository Interfaces (Ports)                   │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Adapters Layer                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ FileSystem    │  │ SQLite        │  │ Presenters    │       │
│  │ Repositories  │  │ Repositories  │  │ (Stats, TUI)  │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ GitGateway    │  │ StatusFile    │  │ Container     │       │
│  │               │  │ Gateway       │  │ (DI)          │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                  Dashboard TUI (blessed)               │     │
│  │   ┌──────────────┐  ┌──────────────────────────────┐  │     │
│  │   │ StateMachine │  │ ViewStateManager             │  │     │
│  │   │ (navigation) │  │ (data state)                 │  │     │
│  │   └──────────────┘  └──────────────────────────────┘  │     │
│  │   ┌──────────────────────────────────────────────────┐│     │
│  │   │ Views: Main │ Detail │ Focus │ Zen │ Timeline   ││     │
│  │   └──────────────────────────────────────────────────┘│     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Conclusion

Atlas is a well-designed CLI application with solid architectural foundations. The Clean Architecture approach enables flexibility (dual storage backends) and testability. The main concerns are:

1. **File size** - Both `bin/atlas.js` (1,175 lines) and `dashboard.js` (2,303 lines) need decomposition
2. **blessed dependency** - The abandoned TUI framework is a strategic risk
3. **Domain gaps** - Missing value objects and aggregate boundaries
4. **Test coverage** - Dashboard components undertested

With the phased recommendations above, Atlas can evolve into an even more maintainable and modern Node.js application while preserving its strong architectural foundations.

---

**Generated by:** Claude Code Architecture Review
**References:**
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
- [Node.js Best Practices 2025](https://github.com/goldbergyoni/nodebestpractices)
