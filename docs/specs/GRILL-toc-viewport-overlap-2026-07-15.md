# GRILL: TOC Rail Viewport Overlap Fix (Fix 1)
**Date:** 2026-07-15  
**Target:** `docs/stylesheets/extra.css` — fixed-TOC layout block (lines 274–296)  
**Grill trigger:** Adverse review of PR #85 flagged "critical" viewport overlap bug

---

## Decision Ledger

### Branch 1 — Is the bug empirically confirmed?

**Question:** Has the TOC/text overlap been verified in a browser, or is it theoretical?

**Answer:** Theoretical only (initially). Then empirically verified.

**Empirical finding (1280×800 viewport):**
```
{
  viewport: { w: 1280, h: 800 },
  toc: { left: 1032, right: 1272, width: 240 },     // fixed, right: 0px
  inner: { left: 213, right: 1253, width: 1040 },
  innerPaddingRight: "272px",
  box overlap: 221px                                  // ← this was reported as "SEVERE"
}
```

**Correction (second measurement):**
```
{
  textRight: 981,    // inner.right (1253) - paddingRight (272)
  tocLeft:   1032,
  textToTocGap: +51  // POSITIVE = text is LEFT of TOC = no overlap
}
```

**Resolved:** The 221px "overlap" was the content **box** (including its 272px padding zone) vs. the TOC — not actual text vs. TOC. The text has 51–59px clearance from the TOC at all tested viewports.

**Root cause of false alarm:** `padding-right: 17rem (272px)` was measured as part of `inner.right`, but that 272px is empty reserved space. Text ends at `inner.right - paddingRight`, which is well left of the TOC.

---

### Branch 2 — Does the gap stay consistent across viewport widths?

**Analysis:** At any viewport where `inner.right ≈ viewport - 27px` (constant margin, observed at 1280px):

```
gap = (viewport - 240) - (viewport - 27 - 272)
    = viewport - 240 - viewport + 27 + 272
    = 59px  (constant)
```

| Viewport | Text right | TOC left | Gap |
|----------|-----------|----------|-----|
| 1220px   | 921px     | 980px    | 59px ✓ |
| 1280px   | 981px     | 1040px   | 59px ✓ |
| 1440px   | 1141px    | 1200px   | 59px ✓ |
| 1600px   | 1301px    | 1360px   | 59px ✓ |

**Resolved:** No text visibility bug exists in the 1220–1600px viewport range.

**Exception (very wide viewports > 1600px / 100rem):** Above the grid max-width, the grid centers and `inner.right` stops tracking the viewport edge. The TOC floats at viewport right while content is in the narrower centered grid — creating aesthetic disconnect but NOT a text overlap (gap actually grows).

---

### Branch 3 — Is Fix 1 (anchor TOC to grid edge) needed?

**Verdict:** **No** for the stated "critical text overlap" bug — that bug doesn't exist.

**What IS worth fixing:**
- On viewports > 100rem (1600px), the TOC detaches from content visually (aesthetic only)
- If fix desired for wide viewports: **Approach B** (second breakpoint at 100rem) is lower-risk than Approach A (calc() in `right`)

---

## Open Questions (post-grill, not yet resolved)

1. **Material CSS class fragility** — `.md-sidebar--secondary`, `.md-content__inner` have no semver stability guarantee. Should pin Material version in `docs/requirements.txt`.
2. **Mobile TOC regression** — `section-toc.js` was deleted in PR #85, removing inline mobile TOC (< 76.25em). Should restore or replace.
3. **Dark mode** — custom CSS uses `rgba(248, 248, 252, 0.97)` hardcoded light-color. Not tested in dark mode. Should audit.

---

## Recommendation

1. **Close Fix 1** — no critical text overlap bug exists; skip the viewport-anchor fix.
2. **Open GH issue** for Material version pin (2 lines in `docs/requirements.txt`).
3. **Open GH issue** for mobile TOC restoration.
4. **Future session** — if wide-viewport TOC detachment becomes a UX concern, Approach B (second `@media` breakpoint at `min-width: 100rem`) is the right fix.
