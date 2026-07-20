# SPEC: XDG Base Directory Default + Migration

**Date:** 2026-07-19
**Status:** Draft — not implemented. Supersedes "Option B" from
`REPORT-xdg-config-dir-investigation-2026-07-19.md` with an actual design.
**Depends on:** `REPORT-init-procedure-investigation-2026-07-19.md` (why
`atlas init` targets a global dir at all) and the XDG report above (current
state, six hardcoded fallback sites, `flow-cli` precedent).

## Problem

`atlas`'s storage location defaults to `~/.atlas`, hardcoded independently
in six files, with no `XDG_CONFIG_HOME`/`XDG_DATA_HOME` support. `flow-cli`
— the sibling CLI in the same ecosystem that calls `atlas` directly —
already follows XDG (`${XDG_CONFIG_HOME:-$HOME/.config}/flow`). This spec
covers changing atlas's *default* to match, safely, for users who already
have a populated `~/.atlas` on disk.

The prior REPORT recommended a small additive change (env var as one more
optional override, default unchanged) as immediate, zero-risk follow-up.
This spec is the **larger, breaking-change path**: flipping the default
itself. Do not implement without re-confirming scope — this touches every
existing install's data location.

## Goals

1. New installs default to the XDG location with no configuration.
2. Existing installs (`~/.atlas` already populated) keep working exactly as
   today until the user explicitly migrates — no silent data relocation,
   no "my projects disappeared" moment.
3. One centralized path resolver, replacing the six hardcoded copies.
4. A migration path that fits the existing `atlas migrate` command rather
   than inventing a new top-level command.

## Non-goals (explicitly out of scope for this spec)

- **True three-way XDG split** (`XDG_CONFIG_HOME` for `config.json` only,
  `XDG_DATA_HOME` for the JSON stores + SQLite db, a state/cache dir for
  logs). Phase 1 here relocates the *whole* existing single directory
  under `XDG_CONFIG_HOME` — same flat layout, new parent. A real split is
  a bigger, separate migration (would need per-file moves, not one
  directory rename) and gets its own future spec if wanted.
- Windows path handling (`process.env.HOME` is unset on native Windows;
  `USERPROFILE` is the analog). The README's install story is Homebrew
  (macOS) only today — confirm whether Windows is an actual target before
  spending effort here.

## Design

### 1. New resolution precedence

Replace the current three-way chain (`ATLAS_CONFIG || ATLAS_DATA_DIR ||
~/.atlas`) with a single exported resolver, centralizing what's currently
duplicated across `src/index.js`, `src/utils/Config.js`, and four
`FileSystemXRepository.js` fallbacks:

```js
// src/utils/configPath.js (new file — the one place this logic lives)
import { existsSync } from 'node:fs'

export function resolveConfigDir() {
  // 1. Explicit overrides — unchanged, highest precedence
  if (process.env.ATLAS_CONFIG) return process.env.ATLAS_CONFIG
  if (process.env.ATLAS_DATA_DIR) return process.env.ATLAS_DATA_DIR

  const legacy = `${process.env.HOME}/.atlas`
  const xdg = `${process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`}/atlas`

  // 2. Existing install: keep resolving to the legacy path until the
  //    user explicitly migrates. Never silently strand live data.
  if (existsSync(legacy) && !existsSync(xdg)) return legacy

  // 3. New install, or already migrated: XDG path.
  return xdg
}
```

`existsSync(legacy)` adds one `stat` call per CLI invocation — negligible,
but note it: this resolver is no longer a pure string computation, it now
touches the filesystem. Keep it synchronous and cheap (a single `stat`,
nothing recursive).

**Tie-break, revised after grill (see ledger #1):** bare `existsSync(xdg)`
can't distinguish "migration completed, old-dir cleanup just hasn't run
yet" from "an XDG dir exists for an unrelated reason (stray mkdir, another
tool, user experimentation) while the real data is still only in
`~/.atlas`." The second case would make the resolver silently point at an
empty/wrong directory — exactly the failure this spec exists to prevent.
Fix: `xdg` only wins if it contains a **migration marker** (see §2's
`--apply` behavior), not merely if the directory exists:

```js
if (existsSync(legacy) && !existsSync(join(xdg, '.atlas-migration.json'))) return legacy
```

`atlas doctor` (see §4) is where a "both exist, here's what that means"
explanation belongs, not the resolver — the resolver just needs the one
unambiguous signal.

### 2. Migration command: `atlas migrate --xdg`

Extends the existing `migrate` command (`bin/atlas.js:1305-1345`, which
already branches on `--status` for a completely different migration type)
rather than adding a new command:

```bash
atlas migrate --xdg              # dry-run by default, same convention as --status
atlas migrate --xdg --apply      # actually move
atlas migrate --xdg --apply --force   # override the process-lock guard only (see below)
```

Behavior:
- Dry-run (default): report what would move (`~/.atlas` → resolved XDG
  path), byte count, file count, and whether SQLite files (`.db`,
  `.db-shm`, `.db-wal`) are present (needs the process to not hold an open
  SQLite handle during the actual move — see risks below).
- **Process-lock guard (ledger #4-6):** before touching anything, check
  for a lockfile (see below) indicating `atlas-mcp` or `atlas dash` is
  likely running. If found, refuse with a message naming which process and
  what to do (close `atlas dash`, or restart `atlas-mcp` after migrating).
  `--force` overrides *this check only* — see the scoping note below.
- `--apply`: `mkdir -p` the new parent, then move the directory via
  `fs.rename()` — a single atomic syscall on the common case (same
  filesystem, which `~/.atlas` → `~/.config/atlas` almost always is). If
  `rename()` fails with `EXDEV` (cross-filesystem — e.g. `~/.config`
  symlinked elsewhere by a dotfile manager), fall back to: copy the whole
  tree to a temp sibling directory under the XDG parent, `rename()` the
  temp dir into its final name (atomic, so the new location either fully
  exists or doesn't appear at all), then delete the old tree as a final,
  safely-retryable cleanup step. Do not implement "move" as a naive
  recursive copy-then-delete-source — that's not atomic, and a crash
  mid-copy leaves files split between old and new with no clean recovery
  (see §5, resolver-during-migration risk).
  As the **last step**, write the migration marker
  `<xdg>/.atlas-migration.json` (ledger #8): `{ from: legacy, migratedAt:
  <ISO timestamp>, atlasVersion: <package.json version> }`. This is the
  signal the resolver's tie-break (§1) checks for, and what `atlas doctor`
  can surface ("migrated from ~/.atlas on 2026-07-19").
  Verify the move landed (re-`existsSync` the new path + marker, re-run
  resolver) and print a success message that states what moved and where
  (see §5, tone guidance — this should read as confirmation, not a bare
  ok).
- If `--apply` finds an existing directory at the XDG target already
  (e.g. a previous partial migration), refuse and tell the user to
  resolve it manually rather than merging or overwriting silently. **This
  refusal is absolute — `--force` does not bypass it** (ledger #6): it's a
  data-integrity guard, not a soft safety check like the process lock.
  Conflating the two would let `--force` silently overwrite/merge a
  partial migration's data, which is exactly the failure class this spec
  exists to prevent.
- Exit non-zero with a clear message if any file operation fails partway
  — do not leave the install in a state where neither path is complete.
- **No dedicated rollback command** (ledger #15): reversing a completed
  migration is a manual, documented procedure (move the directory back,
  delete the marker file) rather than a maintained `--rollback` code path
  — that path would need the same lock/atomicity treatment as `--apply`
  itself for a scenario that should be rare given the guards above.

**Process-lock mechanism (ledger #5):** a PID file under `os.tmpdir()`,
named by a hash of the resolved `configPath` (not inside the data
directory itself — that would reintroduce the non-atomic "move everything
except this one file" problem). `atlas-mcp` and `atlas dash` write it on
startup, remove it on clean exit. Stale locks from a crash are the
expected failure mode `--force` exists for.

### 3. Centralizing the call sites

| File | Current | Change |
|---|---|---|
| `src/index.js:69` | inline 3-way fallback | `resolveConfigDir()` |
| `src/utils/Config.js:83` | inline 3-way fallback, duplicated | `resolveConfigDir()` |
| `src/adapters/repositories/FileSystemCaptureRepository.js:13` | `configPath \|\| ${HOME}/.atlas` | `configPath \|\| resolveConfigDir()` |
| `src/adapters/repositories/FileSystemScheduleRecordRepository.js:14` | same | same |
| `src/adapters/repositories/FileSystemBreadcrumbRepository.js:15` | same | same |
| `src/adapters/repositories/FileSystemTaskRepository.js:14` | same | same |
| `src/mcp/index.js:45-48` | `new Atlas({ dataDir: process.env.ATLAS_DATA_DIR, ... })` | **Separate pre-existing bug, found during review:** `Atlas`'s constructor only reads `options.configPath` (`src/index.js:39`) — `dataDir` is not a recognized option name there (it's `Container`'s key, not `Atlas`'s). This currently "works" only because `_defaultConfigPath()` independently re-reads `ATLAS_DATA_DIR` from the environment, masking the bug. Fix while touching this file: pass `configPath: resolveConfigDir()` explicitly instead of the dead `dataDir` key. |

The four repository fallbacks are dead paths in normal operation (they
always receive `configPath` from `Container`), but tests may instantiate
them directly — centralizing means a future default change (e.g. a Phase 2
data/config split) only touches one file. `src/mcp/index.js` was missing
from the original file list entirely — adding it here is a correctness
fix to this spec, not just cleanup, since the MCP server needs to resolve
the same way the CLI does (see §5).

### 4. `atlas doctor` integration

`atlas doctor` already audits the Project Settings Contract
(`.STATUS`/`CLAUDE.md`/`.obs/sync.yml`) with an existing **two-tier**
convention (confirmed by reading `bin/atlas.js:1082-1100`, not assumed):
`doctor --fix` alone is **preview-only** ("would create X"), and a
separate `doctor --fix --write` flag actually applies changes. The XDG
check follows this exact pattern rather than inventing a new one (ledger
#9-11 — an earlier draft of this spec had `--fix` auto-applying directly,
which was wrong; corrected after checking the real convention):

- `doctor` (no flags): if `resolveConfigDir()` currently resolves to the
  legacy path, print an informational note pointing at
  `atlas migrate --xdg` — informational, not a warning/error, since
  staying on the legacy path is a fully supported steady state. This is
  the main discovery mechanism for existing users.
- `doctor --fix`: adds "would migrate `~/.atlas` → `<xdg path>`" to the
  existing preview list of actions.
- `doctor --fix --write`: actually runs the migration — internally calling
  the **same guarded path** as a manual `atlas migrate --xdg --apply`
  (ledger #10's resolution to the reopened §2 conflict): the process-lock
  check still applies. If locked, `--write` **skips** the XDG remediation
  for that run and reports it as skipped alongside whatever else it fixed
  — the same way any doctor check that can't be safely auto-applied right
  now would report — rather than forcing through or silently bypassing
  the guard just because `--write` was passed. It becomes
  eventually-consistent: the nudge reappears next run.

**Action result shape (ledger #12):** `doctorFix`'s existing action
objects are implicitly per-project (`{ file, project }`, printed as
`"created {file} in {project}"`). The XDG migration is a single global
action with no project — jamming it into that shape would print something
like `"migrated ~/.atlas in (no project)"`. Add a `type` discriminator
field (`'claude-md' | 'xdg-migration'`) to action objects; the print loop
branches on `type` — per-project actions print as today, the XDG action
gets its own one-line summary with no project column. `--format json`
consumers gain a `type` key on every action; existing `{file, project}`
consumers of `claude-md`-type actions are unaffected.

### 5. ADHD-friendly tone for new user-facing messages (ledger #17)

atlas markets itself specifically on ADHD-first design (gentle time cues,
anti-perfectionism, celebration over alarm — see its own `CLAUDE.md`
feature table and `CelebrationHelper`/`TimeBlindnessHelper` utilities).
The messages this spec introduces should match that, not read like
generic ops tooling:

- **Doctor nudge:** informational/"nice to know" framing — e.g. `atlas
  found a newer, tidier home for your data (~/.config/atlas). Run 'atlas
  migrate --xdg' whenever you'd like — no rush.` Not "your config
  directory is outdated" or similar implied-deficiency language.
- **Lock-guard refusal:** state the *why* and the *exact next action* in
  one line, not just "refused" — e.g. `atlas dash is running, so this
  needs to wait — close it and try again (or pass --force if that's
  stale).` Not a bare error/stack trace.
- **`--apply` success output:** confirm what moved and where in plain
  language, not just an exit code — e.g. `Moved your atlas data to
  ~/.config/atlas. Everything's right where atlas expects it.`

This isn't decorative — it's the same design language already used
elsewhere in the CLI (`CelebrationHelper`, session-end messaging), and
this spec's new messages would be conspicuously inconsistent with the
product's own identity if left as terse ops-tool phrasing.

## Files touched (implementation estimate)

- **New:** `src/utils/configPath.js` (resolver), `src/utils/atlasLock.js`
  (or similar — process-lock read/write helper, used by both `src/mcp/index.js`
  and the Ink dashboard entry point), `test/unit/utils/configPath.test.js`,
  `test/unit/utils/atlasLock.test.js`
- **Edited:** `src/index.js`, `src/utils/Config.js`, 4×
  `FileSystemXRepository.js`, `src/mcp/index.js` (fix the dead `dataDir`
  option + write/remove the lock), the Ink dashboard entry point (write/remove
  the lock), `bin/atlas.js` (migrate command `--xdg` branch, doctor
  `--fix`/`--write` XDG action), `src/utils/migrate.js` or a sibling module
  for the actual move logic, `src/use-cases/registry/DoctorUseCase.js` (the
  `type`-discriminated action shape), `docs/CONFIGURATION.md` (all
  `~/.atlas` path references + the `ATLAS_DIR` vs `ATLAS_CONFIG`
  disambiguation, ledger #19), `README.md` if it states the storage
  location, `docs/CLI-REFERENCE.md` (`migrate` and `doctor` command docs)
- Given the file count and that this changes every existing install's
  behavior, this is **worktree-scoped, not a direct-to-`dev` edit** per
  the repo's own workflow conventions for larger features — flagging that
  for whoever picks this up.

## Testing plan

- Unit: `resolveConfigDir()` — all four precedence branches (`ATLAS_CONFIG`
  set, `ATLAS_DATA_DIR` set, legacy-exists-marker-absent, neither-exists →
  xdg default, marker-present → xdg wins). **Explicit per-test env
  stubbing** (ledger #18): save/restore `HOME`, `XDG_CONFIG_HOME`,
  `ATLAS_CONFIG`, `ATLAS_DATA_DIR` around each test rather than trusting
  the ambient CI environment — `.github/workflows/test.yml` pins neither
  var, so relying on the GitHub Actions runner's actual defaults (which
  can differ between the `ubuntu-latest`/`macos-latest` matrix legs this
  repo already runs, and can drift with runner image updates) would make
  this exact precedence logic flaky across environments — the same class
  of bug as the documented sort-order-flakiness lesson already in this
  project's memory.
- Unit: process-lock helper — write/read/stale-detection/clean-removal.
- Integration: `atlas migrate --xdg` dry-run against a fixture directory
  tree (mirroring real `~/.atlas` contents: JSON stores + SQLite files +
  `.bak` files) — confirm dry-run output matches, confirm `--apply`
  actually relocates, writes the marker, and the resolver picks up the new
  location immediately after (same process and a fresh process). Confirm
  the lock guard blocks `--apply` when a lock is present and `--force`
  overrides it; confirm `--force` does **not** bypass the existing-target
  refusal.
- Integration: `doctor` / `doctor --fix` / `doctor --fix --write` against
  the same fixture — preview text, actual migration, and the
  `type`-discriminated action shape in `--format json` output.
- **Fix an existing test that will otherwise break:**
  `test/unit/utils/Config.test.js:68` currently asserts
  `new Config().configDir === \`${HOME}/.atlas\`` — a literal hardcoded
  default-path assertion that a correct XDG-aware resolver will no longer
  satisfy on a clean environment. Update it to assert against
  `resolveConfigDir()`'s actual documented precedence, not a hardcoded
  string. Grep `test/` for any other `.atlas` literal-path assertions
  while there — this was found by a specific grep, not a full sweep.
- Dogfood: run against this machine's real `~/.atlas` (30+ files, SQLite
  db with WAL) in dry-run only — do not `--apply` against live data as
  part of automated testing.

## Definition of Done (ledger #7)

Added explicitly per this repo's own `pre-pr-testing.md` convention (Code
tier = full suite + new tests for new logic) — not left as prose the
implementer has to infer:

- [ ] `resolveConfigDir()` unit tests, all precedence branches, explicit env stubbing
- [ ] Process-lock helper unit tests
- [ ] `atlas migrate --xdg` dry-run + `--apply` integration tests (including lock guard, `--force` scoping, existing-target refusal, marker file)
- [ ] `doctor` / `doctor --fix` / `doctor --fix --write` integration tests, including `--format json` action shape
- [ ] `test/unit/utils/Config.test.js:68` updated (see Testing plan)
- [ ] `docs/CONFIGURATION.md` updated (paths, `ATLAS_DIR` vs `ATLAS_CONFIG` disambiguation, manual-rollback steps)
- [ ] `docs/CLI-REFERENCE.md` updated (`migrate --xdg`, `doctor --fix --write`)
- [ ] `README.md` updated if it states a storage location
- [ ] Full test suite green on the worktree (not the main checkout), per this repo's own pre-PR testing convention
- [ ] Pre-ship: grep all of `~/projects/` (not just dev-tools) for hardcoded `~/.atlas` references, per the confirmed `agy-cli` finding below

## Risks

- **Long-running processes resolve `configPath` once, at startup, and
  never re-check it.** `atlas-mcp` (`src/mcp/index.js`) and `atlas dash`
  (the Ink TUI) both construct a single `Atlas` instance that lives for
  the process's whole lifetime. If `atlas migrate --xdg --apply` runs
  while either is alive, that process keeps reading/writing the now-moved
  legacy path — silently, no error, until it's restarted. This is not
  hypothetical or generic ("another atlas process") — these are the two
  specific consumers with long enough uptime for it to matter; a `launchd`
  cron job (e.g. `mediationverse-status-sync`) is *not* at risk the same
  way, since each firing is a fresh short-lived process that re-resolves
  on every run. `--apply` should at minimum warn prominently to close
  `atlas dash` / restart `atlas-mcp` after migrating; a best-effort
  lockfile check is a nice-to-have, not required for v1.
- **SQLite files open during move.** Same root cause as above — if
  `atlas.db` is open (WAL mode) in a long-running process during
  `--apply`, the move can leave WAL/SHM files inconsistent.
- **Dotfile managers.** Some users' `XDG_CONFIG_HOME` may already point
  somewhere unexpected (chezmoi, stow-managed dirs) — the resolver just
  honors whatever's set, which is correct behavior, but worth a docs note
  so "atlas put my data somewhere weird" support questions have a fast
  answer. This is also exactly the scenario that can put `~/.config` on a
  different filesystem than `$HOME`, triggering the `EXDEV` fallback path
  in §2 rather than a plain `rename()`.
- **Ecosystem consumers reading `~/.atlas` directly, bypassing the CLI —
  confirmed, not hypothetical.** Checked during review:
  `agy-cli/src/agy/plugins/atlas.py` (a separate project, not listed in
  the dev-tools root `CLAUDE.md` inventory) hardcodes
  `~/.atlas/sessions.yaml` and `~/.atlas/registry.yaml` via
  `os.path.expanduser`, entirely outside the `atlas` CLI. It respects
  `ATLAS_SESSIONS_PATH`/`ATLAS_REGISTRY_PATH` env var overrides if set, so
  it isn't fully unfixable from outside atlas's own repo — but note the
  filenames it reads (`sessions.yaml`, `registry.yaml`) don't match what
  atlas's `FileSystemSessionRepository`/`FileSystemProjectRepository`
  actually write (`sessions.json`, `projects.json`) — this consumer
  appears to already be silently reading nothing, independent of any XDG
  work. Lower urgency than initially assumed (migration doesn't newly
  break something that already doesn't work), but it confirms the general
  pattern is real: **before `--apply` ships, do a repo-wide grep for
  `~/.atlas` across all of `~/projects/`, not just the dev-tools
  workspace**, since this consumer alone wasn't caught by scoping the
  search to dev-tools siblings only. `flow-cli` itself, by contrast, was
  confirmed to interact with atlas only through the CLI (no direct file
  reads found).

  **Pre-ship sweep completed (2026-07-19):** `grep -rl '\.atlas' ~/projects
  --include='*.py' --include='*.js' --include='*.ts' --include='*.sh'
  --include='*.zsh'`, filtered to exclude `dev-tools/atlas` itself,
  `node_modules`, and `.git`. Hits outside atlas: 1 confirmed real
  reference (`agy-cli/src/agy/plugins/atlas.py`, described above); the
  remainder are false positives — vendored `mermaid.min.js`/`plotly` JS
  bundles matching the substring "atlas" (unrelated map-projection code),
  and Python's own `networkx.generators.atlas` module (bundled in several
  `.venv`s, unrelated project). No new consumer found beyond the one
  already documented. Nothing in this repo's own worktree needs further
  change as a result.

## Explicitly accepted, out of scope (resolved during grill, not overlooked)

- **Directory permissions.** `~/.atlas` is currently world-readable
  (`drwxr-xr-x`, verified live at umask 022) — session/capture data is
  readable by other local users on a shared machine. `fs.rename()`
  preserves the exact mode (no regression from this migration); the
  `EXDEV` copy fallback defaults to the same 0755. Hardening to 0700 is a
  real, separate, pre-existing finding — backlog it, don't bundle a
  permissions change into a location-only migration (ledger #13).
- **Cross-version split-brain.** An older atlas binary running
  post-migration (stale global install, cached Homebrew formula
  elsewhere, `npx @data-wise/atlas@0.13.0`) doesn't know about
  `resolveConfigDir()` and would resolve to the now-empty `~/.atlas`,
  potentially `mkdir`-ing a fresh empty store there. Accepted as an edge
  case — running mismatched atlas versions against shared data was never
  a supported configuration before this spec either (ledger #16).
- **`ATLAS_DIR` naming collision.** `install.sh` already has its own
  `ATLAS_DIR` env var (default `~/.local/share/atlas`) controlling where
  the *application code* is installed — an entirely different concept
  from `ATLAS_CONFIG`/`ATLAS_DATA_DIR`/XDG (where *user data* lives).
  Confirmed real, not hypothetical — `install.sh:10` documents it.
  Interestingly, `install.sh` independently already chose an
  XDG-data-home-style default for its own unrelated purpose. Add a
  one-line disambiguation to `docs/CONFIGURATION.md` (ledger #19) — no
  code change, since the two env vars don't actually collide in the
  resolver, only in a user's mental model.

## Rollout

1. Land the additive-only change first (env var support, no default
   flip) — already scoped as the small immediate follow-up in the
   XDG report. Independent of everything above; ships without waiting on
   this spec.
2. Implement this spec's resolver + migration command behind normal
   review, in a worktree.
3. Ship with `atlas doctor`'s informational nudge (§4) as the sole
   discovery mechanism — no forced migration, no deprecation warning on
   the legacy path. Revisit whether to eventually deprecate `~/.atlas`
   only after real-world adoption data, not preemptively.

> Interrogated by grill — see [GRILL-xdg-config-migration-2026-07-19.md](GRILL-xdg-config-migration-2026-07-19.md)
