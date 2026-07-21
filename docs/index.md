<div class="hero" markdown>

# :rocket: Atlas
**Project State Engine for ADHD-Friendly Workflow**

<p class="atlas-mantra">You never lose the thread.</p>

Atlas tracks your projects, sessions, and context between the moment an idea lands and
the moment you actually ship it. Built for brains that don't work in straight lines.

[![Tests](https://github.com/Data-Wise/atlas/actions/workflows/test.yml/badge.svg)](https://github.com/Data-Wise/atlas/actions/workflows/test.yml)
[![GitHub release](https://img.shields.io/github/v/release/Data-Wise/atlas)](https://github.com/Data-Wise/atlas/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

```bash
brew tap data-wise/tap && brew install atlas   # 1. install
atlas init                                     # 2. set up ~/.atlas
atlas session start myproject                  # 3. start working
```

</div>

## :repeat: The Loop

Atlas isn't a todo list. It's three habits that repeat, all day, every day — the same
loop the [ADHD Guide](user-guide/adhd-guide/index.md) is built around.

<div class="atlas-loop" markdown>

<div class="atlas-loop__step" data-step="1" markdown>
**Catch**

`atlas catch "idea"`

Never lose a thought mid-flow.
</div>

<div class="atlas-loop__arrow">→</div>

<div class="atlas-loop__step" data-step="2" markdown>
**Session**

`atlas session start/end`

Work happens inside boundaries.
</div>

<div class="atlas-loop__arrow">→</div>

<div class="atlas-loop__step" data-step="3" markdown>
**Plan**

`atlas plan`

Close today so tomorrow starts clean.
</div>

<div class="atlas-loop__arrow">↻</div>

</div>

!!! tip "That's it"
    Run `atlas catch "an idea"` any time to capture without breaking flow, and
    `atlas session end` when you're done. The loop repeats itself.

## :compass: Find your way

Four doors in, colored the same as the sidebar and the nav pills above — pick the one
that matches what you're trying to do right now.

<div class="feature-grid" markdown>

<div class="feature-card" data-section="do" markdown>
### :material-rocket-launch: Do

Install, configure, and run the 15-minute tutorial.

[:octicons-arrow-right-24: Get Started](getting-started/installation.md)
</div>

<div class="feature-card" data-section="learn" markdown>
### :material-head-heart-outline: Learn

Streaks, time-blindness cues, and "good enough" endings — the product's core design.

[:octicons-arrow-right-24: ADHD Guide](user-guide/adhd-guide/index.md)
</div>

<div class="feature-card" data-section="build" markdown>
### :material-sitemap: Build

Clean Architecture layers, data flow, and system diagrams.

[:octicons-arrow-right-24: Architecture](ARCHITECTURE.md)
</div>

<div class="feature-card" data-section="code" markdown>
### :material-book-open-variant: Code

Every command — Core 5 first, power and legacy tiers collapsed.

[:octicons-arrow-right-24: CLI Reference](CLI-REFERENCE.md)
</div>

</div>

<p class="atlas-more-links" markdown>
Also: [Integrations](INTEGRATIONS.md) (MCP server, flow-cli contract) ·
[SwiftBar](user-guide/swiftbar.md) (menu-bar digest) ·
[Demos](DEMOS.md) (terminal recordings)
</p>

## :heart: Why Atlas (ADHD-first)

<div class="chip-row" markdown>

- :material-fire:{ .chip-icon } **Streak Tracking** — visual motivation through consecutive-day tracking
- :material-clock-alert-outline:{ .chip-icon } **Time Blindness Helper** — gentle time cues without breaking flow
- :material-party-popper:{ .chip-icon } **Celebration Helper** — positive reinforcement on real progress
- :material-history:{ .chip-icon } **Context Restoration** — "Last time you were…" on session start
- :material-check-decagram-outline:{ .chip-icon } **Anti-Perfectionism** — "Good enough" session endings that actually ship
</div>

??? note "See it in action (demo GIF)"
    ![Getting Started Demo](demos/getting-started.gif)

    [:material-play-circle: View all demos](DEMOS.md){ .md-button }

??? note "All install methods (Homebrew / curl / npm / source)"

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

## :link: Links

- [GitHub Repository](https://github.com/Data-Wise/atlas)
- [Issue Tracker](https://github.com/Data-Wise/atlas/issues)
- [Changelog](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md)

---

**Now what?** → [Get Started: Installation](getting-started/installation.md)
