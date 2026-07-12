# Atlas Cheatsheet

> Print this. Keep it next to your keyboard.

---

## The 6 Daily Commands

```bash
atlas plan              # Morning planning
atlas session start     # Start working
atlas catch "idea"      # Capture thought
atlas where             # Where was I?
atlas stats             # How am I doing?
atlas session end       # Done for now
```

---

## Command Groups

### Sessions

| Command | What it does | Example |
|---------|-------------|---------|
| `session start` | Begin work | `atlas session start myproject` |
| `session end` | End with celebration | `atlas session end "fixed bug"` |
| `session status` | Check current | `atlas session status` |
| `session export` | Export to calendar | `atlas session export sessions.ics` |

### Quick Capture

| Command | What it does | Example |
|---------|-------------|---------|
| `catch` | Capture idea | `atlas catch "try redis cache"` |
| `inbox` | View items | `atlas inbox` |
| `inbox --stats` | Count pending | `atlas inbox --stats` |
| `inbox --triage` | Process inbox | `atlas inbox --triage` |

### Context

| Command | What it does | Example |
|---------|-------------|---------|
| `where` | Show context | `atlas where` |
| `crumb` | Leave breadcrumb | `atlas crumb "stuck on auth"` |
| `trail` | Show crumbs | `atlas trail --days 7` |

### Context Switching

| Command | What it does | Example |
|---------|-------------|---------|
| `park` | Save context | `atlas park "urgent thing"` |
| `parked` | List saved | `atlas parked` |
| `unpark` | Restore | `atlas unpark` |

### Tasks

| Command | What it does | Example |
|---------|-------------|---------|
| `task add` | Add task | `atlas task add "Write docs" --priority=P1 --due=friday` |
| `task list` | List tasks | `atlas task list --overdue` |
| `task done` | Complete task | `atlas task done <id>` |
| `task rm` | Delete task | `atlas task rm <id>` |
| `agenda` | Merged view | `atlas agenda 14 --format json` |
| `schedule push` | Push records | `atlas schedule push --data '<json>'` |

### Projects

| Command | What it does | Example |
|---------|-------------|---------|
| `project add` | Register | `atlas project add ~/myapp` |
| `project list` | List all | `atlas project list` |
| `project list --kind` | By type | `atlas project list --kind program` |
| `focus` | Set focus | `atlas focus myproject "implement auth"` |
| `sync` | Sync registry | `atlas sync` |
| `sync --research` | Sync research | `atlas sync --research` |
| `doctor` | Audit contract | `atlas doctor` |

### Analytics

| Command | What it does | Example |
|---------|-------------|---------|
| `stats` | Quick overview | `atlas stats` |
| `stats week` | This week | `atlas stats week` |
| `stats month` | This month | `atlas stats month` |
| `stats --velocity` | 4-week velocity | `atlas stats --velocity` |
| `stats --patterns` | Best day/hour | `atlas stats --patterns` |
| `stats --calibrate` | Time calibration | `atlas stats --calibrate myapp --minutes 30` |

### Setup & Config

| Command | What it does | Example |
|---------|-------------|---------|
| `init` | Initialize project | `atlas init --template node --name myapp` |
| `config show` | Show settings | `atlas config show` |
| `config setup` | Interactive wizard | `atlas config setup` |
| `config add-path` | Add scan path | `atlas config add-path ~/projects` |
| `template list` | List templates | `atlas template list` |
| `completions` | Shell completions | `atlas completions zsh > ~/.config/zsh/completions/_atlas` |
| `migrate` | Switch storage | `atlas migrate --from filesystem --to sqlite` |

---

## Dashboard Keyboard Shortcuts

Start: `atlas dash`

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate up/down |
| `Enter` | Select project |
| `a` | **Analytics view** (v0.13.0) |
| `f` | Focus mode (Pomodoro) |
| `z` | Zen mode |
| `T` | Timeline view |
| `e` | Ecosystem view |
| `p` | Plan view |
| `c` | Quick capture |
| `t` | Cycle theme |
| `Tab` | Cycle layout (SINGLE/SPLIT/TRIPLE) |
| `Shift+Tab` | Cycle panel focus |
| `Space` | Pause/resume Pomodoro |
| `r` | Reset timer |
| `?` | Show help |
| `q` | Quit |

### AnalyticsView (v0.13.0)

| Key | Action |
|-----|--------|
| `←` / `→` | Cycle projects |
| `f` | Jump to Focus view |
| `Enter` | Jump to Detail view |
| `Esc` | Back to Browse |

---

## Flags You'll Use

| Flag | What it does |
|------|-------------|
| `--format json` | Machine-readable output |
| `--project NAME` | Filter by project |
| `--days N` | Time range |
| `--dry-run` | Preview without changes |
| `--storage sqlite` | Use SQLite backend |

---

## flow-cli Integration

| Command | Output |
|---------|--------|
| `session status --format json` | `{project,durationMinutes,state,task,startedAt}` or `null` |
| `project list --count` | bare integer |
| `project list --suggest` | one project name |
| `inbox --count` | bare integer |
| `trail --limit N` | newest-N breadcrumbs |

---

## File Locations

| What | Where |
|------|-------|
| Config | `~/.atlas/config.json` |
| Projects | `~/.atlas/projects/` |
| Sessions | `~/.atlas/sessions/` |
| Captures | `~/.atlas/captures/` |
| Breadcrumbs | `~/.atlas/breadcrumbs/` |
| Tasks | `~/.atlas/tasks.json` (filesystem) or `atlas.db` (SQLite) |
| Templates | `~/.atlas/templates/` |

---

<div style="text-align: center; margin-top: 2em; color: #666;">
<em>Atlas v0.13.1 | Made for ADHD brains</em>
</div>
