# SwiftBar

> Always-visible atlas state in the macOS menu bar — no dashboard, no terminal, just glance up.

---

## Why

The dashboard needs a terminal open. Sometimes you just want to know, at a glance: is a session
running, how many things are in the inbox, is the streak alive. SwiftBar is that ambient surface.

```
🎯 25m · 📥 3 · 🔥 4     ← session running
⚪ idle · 📥 3 · 🔥 4    ← no session
```

The dropdown shows the active project/task and one-click commands: open the digest (bare
`atlas`), start/end a session, open the inbox.

## Install

1. Install [SwiftBar](https://github.com/swiftbar/SwiftBar) (`brew install swiftbar`) — or
   [xbar](https://xbarapp.com/), the plugin format is shared.
2. Requirements on `PATH`: `atlas`, `jq`.
3. Symlink the plugin into your plugins folder:

   ```bash
   ln -s "$(pwd)/contrib/swiftbar/atlas-menubar.5s.sh" ~/Documents/SwiftBar/
   ```

4. Open SwiftBar (or run `Refresh All`) — the menu bar item appears within one refresh cycle.

## Tuning the Refresh Interval

The `.5s` in the filename **is** the interval — SwiftBar/xbar reads it from the file name, not a
config option.

| Suffix | Interval | When to use |
|---|---|---|
| `.5s` (shipped default) | 5 seconds | Snappy session timing, don't mind frequent `atlas` calls |
| `.30s` | 30 seconds | Good middle ground for most laptops |
| `.1m` | 1 minute | Fewer `atlas` calls — battery-conscious, session timer updates less often |
| `.5m` | 5 minutes | Just the ambient digest, timing precision doesn't matter |

To change it, rename the file (the symlink target, not the symlink itself matters less than the
name SwiftBar sees):

```bash
mv ~/Documents/SwiftBar/atlas-menubar.5s.sh ~/Documents/SwiftBar/atlas-menubar.1m.sh
```

## What It Reads

Read-only against atlas's stable JSON surfaces — the plugin never writes:

| Source | Powers |
|---|---|
| `atlas session status --format json` | Active session, elapsed time, task |
| `atlas inbox --count` | `📥N` badge |
| `atlas stats --format json` | `🔥N` streak |

These are the same flags flow-cli depends on (see [Integrations](../INTEGRATIONS.md)) — locked
by atlas's test suite, so the plugin survives upgrades as long as that contract holds.

## Degrade Behavior

If `atlas` or `jq` aren't found on `PATH`, the menu bar shows `⚠️ atlas` with the reason instead
of failing silently or blocking the menu bar. SwiftBar's GUI environment strips down `PATH`, so
the plugin appends `/opt/homebrew/bin:/usr/local/bin` — if your install lives elsewhere, symlink
`atlas` into one of those paths.

## Uninstall

```bash
rm ~/Documents/SwiftBar/atlas-menubar.*.sh
```

---

**Now what?** → [Integrations: the full flow-cli ↔ atlas contract](../INTEGRATIONS.md)
