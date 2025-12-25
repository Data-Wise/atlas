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
```

## Quick Start

```bash
# Initialize atlas
atlas init

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

### Sync
```bash
atlas sync                     # Import from .STATUS files
atlas sync --dry-run           # Preview what would sync
```

## Programmatic API

```javascript
import { Atlas } from '@data-wise/atlas';

const atlas = new Atlas();

// List active projects
const projects = await atlas.projects.list({ status: 'active' });

// Get project with context
const ctx = await atlas.context.where('medrobust');
console.log(ctx.focus);          // "delta method SEs"
console.log(ctx.session);        // { start: ..., duration: ... }
console.log(ctx.recentCrumbs);   // ["stuck on variance", ...]

// Capture idea
await atlas.capture.add("new idea", { project: 'medrobust' });

// Start session
const session = await atlas.sessions.start('medrobust');
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
│   ├── project/             # Project operations
│   ├── session/             # Session management
│   ├── capture/             # Quick capture
│   └── context/             # Context reconstruction
│
├── adapters/                # External interfaces
│   ├── repositories/        # FileSystem implementations
│   ├── Container.js         # Dependency injection
│   └── events/              # Event publishing
│
└── cli/                     # Command-line interface
```

## Data Storage

Atlas stores data in `~/.atlas/`:

```
~/.atlas/
├── config.yaml              # Configuration
├── registry.json            # Project registry
├── sessions.json            # Session history
├── captures.json            # Captured ideas/tasks
└── breadcrumbs.json         # Breadcrumb trail
```

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
