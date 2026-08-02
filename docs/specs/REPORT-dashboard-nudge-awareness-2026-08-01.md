# Report: Dashboard Nudge Awareness (`atlas dash` NowView)

> Source: [SPEC-dashboard-nudge-awareness-2026-08-01.md](SPEC-dashboard-nudge-awareness-2026-08-01.md)
> Tracks: [Issue #115](https://github.com/Data-Wise/atlas/issues/115)
> Follows: [SPEC-cross-surface-nudges-and-day-activity-2026-08-01.md](SPEC-cross-surface-nudges-and-day-activity-2026-08-01.md) (v0.17.0, shipped)

**Status:** Shipped (2026-08-01) — implemented in `feature/dash-nudge-awareness`, merged via PR #118 (`2099a2b`), released in v0.18.0 (PR #119 → main, tagged `v0.18.0`). See `.STATUS`'s 2026-08-01 Resume Context entry for the session narrative.

## tl;dr

| Metric | Value |
|---|---|
| Goals | 4 |
| Non-goals (explicit) | 5 |
| Design decisions | 7 |
| Hazards named | 3 |
| Acceptance criteria | 9 |
| Test cases planned | 9 (6 hook + 3 component) |

## Problem & Scope

**Problem:** v0.17.0's `atlas nudge` delivers reminders via a `launchd`-fired OS notification — verified working end-to-end. But an OS notification is ephemeral: once dismissed or missed, the only way to rediscover a fired-but-unacked nudge is to remember to run `atlas nudge ls`. For a feature whose entire premise is "the user won't remember on their own," requiring them to remember to check is partly self-defeating. `atlas dash` — the project's always-visible ADHD surface — had no nudge awareness at all. Deliberately deferred from #114's v1 scope, not overlooked.

**Goals:**
1. A fired-but-unacked nudge is visible without being sought whenever `atlas dash` is open.
2. Pending (not-yet-fired) nudges are visible too, but visually subordinate — informational, not a call to action.
3. The user can clear fired nudges from the dashboard, without switching to a shell.
4. Zero new DI plumbing, zero change to any v0.17.0 contract.

**Non-goals (explicit):**
- Creating or scheduling nudges from the dashboard — `atlas nudge add` stays CLI-only.
- Removing nudges (`rm`) from the dashboard — destructive, deserves the deliberateness of a typed command.
- Per-nudge selection UI — no second focus ring competing with the `ProjectList` cursor.
- Surfacing nudges in the Timer or Plan views — `NowView` owns "what needs me right now"; the StatusBar chip carries the count everywhere else.
- Changing the notification/fire path — `launchd`, `osascript`, `GuardsFileNudgeStore` stay exactly as shipped.

## Design Decisions

> **Concept:** `useNudges` is the first hook in the repo that returns a write action (`ackAllFired`), not just read data.
> **Issue:** Refresh ownership — only the hook itself can invalidate its own state after a write *and* suppress a poll already in flight.
> **Solution:** The hook owns both the poll interval and `ackAllFired`; wiring the action in `App.tsx` instead would need a `refreshToken` threaded into `useEffect` deps and still couldn't suppress a poll mid-`await`.
> **Impact:** `App.tsx` stays a thin wiring layer; the poll/ack race guard (below) becomes possible at all.

> **Concept:** Pressing `a` acks every fired nudge at once, not one at a time.
> **Issue:** No cursor exists over nudges in the dashboard; per-nudge selection would need a second focus ring competing with `ProjectList`'s cursor.
> **Solution:** `ackAllFired` iterates `fired` only, sequentially, with the banner showing what's being acked.
> **Impact:** One keystroke clears the board — matches the "good enough endings" ADHD ethos instead of N presses for N nudges.

> **Concept:** `ackAllFired` only ever touches nudges with `state === 'fired'` — pending nudges are strictly display-only.
> **Issue:** `AckNudgeUseCase` unschedules non-recurring nudges; acking a pending one would silently delete the `launchd` plist for a reminder that hasn't fired yet — data loss of a future reminder.
> **Solution:** The hook filters to `fired` before iterating; pending is never passed to the ack use case.
> **Impact:** No dashboard action can cause nudge data loss.

> **Concept:** Acks run sequentially (`for...of await`), not via `Promise.all`.
> **Issue:** Not a correctness issue — `GuardsFileNudgeStore.update()` is lock-safe per-id — but parallel acks would contend on `guards.json`'s lock and burst `launchctl unload` subprocesses.
> **Solution:** One ack at a time, each wrapped in its own try/catch so a failure doesn't abort the rest.
> **Impact:** Deterministic partial-failure reporting; milliseconds each in the happy path.

> **Concept:** Post-ack refresh is three parts: optimistic clear → an `ackInFlightRef` checked *after* the await → a forced refetch.
> **Issue:** A poll's `await execute()` may already be in flight when `a` is pressed. It resolves *after* the optimistic clear, carrying pre-ack data, and would resurrect the badge if unguarded.
> **Solution:** The in-flight-poll guard must be checked *after* the await, not before — checking before does nothing.
> **Impact:** Named in the SPEC's own Hazards section as "the single most likely bug in this feature" — this is what prevents it.

> **Concept:** Fired = yellow (`theme.focus.paused`) + `●`; pending = muted gray + `○`; no emoji.
> **Issue:** This project's stated design principle is "never use red — yellow means needs attention"; the sidebar header column is already narrow.
> **Solution:** Reuse the existing inbox badge's yellow token and the CLI's own `NudgePresenter.js` glyph vocabulary (`{pending:'○', fired:'●', acked:'✓'}`).
> **Impact:** Dashboard and CLI speak the same visual language; no double-width glyph wraps the sidebar header.

> **Concept:** `a` is bound to "ack all fired nudges" in the `now` keymap scope only.
> **Issue:** `a` is already bound in the `plan` scope (toggle analytics) — needed to confirm cross-scope reuse was safe.
> **Solution:** Verified free within `now`; `keymap.ts`'s own header explicitly permits the same key meaning different things in different scopes.
> **Impact:** Registered in `NOW_KEYS`; the `?` help overlay documents it automatically — no hand-written help entry needed.

## Hazards & Edge Cases

Three silent failures the SPEC calls out as things "a reviewer would otherwise 'fix' back into bugs":

| Finding | Problem | Fix |
|---|---|---|
| In-flight poll resurrects a cleared badge | The single most likely bug in this feature — moving the guard before the await, or deleting it, reintroduces the bug with no test failure unless a concurrency test exists | Check `ackInFlightRef` *after* the await in the fetch function; verified during implementation with a planted-defect test |
| Double-press race | Two `a` presses in the same tick both observe `acking === false` if the guard is React state | Check-and-set on a ref, synchronously, before any await — `acking` state is only for the `acking…` label |
| Layout reparent | `NowView`'s root row used `height="100%"`; adding a banner above it in a column would overflow and Yoga would silently clip `ProjectList`'s footer | Wrap root in a column, change the inner row to `flexGrow={1}`, drop `height="100%"` |

**One deliberate deviation:** ack errors surface as `ackError` UI state, not stderr (unlike the other five hooks) — `atlas dash` runs with `stdio: 'inherit'`, so a stderr write from a user-triggered action would land inside the rendered frame.

**Edge cases accepted and documented:** `a` is inert when the sidebar holds focus or in Timer/Plan views (consistent with `e`/`q`); the help overlay swallows `a` correctly since `NowView` unmounts underneath it; a `--daily` nudge acked today correctly reappears tomorrow; a fresh machine with no `guards.json` shows no badges, no special-casing needed; worst-case ack latency is N × up to 3s lock timeout, mitigated by `setAcking(false)` living in a `finally`.

## Verification

**Acceptance criteria** (source doc's checkboxes are unticked even though shipped — preserved as-written, not editorialized):
- [ ] Fired-but-unacked nudge visible without running any command
- [ ] Pending vs. fired visually distinguishable, pending subordinate
- [ ] `a` acks every fired nudge, leaves pending untouched
- [ ] Badge/banner clear on the next frame, not the next 10s poll
- [ ] In-flight poll resolving after an ack doesn't resurrect the badge
- [ ] A failing ack doesn't block the rest, and surfaces in the UI
- [ ] `guards.json`'s `guards` key untouched by any dashboard operation
- [ ] `?` help overlay lists `a` without a hand-written entry
- [ ] No red added; no double-width glyph added to the sidebar header

**Test plan** — repo's first hook-test harness (fake container + probe component, ~15 lines):
1. Splits `fired`/`pending` by `state` from one `outstandingOnly: true` call
2. A rejecting poll never throws, logs to stderr, replays last-good
3. `ackAllFired` acks once per fired nudge, in order, never for pending
4. One rejecting ack doesn't stop the rest; `ackError` set
5. Unmount clears the interval
6. A second `ackAllFired` while one is in flight is a no-op
7. Banner renders time+message for fired nudges, absent when none
8. `a` keypress calls the handler only when active and fired is non-empty
9. `ProjectList` header shows both `●N`/`○N` badges together

**Risks:**

| Risk | Mitigation |
|---|---|
| First dashboard write path — bugs could corrupt shared `guards.json` | All writes go through the already-locked, atomic-rename `GuardsFileNudgeStore`; no new write code introduced |
| Poll/ack race resurrecting cleared state | `ackInFlightRef` checked after the await + dedicated test #6 |
| Layout reparent silently clipping the sidebar footer | Called out explicitly in the hazards list; verify visually in a live `atlas dash`, not just via `lastFrame()` |
| First hook test could sprawl into a test framework | Harness kept to a fake object + probe component, no filesystem, no entities |

## Outcome

The SPEC's own "Next Step" (written pre-implementation) called for: implementation in a feature worktree following standard pre-PR rules, plus a live `atlas dash` exercise — scheduling a real nudge, letting it fire, confirming the banner and `a` clear it — since a TUI write path is exactly what `lastFrame()` assertions can't fully verify.

That has since happened: all 8 implementation tasks landed with tests (including a planted-defect check on the poll-race guard), a live E2E was run against a real `launchd` fire, and the work merged as PR #118 (`2099a2b`) and shipped in v0.18.0 (PR #119 → main, tagged `v0.18.0`).
