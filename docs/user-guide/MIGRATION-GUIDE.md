# Migration Guide: v0.13.0 → v0.13.1

> **Smooth upgrade. No breaking changes for most users.**

---

## Quick Check

```bash
atlas --version
# 0.13.1
```

If you see `0.13.1`, you're already upgraded.

---

## What Changed

| Area | Change | Impact |
|------|--------|--------|
| YAML Parsing | `yaml.stringify/parse` round-trip | Unknown fields preserved |
| Inbox | `--type`, `--limit`, `--stats` flags | New filtering |
| Man Pages | 4 new pages | Offline docs |
| Completions | Full rewrite (zsh/bash/fish) | Better tab-completion |
| CLI Shebang | Fixed (`#!/usr/bin/env node`) | Works with nvm/volta |
| Progress Coercion | YAML `progress: 100` → number | Fixes validation errors |

---

## Automatic Migration

> **Most users: zero action needed.**

```bash
# 1. Update
brew upgrade atlas
# OR
npm install -g @data-wise/atlas

# 2. Verify
atlas --version
# 0.13.1

# 3. Sync (picks up new YAML handling)
atlas sync
```

---

## Manual Steps (If Needed)

### 1. Fix `.STATUS` Progress Fields

**Issue:** YAML `progress: 100` was string, now must be number.

**Check:**
```bash
grep -r "progress:" ~/.atlas/projects/ 2>/dev/null | grep -v "progress: [0-9]"
```

**Fix (if any):**
```yaml
# Before (bad)
progress: "100"

# After (good)
progress: 100
```

### 2. Reinstall Completions

```bash
# Zsh
atlas completions zsh > ~/.config/zsh/completions/_atlas
# Ensure: fpath=(~/.config/zsh/completions $fpath)
# autoload -Uz compinit && compinit

# Bash
atlas completions bash > ~/.bash_completion.d/atlas
# source ~/.bash_completion.d/atlas

# Fish
atlas completions fish > ~/.config/fish/completions/atlas.fish
```

### 3. Update Man Pages Path

```bash
# Add to shell config (.zshrc/.bashrc)
export MANPATH="$HOME/projects/dev-tools/atlas/man:$MANPATH"

# Test
man atlas
man atlas-session
man atlas-project
man atlas-status
```

### 4. Reinstall Shell Aliases (Optional)

```bash
# If you use custom aliases, update:
alias w='atlas session start'
alias e='atlas session end'
alias c='atlas catch'
alias q='atlas where'
alias a='atlas stats'
alias i='atlas inbox'
alias t='atlas trail'
```

---

## Breaking Changes (None)

> **Zero breaking changes for v0.13.0 → v0.13.1**

| Area | v0.13.0 | v0.13.1 |
|------|---------|---------|
| Config format | Same | Same |
| Project registry | Same | Same |
| Session format | Same | Same |
| Capture format | Same | Same |
| CLI commands | Same | Same + new flags |
| API | Same | Same + new endpoints |

---

## New Features to Try

### 1. Inbox Filtering

```bash
atlas inbox --type task
atlas inbox --limit 10
atlas inbox --stats
atlas inbox --triage
```

### 2. YAML Passthrough

```yaml
# .STATUS - unknown fields now preserved
custom_field: "preserved"
unknown_key: "survives round-trip"
```

### 3. Man Pages

```bash
man atlas
man atlas-session
man atlas-project
man atlas-status
```

### 4. Improved Completions

```bash
atlas project list --<TAB>
# --count  --format  --help  --json  --kind  --paths  --status  --suggest  --tags
```

### 4.5 New Config Options

```bash
atlas config setup
# New: time cues, time cue interval, celebration level
```

---

## Rollback (If Needed)

```bash
# Downgrade
brew install atlas@0.13.0
# OR
npm install -g @data-wise/atlas@0.13.0

# Data compatible both ways
atlas migrate --from filesystem --to filesystem
```

---

## Verification Checklist

- [ ] `atlas --version` shows `0.13.1`
- [ ] `atlas --help` shows new flags
- [ ] `atlas inbox --help` shows `--type`, `--limit`, `--stats`
- [ ] `man atlas` works
- [ ] `atlas --version` in completion works
- [ ] `atlas sync` runs without warnings
- [ ] `atlas config show` shows new options
- [ ] `atlas sync --from-status` works with YAML passthrough

---

## Getting Help

| Channel | Link |
|---------|------|
| Issues | https://github.com/Data-Wise/atlas/issues |
| Discussions | https://github.com/Data-Wise/atlas/discussions |
| Changelog | https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md |
| Docs | https://data-wise.github.io/atlas/ |

---

## Summary

| ✅ | No breaking changes |
| ✅ | Auto-migration on sync |
| ✅ | New features opt-in |
| ✅ | Rollback trivial |
| ✅ | All tests pass (2003) |

**Upgrade with confidence.**