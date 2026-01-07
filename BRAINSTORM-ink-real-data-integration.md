# Brainstorm: Ink Dashboard Real Data Integration

**Date:** 2026-01-07
**Context:** v0.9.0 Sprint 1 Complete (Ink migration finished)
**Focus:** Polish & Integrate Real Data (Option C)
**Depth:** Deep analysis with architectural context

---

## Overview

Sprint 1 successfully migrated the dashboard to Ink (React for CLIs) with all 7 views implemented using mock data. Before proceeding to Sprint 2 (Visual Evolution), we should integrate real project data from Atlas's existing infrastructure to dogfood the new dashboard and validate the migration.

**Goal:** Replace mockProjects.tsx with real data from FileSystemProjectRepository and integrate session/focus mode with actual timers and state management.

---

## Current State Analysis

### What's Working ✅

1. **All 7 Views Migrated to Ink**
   - MainView, DetailView, FocusView, ZenView, TimelineView, EcosystemView, PlanView
   - State machine with validated transitions
   - 25 integration tests passing

2. **Clean Architecture Preserved**
   - Domain entities: Project, Session, Capture, Breadcrumb, Task
   - Repositories: FileSystemProjectRepository, FileSystemSessionRepository
   - Use Cases: GetStatusUseCase, GetRecentProjectsUseCase, CreateSessionUseCase

3. **Presenter Pattern Established**
   - `src/adapters/presenters/ProjectPresenter.js` - UI-agnostic formatters
   - `src/adapters/presenters/TuiPresenter.js` - Terminal-specific formatters
   - 65 tests covering both presenters

### What's Mock 🚧

1. **Data Layer**
   - `src/cli/dashboard-ink/data/mockProjects.tsx` - 5 hardcoded projects
   - No connection to FileSystemProjectRepository
   - No real session history or statistics

2. **Timer Integration**
   - FocusView has Pomodoro timer UI but no persistence
   - No integration with `src/cli/dashboard/timerManager.js`
   - Timer state not saved to FileSystemSessionRepository

3. **State Management**
   - React state in components, no connection to Atlas core
   - No use of Container.js for dependency injection
   - View transitions work but don't trigger domain events

---

## Architectural Integration Points

Based on `docs/ARCHITECTURE.md` and `docs/DIAGRAMS.md`, here's how real data should flow:

### 1. Data Flow (Current vs Target)

**Current (Mock):**
```
MainView.tsx → mockProjects.tsx → Render
```

**Target (Real):**
```
MainView.tsx
  → Container.getProjectRepository()
  → FileSystemProjectRepository.findAll()
  → ~/.atlas/projects.json
  → Project entities
  → ProjectPresenter.formatProjectSummary()
  → Render
```

### 2. Repository Pattern Integration

From `docs/ARCHITECTURE.md:386-425`:
- **IProjectRepository interface** defines findAll(), findRecent(), findById()
- **FileSystemProjectRepository** implements with caching (30s TTL)
- **Container.js** provides dependency injection

**Integration Strategy:**
```typescript
// In dashboard-ink/index.tsx
import { Container } from '../../adapters/Container.js';
import { ProjectPresenter } from '../../adapters/presenters/ProjectPresenter.js';

// Create container instance
const container = new Container({ storage: 'filesystem' });
const projectRepo = container.resolve('ProjectRepository');
const sessionRepo = container.resolve('SessionRepository');

// Load real projects
const projects = await projectRepo.findAll({ limit: 20 });
const formattedProjects = projects.map(ProjectPresenter.formatProjectSummary);

// Pass to App component
<App projects={formattedProjects} onExit={...} />
```

### 3. Session Management Integration

From `docs/DIAGRAMS.md:107-182` - Complete Session Lifecycle:

**Current FocusView:**
- Timer runs in React state only
- No persistence on pause/complete

**Target Integration:**
```
FocusView.tsx
  → Start Timer button
  → CreateSessionUseCase.execute({ project: selectedProject.name })
  → Session entity created (state: ACTIVE, startTime: now)
  → FileSystemSessionRepository.save(session)
  → EventPublisher.publish(SessionStarted)
  → Timer runs
  → End button
  → EndSessionUseCase.execute({ outcome: 'completed' })
  → Session.end() updates state, calculates duration
  → FileSystemSessionRepository.save(session)
  → EventPublisher.publish(SessionEnded)
  → Celebration notification
```

### 4. State Machine Integration

From `docs/ARCHITECTURE.md:564-607` - Dashboard State Machine:

**Current:**
- React state in App.tsx manages view transitions
- No connection to domain events

**Target:**
- Keep React state for UI transitions (fast, local)
- Trigger domain events for persistence (slower, async)

```typescript
// In App.tsx
const handleStartSession = async (project: Project) => {
  // UI transition (immediate)
  setState({ currentView: 'FOCUS', selectedProject: project });

  // Domain event (async, persisted)
  await sessionRepo.createSession({
    project: project.name,
    task: currentTask
  });
};
```

---

## Quick Wins (< 30 min each)

### 1. ⚡ Fix React Duplicate Key Warning
**File:** `src/cli/dashboard-ink/components/views/MainView.tsx:55`
**Issue:** Warning about duplicate keys in project list
**Fix:** Use project.id instead of index for key prop
```typescript
// Before:
{projects.map((project, i) => <Card key={i} {...project} />)}

// After:
{projects.map((project) => <Card key={project.id} {...project} />)}
```

### 2. ⚡ Connect to Real Project Repository
**File:** `src/cli/dashboard-ink/index.tsx`
**Current:** Imports mockProjects
**Fix:** Import Container and load real projects
```typescript
import { Container } from '../../adapters/Container.js';

export async function runDashboard(atlas) {
  // Use atlas container if provided, else create new one
  const container = atlas?.container || new Container({ storage: 'filesystem' });
  const projectRepo = container.resolve('ProjectRepository');

  // Load real projects
  const projects = await projectRepo.findAll();

  const { waitUntilExit } = render(
    <App projects={projects} container={container} onExit={() => process.exit(0)} />
  );
  await waitUntilExit();
}
```

### 3. ⚡ Use ProjectPresenter for Formatting
**File:** `src/cli/dashboard-ink/components/views/MainView.tsx`
**Current:** Manual formatting in component
**Fix:** Import and use ProjectPresenter
```typescript
import { formatTimeAgo, formatDuration, getStatusCategory } from
  '../../../../adapters/presenters/ProjectPresenter.js';

// In render:
<Text>{formatTimeAgo(project.lastAccessedAt)}</Text>
<Text>{formatDuration(project.totalDuration)}</Text>
```

### 4. ⚡ Add Error Boundary for Data Loading
**File:** `src/cli/dashboard-ink/components/App.tsx`
**Current:** No error handling
**Fix:** Add try/catch and error state
```typescript
const [error, setError] = useState<Error | null>(null);

try {
  // ... data loading
} catch (err) {
  setError(err);
}

if (error) {
  return <ErrorView error={error} />;
}
```

---

## Medium Effort (1-2 hours)

### 1. 🔧 Integrate Timer with SessionRepository
**Files:**
- `src/cli/dashboard-ink/components/views/FocusView.tsx`
- `src/use-cases/session/CreateSessionUseCase.js`
- `src/use-cases/session/EndSessionUseCase.js`

**Implementation:**
```typescript
// In FocusView.tsx
import { useState, useEffect } from 'react';

interface FocusViewProps {
  project: Project;
  sessionRepo: ISessionRepository;
  onBack: () => void;
}

const FocusView = ({ project, sessionRepo, onBack }: FocusViewProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const handleStartSession = async () => {
    // Create session in repository
    const newSession = await sessionRepo.create({
      project: project.name,
      task: currentTask,
      startTime: new Date()
    });
    setSession(newSession);

    // Start timer interval
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  };

  const handleEndSession = async (outcome: string) => {
    if (!session) return;

    // Update session in repository
    await sessionRepo.update({
      ...session,
      endTime: new Date(),
      outcome
    });

    // Trigger celebration
    console.log(`🎉 Session completed! ${outcome}`);
    onBack();
  };

  // Render timer UI...
};
```

### 2. 🔧 Add Data Refresh Mechanism
**File:** `src/cli/dashboard-ink/lib/dataLoader.ts` (new)
**Purpose:** Periodic refresh of project data while dashboard is running

```typescript
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';

export class DataLoader {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private projectRepo: IProjectRepository,
    private onUpdate: (projects: Project[]) => void,
    private refreshInterval: number = 30000 // 30s (matches cache TTL)
  ) {}

  async start() {
    // Initial load
    await this.refresh();

    // Set up periodic refresh
    this.intervalId = setInterval(() => this.refresh(), this.refreshInterval);
  }

  async refresh() {
    const projects = await this.projectRepo.findAll();
    this.onUpdate(projects);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Usage in App.tsx:
useEffect(() => {
  const loader = new DataLoader(projectRepo, setProjects);
  loader.start();
  return () => loader.stop();
}, [projectRepo]);
```

### 3. 🔧 Implement Active Session Detection
**File:** `src/cli/dashboard-ink/components/views/MainView.tsx`
**Enhancement:** Show indicator for projects with active sessions

```typescript
// In MainView
const { sessionRepo } = useContext(ContainerContext);
const [activeSessions, setActiveSessions] = useState<Map<string, Session>>(new Map());

useEffect(() => {
  // Load active sessions
  const loadActiveSessions = async () => {
    const active = await sessionRepo.findActive();
    const sessionMap = new Map(active.map(s => [s.project, s]));
    setActiveSessions(sessionMap);
  };

  loadActiveSessions();
}, [sessionRepo]);

// In render:
{projects.map(project => {
  const activeSession = activeSessions.get(project.name);
  return (
    <Card
      key={project.id}
      {...project}
      isActive={!!activeSession}
      sessionDuration={activeSession?.getDuration()}
    />
  );
})}
```

### 4. 🔧 Add Keyboard Shortcut for Quick Session Start
**File:** `src/cli/dashboard-ink/components/views/MainView.tsx`
**Enhancement:** Press 's' to start session on selected project

```typescript
import { useInput } from 'ink';

const MainView = ({ projects, onSelectProject }: Props) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (input === 's') {
      // Quick start session on current project
      const project = projects[selectedIndex];
      handleStartSession(project);
    }
    // ... other key handlers
  });

  const handleStartSession = async (project: Project) => {
    // Create session
    await sessionRepo.create({
      project: project.name,
      startTime: new Date()
    });

    // Transition to focus view
    setState({ currentView: 'FOCUS', selectedProject: project });
  };
};
```

---

## Long-term (Future sessions)

### 1. 🏗️ Add Unit of Work Pattern for Transactional Consistency
**Context:** From `docs/reviews/ARCHITECTURE-REVIEW-2025-12-30.md:274`
**Problem:** Multiple repository operations not atomic
**Solution:** Implement Unit of Work pattern

```typescript
// New: src/domain/patterns/UnitOfWork.ts
export class UnitOfWork {
  private operations: Array<() => Promise<void>> = [];

  registerNew(entity: Entity) {
    this.operations.push(async () => {
      await this.getRepository(entity).save(entity);
    });
  }

  async commit() {
    // Execute all operations atomically
    for (const op of this.operations) {
      await op();
    }
    this.operations = [];
  }

  rollback() {
    this.operations = [];
  }
}

// Usage in EndSessionUseCase:
const uow = new UnitOfWork();
uow.registerNew(session);
uow.registerNew(project); // Updated with session stats
await uow.commit();
```

### 2. 🏗️ Implement Event Sourcing for Session History
**Context:** From architecture review - all aggregates should emit events
**Benefit:** Complete audit trail of session state changes

```typescript
// New: src/domain/events/SessionEventStore.ts
export class SessionEventStore {
  private events: DomainEvent[] = [];

  append(event: DomainEvent) {
    this.events.push(event);
  }

  replaySession(sessionId: string): Session {
    const sessionEvents = this.events.filter(e => e.sessionId === sessionId);
    const session = new Session(/* initial state */);

    for (const event of sessionEvents) {
      session.apply(event); // Replay each event
    }

    return session;
  }
}
```

### 3. 🏗️ Replace blessed in blessed Dashboard (Parallel Effort)
**Context:** From architecture review - blessed is abandoned (2017)
**Options:**
- **ink** - React for CLI (already using in new dashboard!)
- **terminal-kit** - Feature-rich, maintained
- **neo-blessed** - Community fork

**Recommendation:** Since Ink dashboard is now working, consider phasing out blessed dashboard entirely in v0.10.0.

---

## Implementation Plan

### Phase 1: Core Data Integration (Session 1 - ~2 hours)

```
1. ⚡ Fix React duplicate key warning (5 min)
   └─ File: MainView.tsx:55

2. ⚡ Connect to real ProjectRepository (15 min)
   └─ File: index.tsx
   └─ Add Container import and initialization

3. ⚡ Use ProjectPresenter for formatting (20 min)
   └─ Files: MainView.tsx, DetailView.tsx, EcosystemView.tsx
   └─ Import formatters from ProjectPresenter

4. ⚡ Add error boundary (15 min)
   └─ File: App.tsx
   └─ Add error state and ErrorView component

5. 🧪 Test with real data (20 min)
   └─ Run: node bin/atlas.js dash
   └─ Verify: Projects load from ~/.atlas/projects.json
   └─ Check: Navigation, filtering, search work

6. 📝 Document integration (10 min)
   └─ Update: CLAUDE.md with data flow
   └─ Add: Integration notes to dashboard README
```

**Deliverable:** Dashboard loads and displays real projects from FileSystemProjectRepository

---

### Phase 2: Session Integration (Session 2 - ~2 hours)

```
1. 🔧 Integrate timer with SessionRepository (45 min)
   └─ File: FocusView.tsx
   └─ Import: CreateSessionUseCase, EndSessionUseCase
   └─ Add: Session persistence on start/end

2. 🔧 Add data refresh mechanism (30 min)
   └─ New file: lib/dataLoader.ts
   └─ Update: App.tsx to use DataLoader
   └─ Test: Projects refresh every 30s

3. 🔧 Implement active session detection (30 min)
   └─ File: MainView.tsx
   └─ Query: sessionRepo.findActive()
   └─ Display: Active indicator on cards

4. 🧪 Test session lifecycle (15 min)
   └─ Start session in FocusView
   └─ Verify: Session saved to ~/.atlas/sessions.json
   └─ End session with outcome
   └─ Check: Duration calculated correctly
```

**Deliverable:** Focus mode creates real sessions, integrates with timer, persists state

---

### Phase 3: Polish (Session 3 - ~1 hour)

```
1. 🔧 Add keyboard shortcut for quick session start (20 min)
   └─ File: MainView.tsx
   └─ Add: 's' key handler
   └─ Test: Press 's' starts session on selected project

2. 🎨 Improve loading states (20 min)
   └─ Add: Spinner while loading projects
   └─ Add: Skeleton cards during refresh

3. 📊 Add session statistics to cards (20 min)
   └─ File: Card.tsx
   └─ Display: Total sessions, average duration
   └─ Use: ProjectPresenter.formatProjectSummary()
```

**Deliverable:** Polished UX with loading states, quick actions, statistics

---

## Testing Strategy

### Unit Tests to Add

1. **DataLoader.test.ts**
   - Refresh interval triggers correctly
   - Stop() cleans up interval
   - onUpdate callback receives projects

2. **FocusView session integration**
   - Start session creates Session entity
   - End session updates duration
   - Timer state syncs with session state

### Integration Tests to Add

1. **Dashboard with real data**
   - Load projects from FileSystemProjectRepository
   - Navigate between views with real data
   - Active session detection works

### Manual Testing Checklist

```
Dashboard Launch:
  [ ] Loads real projects from ~/.atlas/projects.json
  [ ] Displays correct project count
  [ ] Shows project metadata (type, status, progress)
  [ ] Error handling for missing/corrupt data

Navigation:
  [ ] j/k keys scroll through projects
  [ ] Enter opens DetailView with real data
  [ ] Esc returns to MainView
  [ ] All 7 views accessible

Session Integration:
  [ ] 's' key starts session on selected project
  [ ] FocusView creates session in ~/.atlas/sessions.json
  [ ] Timer runs and displays correctly
  [ ] End session saves outcome and duration
  [ ] Active session indicator shows on project card

Data Refresh:
  [ ] Projects refresh every 30s
  [ ] External changes (atlas sync) reflected in dashboard
  [ ] No flickering or UI jank during refresh
```

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Performance** - Loading 100+ projects slow | Medium | Low | Use pagination, virtual scrolling |
| **Type safety** - TypeScript/JavaScript mismatch | Low | Medium | Add JSDoc types to JS files |
| **Concurrent access** - Dashboard + CLI writes | Medium | Medium | Use file locking, atomic writes |
| **Memory leaks** - Intervals not cleaned up | High | Low | Proper cleanup in useEffect return |
| **Broken existing dashboard** - blessed version still used | Low | Low | Keep blessed dashboard as fallback |

---

## Success Metrics

| Metric | Before (Mock) | Target (Real) | Measurement |
|--------|---------------|---------------|-------------|
| **Data Source** | mockProjects.tsx | FileSystemProjectRepository | Code inspection |
| **Project Count** | 5 (hardcoded) | Dynamic (user's actual projects) | Runtime check |
| **Session Persistence** | None | Sessions saved to ~/.atlas/ | File system check |
| **Active Session Detection** | None | Real-time query | UI verification |
| **Data Refresh** | Static | 30s refresh cycle | Timer verification |
| **Error Handling** | None | Error boundary + fallbacks | Fault injection test |

---

## Open Questions

1. **Should we keep mockProjects.tsx for testing?**
   - **Recommendation:** Yes, rename to `mockProjects.fixtures.tsx` and use in tests

2. **How to handle missing ~/.atlas/ directory?**
   - **Recommendation:** Show onboarding screen: "Run `atlas sync` to discover projects"

3. **Should Timer use setInterval or requestAnimationFrame?**
   - **Recommendation:** setInterval for simplicity, RAF is overkill for 1s updates

4. **TypeScript for new files or stick with JSX?**
   - **Current:** Using `.tsx` extension for JSX support
   - **Recommendation:** Add JSDoc types for better IDE support without full TS migration

5. **Should we migrate blessed dashboard data integration too?**
   - **Recommendation:** No - let blessed dashboard stay archived, focus on Ink

---

## Related Architecture Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Clean Architecture layers
- [DIAGRAMS.md](docs/DIAGRAMS.md) - Data flow diagrams
- [ARCHITECTURE-REVIEW-2025-12-30.md](docs/reviews/ARCHITECTURE-REVIEW-2025-12-30.md) - Review findings
- [V0.9.0-ROADMAP.md](docs/prompts/V0.9.0-ROADMAP.md) - Sprint planning

---

## Recommended Next Step

**Start with Phase 1 (Core Data Integration)** - This gives us:
- Real data flowing through the new Ink dashboard
- Validation that the repository pattern integration works
- Confidence to proceed with Session integration

**Command to start:**
```bash
# In a new conversation or continuation:
"Let's implement Phase 1: Core Data Integration for the Ink dashboard.
Start with fixing the React duplicate key warning, then connect to
FileSystemProjectRepository."
```

---

**Generated:** 2026-01-07
**Status:** Ready for implementation
**Estimated Total Effort:** ~5 hours across 3 sessions
