# Atlas Docs Site — Design & Content Audit (2026-07-19)

**Prototype:** [Homepage redesign mockup](https://claude.ai/code/artifact/05479587-b14f-4d18-b757-764c42987787)
(Claude Artifact — homepage + nav only, content unchanged).

## Why this doc, not another rewrite of `WEB-DESIGN-PROPOSAL.md`

`docs/WEB-DESIGN-PROPOSAL.md` (2026-07-12) proposed a from-scratch redesign —
custom fonts, color system, reading-time/scroll-progress components, an ADHD
guide section. Checking the live site and source against that doc's "TODO"
phases found **most of it already shipped**, quietly, across the sessions
since: Space Grotesk / DM Sans / JetBrains Mono are live
(`docs/stylesheets/fonts.css`), reading-time and scroll-progress components
exist (`docs/assets/javascripts/`), the ADHD Guide section exists in the nav,
and an interactive playground script (`playground.js`) is already built.

The old doc itself is now the stalest thing on the site: written for
v0.13.1, sitting live in the public nav under **Changelog → Design
Proposal**, describing work as upcoming that's been done for weeks. This
audit starts from **what's actually there** (verified against the deployed
site and current source), not the old doc's plan.

## Findings

### Ship it as-is (no action)

- Typography, reading-time, scroll-progress, section-TOC — all implemented
  and matching the original design intent. Nothing to redo here.
- The brand purple (`--atlas-active: #9c27b0`) is fine. The old proposal
  flagged it as a "critical" WCAG failure at 3.1:1 contrast on white —
  recomputed, `#9c27b0` on `#ffffff` measures **~6.3:1**, comfortably above
  AA (4.5:1). That claim doesn't hold up; don't let it drive a color change.

### Fix

1. **`--atlas-learn` / `--atlas-do` / `--atlas-build` / `--atlas-code` are
   dead CSS.** `docs/stylesheets/extra.css` defines all four (light + dark
   variants) for exactly the "visual anchoring by section" principle the
   ADHD-first design calls for, but nothing in the stylesheet ever reads
   them — the live left nav renders in one color, no per-section grouping.
   The prototype wires these tokens to four IA groups (Learn / Do / Build /
   Code) across the existing nav sections — see the mockup's left rail.

2. **Homepage card grid is unbalanced.** `docs/index.md`'s `grid cards`
   block has 5 entries in a 2-column layout, so the last card (SwiftBar)
   sits alone in its own row. The prototype regroups to 6 cards (adds
   Integrations, which currently only appears as a footer-adjacent link) so
   the grid fills evenly at 3×2, and gives each card a top-edge accent in
   its section color — reinforcing the same Learn/Do/Build/Code grouping
   from the nav.

3. **"Why Atlas (ADHD-first)" is a plain markdown table.** Tables are a
   heavier read than the page's own stated design principles ask for
   (reduced cognitive load, scannability). The prototype replaces it with a
   5-chip row — same five items, same copy, laid out to be scanned in one
   pass rather than read row-by-row.

### Retire

4. **`WEB-DESIGN-PROPOSAL.md` should come out of `nav:` in `mkdocs.yml`.**
   It's already covered by `exclude_docs:` for `specs/` — moving it to
   `docs/specs/` (alongside this file) keeps the historical record without
   presenting a stale, superseded plan as live user-facing content under
   "Changelog." Its genuinely-still-open ideas (interactive API playground
   wiring, contributing guide, troubleshooting/FAQ page) are worth carrying
   forward as separate, scoped follow-ups — not by keeping the whole
   six-week-old doc live.

## Scope of the prototype

The published mockup covers the homepage hero, the ADHD-principles strip,
the nav-section color grouping, and the card grid — the four items above.
It does not touch: inner page templates, the CLI Reference / API doc
layouts, or any prose content. Those were reviewed but found consistent
with the site's existing (good) conventions and out of scope for this pass.

## v2 revision: theme and menu system (2026-07-19, same-day follow-up)

The prototype was revised in place (same Artifact URL) to go further on two
axes the first pass only touched lightly: the **theme** (color/type/motion
tokens) and the **menu system** (how many navigation choices are visible at
once). Rationale, grounded in the same ADHD-first lens the product already
teaches in its own ADHD Guide — fewer simultaneous choices, one thing
expanded at a time, search over browse:

### Menu system

- **7 top tabs → Home + 4 color pills + search.** Material's default tab
  bar (Home / Get Started / Guide / Reference / Architecture / Integrations
  / Changelog) puts 7 co-equal choices in front of every visitor before
  they've read a word. The pills reuse the same Learn/Do/Build/Code
  grouping as the sidebar, and a prominent search box gives an escape hatch
  for "I already know what I want" — the common case on a return visit.
- **Sidebar tree → single-open accordion.** The live sidebar renders every
  section's children simultaneously (~20 links competing for attention on
  every page). The mockup keeps exactly one group expanded at a time, with
  an item count on each collapsed header so "how much is in here" is
  answerable without opening it.
- **Quick Actions strip** — three task-shaped links under the hero
  ("Continue," "Look up a command," "Something's not working") as an
  alternative on-ramp to browsing the full menu at all, aimed at the
  most common first-5-seconds intents.
- The search box and accordion are both **functionally wired** in the
  prototype (not just styled) — type in the box to filter and auto-expand
  matching sections; click a pill or header to switch which section is
  open.

### Theme

- **Page background moved off pure white** to a soft violet-grey
  (`#f5f2f8` light / `#161320` dark) with content cards on true white (or
  near-black) for contrast — reduces glare on long reading sessions without
  lowering text contrast against body copy.
- **Body type bumped to 16.5px / 1.65 line-height**, with quick-action and
  card copy kept under a ~60-character measure so the eye doesn't lose the
  line — both are common accessibility recommendations for ADHD/dyslexia
  reading comfort, distinct from the WCAG contrast question already
  resolved in the v1 findings above.
- **All hover motion gated behind `prefers-reduced-motion: no-preference`**
  — card lift/shadow transitions simply don't run for anyone who's turned
  that off at the OS level, rather than only respecting it for
  larger/animated elements.
- Brand purple, the three existing fonts, and the Learn/Do/Build/Code color
  mapping from v1 all carry over unchanged — this is additive on top of the
  first pass, not a restart.

## Suggested next steps

| Step | Effort | Notes |
|---|---|---|
| Wire the 4 section-color tokens into the nav (extra.css selector work) | Small | Tokens already exist; this is CSS only |
| Rebalance homepage `grid cards` to 6 entries | Small | `docs/index.md` edit |
| Replace the ADHD-principles table with the chip layout | Small | `docs/index.md` + a `.chip`/`.chip-row` CSS addition |
| Move `WEB-DESIGN-PROPOSAL.md` to `docs/specs/`, drop from `nav:` | Small | mkdocs.yml one-line removal + `git mv` |
| Collapse the 7-tab top nav to Home + 4 color pills + search | Medium | `overrides/` partial for the tab bar; Material's `navigation.tabs` feature would need a custom template override, not just CSS |
| Convert sidebar to single-open accordion behavior | Medium | Needs a small JS partial (`overrides/assets/javascripts/`) — Material's stock nav doesn't do this out of the box |
| Retune background/type/motion tokens (off-white field, 16.5px body, `prefers-reduced-motion` gating) | Small | `extra.css` token edits, no new files |
| Re-scope playground/troubleshooting/FAQ ideas from the old doc as their own small proposals, if still wanted | Deferred | Not part of this pass |

The menu-system items (tab collapse, accordion) are the only two in this
revision that go beyond CSS-only — both need a small custom JS/template
partial in `overrides/`, following the same pattern already used for
`scroll-progress.js` / `section-toc.js`. Still no new external
dependencies (Monaco, Alpine.js) — the existing vanilla-JS-partial pattern
covers it.
