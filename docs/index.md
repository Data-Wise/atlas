<div class="hero" markdown>

# :rocket: Atlas
**Project State Engine for ADHD-Friendly Workflow**

[![Tests](https://github.com/Data-Wise/atlas/actions/workflows/test.yml/badge.svg)](https://github.com/Data-Wise/atlas/actions/workflows/test.yml)
[![GitHub release](https://img.shields.io/github/v/release/Data-Wise/atlas)](https://github.com/Data-Wise/atlas/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Atlas tracks your projects, sessions, and context — so you never lose the thread. Streaks, gentle time cues, and "good enough" endings, built in.

</div>

## :zap: Start in 3 commands

```bash
brew tap data-wise/tap && brew install atlas   # 1. install
atlas init                                     # 2. set up ~/.atlas
atlas session start myproject                  # 3. start working
```

!!! tip "That's it"
    Atlas is now tracking your session. Run `atlas catch "an idea"` any time to capture
    without breaking flow, and `atlas session end` when you're done.

<div class="grid cards" markdown>

-   :material-rocket-launch:{ .lg .middle } **Get Started**

    ---

    Install, configure, and run the 15-minute tutorial.

    [:octicons-arrow-right-24: Get Started](getting-started/installation.md)

-   :material-head-heart-outline:{ .lg .middle } **ADHD Guide**

    ---

    Streaks, time-blindness cues, and "good enough" endings — the product's core design.

    [:octicons-arrow-right-24: ADHD Guide](user-guide/adhd-guide/index.md)

-   :material-book-open-variant:{ .lg .middle } **CLI Reference**

    ---

    Every command — Core 5 first, power and legacy tiers collapsed.

    [:octicons-arrow-right-24: CLI Reference](CLI-REFERENCE.md)

-   :material-sitemap:{ .lg .middle } **Architecture**

    ---

    Clean Architecture layers, data flow, and system diagrams.

    [:octicons-arrow-right-24: Architecture](ARCHITECTURE.md)

-   :material-link-variant:{ .lg .middle } **Integrations**

    ---

    MCP server, flow-cli contract, and ecosystem hooks.

    [:octicons-arrow-right-24: Integrations](INTEGRATIONS.md)

-   :material-apple-keyboard-command:{ .lg .middle } **SwiftBar**

    ---

    Menu-bar digest — no dashboard required.

    [:octicons-arrow-right-24: SwiftBar](user-guide/swiftbar.md)

</div>

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
