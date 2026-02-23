# Design: Wire Real Data into Ink Dashboard

**Date:** 2026-02-22
**Scope:** Core 3 views (MainView, SidebarPanel, InspectorPanel)
**Approach:** React Context + custom hooks

---

## Problem

The Ink dashboard (v0.9.x) renders 100% mock data. The `atlas` object is passed to `runDashboard()` but never used — all 7 views consume hardcoded constants defined in App.tsx.

## Scope

Wire real data into the 3 layout panel components only:
- **MainView** — project list with status, progress, focus
- **SidebarPanel** — compact rows with focus tier icons, sparklines, active session badge
- **InspectorPanel** — selected project detail, focus score, heatmap, breadcrumbs, Pomodoro timer

Other views (Focus, Timeline, Ecosystem, Plan) remain mock — they'll be wired in a follow-up.

## Architecture

```
runDashboard(atlas)
  └─ <AtlasProvider container={atlas.container}>
       └─ <App>
            ├─ useProjects()        → Project[] for MainView + SidebarPanel
            ├─ useActiveSession()   → current session + timer seconds
            ├─ useProjectStats(id)  → focusScore, heatmap, sparkline, streak
            └─ usePendingCaptures() → inbox count for sidebar badge
```

### New Files

| File | Purpose |
|------|---------|
| `dashboard-ink/lib/AtlasContext.tsx` | React Context + Provider wrapping Container |
| `dashboard-ink/hooks/useProjects.ts` | Fetch + poll project list, map domain → dashboard Project |
| `dashboard-ink/hooks/useActiveSession.ts` | Current session + elapsed seconds timer |
| `dashboard-ink/hooks/useProjectStats.ts` | Focus score, heatmap, sparkline for selected project |
| `dashboard-ink/hooks/usePendingCaptures.ts` | Inbox count |

### Modified Files

| File | Change |
|------|--------|
| `App.tsx` | Replace MOCK_PROJECTS/MOCK_CRUMBS/MOCK_HEATMAP with hook calls |
| `dashboard-ink/index.ts` | Pass container to AtlasProvider |

No changes needed to SidebarPanel, InspectorPanel, or MainView — they already receive data via props.

## Data Flow

| Hook | Use Case / Repository | Poll Interval | Returns |
|------|----------------------|---------------|---------|
| `useProjects` | GetRecentProjectsUseCase + GetSessionStatsUseCase | 5s | `Project[]` with computed focusScore/tier/sparkline |
| `useActiveSession` | SessionRepository.getCurrent() | 1s (timer tick) | `{ project, elapsed, isActive }` |
| `useProjectStats` | GetSessionStatsUseCase | 10s | `{ focusScore, heatmapGrid, streakDays, totalSessions }` |
| `usePendingCaptures` | CaptureRepository.list({ status: 'pending' }) | 10s | `number` |

## Domain to Dashboard Mapping

The `useProjects` hook transforms the domain Project entity + session stats into the dashboard `Project` interface (types.ts):

```typescript
function toDashboardProject(domainProject, stats): Project {
  return {
    id: domainProject.id,
    name: domainProject.name,
    type: domainProject.type,
    status: domainProject.status,
    progress: domainProject.progress,
    focus: domainProject.focus,
    path: domainProject.path,
    next: domainProject.next,
    recentActivity: stats?.sparkline ?? [0,0,0,0,0],
    focusScore: stats?.focusScore ?? 0,
    focusTier: stats ? getTierFromScore(stats.focusScore) : getTierFromScore(0),
  }
}
```

## Error Handling

- **Loading:** Show "Loading projects..." placeholder in MainView
- **Fetch errors:** Log to stderr, keep last successful data (stale-while-revalidate)
- **No projects:** Show existing empty state
- **No active session:** Timer shows 0, no session badge in sidebar

## Testing

- Unit tests for each hook using mock Container
- Integration test: AtlasProvider with in-memory repositories renders real data
- Verify no regressions in existing component snapshot/behavior tests

## Out of Scope

- FocusView, TimelineView, EcosystemView, PlanView data wiring (follow-up)
- Real-time event subscriptions (polling is sufficient for now)
- WebSocket or IPC for cross-process updates
