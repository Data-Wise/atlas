# Atlas Getting Started Demo
# Shows the core workflow: where, session, catch, stats

Output getting-started.gif

Set Shell "zsh"
Set FontSize 18
Set Width 800
Set Height 500
Set Theme "Dracula"
Set Padding 15
Set TypingSpeed 40ms

# Check where we left off
Type "atlas where"
Enter
Sleep 2s

# Start a session
Type "atlas session start atlas"
Enter
Sleep 2s

# Capture an idea without losing focus
Type "atlas catch 'add dark mode to dashboard'"
Enter
Sleep 1.5s

# Check session status
Type "atlas session status"
Enter
Sleep 2s

# End session
Type "atlas session end"
Enter
Sleep 2.5s

# Show stats
Type "atlas stats"
Enter
Sleep 3s
