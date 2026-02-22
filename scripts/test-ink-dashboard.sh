#!/bin/bash
#
# Test Ink Dashboard Interactively
#
# This script launches the Ink dashboard POC in an interactive terminal
# so you can test all the view transitions and keyboard shortcuts.
#
# Usage:
#   ./scripts/test-ink-dashboard.sh
#
# Keyboard shortcuts to test:
#   j/k or ↓/↑  - Navigate between projects
#   Enter       - Show project detail view
#   f           - Enter focus mode
#   z           - Enter zen mode
#   T           - Show timeline view (Shift+t)
#   e           - Show ecosystem view
#   p           - Enter plan view (morning ritual)
#   q           - Quit
#   Esc         - Go back to main view (from any view)

echo "🚀 Launching Ink Dashboard..."
echo ""
echo "Test Checklist:"
echo "  [ ] Navigate with j/k keys"
echo "  [ ] Enter project detail (press Enter)"
echo "  [ ] Return to browse (press Esc)"
echo "  [ ] Enter focus mode (press f)"
echo "  [ ] Enter zen mode (press z)"
echo "  [ ] View timeline (press Shift+T)"
echo "  [ ] View ecosystem (press e)"
echo "  [ ] View plan (press p)"
echo "  [ ] Quit (press q)"
echo ""
echo "Starting dashboard..."
echo ""

npx tsx src/cli/dashboard-ink/index.tsx
