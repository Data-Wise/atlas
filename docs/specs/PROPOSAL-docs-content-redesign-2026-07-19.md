# PROPOSAL: Docs Content Redesign — ADHD-first structure, scenario workflows, v0.14 currency

**Date:** 2026-07-19 · **Status:** approved for implementation (round-table audit: new-user / structure / currency / gap lenses, 4 parallel agents) · **Scope:** docs-only PR, `feature/docs-content-refactor` → dev

Follows the v0.14.0 visual/nav redesign (#95): this pass fixes what pages SAY, how they're organized, and what's missing. 55 files / 16,064 lines audited.

## Findings → actions (prioritized by ADHD-cost)

### P1 — Stale content that misleads TODAY (currency lens)

| Page | Problem | Fix |
|---|---|---|
| TUTORIAL.md:322-360 | Teaches old dashboard keys (`f`,`T`) — misleads every new user | Rewrite Try This Now #7 for the 3-view keymap (mirror REFCARD) |
| CHEATSHEET.md:100-127 | Old keymap + AnalyticsView table; migrate row missing `--status` form | Resolved by the merge below |
| ARCHITECTURE.md (172-890, 9 spots) | 8-view tree + blessed presented as current | Add the same v0.14 banner VISUAL-GUIDE has; correct the view tree |
| ROADMAP.md | "Current: v0.13.1", planned-v0.14 list that isn't what shipped | Rewrite: shipped-in-0.14 section + real v0.15 candidates (deprecation removals, ambient surfaces, catch-obs-bridge on P0) |
| WHAT-S-NEW.md | Stops at 0.13.1 | Add v0.14.0 highlights entry |
| MIGRATION-GUIDE.md | Titled v0.13.0→v0.13.1 | Add v0.14 section: deprecation table + `migrate --status` walkthrough |
| Unverified | Legacy `## Key:` .STATUS examples in TUTORIAL/CONFIGURATION/WORKFLOWS | Check file-by-file; convert current-format examples to atlas/v1 frontmatter, mark intentional legacy ones as legacy |

### P2 — Structure refactor (structure lens)

1. **Merge CHEATSHEET.md into REFCARD.md** (near-duplicates; REFCARD is current) — one quick-ref page, CHEATSHEET deleted from nav + a stub redirect note.
2. **De-duplicate COOKBOOK vs WORKFLOWS** (~60% same ground): WORKFLOWS becomes scenario narratives only; COOKBOOK becomes copy-paste recipes only; explicit cross-links; overlapping content trimmed from COOKBOOK.
3. **Move ANALYTICS-VIEW-UI-SPEC.md → docs/specs/** (design spec misfiled in Reference nav).
4. **RESEARCH-REGISTRY.md orphan**: reconcile with user-guide/tutorials/research-registry.md — keep the tutorial page, fold unique registry-schema content into STATUS-SCHEMA.md/the tutorial, delete the orphan.
5. **CLI-REFERENCE dashboard section** (~165 lines, zero subheadings): add `####` per view/keygroup.

### P3 — New-user pacing (new-user lens)

- installation.md: rank Homebrew as the ONE recommended path; collapse curl/npm/source + completions/man-pages behind `???` disclosures.
- installation.md: fix stale `0.13.1` version-check example.
- TUTORIAL.md: move first Try This Now (project add → session start/end) ABOVE the mermaid/structure preamble; first win in ≤2 min.
- Gloss on first use: capture ("quick inbox note"), breadcrumb ("trail marker for where you got stuck"), registry — one-line inline glosses.
- TUTORIAL "Try This Now #4" template detour: default to `--template minimal` inline, no decision point.

### P4 — New material (gap lens + creative additions)

1. **NEW page `user-guide/workflows/SCENARIOS.md`** (creative centerpiece; nav: Guide → Workflows): narrative scenario walkthroughs, each ≤1 screen, each ending with "Now what?": Morning ritual in 90 seconds (`atlas` → plan → session start) · Context-switch emergency (park → catch → unpark) · "I disappeared for two weeks" recovery (digest → doctor → sync → triage) · Weekly review with evidence (git-delta session ends + stats) · Going ambient (SwiftBar + digest, dashboard-free).
2. **NEW page `INTEGRATIONS-swiftbar` section or `user-guide/swiftbar.md`**: surface contrib/swiftbar on the site (install, screenshot placeholder, refresh-interval tuning) + link from INTEGRATIONS.md and index cards.
3. **New COOKBOOK recipes**: evidence-linked done loop; `migrate --status` on a real repo (dry-run → diff → apply); flow-cli + digest combos; driving atlas from Claude via MCP.
4. **"Which command when" decision table** → into adhd-guide/quick-wins.md (catch vs task vs session note vs park) — fold-in, not a new page.
5. **TROUBLESHOOTING.md**: add "Run `atlas doctor` first" subsection + 5-line "Uninstalling / exporting your data" subsection.
6. **CLAUDE.md** Quick Reference: fix pre-v0.14 dashboard keys line (repo hygiene, not site).

### Killed (audit said no)

- Standalone "which command when" page (fold-in wins) · standalone uninstall page (subsection wins) · new keyboard-card page (REFCARD current) · new FAQ page (TROUBLESHOOTING exists) · touching planning/prompts/reviews scratch dirs (correctly excluded).

## Verification

- `mkdocs build --strict` green; nav count still ≤7 top-level.
- Render-gate greps: no `f=Focus|T=Timeline|z=Zen` outside CHANGELOG/history context; `swiftbar` present in built site; WHAT-S-NEW contains 0.14.0; REFCARD sole quick-ref nav entry.
- Every new/rewritten page ends with a "Now what?" link.

## Recommended first step
→ P1 currency fixes (they actively mislead users of the released version); the rest follows in the same PR.
