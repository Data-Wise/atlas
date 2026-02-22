# ORCHESTRATE: Wire Real Data into Ink Dashboard

**Branch:** `feature/ink-real-data`
**Base:** `dev`
**Design:** `docs/plans/2026-02-22-ink-real-data-design.md`

---

## Overview

Replace all mock data in the Ink dashboard (Core 3 views) with real data from the Atlas DI container. Create React Context + custom hooks for data fetching with polling.

## Increment 1: AtlasContext + useProjects hook

**Goal:** Projects list fetched from real repository, displayed in MainView

### Files to create:
- `src/cli/dashboard-ink/lib/AtlasContext.tsx`
  - `AtlasContext` React Context holding Container reference
  - `AtlasProvider` component accepting `container` prop
  - `useAtlas()` hook returning container

- `src/cli/dashboard-ink/hooks/useProjects.ts`
  - Calls `container.getProjectRepository().list()` on mount
  - Maps domain Project entities to dashboard `Project` interface (types.ts)
  - Polls every 5 seconds via `useEffect` + `setInterval`
  - For each project, calls `GetSessionStatsUseCase` to get focusScore
  - Uses `FocusScorePresenter.getTierFromScore()` for tier
  - Uses `StatsPresenter.projectSparklineData()` for recentActivity
  - Returns `{ projects: Project[], loading: boolean, error: Error | null }`

### Files to modify:
- `src/cli/dashboard-ink/index.ts` — wrap `<App>` in `<AtlasProvider container={atlas.container}>`
- `src/cli/dashboard-ink/components/App.tsx`
  - Remove `MOCK_PROJECTS` constant
  - Call `useProjects()` hook
  - Pass real projects to MainView and SidebarPanel
  - Show "Loading..." while loading

### Tests:
- `test/unit/cli/dashboard-ink/hooks/useProjects.test.ts`
- `test/unit/cli/dashboard-ink/lib/AtlasContext.test.tsx`

### Commit: `feat(dashboard): add AtlasContext and useProjects hook with real data`

---

## Increment 2: useActiveSession hook

**Goal:** Active session detection, elapsed timer, session badge in sidebar

### Files to create:
- `src/cli/dashboard-ink/hooks/useActiveSession.ts`
  - Calls `container.getSessionRepository().getCurrent()` on mount
  - 1-second timer tick for elapsed seconds
  - Returns `{ projectName, elapsed, isActive }`

### Files to modify:
- `src/cli/dashboard-ink/components/App.tsx`
  - Call `useActiveSession()` hook
  - Pass `activeProjectId` and `sessionSeconds` to SidebarPanel and InspectorPanel
  - Remove hardcoded `sessionSeconds` state

### Tests:
- `test/unit/cli/dashboard-ink/hooks/useActiveSession.test.ts`

### Commit: `feat(dashboard): add useActiveSession hook with real session timer`

---

## Increment 3: useProjectStats hook

**Goal:** Selected project gets real focus score, heatmap, streak, breadcrumbs

### Files to create:
- `src/cli/dashboard-ink/hooks/useProjectStats.ts`
  - Takes `projectId` parameter
  - Calls `GetSessionStatsUseCase.execute({ projectId })` for stats
  - Calls `StatsPresenter.formatHeatmapGrid()` for heatmap data
  - Calls `container.getBreadcrumbRepository()` for breadcrumbs
  - Calls `StreakCalculator` for streak days
  - Polls every 10 seconds
  - Returns `{ focusScore, heatmapGrid, breadcrumbs, streakDays, totalSessions, loading }`

### Files to modify:
- `src/cli/dashboard-ink/components/App.tsx`
  - Call `useProjectStats(selectedProjectId)` hook
  - Remove `MOCK_CRUMBS` and `MOCK_HEATMAP_GRID` constants
  - Remove `generateMockHeatmapGrid()` function
  - Pass real stats to InspectorPanel

### Tests:
- `test/unit/cli/dashboard-ink/hooks/useProjectStats.test.ts`

### Commit: `feat(dashboard): add useProjectStats hook with real heatmap and focus score`

---

## Increment 4: usePendingCaptures hook + cleanup

**Goal:** Real inbox count in sidebar, remove all remaining mock data

### Files to create:
- `src/cli/dashboard-ink/hooks/usePendingCaptures.ts`
  - Calls `container.getCaptureRepository().list()` filtered to pending
  - Polls every 10 seconds
  - Returns `{ count: number }`

### Files to modify:
- `src/cli/dashboard-ink/components/App.tsx`
  - Call `usePendingCaptures()` hook
  - Pass real `pendingCaptures` count to SidebarPanel
  - Remove any remaining hardcoded mock values
  - Verify no MOCK_ constants remain

### Tests:
- `test/unit/cli/dashboard-ink/hooks/usePendingCaptures.test.ts`
- Integration test: full App render with mock Container

### Commit: `feat(dashboard): add usePendingCaptures hook, remove all mock data`

---

## Increment 5: Final verification + PR

### Steps:
1. Run full test suite: `npm test`
2. Manual smoke test: `node bin/atlas.js dash` with real ~/.atlas data
3. Verify SidebarPanel shows real projects with focus tiers + sparklines
4. Verify InspectorPanel shows real heatmap + focus score
5. Verify session timer works when a session is active
6. Create PR: `gh pr create --base dev`

### Commit: `test(dashboard): add integration tests for real data hooks`

---

## Key Implementation Notes

- **Container access:** `atlas.container` is the DI container from Container.js. All repositories and use cases are resolved through it.
- **TypeScript + JS interop:** Hooks are .ts files importing from .js source files. Use `// @ts-ignore` or type assertions where needed for JS imports.
- **Domain → Dashboard mapping:** The `toDashboardProject()` function is critical — it bridges the domain Project entity (which lacks focusScore/sparkline) to the dashboard Project interface.
- **Polling vs events:** Use `setInterval` in `useEffect` with cleanup. The blessed dashboard uses the same approach. Don't over-engineer with event subscriptions.
- **Error resilience:** If a use case throws, log to stderr and return last good data. The dashboard should never crash from a data fetch error.
