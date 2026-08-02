# SPEC: Dashboard Nudge Awareness (`atlas dash` NowView)

**Date:** 2026-08-01
**Status:** Draft — spec only, no implementation yet
**Tracks:** [Issue #115](https://github.com/Data-Wise/atlas/issues/115)
**Follows:** [SPEC-cross-surface-nudges-and-day-activity-2026-08-01.md](SPEC-cross-surface-nudges-and-day-activity-2026-08-01.md) (v0.17.0, shipped) — this is that spec's Design §6 deferral, now scoped.

## Problem

v0.17.0 shipped `atlas nudge` — wall-clock reminders that fire via `launchd` as a macOS
notification, even with every Claude surface closed. That delivery guarantee works and was verified
end-to-end.

But an OS notification is **ephemeral**. Once it's dismissed, auto-dismissed, or missed (screen
locked, headphones on, in a meeting), the only way to rediscover a fired-but-unacked nudge is to
remember to run `atlas nudge ls`.

For a feature whose entire premise is *"the user won't remember on their own,"* requiring them to
remember to check is partly self-defeating. `atlas dash` is this project's always-visible ADHD
surface, and it currently has no awareness of nudges at all.

This was deliberately deferred from #114's v1 scope, not overlooked — the OS notification, not the
dashboard, was v1's delivery mechanism, so this is additive polish rather than a correctness fix.

## Goals

1. A fired-but-unacked nudge is **visible without being sought** whenever `atlas dash` is open.
2. Scheduled-but-not-yet-fired nudges are visible too, but **visually subordinate** — they are
   informational, not a call to action.
3. The user can **clear** fired nudges from the dashboard, without switching to a shell.
4. Zero new DI plumbing, zero change to any v0.17.0 contract.

## Non-goals (explicitly out of scope)

- **Creating or scheduling nudges from the dashboard.** `atlas nudge add` remains CLI-only. The
  dashboard is a read surface plus one narrow write (ack); it is not a nudge manager.
- **Removing nudges (`rm`) from the dashboard.** Destructive, and `rm` is the only way to stop a
  `--daily` nudge — that deserves the deliberateness of typing a command.
- **Per-nudge selection UI.** No cursor over nudges, no second focus ring competing with the
  ProjectList cursor. See Design §2.
- **Surfacing nudges in the Timer or Plan views.** `NowView` is the "what needs me right now"
  surface; the StatusBar carries the count everywhere else.
- **Changing the notification/fire path.** Everything in `launchd`, `osascript`, and
  `GuardsFileNudgeStore` stays exactly as shipped.

## Design

### 1. `useNudges` hook

New file `src/cli/dashboard-ink/hooks/useNudges.ts`, called from `App.tsx` — matching how
`usePendingCaptures` is wired (hook in App, plain props down the tree).

```ts
interface NudgesResult {
  fired: DashboardNudge[];      // state === 'fired' — needs attention
  pending: DashboardNudge[];    // state === 'pending' — informational
  acking: boolean;
  ackError: string | null;
  ackAllFired: () => Promise<void>;
}
```

**This is the first hook in the repo to return an action.** All five existing hooks
(`useProjects`, `useActiveSession`, `useProjectStats`, `usePendingCaptures`, `useAnalytics`) are
pure-read. The deviation is deliberate, and the justification is **refresh ownership**: the hook
owns both the nudge state and the poll interval, so it is the only thing that can invalidate its
own state after a write *and* suppress an in-flight poll (Design §3). Wiring the action in
`App.tsx` instead would require threading a `refreshToken` back into the hook's `useEffect` deps —
strictly more machinery, and it still couldn't suppress a poll that is mid-`await`.

Everything else follows the established hook skeleton exactly (`usePendingCaptures.ts` is the
closest analog):

- `const container = useAtlas()` from `'../lib/AtlasContext.js'` — never a direct `Container` import.
- Module-level `const POLL_INTERVAL = 10000; // 10 seconds`, matching `usePendingCaptures`.
- `useEffect` with `let cancelled = false`, an immediate fetch then `setInterval`, and cleanup that
  sets `cancelled = true` **and** calls `clearInterval`.
- `if (cancelled) return;` after **every** await — including the awaits inside `ackAllFired`, so a
  quit mid-ack doesn't `setState` on an unmounted component.
- Deps `[container]`. `.js` extensions on all relative imports, even in `.tsx`.
- A `useRef` last-good replayed in the `catch`, matching `useProjects`/`useAnalytics`.

**Map entities to plain objects at the boundary.** Never hold a `Nudge` instance in React state and
never call `isOutstanding()`/`toJSON()` from the hook. Add an exported `DashboardNudge` to
`types.ts` (same treatment `Project` already gets):

```ts
export interface DashboardNudge {
  id: string;
  time: string;        // HH:MM
  message: string;
  recurring: boolean;
  state: 'pending' | 'fired' | 'acked';
}
```

This also keeps the test harness tiny — fakes return object literals, never constructed entities.

**Reuse, don't rebuild.** `container.getListNudgesUseCase()` (`Container.js:524`) and
`container.getAckNudgeUseCase()` (`Container.js:506`) are already registered and in the `resolve()`
map. No new DI plumbing is required.

**Splitting is the hook's job.** `ListNudgesUseCase.execute({outstandingOnly: true})` filters on
`isOutstanding()`, which is `state !== 'acked'` — so it returns **pending and fired together**. The
hook must split on `state` itself; `outstandingOnly` alone does not mean "fired."

### 2. Ack semantics

**Ack-all-fired on one key, not one-at-a-time.** There is no cursor over nudges in the dashboard.
Ack-one would require inventing a selection mode inside `NowView` — a second focus ring competing
with the ProjectList cursor — which is a large scope jump for the dashboard's first write path. The
"good enough endings" ethos (cf. `src/utils/SessionCompletionHelper.js`) wants one keystroke to
clear the board; N presses to clear N nudges is exactly the ritual this feature exists to remove.
The banner (Design §4) shows what is being acked, so it isn't a blind bulk action.

**Never ack a `pending` nudge.** `AckNudgeUseCase` calls `scheduler.unschedule()` for non-recurring
nudges. Acking a pending one would silently delete the `launchd` plist for a reminder that has not
yet fired — data loss of a future reminder. `ackAllFired` iterates `fired` only; pending nudges are
strictly display-only in the dashboard.

**Sequential `for...of await`, not `Promise.all`.** Not because of lost updates —
`GuardsFileNudgeStore.update()` re-reads inside the lock and replaces by id, so concurrent acks of
different ids are safe. The reasons are: avoiding contention on the `${guardsFile}.lock` (atomic
`wx` create, backoff, 3s hard timeout), avoiding a burst of `launchctl unload` subprocesses, and
keeping partial-failure reporting deterministic. Sequential is one clean lock cycle per nudge,
milliseconds each in the happy path.

**Partial failure continues, it does not abort.** Wrap each `execute` in its own try/catch and keep
going. The likeliest error is `Nudge <id> not found — cannot ack`, when another surface
(`atlas nudge ack`/`rm`) removed it between the poll and the keypress. That must not stop the other
N−1 acks. The forced refetch afterwards is what makes the UI truthful — anything that failed
reappears.

**No confirmation modal, no success toast.** The nudge already fired and the user already saw it;
`unschedule()` on a one-shot is cleanup of a job that will never fire again, not destruction. A
confirm prompt is friction on the one action the ADHD ethos wants frictionless. A toast would need
a `setTimeout` plus unmount cleanup — a new leak surface — for feedback the optimistic clear already
provides. The banner disappearing *is* the confirmation.

### 3. Post-ack refresh — three parts, all load-bearing

1. **Optimistic clear** (`setFired([])`) before the first await. A 10s stale badge after an explicit
   keypress reads as a broken app. This is the only part the user perceives.
2. **An `ackInFlightRef` checked *after* the await** in the fetch function. This is the subtle bug
   the design exists to prevent: the 10s poll's `await execute()` may already be in flight when the
   key is pressed. It resolves *after* the optimistic clear, carrying pre-ack data, and resurrects
   the badge. Checking the ref before the await does nothing; it must be after.
3. **A forced refetch** once the loop settles, bypassing the guard just cleared. Waiting for the
   next poll tick would leave up to 10s of a UI that is optimistically lying — and possibly partly
   wrong, if some acks failed.

Do not collapse this to "just refetch": `AckNudgeUseCase` shells out to `launchctl unload` per
non-recurring nudge, so the round-trip is hundreds of ms even when everything succeeds.

### 4. Render

| Meaning | Token | default theme |
|---|---|---|
| Fired (needs attention) | `theme.focus.paused` | `yellow` |
| Pending (informational) | `theme.text.muted` + `dimColor` | gray |

**Never red.** `src/cli/dashboard-ink/lib/ThemeContext.tsx:7` states the principle explicitly:
*"ADHD design principle: never use red. Yellow = 'needs attention'."* `theme.focus.paused` is
already the token the sibling inbox badge uses, and is yellow in all five themes.

**Glyphs: `●` fired / `○` pending.** This reuses the vocabulary
`src/adapters/presenters/NudgePresenter.js:23` already defines for the CLI
(`{ pending: '○', fired: '●', acked: '✓' }`), so both surfaces speak the same symbols. **Do not add
an emoji.** `📥` is grandfathered into `ProjectList`, but emoji are double-width and that header
sits in a 35%-wide column already carrying a label, a count, and possibly the inbox badge — a
second wide glyph wraps it.

Three render sites:

- **`ProjectList.tsx`** — two count badges after the existing inbox badge. New optional props
  `firedNudges?: number` / `pendingNudges?: number`, plain numbers exactly parallel to
  `pendingCaptures`, so no type crosses this boundary.
- **`StatusBar.tsx`** — fired count only. Pending is not a status-bar-worthy signal and the bar
  already carries five segments. Uses a new module-level unicode const per that file's own
  convention (it comments that JSX treats `\uXXXX` as literal), unlike `ProjectList`'s literal
  glyphs. **Keep both conventions as they are** rather than unifying them in this change.
- **`NowView.tsx`** — a bordered banner above both panes (so it survives the `e` ecosystem toggle),
  listing up to 3 fired nudges as time + truncated message (reuse the existing `trunc` at
  `NowView.tsx:46`), a `+N more` line beyond that, the `a: ack all` hint (or `acking…` while in
  flight), and `ackError` when set. A bare count doesn't tell you *what* you're being nudged about,
  and acking blind is bad.

### 5. Keybinding: `a` in the `now` scope

Verified free. The `now` scope currently binds `j / k / ↓ / ↑`, `Enter`, and `e`; globals (which
dispatch first) are `1, n, 2, t, 3, p, Tab, q, ?`. `a` *is* bound in the `plan` scope, which
`src/cli/dashboard-ink/lib/keymap.ts` explicitly permits — its header states a key must be unique
*within* a scope and that cross-scope reuse is expected.

Register it in `NOW_KEYS` as `{ key: 'a', description: 'Ack all fired nudges' }`. That file is the
single source of truth and the help overlay (`?`) renders straight from it, so registering is what
documents the key. `test/unit/cli/dashboard-ink/lib/keymap.test.tsx` already asserts per-scope
uniqueness via `it.each(allScopes())`, so the new binding is covered mechanically — **no new keymap
test is needed**.

The handler sits in `NowView`'s existing `useInput`, behind the same `if (!isActive) return;` guard
that `e` and `q` already use, and additionally no-ops when there are no fired nudges.

### 6. Hazards — three silent failures a reviewer would otherwise "fix" back into bugs

1. **In-flight poll resurrects a cleared badge.** The single most likely bug in this feature. The
   fix is checking `ackInFlightRef` *after* the await in the fetch function (Design §3.2). Moving
   that check before the await, or deleting it as redundant, reintroduces the bug with no test
   failure unless the concurrency test exists.
2. **Double-press race.** Two `a` presses in the same tick both observe `acking === false` if the
   guard is React state. The check-and-set **must** be on a ref, synchronously, before any await —
   `acking` state exists for rendering the `acking…` label, not for guarding.
3. **Layout reparent.** `NowView`'s root is currently
   `<Box flexDirection="row" width="100%" height="100%">` (line 226). Adding the banner requires
   wrapping in a column; the inner row must then use `flexGrow={1}` and **drop `height="100%"`**.
   Keeping `height="100%"` on a row nested in a `height="100%"` column overflows the terminal and
   Yoga clips from the bottom — silently losing ProjectList's focus-hint footer.

**Deliberate deviation — ack errors do not go to stderr.** The five existing hooks write poll
errors via `process.stderr.write('[atlas-dash] useX error: ...')`. `atlas dash` spawns with
`stdio: 'inherit'`, so those writes land inside the rendered frame. That is tolerable for
background poll failures but not for a user-triggered action, which is far likelier to be hit.
Ack failures therefore surface as `ackError` UI state in the banner; **poll** failures in this hook
keep the stderr convention. State this in the hook's header comment so it reads as intentional.

Behavioral edges to accept and document:

- `a` is inert when the sidebar holds focus (`isActive: false` in SPLIT/TRIPLE) and inert in the
  Timer/Plan views (`NowView` is unmounted, so no handler is registered). Consistent with how `e`
  and `q` already behave. The StatusBar chip stays visible but unactionable there; `1`/`n` returns.
- The help overlay swallows `a` correctly by construction — `App` renders `HelpOverlay` *instead of*
  the LayoutManager subtree, so `NowView` is unmounted. Re-verify if anyone refactors the overlay to
  render on top rather than instead of.
- A `--daily` nudge acked today correctly reappears tomorrow: `FireNudgeUseCase` sets
  `state: 'fired'` unconditionally from whatever the stored state was, so acking does not suppress
  the next fire. Reviewers will ask about this.
- Fresh machine with no `guards.json`: `_readFile` returns `{}`, `list` returns `[]`, no badges. No
  special-casing needed.
- Worst case ack latency is N nudges × up to 3s lock timeout each. The UI stays responsive since
  all of it is async, but `setAcking(false)` must be in a `finally` or the label sticks forever.

## Acceptance Criteria

- [ ] A fired-but-unacked nudge is visible in `atlas dash` without running any command.
- [ ] Pending and fired nudges are visually distinguishable, with pending clearly subordinate.
- [ ] Pressing `a` in the Now view acks every fired nudge and leaves pending nudges untouched.
- [ ] The badge and banner clear on the next frame after `a`, not on the next 10s poll.
- [ ] An in-flight poll resolving after an ack does not resurrect the cleared badge.
- [ ] A failing ack does not prevent the remaining nudges from being acked, and surfaces in the UI.
- [ ] `guards.json`'s `guards` key is untouched by any dashboard operation (inherited from
      `GuardsFileNudgeStore`, but assert it end-to-end since this is a new caller).
- [ ] `?` help overlay lists the `a` binding without a hand-written entry.
- [ ] No color added is red; no double-width glyph added to the sidebar header.

## Test Plan

Runner note: `.test.tsx` under `test/unit/` runs on **jest** (`@swc/jest`, with
`moduleNameMapper` stripping `.js` from relative TS imports, so hook files need no special config);
vitest covers only `test/e2e/**/*.e2e.tsx`.

**Build the repo's first hook-test harness.** No hook tests exist today and no fake container
exists, but the harness is ~15 lines: `AtlasProvider` is already exported and typed `any`, so a
fake is just an object exposing `getListNudgesUseCase`/`getAckNudgeUseCase` that return
`{ execute }` jest mocks, wrapped around a small probe component that renders the hook's result as
text. This is worth building: every real risk in this feature (the poll/ack race, sequencing,
partial-failure containment) lives in the hook and is **unreachable** from a component test, since
`NowView` receives plain props. Indirect coverage would test the JSX and leave the hazard untested.

Hook tests — `test/unit/cli/dashboard-ink/hooks/useNudges.test.tsx` (new):

1. Splits `fired` vs `pending` by `state` from a single `outstandingOnly: true` call.
2. A rejecting `execute` never throws out of the hook, writes the `[atlas-dash] useNudges error:`
   line to stderr (spy on `process.stderr.write`), and replays last-good rather than blanking.
3. `ackAllFired()` calls ack once per fired nudge, **in order**, with the right ids, and **never**
   for a pending nudge — assert on `mock.calls.map(c => c[0].id)`.
4. One rejecting ack does not stop the rest; `ackError` is set; the other ids still get acked.
5. Unmount clears the interval — advance past `POLL_INTERVAL` after `unmount()` and assert the list
   mock's call count did not grow.
6. A second `ackAllFired()` while the first is in flight is a no-op (resolve the ack from a deferred
   promise, call twice, assert one ack per nudge total).

Component tests — extend `test/unit/cli/dashboard-ink/components/views/NowView.test.tsx`:

7. Banner renders time + message for fired nudges; absent when there are none.
8. `stdin.write('a')` calls the handler when `isActive` and fired is non-empty; not called when
   `isActive: false`; not called when fired is empty. (Existing convention: `await new
   Promise(r => setTimeout(r, 10))` after the write.)
9. `ProjectList` header shows both `●2` and `○1` when given both counts.

**Use real timers with short awaits**, matching every existing suite — mixing
`jest.useFakeTimers()` with Ink's own render scheduling is a known flake source. Call `unmount()` in
**every** test: `jest.config.js` sets `forceExit: true`, which would mask a leaked 10s interval as
later flake rather than failing the build.

## Documentation Scaffold

- `CLAUDE.md` — the Quick Reference "Dashboard keys" line enumerates bindings; add `a`.
- `docs/CLI-REFERENCE.md` — the dashboard section, if it lists keys.
- `CHANGELOG.md` `[Unreleased]` — mirror entry.

## Risks

| Risk | Mitigation |
|---|---|
| First dashboard write path — bugs here corrupt shared `guards.json` | All writes go through the already-locked, atomic-rename `GuardsFileNudgeStore`; no new write code is introduced |
| Poll/ack race resurrecting cleared state | `ackInFlightRef` checked after the await + dedicated test #6 |
| Layout reparent silently clipping the sidebar footer | Called out in Design §6.3; verify visually in a live `atlas dash`, not just via `lastFrame()` |
| First hook test could sprawl into a test framework | Harness is a fake object + probe component, ~15 lines, no filesystem, no entities |

## Next Step

Implementation in a feature worktree, following this repo's standard pre-PR rules: full suite run
in the tree the PR ships from, plus a live `atlas dash` exercise (schedule a nudge, let it fire,
confirm the banner appears and `a` clears it) — a TUI write path is exactly the kind of change
`lastFrame()` assertions cannot fully verify.
