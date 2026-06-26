# Changelog

All notable changes to Atlas are documented here.

## [Unreleased]

### Added
- **Research registry** — `sync --from-status` now parses research `.STATUS` metadata so manuscripts and programs appear in the registry alongside packages:
  - `kind:` (`manuscript` | `program`), `target:`/`venue:` (publication venue), and a `tasks:` block (`- text: ...; priority: ...; done: ...`) capturing a program's proposals as task entries.
  - `StatusFileParser.summarize()` groups projects `byKind`.
  - `atlas project list --kind <manuscript|program|package>` filter.
  - `kind` / `target` / `taskCount` exposed in `project list --format json` and MCP `atlas_get_projects` (consumed by the obs research board).
  - New parser / sync / formatter tests; full unit suite green (1470).
- **`atlas doctor`** — read-only audit of the Project Settings Contract (`.STATUS`, `CLAUDE.md`, `.obs/sync.yml`) with `--kind`, `--all-registered`, and `--fix`/`--write` (creates missing `CLAUDE.md`). Excludes worktrees/tmp by default; exits 1 on missing `.STATUS` (CI/launchd drift guard).
- **`project list --json`** now also returns `progress`, `next`, and `priority` (research-board fidelity).
- **Docs** — [Research Registry guide](docs/RESEARCH-REGISTRY.md), [Research Registry & Doctor tutorial](docs/tutorials/research-registry.md), gap analysis, and Phase-3 roadmap.

### Fixed
- **Registry-load robustness** — a single stored project whose `description` exceeded the 500-char limit threw inside `FileSystemProjectRepository.findAll()`, cascading "Failed to load projects" to every sync target (one corrupt row bricked the whole registry). `_deserializeProject` now truncates `description` on read; `SyncRegistryUseCase` truncates the next-action-derived description on write (parity with `metadata.notes`). Regression test added.
- **Store-isolation env var** — the CLI now honors `ATLAS_DATA_DIR` (documented in `docs/CONFIGURATION.md` and already honored by the MCP entry point) as a fallback after `ATLAS_CONFIG`, so the documented data-dir override actually works for `bin/atlas.js`. Previously the CLI silently ignored it and wrote to `~/.atlas`, which let `test/dogfood-interactive-v2.sh` (which set only `ATLAS_DATA_DIR`) leak its `mktemp` fixtures into the real registry; that script now also exports `ATLAS_CONFIG`. New `Config` env-precedence tests (`ATLAS_CONFIG` > `ATLAS_DATA_DIR` > `~/.atlas`).

## [0.10.0] - 2026-06-19

### Added
- **VelocityCalculator** — 4-week rolling velocity analytics over existing session history
  - ISO-week bucketing: sessions/week, focus hours, consistency score
  - Trend detection: compares mean(weeks 1-2) vs mean(weeks 3-4), ±10% threshold → ↑/↓/→
  - Sparkline output using block characters `▁▂▃▄▅▆▇█`
  - `atlas stats --velocity`
- **PatternAnalyzer** — 90-day productivity pattern detection
  - Best day and best hour by flow rate (sessions where `getDuration() >= 15min`)
  - Dead zones: hour/day slots with 0 flow rate and ≥3 sessions observed
  - `atlas stats --patterns`
- **PredictionEngine** — Bayesian per-project time calibration
  - Filters completed sessions for a project, removes outliers via MAD-based robust Z-score
  - Ratio fallback when MAD = 0 (all durations identical); priorWeight = 3 toward 1.0
  - Confidence tiers: low (<5 sessions), medium (5-9), high (≥10)
  - `atlas stats --calibrate <project> --minutes <n>`
- 31 new unit tests across 3 test files

## [0.9.3] - 2026-06-14

### Added
- **flow-cli integration flags** — CLI flags that flow-cli already calls, now honored by atlas:
  - `atlas session status --format <table|json>` — JSON emits `{project, durationMinutes, state, task, startedAt}` (or `null` when no active session); fixes flow-cli's silent conflict-detection on project switch
  - `atlas project list --count` — bare integer count of matching projects
  - `atlas project list --suggest` — the most-recently-touched active project name
  - `atlas inbox --count` — bare integer pending inbox count
  - `atlas trail --limit <n>` — cap breadcrumbs to the N most recent
- `ProjectsAPI.suggest()` and a `limit` parameter on `context.trail()`
- `docs/INTEGRATIONS.md` — live flow-cli ↔ atlas integration (contract surface + architecture diagram)
- Strict docs CI (`mkdocs build --strict` validate job, runs on PRs)

### Fixed
- `atlas project list --status <s>` now resolves status from project metadata — previously matched zero scanned projects, silently breaking flow-cli's contracted `project list --status=active --format=names`

## [0.7.0] - 2025-12-29

### Added
- **Session Export** (`atlas session export`):
  - Export sessions to iCal/ICS format for calendar apps
  - Compatible with Apple Calendar, Google Calendar, Outlook
  - Filter by days, project, or period (week/month/year/all)
  - JSON export option for data analysis
  - Examples:
    ```bash
    atlas session export sessions.ics        # Export to iCal
    atlas session export --days 60           # Last 60 days
    atlas session export --project myproject # Filter by project
    atlas session export --format json       # JSON output
    ```

- **Task-Based Focus** (Dashboard):
  - "What will you focus on?" prompt before starting Pomodoro
  - Task displayed prominently during focus timer
  - Completion tracking after timer ends:
    - `c` - Completed
    - `p` - Partial progress
    - `n` - Pivoted to something else
  - Outcomes stored in session history

- **Timeline View** (Dashboard):
  - Press `T` (Shift+T) to enter timeline view
  - Visual timeline of today's sessions
  - Color-coded time blocks by project
  - Shows gaps and total work time
  - Helps with time blindness awareness

### Changed
- Dashboard state machine now supports TIMELINE state
- Focus mode integrates task prompts and outcome tracking
- Updated help dialog with new keybindings

### Documentation
- Updated CLI-REFERENCE.md with session export command
- Updated REFCARD.md with v0.7.0 features
- Updated TUTORIAL.md with focus mode and export sections
- Updated WORKFLOWS.md with new workflow diagrams
- Updated index.md with v0.7.0 feature cards

### Tests
- 1,192 tests passing (+26 new for ExportSessionsUseCase)

## [0.6.3] - 2025-12-29

### Added
- **Stats Export** (`atlas stats --export`):
  - Export analytics to markdown or JSON files
  - Auto-generate filename with date: `atlas-stats-YYYY-MM-DD.md`
  - Markdown format with full report: `--format md`
  - Examples:
    ```bash
    atlas stats --export                    # Auto-named markdown
    atlas stats --export weekly.md          # Custom filename
    atlas stats --format json --export      # JSON export
    ```
- **CLI Documentation**: Updated CLI-REFERENCE.md with export examples

### Tests
- 1,166 tests passing (+10 new for markdown export)

## [0.6.2] - 2025-12-28

### Added
- **Demo GIFs CI Workflow** (`.github/workflows/demos.yml`):
  - Validates VHS tape file syntax
  - Generates GIFs on macOS runner
  - Optimizes with gifsicle (~30% smaller)
  - Posts PR comment with file sizes table
  - Auto-commits regenerated GIFs on main
- **Demo Section in README**: Embedded getting-started GIF with link to all demos
- **Demos Documentation Page**: `docs/DEMOS.md` with all 5 embedded terminal demos
- **Reusable Prompts**: `docs/prompts/DEMO-WORKFLOWS.md` for demo creation workflow

### Fixed
- **GitGateway Detached HEAD**: Handle CI environments where `git branch --show-current` returns empty
  - Falls back to `HEAD@<sha>` format
  - Fixes flaky test in GitHub Actions PR checkouts

## [0.6.1] - 2025-12-28

### Fixed
- **Friendly Error Messages**: Session commands now show user-friendly messages instead of stack traces
  - `atlas session start` when session already active: "⚠️ Session already active. End it first with: atlas session end"
  - `atlas session end` when no active session: "ℹ️ No active session to end"
- **VHS Demo Tapes**: Fixed tape files to use correct syntax (removed typed comments that caused zsh errors)

### Changed
- Terminal demo GIFs optimized with gifsicle (~30% smaller)

## [0.6.0] - 2025-12-28

### Added
- **Session Analytics** (`atlas stats`):
  - Weekly/monthly productivity summaries
  - Total sessions, time, and daily averages
  - Flow state percentage (sessions ≥15 min)
  - Completion rate tracking
  - Current and longest streak display
  - Best day highlight
  - Hourly distribution sparkline
  - Per-project breakdown
  - Multiple output formats: `--format table|json|text`
  - Project filtering: `--project <name>`
  - Custom periods: `--days <n>`, `week`, `month`
- **Documentation Website**:
  - MkDocs Material theme with dark/light mode
  - Live site: https://data-wise.github.io/atlas/
  - Auto-deploy via GitHub Actions on docs changes
  - Feature grid homepage, installation guide
  - Navigation tabs for all documentation
  - Mermaid diagram support

### Changed
- **Performance Improvements** (Plan B):
  - Virtual scrolling for 50+ projects in dashboard
  - Card pooling with object reuse pattern
  - Debounced rendering at 60fps target
- **State Management** (Plan C):
  - Centralized ViewStateManager with subscription pattern
  - Single source of truth for dashboard state
  - Simplified view updates

### Fixed
- CARD_HEIGHT constant duplication in MainView.js
- Dialog cleanup on screen destroy
- Helpers.js re-export indirection removed

### Tests
- 1,156 tests passing (up from 1,023)
- 50 new stats-related tests (use case + presenter)
- 9 new E2E tests for stats command

## [0.5.4] - 2025-12-26

### Changed
- **Release Sync**: Aligned tagged release with latest documentation improvements
- Homebrew formula updated to v0.5.4

### Notes
- This release ensures Homebrew users get all documentation and workflow enhancements from v0.5.3

## [0.5.3] - 2025-12-26

### Added
- **Comprehensive Documentation**:
  - `docs/CLI-REFERENCE.md` - Complete CLI command reference
  - `docs/ARCHITECTURE.md` - Clean Architecture overview with Mermaid diagrams
  - `docs/API-GUIDE.md` - Programmatic API usage guide
  - `docs/CONFIGURATION.md` - All settings and preferences
  - `docs/TUTORIAL.md` - Step-by-step getting started guide (15 min)
  - `docs/DIAGRAMS.md` - 10 Mermaid architecture diagrams
  - `CLAUDE.md` - Project intelligence file for Claude Code
- **Installation Options**:
  - `install.sh` - Curl-based installer script
  - Homebrew formula updated in Data-Wise/homebrew-tap
  - Installation docs updated (Homebrew, curl, source)
- **Tutorial Enhancements**:
  - Zellij terminal multiplexer integration guide
  - ADHD-friendly workflow patterns
  - Keybindings cheatsheet

### Fixed
- Tutorial: Corrected `atlas catch` syntax (use `-p` flag for project)
- Tutorial: Clarified `.STATUS` file requirement for status updates

## [0.5.2] - 2025-12-26

### Added
- **Template Variables from Config**: Custom variables in `preferences.templateVariables`
  - Variables replaced as `{{variable_name}}` in templates
  - Priority: defaults < config < CLI values
  - Common vars: `author`, `github_user`, `email`, `company`
- **Template Inheritance**: Extend built-in templates
  - Create with `atlas template create my-node --extends node`
  - Use `{{parent}}` to include parent template content
  - Frontmatter: `extends: node`

## [0.5.1] - 2025-12-26

### Added
- **Park Feature** (ADHD-friendly context switching):
  - `atlas park [note]` - Save session state with breadcrumbs
  - `atlas unpark [id]` - Restore parked context and start session
  - `atlas parked` - List all parked contexts
  - Captures: project, task, duration, breadcrumbs, note
  - Shows "where you left off" on restore
- **Template Management CLI**:
  - `atlas template list` - Show built-in + custom templates
  - `atlas template show <id>` - Display template content
  - `atlas template create <id>` - Create custom template
  - `atlas template export <id>` - Export built-in for editing
  - `atlas template delete <id>` - Remove custom template
  - `atlas template dir` - Show templates directory
- **Custom Templates**: Store in `~/.atlas/templates/`
  - YAML frontmatter for name/description
  - Override built-in templates
- **Comprehensive Tests**: 958 tests (unit + e2e)

### Changed
- Capture entity now supports `parked` type and status

## [0.5.0] - 2025-12-26

### Added
- **Project Templates**: `atlas init --template <type>` with 6 templates
  - `node` - Node.js/npm package
  - `r-package` - R package with roxygen2/testthat
  - `python` - Python package with pytest
  - `quarto` - Quarto manuscript/presentation
  - `research` - Academic research project
  - `minimal` - Bare minimum .STATUS file
- **Configuration Wizard**: `atlas config setup` for interactive configuration
- **Preferences System**: Dot-notation access for nested preferences
  - `atlas config prefs show/get/set/reset/defaults`
  - ADHD preferences (streak, time cues, celebrations)
  - Session preferences (pomodoro length, breaks)
  - Dashboard preferences (refresh rate, zen mode)
- **Non-interactive Dogfood Test**: 45 automated CLI tests
- **GitHub Actions**: CI runs on dev and main branches

### Changed
- Configuration now uses deep merge for nested preferences
- Config respects `ATLAS_CONFIG` environment variable

## [0.4.1] - 2025-12-26

### Added
- **ADHD-Friendly Utilities** (5 new helpers):
  - `StreakCalculator` - Consecutive day tracking with emoji display
  - `TimeBlindnessHelper` - Gentle time awareness without breaking flow
  - `SessionCompletionHelper` - "Good enough" endings, anti-perfectionism
  - `ContextRestorationHelper` - "Last time you were..." messages
  - `CelebrationHelper` - Positive reinforcement, milestone recognition
- Dashboard integration: streak display, time cues, celebrations
- CLI integration: context restoration on start, celebration on end

## [0.4.0] - 2025-12-25

### Added
- **Card Stack Layout**: Replaced table view with visual project cards
- **Enhanced Cards**: Progress bars, next actions, contextual information
- **Zen Mode**: Minimal distraction mode (`z` key)
- **Contextual Command Bar**: Shows available actions based on state
- **State Machine**: Reliable view transitions in dashboard
- **Timer Manager**: Centralized Pomodoro handling

### Changed
- Dashboard UI completely redesigned
- Improved terminal size handling

## [0.3.1] - 2025-12-25

### Added
- **Theme Cycling**: Press `t` to cycle through themes
- **Time-aware Suggestions**: Decision helper adapts to time of day
- **Pomodoro Stats**: Shows today's completed sessions
- **Break Enforcement**: Modal dialog after Pomodoro completes

## [0.3.0] - 2025-12-25

### Added
- **Focus Mode**: Minimal UI with Pomodoro timer (`f` key)
- **Decision Helper**: "What should I work on?" suggestions (`d` key)
- **Break Reminders**: Notifications after work periods
- **Terminal Adaptive**: Adjusts to size, warns if too small

## [0.2.0] - 2025-12-25

### Added
- **Dashboard TUI**: Interactive terminal dashboard (`atlas dashboard`)
- **Focus Indicator**: Active session highlighting
- **Quick Filters**: Filter by status with `a/p/s/*`
- **Search**: Fuzzy search with `/`
- **Inline Capture**: Quick capture without leaving dashboard
- **Session Gauge**: Visual progress toward daily goal
- **Sparkline**: Weekly activity graph

## [0.1.0] - 2025-12-25

### Added
- Initial release
- **Clean Architecture**: Domain-driven design
- **Project Registry**: Track projects with metadata
- **Session Management**: Work sessions with duration tracking
- **Quick Capture**: Ideas, tasks, bugs with triage workflow
- **Breadcrumb Trail**: Context markers for "where was I?"
- **Status Management**: .STATUS file integration
- **Storage Backends**: Filesystem (JSON) and SQLite
- **Shell Completions**: zsh, bash, fish
- **Sync Command**: Import from .STATUS files
- **Migration Tool**: Switch between storage backends
