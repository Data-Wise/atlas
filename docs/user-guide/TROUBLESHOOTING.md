# Troubleshooting & FAQ

> **Common issues, solutions, and "it works on my machine" fixes.**

---

## Start Here: `atlas doctor`

Before digging into a specific symptom below, run the built-in audit — it catches the most
common root causes (missing `.STATUS`, missing `CLAUDE.md`, contract drift) in one pass:

```bash
atlas doctor                 # audit all registered projects
atlas doctor --fix --write   # create missing CLAUDE.md files
```

If `doctor` comes back clean and you're still stuck, the sections below cover the rest.

---

## Installation Issues

### `atlas: command not found`

**Cause:** Not in PATH, or wrong shell.

```bash
# Check install location
which atlas
# or
npm list -g @data-wise/atlas

# Fix: add to PATH (add to .zshrc/.bashrc)
export PATH="$HOME/.local/bin:$PATH"
# or for npm
export PATH="$(npm bin -g):$PATH"
```

### `atlas: permission denied`

```bash
# Fix permissions
chmod +x $(which atlas)

# Or reinstall
npm install -g @data-wise/atlas
```

### `node: not found` / Wrong Node Version

```bash
# Atlas needs Node 18+
node --version

# Use nvm
nvm install 20
nvm use 20

# Or specify in config
echo '{"storage": "filesystem"}' > ~/.atlas/config.json
ATLAS_STORAGE=filesystem atlas ...
```

---

## Session Issues

### "Active session exists" Error

```bash
atlas session start myproject
# Error: Active session exists for project "other-project"
```

**Fix:**
```bash
atlas session end "switching projects"
# Then
atlas session start myproject
```

**Or force (loses current session):**
```bash
atlas session end --force "switching projects"
```

### Session Won't End

```bash
atlas session end "note"
# Hangs or returns immediately without confirmation
```

**Debug:**
```bash
atlas session status
# Check if session is actually active
# Check ~/.atlas/sessions.json for corruption

# Force cleanup
rm ~/.atlas/sessions.json
# (loses session history)
```

### Session Time Wrong

```bash
atlas session status
# Shows: Duration: 0m (but been working 2 hours)
```

**Cause:** System clock drift, or session started in different timezone.

**Fix:**
```bash
# Check system time
date

# End and restart
atlas session end "time drift fix"
atlas session start myproject
```

---

## Sync Issues

### "No projects found" on Sync

```bash
atlas sync
# Synced 0 projects
```

**Fix:**
```bash
# Check scan paths
atlas config paths

# Add your project root
atlas config add-path ~/projects

# Or scan specific path
atlas sync --paths ~/myprojects
```

### Research Projects Not Syncing

```bash
atlas sync --from-status
# or
atlas sync --research
```

**Requires:** Projects have `.STATUS` file with `kind: manuscript` or `kind: program`

```yaml
# .STATUS example
status: active
kind: manuscript
target: "JASA"
progress: 45
```

---

## Inbox Issues

### Captures Not Showing

```bash
atlas catch "idea"
atlas inbox
# Empty!
```

**Debug:**
```bash
# Check capture file
cat ~/.atlas/captures.json

# Check filter
atlas inbox --type idea
atlas inbox --type task
atlas inbox --project myproject
```

**Common cause:** Filter mismatch. Default type is `idea`.

```bash
atlas catch "task thing" --type=task
atlas inbox --type task  # Now shows
```

### Inbox Triage Stuck

```bash
atlas inbox --triage
# Hangs or no items
```

**Fix:**
```bash
# Check capture file
cat ~/.atlas/captures.json | jq '.[] | select(.status=="inbox")'

# Reset triage state
# (edit captures.json manually, or delete and re-capture)
```

---

## Config Issues

### Config Not Loading

```bash
atlas config show
# Shows defaults, not your changes
```

**Fix:**
```bash
# Check config file exists
cat ~/.atlas/config.json

# Validate JSON
cat ~/.atlas/config.json | jq .

# Fix JSON syntax, then:
atlas config show
```

### Scan Paths Not Working

```bash
atlas config add-path ~/myprojects
atlas sync
# Still scans old paths
```

**Fix:**
```bash
# Clear cache
atlas sync --remove-orphans

# Or reset config
rm ~/.atlas/config.json
atlas config setup
```

---

## Dashboard Issues

### Dashboard Won't Launch

```bash
atlas dash
# Error: Cannot find module 'ink'
```

**Fix:**
```bash
# Reinstall dependencies
cd /path/to/atlas
rm -rf node_modules package-lock.json
npm install
npm link
```

### Dashboard Freezes / No Data

```bash
atlas dash
# Blank screen, or spinner forever
```

**Debug:**
```bash
# Check data exists
ls ~/.atlas/
ls ~/.atlas/projects/

# Run with debug
DEBUG=atlas:* atlas dash

# Common: no projects registered
atlas project list
# If empty → atlas project add
```

### Dashboard Colors Wrong / Unreadable

```bash
# Check theme
atlas config show | grep theme

# Reset theme
atlas config setup
# Choose theme: default, nord, solarized, mono, high-contrast
```

### Dashboard Keys Not Working

**v0.14:** the dashboard has 3 views (Now/Timer/Plan) with keys defined in
`src/cli/dashboard-ink/lib/keymap.ts` — press `?` in-app for the live table, or see
[REFCARD](../REFCARD.md#keyboard-shortcuts-dashboard).

| Key | Issue | Fix |
|-----|-------|-----|
| `Tab` | Cycles layout | Ensure terminal supports `Tab` (not intercepted) |
| `1`/`2`/`3` or `n`/`t`/`p` | Switch views | Ensure not in an input field |
| `?` | Help overlay | Ensure not in an input field |
| `Tab` (split) | Panel focus | Use `Shift+Tab` for reverse |

---

## Storage Issues

### Switch Filesystem → SQLite

```bash
atlas migrate --from filesystem --to sqlite
```

**Verify:**
```bash
atlas project list
atlas session list
```

### SQLite Corruption

```bash
# Backup first!
cp ~/.atlas/atlas.db ~/.atlas/atlas.db.backup

# Rebuild from filesystem
atlas migrate --from sqlite --to filesystem --dry-run
atlas migrate --from sqlite --to filesystem
```

### "Database locked" Error

```bash
atlas sync
# Error: database is locked
```

**Fix:**
```bash
# Find and kill other atlas processes
pkill -f atlas

# Or check for stale lock
rm ~/.atlas/atlas.db-wal
rm ~/.atlas/atlas.db-shm
```

---

## MCP Server Issues

### MCP Server Won't Start

`atlas-mcp` is a **separate binary** (package.json `bin` entry), not an `atlas mcp` subcommand:

```bash
command -v atlas-mcp
# Not found? Cannot find module?
cd /path/to/atlas
npm install
npm link
```

### Claude Desktop Not Connecting

**Config:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "atlas": {
      "command": "atlas-mcp"
    }
  }
}
```

**Restart Claude Desktop completely** (Cmd+Q, reopen).

### MCP Tools Not Working

```bash
# Test manually
atlas-mcp
# Should show the server running on stdio

# Test tool
echo '{"method":"tools/call","params":{"name":"atlas_get_context","arguments":{}}}' | atlas-mcp
```

---

## Performance Issues

### Slow Startup

```bash
time atlas --version
# > 2 seconds
```

**Fix:**
```bash
# Check storage
ls -lh ~/.atlas/

# Large files?
du -sh ~/.atlas/*

# Consider SQLite for large registries
atlas migrate --from filesystem --to sqlite
```

### Slow Sync

```bash
atlas sync --paths ~/large-monorepo
# Takes forever
```

**Optimize:**
```bash
# Add .atlas-scan-children only where needed
touch ~/monorepo/.atlas-scan-children

# Exclude directories in config
# ~/.atlas/config.json:
{
  "scanDepth": 2,
  "exclude": ["node_modules", ".git", "dist", "build", "target"]
}
```

---

## Data Recovery

### Lost Sessions

```bash
# Check session file
cat ~/.atlas/sessions.json

# If corrupted, restore from git (if tracked)
git checkout HEAD -- ~/.atlas/sessions.json
```

### Lost Projects

```bash
# Check registry
cat ~/.atlas/projects.json

# Re-scan
atlas sync --force
```

### Corrupted .STATUS Files

```bash
# Find bad files
find ~/projects -name ".STATUS" -exec sh -c 'yaml=$(cat {} 2>/dev/null) || echo "BAD: {}"' \;

# Fix YAML syntax
# Common: tabs instead of spaces, missing quotes
```

---

## Getting Help

### Debug Mode

```bash
DEBUG=atlas:* atlas <command>
# Verbose logging
```

### Log Files

```bash
# Session logs
~/.atlas/sessions.log

# Sync logs
~/.atlas/sync.log

# Dashboard errors
~/.atlas/dashboard.log
```

### Report a Bug

```bash
atlas --version
# Include version, OS, Node version

# Minimal reproduction
# 1. Fresh temp dir
# 2. Minimal steps
# 3. Expected vs actual
```

---

## FAQ

### Q: Can I use Atlas with multiple computers?

**A:** Yes. Sync `~/.atlas/` via iCloud/Dropbox/Syncthing, or use SQLite with shared file.

### Q: Does Atlas work on Windows?

**A:** Yes, via WSL2. Native Windows support planned.

### Q: Can I use Atlas without the CLI?

**A:** Yes, as a library: `import Atlas from '@data-wise/atlas'`

### Q: How do I backup my data?

```bash
# Quick backup
tar -czf atlas-backup-$(date +%Y%m%d).tar.gz ~/.atlas/
```

### Q: Can I share my registry with team?

**A:** Yes. Share `~/.atlas/projects.json` + `sessions.json`, or use SQLite with shared file.

### Q: How do I reset everything?

```bash
rm -rf ~/.atlas/
atlas init
```

---

## Uninstalling / Exporting Your Data

```bash
tar -czf atlas-export-$(date +%Y%m%d).tar.gz ~/.atlas/   # everything: registry, sessions, tasks
brew uninstall atlas   # or: npm uninstall -g @data-wise/atlas
rm -rf ~/.atlas/       # optional — only if you don't want the data kept
```

Your `.STATUS` files live in your projects, not `~/.atlas/` — uninstalling atlas never touches them.

---

## Still Stuck?

| Channel | Response Time |
|---------|---------------|
| [GitHub Issues](https://github.com/Data-Wise/atlas/issues) | 24-48h |
| [Discussions](https://github.com/Data-Wise/atlas/discussions) | Community |
| Email | maintainer@data-wise.dev |

**Include:** `atlas --version`, OS, Node version, minimal repro steps.

---

## Related

- [Quick Wins](adhd-guide/quick-wins.md) — 5-minute setup
- [Core Principles](adhd-guide/core-principles.md) — Mental models
- [CLI Reference](../CLI-REFERENCE.md) — Full command docs
- [Architecture](../ARCHITECTURE.md) — System design

---

**Now what?** → [Quick Wins](adhd-guide/quick-wins.md)