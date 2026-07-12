# Atlas Cookbook

> Task-oriented recipes for research-ops and dev workflows. Each recipe is **problem → do this → notes**.
> New here? Start with the [Research Registry tutorial](../tutorials/research-registry.md); for the big picture
> see the [Research Registry tutorial](../tutorials/research-registry.md) and the cross-tool
> [research-ops overview](https://github.com/Data-Wise/docs-standards/blob/main/research-ops/overview.md).

---

## Recipe 1 — Tag a manuscript or program

**You want** a `.STATUS` that atlas can read as a research project.

```yaml
# ~/projects/research/collider/.STATUS
status: revise & resubmit
priority: P0
progress: 95
kind: manuscript          # manuscript | program
target: AMPPS             # or venue: / journal:
next: upload rev1 to the AMPPS portal (deadline Aug 7)
```

A **program** can carry a `tasks:` block (its proposals become task entries):

```yaml
kind: program
target: Epidemiology / JASA
tasks:
  - text: "01 incremental — promote code"; priority: P1; done: false
  - text: "05 data-fusion — copula kill-test"; priority: P2; done: true
```

**Notes.** `target:`, `venue:`, and `journal:` are aliases. A trailing `# comment` is stripped
(`target: CSDA # was JASA` → `CSDA`). Markdown-style (`## Kind: manuscript`) is also supported.

---

## Recipe 2 — Sync research projects (safely)

**You want** the registry to pick up `kind`/`target`/`tasks` from your research `.STATUS` files.

```bash
atlas sync --research                       # = --from-status, defaults to ~/projects/research
atlas sync --from-status --paths ~/projects/research   # explicit
atlas sync --from-status --paths ~/projects/research --dry-run   # preview
```

**Notes.** `--from-status` (and its `--research` alias) is the **authority** for research metadata. A plain
`atlas sync` is packages-only — it **preserves** existing `kind`/`target`/`tasks` but does not re-parse them,
and it **warns** you to re-run `--from-status` (see Recipe 7). See docs-standards **ADR-002**.

---

## Recipe 3 — List & query research projects

```bash
atlas project list --kind manuscript        # only manuscripts
atlas project list --kind program           # only programs
atlas project list --kind program --format json
# → [{ "name":"pmed-modern","kind":"program","target":"Epidemiology","taskCount":5,
#      "progress":80,"next":"…","priority":"P1" }]
```

JSON items carry `name, path, status, type, kind, target, taskCount, progress, next, priority` — enough for the
obs research board or any script to render manuscripts/programs without re-parsing `.STATUS`.

---

## Recipe 4 — Audit the settings contract (`doctor`)

**You want** to know which projects are missing `.STATUS` / `CLAUDE.md` / `.obs/sync.yml`.

```bash
atlas doctor                      # audit all real projects (excludes worktrees/tmp)
atlas doctor --kind manuscript    # restrict to manuscripts
atlas doctor --format json        # machine-readable summary + per-project rows
```

**Backfill** the missing `CLAUDE.md` files (preview first):

```bash
atlas doctor --fix                # preview what would be created
atlas doctor --fix --write        # actually create the stubs
```

**Notes.** `doctor` exits non-zero on a missing `.STATUS` — wire it into CI or a launchd job as a drift guard.
The contract itself lives in docs-standards (**ADR-001**).

---

## Recipe 5 — Retarget a manuscript's venue

**You want** to change a manuscript's venue but keep a note of the old one.

```yaml
target: CSDA # was JASA — retargeted 2026-06-25 (numerical-algorithm fit)
```

```bash
atlas sync --research      # re-parse; the board/list show venue = "CSDA"
```

The inline `# …` comment is stripped from the stored venue but stays in your `.STATUS` for the record.

---

## Recipe 6 — Track a monorepo's child repos

**You want** atlas to track the child repos inside an umbrella (e.g. `mcp-servers/*`), not just the umbrella.

```bash
touch ~/projects/dev-tools/mcp-servers/.atlas-scan-children
atlas sync
```

**Notes.** By default a project directory is a scan **leaf** (umbrella-only). The `.atlas-scan-children` marker
opts the umbrella in to having its children scanned too (bounded by `scanDepth`). See docs-standards **ADR-003**.

---

## Recipe 7 — Recover after a plain `atlas sync`

**Symptom.** After a routine `atlas sync` you see:

```
⚠️  4 research project(s) preserved but not refreshed by plain sync: collider, pmed-modern, …
   Run `atlas sync --from-status` to update kind/target/tasks.
```

**Do this.**

```bash
atlas sync --from-status --paths ~/projects/research
```

**Notes.** Plain sync never *strips* research metadata (fixed in 0.11.1) — it preserves it and reminds you to
refresh. This is the documented ownership contract (ADR-002), not an error.

---

## Recipe 8 — Render the vault research board (obs)

**You want** a live board in your Obsidian vault, generated from the atlas registry.

```bash
obs link                                  # stamp .obs/sync.yml (once per project)
obs research board --dry-run              # preview / drift check
obs research board --out Research/00_meta/_RESEARCH-BOARD.md
```

The board reads atlas via MCP/JSON, so keep the registry current with Recipe 2 first.

---

## Recipe 9 — Use the registry from Claude (MCP)

`atlas_get_projects` accepts a `kind` filter and returns the research fields:

```javascript
atlas_get_projects({ kind: 'program' })
// → pmed-modern  Kind: program  Venue: Epidemiology  Tasks: 5  Progress: 80%
```

See [MCP-SERVER.md](../../MCP-SERVER.md) for setup and the full tool list.

---

## Recipe 10 — Registry hygiene

**You want** to drop entries whose directories no longer exist.

```bash
atlas sync --remove-orphans          # remove projects no longer on disk
atlas doctor                         # confirm the count reflects real projects
```

**Notes.** If `--from-status` registered a project before any plain sync, the two used to create a duplicate;
that is fixed (plain sync resolves by path) — see CHANGELOG / issue #49.

---

## Recipe 11 — Start and end a work session

**You want** to track focused work time on a project.

```bash
atlas session start atlas               # start timer for atlas project
atlas session status                    # show current session state
atlas session end "refactored parsers"  # end with a completion note
```

**Notes.** Sessions are the foundation for streaks, analytics, and the dashboard. End-of-day: run `atlas session end` to close cleanly. If you forget, `atlas where` shows your last breadcrumb trail.

---

## Recipe 12 — Quick-capture ideas and tasks

**You want** to jot down an idea without breaking flow.

```bash
atlas catch "add dark mode to dashboard"            # quick capture
atlas catch "check medfit CRAN" --project=medfit    # capture to a specific project
atlas inbox                                          # list all pending captures
atlas triage                                         # process inbox
```

**Notes.** Captures are ADHD-friendly: write it down now, process later. The `inbox` command shows what's pending; `triage` walks through each item interactively.

---

## Recipe 13 — Context switching (park/unpark)

**You want** to switch tasks without losing where you were.

```bash
atlas park "switching to urgent bug fix"    # save current context
# ... do the urgent thing ...
atlas unpark                                 # restore saved context
atlas parked                                 # list all saved contexts
```

**Notes.** Park creates a breadcrumb with your context note. Unpark restores the most recent. Multiple parks stack — `parked` lists them all with timestamps.

---

## Recipe 14 — Manage tasks with due dates and priorities

**You want** to track actionable tasks with deadlines.

```bash
atlas task add "Review CRAN submission" --due=2026-07-10 --priority=P1
atlas task add "Write changelog entry"
atlas task list                          # all incomplete tasks
atlas task list --overdue                # past due
atlas task list --due-soon               # due within 3 days
atlas task list --completed              # done tasks
atlas task done 3                        # mark task #3 complete
atlas task rm 5                          # delete task #5
```

**Notes.** Tasks are chronological by default. Use `--project=X` to filter. Priority levels: P0 (critical), P1 (high), P2 (medium), P3 (low). Due dates support relative formats: `tomorrow`, `next-friday`, `+3d`.

---

## Recipe 15 — Merged agenda view

**You want** to see today's combined schedule from multiple sources.

```bash
atlas agenda                  # show today's merged agenda
atlas agenda 7                # show next 7 days
atlas agenda --format=json    # machine-readable output
```

**Notes.** Agenda merges scheduled records, tasks with due dates, and session history into a chronological view. Great for morning planning or end-of-day review.

---

## Recipe 16 — Morning ritual with `plan`

**You want** a guided daily planning routine.

```bash
atlas plan                    # interactive morning ritual
```

**Notes.** `plan` walks you through: review yesterday's sessions, check inbox, set today's focus, review overdue tasks, plan energy blocks. ADHD-friendly: short prompts, no decision paralysis.

---

## Recipe 17 — View analytics and patterns

**You want** to understand your work patterns over time.

```bash
atlas stats                       # quick overview
atlas stats --velocity            # 4-week rolling velocity
atlas stats --patterns            # 90-day flow patterns
atlas stats --calibrate           # Bayesian calibration analysis
atlas stats --export --format=md  # export as Markdown table
```

**Notes.** Velocity shows your output rate trend. Patterns reveal your best hours and typical session lengths. Calibration shows prediction accuracy — useful for estimating future work.

---

## Recipe 18 — Dashboard TUI navigation

**You want** to use the interactive terminal dashboard.

```bash
atlas dash                   # launch TUI dashboard
```

**Dashboard keys:**

| Key | View | Purpose |
|-----|------|---------|
| `f` | Focus | Deep-work timer (Pomodoro) |
| `T` | Timeline | Session history timeline |
| `z` | Zen | Minimal focus mode |
| `e` | Ecosystem | Cross-project overview |
| `p` | Plan | Morning ritual in dashboard |
| `a` | Analytics | Session analytics with heatmap |
| `Tab` | Layout | Cycle SINGLE → SPLIT → TRIPLE |
| `?` | Help | Keyboard shortcuts |

**Notes.** The dashboard uses your `~/.atlas/` data — no configuration needed. Analytics view shows heatmap, velocity, and pattern data with interactive controls.

---

## Recipe 19 — Export session data

**You want** to export session history for external use.

```bash
atlas session export                    # iCal format (default)
atlas session export --format=json      # JSON for scripting
atlas session export --project=atlas    # filter by project
```

**Notes.** iCal export works with Google Calendar, Apple Calendar, Outlook. JSON export is useful for custom visualizations or integrating with other tools.

---

## Recipe 20 — Sync from `.STATUS` files

**You want** to import research metadata from your existing `.STATUS` files.

```bash
atlas sync --from-status                         # import from default paths
atlas sync --from-status --paths ~/projects      # custom path
atlas sync --from-status --dry-run               # preview changes
```

**Notes.** `--from-status` (or its `--research` alias) is the authority for research metadata. Plain `atlas sync` preserves existing `kind`/`target`/`tasks` but does not re-parse them. See Recipe 2 for full research sync workflow.

---

## Recipe 21 — Set up shell completions

**You want** tab-completion for atlas commands in your shell.

```bash
# Zsh (recommended)
atlas completions zsh > ~/.config/zsh/completions/_atlas
# Ensure fpath includes the directory — add to ~/.zshrc:
# fpath=(~/.config/zsh/completions $fpath)
# autoload -Uz compinit && compinit

# Bash
atlas completions bash > ~/.bash_completion.d/atlas
# Source it: source ~/.bash_completion.d/atlas

# Fish
atlas completions fish > ~/.config/fish/completions/atlas.fish
```

**Notes.** Restart your shell after installing. Completions work for commands, subcommands, flags, and project names.

---

## Recipe 22 — Configure atlas (scan paths, preferences)

**You want** to customize what atlas tracks and how it behaves.

```bash
atlas config show                    # show all current settings
atlas config paths                   # show configured scan paths

# Add/remove scan paths
atlas config add-path ~/projects/research
atlas config remove-path ~/old-location

# Interactive wizard (walks through all settings)
atlas config setup

# ADHD preferences
atlas config prefs                   # show preferences
```

**Key preferences:**

| Setting | Default | Purpose |
|---------|---------|---------|
| `adhd.showStreak` | `true` | Show consecutive day streak |
| `adhd.celebrationLevel` | `medium` | Intensity of completion celebrations |
| `adhd.timeCues` | `true` | Gentle time awareness nudges |
| `session.defaultDuration` | `25` | Pomodoro length in minutes |
| `session.breakDuration` | `5` | Break length in minutes |

**Notes.** Config lives at `~/.atlas/config.json`. Edit directly if you prefer, but `atlas config setup` validates inputs.

---

## Recipe 23 — Create custom project templates

**You want** reusable scaffolding for new projects.

```bash
# List available templates
atlas template list

# See what a template contains
atlas template show node

# Export built-in template for customization
atlas template export node
# → creates ~/.atlas/templates/node.json — edit it

# Create a new template from scratch
atlas template create r-package
# → opens ~/.atlas/templates/r-package.json for editing

# Use a template
atlas init --template r-package --name my-new-package

# Delete a custom template
atlas template delete r-package
```

**Template structure:**

```json
{
  "id": "r-package",
  "name": "R Package",
  "description": "CRAN-ready R package scaffold",
  "files": {
    "DESCRIPTION": "Package: {{name}}\nVersion: 0.1.0",
    ".STATUS": "## Status: active\n## Progress: 0"
  },
  "commands": ["R CMD build .", "R CMD check --as-cran *.tar.gz"]
}
```

**Notes.** Custom templates live in `~/.atlas/templates/`. Use `{{name}}` as a placeholder for the project name.

---

## Recipe 24 — Migrate from filesystem to SQLite

**You want** faster queries on a large registry, or want to share data across tools.

```bash
# Preview what would move
atlas migrate --from filesystem --to sqlite --dry-run

# Run the migration
atlas migrate --from filesystem --to sqlite

# Switch your config to use sqlite
atlas config setup  # select storage: sqlite
```

**Notes.** Migration is non-destructive — your `~/.atlas/projects/` JSON files remain untouched. The SQLite database is created at `~/.atlas/atlas.db`. You can switch back with `atlas migrate --from sqlite --to filesystem`.

---

## Recipe 25 — Multi-project weekly review

**You want** a structured review of all your projects every week.

```bash
# 1. See everything at a glance
atlas project list

# 2. Check which projects need attention
atlas project list --status active
atlas doctor --kind manuscript    # research audit

# 3. Review your week's output
atlas stats week
atlas stats --velocity

# 4. Check overdue tasks
atlas task list --overdue
atlas task list --due-soon

# 5. Review captured ideas
atlas inbox --stats
atlas inbox --triage              # process if time allows

# 6. Set next week's focus
atlas plan
```

**Notes.** Do this Friday afternoon or Monday morning. The `atlas plan` command guides you through the whole ritual interactively.

---

## Recipe 26 — Export and analyze session data

**You want** to visualize or analyze your work patterns outside atlas.

```bash
# Export to iCal (for calendar visualization)
atlas session export sessions.ics
# Import into Google Calendar, Apple Calendar, or Outlook

# Export to JSON (for custom analysis)
atlas session export --format json > sessions.json

# Filter by project
atlas session export --project atlas atlas-sessions.ics

# Quick stats on the command line
atlas stats week                  # this week
atlas stats month                 # this month
atlas stats 90                    # last 90 days

# Pattern analysis
atlas stats --patterns            # 90-day flow patterns
atlas stats --calibrate           # prediction accuracy
```

**JSON export structure:**

```json
[
  {
    "project": "atlas",
    "startedAt": "2026-07-10T09:15:00Z",
    "endedAt": "2026-07-10T11:45:00Z",
    "duration": 150,
    "note": "refactored parsers"
  }
]
```

**Notes.** The iCal export creates standard `.ics` files that work with any calendar app. Great for seeing focus blocks alongside meetings.

---

## Recipe 27 — Set up automated research pipeline

**You want** weekly refresh of research metadata + board render, fully automated.

```bash
# The pipeline script
cat > ~/scripts/sync-research-board.sh << 'EOF'
#!/bin/bash
atlas sync --research 2>&1 | tee -a ~/.atlas/research-board.log
obs research board --out ~/vault/Research/00_meta/_RESEARCH-BOARD.md
EOF
chmod +x ~/scripts/sync-research-board.sh

# Create launchd job
cat > ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.data-wise.atlas-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/dt/scripts/sync-research-board.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key><integer>1</integer>
        <key>Hour</key><integer>9</integer>
        <key>Minute</key><integer>15</integer>
    </dict>
</dict>
</plist>
EOF

# Load the job
launchctl load ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist

# Verify
launchctl list | grep atlas
```

**Logs:**
```bash
cat ~/.atlas/research-board.log       # successful runs
cat ~/.atlas/research-board.err.log   # errors
```

**Notes.** Schedule timing matters: run after any upstream data producers (e.g., `pmed-extensions-weekly-advance`) and before consumers (e.g., `research-action-board-weekly`).

---

## Recipe 28 — Use Atlas MCP server with Claude

**You want** Claude to read your atlas data for context-aware assistance.

```bash
# MCP server is built-in — start it with:
atlas mcp

# In Claude Desktop config (~/Library/Application Support/Claude/claude_desktop_config.json):
{
  "mcpServers": {
    "atlas": {
      "command": "atlas",
      "args": ["mcp"]
    }
  }
}
```

**Available tools in Claude:**

| Tool | Purpose |
|------|---------|
| `atlas_get_context` | Current project context, sessions, streaks |
| `atlas_get_projects` | List/filter projects (supports `kind` filter) |
| `atlas_start_session` | Start a session from Claude |
| `atlas_capture` | Quick-capture an idea |
| `atlas_get_inbox` | Show pending captures |

**Example conversation:**
```
You: What was I working on last?
Claude: [uses atlas_get_context] You were working on atlas — refactoring parsers.
        Your last breadcrumb was "stuck on OAuth callback". 3-day streak active.
```

**Notes.** Claude needs the MCP server running to access atlas data. The server reads from `~/.atlas/` — no additional config needed.
