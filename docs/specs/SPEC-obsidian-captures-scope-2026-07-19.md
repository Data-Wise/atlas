# SPEC: Obsidian Scope Lock — captures only, gated on P0

**Date:** 2026-07-19 · **Status:** approved (grilled 2026-07-19) · **Release:** contingent — activates when obs ships `write` (P0); no v0.14 critical-path dependency
**Parent:** SPEC-ecosystem-integration-gaps-2026-06-20.md (D1–D6 remain locked; this spec narrows execution scope)

## Decision

Re-grilled 2026-07-19 against the option space (captures-only / captures+boards / Obsidian-first-everything / FS-direct decoupling): **captures only, on P0.**

- When `obs write` ships (confirmed absent in obsidian-cli-ops v4.3.0), atlas captures write through to the vault (D2) and triage retires to Obsidian (D3), via the already-merged scaffold (ObsidianGateway, FlushCapturesUseCase, `atlas flush`, pending-flush/flushed states) plus the inert write-through in CaptureIdeaUseCase.
- **Everything else stays CLI permanently:** sessions, timers, .STATUS sync, plan/digest, boards/TUI. The Dataview-hub idea (D7) and any vault status boards are explicitly out of scope until a future spec.
- FS-direct vault writing stays rejected (IPC-bridge decision stands).

## Goals

- **One capture inbox** (the vault), ending capture scatter (D1) — without betting any atlas release on an unshipped upstream.
- **Bounded atlas identity:** atlas = state/session/verification engine; Obsidian = thought storage. Cost removed: deciding where a thought lives.

## Deliverables (on P0 activation, target version assigned then)

1. Container injects ObsidianGateway into CaptureIdeaUseCase (delete the D5 hold comment); `catch` output reflects flushed/pending-flush.
2. Flush trigger decision (parent spec open question 6) resolved as: **attempt on every `catch` + auto-flush at `session start` + manual `atlas flush`** — no timer daemon.
3. TriageInbox retirement (D3): `inbox --triage` prints deprecation pointing at the vault; use case removed in the following minor.
4. Vault targeting (open question 2) resolved as: config key `preferences.obsidian.vault`, `--vault` per-call override.
5. Docs: CLI-REFERENCE (catch/flush/inbox), INTEGRATIONS.md narrative, MCP-SERVER.md if capture tools change.

## Verification

- **Contract E2E (required before wiring, per e2e-before-pr):** live transcript against the real shipped `obs write` — success path (note lands in vault at expected path), obs-not-running path (capture → pending-flush, later `atlas flush` drains it), and injection-safety check (capture text containing quotes/`$()` arrives verbatim — execFile guarantee).
- **Regression guard:** the audit's blackhole scenario as a test — with gateway injected and obs failing, captures MUST remain visible in inbox/plan/digest (i.e., pending-flush items count as inbox-visible until D3 executes). This inverts the current strict `status==='inbox'` filters and is the one code change safe to land pre-P0.
- **Acceptance criteria:** zero captures lost across 100 catch calls with obs killed mid-run (crash-consistency loop test); `atlas flush` idempotent (second run flushes 0).

## Non-goals

- No vault boards, no Dataview hubs, no session/plan data in the vault.
- No obs-side work in this repo; P0 is tracked in obsidian-cli-ops.
- No speculative wiring before P0 ships (the 2026-07-19 near-miss — wiring would have blackholed every capture — is the standing reason).

## Migration / compat

- Existing inbox captures stay atlas-side; only new captures route through. An optional one-shot `atlas flush --backfill-inbox` may export historical inbox items to the vault — decided at activation time.
- flow-cli `inbox --count` semantics preserved (pending-flush counts as inbox until D3 executes).

## Release mapping

- **Pre-P0 (v0.14.0):** land the pending-flush-visible-in-inbox regression guard only. Hold the PR for feature/catch-obs-bridge until then per .STATUS plan.

### Execution — pre-P0 slice (drivable now)

**Worktree:** existing `~/.git-worktrees/atlas/feature-catch-obs-bridge` · **Branch:** `feature/catch-obs-bridge` · **PR title (when released from hold):** `feat(capture): obs write-through scaffold + pending-flush inbox guard`

| # | Task | Acceptance |
|---|---|---|
| 1 | Inbox-visibility: GetInbox/PlanDay/usePendingCaptures treat `pending-flush` as inbox-visible | blackhole regression test: gateway injected + obs failing → capture still in inbox/plan/digest |
| 2 | flow-cli semantics: `inbox --count` includes pending-flush | count test |
| 3 | Idempotent flush loop test (100 catches, obs down, flush drains once) | crash-consistency test green |

**Verify gate:** `npm test` in the worktree, counts in commit message. Remaining Execution rows (wire-through, triggers, TriageInbox retirement) activate only on P0 — do not drive them before obs ships `write`.
- **P0+1 atlas minor:** wire write-through, flush triggers, deprecation.
- **P0+2 atlas minor:** remove TriageInbox.
