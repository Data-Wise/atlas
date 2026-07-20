# GRILL: XDG Config Directory Migration

**Date:** 2026-07-19
**Target:** [SPEC-xdg-config-migration-2026-07-19.md](SPEC-xdg-config-migration-2026-07-19.md)
**Mode:** Unbounded interrogation (19 branches, 4 milestone checkpoints — user chose "keep going" through the first three).

Convergent interrogation of the XDG migration spec. Adversarial-review findings (marker-file
tie-break gap, `src/mcp/index.js` bug, atomic-move requirement, confirmed `agy-cli` consumer)
were already folded into the spec before this grill started; this session went further into
implementation-level decisions the spec had left open.

## Decision Ledger

| # | Branch | Decision |
|---|---|---|
| 1 | Resolver tie-break when both legacy and XDG dirs exist | Require a JSON migration marker written as the last step of --apply, not bare existsSync. Resolver only prefers XDG if the marker is present (refined by #8: marker format). |
| 2 | Phase 1 scope: single-dir relocation vs full XDG 3-way split | Keep deferred. Ship single-directory relocation now; a true config/data/state split is a separate future spec, not folded in. |
| 3 | Prioritization: proceed now vs hold behind the smaller atlas-init fix | Proceed (not held). User added an explicit requirement: documentation and tests are a hard gate on this deliverable, not optional follow-up (see #7). |
| 4 | Long-running-process guard (atlas-mcp / atlas dash) during --apply | Hard block by default; --force available to override. Named atlas-mcp and atlas dash specifically as the at-risk processes (not launchd jobs, which are short-lived per firing). |
| 5 | Lockfile location for the process guard | OS temp dir, keyed by a hash of the resolved configPath -- not inside the directory being moved (that would reintroduce the non-atomic multi-step risk the move-mechanism design avoids). |
| 6 | --force flag scope | Scoped narrowly to the process-lock guard only. Does NOT bypass the separate refusal when the XDG target directory already exists (a hard data-integrity guard, no override). |
| 7 | Docs/tests as a merge gate | Add an explicit Definition-of-Done checklist to the spec (resolver tests, migrate integration tests, doctor-check test, lockfile-guard test, all doc files) rather than leaving it as prose-only. |
| 8 | Migration marker file format | JSON provenance file ({from, migratedAt, atlasVersion}), not a bare sentinel -- gives atlas doctor something concrete to surface ("migrated from ~/.atlas on <date>"). |
| 9-10 (superseded by 11) | Should atlas doctor --fix auto-trigger the XDG migration | Initial answers assumed --fix directly applies changes and should reuse the guarded migrate path. Corrected by #11 after checking the actual codebase convention. |
| 11 | Correct doctor --fix / --write semantics for XDG remediation | doctor's real convention: --fix alone is preview-only, --fix --write applies. XDG remediation follows the same two-tier pattern -- --fix previews "would migrate to X", --fix --write runs the guarded migrate path from #4-6. Supersedes #9-10's imprecise framing. |
| 12 | doctorFix action result shape for a non-project-scoped action | Add a `type` discriminator field to action objects ('claude-md' \| 'xdg-migration') with a separate print branch for the global XDG action, rather than forcing it into the existing per-project {file, project} shape. |
| 13 | Directory permissions (~/.atlas is drwxr-xr-x, world-readable, verified live on this machine) | Out of scope for this spec. fs.rename preserves the existing mode (no regression); hardening to 0700 is a real, separate, pre-existing finding -- goes to backlog, not bundled into a location-only migration. |
| 14 | Existing test break: test/unit/utils/Config.test.js:68 hardcodes the ~/.atlas default | Fold into the Definition-of-Done checklist (#7) as an explicit line item, rather than tracking separately. |
| 15 | Rollback path for a completed migration | No dedicated --rollback command. Document the manual reversal (move dir back, delete marker) in CONFIGURATION.md as part of the same doc update already planned. |
| 16 | Cross-version risk: an older atlas binary running post-migration would recreate an empty ~/.atlas | Acceptable edge case, document only. Running mismatched atlas versions against shared data was never a supported configuration before this spec either. |
| 17 | ADHD-friendly tone for new user-facing messages | Add explicit tone/wording guidance to the spec for the doctor nudge (informational/celebratory, not alarmist), the lock-guard block (explain why + next action in one line), and --apply's success output -- matching atlas's existing CelebrationHelper / gentle-cues pattern. |
| 18 | CI test isolation for resolveConfigDir()'s env-var precedence | Explicit per-test stubbing of HOME/XDG_CONFIG_HOME/ATLAS_CONFIG/ATLAS_DATA_DIR (save/restore per test) rather than trusting the GitHub Actions runner's ambient environment, which isn't pinned by this repo's own CI workflow and can drift across runner image updates. |
| 19 | ATLAS_DIR (install.sh) vs ATLAS_CONFIG/ATLAS_DATA_DIR naming collision | Confirmed real: install.sh already has its own unrelated ATLAS_DIR env var (controls binary install location, defaults to ~/.local/share/atlas -- itself already XDG-data-home-style). Add a one-line disambiguation to CONFIGURATION.md. |

## Open Questions

None load-bearing remain. Explicitly out of scope (confirmed during grill, not overlooked):
Windows path handling, a true 3-way XDG split (config/data/state), a dedicated rollback command,
directory-permission hardening (0700), and defending against a stale/older atlas binary running
post-migration.

## Handoff

Spec updated with all 19 resolutions. Next: `/craft:plan` (tier 4, plan-orchestrator) to turn the
locked spec into an `ORCHESTRATE-*.md`, or pick it up directly given how thoroughly scoped it
already is.
