# Accessibility

> **Atlas is for every brain. Every body. Every way of working.**

---

## Design Commitments

| Principle | Implementation |
|-----------|----------------|
| **Perceivable** | Color contrast, text alternatives, adaptable layout |
| **Operable** | Keyboard navigation, no time pressure, clear navigation |
| **Understandable** | Clear language, predictable behavior, error prevention |
| **Robust** | Semantic HTML, ARIA, graceful degradation |

---

## Visual Accessibility

### Color Contrast (WCAG AA+)

| Element | Light Mode | Dark Mode | Ratio |
|---------|------------|-----------|-------|
| Primary text | `#1c1c1c` | `#e0e0e0` | 15:1 / 12:1 |
| Secondary text | `#444444` | `#b0b0b0` | 7:1 / 8:1 |
| Primary (purple) | `#5e35b1` | `#b39ddb` | 7:1 / 8:1 |
| Accent (amber) | `#ffb300` | `#ffd54f` | 4.5:1 / 12:1 |
| Success (green) | `#2e7d32` | `#66bb6a` | 6.7:1 / 7:1 |
| Warning (orange) | `#e65100` | `#ffb74d` | 5.3:1 / 8:1 |
| Error (red) | `#c62828` | `#ef5350` | 5.9:1 / 6.8:1 |

**No color-only information.** All status uses icon + text + color.

### Text & Typography

| Property | Value |
|----------|-------|
| Base size | 16px (1rem) minimum |
| Line height | 1.6 (body), 1.3-1.4 (headings) |
| Max line width | 75ch (~75 characters) |
| Font smoothing | Antialiased, grayscale |
| Scaling | Supports 200% zoom without horizontal scroll |

### Focus Indicators

```css
:focus-visible {
  outline: 2px solid var(--atlas-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

- Visible on **all** interactive elements
- Offset prevents clipping
- High contrast in both themes

---

## Keyboard Navigation

### Global Shortcuts

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Navigate forward/back |
| `Enter` / `Space` | Activate button/link |
| `Esc` | Close modal, search, exit mode |
| `/` | Focus search (global) |
| `?` | Show keyboard help |

### Dashboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate project list |
| `Enter` | Open project detail |
| `Space` | Pause/resume Pomodoro |
| `r` | Reset Pomodoro |
| `a` | Analytics view |
| `f` | Focus view |
| `z` | Zen view |
| `e` | Ecosystem view |
| `p` | Plan view |
| `c` | Quick capture |
| `Tab` | Cycle layout (Single → Split → Triple) |
| `Shift+Tab` | Cycle panel focus |

### Forms & Dialogs

| Element | Keyboard |
|---------|----------|
| Text inputs | Type → `Tab` next |
| Selects | `Space` open, arrows navigate, `Enter` select |
| Checkboxes | `Space` toggle |
| Radio buttons | Arrows navigate, `Space` select |
| Date pickers | Arrows navigate, `Enter` confirm |
| Dialogs | `Esc` closes, focus trapped inside |

---

## Screen Reader Support

### Semantic HTML

| Element | Purpose |
|---------|---------|
| `<main>` | Main content |
| `<nav>` | Navigation |
| `<header>` | Site header |
| `<footer>` | Site footer |
| `<article>` | Page content |
| `<section>` | Content sections |
| `<aside>` | Sidebar |
| `<h1>`-`<h6>` | Heading hierarchy |

### ARIA Labels & Roles

| Component | ARIA |
|-----------|------|
| Search | `role="search"`, `aria-label="Search documentation"` |
| Navigation | `aria-label="Main navigation"` |
| Tabs | `role="tablist"`, `aria-selected`, `aria-controls` |
| Dialogs | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Alerts | `role="alert"`, `aria-live="polite"` |
| Progress | `role="progressbar"`, `aria-valuemin/max/now` |
| Toggles | `role="switch"`, `aria-checked` |
| Tooltips | `role="tooltip"`, `aria-describedby` |

### Live Regions

| Region | `aria-live` |
|--------|-------------|
| Search results | `polite` |
| Toast notifications | `polite` |
| Session timer | `off` (user-initiated) |
| Pomodoro alerts | `assertive` |

---

## Motion & Animation

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Disabled:**
- Page transitions
- Sidebar expand/collapse
- Scroll progress bar
- Hover/tap micro-interactions
- Loading spinners

---

## Cognitive Accessibility

### Reading Support

| Feature | Implementation |
|---------|----------------|
| Reading time | Auto-calculated, shown at top |
| Progress bar | Fixed top, shows scroll % |
| Section TOC | Collapsible, highlights current |
| Max line width | 75ch (CSS `ch` unit) |
| Line height | 1.6 (body), 1.3-1.4 (headings) |
| Paragraph spacing | 1.5rem margins |

### Clear Language

| Guideline | Rule |
|-----------|------|
| Max sentence | 25 words |
| Max paragraph | 3 sentences |
| Active voice | Required |
| Jargon | Defined inline or glossary |
| Acronyms | Expanded on first use |
| Instructions | Numbered, one action per step |

---

## Dashboard Accessibility

### Views

| View | Accessibility |
|------|---------------|
| Browse | Keyboard nav, screen reader friendly |
| Detail | Full keyboard, ARIA labels |
| Focus | Timer announced, keyboard controls |
| Zen | Minimal, high contrast option |
| Timeline | Keyboard nav, alt text for bars |
| Ecosystem | Keyboard nav, sortable columns |
| Plan | Form controls accessible |
| Analytics | Data tables accessible, alt text for charts |

### Pomodoro Timer

| Feature | Accessibility |
|---------|---------------|
| Timer | Announced via live region |
| Controls | Keyboard: `Space` pause, `r` reset |
| Completion | Announced + visual |
| Break | Optional sound (opt-in) |

---

## CLI Accessibility

### Output

| Feature | Implementation |
|---------|----------------|
| Color | Optional (`--no-color`, `NO_COLOR=1`) |
| JSON | `--format json` for parsing |
| Quiet | `-q` / `--quiet` for scripts |
| Progress | Optional (`--no-progress`) |

### Help

```bash
atlas --help           # Full help
atlas <command> --help # Command help
atlas help <command>   # Same
```

### Shell Completions

```bash
# Tab-complete everything
atlas <TAB>
atlas project <TAB>
atlas session <TAB>
```

---

## Terminal Dashboard (Ink)

### Keyboard-First

| Feature | Implementation |
|---------|----------------|
| Full keyboard nav | All views |
| Focus management | Proper trapping, restoration |
| Screen reader | Semantic React components |
| Focus indicators | Visible, high contrast |
| Reduced motion | Respected |

### Live Regions

| Region | `aria-live` |
|--------|-------------|
| Timer | `polite` |
| Notifications | `polite` |
| Errors | `assertive` |

---

## Configuration for Accessibility

### Config Options

```json
// ~/.atlas/config.json
{
  "preferences": {
    "adhd": {
      "showStreak": true,
      "celebrationLevel": "minimal",
      "timeCues": true,
      "timeCueInterval": 30,
      "timeCueStyle": "gentle"
    },
    "dashboard": {
      "theme": "high-contrast",
      "reduceMotion": true,
      "compactMode": true
    }
  }
}
```

### Theme Options

| Theme | Description |
|-------|-------------|
| `default` | Standard purple/amber |
| `nord` | Cool blues, low contrast |
| `solarized` | Warm, reduced blue light |
| `mono` | Grayscale |
| `high-contrast` | WCAG AAA, max contrast |

---

## Testing Accessibility

### Automated

```bash
# axe-core in CI
npm run test:a11y

# Lighthouse
npm run lighthouse

# pa11y
npx pa11y https://data-wise.github.io/atlas/
```

### Manual Checklist

- [ ] Tab through entire site — no traps
- [ ] Screen reader (NVDA/JAWS/VoiceOver) — all content announced
- [ ] Keyboard only — complete workflows
- [ ] 200% zoom — no horizontal scroll
- [ ] High contrast mode — readable
- [ ] Reduced motion — no animation
- [ ] Color blind simulator — distinguishable
- [ ] Print stylesheet — clean output

---

## Reporting Accessibility Issues

| Channel | Response |
|---------|----------|
| [GitHub Issues](https://github.com/Data-Wise/atlas/issues) | 48h triage |
| Email | a11y@data-wise.dev |
| Priority | P0 (blocks access) → 24h fix |

**Include:**
- Browser/OS/assistive tech
- Steps to reproduce
- Expected vs actual
- Screenshots/recordings if possible

---

## Compliance Status

| Standard | Status |
|----------|--------|
| WCAG 2.1 AA | ✅ Target |
| WCAG 2.1 AAA | 🟡 Partial (contrast) |
| Section 508 | ✅ Target |
| EN 301 549 | 🟡 Target |
| PDF/UA | N/A (web only) |

---

## Continuous Improvement

| Area | Status |
|------|--------|
| Automated testing | axe-core in CI |
| User testing | Planned with ADHD community |
| Expert audit | Planned annually |
| Training | Team accessibility onboarding |

---

## Related

- [ADHD Guide Index](index.md) — Full guide
- [Core Principles](core-principles.md) — Mental models
- [Time Blindness](time-blindness.md) — Time awareness
- [Hyperfocus](hyperfocus.md) — Managing hyperfocus
- [Quick Wins](quick-wins.md) — 5-minute setup

---

> **Accessibility is not a feature. It's the baseline.**
> **If it's not accessible, it's broken.**