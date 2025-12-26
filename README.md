# Atlas

**Project State Engine** - Registry, sessions, capture, and context management for ADHD-friendly workflow.

## Overview

Atlas is the state management engine that powers the flow-cli workflow system. It can be used standalone or as a library.

```
┌─────────────────────────────────────────────────────────────────┐
│  flow-cli (ZSH)                 atlas (Node.js)                 │
│  ────────────────               ────────────────                │
│  • Shell commands               • Clean Architecture            │
│  • Fast CLI                     • State management              │
│  • TUI dashboard                • Registry + Sessions           │
│  Consumes ──────────────────────▶ Standalone engine             │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Global install
npm install -g @data-wise/atlas

# Or use directly
npx @data-wise/atlas status

# Enable shell completions
atlas completions zsh >> ~/.zshrc   # or bash/fish
```

## Quick Start

```bash
# Initialize atlas
atlas init

# Initialize with a project template
atlas init --template node --name my-app

# Sync projects from .STATUS files
atlas sync

# Start a work session
atlas session start myproject

# Quick capture an idea
atlas catch "check VanderWeele 2015 appendix"

# Leave a breadcrumb
atlas crumb "stuck on variance estimation"

# Show context ("where was I?")
atlas where
```

## CLI Commands

### Project Management
```bash
atlas project add ~/projects/medrobust --tags=r-package,active
atlas project list --status=active
atlas project show medrobust
atlas project remove oldproject
```

### Session Management
```bash
atlas session start medrobust
atlas session status
atlas session end "Completed delta method SEs"
```

### Quick Capture
```bash
atlas catch "check VanderWeele 2015 appendix"
atlas catch medrobust "add sensitivity plot"
atlas inbox
atlas inbox --project=medrobust
```

### Context & Breadcrumbs
```bash
atlas where                    # Current context
atlas where medrobust          # Project context
atlas crumb "stuck on variance"
atlas trail                    # Recent breadcrumbs
atlas trail --days=7
```

### Status Updates
```bash
atlas status myproject                          # Show project status
atlas status myproject --set active             # Set status
atlas status myproject --progress 50            # Set progress
atlas status myproject --next "Implement X"     # Set next action
atlas status myproject --complete               # Complete current action
atlas status myproject --increment 10           # Increase progress by 10
atlas focus myproject "Delta method SEs"        # Set focus
```

### Sync
```bash
atlas sync                     # Import from .STATUS files
atlas sync --dry-run           # Preview what would sync
atlas sync --watch             # Watch mode (5s interval)
```

### Inbox Triage
```bash
atlas inbox                    # Show inbox items
atlas inbox --stats            # Show inbox statistics
atlas inbox --triage           # Interactive triage mode
```

### Dashboard
```bash
atlas dashboard                # Launch TUI dashboard
atlas dash                     # Alias for dashboard
```

#### Dashboard Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑↓` | Navigate projects |
| `Enter` | Open project detail view |
| `Esc` | Return to main view / Exit focus mode |
| `/` | Search/filter projects |
| `a` | Filter: active projects only |
| `p` | Filter: paused projects only |
| `*` | Clear filter (show all) |
| `s` | Start session (in detail view) |
| `e` | End current session |
| `c` | Quick capture |
| `r` | Refresh data (reset timer in focus mode) |
| `o` | Open project folder (detail view) |
| `f` | Enter focus mode (Pomodoro timer) |
| `d` | Decision helper ("What to work on?") |
| `t` | Cycle themes (default/dark/minimal) |
| `q` | Quit dashboard |
| `?` | Show help |

#### Focus Mode Keys (v0.3.0+)
| Key | Action |
|-----|--------|
| `Space` | Pause/Resume timer |
| `r` | Reset timer |
| `+/-` | Adjust time (±5 minutes) |
| `c` | Quick capture |
| `Esc` | Exit focus mode |

#### Dashboard Features (v0.2.0+)
- **Focus indicator**: Active session's project highlighted
- **Recency column**: "Last: 2h ago" shows time since last session
- **Quick filters**: Press `a/p/s/*` to filter by status
- **Search**: Press `/` to fuzzy search projects
- **Session gauge**: Visual progress toward daily goal
- **Sparkline**: Weekly session activity graph
- **Inline capture**: Quick idea capture without leaving dashboard

#### Dashboard Features (v0.3.0+)
- **Focus mode**: Minimal distraction UI with Pomodoro timer (`f`)
- **Decision helper**: "What should I work on?" suggestions (`d`)
- **Break reminders**: Notification after Pomodoro completes
- **Terminal-adaptive**: Adjusts to terminal size, warns if too small

#### Dashboard Features (v0.3.1+)
- **Theme cycling**: Press `t` to cycle through themes (default, dark, minimal)
- **Time-aware suggestions**: Decision helper adapts to time of day
- **Pomodoro stats**: Shows today's completed sessions in focus mode
- **Break enforcement**: Modal break dialog after Pomodoro completes

#### ADHD-Friendly Features (v0.4.1+)
- **Streak tracking**: Consecutive day tracking with visual display
- **Time awareness**: Gentle time cues without breaking flow
- **Celebrations**: Positive reinforcement on achievements
- **Context restoration**: "Last time you were..." on session start
- **Anti-perfectionism**: "Good enough" session endings

Preferences for these features can be configured:
```bash
atlas config prefs get adhd           # View ADHD settings
atlas config prefs set adhd.showStreak false
atlas config prefs set adhd.celebrationLevel enthusiastic  # minimal|normal|enthusiastic
```

#### Card Stack Layout (v0.4.0+)
- **Project cards**: Visual cards with progress bars and next actions
- **Contextual UI**: Command bar shows available actions
- **Zen mode**: Minimal distraction mode (`z` key)

### Project Templates (v0.5.0+)
```bash
atlas init --list-templates           # Show available templates
atlas init --template node            # Node.js package
atlas init --template r-package       # R package
atlas init --template python          # Python package
atlas init --template quarto          # Quarto document
atlas init --template research        # Research project
atlas init --template minimal         # Minimal .STATUS
atlas init --template node --name foo # With custom name
```

### Configuration (v0.5.0+)
```bash
atlas config setup                    # Interactive wizard
atlas config show                     # Show all config
atlas config paths                    # Show scan paths
atlas config add-path ~/myprojects    # Add scan path
atlas config prefs show               # Show preferences
atlas config prefs get adhd           # Get ADHD settings
atlas config prefs set adhd.showStreak false  # Set preference
atlas config prefs reset              # Reset to defaults
```

### Storage & Migration
```bash
atlas --storage sqlite         # Use SQLite backend
atlas migrate --to sqlite      # Migrate to SQLite
atlas migrate --to filesystem  # Migrate back to JSON
```

## Programmatic API

```javascript
import { Atlas } from '@data-wise/atlas';

// Initialize with options
const atlas = new Atlas({
  storage: 'sqlite',           // or 'filesystem' (default)
  configPath: '~/.atlas'       // data directory
});

// Projects API
const projects = await atlas.projects.list({ status: 'active' });
await atlas.projects.register('/path/to/project', { tags: ['r-package'] });
await atlas.projects.setStatus('medrobust', 'paused');
await atlas.projects.setProgress('medrobust', 75);
await atlas.projects.setFocus('medrobust', 'Delta method SEs');
await atlas.projects.incrementProgress('medrobust', 10);
await atlas.projects.completeNextAction('medrobust', 'New task');

// Sessions API
const session = await atlas.sessions.start('medrobust');
await atlas.sessions.end('Completed delta method');
const current = await atlas.sessions.current();

// Capture API
await atlas.capture.add("new idea", { project: 'medrobust', type: 'idea' });
const inbox = await atlas.capture.inbox({ project: 'medrobust' });
const counts = await atlas.capture.counts();

// Context API
const ctx = await atlas.context.where('medrobust');
console.log(ctx.focus);          // "delta method SEs"
console.log(ctx.session);        // { start: ..., duration: ... }
console.log(ctx.recentCrumbs);   // ["stuck on variance", ...]

await atlas.context.breadcrumb("stuck on variance", 'medrobust');
const trail = await atlas.context.trail('medrobust', 7); // last 7 days

// Sync API
await atlas.sync({ paths: ['~/projects'], dryRun: false });

// Clean up (important for SQLite)
atlas.close();
```

## Architecture

Atlas follows Clean Architecture principles:

```
src/
├── domain/                  # Business entities & rules
│   ├── entities/            # Project, Session, Capture, Breadcrumb
│   ├── value-objects/       # ProjectType, SessionState
│   └── repositories/        # Repository interfaces
│
├── use-cases/               # Application business logic
│   ├── project/             # ScanProjects, GetStatus, GetRecentProjects
│   ├── session/             # CreateSession, EndSession
│   ├── capture/             # CaptureIdea, GetInbox, TriageInbox
│   ├── context/             # GetContext, LogBreadcrumb, GetTrail
│   ├── registry/            # SyncRegistry, RegisterProject
│   └── status/              # UpdateStatus
│
├── adapters/                # External interfaces
│   ├── repositories/        # FileSystem + SQLite implementations
│   ├── Container.js         # Dependency injection
│   ├── gateways/            # StatusFileGateway
│   └── events/              # Event publishing
│
└── cli/                     # Command-line interface
    └── dashboard.js         # TUI dashboard (blessed-contrib)
```

## Data Storage

Atlas supports two storage backends:

### Filesystem (Default)
```
~/.atlas/
├── projects.json            # Project registry
├── sessions.json            # Session history
├── captures.json            # Captured ideas/tasks
└── breadcrumbs.json         # Breadcrumb trail
```

### SQLite (Better Performance)
```
~/.atlas/
└── atlas.db                 # All data in single SQLite database
```

Switch backends with `--storage sqlite` or migrate with `atlas migrate`.

## Integration with flow-cli

flow-cli (the ZSH plugin) uses atlas for state management:

```zsh
# flow-cli command
work medrobust

# Internally calls:
# atlas session start medrobust
# atlas where medrobust
```

The atlas-bridge in flow-cli provides graceful degradation - flow-cli works without atlas installed, just with reduced features.

## Development

```bash
# Run tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration

# Lint
npm run lint

# Format
npm run format
```

## License

MIT
