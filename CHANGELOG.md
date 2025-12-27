# Changelog

All notable changes to Atlas are documented here.

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
