# Atlas Context Switching Demo
# Shows park/unpark for ADHD-friendly context switching

Output context-switch.gif

Set Shell "zsh"
Set FontSize 18
Set Width 800
Set Height 500
Set Theme "Dracula"
Set Padding 15
Set TypingSpeed 40ms

# Start working on Project A
Type "atlas session start myproject"
Enter
Sleep 2s

Type "atlas session status"
Enter
Sleep 2s

# Park current context for urgent task
Type "atlas park 'OAuth almost done'"
Enter
Sleep 2s

# Switch to urgent project
Type "atlas session start api"
Enter
Sleep 2s

# End urgent session
Type "atlas session end"
Enter
Sleep 2s

# Return to original context
Type "atlas unpark"
Enter
Sleep 2.5s

# Context restored!
Type "atlas session status"
Enter
Sleep 2s
