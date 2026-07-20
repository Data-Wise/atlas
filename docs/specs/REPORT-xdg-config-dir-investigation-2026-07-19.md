# REPORT: XDG Base Directory (`~/.config/`) Investigation

**Date:** 2026-07-19
**Trigger:** Follow-up to `REPORT-init-procedure-investigation-2026-07-19.md`.
Question: should atlas's dot-folder live under `~/.config/` (the XDG default)
instead of `~/.atlas`, and should it check/honor XDG env vars?
**Scope:** Read-only investigation. No code changes made.

## Current state

`atlas`'s storage location is **hardcoded to `~/.atlas` in six separate
places**, not resolved from one central function:

| File | Line | Fallback |
|---|---|---|
| `src/index.js` | 69 | `ATLAS_CONFIG \|\| ATLAS_DATA_DIR \|\| ${HOME}/.atlas` |
| `src/utils/Config.js` | 83 | same three-way fallback, duplicated |
| `src/adapters/repositories/FileSystemCaptureRepository.js` | 13 | `configPath \|\| ${HOME}/.atlas` (no env var check) |
| `src/adapters/repositories/FileSystemScheduleRecordRepository.js` | 14 | same |
| `src/adapters/repositories/FileSystemBreadcrumbRepository.js` | 15 | same |
| `src/adapters/repositories/FileSystemTaskRepository.js` | 14 | same |

In normal operation the four repository classes receive an explicit
`configPath` from `Container` (which gets it from `Atlas.configPath`), so
their own `${HOME}/.atlas` fallback is a dead path in practice — but it's a
second, unsynchronized copy of the default that would need updating too if
the default ever changes (e.g. if someone instantiates a repository
directly, as tests do).

**No `XDG_CONFIG_HOME` / `XDG_DATA_HOME` support exists anywhere.** The only
overrides are atlas's own `ATLAS_CONFIG` / `ATLAS_DATA_DIR` (documented in
`docs/CONFIGURATION.md:34,367,421-427`) — both of which still point at a
single flat directory, not a config/data split.

`~/.atlas` itself is **not config-only** — it holds `config.json` alongside
`projects.json`, `sessions.json`, `captures.json`, `breadcrumbs.json`,
`tasks.json`, `schedule.json`, the SQLite db (`atlas.db` + WAL/SHM), several
`.bak` files, and two log files. On this machine it's 2.6k+ files/lines,
30+ entries. Strictly, XDG separates this into three different base dirs
(`XDG_CONFIG_HOME` for `config.json`, `XDG_DATA_HOME` for the JSON stores
and SQLite db, `XDG_STATE_HOME` or a cache dir for the `.log` files) — atlas
currently conflates all of them into one directory, config-store style.

## Precedent already in this workspace

`flow-cli` (the sibling CLI in the same hub-and-spoke ecosystem, which
calls the `atlas` binary directly) **already does this correctly**:

```zsh
: ${FLOW_CONFIG_DIR:=${XDG_CONFIG_HOME:-$HOME/.config}/flow}
: ${FLOW_DATA_DIR:=${XDG_DATA_HOME:-$HOME/.local/share}/flow}
```
— `flow-cli/flow.plugin.zsh:18-19`. This is a real, working, tested
(`flow-cli/tests/e2e-plugin-system.zsh` exercises `XDG_CONFIG_HOME`
overrides directly) precedent for the exact pattern under discussion,
inside the same repo family atlas already coordinates with.

## Should atlas do this?

**Yes, the default should become XDG-aware — but the *migration*, not the
env-var check, is the real risk.** Adding an `XDG_CONFIG_HOME` read is a
one-line change; safely relocating every existing user's live data (this
machine alone has session history back to December) without it silently
looking empty on next run is the actual work.

### Two ways to get there

**A — Additive, zero-risk (env var support only, default unchanged)**
Add `XDG_CONFIG_HOME` as one more optional override, same tier as
`ATLAS_CONFIG`:
```js
process.env.ATLAS_CONFIG
  || process.env.ATLAS_DATA_DIR
  || (process.env.XDG_CONFIG_HOME && `${process.env.XDG_CONFIG_HOME}/atlas`)
  || `${process.env.HOME}/.atlas`
```
Anyone who already sets `XDG_CONFIG_HOME` (common on Linux, increasingly on
macOS via chezmoi/dotfile managers) gets XDG placement today; everyone else
— including every existing install — is unaffected. No migration needed.
Ships in the same pass as centralizing the six duplicated fallbacks into
one resolver function.

**B — Default flip (`~/.atlas` → `${XDG_CONFIG_HOME:-$HOME/.config}/atlas`)**
Matches `flow-cli`'s convention exactly and is the "correct" XDG answer,
but changes what every existing install resolves to with zero
configuration. Needs, at minimum:
- Detect an existing `~/.atlas` on startup; if the new path doesn't exist
  yet but the old one does, keep resolving to the old path (don't strand
  existing data) and print a one-time notice pointing at a migration
  command.
- A `atlas migrate --xdg` (or similar) command that copies/moves the old
  directory to the new location with a backup, rather than a silent
  automatic move.
- Decide whether to also split config vs. data (true XDG compliance) or
  keep the current single-directory model just relocated (smaller, lower
  risk, still a real improvement, matches what a first pass of `flow-cli`
  parity would need day one — data/config split can follow later).
- Update `docs/CONFIGURATION.md`'s six `~/.atlas` path references and the
  Homebrew/README install notes.

## Recommendation

Do **A now** — it's small, safe, additive, and immediately closes the gap
with `flow-cli`'s existing convention for anyone who's already set
`XDG_CONFIG_HOME`. Scope **B as its own spec** before touching the default:
it's a breaking change to every existing user's data location and needs a
real migration path, not just a resolver change — not something to fold
into a quick fix.

Not investigated further here (out of scope for this pass): whether to
split `XDG_DATA_HOME` out for the JSON/SQLite stores as a true three-way
split, and whether Windows needs a distinct fallback (`process.env.HOME` is
unset on native Windows — `USERPROFILE` is the equivalent — though the
Homebrew-only install story in the README suggests Windows isn't a
currently-supported target anyway; worth confirming rather than assuming).
