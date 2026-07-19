#!/usr/bin/env bash
# <xbar.title>Atlas Status</xbar.title>
# <xbar.version>v1.0</xbar.version>
# <xbar.author>Data-Wise</xbar.author>
# <xbar.desc>Always-visible atlas state: active session, inbox count, streak.</xbar.desc>
# <xbar.dependencies>atlas,jq</xbar.dependencies>
#
# SwiftBar/xbar plugin for atlas (https://github.com/Data-Wise/atlas).
# Install: copy (or symlink) into your SwiftBar/xbar plugins folder.
# The ".5s" in the filename is the refresh interval — rename to taste
# (e.g. atlas-menubar.1m.sh). Requires `atlas` and `jq` on PATH.
#
# Menu bar:  🎯 25m · 📥 3 · 🔥 4     (active session)
#            ⚪ idle · 📥 3 · 🔥 4    (no session)
# Dropdown:  project focus, streak message, quick commands.

set -euo pipefail

# SwiftBar strips the GUI PATH down; make brew/npm installs visible.
# Appended (not prepended) so an atlas earlier on the user's PATH wins.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"

fail() { echo "⚠️ atlas"; echo "---"; echo "$1"; exit 0; }

command -v atlas >/dev/null 2>&1 || fail "atlas not on PATH | color=red"
command -v jq >/dev/null 2>&1 || fail "jq not on PATH (brew install jq) | color=red"

session_json=$(atlas session status --format json 2>/dev/null || echo "null")
inbox_count=$(atlas inbox --count 2>/dev/null || echo "?")
stats_json=$(atlas stats --format json 2>/dev/null || echo "{}")

streak=$(echo "$stats_json" | jq -r '.streak.current // 0')
streak_msg=$(echo "$stats_json" | jq -r '.streak.message // empty')

if [ "$session_json" = "null" ] || [ -z "$session_json" ]; then
  bar="⚪ idle"
  session_lines="No active session | color=gray"
else
  project=$(echo "$session_json" | jq -r '.project // "?"')
  task=$(echo "$session_json" | jq -r '.task // empty')
  # elapsed minutes from startTime if present
  start=$(echo "$session_json" | jq -r '.startTime // empty')
  mins=""
  if [ -n "$start" ]; then
    start_s=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "${start%%.*}" +%s 2>/dev/null || echo "")
    [ -n "$start_s" ] && mins=$(( ( $(date -u +%s) - start_s ) / 60 ))m
  fi
  bar="🎯 ${mins:-on}"
  session_lines="Active: ${project}${task:+ — $task} | color=green"
fi

echo "${bar} · 📥 ${inbox_count} · 🔥 ${streak}"
echo "---"
echo "$session_lines"
[ -n "$streak_msg" ] && echo "$streak_msg | color=gray"
echo "---"
echo "Open digest | bash=/bin/zsh param1=-ic param2='atlas' terminal=true"
echo "Start session… | bash=/bin/zsh param1=-ic param2='atlas session start' terminal=true"
echo "End session | bash=/bin/zsh param1=-ic param2='atlas session end' terminal=true"
echo "Inbox | bash=/bin/zsh param1=-ic param2='atlas inbox' terminal=true"
echo "---"
echo "Refresh | refresh=true"
