# Blessed Alternatives Research

**Date:** 2025-12-30
**Context:** Atlas dashboard currently uses `blessed` (last updated 2017)
**Status:** Strategic evaluation for long-term maintainability

---

## Current Situation

Atlas's TUI dashboard (`src/cli/dashboard.js` - 2,303 lines) uses the `blessed` library, which:
- Last npm publish: 2017 (8+ years ago)
- Still works but unmaintained
- No TypeScript support
- Missing modern terminal features

---

## Options Evaluated

### 1. Ink (React-based) ⭐ RECOMMENDED for new projects

**Repository:** [github.com/vadimdemedes/ink](https://github.com/vadimdemedes/ink)
**npm:** [ink](https://www.npmjs.com/package/ink)
**Last Update:** Active (v6.6.0 - 3 days ago as of Dec 2024)

**Pros:**
- Modern React paradigm - familiar to React developers
- Active maintenance and large community
- TypeScript support built-in
- Used by GitHub Copilot, Prisma, Shopify, Gatsby, NY Times
- Flexbox layouts via Yoga
- 2,588+ dependent packages

**Cons:**
- Complete architectural rewrite required
- Different paradigm from blessed (declarative vs widget-based)
- Larger bundle size
- Requires React knowledge

**Migration Effort:** HIGH (complete rewrite)

---

### 2. neo-blessed (Maintained fork)

**Repository:** [github.com/embarklabs/neo-blessed](https://github.com/embarklabs/neo-blessed)
**npm:** [neo-blessed](https://www.npmjs.com/package/neo-blessed)

**Pros:**
- Drop-in replacement for blessed
- Minimal migration effort (change import only)
- Same API, same patterns
- Bug fixes over original blessed

**Cons:**
- Also shows signs of reduced activity (last significant update varies by fork)
- Multiple competing forks (embarklabs, blessedjs, terminal-junkies)
- No fundamental improvements
- Still no TypeScript

**Migration Effort:** LOW (1-2 hours to swap imports)

---

### 3. terminal-kit

**Repository:** [github.com/cronvel/terminal-kit](https://github.com/cronvel/terminal-kit)

**Pros:**
- Active development
- Full terminal control
- Input handling, progress bars, menus

**Cons:**
- Different API - complete rewrite needed
- Less focused on widget-based UIs
- Smaller ecosystem than Ink

**Migration Effort:** HIGH

---

### 4. Keep blessed + incremental improvements

**Pros:**
- No migration effort
- Working code stays working
- Can invest time in other features

**Cons:**
- Technical debt accumulates
- Any blessed bugs won't be fixed
- Harder to attract contributors

**Migration Effort:** NONE

---

## Recommendation Matrix

| Criteria | Ink | neo-blessed | terminal-kit | Keep blessed |
|----------|-----|-------------|--------------|--------------|
| Migration effort | High | Low | High | None |
| Long-term viability | Excellent | Good | Good | Risky |
| Developer experience | Excellent | Same | Good | Same |
| Community/ecosystem | Large | Small | Medium | Declining |
| Atlas architecture fit | Medium | Perfect | Medium | Perfect |

---

## Recommended Strategy

### Short-term (Next 6 months): Switch to neo-blessed

**Rationale:** Minimal effort for improved maintainability

```diff
- import blessed from 'blessed'
+ import blessed from 'neo-blessed'
```

**Tasks:**
1. Replace `blessed` with `neo-blessed` in package.json
2. Update imports (or use alias)
3. Run test suite to verify compatibility
4. Monitor for any behavioral differences

**Estimated Effort:** 2-4 hours

---

### Medium-term (6-12 months): Evaluate during major feature work

If the dashboard needs significant new features (Phase 5 Ecosystem View, Phase 4 planning screen), consider:

1. Building new views with Ink while keeping existing blessed views
2. Gradual migration as each view is touched
3. Hybrid approach: blessed for complex widgets, Ink for new UIs

---

### Long-term (12+ months): Consider full Ink migration

**When to trigger:**
- Major dashboard redesign needed
- Team gains React experience
- blessed/neo-blessed shows critical bugs
- New features blocked by blessed limitations

**Migration approach:**
1. Create new `src/cli/dashboard-v2/` with Ink
2. Build feature parity incrementally
3. A/B test with `--dashboard v2` flag
4. Deprecate old dashboard after validation

---

## Code Examples

### Current blessed pattern:
```javascript
import blessed from 'blessed'

const screen = blessed.screen({ smartCSR: true })
const box = blessed.box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  content: 'Hello!',
  border: { type: 'line' }
})
screen.append(box)
screen.render()
```

### neo-blessed (drop-in):
```javascript
import blessed from 'neo-blessed'  // Only this line changes

const screen = blessed.screen({ smartCSR: true })
// ... rest identical
```

### Ink equivalent:
```jsx
import React from 'react'
import { render, Box, Text } from 'ink'

const App = () => (
  <Box borderStyle="single" padding={1}>
    <Text>Hello!</Text>
  </Box>
)

render(<App />)
```

---

## Decision

**Immediate action:** Switch to `neo-blessed` (low risk, immediate benefit)

**Next review:** Re-evaluate if/when:
- Planning Phase 5 (Ecosystem View)
- Any blessed-related bugs are encountered
- Major dashboard redesign is considered

---

## Sources

- [Ink GitHub](https://github.com/vadimdemedes/ink)
- [neo-blessed GitHub](https://github.com/embarklabs/neo-blessed)
- [terminal-kit GitHub](https://github.com/cronvel/terminal-kit)
- [awesome-tuis](https://github.com/rothgar/awesome-tuis)
- [npm ink package](https://www.npmjs.com/package/ink)
- [npm neo-blessed package](https://www.npmjs.com/package/neo-blessed)
