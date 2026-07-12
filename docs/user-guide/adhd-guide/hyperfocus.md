# Hyperfocus Management

> **Ride the wave. Survive the crash.**

---

## What Hyperfocus Feels Like

| State | Experience |
|-------|------------|
| **Entry** | "Just one more thing..." → 4 hours later |
| **During** | World disappears. Needs? What needs? |
| **Exit** | Sudden crash. Exhaustion. Shame. "What did I even do?" |

**Hyperfocus isn't a superpower. It's a loan.** You borrow energy from tomorrow. Atlas helps you repay it gently.

---

## 1. Recognize the Signs

> **Catch it early. Or at least, not too late.**

| Early Signs | You're In Deep |
|-------------|----------------|
| "Just one more thing..." | Forgot to eat |
| Lost track of time | Forgot to pee |
| Ignored notifications | Forgot to sleep |
| "Just 5 more minutes" | 4 hours ago |
| Tuned out world | Physical pain when stopping |

**Your tells:** What are yours? Write them down. `atlas catch "hyperfocus tell: ignore Slack when coding" --type=note`

---

## 2. The Hyperfocus Protocol

> **When you realize you're in it.**

### During Hyperfocus

| Do | Don't |
|----|-------|
| `atlas catch "hyperfocus: auth refactor"` | Stop to organize |
| Keep water nearby | Skip meals |
| Set a *soft* timer (90 min max) | Push past body signals |
| `atlas crumb "deep in auth, OAuth flow"` | Ignore body signals |

**The 90-minute rule:** Hyperfocus > 90 min = guaranteed crash. Set a soft alarm.

---

## 3. The Hyperfocus Recovery Protocol

> **When you crash. Don't fight it. Recover.**

### Immediate (0-30 min post-crash)

```bash
atlas session end "hyperfocus crash: completed auth refactor"
atlas crumb "CRASH: exhausted after 4h hyperfocus. Need recovery."
# Physical: stand, stretch, water, bathroom
# NO screens for 20 min
```

### Recovery (30 min - 2 hours)

```bash
atlas stats          # See what you ACTUALLY did (usually impressive)
atlas trail          # Review breadcrumbs
# Physical: walk, shower, food, nap
# NO new work
```

### Next Session (when ready)

```bash
atlas session start "recovery: light tasks only"
atlas task list --overdue  # Handle fires only
atlas plan                 # Gentle replan
```

---

## 2. The Hyperfocus Hangover Protocol

> **After long hyperfocus. Your brain is fried.**

```bash
# 1. End session honestly
atlas session end "4h hyperfocus on auth. Exhausted."

# 2. Leave a DETAILED crumb for tomorrow
atlas crumb "HYPERFOCUS HANGOVER: Completed OAuth flow. Exhausted. Tomorrow: START SLOW. Review tests first. No new features."

# 3. Check the damage
atlas stats  # Usually: "Whoa, I DID do a lot"

# 4. MANDATORY: Physical reset
# - Walk outside (10 min minimum)
# - Protein + water
# - No screens 30 min
# - Sleep if tired

# 5. Tomorrow: START SLOW
atlas plan  # Will suggest light start
atlas session start "recovery: review tests only"
```

**Warning:** After 4h+ hyperfocus, next session MUST be short (<60 min) and low-cognitive-load.

---

## 3. Preventing the Trap

> **Design against hyperfocus traps.**

### Time-Box the Entry

```bash
atlas session start "feature: new auth" --estimated-minutes=90
# Dashboard shows countdown
# Soft alert at 90 min
```

### Use Focus Mode (Dashboard)

```bash
atlas dash
# Press 'f' → Focus mode
# Enter: "OAuth callback handler"
# 25 min timer + forced break
# Outcome: c / p / n
```

### Body Doubling (Virtual)

```bash
atlas dash
# Split layout (Tab) → Sidebar visible
# Keep dashboard visible = body double
# See timer, see streak, see "you're in flow"
```

---

## 4. The "Just One More Thing" Trap

> **The most dangerous phrase in ADHD.**

| Thought | Action |
|---------|--------|
| "Just fix this one bug" | `atlas catch "bug: fix later" --type=task` |
| "Just add this feature" | `atlas catch "feature: add later" --type=idea` |
| "Just refactor this" | `atlas crumb "refactor candidate: X" --project=current` |

**Rule:** Capture → Continue. Never interrupt flow for "quick" things.

---

## 4.5 The "Flow State" vs "Hyperfocus" Distinction

| | Flow State | Hyperfocus |
|---|------------|------------|
| **Control** | Can stop | Can't stop |
| **Awareness** | Present | Tunnel vision |
| **Energy** | Energizing | Draining |
| **Exit** | Natural pause | Crash |
| **Aftermath** | Satisfied | Exhausted/shame |

**Atlas helps:** Dashboard shows session duration. Soft alerts at 60/90 min. `atlas crumb` captures context for recovery.

---

## 5. The "Stuck in Hyperfocus" Emergency Kit

> **When you CAN'T stop but NEED to.**

### Physical Interrupt (strongest)

1. **Phone alarm** (across room) — physical movement required
2. **Smartwatch vibration** — haptic, harder to ignore
2. **Timer with sound** — different from gentle cues

### Environmental

1. **Light change** — smart bulb shifts color at 90 min
2. **Sound change** — playlist ends, silence = signal
3. **Body double** — coworking (virtual or IRL) = external accountability

### Digital

```bash
# Hard stop
atlas session end "forced stop: hyperfocus limit reached"
atlas crumb "FORCED STOP: was in hyperfocus on X. Context saved."
```

---

## 6. Post-Hyperfocus Integration

> **Make it count. Don't let it vanish.**

```bash
# 1. End session honestly
atlas session end "4h hyperfocus: completed X, Y, Z"

# 2. Capture wins (dopamine)
atlas catch "shipped OAuth PKCE flow" --type=win
atlas catch "solved 3-day bug in 4h" --type=win

# 3. Detailed crumb for integration
atlas crumb "HYPERFOCUS: Completed OAuth PKCE + tests. Mental model: JWT in cookie, PKCE prevents replay. Next: refresh token rotation."

# 4. Physical reset (MANDATORY)
# Walk, water, protein, no screens 20 min

# 5. Next session: LIGHT
atlas session start "integration: write docs for OAuth"
```

---

## 6. Hyperfocus as a Tool (Not a Trap)

> **Channel it. Don't fight it.**

### When to Lean In

- **Greenfield projects** — New code, high creativity
- **Deep debugging** — Complex, single-threaded
- **Learning** — New language/framework deep dive
- **Creative work** — Writing, design, architecture

### When to Avoid

- **Routine tasks** — Use Pomodoro instead
- **Meetings/coordination** — Time-box strictly
- **Admin/email** — Time-box + batch
- **When tired** — Hyperfocus borrows from tomorrow

---

## 7. The Hyperfocus Recovery Checklist

> **Post-crash. Check each box.**

```
[ ] Session ended honestly
[ ] Wins captured (atlas catch --type=win)
[ ] Detailed crumb written
[ ] Stats reviewed (celebrate what DID happen)
[ ] Physical reset: walk + water + protein
[ ] No screens 20+ min
[ ] Sleep if tired
[ ] Next session: LIGHT + SHORT (<60 min)
[ ] Next session: LOW COGNITIVE LOAD
[ ] Communicate if needed ("recovering from deep work")
```

---

## 7.5 The "Good Hyperfocus" Checklist

> **When hyperfocus serves you.**

```
[ ] Intentional entry (atlas session start + estimate)
[ ] Soft timer set (90 min max)
[ ] Physical needs met (water, snacks nearby)
[ ] Exit criteria defined ("done when tests pass")
[ ] Recovery planned (what's next after?)
[ ] Wins captured during/after
[ ] Integration time scheduled
```

---

## Summary: The Hyperfocus Compact

```
┌────────────────────────────────────────────────────────────┐
│  HYPERFOCUS IS A LOAN. REPAY IT GENTLY.                   │
├────────────────────────────────────────────────────────────┤
│  ENTRY:    Intentional? Timer set? Body ready?            │
│  DURING:   90 min max. Water. Crumbs. Soft alerts.        │
│  EXIT:     Intentional > Forced. Crumb + wins + stats.    │
│  RECOVERY: Physical reset > screen time. Light next session.│
│  INTEGRATION: Crumb + wins + stats = compound value.      │
└────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Situation | Command |
|-----------|---------|
| Start intentional hyperfocus | `atlas session start "task" --estimated-minutes=90` |
| Soft alert at 90 min | Dashboard auto-alert |
| Capture context mid-flow | `atlas crumb "context note"` |
| Capture win | `atlas catch "shipped X" --type=win` |
| End honestly | `atlas session end "honest note"` |
| Post-crash reset | Walk + water + protein + no screens |
| Next session | Light, short, low cognitive load |

---

## Next Steps

- [Core Principles](core-principles.md) — Mental models
- [Time Blindness](time-blindness.md) — Gentle time awareness
- [Quick Wins](quick-wins.md) — 5-minute setup
- [Accessibility](accessibility.md) — Keyboard, screen readers, reduced motion