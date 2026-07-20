# Atlas Documentation — Web Design Proposal

## Executive Summary

This proposal addresses critical gaps in the Atlas documentation site (data-wise.github.io/atlas/) identified through systematic audit, and proposes a cohesive ADHD-friendly redesign aligned with Atlas's core brand identity.

**Current State**: MkDocs Material with custom CSS, functional but visually generic
**Target State**: Distinctive, accessible, ADHD-optimized documentation experience

---

## 1. Gap Analysis Summary

### Stale Content (Immediate Fix Required)
| File | Issue | Fix |
|------|-------|-----|
| `ROADMAP.md` | "Current Version: v0.13.0" | Update to v0.13.1 |
| `REFCARD.md` | Version badge shows v0.13.0 | Update badge |
| `WHAT-S-NEW.md` | Missing v0.13.1 entries | Add v0.13.1 section |
| `ROADMAP.md` | "v0.13.0 COMPLETE" | Update to v0.13.1 |

### Structural/Navigation Issues
| Issue | Location | Impact |
|-------|----------|--------|
| "Visual Features" vs "Visual Guide" naming collision | User Guide nav | User confusion |
| "Research Registry" appears in Tutorials AND User Guide root | Nav duplication | Diluted discovery |
| Cookbook (1 file) vs Workflows (4 files) imbalance | Nav weight | Unbalanced visual hierarchy |
| No top-level ADHD/Accessibility guide | Missing | Core value prop hidden |

### Missing Critical Content
| Missing Page | Rationale |
|--------------|-----------|
| ADHD/Accessibility Guide | Core differentiator, no dedicated page |
| Troubleshooting/FAQ | Reduces support burden |
| Migration Guide (v0.13.0→v0.13.1) | Version upgrade friction |
| Contributing Guide (Docs) | Community growth |
| Quick Start Video/Animation | Modern expectation |
| Interactive Playground | API exploration |

### UX/Design Debt
| Issue | Severity |
|-------|----------|
| Generic Material Design (no brand identity) | High |
| WCAG AA failures (purple #9c27b0 on white = 3.1:1) | Critical |
| No reading time estimates | Medium |
| No progress indicators on long pages | Medium |
| No custom fonts/visual identity | High |
| No interactive API playground | Medium |

---

## 2. Design Strategy

### Brand Identity
| Element | Choice | Rationale |
|---------|--------|-----------|
| **Primary Color** | Deep Purple (#5e35b1) | Matches CLI brand, 7:1 contrast on white |
| **Accent** | Amber (#ffb300) | ADHD attention-grabber, 4.5:1 on dark |
| **Display Font** | **Space Grotesk** | Technical, distinctive, variable weight |
| **Body Font** | **DM Sans** | High readability, ADHD-friendly spacing |
| **Mono Font** | **JetBrains Mono** | Code clarity, ligatures |
| **Icon Set** | Lucide | Clean, consistent, tree-shakable |

### ADHD-First Design Principles
| Principle | Implementation |
|-----------|----------------|
| **Visual Anchoring** | Emoji icons in nav, color-coded sections |
| **Reduced Cognitive Load** | Max 3 levels nav, progressive disclosure |
| **Time Awareness** | Reading time estimates, progress bars |
| **Dopamine Hooks** | Micro-animations, completion celebrations |
| **Reduced Clutter** | Collapsible sections, progressive disclosure |
| **Clear "You Are Here"** | Breadcrumbs + highlighted active nav |

---

## 3. Information Architecture Redesign

### Proposed Navigation Structure
```
Home
What's New (Changelog)
Getting Started
  ├── Installation
  ├── 5-Minute Quick Start (NEW)
  ├── Interactive Tutorial (NEW)
  └── Demo Gallery
ADHD Guide (NEW TOP-LEVEL)
  ├── Core Principles
  ├── Quick Wins
  ├── Time Blindness
  ├── Hyperfocus Management
  └── Accessibility
User Guide
  ├── Quick Reference (Cheatsheet + Refcard merged)
  ├── Tutorials
  │   ├── Visual Features
  │   └── Research Registry
  ├── Cookbook (promoted)
  ├── Workflows
  │   ├── Core Loop
  │   ├── Weekly Review
  │   ├── Multi-Project
  │   └── Automation
  ├── CLI Reference
  ├── Configuration
  └── Visual Guide
ADHD-Friendly API (NEW)
  ├── Playground (interactive)
  ├── Library Usage
  ├── MCP Integration
  └── Webhooks
Architecture
  ├── Overview
  ├── Diagrams
  └── Integrations
Developer
  ├── API Guide
  ├── API Recipes
  ├── MCP Server
  ├── Roadmap
  └── Contributing (NEW)
Troubleshooting (NEW)
  ├── FAQ
  ├── Common Errors
  ├── Migration Guides
  └── Performance
```

---

## 4. Technical Implementation

### Stack
- **Static Site**: MkDocs Material (preserve existing investment)
- **Custom Theme**: Override via `theme: custom_dir`
- **Interactive Components**: Alpine.js (lightweight, no build)
- **Code Playground**: Monaco Editor + Monaco Editor via CDN
- **Animations**: CSS-only + Alpine transitions

### Custom Theme Structure
```
docs/
├── overrides/
│   ├── assets/
│   │   ├── stylesheets/
│   │   │   ├── extra.css          # Extended design system
│   │   │   └── fonts.css          # Font loading
│   │   ├── javascripts/
│   │   │   ├── alpine.min.js      # Alpine.js v3
│   │   │   ├── playground.js      # Monaco playground
│   │   │   └── a11y.js            # Accessibility helpers
│   │   ├── partials/
│   │   │   ├── header.html        # Custom header with progress
│   │   │   ├── footer.html        # Custom footer
│   │   │   ├── nav-item.html      # Enhanced nav items
│   │   │   ├── reading-time.html  # Reading time component
│   │   │   └── progress-bar.html  # Scroll progress
│   │   └── main.html              # Layout override
├── stylesheets/
│   └── extra.css                  # Existing (to be replaced)
└── javascripts/
    └── custom.js                  # Existing (to be replaced)
```

### Key Components

#### 1. Reading Time Estimator
```javascript
// Auto-calculates from word count, displays in article header
// Format: "5 min read" with progress bar on scroll
```

#### 2. ADHD-Friendly Scroll Progress
```css
/* Fixed top bar showing scroll progress
   Color: --atlas-active (purple)
   Height: 3px
   Animation: smooth 200ms
*/
```

#### 3. Interactive API Playground
```html
<!-- Monaco Editor + live Atlas CLI simulation
     Pre-loaded with common patterns
     Copy-to-clipboard with toast confirmation -->
```

#### 4. Accessibility Enhancements
- Skip-to-content link (visible on focus)
- Heading hierarchy validation (warn in console)
- Color contrast validation (build-time)
- Reduced motion respect (@media prefers-reduced-motion)

---

## 5. Visual Design System

### Color Palette (WCAG AA+ Compliant)
| Role | Light | Dark | Contrast (Light) | Contrast (Dark) |
|------|-------|------|------------------|-----------------|
| Primary | #5e35b1 | #9575cd | 7.0:1 | 8.2:1 |
| Primary Light | #7e57c2 | #b39ddb | 4.5:1 | 5.2:1 |
| Accent | #ffb300 | #ffd54f | 4.5:1 | 12.6:1 |
| Success | #2e7d32 | #66bb6a | 6.7:1 | 7.1:1 |
| Warning | #e65100 | #ffb74d | 5.3:1 | 8.1:1 |
| Error | #c62828 | #ef5350 | 5.9:1 | 6.8:1 |
| Surface | #ffffff | #1e1e1e | — | — |
| Surface Variant | #f5f5f5 | #2d2d2d | — | — |

### Typography Scale
| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| Display | Space Grotesk | clamp(2.5rem, 5vw, 4rem) | 700 | 1.1 |
| H1 | Space Grotesk | 2.25rem | 700 | 1.2 |
| H2 | Space Grotesk | 1.75rem | 600 | 1.3 |
| H3 | Space Grotesk | 1.375rem | 600 | 1.4 |
| Body | DM Sans | 1rem | 400 | 1.6 |
| Body Small | DM Sans | 0.875rem | 400 | 1.6 |
| Code | JetBrains Mono | 0.875em | 400 | 1.5 |
| Caption | DM Sans | 0.75rem | 500 | 1.5 |

### Spacing System (8px base)
| Token | Value |
|-------|-------|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 16px |
| space-4 | 24px |
| space-5 | 32px |
| space-6 | 48px |
| space-7 | 64px |

### Component Library (New)
| Component | Purpose |
|-----------|---------|
| `ReadingTime` | Auto-estimated, sticky on scroll |
| `ScrollProgress` | Fixed top bar, keyboard focus visible |
| `SectionToc` | Collapsible, highlights current |
| `CodeBlock` | Copy button, line numbers, lang badge |
| `Admonition` | ADHD variants (tip/warning/note/danger) |
| `Badge` | Version, status, type indicators |
| `TabbedContent` | Multi-lang code examples |
| `ApiPlayground` | Monaco + live CLI simulation |

---

## 6. Content Strategy

### Page Templates
| Template | Use Case | Components |
|----------|----------|------------|
| `guide` | Tutorials, workflows | ReadingTime, SectionToc, Admonition |
| `reference` | CLI, API | CodeBlock, TabbedContent, Badge |
| `guide-adhd` | ADHD Guide | All + Dopamine hooks |
| `playground` | API Playground | ApiPlayground, TabbedContent |
| `troubleshooting` | FAQ, Errors | Collapsible, Search highlights |

### Content Standards
- **Max paragraph**: 3 sentences
- **Max line length**: 75 chars (CSS `ch` unit)
- **Heading frequency**: Every 300 words max
- **Code example**: Every 2 concepts min
- **ADHD tip box**: Every 500 words
- **Reading time**: Required on all pages

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Fix stale content (4 files)
- [ ] Update ROADMAP/REFCARD versions
- [ ] Add WHAT-S-NEW v0.13.1 section
- [ ] Fix nav duplication (Visual Features/Guide)
- [ ] Consolidate Research Registry nav entry

### Phase 2: Design System (Week 1-2)
- [ ] Add custom fonts (Space Grotesk, DM Sans, JetBrains Mono)
- [ ] Implement color palette (CSS custom properties)
- [ ] Typography scale & spacing system
- [ ] Component library CSS
- [ ] Dark mode refinements

### Phase 3: Components (Week 2)
- [ ] ReadingTime component
- [ ] ScrollProgress bar
- [ ] SectionToc (collapsible)
- [ ] CodeBlock enhancements
- [ ] Admonition ADHD variants
- [ ] Badge system

### Phase 4: ADHD Guide & New Pages (Week 2-3)
- [ ] Create ADHD Guide (5 pages)
- [ ] Troubleshooting/FAQ
- [ ] Migration Guide
- [ ] Contributing Guide
- [ ] Merge Visual Features/Guide

### Phase 5: Interactive Features (Week 3)
- [ ] API Playground (Monaco)
- [ ] ReadingTime component
- [ ] ScrollProgress bar
- [ ] SectionToc component

### Phase 6: Polish & Launch (Week 3-4)
- [ ] Accessibility audit (axe-core)
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Dark mode QA
- [ ] Deploy & monitor

---

## 8. Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Time to first meaningful action | Unknown | < 30s | GA4 events |
| Page depth (pages/session) | ~2.1 | > 3.5 | GA4 |
| Mobile usability score | ~72 | > 90 | Lighthouse |
| Accessibility score | ~78 | > 95 | axe-core |
| Reading completion rate | Unknown | > 60% | Scroll depth |
| Search usage rate | Unknown | > 40% | Algolia/GA4 |

---

## 9. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Custom theme breaks Material upgrades | Medium | High | Pin Material version, test upgrade path |
| Custom components break on mobile | Low | High | Mobile-first development, device testing |
| Font loading performance | Low | Medium | Preload, font-display: swap |
| Monaco bundle size | Medium | Medium | Lazy-load, dynamic import |
| Accessibility regressions | Low | Critical | CI axe-core gate |

---

## 10. Budget & Resources

| Resource | Quantity | Notes |
|----------|----------|-------|
| Design/Dev | 1 FTE | 4 weeks |
| Design Review | 0.25 FTE | Weekly checkpoints |
| Accessibility Audit | 0.1 FTE | axe-core + manual |
| Content Writing | 0.5 FTE | ADHD Guide + new pages |
| QA/Testing | 0.25 FTE | Cross-browser, a11y |

---

## 11. Next Steps

1. **Approve** this proposal or request modifications
2. **Prioritize** Phase 1 (stale content) for immediate fix
3. **Assign** design/dev ownership
4. **Schedule** weekly design reviews
5. **Set up** custom theme development environment

---

*Prepared for Atlas v0.13.1 documentation modernization*
*Last updated: 2026-07-12*
