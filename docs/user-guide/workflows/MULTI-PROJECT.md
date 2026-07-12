# Multi-Project Workflow

> Managing multiple projects without losing your mind — patterns for context switching, prioritization, and focus.

---

## The Multi-Project Trap

ADHD brains love novelty. You start Project A, get excited about Project B, and suddenly you have 7 "active" projects and zero shipped. Atlas helps you **see the landscape** and make intentional choices.

---

## See Everything at Once

```bash
# Full project list with status
atlas project list

# Filter by type
atlas project list --kind manuscript
atlas project list --kind program

# JSON for custom views
atlas project list --format json | jq '.[] | "\(.name): \(.status) \(.progress)%"'
```

**Reading the list:**

```
● atlas          active   75%   ← healthy, getting attention
◐ flow-cli       active   50%   ← paused, needs a push
○ mcp-server     idle     20%   ← neglected, decide: kill or restart
● medfit         active   90%   ← almost done, push through
```

**Symbols:**

| Symbol | Meaning |
|--------|---------|
| `●` | Active — getting regular sessions |
| `◐` | Paused — started but not recently active |
| `○` | Idle — hasn't been touched in a while |
| `✓` | Complete — done, ready to archive |

---

## The Triage Protocol

When you have too many projects, triage ruthlessly:

### Step 1: List Everything

```bash
atlas project list --format json > projects.json
```

### Step 2: Score Each Project

For each project, ask:

1. **Is this still relevant?** (Kill or archive dead projects)
2. **Does this have a deadline?** (Prioritize time-sensitive work)
3. **What's the next action?** (If you can't name it, the project is stuck)
4. **Can I ship a small win?** (Break big projects into shippable chunks)

### Step 3: Pick Your Focus

```bash
# Set focus on your top priority
atlas focus myproject "implement auth flow"

# Start a session
atlas session start myproject
```

---

## Context Switching Patterns

### Pattern 1: Park and Switch

For urgent interruptions:

```bash
# Working on Project A...
atlas park "mid-refactor: parser changes need tests"

# Switch to urgent Project B
cd ~/projects/b
atlas session start "fix prod bug"

# ... fix it ...

# Return to Project A
cd ~/projects/a
atlas unpark
# Context restored: "mid-refactor: parser changes need tests"
```

### Pattern 2: Time-Boxed Switching

For planned context switches (e.g., morning = deep work, afternoon = meetings):

```bash
# Morning: deep work
atlas session start myproject
# ... 2 hours of focused work ...
atlas session end "auth flow done"

# Afternoon: admin/meetings
atlas session start myproject "admin"
# ... handle emails, meetings ...
atlas session end "cleared inbox, reviewed PRs"
```

### Pattern 3: Multi-Project Day

When you need to touch multiple projects in one day:

```bash
# Project A: morning
atlas session start project-a "write tests"
atlas session end "tests passing"

# Project B: midday
atlas session start project-b "debug API"
atlas session end "found root cause"

# Project A: afternoon
atlas session start project-a "refactor"
atlas session end "cleaner structure"
```

**Check your day at the end:**

```bash
atlas stats
# Today: 3 sessions, 5h 20m
# Projects: project-a (2 sessions), project-b (1 session)
```

---

## Prioritization Framework

### The 1-3-5 Rule

Each week, commit to:

- **1** big thing (must ship)
- **3** medium things (should progress)
- **5** small things (quick wins)

Track them as tasks:

```bash
atlas task add "Ship auth flow" --priority=P0 --due=friday
atlas task add "Review PR #42" --priority=P1
atlas task add "Update docs" --priority=P1
atlas task add "Fix lint warning" --priority=P2
atlas task add "Clean up imports" --priority=P3
```

### The Eisenhower Matrix

Use priority levels to map urgency vs. importance:

| | Urgent | Not Urgent |
|---|---|---|
| **Important** | P0 — do now | P1 — schedule |
| **Not Important** | P2 — delegate or defer | P3 — drop |

---

## Neglected Project Detection

```bash
# Find projects with no recent sessions
atlas project list --format json | \
  jq '.[] | select(.lastSession | . < (now - 604800)) | .name'
# → projects not touched in 7 days

# Find projects with low progress
atlas project list --format json | \
  jq '.[] | select(.progress < 30) | "\(.name): \(.progress)%"'
```

**Decision framework for neglected projects:**

1. **Still relevant?** → Schedule a session this week
2. **No deadline, low energy?** → Archive it (no guilt)
3. **Blocked?** → Write a crumb explaining what's blocking you
4. **Wrong priority?** → Update `.STATUS` and move on

---

## The Weekly Multi-Project Review

```bash
# 1. See all projects
atlas project list

# 2. Check which got attention this week
atlas stats week

# 3. Find the neglected ones
atlas project list --format json | \
  jq '.[] | select(.lastSession | . < (now - 604800))'

# 4. Review overdue tasks
atlas task list --overdue

# 5. Plan next week's focus
atlas plan
```

---

## Quick Reference

| Situation | Command |
|-----------|---------|
| See all projects | `project list` |
| Filter by type | `project list --kind manuscript` |
| Set focus | `focus <project> "task description"` |
| Switch contexts | `park` → switch → `unpark` |
| Find neglected | `project list --format json \| jq ...` |
| Weekly plan | `plan` |
| Check today | `stats` |

---

<div style="text-align: center; margin-top: 2em;">

**Less is more.**

It's better to ship 2 projects than to start 7. Atlas helps you see what's real — use that clarity to make intentional choices.

</div>
