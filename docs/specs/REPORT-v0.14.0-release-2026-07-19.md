# Report: v0.14.0 Release Plan

> Restructured from [PROPOSAL-v0.14.0-release-2026-07-19.md](PROPOSAL-v0.14.0-release-2026-07-19.md) for scanning. No new content — every claim traces to the source doc.

**Status:** proposed (awaiting go) — source doc, 2026-07-19; base dev `66fa38b`

## tl;dr

| Metric | Value |
|---|---|
| Feature PRs in scope | 6 (#94–#99) |
| Version call | 0.14.0 (minor) |
| Pipeline steps | 6 (~30 min) |
| Pre-flight evidence | 96 suites / 1,833 tests + strict docs build |
| Deprecated commands (warn-only) | 5 → removal v0.15 |
| Held out | feature/catch-obs-bridge (gated on obs `write`) |

## Scope — what ships

- **#94 + #99 (TUI):** −7.5k LOC dead blessed code; 8→3 views (Now/Timer/Plan), one timer, keymap + `?` overlay; `blessed` deps dropped — `atlas dash` keys change (CHANGELOG table).
- **#96 (.STATUS):** `atlas/v1` canonical schema, unified parser, refuse-don't-drop writer, `atlas migrate --status` — breaking on write path only.
- **#97 (workflow):** bare `atlas` digest; evidence-linked `session end`; `status --complete` evidence; deprecation warnings.
- **#95 (docs):** ADHD site redesign — deploys automatically on merge to main.
- **#98 (contrib):** SwiftBar ambient plugin — opt-in, no runtime impact.
- Plus 5 specs + 2 proposals (docs-only).

## Decision — version call

- **Concept:** release everything on dev as one coherent ADHD-redesign release, versioned 0.14.0.
- **Issue:** the .STATUS schema change is breaking — does it force a bigger version?
- **Solution:** minor (0.14.0): breaking only on an explicit write path, with a migration tool, under pre-1.0 semver; deprecations are warn-only.
- **Impact:** `sync` against legacy .STATUS files warns/refuses on write paths — release notes must lead with `atlas migrate --status` (dry-run first); the 15-repo research rollout stays a separate coordinated proposal. flow-cli consumers unaffected (JSON contract snapshot-locked in #97).

## Release checklist (source order)

1. Pre-flight on dev: full suite + `mkdocs build --strict` + stale-version grep.
2. Stamp: package.json → 0.14.0; CHANGELOG `[Unreleased]` → `[0.14.0]`; .STATUS.
3. Release PR `dev → main`, **merge-commit** (keeps main an ancestor of dev).
4. Verify main CI green, then tag `v0.14.0` + GitHub release.
5. Automatic on publish: Homebrew formula update + docs deploy — verify both, brew smoke test.
6. Post-release: FF-sync dev; update memory/.STATUS; announce deprecation table prominently.

## Risks → mitigations

| Risk | Mitigation |
|---|---|
| Dogfood/e2e count shifts (TimelineView dropped, analytics e2e deleted) | Already flagged in #99; note in release body, not blocking |
| Legacy .STATUS write paths now warn/refuse | Release notes lead with `atlas migrate --status`; research rollout separate |
| Dash keybinding muscle-memory break | CHANGELOG before/after table + REFCARD; acceptable for a minor |

## Next steps

1. Say **"release"** → execute steps 1–6 end-to-end (stop only on red CI) — rationale: dev/main divergence widens the docs/Homebrew drift window; everything on dev is already green and evidence-backed.
