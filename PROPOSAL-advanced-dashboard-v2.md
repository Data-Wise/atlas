# Atlas Dashboard Roadmap

**Updated:** 2025-12-25
**Current Version:** 0.4.0-dev
**Branch:** dev
**Dashboard Lines:** ~1800 lines (blessed + blessed-contrib)

---

## ✅ Completed Features (v0.3.x - v0.4.x)

### Architecture

- [x] **State machine** - Clean view transitions (browse, detail, focus, zen)
- [x] **Timer manager** - Centralized Pomodoro with proper lifecycle
- [x] **Card Stack layout** - Modern project cards replacing table view
- [x] **Terminal detection** - Safe fallbacks for problematic terminals

### ADHD-Friendly Features

- [x] **Zen mode** (`z`) - Minimal distraction display
- [x] **Focus mode** (`f`) - Pomodoro timer with break reminders
- [x] **Decision helper** (`d`) - Time-aware "what to work on" suggestions
- [x] **Theme cycling** (`t`) - Default, dark, minimal themes
- [x] **Quick filters** (`a/p/*`) - Active, paused, all projects
- [x] **Search** (`/`) - Filter projects by name
- [x] **Inline capture** (`c`) - Quick idea capture without leaving dashboard

### Card Enhancements

- [x] **Progress bars** - Visual progress on cards (color-coded)
- [x] **Next action preview** - Shows next step from .STATUS
- [x] **Active session indicator** - Green highlight on active project
- [x] **Contextual command bar** - Changes based on session state
- [x] **Position indicator** - Shows "3/15" for navigation

---

## 🚧 In Progress (v0.4.x)

### Current Focus

1. Card Stack polish - visual refinements
2. npm publish v0.4.0
3. Integration testing

---

## 📋 Planned Features (v0.5.x+)

### Priority 1: Quick Wins (< 2 hours each)

| Feature                       | Effort | Impact | Notes                                |
| ----------------------------- | ------ | ------ | ------------------------------------ |
| **Streak display**            | Low    | High   | Track consecutive days with sessions |
| **Time blindness helper**     | Low    | High   | Subtle "2h in session" reminders     |
| **"Good enough" session end** | Low    | High   | `g` key for self-compassionate end   |
| **Context restoration**       | Low    | High   | "Last time you were working on X"    |
| **Celebration on complete**   | Low    | Medium | ASCII confetti or positive message   |

### Priority 2: Configuration & Persistence (2-4 hours each)

| Feature                                  | Effort | Impact | Notes                                  |
| ---------------------------------------- | ------ | ------ | -------------------------------------- |
| **Config file** (`~/.atlas/config.json`) | Medium | High   | Pomodoro duration, theme, defaults     |
| **Timer persistence**                    | Medium | Medium | Save timer state on exit               |
| **Preference sync**                      | Medium | Medium | Remember last filter, selected project |
| **High-contrast themes**                 | Low    | Medium | Accessibility option                   |

### Priority 3: Context Management (4-8 hours)

| Feature                      | Effort | Impact | Notes                                 |
| ---------------------------- | ------ | ------ | ------------------------------------- |
| **"Park" feature**           | Medium | High   | `p` to stash context for interruption |
| **Breadcrumb visualization** | Medium | Medium | Visual trail of recent activity       |
| **Context diff**             | Medium | Medium | "Since you left: 2 new captures"      |

### Priority 4: Advanced Features (8+ hours)

| Feature                   | Effort | Impact | Notes                             |
| ------------------------- | ------ | ------ | --------------------------------- |
| **Web dashboard**         | High   | High   | Browser-based with real-time sync |
| **Session analytics**     | High   | Medium | When do I work best? graphs       |
| **Energy level tracking** | Low    | Medium | Match tasks to current energy     |
| **Plugin system**         | High   | Medium | User-defined widgets              |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD MODES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   BROWSE    │    │   FOCUS     │    │    ZEN      │    │   DETAIL    │   │
│  │             │    │             │    │             │    │             │   │
│  │ Card stack  │◄──►│ Big timer   │◄──►│ Just text   │◄──►│ One project │   │
│  │ Filters     │    │ Pomodoro    │    │ No chrome   │    │ Full info   │   │
│  │ Overview    │    │ Stats       │    │ Current only│    │ Actions     │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│         │                  │                  │                  │           │
│         └──────────────────┴──────────────────┴──────────────────┘           │
│                                     │                                         │
│                              SHARED STATE                                     │
│              (stateMachine.js + timerManager.js + data)                      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Files

- `src/cli/dashboard.js` - Main dashboard (~1800 lines)
- `src/cli/dashboard/stateMachine.js` - View state management
- `src/cli/dashboard/timerManager.js` - Pomodoro timer

### Mode Transitions (All Implemented ✅)

| From   | To     | Key     |
| ------ | ------ | ------- |
| Browse | Focus  | `f`     |
| Browse | Zen    | `z`     |
| Browse | Detail | `Enter` |
| Focus  | Browse | `Esc`   |
| Focus  | Zen    | `z`     |
| Zen    | Browse | `Esc`   |

---

## Card Stack Design

Current card layout (5 lines per card):

```
┌──────────────────────────────────────────────────────────────┐
│ ● atlas                                    ● ACTIVE          │
│   node • active • 2h ago  ████████░░ 80%                     │
│   → Fix delta method SEs                                     │
└──────────────────────────────────────────────────────────────┘
```

Card features:

- Status icon (●/◑/✓/○) with color coding
- Type • Status • Recency
- Mini progress bar (10 chars) with percentage
- Next action preview (yellow arrow)
- Contextual hints on selected card

---

## Keyboard Reference

### Browse Mode

| Key         | Action           |
| ----------- | ---------------- |
| `↑↓` / `jk` | Navigate cards   |
| `Enter`     | Open detail view |
| `s`         | Start session    |
| `e`         | End session      |
| `c`         | Quick capture    |
| `f`         | Focus mode       |
| `z`         | Zen mode         |
| `d`         | Decision helper  |
| `/`         | Search           |
| `a`         | Filter: active   |
| `p`         | Filter: paused   |
| `*`         | Clear filter     |
| `t`         | Cycle theme      |
| `r`         | Refresh          |
| `?`         | Help             |
| `q`         | Quit             |

### Focus/Zen Mode

| Key     | Action             |
| ------- | ------------------ |
| `Space` | Pause/Resume timer |
| `r`     | Reset timer        |
| `+/-`   | Adjust time ±5m    |
| `c`     | Quick capture      |
| `z`     | Toggle Zen mode    |
| `Esc`   | Exit to Browse     |

---

## Future Ideas (Backlog)

### ADHD-Specific

- **Hyperfocus alert** - "You've been focused 3+ hours"
- **Distraction log** - Track when/why you got distracted
- **"One more thing" blocker** - Prevent scope creep
- **Random encouragement** - Supportive messages on idle
- **Kindness mode** - "It's okay to take a break"

### Accessibility

- **Large text mode** - Bigger fonts, less info
- **Screen reader support** - Announce state changes
- **Color-blind themes** - Avoid red/green only signals

### Moonshots

- **AI coach** - "I notice you're stuck, try X"
- **Collaborative mode** - Body double with a friend
- **Adaptive UI** - Interface changes based on behavior

---

_Last updated: 2025-12-25_
