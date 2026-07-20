# REPORT: `atlas init` Procedure Investigation

**Date:** 2026-07-19
**Trigger:** User ran `atlas init` from `~/projects/research/pmed-modern` and got
`Atlas initialized at /Users/dt/.atlas` — questioned why this touched the home
folder instead of the project directory.
**Scope:** Read-only investigation. No code or existing docs modified.

## What `atlas init` actually does, step by step

Command wiring: `bin/atlas.js:854-903` → `Atlas.init()` in `src/index.js:75-84`.

1. Resolves a config path: `this.configPath = options.configPath || this._defaultConfigPath()`,
   where `_defaultConfigPath()` (`src/index.js:66-70`) returns
   `ATLAS_CONFIG || ATLAS_DATA_DIR || \`${HOME}/.atlas\`` — **never derived from `process.cwd()`**.
2. `Atlas.init()` (`src/index.js:75-84`): if that path doesn't exist, `mkdir(configPath, { recursive: true })`.
   That's the entire global-init behavior. It creates `~/.atlas/` (empty at this point — no
   `config.json`, no `projects/` subdir written here; those get created lazily by other
   subsystems, e.g. `Config` on first read/write).
3. Back in `bin/atlas.js:873-875`, the CLI prints `result.message` — this is the
   `Atlas initialized at /Users/dt/.atlas` line the user saw.
4. **Only if `--template <id>` is passed** (`bin/atlas.js:877-902`) does anything touch the
   current working directory: it writes a `.STATUS` file to `./.STATUS` (relative to `process.cwd()`,
   `bin/atlas.js:891`), skipping if one already exists (`bin/atlas.js:892-895`). This is the *only*
   cwd-aware branch of `atlas init`.
5. **Idempotency:** re-running `atlas init` with no flags is a no-op after the first run —
   `existsSync(configPath)` is true, so `mkdir` is skipped, and the same success message prints
   again. No config is overwritten. With `--template`, a second run skips template creation if
   `.STATUS` already exists (message: `.STATUS file already exists, skipping template`).
6. **Dead flag:** `-g, --global` is declared as a CLI option (`bin/atlas.js:857`) but the action
   handler never reads `options.global` anywhere in `bin/atlas.js`. It has no effect — `atlas init`
   and `atlas init -g` behave identically. (Not the cause of the reported confusion, but adjacent
   and worth knowing.)

## What `atlas init` does NOT do

- It does **not** register `pmed-modern` (or any project) in the atlas project registry
  (`~/.atlas/projects/`).
- It does **not** create anything under the current working directory unless `--template` is
  explicitly passed.
- It is **not** analogous to `git init` or `npm init` (which scope to cwd by default). Despite the
  CLI's own description string — `"Initialize atlas in current directory or globally"`
  (`bin/atlas.js:856`) — the default (no-flag) behavior is unconditionally global. That description
  string is the most likely source of the user's expectation mismatch: it advertises a
  "current directory" mode that the dead `-g/--global` flag was presumably meant to disambiguate
  from, but no code path currently branches on cwd vs. global for the config-init step itself.

**Conclusion: this is intentional architecture, executed via a slightly misleading command
description, not a functional bug.** Per `CLAUDE.md`, atlas is designed as a single global state
hub (`~/.atlas/` holds all projects/sessions/captures/breadcrumbs) — there is deliberately no
`.atlas/` per project. `atlas init` is the one-time bootstrap for that global store, run once
per machine (or per `ATLAS_CONFIG`/`ATLAS_DATA_DIR` override), not once per project.

## Correct procedure to also track a specific project (e.g. `pmed-modern`)

Global init and project registration are two separate steps by design:

```bash
# 1. One-time global bootstrap (already done in this case)
atlas init

# 2a. Register THIS specific project explicitly, from inside its directory
cd ~/projects/research/pmed-modern
atlas project add                    # registers process.cwd() under its dirname
# or, from anywhere:
atlas project add ~/projects/research/pmed-modern

# 2b. Alternative: bulk-register via .STATUS scan (if pmed-modern already has a .STATUS file)
atlas sync --from-status             # scans configured scanPaths (default ~/projects) for .STATUS files
```

`atlas project add [path]` is wired at `bin/atlas.js:62-70` →
`getAtlas().projects.register(path || process.cwd(), options)`; it accepts `-t/--tags` and
`-s/--status` options. This is the actual project-scoped "init" the user was implicitly looking
for.

Confirmed via `src/use-cases/session/CreateSessionUseCase.js:69-81`: `atlas session start
<project>` does **not** auto-register an unknown project — it only touches (updates
`lastAccessed`) a project that's already in the registry, silently warning and continuing if not
found. So simply running `atlas session start pmed-modern` after `atlas init` will **not**
retroactively create a registry entry; `atlas project add` (or `sync --from-status`) must run
first.

`atlas init --template <id> --name pmed-modern` is a third option if the project doesn't yet have
a `.STATUS` file — it writes one to cwd — but it *still* does not register the project in
`~/.atlas/projects/`; that requires a separate `atlas project add` or `atlas sync --from-status`
afterward.

## Existing documentation coverage

`docs/CLI-REFERENCE.md` (`## Initialization & Templates`, lines ~1147-1188) documents `atlas init`
correctly but frames it purely as "Initialize Atlas configuration" without stating explicitly that
this is global-only and separate from project registration. The "Core loop" example higher in the
same file (lines 57-63) chains `atlas init` directly into `atlas session start myproject` with no
intervening `atlas project add` — which reads as if `init` were sufficient to make a project
trackable. It is not; that loop only works if `myproject` was already registered by some other
means (or if the example is aspirational/illustrative rather than literal). No other doc reviewed
(`TUTORIAL.md`, `CONFIGURATION.md`, `REFCARD.md`, `installation.md`, `workflows/WORKFLOWS.md`,
`cookbook/COOKBOOK.md`, `TROUBLESHOOTING.md`, `adhd-guide/quick-wins.md`) states the
init-vs-register distinction explicitly.

## Candidate follow-up (suggestion only, not implemented)

Worth considering as a small UX fix, not implemented here:
- On first-time global init (i.e. only when `~/.atlas` didn't already exist), print a follow-up
  hint such as `Run 'atlas project add' to track this directory as a project.` This would close
  the gap between "atlas is now set up" and "this specific project is now tracked" without
  requiring the user to already know the two are separate steps.
- Fix or remove the dead `-g/--global` flag on `atlas init` (`bin/atlas.js:857`) since it's
  currently inert and its presence implies a cwd-scoped mode that doesn't exist.
- Consider softening the command description at `bin/atlas.js:856` (`"Initialize atlas in current
  directory or globally"`) since the current-directory half only applies when `--template` is
  passed.

## Key files referenced

- `/Users/dt/projects/dev-tools/atlas/src/index.js` (lines 66-84)
- `/Users/dt/projects/dev-tools/atlas/bin/atlas.js` (lines 60-70, 854-903)
- `/Users/dt/projects/dev-tools/atlas/src/use-cases/session/CreateSessionUseCase.js` (lines 69-81)
- `/Users/dt/projects/dev-tools/atlas/docs/CLI-REFERENCE.md` (lines ~49-63, ~1147-1188)
