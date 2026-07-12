# CLI Testing Tools Research

Audit of open-source CLI testing frameworks for Atlas E2E test infrastructure.

## Current State

Atlas uses Jest for unit tests and a custom `runCLI()` helper in `test/e2e/cli.test.js` that wraps `execSync`. This works but lacks:
- Interactive terminal testing (TUI/dashboard)
- Stderr isolation
- Process cleanup / timeout handling
- Sandbox isolation per test

## Tool Comparison

| Tool | Stars | Runtime | Best For | License |
|------|-------|---------|----------|---------|
| **[vitest-command-line](https://github.com/bhouston/vitest-command-line)** | New | Node/Vitest | Simple CLI assertion (`stdout`, `stderr`, `exitCode`) | MIT |
| **[clet](https://github.com/node-modules/clet)** | 79 | Node | Chainable E2E for CLI apps, fork/spawn, stdout/stderr matching | MIT |
| **[repterm](https://github.com/NexusGPU/repterm)** | 3 | Bun | Real PTY testing for TUI apps, interactive prompts, asciinema recording | MIT |
| **[microsoft/tui-test](https://github.com/microsoft/tui-test)** | 184 | Node/Bun | Multi-platform TUI testing, auto-wait, tracing, multi-shell | MIT |
| **[node-cli-testing](https://github.com/push-based/node-cli-testing)** | 3 | Node | Sandbox per test, keyboard simulation, .rc file handling | MIT |

## Detailed Assessment

### vitest-command-line
- **API**: `commandLine({ command: ['node', './dist/cli.js'] }).run(['--flag'])` returns `CommandResult` with `stdout`, `stderr`, `exitCode`, `signal`, `timeout`
- **Matchers**: `toSucceed()`, `toHaveStdout()`, `toHaveTimedOut()` — extends Vitest's `expect`
- **Sandbox**: `scratchDirectory()` creates disposable temp dirs with `file()`, `files()`, `dir()` helpers
- **Fit**: Atlas already uses Vitest for E2E → direct integration, no new test runner

### clet
- **API**: `runner().cwd(dir).fork('bin/cli.js', ['--name=test']).stdout('expected').stderr(/pattern/).code(0)`
- **Maturity**: node-modules org, 79 stars, ESM-first
- **Features**: Chainable assertions, stdin simulation, long-running process kill, file validation
- **Fit**: Battle-tested for Node CLI apps, clean chainable API

### repterm
- **API**: `` await $`echo "Hello"` `` with `expect(result).toHaveStdout('Hello')`
- **Interactive**: `{ interactive: true }` spawns real PTY, `proc.send()` / `proc.expect()` for prompts
- **Recording**: `--record` generates asciinema recordings (tests become docs)
- **Fit**: Best for Ink dashboard TUI testing; requires Bun runtime

### microsoft/tui-test
- **API**: `terminal.submit("ls -l")` + `expect(terminal.getByText(/pattern/)).toBeVisible()`
- **Multi-platform**: macOS, Linux, Windows; multi-shell (bash, zsh, fish, cmd, powershell)
- **Tracing**: Terminal snapshots for debugging flaky tests
- **Fit**: Microsoft-backed, but heavier setup; better for complex TUI apps

### node-cli-testing
- **API**: `CliProjectFactory.create(cfg)` → `projectSandbox.exec({verbose: true})`
- **Sandbox**: Auto-creates test files, cleans up after
- **Interactive**: Keyboard simulation via `exec({prompt: true}, [DOWN, ENTER])`
- **Fit**: Good sandbox model, but less maintained

## Recommendation

**For Atlas CLI E2E**: `vitest-command-line` — integrates with existing Vitest setup, typed API, scratch directories.

**For Ink Dashboard TUI**: `repterm` or `microsoft/tui-test` — real PTY testing for interactive components.

**Current `runCLI()` approach**: Sufficient for simple stdout/exitCode assertions. The custom helper in `test/e2e/cli.test.js` covers 81 tests and works well. New tools would add value primarily for:
1. Interactive dashboard testing
2. Sandbox isolation (test filesystem side effects)
3. Process timeout/cleanup

## Current E2E Test Infrastructure

- **81 CLI E2E tests** in `test/e2e/cli.test.js` — all passing
- **24 dashboard E2E tests** in `test/e2e/dashboard.test.js`
- **Playwright tests** in `test/e2e/playwright/`
- **Dogfood shell tests** in `test/dogfood/dashboard-ink/` (4 scripts, ~183 assertions)
- **YAML passthrough dogfood** in `test/dogfood/dashboard-ink/yaml-passthrough.sh` (5 tests, dual-path verified)

## Related

- `docs/internal/PROJECT-SETUP-AUDIT.md` — ecosystem setup patterns
- `docs/plans/FUTURE-WORK.md` — FW-31 (CLI testing infrastructure)
