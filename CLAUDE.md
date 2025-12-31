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

# Dashboard
atlas dash                       # Launch TUI
# Dashboard keys: f=Focus, T=Timeline, z=Zen, ?=Help
```

## Project Overview

| Attribute | Value |
|-----------|-------|
| **Type** | Node.js CLI (ESM) |
| **Version** | 0.7.0 (dev) |
| **Architecture** | Clean Architecture |
| **Storage** | FileSystem (default) / SQLite |
| **Tests** | 1,428 (Jest) |
| **MCP** | `atlas-mcp` server |
| **Docs** | https://data-wise.github.io/atlas/ |

## Architecture

```
src/
├── domain/           # Pure business logic (no dependencies)
│   ├── entities/     # Project, Session, Capture, Breadcrumb, Task
│   ├── repositories/ # Interfaces (IProjectRepository, etc.)
│   └── value-objects/# ProjectType, SessionState, TaskPriority
├── use-cases/        # Application logic
│   ├── session/      # CreateSession, EndSession, GetSessionStats
│   ├── capture/      # CaptureIdea, TriageInbox
│   ├── context/      # GetContext, Park/Unpark
│   ├── project/      # GetStatus, GetRecentProjects
│   └── registry/     # RegisterProject, SyncRegistry
├── adapters/         # External interfaces
│   ├── controllers/  # StatusController
│   ├── presenters/   # ProjectPresenter, TuiPresenter, StatsPresenter
│   ├── repositories/ # FileSystem*, SQLite* implementations
│   └── gateways/     # GitGateway, StatusFileGateway
├── utils/            # ADHD helpers, config, charts
├── mcp/              # MCP server for Claude integration
│   └── index.js      # Tools: get_context, start_session, capture, etc.
├── cli/              # Dashboard TUI (blessed)
│   └── dashboard/    # Modular dashboard components
│       ├── constants.js   # Configuration values
│       ├── helpers.js     # Re-exports from presenters
│       ├── views/         # MainView, DetailView, FocusView, ZenView, TimelineView
│       ├── stateMachine.js # BROWSE, DETAIL, FOCUS, ZEN, TIMELINE
│       └── timerManager.js
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
│   └── status/history/current
├── stats                 # Session analytics
├── catch/inbox/triage    # Quick capture
├── where/trail/crumb     # Context
├── park/unpark/parked    # Context switching
├── template              # Template management
├── config                # Configuration
├── sync                  # Registry sync
├── dash                  # Dashboard TUI
└── status                # Quick status
```

## Testing

```bash
npm test                  # All 1,428 tests
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
3. Re-export from `src/cli/dashboard/helpers.js` if used by dashboard
4. Add tests in `test/unit/adapters/presenters/`

## CI Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test.yml` | Push/PR | Run tests on Node 18/20 |
| `docs.yml` | Push to main | Deploy MkDocs to GitHub Pages |
| `demos.yml` | Changes to `docs/demos/*.tape` | Generate terminal demo GIFs |

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

- **v0.7.0** - Session export, Task-Based Focus, Time Estimation, MCP Server
- **v0.6.3** - Stats export (`--export`, `--format md`)
- **v0.6.2** - Demo GIF CI workflow, GitGateway detached HEAD fix
- **v0.6.1** - Friendly error messages for session commands
- **v0.6.0** - Session analytics (`atlas stats`), documentation website
- **v0.5.6** - Presenter layer, project caching, constants extraction
- **v0.5.x** - Park/unpark, templates, configuration wizard
- **v0.4.x** - ADHD utilities, dashboard redesign
- **v0.3.x** - Dashboard themes, Pomodoro
