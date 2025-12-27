# Atlas Configuration Reference

Complete reference for Atlas configuration options, preferences, and customization.

## Configuration File

Atlas stores configuration in `~/.atlas/config.json`:

```json
{
  "scanPaths": ["~/projects"],
  "storage": "filesystem",
  "scanDepth": 3,
  "preferences": { ... }
}
```

## Configuration Location

| Setting | Path |
|---------|------|
| Config Directory | `~/.atlas/` |
| Config File | `~/.atlas/config.json` |
| Projects Data | `~/.atlas/projects.json` |
| Sessions Data | `~/.atlas/sessions.json` |
| Captures Data | `~/.atlas/captures.json` |
| Breadcrumbs Data | `~/.atlas/breadcrumbs.json` |
| SQLite Database | `~/.atlas/atlas.db` |
| Custom Templates | `~/.atlas/templates/` |

### Override Config Directory

```bash
export ATLAS_CONFIG=/custom/path
```

---

## Core Settings

### `scanPaths`

Directories to scan for projects with `.STATUS` files.

**Type:** `string[]`
**Default:** `["~/projects"]`

```json
{
  "scanPaths": [
    "~/projects",
    "~/work",
    "~/personal"
  ]
}
```

**CLI:**
```bash
atlas config paths                      # Show paths
atlas config add-path ~/new-projects    # Add path
atlas config remove-path ~/old          # Remove path
```

### `storage`

Storage backend for Atlas data.

**Type:** `string`
**Default:** `"filesystem"`
**Options:** `"filesystem"`, `"sqlite"`

```json
{
  "storage": "sqlite"
}
```

**CLI:**
```bash
atlas --storage sqlite status           # Use SQLite for command
atlas migrate --to sqlite               # Migrate to SQLite
```

### `scanDepth`

How many directory levels deep to scan for projects.

**Type:** `number`
**Default:** `3`

```json
{
  "scanDepth": 4
}
```

---

## Preferences

All preferences are under the `preferences` key.

### Display Preferences

#### `theme`

Dashboard color theme.

**Type:** `string`
**Default:** `"default"`
**Options:** `"default"`, `"minimal"`, `"colorful"`

```json
{
  "preferences": {
    "theme": "minimal"
  }
}
```

#### `showEmoji`

Show emoji in CLI output.

**Type:** `boolean`
**Default:** `true`

#### `compactMode`

Use compact display mode.

**Type:** `boolean`
**Default:** `false`

---

## ADHD-Friendly Settings

All under `preferences.adhd`:

```json
{
  "preferences": {
    "adhd": {
      "showStreak": true,
      "showTimeCues": true,
      "showCelebrations": true,
      "showContextRestore": true,
      "flowThresholdMinutes": 15,
      "timeBlindnessInterval": 30,
      "celebrationLevel": "normal"
    }
  }
}
```

### `showStreak`

Display consecutive day streak in dashboard and CLI.

**Type:** `boolean`
**Default:** `true`

```bash
atlas config prefs set adhd.showStreak false
```

### `showTimeCues`

Show gentle time awareness reminders.

**Type:** `boolean`
**Default:** `true`

### `showCelebrations`

Display positive reinforcement on achievements.

**Type:** `boolean`
**Default:** `true`

### `showContextRestore`

Show "last time you were..." messages on session start.

**Type:** `boolean`
**Default:** `true`

### `flowThresholdMinutes`

Minutes of continuous work before considered "in flow".

**Type:** `number`
**Default:** `15`

### `timeBlindnessInterval`

Minutes between time awareness reminders.

**Type:** `number`
**Default:** `30`

### `celebrationLevel`

Intensity of celebration messages.

**Type:** `string`
**Default:** `"normal"`
**Options:** `"minimal"`, `"normal"`, `"enthusiastic"`

```bash
atlas config prefs set adhd.celebrationLevel enthusiastic
```

---

## Session Settings

All under `preferences.session`:

```json
{
  "preferences": {
    "session": {
      "defaultDurationMinutes": null,
      "autoEndAfterMinutes": null,
      "pomodoroLength": 25,
      "breakLength": 5
    }
  }
}
```

### `defaultDurationMinutes`

Default session duration (null = no default).

**Type:** `number | null`
**Default:** `null`

### `autoEndAfterMinutes`

Automatically end sessions after this duration (null = disabled).

**Type:** `number | null`
**Default:** `null`

### `pomodoroLength`

Pomodoro work period in minutes.

**Type:** `number`
**Default:** `25`

```bash
atlas config prefs set session.pomodoroLength 30
```

### `breakLength`

Pomodoro break period in minutes.

**Type:** `number`
**Default:** `5`

---

## Dashboard Settings

All under `preferences.dashboard`:

```json
{
  "preferences": {
    "dashboard": {
      "refreshInterval": 1000,
      "showProjectCards": true,
      "maxRecentProjects": 5,
      "zenMode": false
    }
  }
}
```

### `refreshInterval`

Dashboard refresh interval in milliseconds.

**Type:** `number`
**Default:** `1000`

### `showProjectCards`

Display project cards in dashboard.

**Type:** `boolean`
**Default:** `true`

### `maxRecentProjects`

Maximum projects to show in recent list.

**Type:** `number`
**Default:** `5`

### `zenMode`

Enable minimal distraction mode by default.

**Type:** `boolean`
**Default:** `false`

---

## Template Variables

Variables for project templates under `preferences.templateVariables`:

```json
{
  "preferences": {
    "templateVariables": {
      "author": "Your Name",
      "github_user": "username",
      "email": "you@example.com",
      "company": "Company Name"
    }
  }
}
```

These are replaced as `{{variable_name}}` in templates.

**CLI:**
```bash
atlas config prefs set templateVariables.author "John Doe"
atlas config prefs set templateVariables.github_user johndoe
```

**Built-in Variables:**
- `{{name}}` - Project name (from --name option)
- `{{date}}` - Current date

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ATLAS_CONFIG` | Override config directory | `~/.atlas` |
| `ATLAS_STORAGE` | Override storage backend | `filesystem` |

**Example:**
```bash
export ATLAS_CONFIG=/custom/path
export ATLAS_STORAGE=sqlite
atlas status
```

---

## CLI Configuration Commands

### View Configuration

```bash
# Show all configuration
atlas config show

# Show scan paths
atlas config paths

# Show all preferences
atlas config prefs show

# Get specific preference
atlas config prefs get adhd.showStreak
atlas config prefs get session.pomodoroLength
```

### Modify Configuration

```bash
# Add scan path
atlas config add-path ~/new-projects

# Remove scan path
atlas config remove-path ~/old-projects

# Set preference
atlas config prefs set adhd.celebrationLevel enthusiastic
atlas config prefs set session.pomodoroLength 30

# Reset all preferences to defaults
atlas config prefs reset
```

### Interactive Setup

```bash
atlas config setup
```

This launches an interactive wizard for common settings.

---

## Default Configuration

Full default configuration:

```json
{
  "scanPaths": ["~/projects"],
  "storage": "filesystem",
  "scanDepth": 3,
  "preferences": {
    "theme": "default",
    "showEmoji": true,
    "compactMode": false,
    "adhd": {
      "showStreak": true,
      "showTimeCues": true,
      "showCelebrations": true,
      "showContextRestore": true,
      "flowThresholdMinutes": 15,
      "timeBlindnessInterval": 30,
      "celebrationLevel": "normal"
    },
    "session": {
      "defaultDurationMinutes": null,
      "autoEndAfterMinutes": null,
      "pomodoroLength": 25,
      "breakLength": 5
    },
    "dashboard": {
      "refreshInterval": 1000,
      "showProjectCards": true,
      "maxRecentProjects": 5,
      "zenMode": false
    },
    "templateVariables": {}
  }
}
```

---

## Storage Backends

### Filesystem (Default)

Data stored as JSON files:

```
~/.atlas/
├── config.json        # Configuration
├── projects.json      # Project registry
├── sessions.json      # Session history
├── captures.json      # Captured items
└── breadcrumbs.json   # Breadcrumb trail
```

**Pros:**
- Human-readable
- Easy to backup/edit
- No dependencies

**Cons:**
- Slower for large datasets
- No concurrent access

### SQLite

Data stored in single database:

```
~/.atlas/
└── atlas.db
```

**Pros:**
- Better performance
- ACID transactions
- Supports concurrent access

**Cons:**
- Requires native module (better-sqlite3)
- Binary format

### Migrating

```bash
# Preview migration
atlas migrate --to sqlite --dry-run

# Migrate to SQLite
atlas migrate --to sqlite

# Migrate back to filesystem
atlas migrate --to filesystem
```

---

## Custom Templates

Custom templates are stored in `~/.atlas/templates/`:

```
~/.atlas/templates/
├── my-template.md
└── custom-node.md
```

### Template Format

Templates use YAML frontmatter:

```markdown
---
name: My Custom Template
description: Template for my projects
extends: node
---
## Project: {{name}}

{{parent}}

## Custom Section

Created by {{author}}
```

### Template Inheritance

Use `extends` to inherit from another template:

```yaml
---
extends: node
---
{{parent}}

## Additional Content
```

The `{{parent}}` placeholder is replaced with the parent template content.

### Managing Templates

```bash
# List templates
atlas template list

# Show template content
atlas template show my-template

# Create template
atlas template create my-template

# Create from existing
atlas template create my-node --from node

# Create with inheritance
atlas template create custom-node --extends node

# Export built-in for editing
atlas template export node

# Delete custom template
atlas template delete my-template

# Show templates directory
atlas template dir
```

---

## .STATUS File Format

Projects use `.STATUS` files for metadata:

```markdown
## Project: My Project

## Status: active
## Progress: 50
## Type: node

## Focus
Current focus text here

## Next
- [ ] First task
- [ ] Second task

## Notes
Additional notes here
```

### Recognized Fields

| Field | Values | Description |
|-------|--------|-------------|
| `Status` | `active`, `paused`, `blocked`, `archived`, `complete` | Project status |
| `Progress` | `0-100` | Completion percentage |
| `Type` | `r-package`, `quarto`, `node`, `python`, etc. | Project type |
| `Focus` | text | Current focus/checkpoint |
| `Next` | markdown list | Next actions |

---

## Troubleshooting

### Config Not Loading

```bash
# Check config file exists
ls -la ~/.atlas/config.json

# Validate JSON
cat ~/.atlas/config.json | python -m json.tool
```

### Reset Configuration

```bash
# Reset preferences only
atlas config prefs reset

# Full reset (backup first!)
mv ~/.atlas ~/.atlas.backup
atlas init
```

### Permission Issues

```bash
# Fix permissions
chmod 755 ~/.atlas
chmod 644 ~/.atlas/*.json
```

---

## See Also

- [CLI Reference](./CLI-REFERENCE.md)
- [Architecture](./ARCHITECTURE.md)
- [API Guide](./API-GUIDE.md)
