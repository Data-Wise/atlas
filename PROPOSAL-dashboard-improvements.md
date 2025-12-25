# Atlas Dashboard UI/UX Improvement Proposal

**Generated:** 2025-12-25
**Current Version:** 0.1.2
**Dashboard Lines:** ~800 lines (blessed + blessed-contrib)

---

## Current State Analysis

### What Works Well
- Always-visible command bar (ADHD-friendly)
- Color-coded status indicators
- Two-view architecture (main/detail)
- Keyboard-first navigation

### Pain Points Identified
- Enter key required blessed-contrib workaround (`rows.on('select')`)
- Sparkline uses mock data
- Limited visual hierarchy in project list
- No search/filter capability
- No keyboard shortcuts visible during typing
- Detail view gauge may not render on all terminals

---

## Brainstorm Ideas

### Category 1: Visual Hierarchy & Readability

| Idea | Effort | Impact | ADHD-Friendly |
|------|--------|--------|---------------|
| **Row striping** - alternate row backgrounds | Low | Medium | Yes |
| **Status grouping** - visual separators by status | Medium | High | Yes |
| **Project icons** - type-based icons (R, Node, Python) | Low | Medium | Yes |
| **Focus indicator** - highlight active session's project | Low | High | Yes |
| **Progress mini-bars** - inline progress in table | Medium | Medium | Yes |
| **Priority markers** - flag urgent/blocked projects | Low | High | Yes |

**Combinations:**
- Row striping + Status grouping = Clear visual structure
- Project icons + Progress mini-bars = Information-dense but scannable

---

### Category 2: Navigation & Filtering

| Idea | Effort | Impact | ADHD-Friendly |
|------|--------|--------|---------------|
| **`/` search** - fuzzy filter projects by name | Medium | High | Yes |
| **`1-9` quick jump** - number keys for top projects | Low | Medium | Yes |
| **`a/p/s` filter** - show only active/paused/stable | Low | High | Yes |
| **`t` filter by type** - show only R/Node/etc | Low | Medium | Yes |
| **Recent projects list** - MRU at top | Low | High | Yes |
| **Bookmarks** - star favorite projects | Medium | Medium | Maybe |
| **`g` goto** - jump to project by partial name | Medium | Medium | Yes |

**Combinations:**
- `/` search + `a/p/s` filter = Powerful but simple discovery
- Recent projects + `1-9` quick jump = Fast context switching

---

### Category 3: Information Display

| Idea | Effort | Impact | ADHD-Friendly |
|------|--------|--------|---------------|
| **Real sparkline data** - actual session history | Medium | High | Yes |
| **Time since last session** - "2h ago" in table | Low | High | Yes |
| **Streak indicator** - consecutive days worked | Low | Medium | Yes |
| **Focus time today** - prominent display | Low | High | Yes |
| **Inbox count badge** - number in corner | Low | Medium | Yes |
| **Git status** - dirty/clean indicator | Medium | Medium | Yes |
| **Next action preview** - from .STATUS file | Low | High | Yes |

**Combinations:**
- Time since + Streak = Motivation feedback loop
- Focus time + Session count = Daily progress awareness

---

### Category 4: Interaction Improvements

| Idea | Effort | Impact | ADHD-Friendly |
|------|--------|--------|---------------|
| **Quick session start** - `s` on selected project | Already done | - | - |
| **Inline capture** - `c` opens input at bottom | Low | High | Yes |
| **Multi-select** - batch operations on projects | High | Low | No |
| **Drag reorder** - mouse drag to reorder | High | Low | No |
| **Context menu** - right-click options | Medium | Medium | No |
| **`Space` toggle** - quick status change | Medium | Medium | Yes |
| **`e` quick edit** - edit .STATUS inline | Medium | Medium | Yes |

**Combinations:**
- Inline capture + Quick session = Never leave dashboard
- `Space` toggle + `e` quick edit = Status management without navigation

---

### Category 5: Layout Alternatives

| Idea | Effort | Impact | ADHD-Friendly |
|------|--------|--------|---------------|
| **Compact mode** - single-line rows, more projects | Low | Medium | Yes |
| **Wide mode** - full-width table, no sidebar | Low | Medium | Maybe |
| **Focus mode** - just current session, minimal UI | Medium | High | Yes |
| **Grid layout** - cards instead of table | High | Medium | Maybe |
| **Split view** - two projects side by side | High | Low | No |
| **Responsive panels** - resize based on terminal | Medium | High | Yes |
| **Minimal header** - 1-line instead of 3-line bars | Low | Low | Yes |

**Combinations:**
- Compact mode + Focus mode = Different modes for different needs
- Responsive panels + Minimal header = Works on small terminals

---

### Category 6: ADHD-Specific Features

| Idea | Effort | Impact | ADHD-Friendly |
|------|--------|--------|---------------|
| **Pomodoro timer** - built-in 25min timer | Medium | High | Yes |
| **Break reminder** - notify after X minutes | Medium | High | Yes |
| **"Where was I?"** - context restoration prompt | Low | High | Yes |
| **Celebration animation** - on session complete | Low | Medium | Yes |
| **Streak protection** - warn if about to break streak | Low | Medium | Yes |
| **Decision helper** - "What should I work on?" | Medium | High | Yes |
| **Distraction blocker** - hide inactive projects | Low | Medium | Yes |
| **Energy level input** - adjust suggestions based on energy | Medium | Medium | Yes |

**Combinations:**
- Pomodoro + Break reminder = Built-in focus system
- Decision helper + Energy level = Personalized suggestions

---

### Category 7: Technical Improvements

| Idea | Effort | Impact | ADHD-Friendly |
|------|--------|--------|---------------|
| **Lazy loading** - load project data on demand | Medium | Medium | - |
| **Background refresh** - update without blocking | Low | Medium | Yes |
| **Configurable refresh rate** - user preference | Low | Low | - |
| **Theme support** - light/dark/custom themes | Medium | Medium | Yes |
| **Terminal detection** - adapt to terminal capabilities | Medium | Medium | - |
| **Fallback widgets** - use simpler widgets if fancy fails | Medium | High | - |
| **State persistence** - remember last view/selection | Low | Medium | Yes |
| **Export view** - screenshot/save current state | Medium | Low | - |

---

## Top Recommendations

### Quick Wins (< 1 hour each)

1. **`/` Search Filter**
   - Add search input at top
   - Filter projectList as user types
   - Press Esc to clear
   - Huge discoverability improvement

2. **Time Since Last Session**
   - Add column to table: "Last: 2h ago"
   - Helps identify neglected projects
   - Simple date math

3. **Focus Indicator**
   - If project matches active session, show green row background
   - Immediate visual feedback

4. **`a/p/s` Quick Filters**
   - `a` = show only active
   - `p` = show only paused
   - `s` = show only stable
   - `*` = show all

5. **Next Action Preview**
   - Show "Next:" from .STATUS in detail view
   - Already have the data, just display it

---

### Medium Effort (2-4 hours each)

1. **Real Sparkline Data**
   - Query session history for past 7 days
   - Count sessions per day
   - Replace mock [2,4,3,5,4,6,0] with real data

2. **Focus Mode**
   - `f` toggles focus mode
   - Shows only: current session, current task, timer
   - Minimal distractions
   - Quick capture still available

3. **Inline Quick Capture**
   - `c` opens input line at bottom of screen
   - Type and press Enter
   - Stays on current view
   - No modal dialog

4. **Pomodoro Timer**
   - Session auto-tracks time
   - Show countdown in status bar
   - Audio/visual notification at 25 min
   - Prompt for break

---

### Longer Term (4+ hours)

1. **Theme System**
   - Define color schemes in config
   - Built-in: default, solarized, nord, dracula
   - Custom colors for status indicators

2. **Decision Helper Mode**
   - `?` shows suggested next project based on:
     - Recency (not too recent, not too stale)
     - Priority (blocked items first)
     - Time of day (light tasks late, heavy tasks early)
   - Explains why it suggests each

3. **Terminal-Adaptive Layout**
   - Detect terminal width/height
   - < 80 cols: compact single-column
   - 80-120: current layout
   - > 120: expanded with more columns

---

## Recommended Implementation Order

### Phase 1: Quick Wins (This Session)
1. Focus indicator for active session
2. Time since last session column
3. `a/p/s/*` quick filters
4. Next action in detail view

### Phase 2: Discoverability (Next Session)
5. `/` search filter
6. Real sparkline data from sessions
7. Inline quick capture

### Phase 3: Focus Features (Future)
8. Focus mode
9. Pomodoro timer integration
10. Break reminders

### Phase 4: Polish (Future)
11. Theme system
12. Terminal-adaptive layout
13. Decision helper

---

## Technical Notes

### blessed-contrib Widgets Available
- `gauge` - circular/donut progress (we use this)
- `sparkline` - mini line chart (we use this)
- `bar` - bar chart
- `line` - full line chart
- `table` - data table (we use this)
- `log` - scrollable log (we use this)
- `lcd` - LCD-style numbers
- `donut` - donut chart (crashes on odd widths!)
- `map` - world map (not useful for us)
- `tree` - tree view (could use for project hierarchy?)
- `markdown` - render markdown (could use for README preview?)

### Potential Libraries to Add
- `figlet` - ASCII art text for headers
- `boxen` - better box drawing
- `chalk` - already have, better color support
- `cli-table3` - alternative table renderer
- `ora` - spinners for loading states

### Terminal Compatibility Concerns
- `gauge` may not render on basic terminals
- Unicode characters (●, ◐, ▁▂▃) require UTF-8
- Some terminals don't support 256 colors
- Consider detecting and falling back

---

## Wireframe: Proposed Main View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ATLAS │ ● atlas (15m) │ Today: 3 sessions, 45m │ Streak: 5 days           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Filter: [_______________] │ [a]ctive [p]aused [s]table [*]all              │
├───────────────────────────────────────────────────┬─────────────────────────┤
│  PROJECTS                                         │ OVERVIEW               │
│ ─────────────────────────────────────────────────│ ───────────────────────│
│   Name            Type   Status    Last          │ This Week              │
│ ──────────────────────────────────────────────── │  ▃▅▂▇▄▆█               │
│ ► atlas           node   ● active  now           │                        │
│   rmediation      R      ● active  2h            │ Today                  │
│   obsidian-cli    node   ◑ paused  1d            │ ─────────────────────  │
│   stat-440        quarto ● active  3h            │ Sessions: 3/5          │
│   causal-infer    quarto ○ draft   5d            │ [████████░░░░] 60%     │
│   flow-cli        node   ✓ stable  2w            │ Duration: 45m          │
│   mediationverse  R      ◑ blocked 3d            │                        │
│                                                   │ Inbox (4)              │
│                                                   │ ┌─────────────────────┐│
│                                                   │ │ ☐ Add tests for...  ││
│                                                   │ │ 💡 Consider cachi...││
│                                                   │ │ ☐ Review PR #123    ││
│                                                   │ └─────────────────────┘│
├───────────────────────────────────────────────────┴─────────────────────────┤
│ q Quit │ / Search │ Enter Details │ s Session │ c Capture │ ? Help │ ↑↓ Nav│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Changes from Current:
1. Added filter bar below status
2. Added "Last" column showing recency
3. Active project row highlighted with `►`
4. Simplified status bar
5. Progress bar instead of gauge text
6. Inbox shows count in label

---

## Decision Points for User

1. **Filter UI**: Top bar vs bottom bar vs inline `:`?
2. **Recency display**: "2h ago" vs "2h" vs timestamp?
3. **Active highlight**: `►` prefix vs background color vs both?
4. **Focus mode**: Full takeover vs overlay vs separate command?
5. **Pomodoro**: Built-in vs external timer integration?

---

## Next Steps

1. [ ] Review this proposal and pick priorities
2. [ ] Implement Phase 1 quick wins
3. [ ] Test with real usage
4. [ ] Iterate based on feedback

---

*This proposal was generated through brainstorming. Not all ideas are equally valuable - pick what resonates!*
