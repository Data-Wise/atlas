# Changelog

All notable changes to Atlas are documented here.

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
