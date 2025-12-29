# Atlas Quick Capture Demo
# Shows how to capture ideas without losing focus

Output quick-capture.gif

Set Shell "zsh"
Set FontSize 20
Set Width 1000
Set Height 600
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 50ms

# Scenario: You're working and have ideas
Type "# Working on code... sudden idea!"
Enter
Sleep 1s

# Quick capture - don't lose the thought
Type "atlas catch 'use Redis for session cache'"
Enter
Sleep 1.5s

# Another idea pops up
Type "atlas catch 'add retry logic to API calls'"
Enter
Sleep 1.5s

# Bug noticed
Type "atlas catch 'login button misaligned on mobile' --type bug"
Enter
Sleep 1.5s

# Later: check inbox
Type "# Later: Review captured ideas"
Enter
Sleep 500ms

Type "atlas inbox"
Enter
Sleep 2.5s

# See stats
Type "atlas inbox --stats"
Enter
Sleep 2s
