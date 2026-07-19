# Atlas - Project Intelligence

> ADHD-friendly project state engine with sessions, captures, and context management.

## Quick Reference

```bash
# Core workflow
atlas session start <project>    # Start work
atlas catch "idea"               # Quick capture
atlas where                      # Show context
atlas session end                # End with celebration
atlas stats                      # Session analytics
atlas session export             # Export to iCal (v0.7.0)

# Context switching
atlas park "switching to urgent" # Save context
atlas unpark                     # Restore context

# Morning ritual (v0.8.0)
atlas plan                       # Guided daily planning
atlas sync --from-status         # Import from .STATUS files

# Dashboard
atlas dash                       # Launch TUI
# Dashboard keys: f=Focus, T=Timeline, z=Zen, e=Ecosystem, p=Plan, ?=Help
```

## Project Overview

| Attribute | Value |
|-----------|-------|
| **Type** | Node.js CLI (ESM) |
| **Version** | 0.13.1 |
| **Architecture** | Clean Architecture |
| **Storage** | FileSystem (default) / SQLite |
| **Tests** | ~2,000 (Jest + Vitest) |
| **MCP** | `atlas-mcp` server |
| **Docs** | https://data-wise.github.io/atlas/ |

## Architecture

```
src/
├── domain/           # Pure business logic (no dependencies)
│   ├── entities/     # Project, Session, Capture, Breadcrumb, Task, ScheduleRecord
│   ├── constants/    # BusinessRules (centralized thresholds)
│   ├── gateways/     # IStatusFileParser (interface)
│   ├── repositories/ # Interfaces (IProjectRepository, ITaskRepository, etc.)
│   └── value-objects/# ProjectType, SessionState, TaskPriority
├── use-cases/        # Application logic
│   ├── session/      # CreateSession, EndSession, GetSessionStats, PlanDay, ExportSessions
│   ├── capture/      # CaptureIdea, TriageInbox, GetInbox
│   ├── context/      # GetContext, Park/Unpark, LogBreadcrumb, GetTrail
│   ├── project/      # GetStatus, GetRecentProjects, ScanProjects
│   ├── registry/     # RegisterProject, SyncRegistry, SyncFromStatus
│   ├── task/         # AddTask, ListTasks, CompleteTask, RemoveTask, Agenda, ReceiveSchedulePush
│   └── status/       # UpdateStatus, UpdateStatusFile
├── adapters/         # External interfaces
│   ├── controllers/  # StatusController
│   ├── presenters/   # ProjectPresenter, TuiPresenter, StatsPresenter, FocusScorePresenter, PatternPresenter
│   ├── repositories/ # FileSystem*, SQLite* implementations (+ Task, ScheduleRecord)
│   └── gateways/     # GitGateway, StatusFileGateway, StatusFileParser
├── utils/            # ADHD helpers, config, charts, temporal intelligence
│   ├── Config.js, StreakCalculator.js, CelebrationHelper.js
│   ├── VelocityCalculator.js, PatternAnalyzer.js, PredictionEngine.js
│   └── ...
├── mcp/              # MCP server for Claude integration
│   └── index.js      # Tools: get_context, start_session, capture, etc.
├── cli/              # Dashboard TUI
│   └── dashboard-ink/       # Ink dashboard (default since v0.9.x)
│       ├── components/      # App.tsx, HelpOverlay.tsx, views/{Now,Timer,Plan}View, shared/{ProjectList,PomodoroTimer}
│       ├── hooks/           # useProjects, useActiveSession, useProjectStats, usePendingCaptures, useAnalytics
│       ├── lib/             # AtlasContext.tsx, LayoutManager.tsx, stateMachine.ts (3 states), ThemeContext.tsx, keymap.ts
│       ├── types.ts         # Shared Project interface
│       └── constants.ts     # STATUS_ICON, STATUS_COLOR maps
└── index.js          # Commander.js CLI entry
```

## Key Patterns

### Dependency Injection
```javascript
// Container.js manages all dependencies
const container = new Container({ storage: 'filesystem' })
const sessionRepo = container.getSessionRepository()
```

### Repository Pattern
- `IProjectRepository` → `FileSystemProjectRepository` | `SQLiteProjectRepository`
- Swap storage backends without changing business logic

### Event-Driven
```javascript
// Session events trigger celebrations, context updates
eventPublisher.publish(new SessionEvent('ended', session))
```

### Presenter Pattern
```javascript
// UI-agnostic formatting (ProjectPresenter)
import { formatTimeAgo, formatDuration, getStatusCategory } from './presenters/ProjectPresenter.js'

// TUI-specific formatting (TuiPresenter)
import { getStatusIcon, progressBar, sparkline } from './presenters/TuiPresenter.js'
```

### Caching Strategy
```javascript
// FileSystemProjectRepository uses in-memory cache with 30s TTL
this._projectCache = null
this._projectCacheTTL = 30000
this._projectByIdCache = new Map()  // Fast lookups
this._projectByPathCache = new Map()
```

## ADHD-Friendly Features

| Feature | Location | Purpose |
|---------|----------|---------|
| Streak Calculator | `utils/StreakCalculator.js` | Track consecutive days |
| Time Blindness Helper | `utils/TimeBlindnessHelper.js` | Gentle time awareness |
| Celebration Helper | `utils/CelebrationHelper.js` | Positive reinforcement |
| Context Restoration | `utils/ContextRestorationHelper.js` | "Last time you..." |
| Session Completion | `utils/SessionCompletionHelper.js` | "Good enough" endings |

## Data Storage

**Default location:** `~/.atlas/`

```
~/.atlas/
├── config.json       # User preferences
├── projects/         # Project registry (JSON per project)
├── sessions/         # Session history
├── captures/         # Quick captures (inbox)
├── breadcrumbs/      # Context trail
└── templates/        # Custom project templates
```

## CLI Structure

```
atlas
├── init [--template]     # Initialize atlas or project
├── project
│   ├── add/list/show/update/remove
│   └── archive/unarchive
├── session
│   ├── start/end/pause/resume
│   ├── status/history/current
│   └── export            # iCal/JSON export (v0.7.0)
├── task
│   ├── add [--due/--priority/--project]
│   ├── list [--completed/--incomplete/--overdue/--due-soon]
│   ├── done <id>
│   └── rm <id>
├── schedule
│   └── push [--format/--data]
├── agenda [window-days] [--format]
├── stats                 # Session analytics
├── plan                  # Morning ritual (v0.8.0)
├── catch/inbox/triage    # Quick capture
├── where/trail/crumb     # Context
├── park/unpark/parked    # Context switching
├── template              # Template management
├── config                # Configuration
├── sync [--from-status]  # Registry sync
├── doctor                # Settings contract audit
├── dash                  # Dashboard TUI
└── status                # Quick status
```

## Testing

```bash
npm test                  # All 1,410 tests
npm run test:unit         # Unit tests only
npm run test:e2e          # E2E tests
npm run test:integration  # Integration tests
npm run test:debug        # With --detectOpenHandles

# Specific test file
npx jest test/unit/utils/Config.test.js
```

## Development

```bash
# Local development
npm install
npm link                  # Makes 'atlas' available globally

# Run from source
node bin/atlas.js status

# Debug
DEBUG=atlas:* atlas status
```

## Configuration

**Location:** `~/.atlas/config.json`

```javascript
{
  "scanPaths": ["~/projects"],
  "preferences": {
    "adhd": {
      "showStreak": true,
      "celebrationLevel": "medium",
      "timeCues": true
    },
    "session": {
      "defaultDuration": 25,
      "breakDuration": 5
    }
  }
}
```

## Common Tasks

### Add a new CLI command
1. Add to `src/index.js` using Commander.js
2. Create use case in `src/use-cases/`
3. Add tests in `test/unit/use-cases/`

### Add a new entity
1. Create in `src/domain/entities/`
2. Add repository interface in `src/domain/repositories/`
3. Implement in `src/adapters/repositories/` (both FS and SQLite)
4. Register in `src/adapters/Container.js`

### Add ADHD helper
1. Create in `src/utils/`
2. Wire into dashboard or CLI
3. Add preferences in Config

### Add a presenter function
1. UI-agnostic: Add to `src/adapters/presenters/ProjectPresenter.js`
2. TUI-specific: Add to `src/adapters/presenters/TuiPresenter.js`
3. Add tests in `test/unit/adapters/presenters/`

## CI Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test.yml` | Push/PR | Run tests on Node 18/20 |
| `docs.yml` | Push to main | Deploy MkDocs to GitHub Pages |
| `demos.yml` | Changes to `docs/demos/*.tape` | Generate terminal demo GIFs |
| `homebrew-release.yml` | Release published | Auto-update Homebrew formula |

### Demo GIF Workflow

Terminal demos use [VHS](https://github.com/charmbracelet/vhs) for recording:

```bash
# Location
docs/demos/*.tape     # VHS tape files (recording scripts)
docs/demos/*.gif      # Generated GIFs

# Manual generation (requires vhs + gifsicle)
cd docs/demos
vhs getting-started.tape
gifsicle -O3 --lossy=80 getting-started.gif -o getting-started.gif

# CI auto-generates on changes to tape files
# PRs get comment with GIF file sizes table
```

**Tape file syntax:**
```
Output demo.gif
Set Shell "zsh"
Set FontSize 18
Set Width 800
Set Height 500
Type "atlas stats"
Enter
Sleep 2.5s
```

See [docs/prompts/DEMO-WORKFLOWS.md](docs/prompts/DEMO-WORKFLOWS.md) for reusable prompts.

## Documentation

| Doc | Purpose |
|-----|---------|
| [CLI-REFERENCE.md](docs/CLI-REFERENCE.md) | All commands |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [API-GUIDE.md](docs/API-GUIDE.md) | Programmatic usage |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Settings |
| [TUTORIAL.md](docs/TUTORIAL.md) | Getting started |
| [DIAGRAMS.md](docs/DIAGRAMS.md) | Visual diagrams |
| [DEMOS.md](docs/DEMOS.md) | Terminal demos |
| [MCP-SERVER.md](docs/MCP-SERVER.md) | MCP integration |

## Version History

- **v0.13.0** - Task CLI & Schedule Push/Agenda: Implement Tasks & Schedule Records persistence (SQLite & FileSystem), Task CRUD CLI (`atlas task`), schedule sync/push (`atlas schedule push`), and chronological merged agenda (`atlas agenda`). Also: AnalyticsView (`a` key), StatusBar, Vitest + ink-testing-library + Playwright E2E.
- **v0.12.2** - ESLint adoption: flat config, CI lint gate, zero-warning cleanup across all sources
- **v0.12.1** - Node 26 support (better-sqlite3 12.11.1), FW-30 id convergence, PatternAnalyzer crash fix, +42 edge tests
- **v0.12.0** - Research-safe sync: `sync --research` alias, plain-sync warning, `.atlas-scan-children` marker, venue comment strip
- **v0.11.1** - Plain sync preserves research metadata via `_preserveResearchMetadata`
- **v0.11.0** - Research registry + Doctor: `sync --from-status` parses research metadata, `atlas doctor`, `project list --kind`
- **v0.10.0** - Temporal Intelligence: VelocityCalculator (4-week rolling), PatternAnalyzer (90-day flow patterns), PredictionEngine (Bayesian calibration + MAD outlier removal); `atlas stats --velocity / --patterns / --calibrate`; 31 unit tests
- **v0.9.3** - flow-cli Integration: CLI flags flow-cli already calls (session status --format json, project list --count/--suggest, inbox --count, trail --limit) + project list --status metadata-filter fix; live integration docs
- **v0.9.2** - Real Data Pipeline: All mock data replaced with live ~/.atlas data
  - AtlasContext + 4 hooks (useProjects, useActiveSession, useProjectStats, usePendingCaptures)
  - Project filtering (tmp.*, archived, duplicates), value object extraction
  - Cross-validated dogfood tests (dual-path verification against filesystem)
- **v0.9.1** - Visual Enhancements: Theme System, Focus Score, Sparklines, Heatmap
  - ThemeContext with 5 built-in themes (default, nord, solarized, mono, high-contrast)
  - Focus score calculation with tier classification (○◔◑◕●)
  - Sidebar inline sparklines with trend coloring
  - Activity heatmap (full 7-day + compact 4-day modes)
  - HeatmapComponent shared component, FocusScorePresenter, formatHeatmapGrid
- **v0.9.0** - Ink TUI Modernization, Multi-Panel Dashboard, 73% code reduction
  - React Ink replaces blessed (7 views migrated)
  - LayoutManager: SINGLE/SPLIT/TRIPLE modes (`Tab` key)
  - SidebarPanel + InspectorPanel with live Pomodoro timer
  - BusinessRules domain constants, Gateway interfaces
- **v0.8.0** - Ecosystem Hub, Morning Ritual, MCP Server, Time Estimation
  - `atlas plan` - Guided daily planning with energy tracking
  - `atlas sync --from-status` - Import from .STATUS files
  - EcosystemView (`e` key) - Cross-project dashboard
  - PlanView (`p` key) - Morning ritual in dashboard
  - Homebrew auto-update workflow
- **v0.7.0** - Session export, Task-Based Focus, Timeline View
- **v0.6.3** - Stats export (`--export`, `--format md`)
- **v0.6.2** - Demo GIF CI workflow, GitGateway detached HEAD fix
- **v0.6.1** - Friendly error messages for session commands
- **v0.6.0** - Session analytics (`atlas stats`), documentation website
- **v0.5.6** - Presenter layer, project caching, constants extraction
- **v0.5.x** - Park/unpark, templates, configuration wizard
- **v0.4.x** - ADHD utilities, dashboard redesign
- **v0.3.x** - Dashboard themes, Pomodoro

## v0.9.x Status

**v0.9.2** — Real Data Pipeline (complete):
- AtlasContext: React Context wrapping DI Container for hooks
- useProjects: project list with focus scores, sparklines, filtering (5s poll)
- useActiveSession: session detection + 1s elapsed timer
- useProjectStats: heatmap, streak, breadcrumbs for selected project (10s poll)
- usePendingCaptures: inbox count from CaptureRepository (10s poll)
- Project filtering: removes tmp.*, archived, deduplicates by name
- Value object extraction: ProjectType → string, metadata bag → primitives
- Cross-validated dogfood tests: dual-path verification (code vs filesystem oracle)

**v0.9.1** — Visual Enhancements (complete):
- ThemeContext: 5 themes with ThemeProvider/useTheme hook
- Focus score: weighted formula → tier classification (deep/strong/steady/warming/drift)
- Sidebar sparklines: inline activity charts with trend coloring
- Activity heatmap: GitHub-style grid (·░▒▓█) in full and compact modes
- FocusScorePresenter, formatHeatmapGrid, HeatmapComponent shared component
- All components use theme-aware colors (no hardcoded values)

**v0.9.0** — TUI Modernization (complete):
- React Ink dashboard with TypeScript (replacing blessed)
- LayoutManager: SINGLE/SPLIT/TRIPLE layouts (Tab to cycle)
- SidebarPanel: Compact project list with windowing
- InspectorPanel: Detail + embedded Pomodoro
- Shared types (`types.ts`) and constants (`constants.ts`)
- State machine with 7 view states

**Detailed plan:** [docs/prompts/V0.9.0-ROADMAP.md](docs/prompts/V0.9.0-ROADMAP.md)
