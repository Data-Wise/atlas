# Quick Wins

> **5 minutes. 5 changes. Permanent upgrade.**

---

## 1. Shell Aliases (30 seconds)

Add to `~/.zshrc` / `~/.bashrc` / `config.fish`:

```bash
# Core workflow
alias w='atlas session start'
alias e='atlas session end'
alias c='atlas catch'
alias q='atlas where'
alias t='atlas trail'

# Quick views
alias a='atlas stats'
alias at='atlas stats --velocity'
alias ap='atlas stats --patterns'
alias ac='atlas stats --calibrate'

# Inbox
alias i='atlas inbox'
alias it='atlas inbox --triage'
alias ic='atlas inbox --count'
```

**Why:** `c "idea"` = 3 keystrokes. Friction = zero.

---

## 2. Enable Completions (1 minute)

```bash
# Zsh (recommended)
atlas completions zsh > ~/.config/zsh/completions/_atlas
# Add to .zshrc:
fpath=(~/.config/zsh/completions $fpath)
autoload -Uz compinit && compinit

# Bash
atlas completions bash > ~/.bash_completion.d/atlas
# source ~/.bash_completion.d/atlas in .bashrc

# Fish
atlas completions fish > ~/.config/fish/completions/atlas.fish
```

**Why:** Tab-complete projects, flags, subcommands. Zero memory required.

---

## 3. Set Scan Paths (30 seconds)

```bash
atlas config add-path ~/projects
atlas config add-path ~/projects/research
atlas config add-path ~/projects/work
```

**Why:** `atlas sync` finds projects automatically. No manual `atlas project add`.

---

## 4. Configure ADHD Preferences (30 seconds)

```bash
atlas config setup
# Interactive wizard, or edit ~/.atlas/config.json:

{
  "preferences": {
    "adhd": {
      "showStreak": true,
      "celebrationLevel": "normal",
      "timeCues": true,
      "timeCueInterval": 30,
      "timeCueStyle": "gentle"
    }
  }
}
```

**Why:** Tailors Atlas to YOUR brain.

---

## 5. Create a Project Template (1 minute)

```bash
atlas template create my-stack
# Edit ~/.atlas/templates/my-stack.json with your standard:
# package.json, .STATUS, README, .github/, etc.

# Use it:
atlas init --template my-stack --name new-project
```

**Why:** No blank-page paralysis. Your stack, your conventions, instant.

---

## Total: ~5 Minutes

| Win | Time | Lasting Impact |
|-----|------|----------------|
| Aliases | 30s | 10x faster commands |
| Completions | 1m | Zero memory for flags/projects |
| Scan paths | 30s | Auto-discovery forever |
| ADHD prefs | 30s | Personalized nudges |
| Template | 1m | No blank page ever |

---

## Bonus: Auto-Session on cd (Advanced)

Add to `~/.zshrc`:

```bash
atlas-auto() {
  if [[ -f .STATUS ]] && [[ -z $ATLAS_SESSION_ACTIVE ]]; then
    atlas session start "$(basename "$(pwd)")" 2>/dev/null
    export ATLAS_SESSION_ACTIVE=1
  fi
}
chpwd_functions+=(atlas-auto)
```

**Result:** `cd myproject` → session starts automatically.

---

## Bonus: Breadcrumb on cd

```bash
atlas-cd() {
  builtin cd "$@" && \
  [[ -f .STATUS ]] && \
  atlas crumb "cd to $(basename "$(pwd)")" 2>/dev/null
}
alias cd=atlas-cd
```

**Result:** Context restored automatically when switching dirs.

---

## Bonus: Morning One-Liner

```bash
alias morning='atlas plan && atlas agenda && atlas task list --due-soon'
```

**Result:** One command → full day view.

---

## Verify It Works

```bash
# Test aliases
c "test alias"
atlas inbox --count

# Test completions
atlas <TAB>
atlas project <TAB>
atlas session <TAB>

# Test sync
atlas sync --dry-run
```

---

## Next Steps

- [Core Principles](core-principles.md) — Mental models
- [Time Blindness](time-blindness.md) — Time awareness
- [Hyperfocus](hyperfocus.md) — Ride the wave
- [Accessibility](accessibility.md) — Keyboard, screen readers, reduced motion
- [Core Principles](core-principles.md) — The mental models