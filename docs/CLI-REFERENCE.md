# Atlas CLI Command Reference

Complete reference for all Atlas CLI commands, options, and usage examples.

## Global Options

```bash
atlas [OPTIONS] <command> [arguments]

Options:
  --storage <type>    Storage backend: 'filesystem' (default) or 'sqlite'
  -V, --version       Show version number
  -h, --help          Show help
```

---

## Project Management

### `atlas project add`

Register a project in the Atlas registry.

```bash
atlas project add [path] [options]

Options:
  -t, --tags <tags>         Comma-separated tags
  -s, --status <status>     Initial status (active|paused|blocked|archived|complete)
  --description <text>      Project description
```

**Examples:**
```bash
# Register current directory
atlas project add

# Register specific path with tags
atlas project add ~/projects/myapp --tags=node,active

# Register with status and description
atlas project add ./api --status active --description "REST API service"
```

### `atlas project list`

List all registered projects.

```bash
atlas project list [options]

Options:
  -s, --status <status>    Filter by status
  -t, --tag <tag>          Filter by tag
  --format <format>        Output format: table (default), json, names
```

**Examples:**
```bash
# List all projects as table
atlas project list

# List active projects only
atlas project list --status active

# List projects with specific tag
atlas project list --tag r-package

# Get project names for scripting
atlas project list --format names
```

### `atlas project show`

Show detailed information about a project.

```bash
atlas project show <name> [options]

Options:
  --format <format>    Output format: table (default), json, shell
```

**Examples:**
```bash
# Show project details
atlas project show myproject

# Get JSON output for parsing
atlas project show myproject --format json

# Shell-friendly output for scripts
atlas project show myproject --format shell
```

### `atlas project remove`

Unregister a project from Atlas (does not delete files).

```bash
atlas project remove <name>
```

**Example:**
```bash
atlas project remove old-project
```

---

## Session Management

### `atlas session start`

Start a new work session.

```bash
atlas session start [project] [task]

Arguments:
  project    Project name (optional if in project directory)
  task       Task description (optional)
```

**Examples:**
```bash
# Start session for current project
atlas session start

# Start session with project name
atlas session start myproject

# Start with task description
atlas session start myproject "Implement user authentication"
```

**Output includes:**
- Context restoration ("Last time you were...")
- Current streak display
- Session start confirmation

### `atlas session end`

End the current work session.

```bash
atlas session end [note]

Arguments:
  note    Optional session summary or note
```

**Examples:**
```bash
# End session without note
atlas session end

# End with summary
atlas session end "Completed login flow, needs testing"
```

**Output includes:**
- Session duration
- Celebration message
- Streak update

### `atlas session status`

Show current session status.

```bash
atlas session status
```

**Output includes:**
- Active session project and task
- Duration and flow state
- Or "No active session" message

---

## Status & Progress

### `atlas status`

Show or update project status.

```bash
atlas status [project] [options]

Options:
  --set <status>           Set status (active|paused|blocked|archived|complete)
  --progress <percent>     Set progress (0-100)
  --focus <text>           Set current focus/checkpoint
  --next <actions>         Set next actions (comma-separated)
  --complete               Mark current action as done
  --then <action>          Add action after completing current
  --increment <amount>     Increase progress (default: 10)
  --create                 Create .STATUS file if missing
```

**Examples:**
```bash
# Show global workflow status
atlas status

# Show specific project status
atlas status myproject

# Update project status
atlas status myproject --set active --progress 50

# Set next actions
atlas status myproject --next "Write tests,Update docs"

# Complete current action and set next
atlas status myproject --complete --then "Deploy to staging"

# Increment progress by 10%
atlas status myproject --increment

# Increment by specific amount
atlas status myproject --increment 25
```

### `atlas focus`

Get or set project focus.

```bash
atlas focus <project> [text]

Arguments:
  project    Project name
  text       Focus text (optional, omit to get current focus)
```

**Examples:**
```bash
# Get current focus
atlas focus myproject

# Set new focus
atlas focus myproject "Optimizing database queries"
```

---

## Quick Capture

### `atlas catch`

Quickly capture an idea, task, or note.

```bash
atlas catch <text> [options]
atlas catch <project> <text>

Options:
  -p, --project <name>    Associate with project
  -t, --type <type>       Capture type: idea (default), task, bug, note, question
```

**Examples:**
```bash
# Quick capture
atlas catch "Check VanderWeele 2015 appendix"

# Capture for specific project
atlas catch myproject "Add input validation"

# Capture as bug
atlas catch "Login fails on Safari" --type bug

# Capture as task
atlas catch --project api "Implement rate limiting" --type task
```

### `atlas inbox`

View and manage captured items.

```bash
atlas inbox [options]

Options:
  -p, --project <name>    Filter by project
  --stats                 Show inbox statistics
  --triage                Interactive triage mode
```

**Examples:**
```bash
# Show all inbox items
atlas inbox

# Show items for specific project
atlas inbox --project myproject

# Show statistics
atlas inbox --stats

# Start interactive triage
atlas inbox --triage
```

---

## Context & Breadcrumbs

### `atlas where`

Show current context ("Where was I?").

```bash
atlas where [project]

Arguments:
  project    Project name (optional)
```

**Examples:**
```bash
# Show global context
atlas where

# Show project-specific context
atlas where myproject
```

**Output includes:**
- Current focus
- Active session info
- Recent breadcrumbs
- Recent captures

### `atlas crumb`

Leave a breadcrumb marker for later context.

```bash
atlas crumb <text> [options]

Options:
  -p, --project <name>    Associate with project
```

**Examples:**
```bash
# Leave a breadcrumb
atlas crumb "Stuck on variance estimation"

# Breadcrumb for specific project
atlas crumb "Need to refactor auth module" --project api
```

### `atlas trail`

View breadcrumb trail.

```bash
atlas trail [project] [options]

Options:
  -d, --days <number>    Days to look back (default: 7)
```

**Examples:**
```bash
# Show recent trail
atlas trail

# Show project-specific trail
atlas trail myproject

# Show last 30 days
atlas trail --days 30
```

---

## Context Parking (v0.5.1+)

### `atlas park`

Park current context for later restoration.

```bash
atlas park [note] [options]

Options:
  -f, --force           Park even without active session
  -k, --keep-session    Park but keep session running
```

**Examples:**
```bash
# Park with note
atlas park "switching to urgent bug fix"

# Park but keep session running
atlas park --keep-session "quick context save"

# Force park without active session
atlas park --force "saving context"
```

**Saved context includes:**
- Project name
- Current task
- Session duration
- Recent breadcrumbs
- Park note

### `atlas parked`

List all parked contexts.

```bash
atlas parked
```

**Output shows:**
- Context ID
- Project name
- Task
- Duration at park time
- Park note
- When parked

### `atlas unpark`

Restore a parked context.

```bash
atlas unpark [id]

Arguments:
  id    Context ID (optional, defaults to most recent)
```

**Examples:**
```bash
# Restore most recent
atlas unpark

# Restore specific context
atlas unpark abc123
```

**Restoration includes:**
- Starts new session with saved project/task
- Shows "where you left off" summary

---

## Dashboard

### `atlas dashboard` / `atlas dash`

Launch the interactive TUI dashboard.

```bash
atlas dashboard
atlas dash
```

**Keyboard Shortcuts:**

| Key | Action |
|-----|--------|
| `↑↓` | Navigate projects |
| `Enter` | Open project detail |
| `Esc` | Back / Exit focus mode |
| `/` | Search/filter projects |
| `a` | Filter: active only |
| `p` | Filter: paused only |
| `*` | Clear filter (show all) |
| `s` | Start session |
| `e` | End session |
| `c` | Quick capture |
| `r` | Refresh data |
| `o` | Open project folder |
| `f` | Enter focus mode |
| `d` | Decision helper |
| `t` | Cycle themes |
| `z` | Zen mode |
| `q` | Quit |
| `?` | Show help |

**Focus Mode Keys:**

| Key | Action |
|-----|--------|
| `Space` | Pause/Resume timer |
| `r` | Reset timer |
| `+` | Add 5 minutes |
| `-` | Subtract 5 minutes |
| `c` | Quick capture |
| `Esc` | Exit focus mode |

---

## Initialization & Templates

### `atlas init`

Initialize Atlas configuration.

```bash
atlas init [options]

Options:
  -g, --global              Initialize global config
  -t, --template <id>       Use project template
  -n, --name <name>         Project name for template
  --list-templates          List available templates
```

**Examples:**
```bash
# Initialize Atlas
atlas init

# List available templates
atlas init --list-templates

# Create project from template
atlas init --template node --name my-app

# Create R package
atlas init --template r-package --name mypackage
```

**Built-in Templates:**
- `node` - Node.js/npm package
- `r-package` - R package with roxygen2/testthat
- `python` - Python package with pytest
- `quarto` - Quarto document/presentation
- `research` - Academic research project
- `minimal` - Bare .STATUS file

### `atlas template list`

List all available templates.

```bash
atlas template list
```

### `atlas template show`

Display template content.

```bash
atlas template show <id>
```

### `atlas template create`

Create a custom template.

```bash
atlas template create <id> [options]

Options:
  -n, --name <name>           Template display name
  -d, --description <text>    Template description
  -f, --from <id>             Copy from existing template
  -e, --extends <id>          Inherit from template (v0.5.2+)
```

**Examples:**
```bash
# Create empty template
atlas template create my-template

# Copy from existing
atlas template create my-node --from node

# Extend existing (inherit + customize)
atlas template create custom-node --extends node
```

### `atlas template export`

Export built-in template for customization.

```bash
atlas template export <id>
```

### `atlas template delete`

Delete a custom template.

```bash
atlas template delete <id>
```

### `atlas template dir`

Show custom templates directory.

```bash
atlas template dir
```

---

## Sync & Registry

### `atlas sync`

Synchronize projects from .STATUS files.

```bash
atlas sync [options]

Options:
  -d, --dry-run           Preview without making changes
  -w, --watch             Watch mode (5s interval)
  -p, --paths <paths>     Comma-separated paths to scan
  --remove-orphans        Remove projects whose paths no longer exist
```

**Examples:**
```bash
# Sync from configured paths
atlas sync

# Preview sync
atlas sync --dry-run

# Watch for changes
atlas sync --watch

# Sync specific paths
atlas sync --paths ~/projects,~/work
```

---

## Configuration

### `atlas config show`

Display all configuration.

```bash
atlas config show
```

### `atlas config paths`

Show configured scan paths.

```bash
atlas config paths
```

### `atlas config add-path`

Add a scan path.

```bash
atlas config add-path <path>
```

### `atlas config remove-path`

Remove a scan path.

```bash
atlas config remove-path <path>
```

### `atlas config setup`

Interactive configuration wizard.

```bash
atlas config setup
```

### Preferences

```bash
# Show all preferences
atlas config prefs show

# Get specific preference
atlas config prefs get adhd.showStreak

# Set preference
atlas config prefs set adhd.celebrationLevel enthusiastic

# Reset to defaults
atlas config prefs reset

# Show default values
atlas config prefs defaults
```

**Common Preferences:**
```bash
# ADHD settings
atlas config prefs set adhd.showStreak true
atlas config prefs set adhd.showTimeCues true
atlas config prefs set adhd.celebrationLevel normal  # minimal|normal|enthusiastic

# Session settings
atlas config prefs set session.pomodoroLength 25
atlas config prefs set session.breakLength 5

# Template variables
atlas config prefs set templateVariables.author "Your Name"
atlas config prefs set templateVariables.github_user youruser
```

---

## Storage & Migration

### `atlas migrate`

Migrate between storage backends.

```bash
atlas migrate [options]

Options:
  -f, --from <type>    Source backend (filesystem|sqlite)
  -t, --to <type>      Target backend (filesystem|sqlite)
  --dry-run            Preview migration
```

**Examples:**
```bash
# Migrate to SQLite
atlas migrate --to sqlite

# Migrate back to filesystem
atlas migrate --to filesystem

# Preview migration
atlas migrate --to sqlite --dry-run
```

### Using SQLite Backend

```bash
# Use SQLite for single command
atlas --storage sqlite status

# Set as default in config
atlas config prefs set storage sqlite
```

---

## Shell Completions

### `atlas completions`

Generate shell completion scripts.

```bash
atlas completions [shell]

Arguments:
  shell    Shell type: zsh, bash, fish
```

**Installation:**
```bash
# ZSH
atlas completions zsh >> ~/.zshrc

# Bash
atlas completions bash >> ~/.bashrc

# Fish
atlas completions fish > ~/.config/fish/completions/atlas.fish
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ATLAS_CONFIG` | Config directory path | `~/.atlas` |
| `ATLAS_STORAGE` | Storage backend | `filesystem` |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Project not found |
| 4 | Session error |

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [Programmatic API Guide](./API-GUIDE.md)
- [Configuration Reference](./CONFIGURATION.md)
