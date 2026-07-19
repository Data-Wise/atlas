# PROPOSAL: v0.14.0 Release Plan

**Date:** 2026-07-19 · **Status:** proposed (awaiting go) · **Base:** dev `66fa38b`, 6 feature PRs ahead of main (v0.13.1)

## Scope (what ships)

Everything merged to dev today — a coherent ADHD-redesign release:

| PR | Change | User-visible |
|---|---|---|
| #94 + #99 | TUI: −7.5k LOC dead blessed code; 8→3 views (Now/Timer/Plan), one timer, keymap + `?` overlay; `blessed` deps dropped | `atlas dash` looks/keys differently (CHANGELOG has before/after table) |
| #96 | .STATUS `atlas/v1` canonical schema, unified parser, refuse-don't-drop writer, `atlas migrate --status` | **Breaking on write path only** — legacy files refuse gateway writes until migrated; reads unaffected |
| #97 | Bare `atlas` digest; evidence-linked `session end`; `status --complete` evidence; deprecation warnings (crumb/trail/park/unpark/parked → removal v0.15) | New default command; stderr deprecation notices |
| #95 | Docs-site ADHD redesign | Deploys automatically on merge to main |
| #98 | SwiftBar ambient plugin (`contrib/swiftbar/`) | Opt-in, no runtime impact |

Plus 5 specs + 2 proposals (docs-only). **Held out:** `feature/catch-obs-bridge` (gated on obs `write`).

**Version call: 0.14.0** (minor) — the schema change is breaking only on an explicit write path with a migration tool and pre-1.0 semver; the deprecations are warn-only. No case for 1.0/0.15-skip.

## Release checklist (standard pipeline, ~30 min)

1. **Pre-flight on dev:** full suite green (last runs: Jest 96 suites / 1,833 + Vitest 18 + dogfood 138 + 40); `mkdocs build --strict`; grep for stray `0.13.1` references after bump.
2. **Stamp:** `package.json` → 0.14.0; CHANGELOG `[Unreleased]` → `[0.14.0] - <date>` (content already written by the 6 PRs); `.STATUS` phase/version.
3. **Release PR:** `dev → main`, title `Release: v0.14.0`, **merge-commit** (not squash — keeps main an ancestor of dev).
4. **Verify CI green on main**, then tag `v0.14.0` + GitHub release (notes from CHANGELOG).
5. **Automatic on publish:** Homebrew formula update (homebrew-release.yml) + docs deploy (docs.yml) — verify both runs, then `brew upgrade atlas` smoke test.
6. **Post-release:** FF-sync dev; update memory/`.STATUS`; announce deprecation table in release notes prominently (flow-cli consumers unaffected — JSON contract snapshot-locked, verified in #97).

## Risks & mitigations

- **Dogfood/e2e count shifts** (TimelineView dropped, analytics e2e deleted) — already flagged in #99; not release-blocking, note in release body.
- **`sync` against legacy .STATUS files now warns/refuses on write paths** — release notes must lead with "run `atlas migrate --status` (dry-run first)"; the 15-repo research rollout is a separate coordinated proposal, not part of this release.
- **Muscle-memory break in dash keybindings** — CHANGELOG table + REFCARD updated; acceptable for a minor.

## Recommended Next Step
→ Say **"release"** and I'll execute steps 1–6 end-to-end (stopping only if CI goes red), because the longer dev and main diverge the bigger the docs/Homebrew drift window — everything on dev is already green and evidence-backed.
