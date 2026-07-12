# Automation Workflow

> Automate the boring stuff — scheduled syncs, CI checks, and launchd jobs that keep atlas in sync without manual effort.

---

## Why Automate?

ADHD + manual maintenance = forgotten maintenance. Automate repetitive tasks so atlas stays accurate without willpower.

---

## Launchd Jobs (macOS)

### Research Board Sync

Weekly refresh of research metadata + board render:

```bash
# Create the sync script
cat > ~/scripts/sync-research-board.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail

LOG=~/.atlas/research-board.log
ERRLOG=~/.atlas/research-board.err.log

echo "$(date): Starting sync" >> "$LOG"

atlas sync --research 2>> "$ERRLOG" | tee -a "$LOG"
obs research board --out ~/vault/Research/00_meta/_RESEARCH-BOARD.md 2>> "$ERRLOG"

echo "$(date): Done" >> "$LOG"
SCRIPT
chmod +x ~/scripts/sync-research-board.sh

# Create launchd job
cat > ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.data-wise.atlas-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/dt/scripts/sync-research-board.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key><integer>1</integer>
        <key>Hour</key><integer>9</integer>
        <key>Minute</key><integer>15</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/dt/.atlas/research-board.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/dt/.atlas/research-board.err.log</string>
</dict>
</plist>
PLIST

# Load it
launchctl load ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist
```

### Doctor Audit

Daily check for missing `.STATUS` / `CLAUDE.md` files:

```bash
cat > ~/scripts/atlas-doctor-check.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail

RESULT=$(atlas doctor --format json 2>/dev/null)
MISSING=$(echo "$RESULT" | jq '.missing | length')

if [ "$MISSING" -gt 0 ]; then
    echo "$(date): $MISSING projects missing settings" >> ~/.atlas/doctor.log
    echo "$RESULT" | jq '.missing[]' >> ~/.atlas/doctor.log
fi
SCRIPT
chmod +x ~/scripts/atlas-doctor-check.sh

# Launchd: daily at 08:00
cat > ~/Library/LaunchAgents/com.data-wise.atlas-doctor.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.data-wise.atlas-doctor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/dt/scripts/atlas-doctor-check.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key><integer>8</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
</dict>
</plist>
PLIST

launchctl load ~/Library/LaunchAgents/com.data-wise.atlas-doctor.plist
```

---

## Managing Launchd Jobs

```bash
# List loaded jobs
launchctl list | grep atlas

# Stop a job (keeps it registered)
launchctl unload ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist

# Restart a job
launchctl unload ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist
launchctl load ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist

# View logs
cat ~/.atlas/research-board.log
cat ~/.atlas/research-board.err.log

# Remove a job entirely
launchctl unload ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist
rm ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist
```

---

## CI Integration

### GitHub Actions

Use atlas in CI to validate project setup:

```yaml
# .github/workflows/atlas-check.yml
name: Atlas Doctor Check
on:
  push:
    branches: [main, dev]
  schedule:
    - cron: '0 8 * * 1'  # Monday 08:00

jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm link
      - run: atlas doctor --format json
```

### Pre-commit Hook

Run `atlas doctor` before commits:

```bash
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
# Check atlas doctor passes
RESULT=$(atlas doctor --format json 2>/dev/null)
MISSING=$(echo "$RESULT" | jq '.missing | length')
if [ "$MISSING" -gt 0 ]; then
    echo "⚠️  Atlas doctor found $MISSING projects missing settings"
    echo "$RESULT" | jq '.missing[]'
    echo "Run 'atlas doctor' for details"
    exit 1
fi
HOOK
chmod +x .git/hooks/pre-commit
```

---

## Scheduled Tasks (Cron Alternative)

For Linux or when launchd isn't available:

```bash
# Edit crontab
crontab -e

# Add these lines:
# Monday 09:15 — research board sync
15 9 * * 1 /Users/dt/scripts/sync-research-board.sh

# Daily 08:00 — doctor audit
0 8 * * * /Users/dt/scripts/atlas-doctor-check.sh

# Friday 16:00 — weekly review reminder
0 16 * * 5 /usr/bin/open -a Terminal -n --args -e "atlas plan"
```

---

## Shell Hooks

### Auto-Session Start

Start a session automatically when you enter a project directory:

```bash
# Add to ~/.zshrc
atlas-auto-session() {
    if [ -f .STATUS ] && [ -z "$ATLAS_SESSION_ACTIVE" ]; then
        atlas session start "$(basename "$(pwd)")" 2>/dev/null
        export ATLAS_SESSION_ACTIVE=1
    fi
}
chpwd_functions+=(atlas-auto-session)
```

### Breadcrumb on Cd

Leave a breadcrumb when switching directories:

```bash
# Add to ~/.zshrc
atlas-cd-breadcrumb() {
    builtin cd "$@" && \
    [ -f .STATUS ] && \
    atlas crumb "cd to $(basename "$(pwd)")" 2>/dev/null
}
alias cd=atlas-cd-breadcrumb
```

---

## Sync Chain

When multiple automated tasks depend on each other, order matters:

```
08:07  pmed-extensions-weekly-advance  (writes .STATUS)
09:15  sync-research-board.sh         (atlas sync --research + obs board)
09:38  research-action-board-weekly   (reads fresh data)
```

**Key principle:** Run producers before consumers.

---

## Quick Reference

| Task | Command | Frequency |
|------|---------|-----------|
| Research sync | `atlas sync --research` | Weekly |
| Doctor audit | `atlas doctor` | Daily |
| Board render | `obs research board` | Weekly |
| Registry cleanup | `atlas sync --remove-orphans` | Monthly |
| Config check | `atlas config show` | As needed |

---

<div style="text-align: center; margin-top: 2em;">

**Automate what you can.**

Your future self will thank you — and your current self can focus on the work that matters.

</div>
