# Atlas Quick Capture Demo
# Shows how to capture ideas without losing focus

Output quick-capture.gif

Set Shell "zsh"
Set FontSize 18
Set Width 800
Set Height 500
Set Theme "Dracula"
Set Padding 15
Set TypingSpeed 40ms

# Quick capture - don't lose the thought
Type "atlas catch 'use Redis for session cache'"
Enter
Sleep 1.5s

# Another idea pops up
Type "atlas catch 'add retry logic to API calls'"
Enter
Sleep 1.5s

# Bug noticed
Type "atlas catch 'login button misaligned' --type bug"
Enter
Sleep 1.5s

# Check inbox
Type "atlas inbox"
Enter
Sleep 2.5s

# See stats
Type "atlas inbox --stats"
Enter
Sleep 2s
