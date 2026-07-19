# Scenarios

Five moments. Five commands. No theory — just what you'd actually type.

---

## "It's 9:04 and you don't remember what you were doing."

You sit down. Coffee's not even done brewing. Yesterday is a blur.

```bash
atlas                    # the digest — what you're doing, what's next
atlas plan                # if you want the full guided morning ritual instead
atlas session start        # pick up where the digest says you left off
```

90 seconds, and you're back in flow instead of staring at a cursor wondering where to start.

---

## "Someone's at your desk. You have to drop this. Right now."

Mid-thought, mid-file, mid-sentence. No time to write a proper note.

```bash
atlas park "urgent: prod incident, back to this after"
# ... go deal with it ...
atlas catch "the auth bug is in the token refresh, not the login flow"  # while it's fresh
# ... later, once it's handled ...
atlas unpark
```

`park` freezes the whole context — project, task, duration. `catch` grabs the one thing you'd
otherwise lose. `unpark` hands it all back, exactly where you left off.

---

## "You're back after two weeks. Everything feels stale."

Vacation, a different project, or just life. You don't trust what atlas thinks is true anymore.

```bash
atlas                          # the digest — what does atlas *think* is current?
atlas doctor                   # which projects are missing .STATUS / CLAUDE.md / config
atlas sync                     # pull the real state from .STATUS files
atlas inbox --triage           # work through everything you caught but never processed
```

`doctor` catches drift before it bites you — a missing `.STATUS`, a stale contract file.
`sync` is the reset button. `inbox --triage` clears two weeks of "don't lose this" into
either a task, a breadcrumb, or the trash.

---

## "Friday. Time to write up what actually happened this week."

Not what you *meant* to do — what you can prove happened.

```bash
atlas stats                    # weekly summary: sessions, hours, streak
atlas stats --velocity         # 4-week rolling trend — busier or slower than usual?
atlas session status --format json  # for scripting a weekly report
```

Every `session end` this week already recorded its own evidence — the git delta (files touched,
commits) for that session, shown automatically and folded into the weekly numbers. No
reconstructing from memory; `atlas stats` is reading receipts, not vibes.

---

## "You just want to know, at a glance, without opening a dashboard."

No terminal open. No Ink TUI. Just the menu bar.

```bash
brew install swiftbar
ln -s "$(pwd)/contrib/swiftbar/atlas-menubar.5s.sh" ~/Documents/SwiftBar/
```

```
🎯 25m · 📥 3 · 🔥 4     ← session running, glance and go
```

The digest lives in your menu bar now — session state, inbox count, streak — updated on its own
schedule, zero terminal required. Full setup: [SwiftBar](../swiftbar.md).

---

**Now what?** → [Cookbook: copy-paste recipes for everything above](../cookbook/COOKBOOK.md)
