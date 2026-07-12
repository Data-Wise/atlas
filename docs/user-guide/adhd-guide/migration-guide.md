# Migration Guide: v0.13.0 → v0.13.1

> **Smooth upgrade. No breaking changes.**

---

## What's New in v0.13.1

| Area | Change |
|------|--------|
| **YAML Parsing** | Passthrough mode — unknown fields preserved |
| **Inbox** | `--type` filter, `--limit` cap, `--stats` flag |
| **Man Pages** | `man atlas`, `man atlas-session`, `man atlas-project`, `man atlas-status` |
| **Zsh Completions** | Full rewrite — 26 commands, dynamic project completion |
| **Docs** | New nav, version badges, stale links fixed |

---

## Breaking Changes

**None.** v0.13.1 is fully backward compatible.

---

## Upgrade Steps

### 1. Update Atlas

```bash
# Homebrew
brew upgrade atlas

# Or npm
npm install -g @data-wise/atlas

# Or from source
cd atlas && npm install && npm link
```

### 2. Verify Version

```bash
atlas --version
# Should output: 0.13.1
```

### 3. Test Your Workflow

```bash
# Basic commands
atlas session start test-project
atlas catch "test capture"
atlas inbox --stats
atlas stats --velocity

# New features
atlas inbox --type task --limit 5
atlas stats --patterns
atlas stats --calibrate myproject --minutes 30
```

---

## Config Changes (Optional)

### New ADHD Preferences

```json
// ~/.atlas/config.json
{
  "preferences": {
    "adhd": {
      "showStreak": true,
      "celebrationLevel": "normal",
      "timeCues": true,
      "timeCueInterval": 30,
      "timeCueStyle": "gentle"
    },
    "session": {
      "defaultDuration": 25,
      "breakDuration": 5
    }
  }
}
```

Run `atlas config setup` to interactively configure.

### Zsh Completions

```bash
# New improved completions
atlas completions zsh > ~/.config/zsh/completions/_atlas

# Add to .zshrc if not present:
fpath=(~/.config/zsh/completions $fpath)
autoload -Uz compinit && compinit
```

---

## Behavior Changes

### Sync — Research Mode

```bash
# Old (still works)
atlas sync --from-status --paths ~/projects/research

# New alias (same behavior)
atlas sync --research
# Defaults to ~/projects/research
```

**Plain sync preserves research metadata:**
```bash
atlas sync
# ⚠️  3 research project(s) preserved but not refreshed
#    Run `atlas sync --from-status` to update kind/target/tasks
```

### Inbox — New Flags

```bash
atlas inbox --type task      # Filter by type
atlas inbox --limit 10       # Cap results
atlas inbox --stats          # Summary only
```

---

## Man Pages

```bash
man atlas            # Main reference
man atlas-session    # Session commands
man atlas-project    # Project commands
man atlas-status     # Status file format
```

**Add to MANPATH** (add to shell config):
```bash
export MANPATH="$HOME/projects/dev-tools/atlas/man:$MANPATH"
```

---

## Config File Changes

### New Fields in `~/.atlas/config.json`

```json
{
  "preferences": {
    "adhd": {
      "showStreak": true,
      "celebrationLevel": "normal",
      "timeCues": true,
      "timeCueInterval": 30,
      "timeCueStyle": "gentle"
    },
    "session": {
      "defaultDuration": 25,
      "breakDuration": 5
    }
  }
}
```

**No migration needed.** Defaults applied automatically.

---

## Zsh Completions — What's New

| Feature | Before | After |
|---------|--------|-------|
| Commands | Basic | All 26 commands |
| Subcommands | None | Full subcommand tree |
| Flags | Basic | All flags with descriptions |
| Projects | None | Dynamic project name completion |
| Flags with values | Partial | Full (--paths, --storage, etc.) |

**Regenerate:**
```bash
atlas completions zsh > ~/.config/zsh/completions/_atlas
```

---

## Documentation Updates

| Page | Change |
|------|--------|
| `index.md` | v0.13.1 features, updated badges |
| `getting-started/installation.md` | Man pages section, updated version |
| `WHAT-S-NEW.md` | Added v0.13.1 section |
| `TUTORIAL.md` | Inbox flags, man pages, quick ref expanded |
| `WORKFLOWS.md` | Analytics flags (--velocity, --patterns, --calibrate) |
| `ARCHITECTURE.md` | Task entities, ScheduleRecord, new use cases |
| `DIAGRAMS.md` | CLI tree (14 groups), ER + ScheduleRecord, repos updated |

---

## Known Issues

| Issue | Workaround |
|-------|------------|
| `atlas inbox --type win` shows no results | Use `--type win` (not `win`) |
| `atlas stats --calibrate` needs existing sessions | Run a few sessions first |
| Zsh completions need manual regenerate | Run `atlas completions zsh > ...` |

---

## Rollback (If Needed)

```bash
# Homebrew
brew install atlas@0.13.0

# npm
npm install -g @data-wise/atlas@0.13.0

# From source
git checkout v0.13.0 && npm install && npm link
```

**Data is compatible.** No migration needed to rollback.

---

## Support

| Channel | Link |
|---------|------|
| Issues | [GitHub](https://github.com/Data-Wise/atlas/issues) |
| Discussions | [GitHub](https://github.com/Data-Wise/atlas/discussions) |
| Docs | https://data-wise.github.io/atlas/ |
| Changelog | [CHANGELOG.md](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md) |

---

## Summary

| ✅ | No breaking changes |
| ✅ | New features additive only |
| ✅ | Config backward compatible |
| ✅ | Data compatible (no migration) |
| ✅ | All 2003 tests pass |

**Upgrade with confidence.**