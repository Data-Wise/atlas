# ADHD Guide

<div class="atlas-intro">
<strong>Atlas is built for ADHD brains.</strong> This guide explains the principles, patterns, and practical workflows that make Atlas work <em>with</em> your brain instead of against it.
</div>

---

## Why ADHD-Friendly Design Matters

Traditional productivity tools assume:
- Consistent attention span
- Perfect time estimation
- Linear workflow
- Perfect memory for context

**ADHD brains don't work that way.** We experience:
- Time blindness (hours feel like minutes)
- Context switching paralysis
- Hyperfocus followed by crashes
- Working memory limits (3-4 items max)
- Motivation that comes in bursts

**Atlas doesn't try to fix you.** It works with your brain's natural patterns.

---

## The Atlas ADHD Philosophy

| Traditional | Atlas |
|-------------|-------|
| "Plan perfectly, execute perfectly" | "Start messy, refine as you go" |
| "Track everything" | "Capture everything, process later" |
| "Optimize for efficiency" | "Optimize for momentum" |
| "Stick to the plan" | "Adapt when context shifts" |
| "Discipline yourself" | "Design your environment" |

---

## Quick Start: The 3 Core Habits

### 1. **Capture, Don't Process** (`atlas catch`)
> **Rule:** If it takes >5 seconds to write down, you'll lose it.

```bash
atlas catch "check VanderWeele 2015 appendix"
atlas catch "add error boundary to auth" --type=task --project=atlas
```

### 2. **Session as Container** (`atlas session start/end`)
> **Rule:** Work happens in sessions. Sessions have boundaries.

```bash
atlas session start "refactor auth flow"
# ... do work ...
atlas session end "completed auth refactor, tests passing"
```

### 3. **End-of-Day Ritual** (`atlas plan`)
> **Rule:** Close today so tomorrow starts clean.

```bash
atlas plan
# Interactive: review sessions → check inbox → set focus → plan energy
```

---

## The 5 Core Guides

| Guide | Focus | Time |
|-------|-------|------|
| [Core Principles](core-principles.md) | The mental models behind Atlas | 5 min |
| [Quick Wins](quick-wins.md) | Immediate improvements for today | 3 min |
| [Time Blindness](time-blindness.md) | Gentle time awareness without anxiety | 5 min |
| [Hyperfocus Management](hyperfocus.md) | Ride the wave, survive the crash | 7 min |
| [Accessibility](accessibility.md) | Keyboard, screen readers, reduced motion | 3 min |

---

## Quick Reference: ADHD-Specific Commands

| Need | Command |
|------|---------|
| "I have an idea but I'm in flow" | `atlas catch "idea"` |
| "Where was I?" | `atlas where` |
| "I'm stuck" | `atlas crumb "stuck on OAuth callback"` → `atlas park "need fresh eyes"` |
| "Switching projects" | `atlas park "mid-refactor"` → `atlas session start other-project` → later `atlas unpark` |
| "End of day" | `atlas session end "note"` → `atlas stats` → `atlas crumb "tomorrow: ..."` |
| "Weekly review" | `atlas plan` (interactive) |
| "Overwhelmed" | `atlas inbox --triage` (process one at a time) |

---

## Key Insight: Momentum > Perfection

> **The Atlas mantra:** *Something is better than nothing. Done is better than perfect. Momentum compounds.*

Don't optimize your system. Use it. Let the patterns emerge.

---

## Next Steps

1. **Start with [Core Principles](core-principles.md)** — understand the mental models
2. **Try [Quick Wins](quick-wins.md)** — immediate changes for today
3. **Pick your pain point** — [Time Blindness](time-blindness.md) or [Hyperfocus](hyperfocus.md)
3. **Build the habit** — 2 weeks of daily `atlas session start/end` + `atlas plan`

---

## Related Resources

- [Workflows Guide](../workflows/WORKFLOWS.md) — Full workflow patterns
- [Cheatsheet](../../CHEATSHEET.md) — Compact command reference
- [Cookbook](../cookbook/COOKBOOK.md) — Task-oriented recipes
- [MCP Integration](../../MCP-SERVER.md) — Use Atlas from Claude

---

**Now what?** → [Core Principles](core-principles.md)
