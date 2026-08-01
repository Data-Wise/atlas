# Spec: atlas

> **Scope of this document.** This is the portable, tool-agnostic project
> specification — the six areas any agent or contributor needs before
> touching this codebase. It deliberately overlaps
> [`CLAUDE.md`](CLAUDE.md), which carries the same information in
> Claude-Code-specific form plus deeper architectural narrative. **Where the
> two disagree, `CLAUDE.md` wins for architecture detail and this file wins
> for Boundaries** (the one section `CLAUDE.md` does not carry).
> Per-feature specs live in [`docs/specs/SPEC-<topic>-<date>.md`](docs/specs/)
> and are not superseded by this file.

## Objective

**What:** atlas is an ADHD-friendly project state engine — a Node.js CLI that
tracks projects, work sessions, quick captures, context breadcrumbs, and
tasks across a multi-project workspace, persisting to `~/.atlas/` (or an
XDG-resolved equivalent).

**Who:** a single developer/researcher managing ~25 concurrent projects
across several trees (`dev-tools/`, `research/`, `teaching/`, `r-packages/`),
whose primary failure modes are context loss on task-switch, time blindness,
and abandoned in-flight work — not lack of information.

**Why it exists:** conventional project tooling assumes you remember where
you left off. atlas assumes you don't. Every feature is judged against
whether it reduces the cost of re-entry after an interruption.

**Ecosystem role:** atlas is the state **hub**. `flow-cli` (ZSH) is a
<10ms shell wrapper over it; other tools (`obs`, savant skills) consume it
via CLI and its `atlas-mcp` MCP server. The shared cross-project convention
is a `.STATUS` file at each project root, synced into atlas's registry.

**Success looks like:** `atlas where` after a two-week absence restores
enough context to resume without re-reading the codebase.

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js `>=18.0.0`, ESM (`"type": "module"`) |
| CLI framework | `commander` |
| TUI | `ink` + `react` + `@inkjs/ui` (dashboard), TypeScript |
| Storage | FileSystem (default) or SQLite (`better-sqlite3`) — swappable |
| MCP | `@modelcontextprotocol/sdk` (binary: `atlas-mcp`) |
| Testing | `jest` (unit/integration/e2e) + `vitest` + `ink-testing-library` (Ink) + `@playwright/test` (TUI e2e) + shell dogfood scripts |
| Lint/format | `eslint` (flat config) + `prettier` |
| Architecture | Clean Architecture (domain → use-cases → adapters) |

Binaries: `atlas` → `bin/atlas.js`, `atlas-mcp` → `src/mcp/index.js`.

## Commands

```bash
# Install / link for local dev
npm install
npm link                     # makes `atlas` available globally

# Run from source
node bin/atlas.js status
DEBUG=atlas:* atlas status   # debug output

# Test
npm test                     # full Jest suite (needs --experimental-vm-modules, already wired)
npm run test:unit            # test/unit only
npm run test:integration     # test/integration only
npm run test:e2e             # test/e2e only
npm run test:coverage        # with coverage
npm run test:debug           # --detectOpenHandles --runInBand

# Ink dashboard tests
npm run test:ink             # all Ink tests
npm run test:ink:e2e:vitest  # Vitest-driven Ink e2e
npm run test:playwright      # Playwright TUI e2e (run test:playwright:install first)
npm run test:ink:dogfood     # shell dogfood against real ~/.atlas data

# Dogfood (runs against live data — read the script before running)
npm run test:dogfood
npm run test:dogfood-auto

# Quality gates
npm run lint                 # ESLint, flat config, zero-warning policy
npm run format               # Prettier write

# Release (see Boundaries — never run these unprompted)
npm run release:version -- <major|minor|patch>
npm run release:tag
npm run release:push
npm run release:github
```

**Note on `npm test`:** Jest requires `--experimental-vm-modules` for ESM;
this is already baked into the `test` script. Never invoke `jest` directly
without it.

## Project Structure

```
bin/           → CLI entry point (atlas.js — commander wiring, ~1700 lines)
src/
  domain/      → Pure business logic, zero external dependencies
    entities/    Project, Session, Capture, Breadcrumb, Task, ScheduleRecord
    constants/   BusinessRules (centralized thresholds)
    gateways/    Interfaces for fixed-location external files
    repositories/ Interfaces (IProjectRepository, ITaskRepository, …)
    value-objects/ ProjectType, SessionState, TaskPriority
  use-cases/   → Application logic, one class per operation
    session/ capture/ context/ project/ registry/ task/ status/
  adapters/    → External interfaces
    controllers/ presenters/ repositories/ gateways/
    Container.js  Dependency-injection container
  utils/       → ADHD helpers, config, charts, temporal intelligence
  mcp/         → MCP server (atlas-mcp binary)
  cli/dashboard-ink/ → Ink TUI (components/ hooks/ lib/ types.ts constants.ts)
test/
  unit/        → 81 test files, mirrors src/ layout
  integration/ → 15 test files
  e2e/         → 4 test files
  dogfood/     → Shell scripts run against real ~/.atlas data
docs/          → CLI-REFERENCE, ARCHITECTURE, API-GUIDE, TUTORIAL, MCP-SERVER, …
docs/specs/    → Per-feature SPEC-<topic>-<date>.md and GRILL-<topic>-<date>.md
docs/demos/    → VHS .tape files + generated .gif
man/           → man pages
completions/   → shell completions
scripts/       → build/release helpers
site/, overrides/ → MkDocs documentation site
```

**Dependency rule (Clean Architecture):** `domain/` imports nothing from
`use-cases/` or `adapters/`. `use-cases/` imports only from `domain/`.
`adapters/` may import from both. Violating this direction is a review
blocker, not a style preference.

## Code Style

Real example — `src/use-cases/task/AddTaskUseCase.js`, which shows every
convention that matters here:

```javascript
/**
 * AddTaskUseCase
 * Creates and persists a new Task entity.
 */
import { Task } from '../../domain/entities/Task.js'

export class AddTaskUseCase {
  constructor({ taskRepository, eventPublisher }) {
    this.taskRepository = taskRepository
    this.eventPublisher = eventPublisher
  }

  /**
   * Execute the use case
   * @param {Object} params
   * @param {string} params.description - Task description
   * @returns {Promise<Task>} The created task
   */
  async execute({ description, options = {} }) {
    if (!description?.trim()) {
      throw new Error('Task description is required')
    }
    // ...
  }
}
```

Conventions this encodes:

- **No semicolons.** Prettier-enforced; match it.
- **Named exports only** — no `export default` in `src/`.
- **`.js` extension required on all relative imports** (ESM, no resolver magic).
- **Destructured-object constructors** for dependency injection — never
  positional args. The `Container` builds these.
- **One class per file**, filename matches the class exactly.
- **`<Verb><Noun>UseCase`** naming for use cases; `I<Name>` for interfaces;
  `FileSystem<Name>Repository` / `SQLite<Name>Repository` for implementations.
- **JSDoc on public methods** with `@param`/`@returns`. Not optional on
  `execute()`.
- **Validate at the top, throw plain `Error` with a user-readable message** —
  these surface directly in CLI output.
- **TypeScript only inside `src/cli/dashboard-ink/`** — the rest is JS.

## Testing Strategy

| Level | Location | Framework | Covers |
|---|---|---|---|
| Unit | `test/unit/` (mirrors `src/`) | Jest | Entities, use-cases, presenters, utils — mocked repositories |
| Integration | `test/integration/` | Jest | Cross-layer flows, real FS/SQLite repositories against temp dirs |
| E2E | `test/e2e/` | Jest | CLI invocation end-to-end |
| Ink unit | `test/unit/**/dashboard-ink/` | Jest + `ink-testing-library` | TUI components, hooks |
| Ink e2e | `vitest.config.e2e.ts`, `playwright.config.ts` | Vitest / Playwright | Rendered TUI behavior |
| Dogfood | `test/dogfood/` | Shell | Real `~/.atlas` data, cross-validated against a filesystem oracle |

**Rules:**

- **New behavior requires new tests.** A PR adding logic with zero
  new/changed tests is not ready.
- **Report counts, not vibes.** State the exact command and pass/fail/skip
  counts; "tests pass" without numbers doesn't count.
- **Judge failures against the base branch.** A failure blocks only if it
  fails on the branch and passes on `dev`. Reproduce on base before calling
  anything pre-existing.
- **Run tests in the tree the PR ships from** — never the main checkout when
  working in a worktree; stale caches and paths diverge silently.
- **Give sorted-output tests distinct sort keys.** Two `new Date()` calls in
  rapid succession can be identical, making sort order non-deterministic
  across Node versions (a real, recurring CI flake here).
- **Dogfood before trusting a parser/validation change.** Run it against real
  `~/projects` data — synthetic fixtures don't surface the
  "working-by-lenient-accident" patterns real `.STATUS` files have.
- CI matrix: Node 18/20/22/26.

## Boundaries

*(The section `CLAUDE.md` doesn't carry — this is the authoritative copy.)*

### Always

- Work on `dev` or a `feature/*` branch. Verify with `git branch --show-current`
  before any git operation.
- Run `npm run lint` and the appropriate test tier before opening a PR.
- Use `execFile`/`execFileSync` with an argument array for any shell-out.
  Never `exec`/`execSync` with an interpolated string.
- Keep the Clean Architecture dependency direction (`domain` ← `use-cases` ←
  `adapters`).
- Update `docs/CLI-REFERENCE.md` and `CHANGELOG.md` `[Unreleased]` in the same
  PR as any user-facing command change.
- Preserve `.STATUS` schema compatibility — it's a cross-tool contract, not
  an internal format.

### Ask first

- Adding a dependency, or changing `engines.node`.
- Schema changes to `~/.atlas/` persisted data, or to the `.STATUS` format.
- Changing CI workflows (`test.yml`, `docs.yml`, `demos.yml`,
  `homebrew-release.yml`).
- Any version bump, tag, GitHub release, or Homebrew formula update — the
  full release pipeline is human-triggered.
- Merging any PR. Watch CI, report status, then ask — never merge on green
  automatically.
- Creating or removing a git worktree, or switching branches.
- Adding a new top-level CLI command (affects docs, completions, man pages,
  and count validators simultaneously).

### Never

- Commit or push directly to `main`. It is PR-only, branch-protected.
- Commit secrets, tokens, or `~/.atlas` user data fixtures containing real
  paths/PII.
- Force-push to `main`. (`--force-with-lease` on `dev`/feature branches only
  after the branch-guard hook's own confirmation.)
- Use `execSync` — security hooks block it, and it's an injection vector.
- Delete or skip a failing test to make CI green.
- Write feature code directly on `dev` — new code files require a
  `feature/*` branch.
- Retry a hook-blocked operation unchanged. Switch to the compliant
  alternative instead.
- Leave an `ORCHESTRATE-*.md` on `dev` after a feature merges — they're
  feature-branch working artifacts.

## Success Criteria

- [ ] `npm test` green on Node 18/20/22/26.
- [ ] `npm run lint` zero warnings (zero-warning policy since v0.12.2).
- [ ] `mkdocs build --strict` passes — broken doc links fail PRs.
- [ ] New CLI surface documented in `docs/CLI-REFERENCE.md` + `CHANGELOG.md`.
- [ ] `atlas doctor` reports no settings-contract violations after changes to
      registry/`.STATUS` handling.
- [ ] Behavioral changes carry a quoted E2E transcript in the PR body, not
      just structural gates.

## Open Questions

- **Windows support** is unspecified. `process.env.HOME` is unset on native
  Windows and the install story is Homebrew-only today. Several planned
  features (`launchd` scheduling, `osascript` notifications) are macOS-only.
  Confirm whether Windows is ever a target before investing in portability.
- **SQLite backend parity** is not systematically verified — most tests
  exercise the FileSystem repositories. Unclear how much SQLite drift exists.
- **Dogfood scripts run against live `~/.atlas` data**, which makes them
  non-hermetic and environment-dependent. No decision recorded on whether to
  isolate them.
