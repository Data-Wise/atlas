#!/bin/bash
# sync-research-board.sh
# Weekly research sync + board render (runs via launchd Monday 09:15)
#
# PURPOSE:
#   Refreshes research registry metadata from .STATUS files, then renders
#   the research board to the Obsidian vault for the action board to read.
#
# SCHEDULE:
#   Monday 09:15 via com.data-wise.atlas-sync.plist
#   Chain position:
#     08:07  pmed-extensions-weekly-advance (writes .STATUS)
#     09:15  THIS SCRIPT (atlas sync --research + obs research board)
#     09:38  research-action-board-weekly (reads fresh data)
#
# WHAT IT DOES:
#   1. atlas sync --research     — Refreshes manuscript/program metadata
#   2. atlas sync -p ~/projects/r-packages/active — Refreshes R package metadata
#   3. obs research board --out <vault>/Research/00_meta/_RESEARCH-BOARD.md
#
# LOGS:
#   ~/.atlas/research-board.log      — stdout (successful runs)
#   ~/.atlas/research-board.err.log  — stderr (errors)
#
# HOW TO STOP/KILL:
#   # Unload the job (stops future runs)
#   launchctl unload ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist
#
#   # Reload after edits
#   launchctl load ~/Library/LaunchAgents/com.data-wise.atlas-sync.plist
#
#   # Check if loaded
#   launchctl list | grep atlas
#
# HOW TO DIAGNOSE:
#   # View logs
#   cat ~/.atlas/research-board.log
#   cat ~/.atlas/research-board.err.log
#
#   # Run manually to test
#   /Users/dt/projects/dev-tools/atlas/scripts/sync-research-board.sh
#
#   # Dry run (see what would happen)
#   atlas sync --research --dry-run
#   obs research board --dry-run

set -euo pipefail

LOG_DIR="$HOME/.atlas"
LOG_FILE="$LOG_DIR/research-board.log"
ERR_LOG="$LOG_DIR/research-board.err.log"
VAULT_PATH="/Users/dt/Library/Mobile Documents/iCloud~md~obsidian/Documents"
BOARD_OUT="$VAULT_PATH/Research/00_meta/_RESEARCH-BOARD.md"
ATLAS_BIN="/Users/dt/projects/dev-tools/atlas/bin/atlas.js"
OBS_BIN="/opt/homebrew/bin/obs"
NODE_BIN="/opt/homebrew/bin/node"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$ERR_LOG" >&2
}

log "=== Research sync + board render started ==="

# Step 1: Atlas sync --research (refresh manuscript/program metadata from .STATUS)
log "Running: atlas sync --research"
if "$NODE_BIN" "$ATLAS_BIN" sync --research 2>>"$ERR_LOG"; then
  log "atlas sync --research completed successfully"
else
  error "atlas sync --research failed (exit $?)"
  # Continue to board render anyway — stale data is better than no board
fi

# Step 2: Atlas sync packages (refresh R package metadata)
log "Running: atlas sync -p ~/projects/r-packages/active"
if "$NODE_BIN" "$ATLAS_BIN" sync -p "$HOME/projects/r-packages/active" 2>>"$ERR_LOG"; then
  log "atlas sync packages completed successfully"
else
  error "atlas sync packages failed (exit $?)"
fi

# Step 3: Render research board
log "Running: obs research board --out $BOARD_OUT"
if "$OBS_BIN" research board --out "$BOARD_OUT" 2>>"$ERR_LOG"; then
  log "obs research board rendered successfully"
else
  error "obs research board failed (exit $?)"
fi

log "=== Research sync + board render finished ==="
