# Atlas Configuration Reference

Complete reference for Atlas configuration options, preferences, and customization.

## Configuration File

Atlas stores configuration and data in a single directory, `config.json`
alongside the JSON/SQLite data stores. Where that directory lives depends on
your install:

- **New installs** default to the XDG location:
  `$XDG_CONFIG_HOME/atlas` (or `~/.config/atlas` if `XDG_CONFIG_HOME` isn't
  set).
- **Existing installs** keep using `~/.atlas` until you explicitly migrate —
  atlas never silently relocates your data. See
  [Migrating to the XDG location](#migrating-to-the-xdg-location) below.

```json
{
  "scanPaths": ["~/projects"],
  "storage": "filesystem",
  "scanDepth": 3,
  "preferences": { ... }
}
```

## Configuration Location

| Setting | Path (XDG default) | Path (legacy, pre-migration) |
|---------|---------------------|-------------------------------|
| Config Directory | `~/.config/atlas/` | `~/.atlas/` |
| Config File | `~/.config/atlas/config.json` | `~/.atlas/config.json` |
| Projects Data | `~/.config/atlas/projects.json` | `~/.atlas/projects.json` |
| Sessions Data | `~/.config/atlas/sessions.json` | `~/.atlas/sessions.json` |
| Captures Data | `~/.config/atlas/captures.json` | `~/.atlas/captures.json` |
| Breadcrumbs Data | `~/.config/atlas/breadcrumbs.json` | `~/.atlas/breadcrumbs.json` |
| SQLite Database | `~/.config/atlas/atlas.db` | `~/.atlas/atlas.db` |
| Custom Templates | `~/.config/atlas/templates/` | `~/.atlas/templates/` |

Run `atlas doctor` at any time to see which location atlas is currently
using and whether a migration is available.

### Override Config Directory

```bash
export ATLAS_CONFIG=/custom/path
```

`ATLAS_CONFIG` (and its alias `ATLAS_DATA_DIR`) always take precedence over
both the XDG default and the legacy path — set either one and atlas uses
exactly that directory, no detection logic involved.

> **Not the same as `ATLAS_DIR`.** `install.sh`'s `ATLAS_DIR` environment
> variable controls where the *atlas binary itself* gets installed
> (default `~/.local/share/atlas`) — a completely different, unrelated
> setting from `ATLAS_CONFIG`/`ATLAS_DATA_DIR`/`XDG_CONFIG_HOME`, which
> control where your *data* lives. Setting one does not affect the other.

### Migrating to the XDG location

If atlas is still using the legacy `~/.atlas` path, `atlas doctor` will
mention it. To move your data:

```bash
atlas migrate --xdg              # dry-run — shows what would move
atlas migrate --xdg --apply      # actually move it
```

This is always your choice — atlas doesn't require it and doesn't nag. The
move is a single directory relocation with a small `.atlas-migration.json`
marker left at the new location recording where it came from and when.

**If `atlas-mcp` or `atlas dash` is running**, `--apply` refuses (your data
could be actively in use) unless you pass `--force`:

```bash
atlas migrate --xdg --apply --force   # only if you're sure that's a stale lock
```

**To reverse a migration** (there's no dedicated rollback command — this is
just a directory move):

```bash
mv ~/.config/atlas ~/.atlas
rm -f ~/.atlas/.atlas-migration.json
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

## Per-project scan markers

### `.atlas-scan-children`

By default the scanner treats a project directory as a **leaf** — when a directory is itself a project
(has `.STATUS` / `package.json` / etc.), atlas records it and does **not** descend into its children. This keeps
an "umbrella" directory (a monorepo that is itself a project) from sprawling its child repos into the registry.

To opt an umbrella in to having its child repos scanned too, drop an empty marker file in it:

```bash
touch ~/projects/dev-tools/mcp-servers/.atlas-scan-children
```

The scanner then records the umbrella **and** its children (still bounded by `scanDepth`). Policy:
docs-standards **ADR-003**.

---

## Preferences

All preferences are under the `preferences` key.

### Display Preferences

#### `theme`

Dashboard color theme (v0.9.1). Controls all panel borders, text, sparklines, heatmap, and focus tier colors.

**Type:** `string`
**Default:** `"default"`
**Options:** `"default"`, `"nord"`, `"solarized"`, `"mono"`, `"high-contrast"`

| Theme | Description |
|-------|-------------|
| `default` | Purple accents, warm grays — general use |
| `nord` | Arctic blue palette — dark terminals |
| `solarized` | Warm tans and blues — light or dark |
| `mono` | Pure grayscale — minimal distraction |
| `high-contrast` | Maximum readability — accessibility |

```json
{
  "preferences": {
    "theme": "nord"
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

### `defaultLayout`

Default layout mode for the Ink dashboard (v0.9.1).

**Type:** `string`
**Default:** `"single"`
**Options:** `"single"`, `"split"`, `"triple"`

```json
{
  "preferences": {
    "dashboard": {
      "defaultLayout": "triple"
    }
  }
}
```

---

## MCP Server Settings (v0.8.0)

The MCP server reads configuration from environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ATLAS_DATA_DIR` | Override data directory | XDG default, or legacy `~/.atlas` if already present — see [Configuration Location](#configuration-location) |
| `ATLAS_STORAGE` | Override storage backend | `filesystem` |

No additional configuration needed beyond the standard config file at
whichever location applies (see above).

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

**`{{user}}` resolution (v0.14.0+):** `atlas init -t <template>` only passes `{name}`, so
`{{user}}` is resolved automatically in this order: `preferences.templateVariables.user` →
`git config user.name` → `$USER` → the literal string `user`. Set
`templateVariables.user` explicitly if you want a value other than your git identity:

```bash
atlas config prefs set templateVariables.user "Jane Researcher"
```

All 6 builtin templates now emit canonical `.STATUS` YAML frontmatter (schema `atlas/v1` — see
[STATUS-SCHEMA.md](STATUS-SCHEMA.md)), not the old `## Key:` markdown headers.

**Built-in Variables:**
- `{{name}}` - Project name (from --name option)
- `{{date}}` - Current date

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ATLAS_CONFIG` | Override config directory | XDG default, or legacy `~/.atlas` if already present |
| `ATLAS_DATA_DIR` | Override data directory (alias of `ATLAS_CONFIG`, honored by the MCP server too) | same as above |
| `XDG_CONFIG_HOME` | Base for the XDG default (`$XDG_CONFIG_HOME/atlas`) | `~/.config` |
| `ATLAS_STORAGE` | Override storage backend | `filesystem` |

`ATLAS_CONFIG`/`ATLAS_DATA_DIR` set an exact directory and skip all
detection logic. `XDG_CONFIG_HOME` only changes where the *default*
resolves to — see [Configuration Location](#configuration-location) for
the full precedence and how existing `~/.atlas` installs are handled.

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
      "zenMode": false,
      "defaultLayout": "single"
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

Projects use `.STATUS` files for metadata. As of v0.14.0, atlas writes canonical **atlas/v1 YAML frontmatter**:

```markdown
---
schema: atlas/v1
status: active
progress: 50
type: node
priority: medium
focus: Current focus text here
next:
  - First task
  - Second task
---

# My Project

Additional notes here
```

### Recognized Fields

| Field | Values | Description |
|-------|--------|-------------|
| `status` | `active`, `paused`, `blocked`, `planning`, `stable`, `complete`, `archived` | Project status |
| `progress` | `0-100` | Completion percentage |
| `type` | `r-package`, `quarto`, `node`, `python`, etc. | Project type |
| `focus` | text | Current focus/checkpoint |
| `next` | YAML list | Next actions, first = next up |

Full reference: [.STATUS Schema (atlas/v1)](STATUS-SCHEMA.md).

> **Legacy format:** `## Status:` / `## Progress:` markdown headers still parse (read-only compatibility) — atlas never rewrites them without `atlas migrate --status --apply`. See [Migration Guide](user-guide/MIGRATION-GUIDE.md).

---

## Troubleshooting

> The commands below use `~/.atlas` for brevity. If you've migrated to the
> XDG location, substitute `~/.config/atlas` (or run `atlas doctor` first
> if you're not sure which one is active).

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

---

**Now what?** → [.STATUS Schema](STATUS-SCHEMA.md)
