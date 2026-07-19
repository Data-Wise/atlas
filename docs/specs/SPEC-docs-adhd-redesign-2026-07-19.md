# SPEC: Docs Website ADHD Redesign

**Date:** 2026-07-19 · **Status:** approved · **Release:** docs-only (deploys on merge to main via docs.yml)

## Goals (ADHD-cost removed)

- Landing page answers "what is this / how do I start" above the fold — no scanning walls of prose.
- Progressive disclosure: the core-5 commands (`atlas`, `catch`, `session start/end`, `flush`) surface first; power/legacy commands live behind collapsed tiers.
- Every page ends with one obvious next step ("Now what?" footer) — no dead ends.

## Deliverables

1. `docs/index.md` rebuilt: hero + 3-command quickstart above fold, card grid (Material `grid cards`) for the 4 doc pillars, dark-mode-safe.
2. `mkdocs.yml` nav restructured to ≤7 top-level items (Home / Get Started / Guide / Reference / Architecture / Integrations / Changelog).
3. Command tiering applied to CLI-REFERENCE.md (core-5 first; power and legacy in collapsible sections/admonitions).
4. "Now what?" next-step footer on every top-level page.
5. Consistent admonition usage (tip/warning) replacing ad-hoc bold-prose callouts.

## Verification

- `mkdocs build --strict` green (existing CI gate).
- Render-gate grep: built site HTML contains the quickstart commands on index, and every nav page contains the "Now what" footer marker.
- Nav count test: `yq '.nav | length' mkdocs.yml` ≤ 7.

## Non-goals

- No theme fork, no custom JS, no content rewrites beyond structure/landing/reference tiering.

## Execution (drivable by /craft:orch:drive or agent fleet)

**Worktree:** `~/.git-worktrees/atlas/feature-docs-adhd-redesign` · **Branch:** `feature/docs-adhd-redesign` (base `dev`) · **PR title:** `docs(site): ADHD-first redesign — landing, nav tiers, next-step footers`

**Verify gate:** `mkdocs build --strict` + render-gate greps quoted in PR body.
