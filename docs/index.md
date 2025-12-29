# Atlas

<div class="hero" markdown>
# :rocket: Atlas
**Project State Engine for ADHD-Friendly Workflow**

[![Tests](https://github.com/Data-Wise/atlas/actions/workflows/test.yml/badge.svg)](https://github.com/Data-Wise/atlas/actions/workflows/test.yml)
[![GitHub release](https://img.shields.io/github/v/release/Data-Wise/atlas)](https://github.com/Data-Wise/atlas/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
</div>

---

Atlas is a project state management engine that helps developers track projects, sessions, and context. Designed with ADHD-friendly features like streak tracking, gentle time awareness, and celebration helpers.

## :sparkles: Features

<div class="feature-grid" markdown>

<div class="feature-card" markdown>
### :file_folder: Project Registry
Track all your projects with status, tags, and metadata. Sync from `.STATUS` files or register manually.
</div>

<div class="feature-card" markdown>
### :clock3: Session Tracking
Start work sessions, track duration, and get flow state insights. Context restoration on session start.
</div>

<div class="feature-card" markdown>
### :bulb: Quick Capture
Capture ideas, tasks, and bugs without breaking flow. Triage inbox when ready.
</div>

<div class="feature-card" markdown>
### :footprints: Breadcrumb Trail
Leave context markers for "where was I?" moments. Never lose your place again.
</div>

<div class="feature-card" markdown>
### :chart_with_upwards_trend: Session Analytics
Track productivity with `atlas stats`. Weekly/monthly summaries, streaks, and flow metrics.
</div>

<div class="feature-card" markdown>
### :tomato: Task-Based Focus
Pomodoro timer with task prompts. Set what you'll focus on, track completion outcomes.
</div>

<div class="feature-card" markdown>
### :calendar: Calendar Export
Export sessions to iCal/ICS format. Import your work history into any calendar app.
</div>

<div class="feature-card" markdown>
### :brain: ADHD-Friendly
Streak tracking, time blindness helpers, celebrations, and anti-perfectionism features.
</div>

</div>

## :zap: Quick Start

=== "Homebrew"

    ```bash
    brew tap data-wise/tap
    brew install atlas
    ```

=== "curl"

    ```bash
    curl -fsSL https://raw.githubusercontent.com/Data-Wise/atlas/main/install.sh | bash
    ```

=== "npm"

    ```bash
    npm install -g @data-wise/atlas
    ```

=== "From Source"

    ```bash
    git clone https://github.com/Data-Wise/atlas.git
    cd atlas && npm install && npm link
    ```

## :movie_camera: See It In Action

![Getting Started Demo](demos/getting-started.gif)

[:material-play-circle: View all demos](DEMOS.md){ .md-button }

## :computer: Basic Usage

```bash
# Initialize atlas
atlas init

# Start a work session
atlas session start myproject

# Quick capture an idea
atlas catch "check VanderWeele 2015 appendix"

# Show context
atlas where

# View analytics
atlas stats

# End session with celebration
atlas session end "Completed initial implementation"

# Launch dashboard
atlas dash
```

## :books: Documentation

| Guide | Description |
|-------|-------------|
| [Tutorial](TUTORIAL.md) | Step-by-step introduction (15 min) |
| [Quick Reference](REFCARD.md) | Printable command cheat sheet |
| [Workflows](WORKFLOWS.md) | ADHD-friendly workflow patterns |
| [CLI Reference](CLI-REFERENCE.md) | Complete command documentation |
| [Configuration](CONFIGURATION.md) | All settings and preferences |
| [Architecture](ARCHITECTURE.md) | System design and patterns |
| [API Guide](API-GUIDE.md) | Using Atlas as a library |

## :sparkles: What's New in v0.7.0

!!! success "Task-Based Focus"
    Enhanced Pomodoro with task tracking:

    - Dashboard prompts "What will you focus on?" before timer
    - Task displayed during focus session
    - After timer: `c` (completed), `p` (partial), `n` (pivoted)

!!! tip "Calendar Export"
    Export sessions to iCal for any calendar app:

    ```bash
    atlas session export sessions.ics    # Export to iCal
    atlas session export --days 60       # Last 60 days
    atlas session export --format json   # JSON format
    ```

!!! info "Timeline View"
    Press `T` in dashboard to see today's sessions on a timeline. Visualize your work patterns with color-coded time blocks.

??? note "Previous: v0.6.x"
    - **v0.6.3**: Stats export (`--export`, `--format md`)
    - **v0.6.0**: Session analytics with `atlas stats`

## :heart: ADHD-Friendly Design

Atlas is designed with ADHD in mind:

- **Streak Tracking**: Visual motivation with consecutive day tracking
- **Time Blindness Helper**: Gentle time cues without breaking flow
- **Celebration Helper**: Positive reinforcement on achievements
- **Context Restoration**: "Last time you were..." on session start
- **Anti-Perfectionism**: "Good enough" session endings
- **Quick Capture**: Don't lose thoughts - capture instantly

## :link: Links

- [GitHub Repository](https://github.com/Data-Wise/atlas)
- [Issue Tracker](https://github.com/Data-Wise/atlas/issues)
- [Changelog](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md)
