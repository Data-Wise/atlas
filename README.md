# Atlas

**Project State Engine** - Registry, sessions, capture, and context management for ADHD-friendly workflow.

[![Tests](https://github.com/Data-Wise/atlas/actions/workflows/tests.yml/badge.svg)](https://github.com/Data-Wise/atlas/actions/workflows/tests.yml)
[![GitHub release](https://img.shields.io/github/v/release/Data-Wise/atlas)](https://github.com/Data-Wise/atlas/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started Tutorial](./docs/TUTORIAL.md) | Step-by-step introduction (15 min) |
| [CLI Command Reference](./docs/CLI-REFERENCE.md) | Complete command documentation |
| [Architecture Overview](./docs/ARCHITECTURE.md) | System design and patterns |
| [Visual Diagrams](./docs/DIAGRAMS.md) | Mermaid architecture diagrams |
| [Programmatic API](./docs/API-GUIDE.md) | Using Atlas as a library |
| [Configuration](./docs/CONFIGURATION.md) | All settings and preferences |

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

### Homebrew (macOS)

```bash
brew tap data-wise/tap
brew install atlas
```

### Direct Install (curl)

```bash
curl -fsSL https://raw.githubusercontent.com/Data-Wise/atlas/main/install.sh | bash
```

### From Source

```bash
git clone https://github.com/Data-Wise/atlas.git
cd atlas && npm install
npm link  # Makes 'atlas' available globally
```

### Shell Completions

```bash
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

### Context Parking (v0.5.1+)
ADHD-friendly context switching - save your place when you need to switch tasks:
```bash
atlas park "working on delta method"  # Park current context with note
atlas park --keep-session             # Park but keep session running
atlas parked                          # List all parked contexts
atlas unpark                          # Restore most recent parked context
atlas unpark abc123                   # Restore specific context by ID
```

### Template Management (v0.5.1+)
```bash
atlas template list                   # Show built-in + custom templates
atlas template show node              # Display template content
atlas template create mytemplate      # Create custom template
atlas template create mynode --from node  # Copy from existing
atlas template create mynode --extends node  # Inherit from existing (v0.5.2+)
atlas template export node            # Export built-in for customization
atlas template delete mytemplate      # Delete custom template
atlas template dir                    # Show custom templates directory
```

Custom templates are stored in `~/.atlas/templates/` with YAML frontmatter:
```yaml
---
name: My Template
description: Custom template for my projects
extends: node  # Optional: inherit from built-in template
---
## Project: {{name}}
...
```

### Template Variables (v0.5.2+)
Define custom variables in config that get replaced in templates:
```bash
atlas config prefs set templateVariables.github_user myuser
atlas config prefs set templateVariables.author "My Name"
```
Variables are replaced as `{{variable_name}}` in templates.

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
