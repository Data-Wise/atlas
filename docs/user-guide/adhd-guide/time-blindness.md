# Time Blindness

> **You can't feel time. Atlas feels it for you.**

---

## What Time Blindness Feels Like

| Situation | Neurotypical | ADHD |
|-----------|--------------|------|
| "How long have I been working?" | "~45 min" | "Wait, it's 6 PM?!" |
| "How long will this take?" | "~30 min" | "5 min... or 3 hours?" |
| "When is that deadline?" | "Friday" | "Wait, TODAY?!" |
| Pacing | Natural | Feast or famine |

**It's not laziness. It's missing hardware.** Your internal clock is broken. Atlas is the external clock.

---

## 1. Real-Time Session Timer

> **See time. Don't guess.**

```bash
atlas session start myproject
# Dashboard: live count-up
# 0:00 → 25:00 → 45:12 → 1:23:45
```

**Why it works:**
- Visual + numeric
- Always visible in dashboard
- No mental math required
- Works in background

---

## 2. Gentle Time Cues

> **Nudge. Don't nag.**

```bash
atlas config setup
# → Time cues: yes
# → Interval: 30 minutes (15/30/45/60)
```

**What happens every 30 min (configurable):**
- Dashboard: subtle pulse animation
- Terminal: `⏱ 30 min — how's it going?`
- No sound, no pop-up, no interruption

**Customize:**
```bash
atlas config setup
# Or edit ~/.atlas/config.json:
{
  "preferences": {
    "adhd": {
      "timeCues": true,
      "timeCueInterval": 30,
      "timeCueStyle": "gentle"  # gentle | firm | silent
    }
  }
}
```

| Style | Behavior |
|-------|----------|
| `gentle` | Pulse + soft message |
| `firm` | Bold message, no auto-dismiss |
| `silent` | Dashboard only, no terminal output |

---

## 3. Velocity Analytics

> **See your actual pace. Stop guessing.**

```bash
atlas stats --velocity
```

**Shows:**
- 4-week rolling velocity (sessions/week, hours/week)
- Trend line (improving? declining? stable?)
- Sparkline in dashboard

```
Velocity (last 4 weeks)
Week 1: ████████ 3.2 hrs
Week 2: ██████████ 4.1 hrs
Week 3: ███████ 2.8 hrs
Week 4: ███████████ 4.5 hrs  ← improving!
Trend: ↗ +15%
```

**Use it to:**
- Set realistic weekly goals
- See if you're burning out
- Celebrate progress (not perfection)

---

## 4. Pattern Detection

> **When do YOU work best?**

```bash
atlas stats --patterns
```

**Shows:**
- Best days of week
- Best hours of day
- Session length distribution
- Flow state frequency
- Dead zones (when you struggle)

```
Best hours: 9-11am (flow: 78%), 2-4pm (flow: 65%)
Dead zones: 12-1pm (lunch fog), 4-6pm (decision fatigue)
Best day: Tuesday (4.2 hrs avg)
Worst day: Friday (1.8 hrs avg)
Session length: 25min (mode), 45min (avg)
Flow sessions: 34% of total
```

**Use this to:**
- Schedule deep work in peak hours
- Protect peak hours (no meetings)
- Schedule admin in dead zones
- Plan sprints around your rhythm

---

## 5. Calibration Engine

> **Train your estimation. Stop being wrong.**

```bash
atlas stats --calibrate myproject --minutes 30
```

**How it works:**
1. You estimate: "This will take 30 min"
2. Atlas tracks actual time
3. Bayesian engine updates your personal calibration
4. Future estimates auto-adjusted

```
Calibration for "myproject"
Estimated: 30 min → Actual: 47 min (1.57x)
Estimated: 60 min → Actual: 52 min (0.87x)
Personal multiplier: 1.12x
Next estimate: 30 min → Atlas suggests 34 min
```

**After 10+ sessions:** Estimates within 20% accuracy.

---

## 6. Session Export → Calendar

> **See your time. Visually.**

```bash
atlas session export --format ics > sessions.ics
# Import into Google Calendar, Apple Calendar, Outlook
```

**Result:** Your work sessions appear as calendar blocks.
- See gaps (unstructured time)
- See clusters (deep work days)
- Share with team/partner
- See patterns across weeks

---

## 7. Dead Zone Detection

> **When flow stops. Don't push.**

```bash
atlas stats --patterns
# Look for: low flow %, short sessions, high interruption
```

**Dead zone signals:**
- Sessions < 15 min repeatedly
- Flow % < 20%
- High interruption count
- Many "parked" contexts

**Response:** Don't push. `atlas park` → break → `atlas unpark` or switch task.

---

## 8. Pomodoro Integration

> **Structure when you need it.**

```bash
atlas dash
# Press 'f' → Focus mode
# Enter task → 25 min timer
# Auto-break at 25 min
# Outcome: c (completed) / p (partial) / n (pivoted)
```

**Why 25/5?** Short enough to start. Long enough for flow. Built-in breaks prevent crash.

---

## 9. Timeline View

> **See your day. Visually.**

```bash
atlas dash
# Press 'T' (Shift+T) → Timeline
```

```
09:00 ████████████████  atlas (45m)
10:00 ░░░░░░░░
11:00 ██████████████████████████  research (1h 10m)
12:00 ░░░░░░░░
13:00 ████████  atlas (25m)
14:00 ████████████████████  flow-cli (1h 20m)
```

**Why:** Time blindness = invisible time. Timeline makes it visible.

---

## 10. Velocity-Based Planning

> **Plan with data. Not hope.**

```bash
atlas plan
# Uses your velocity to suggest realistic daily capacity
```

**Morning ritual:**
1. `atlas plan` → reviews velocity, suggests 2-3 focus blocks
2. `atlas agenda` → merged schedule (tasks + calendar + sessions)
3. `atlas task list --due-soon` → urgent items
4. `atlas session start` → begin

---

## Time Cue Configuration

```bash
atlas config setup
# Or edit ~/.atlas/config.json:

{
  "preferences": {
    "adhd": {
      "timeCues": true,
      "timeCueInterval": 30,        # minutes
      "timeCueStyle": "gentle",     # gentle | firm | silent
      "showSessionTimer": true,
      "showVelocity": true
    }
  }
}
```

| Setting | Options | Default |
|---------|---------|---------|
| `timeCues` | `true` / `false` | `true` |
| `timeCueInterval` | 15, 30, 45, 60 | `30` |
| `timeCueStyle` | `gentle` / `firm` / `silent` | `gentle` |
| `showSessionTimer` | `true` / `false` | `true` |
| `showVelocity` | `true` / `false` | `true` |

---

## Quick Reference

| Need | Command |
|------|---------|
| Start timer | `atlas session start project` |
| See velocity | `atlas stats --velocity` |
| See patterns | `atlas stats --patterns` |
| Calibrate | `atlas stats --calibrate proj --minutes 30` |
| Export calendar | `atlas session export --format ics > cal.ics` |
| Timeline | `atlas dash` → Press `T` |
| Plan day | `atlas plan` |
| Configure cues | `atlas config setup` |

---

## The Core Insight

> **You don't need better time management. You need external time.**

Your brain doesn't track time. Atlas does.

| Internal | External (Atlas) |
|----------|------------------|
| "~20 min?" | 23:47 (precise) |
| "Later" | Calendar block |
| "I think..." | Velocity trend |
| "I feel..." | Pattern data |

**Stop fighting your brain. Give it the external clock it needs.**

---

## Next Steps

- [Core Principles](core-principles.md) — Mental models
- [Hyperfocus Management](hyperfocus.md) — Ride the wave
- [Quick Wins](quick-wins.md) — 5-minute setup
- [Accessibility](accessibility.md) — Keyboard, screen readers, reduced motion