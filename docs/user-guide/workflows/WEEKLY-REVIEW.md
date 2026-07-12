# Weekly Review Workflow

> A structured ritual for reviewing your projects, clearing decks, and planning the week ahead.

---

## Why Weekly Review?

ADHD brains thrive on **external structure**. Without a weekly review, tasks pile up silently, context drifts, and Monday morning starts with panic instead of clarity. This workflow takes 15–20 minutes and gives you a clean slate.

---

## The Ritual

### Phase 1: Look Back (5 min)

```bash
# What did I actually do this week?
atlas stats week
atlas stats --velocity

# Which projects got attention?
atlas project list

# What didn't get done?
atlas task list --overdue
```

**Ask yourself:**

- What shipped this week?
- What stalled? Why?
- Did I work on the right things?

---

### Phase 2: Clear the Decks (5 min)

```bash
# Process captured ideas
atlas inbox --stats
atlas inbox --triage

# Handle overdue tasks
atlas task list --overdue
# → complete, reschedule, or remove each one

# Check parked contexts
atlas parked
# → restore or discard stale parks
```

**ADHD Tip:** Don't let the inbox grow past 10 items. Triage weekly, or it becomes overwhelming.

---

### Phase 3: Look Ahead (5 min)

```bash
# See what's coming up
atlas agenda 7

# Check tasks due soon
atlas task list --due-soon

# Guided planning ritual
atlas plan
```

**Set your weekly focus:**

- Pick 1–3 "must完成" items
- Block time for deep work
- Schedule breaks (seriously)

---

### Phase 4: Close the Loop (2 min)

```bash
# Leave breadcrumbs for Monday
atlas crumb "monday start: review PR #42, finish OAuth"

# Quick status check
atlas where
```

---

## Automation

Schedule this as a Friday afternoon ritual. Use a calendar reminder or a `launchd` job:

```bash
# Friday 16:00 reminder
cat > ~/Library/LaunchAgents/com.atlas.weekly-review.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.atlas.weekly-review</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/open</string>
        <string>-a</string>
        <string>Terminal</string>
        <string>-n</string>
        <string>--args</string>
        <string>-e</string>
        <string>atlas plan</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key><integer>5</integer>
        <key>Hour</key><integer>16</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
</dict>
</plist>
EOF
launchctl load ~/Library/LaunchAgents/com.atlas.weekly-review.plist
```

---

## Quick Reference

| Phase | Commands | Time |
|-------|----------|------|
| Look Back | `stats week`, `stats --velocity`, `project list` | 5 min |
| Clear Decks | `inbox --triage`, `task list --overdue`, `parked` | 5 min |
| Look Ahead | `agenda 7`, `task list --due-soon`, `plan` | 5 min |
| Close Loop | `crumb`, `where` | 2 min |

---

<div style="text-align: center; margin-top: 2em;">

**The goal is clarity, not completeness.**

You don't have to fix everything — just see where things stand.

</div>
