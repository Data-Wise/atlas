# Atlas

**Project State Engine** - Registry, sessions, capture, and context management for ADHD-friendly workflows.

## Overview

Atlas is the state management core extracted from flow-cli. It provides:

- **Project Registry**: Track all your projects in one place
- **Session Management**: Track work sessions with duration and notes
- **Quick Capture**: Frictionless idea/task capture to inbox
- **Context Reconstruction**: "Where was I?" - rebuild mental state after breaks

## Installation

```bash
npm install -g @data-wise/atlas
```

## Quick Start

```bash
# Initialize atlas
atlas init

# Register a project
atlas project add ~/projects/my-project --tags=active,coding

# Start working
atlas session start my-project

# Set your focus
atlas focus my-project "implement feature X"

# Quick capture an idea
atlas catch "what about using Y instead?"

# Check context after a break
atlas where

# End session
atlas session end "completed feature X"
```

## CLI Commands

### Project Management

```bash
atlas project add [path]        # Register project
atlas project list              # List all projects
atlas project show <name>       # Show project details
atlas project remove <name>     # Unregister project
```

### Status & Focus

```bash
atlas focus <project> [text]    # Get/set project focus
atlas status [project]          # Show project status
```

### Sessions

```bash
atlas session start [project]   # Start work session
atlas session end [note]        # End current session
atlas session status            # Show current session
```

### Capture

```bash
atlas catch <text>              # Quick capture
atlas inbox                     # Show inbox
```

### Context

```bash
atlas where [project]           # "Where was I?"
atlas crumb <text>              # Leave breadcrumb
atlas trail [project]           # Show breadcrumb history
```

## Library API

```javascript
import { Atlas } from '@data-wise/atlas';

const atlas = new Atlas();

// List projects
const projects = await atlas.projects.list({ status: 'active' });

// Start session
await atlas.sessions.start('my-project');

// Quick capture
await atlas.capture.add('new idea', { project: 'my-project' });

// Get context
const context = await atlas.context.where('my-project');
```

## Architecture

Atlas uses Clean Architecture:

```
src/
├── domain/           # Core business logic (entities, value objects)
├── use-cases/        # Application-specific business rules
├── adapters/         # Interface adapters (repositories, controllers)
├── api/              # API layer
└── cli/              # CLI interface
```

## Integration with flow-cli

Atlas is designed to work with [flow-cli](../flow-cli), a ZSH workflow system:

```zsh
# flow-cli commands call atlas under the hood
work my-project    # Calls: atlas session start my-project
finish "done"      # Calls: atlas session end "done"
why                # Calls: atlas where
```

## License

MIT
