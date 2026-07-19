# Atlas SwiftBar / xbar plugin

Always-visible atlas state in the macOS menu bar: active session (with elapsed
minutes), inbox count, and streak — the ambient surface recommended by
`docs/specs/PROPOSAL-tui-alternatives-2026-07-19.md` (glanceable without opening
anything).

```
🎯 25m · 📥 3 · 🔥 4     ← session running
⚪ idle · 📥 3 · 🔥 4    ← no session
```

The dropdown shows the active project/task and offers one-click terminal
commands: open the digest (bare `atlas`), start/end a session, open the inbox.

## Install

1. Install [SwiftBar](https://github.com/swiftbar/SwiftBar) (`brew install swiftbar`)
   or [xbar](https://xbarapp.com/) — the plugin format is shared.
2. Requirements on PATH: `atlas`, `jq`.
3. Copy or symlink the plugin into your plugins folder:

   ```bash
   ln -s "$(pwd)/contrib/swiftbar/atlas-menubar.5s.sh" ~/Documents/SwiftBar/
   ```

4. The `.5s` filename suffix is the refresh interval. 5 seconds is snappy for
   session timing; rename to `.1m` or `.5m` if you prefer fewer atlas calls.

## Notes

- Read-only against atlas's stable JSON surfaces (`session status --format json`,
  `inbox --count`, `stats --format json`) — survives atlas upgrades as long as
  that contract holds (it's snapshot-locked in atlas's test suite).
- Degrades gracefully: shows `⚠️ atlas` with the reason if `atlas`/`jq` are
  missing; never blocks the menu bar.
- No daemon: SwiftBar runs the script on its own schedule.
