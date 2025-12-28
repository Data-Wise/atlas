# Atlas v0.6 Improvement Proposal

**Generated:** 2025-12-28
**Reviewer:** Expert Backend/Frontend Dev & UI Specialist
**Scope:** Dashboard Design, Project Management Workflow, Architecture

---

## Executive Summary

Atlas demonstrates **solid Clean Architecture foundations** with well-separated concerns (domain, use-cases, adapters). The dashboard implementation is thoughtful with ADHD-friendly utilities. However, there are opportunities for improvement in **dashboard UX scalability**, **workflow efficiency**, and **component reusability**.

---

## Part 1: Code Review Findings

### ✅ Strengths

| Area | Finding |
|------|---------|
| **Architecture** | Clean separation: Domain → Use Cases → Adapters → CLI |
| **DI Container** | Well-implemented dependency injection with caching |
| **State Machine** | Explicit state transitions prevent invalid states |
| **Timer Manager** | Clean lifecycle with proper cleanup |
| **ADHD Utilities** | TimeBlindnessHelper, StreakCalculator are excellent |
| **Presenter Layer** | New in v0.5.6 - good separation of UI concerns |
| **Constants** | Extracted to `constants.js` - configurable |

### ⚠️ Areas for Improvement

#### 1. Dashboard Card Rendering (MainView.js:221-252)

**Issue:** Cards are destroyed and recreated on every render
```javascript
// Current approach - inefficient
function renderCards() {
  for (const card of projectCards) {
    card.destroy()  // DOM destruction
  }
  projectCards = []
  // Recreate all cards...
}
```

**Impact:** Performance degrades with 50+ projects. Noticeable flicker.

**Recommendation:** Implement virtual scrolling or card pooling.

---

#### 2. Magic Numbers in Views

**Issue:** Despite `constants.js`, views still have hardcoded values
- `MainView.js:23` - CARD_HEIGHT = 5 (duplicates constants.js)
- `FocusView.js:30-31` - width: 50, height: 15
- `dialogs.js:19` - width: 58, height: 28

**Recommendation:** Import all dimensions from constants.

---

#### 3. View-State Coupling

**Issue:** Views manage their own state (filteredList, selectedCardIndex)
```javascript
// MainView.js
let projectCards = []
let selectedCardIndex = 0
let filteredList = []
```

**Impact:** State split between stateMachine and views creates sync issues.

**Recommendation:** Centralize state in stateMachine or create a ViewStateManager.

---

#### 4. Presenter Re-exports Chain

**Issue:** Three-level indirection for presenters
```
TuiPresenter.js → helpers.js (re-export) → MainView.js
```

`helpers.js` (Line 1-15):
```javascript
// Dashboard helpers - re-exports from presenters for backward compatibility
export {
  getStatusIcon,
  getTypeStr,
  ...
} from '../../adapters/presenters/TuiPresenter.js'
```

**Recommendation:** Import directly from presenters or establish clear import conventions.

---

#### 5. Missing Error Boundaries

**Issue:** Dashboard crashes if blessed throws (terminal resize, encoding issues)

**Recommendation:** Add try-catch in render loops with graceful degradation.

---

#### 6. Dialog Memory Leak Potential

**Issue:** `dialogs.js` appends elements but relies on event handlers for cleanup
```javascript
screen.append(help)
help.onceKey(['escape'...], () => {
  screen.remove(help)  // Only removed on key press
})
```

**Impact:** If dialog is never dismissed (e.g., force quit), no cleanup.

**Recommendation:** Track active dialogs for bulk cleanup on screen destroy.

---

## Part 2: Dashboard Design Improvements

### Current Dashboard Flow
```
┌─────────────────────────────────────────────────────────┐
│  BROWSE (Main)  ←──→  DETAIL  ←──→  FOCUS/ZEN          │
└─────────────────────────────────────────────────────────┘
```

### Proposed: Multi-Panel Layout Option

**Why:** Power users want more info visible simultaneously.

```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────┐ ┌─────────────────────────────────────┐ │
│ │ PROJECTS    │ │ DETAIL / FOCUS PANEL                │ │
│ │ (sidebar)   │ │                                     │ │
│ │ ─────────── │ │  Current Project                    │ │
│ │ ● atlas     │ │  ├─ Status: active                  │ │
│ │   flow-cli  │ │  ├─ Progress: 75%                   │ │
│ │   mcp-serv  │ │  └─ Next: Add stats command         │ │
│ │             │ │                                     │ │
│ │ ─────────── │ │  ┌───────────────────────────────┐  │ │
│ │ 📥 Inbox(3) │ │  │      POMODORO: 18:42         │  │ │
│ │ 🍞 Trail    │ │  │      ████████░░░░ 72%        │  │ │
│ │             │ │  └───────────────────────────────┘  │ │
│ └─────────────┘ └─────────────────────────────────────┘ │
│ [↑↓] Select  [Tab] Switch Panel  [f] Focus  [q] Quit   │
└─────────────────────────────────────────────────────────┘
```

---

## Part 3: Improvement Plans

### Plan A: Quick Wins ⚡ (1-2 sessions)

**Effort:** Low | **Impact:** Medium | **Risk:** Low

| # | Task | File | Lines |
|---|------|------|-------|
| 1 | Fix card CARD_HEIGHT duplication | MainView.js | ~5 |
| 2 | Add error boundaries in renderCards | MainView.js | ~10 |
| 3 | Centralize dialog dimensions | constants.js, dialogs.js | ~20 |
| 4 | Add screen.on('destroy') cleanup | dashboard/index.js | ~15 |
| 5 | Remove helpers.js re-export layer | Multiple views | ~30 |

**Outcome:** Cleaner code, fewer bugs, better maintainability.

---

### Plan B: Dashboard Performance ⚡⚡ (2-3 sessions)

**Effort:** Medium | **Impact:** High | **Risk:** Low

#### B1. Virtual Scrolling for Card List

```javascript
// Proposed: VirtualList component
export function createVirtualList(options) {
  const { itemHeight, renderItem, container } = options
  const visibleStart = Math.floor(scrollOffset / itemHeight)
  const visibleEnd = visibleStart + Math.ceil(containerHeight / itemHeight)

  // Only render visible items
  for (let i = visibleStart; i <= visibleEnd; i++) {
    renderItem(items[i], i - visibleStart)
  }
}
```

#### B2. Card Pool (Object Pooling Pattern)

```javascript
class CardPool {
  constructor(maxSize = 20) {
    this.available = []
    this.inUse = new Set()
  }

  acquire() {
    return this.available.pop() || this._createCard()
  }

  release(card) {
    card.hide()
    this.available.push(card)
    this.inUse.delete(card)
  }
}
```

#### B3. Debounced Rendering

```javascript
import { debounce } from '../utils/debounce.js'

const debouncedRender = debounce(() => {
  renderCards()
}, 16) // 60fps
```

**Outcome:** Smooth scrolling with 100+ projects.

---

### Plan C: Centralized State Management ⚡⚡⚡ (3-4 sessions)

**Effort:** High | **Impact:** High | **Risk:** Medium

#### Proposed: ViewStateManager

```javascript
// src/cli/dashboard/ViewStateManager.js
export function createViewStateManager(stateMachine) {
  const state = {
    // Selection
    selectedIndex: 0,
    selectedProject: null,

    // Filtering
    filter: '*',
    searchTerm: '',
    filteredProjects: [],

    // Session
    activeSession: null,
    pomodoroState: null,

    // UI
    theme: 'default',
    lastRefresh: null
  }

  const subscribers = new Set()

  function update(partial) {
    Object.assign(state, partial)
    notify()
  }

  function subscribe(callback) {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }

  function notify() {
    subscribers.forEach(cb => cb(state))
  }

  return { getState: () => state, update, subscribe }
}
```

#### View Integration

```javascript
// MainView.js - simplified
export function createMainView(screen, stateManager) {
  stateManager.subscribe((state) => {
    // Re-render with new state
    renderCards(state.filteredProjects, state.selectedIndex)
  })
}
```

**Outcome:** Single source of truth, predictable updates, easier testing.

---

### Plan D: Multi-Panel Layout ⚡⚡⚡⚡ (4-5 sessions)

**Effort:** High | **Impact:** Very High | **Risk:** Medium

#### Layout Manager

```javascript
// src/cli/dashboard/LayoutManager.js
export const LAYOUTS = {
  SINGLE: 'single',      // Current: full-screen views
  SPLIT: 'split',        // Sidebar + main panel
  TRIPLE: 'triple'       // Sidebar + main + inspector
}

export function createLayoutManager(screen, options) {
  let currentLayout = options.default || LAYOUTS.SINGLE

  const panels = {
    sidebar: createSidebar(screen),
    main: createMainPanel(screen),
    inspector: createInspector(screen)
  }

  function setLayout(layout) {
    // Recalculate panel dimensions
    switch (layout) {
      case LAYOUTS.SPLIT:
        panels.sidebar.width = '25%'
        panels.main.width = '75%'
        panels.main.left = '25%'
        break
      // ...
    }
    currentLayout = layout
    screen.render()
  }

  return { setLayout, getLayout: () => currentLayout, panels }
}
```

**Outcome:** Professional-grade dashboard with power-user capabilities.

---

### Plan E: Workflow Automation ⚡⚡ (2-3 sessions)

**Effort:** Medium | **Impact:** High | **Risk:** Low

#### E1. Smart Session Start

```javascript
// Propose project based on:
// 1. Time of day + project type
// 2. Recent activity patterns
// 3. Pending next actions
// 4. Streak maintenance

async function suggestProject(projects, context) {
  const scores = projects.map(p => ({
    project: p,
    score: calculateProjectScore(p, context)
  }))

  return scores.sort((a, b) => b.score - a.score).slice(0, 3)
}
```

#### E2. Batch Operations

```bash
# New commands
atlas batch --status active --set-progress +10
atlas batch --tag urgent --start-session
```

#### E3. Workflow Templates

```yaml
# ~/.atlas/workflows/morning-standup.yaml
name: Morning Standup
steps:
  - command: atlas sync
  - command: atlas inbox --triage
  - command: atlas dash --filter active
  - prompt: "What will you focus on today?"
```

**Outcome:** Reduced friction, more automation, less decision fatigue.

---

## Part 4: Recommendation Matrix

| Plan | Effort | Impact | Risk | Priority |
|------|--------|--------|------|----------|
| **A: Quick Wins** | ⚡ Low | Medium | Low | **1st** |
| **B: Performance** | ⚡⚡ Med | High | Low | **2nd** |
| **E: Workflow** | ⚡⚡ Med | High | Low | **3rd** |
| **C: State Mgmt** | ⚡⚡⚡ High | High | Med | 4th |
| **D: Multi-Panel** | ⚡⚡⚡⚡ High | V.High | Med | 5th |

---

## Part 5: Suggested Roadmap

### v0.6.0 - Foundation Improvements
- [ ] Plan A: Quick wins (all 5 items)
- [ ] Plan B: Virtual scrolling OR card pooling
- [ ] `atlas stats` command (session analytics)

### v0.6.1 - Workflow Enhancements
- [ ] Plan E1: Smart session suggestions
- [ ] `atlas export` command
- [ ] Plan E3: Basic workflow templates

### v0.7.0 - Dashboard Evolution
- [ ] Plan C: Centralized state management
- [ ] Plan D: Split layout option
- [ ] Keyboard macro system

---

## Quick Wins You Can Do Right Now

### 1. Fix Constants Duplication (5 min)

```javascript
// MainView.js - Line 23
// CHANGE FROM:
const CARD_HEIGHT = 5

// CHANGE TO:
import { CARD_HEIGHT } from '../constants.js'
```

### 2. Add Error Boundary (10 min)

```javascript
// MainView.js - renderCards()
function renderCards() {
  try {
    // existing code...
  } catch (err) {
    // Graceful fallback
    cardContainer.setContent(`{red-fg}Render error: ${err.message}{/}`)
    screen.render()
  }
}
```

### 3. Track Active Dialogs (15 min)

```javascript
// dialogs.js - add at top
const activeDialogs = new Set()

// In each show* function:
activeDialogs.add(dialogElement)
// In cleanup:
activeDialogs.delete(dialogElement)

// Export for screen cleanup
export function cleanupAllDialogs(screen) {
  activeDialogs.forEach(d => screen.remove(d))
  activeDialogs.clear()
}
```

---

## Conclusion

Atlas has excellent bones - the Clean Architecture foundation and ADHD-friendly utilities are well-designed. The main opportunities are:

1. **Dashboard rendering performance** for scale
2. **State management centralization** for maintainability
3. **Workflow automation** for reduced friction

**Recommended Next Step:** Start with Plan A (Quick Wins), then Plan B (Performance).

---

*Run `/next` for task suggestions based on this proposal.*
