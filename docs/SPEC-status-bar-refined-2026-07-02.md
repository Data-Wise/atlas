# Status Bar Refined Proposal

## Current state

`LayoutStatusBar` in `LayoutManager.tsx` is a single-line indicator at the bottom-right showing only layout mode + focus panel (e.g. `Tab: ▣ Single`). It's the only element in App.tsx's command bar.

## Proposed design

Replace the minimal indicator with a **full-width, context-aware status bar** — one line, split into three zones:

```
[◉ active session: atlas   |  f:Focus T:Timeline e:Ecosystem a:Analytics p:Plan ?:Help  |  ▣ Single  │  ◆ 3 captures]
 ^-- left: session context     ^-- center: contextual key hints                           ^-- right: layout + inbox
```

### Three zones

| Zone | Content | Example |
|------|---------|---------|
| **Left** | Active session indicator (name + elapsed) or `○ idle` | `◉ atlas  12m 34s` |
| **Center** | View-specific keyboard shortcuts (top 3-5 for current view) | `f:Focus e:Eco a:Analytics ?:Help` |
| **Right** | Layout mode + pending capture count | `▣ Single  │  ◆ 3 captures` |

### Behavior per view

| View | Center zone shows |
|------|-------------------|
| BROWSE | `j/k:nav Enter:detail f:Focus e:Ecosystem a:Analytics` |
| DETAIL | `q:back f:Focus` |
| FOCUS | `Space:pause/resume q:back` |
| ZEN | `q:back` |
| TIMELINE | `j/k:scroll q:back` |
| ECOSYSTEM | `j/k:nav Enter:detail q:back` |
| PLAN | `j/k:nav Enter:select q:back` |
| ANALYTICS (new) | `1:velocity 2:patterns Tab:switch q:back` |

### Data sources

- **Session state**: `useActiveSession()` hook (already exists)
- **View state**: `currentView` from App.tsx (already exists)
- **Project context**: `selectedProject?.name` (already exists)
- **Pending captures**: `usePendingCaptures()` hook (already exists)
- **Layout mode**: `layout` from `useLayout` (already exists)
- **Key hints**: Static map per view state (new)

### Implementation sketch

```tsx
// StatusBar.tsx
interface StatusBarProps {
  currentView: string;
  layout: LayoutMode;
  focusPanel: string;
  activeProjectName: string | null;
  hasActiveSession: boolean;
  sessionSeconds: number;
  pendingCaptures: number;
  theme: Theme;
}

const KEY_HINTS: Record<string, string[]> = {
  browse:    ['j/k:nav', 'Enter:detail', 'f:Focus', 'e:Eco', 'a:Analytics'],
  detail:    ['q:back', 'f:Focus'],
  focus:     ['Space:pause', 'q:back'],
  analytics: ['1:velocity', '2:patterns', 'q:back'],
  // ...
};
```

### Integration

Replace the existing bottom bar in App.tsx:

```tsx
// Before
<Box paddingX={1} justifyContent="flex-end">
  <LayoutStatusBar layout={layout} focusPanel={focusPanel} />
</Box>

// After
<StatusBar
  currentView={currentView}
  layout={layout}
  focusPanel={focusPanel}
  activeProjectName={activeProjectName}
  hasActiveSession={hasActiveSession}
  sessionSeconds={sessionSeconds}
  pendingCaptures={pendingCaptures}
/>
```

### Files to touch

| File | Change |
|------|--------|
| `src/cli/dashboard-ink/components/StatusBar.tsx` | **New** — 3-zone status bar component |
| `src/cli/dashboard-ink/components/App.tsx` | Swap `LayoutStatusBar` → `StatusBar`, pass props |
| `src/cli/dashboard-ink/lib/LayoutManager.tsx` | Keep `LayoutStatusBar` as-is (used elsewhere?) or inline into new component |
| `test/unit/cli/dashboard-ink/components/StatusBar.test.tsx` | New tests |
