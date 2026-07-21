# Core Principles

> The mental models behind Atlas. Understanding these makes the tool intuitive.

---

## 1. Externalize Everything

> **Your brain is for having ideas, not holding them.** — David Allen

ADHD working memory is limited. Every thought, task, idea, question — get it *out*.

| Instead of... | Do this... |
|---------------|------------|
| "I'll remember that" | `atlas catch "idea"` |
| "I'll do that later" | `atlas task add "thing" --due=friday` |
| "Where was I?" | `atlas where` / `atlas trail` |

**Rule:** If it takes >5 seconds to capture, you'll lose it. Make capture <2 seconds.

---

## 2. Context > Memory

> **Context restores flow. Memory fails.**

When you stop work, you lose:

- What you were doing
- Why you were doing it
- What blocked you
- What's next

**Atlas gives you:**

- `atlas where` → Last project, focus, duration
- `atlas trail` → Breadcrumbs (thoughts, blockers, decisions)
- `atlas parked` → Saved contexts for switching

**Rule:** Never start cold. `atlas where` first.

---

## 3. Single Active Session

> **One thing at a time. Everything else waits.**

Multitasking destroys ADHD flow. Atlas enforces:

- Only **one active session** at a time
- Switch = `atlas park` → `atlas session start`
- No "background" sessions

**Why it works:** ADHD brains hyperfocus *or* scatter. Single session channels hyperfocus, prevents scatter.

---

## 4. Capture → Process Separation

> **Capture is fast. Process is slow. Never mix them.**

| Phase | Command | Mindset |
|-------|---------|---------|
| **Capture** | `atlas catch "idea"` | Fast, no judgment, keep working |
| **Process** | `atlas inbox --triage` | Deliberate, decide, organize |

**Mixing them kills flow.** Capture during flow. Process during admin time.

---

## 5. Park, Don't Abandon

> **Switching isn't quitting. It's pausing with intent.**

| Scenario | Wrong | Right |
|----------|-------|-------|
| Urgent bug in other project | Abandon current work | `atlas park "blocked on auth"` → switch |
| Energy crash | Push through | `atlas session end "fried"` → break |
| New shiny idea | Chase it | `atlas catch "idea"` → return to focus |

**Parking saves:** Context, breadcrumbs, session duration, emotional state.

---

## 6. Breadcrumbs = Future You's Gift

> **Write for the person you'll be tomorrow.**

Breadcrumbs (`atlas crumb "stuck on OAuth callback"`) serve Future You:

- "Where was I?" → `atlas trail`
- "What was I stuck on?" → `atlas trail --limit 5`
- "What did I decide?" → Search breadcrumbs

**Format:** `atlas crumb "specific, actionable note"`

- ❌ "stuck"
- ✅ "OAuth callback returns 400, tried scopes A+B, need C"

---

## 6.5. Win Capture = Dopamine

> **ADHD brains need visible progress.**

`atlas catch "fixed OAuth bug" --type=win` does three things:
1. **Logs the win** — visible in `atlas stats`
2. **Triggers celebration** — configurable animation/message
3. **Builds streak** — visible in dashboard

**Why:** ADHD brains discount past wins. Explicit capture makes them visible.

---

## 7. Time Blindness → Gentle Awareness

> **You can't feel time. Atlas feels it for you.**

| Feature | Purpose |
|---------|---------|
| `atlas stats --velocity` | 4-week rolling velocity |
| `atlas stats --patterns` | Best hours, dead zones |
| `atlas stats --calibrate` | Prediction accuracy |
| Dashboard timer | Real-time session duration |
| Time cues | Gentle notifications (configurable) |

**Not tracking for tracking's sake.** Calibration → better estimates → less time blindness.

---

## 8. Streaks ≠ Perfection

> **Streak = "I showed up." Not "I was perfect."**

- Miss a day? Streak pauses, doesn't break.
- `atlas session end "short but showed up"` counts.
- `atlas stats --velocity` shows trend, not perfection.

**Why:** Perfectionism paralyzes. Consistency compounds.

---

## 9. Good Enough > Perfect

> **Done is better than perfect. Shipped is better than perfect.**

| Perfectionist | Atlas Way |
|---------------|-----------|
| "Finish everything" | `atlas session end "shipped v1"` |
| "Perfect code" | `atlas task done` + move on |
| "Perfect plan" | `atlas plan` → start → adjust |

**Motto:** "Good enough for now. Better later if needed."

---

## 10. Your Brain Knows Best

> **Atlas is a tool, not a taskmaster.**

| If it helps | Use it |
|-------------|--------|
| Streaks motivate | Keep streak visible |
| Celebrations annoy | `celebrationLevel: minimal` |
| Time cues stress | `timeCues: false` |
| Dashboard distracts | `zen` mode |

**Your ADHD is unique.** Atlas adapts to you, not you to Atlas.

---

## Summary: The Atlas Mental Model

```
┌─────────────────────────────────────────────────────────┐
│  CAPTURE (atlas catch)          │  Instant, no judgment  │
├─────────────────────────────────────────────────────────┤
│  CONTEXT (where, trail, park)   │  Restore flow instantly │
├─────────────────────────────────────────────────────────┤
│  SESSION (start, end, stats)    │  Single focus, visible │
├─────────────────────────────────────────────────────────┤
│  TASKS (add, list, done)        │  Actionable, prioritized│
├─────────────────────────────────────────────────────────┤
│  INSIGHT (stats, patterns)      │  Calibrate, don't judge │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

- [Quick Wins](quick-wins.md) — 5-minute setup
- [Time Blindness](time-blindness.md) — Gentle time awareness
- [Hyperfocus Management](hyperfocus.md) — Ride the wave
- [Accessibility](accessibility.md) — Keyboard, screen readers, reduced motion