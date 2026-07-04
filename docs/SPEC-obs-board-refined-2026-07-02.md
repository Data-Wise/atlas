# Obsidian Research Board — Refined Proposal

> Based on `PHASE-3-research-registry-plan.md` Epic B + `GAP-ANALYSIS-research-registry.md` +
> `SPEC-research-scheduling-pipeline.md`. Already shipped as obs #60/#61 but has refinement surface.

> **Fact-checked against live state 2026-07-04.** This draft sat untracked/uncommitted since
> 2026-07-02. Verification found the general board mechanism shipped further than this doc
> assumed (correct file path, launchd job already installed), but one target (§ "Two board
> targets" #2) conflicted with an existing, separately-scheduled mechanism this doc didn't know
> about. See "Verification findings" below before treating any "Files to touch" entry as
> greenfield work.
>
> **Scope decision (2026-07-04): Target 2 is dropped.** `obs board` will not write
> `MediationVerse_Dashboard.md`. That file stays exclusively owned by
> `mediationverse-status-sync.py` (R-package ecosystem, `~/projects/r-packages/scripts/`) on its
> own schedule. Rationale: the two systems already sit on opposite sides of a real ecosystem
> boundary — CRAN-cascade/R-package dependency logic vs. general dev-tools vault planning — that
> doesn't need bridging. A read-only parity-check variant was considered and rejected: it would
> require `obs board` to independently re-derive CRAN dependency-ordering logic just to compare
> against the other script's output, creating ongoing dual-maintenance for a benefit (drift
> detection) the existing script hasn't shown a need for. `obs board`'s scope is now
> `_ACTION-BOARD.md` only.

## Verification findings (2026-07-04)

| Draft claim | Verified reality |
|---|---|
| Implementation file: `src/python/research/board.py` | **Wrong path** — actual file is `src/python/core/board.py` (obsidian-cli-ops v4.3.0, shipped 2026-07-01) |
| "Scheduled Monday 09:15 launchd job" (rough edge, unwired) | **Already done.** `com.data-wise.obs-board-refresh.plist` exists, correctly scheduled `Weekday=1 Hour=9 Minute=15`, calls `obsidian-cli-ops/scripts/board-refresh.sh` (exists, executable). Just named differently than this doc anticipated (`obs-board-refresh`, not `research-sync-board`). |
| Target 2: `obs board` should write `MediationVerse_Dashboard.md` | **Conflicts with an existing mechanism.** `MediationVerse_Dashboard.md` is hand-built and already auto-synced by `~/projects/r-packages/scripts/mediationverse-status-sync.py`, on its own dedicated launchd job (`com.data-wise.mediationverse-status-sync`, Mon 9am — a **different** job than `obs-board-refresh`'s Mon 9:15am). If `obs board` also writes this file, two independent mechanisms race to own the same output. **This target needs to be dropped or explicitly rescoped as read-only parity-check, not a second writer**, before any implementation touches it. |
| "`--ai` opt-in TL;DR... contract undefined" | Confirmed still true — no `--ai` flag anywhere in `obs_cli.py`/`obs.zsh`. Genuinely open. |
| "Cross-repo JSON contract test... should be committed" | Confirmed still true — `tests/fixtures/atlas-snapshot.json` does not exist. Genuinely open. |
| "Research HUB status block — Deferred (Decision 3)" | Unchanged; still correctly out of scope, no new finding. |
| "~4 repos still missing `kind:`/`tasks:` headers (collider, product-of-three, sensitivity, sequential)" | **Mostly stale.** `kind: manuscript` is now present in collider, sensitivity, **and** "product of three" (all 3 checked). `tasks:` is still missing in the two checked (collider, sensitivity). No repo named "sequential" exists under `~/projects/research/` — likely renamed, merged, or never created; needs a name correction, not more header-writing. |
| (Not in original draft) | An unrelated `com.data-wise.atlas-sync` launchd job also exists — worth knowing about if debugging schedule conflicts, though it's outside this doc's scope. |

## Architecture

```
atlas project list --kind --format json
  └──► obs research board (Python)
         ├── adapter: reads JSON (or .STATUS-direct fallback)
         ├── ranker: stable sort (priority → progress desc → id)
         ├── renderer: markdown via templates
         └── writer: marker-bounded atomic (<!-- obs:board:start/end -->)
                └──► vault: _ACTION-BOARD.md
```

*(`MediationVerse_Dashboard.md` removed from this diagram — see "Scope decision" above.
`obs board` has exactly one output target.)*

## Board target

### `_ACTION-BOARD.md` — Manuscripts & Programs

```
## 🎯 Research Action Board            generated: 2026-06-25
TL;DR — deterministic summary

### ▶ Act now (ranked by priority × urgency)
| # | Item | Kind | Effort | Risk | Why now |
| 1 | medrobust submit_cran() | package | 10m | 🟢 | unblocks cascade |
| 2 | collider R&R upload | manuscript | 1-2d | 🔴 Aug 7 | hard deadline |

### 📊 Manuscripts
| Paper | Venue | Status | Progress | Next |
| collider | AMPPS | 🔴 R&R | ███████░░ 95% | upload revision |

### 📦 Programs (proposals: done/total)
| Program | Venue | Status | Progress | Proposals | Next |
| pmed-modern | Epi/JASA | 🟢 active | ███████░░ 92% | 0/5 | advance 05 |
```

*(The former "Target 2" `MediationVerse_Dashboard.md` CRAN-cascade table is no longer part
of this spec's scope — that view continues to live exclusively in
`mediationverse-status-sync.py`, unchanged.)*

## Design rules

| Rule | Detail |
|------|--------|
| **Deterministic** | Zero diff on re-run with unchanged data. No timestamps inside markers. Stable sort. |
| **Marker-bounded writes** | Only mutate `<!-- obs:board:start -->` ... `<!-- obs:board:end -->`. Hand-edited prose outside markers preserved byte-for-byte. |
| **Atomic writes** | Write to temp file, `os.replace` — no partial board. |
| **`--dry-run`** | Print unified diff, exit 1 if drift detected (for CI/launchd drift guard). |
| **Fallback** | Read `.STATUS` files directly when `atlas` binary not found or returns error. |
| **Color/icon convention** | `🔴 blocked/deadline · 🟡 paused/wip · 🟢 active/ready`. Progress = `round(progress/12.5)` → 8 `█`/`░` cells. |

## Open / rough edges (revised 2026-07-04 — see Verification findings above)

| Issue | Status |
|-------|--------|
| **Collider `journal:`→`venue:` field mapping** | Not yet verified this pass — still needs checking against atlas's `target:` convention |
| **MediationVerse_Dashboard target parity** | ✅ **Resolved 2026-07-04 — target dropped.** `obs board` will never write this file; see "Scope decision" above. No remaining action. |
| **Scheduled Monday 09:15 launchd job** | ✅ **Done** — `com.data-wise.obs-board-refresh.plist`, verified live |
| **`--ai` opt-in TL;DR** | Still open — layered AI refinement contract undefined |
| **Cross-repo JSON contract test** | Still open — `tests/fixtures/atlas-snapshot.json` not committed |
| **Research HUB status block** | Deferred from scope (Decision 3) — unchanged |
| **`kind:`/`tasks:` in remaining `.STATUS` files** | ✅ `kind:` done in collider/sensitivity/"product of three"; `tasks:` still missing in the 2 checked; "sequential" repo not found — name needs correcting before this item can be finished |

**Net remaining scope, fully resolved 2026-07-04:** 2 fully open items (`--ai` flag, JSON
contract test fixture), 1 partially-done cleanup (`tasks:` headers + the "sequential" name
correction), 1 unverified item carried over (collider field mapping). The MediationVerse
scope decision is now closed (dropped, see above) — no open decisions remain, only
implementation work. Meaningfully smaller than the original 7-item list implied — most of
what looked outstanding had already shipped.

## Files to touch (obsidian-cli-ops repo, not atlas)

| File | Change |
|------|--------|
| `src/python/core/board.py` | *(corrected from `research/board.py`)* — already has adapter + ranker + writer (core) for the single remaining target (`_ACTION-BOARD.md`); no MediationVerse-target code needed given the scope decision above |
| `src/python/core/templates/` | *(path unverified this pass — confirm actual location before assuming `research/templates/`)* |
| `src/obs.zsh` | dispatch already wired (`obs board refresh`/`obs board status` per obsidian-cli-ops v4.3.0) |
| `src/python/obs_cli.py` | add the still-missing `--ai` flag; confirm `--out`/`--targets`/`--dry-run`/`--json` are already present (v4.3.0 board work likely added most of these) before assuming they're new |
| `src/python/tests/` | golden-file, idempotency, marker isolation, fallback, safety — confirm which of these v4.3.0's "E2E dogfood tests 32→71" expansion already covers before writing more |
| `tests/fixtures/atlas-snapshot.json` | still needs creating — confirmed absent |
