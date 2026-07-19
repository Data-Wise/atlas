# PROPOSAL: TUI Alternatives — should atlas own a dashboard at all?

**Date:** 2026-07-19 · **Status:** brainstorm output (2 parallel OSS scans + atlas-side analysis) · **Interacts with:** SPEC-tui-consolidation (WS6 in flight — not blocked by this)

**Premise:** the interactive TUI feels awkward. The strongest ADHD surface is one you never have to open. Atlas already exposes everything as JSON (`session status --format json`, `project list --json`, `inbox --count`) and just shipped the bare-`atlas` digest (#97) — display can be delegated.

## Scored options (Glanceability / Integration simplicity / Maintenance safety, 1–5)

| # | Option | Lane | G | I | M | Verdict |
|---|--------|------|---|---|---|---------|
| 1 | **SwiftBar/xbar menu-bar plugin** — one script wrapping atlas JSON, dropped in a folder | Adopt | 4 | 5 | 4 | ⭐ Quick win: ambient, native menu bar, ≤30 min, zero daemon |
| 2 | **SketchyBar segment** | Adopt | 5 | 2 | 4 | Strong if already a SketchyBar user; 2–4 hr config investment otherwise |
| 3 | **Static local HTML dashboard** — single file polling a JSON export | Adopt | 5 | 5 | 5 | ⭐ Best "big board": no daemon, no build, survives version bumps (JSON contract only) |
| 4 | **tmux status-line segment** | Adopt | 2 | 5 | 4 | Cheap bonus for tmux dwellers; not truly ambient |
| 5 | **wtfutil panel** (cmdrunner widget) | Adopt | 3 | 3 | 2 | Viable but maintainer-churn risk; dominated by #3 |
| 6 | **Bare `atlas` digest** (shipped, #97) | Replace-shape | 3 | 5 | 5 | The incumbent primary surface — already free |
| 7 | **`atlas board --watch`** — non-interactive render loop over the digest (zero keybindings) | Replace-shape | 4 | 4 | 5 | ~1 file reusing GetDigestUseCase; "htop for your work" |
| 8 | **WS6 3-view Ink TUI** (in flight) | Keep-shrunk | 3 | — | 3 | Control option; interactive surface retained |

**Killed:** glances/btop adapters (system-metric shape, can't ingest foreign JSON), termdash/blessed-style config binaries (don't exist — all libraries), Starship module (visible only per-prompt, not ambient), Übersicht (quiet core project), Raycast menu-bar (TS build step + API churn for no gain over #1), Obsidian boards (out of scope — captures-only decision stands).

## Quick Wins (< 30 min)
1. **SwiftBar plugin** (`atlas-menubar.5s.sh`: streak · active session · inbox count) — always-visible state with zero new atlas code; ship as `contrib/swiftbar/` in the repo.
2. **tmux segment snippet** in docs (copy-paste, no code).

## Medium Effort (1-2 hrs)
- [ ] **`atlas board --watch`** — non-interactive live board; kills the "must remember keybindings" cost while staying in-terminal.
- [ ] **`atlas export --dashboard-json`** + single-file `dashboard.html` (option 3) — the glanceable big-screen board; pure consumer of the JSON contract.

## Long-term (future sessions)
- [ ] **Freeze TUI investment after WS6.** Land WS6 (already in flight, shrinks maintenance), then no phase-3 TUI work; the Ink dashboard becomes maintenance-only. If #1/#3/#7 prove out, deprecate `atlas dash` in v0.16 discussion.
- [ ] Desktop notifications at session events (event publisher already exists; `osascript` subscriber).

## Recommended Next Step
→ **Ship the SwiftBar plugin (#1) first** because it delivers the highest ADHD value (always-visible, zero decisions, zero opening-a-program) for the lowest cost of any option, without touching atlas core or prejudging the TUI's fate — then evaluate whether `atlas dash` usage survives contact with an ambient surface.
