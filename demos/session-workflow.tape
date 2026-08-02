# Atlas Session Workflow Demo
# Demonstrates starting, tracking, and ending work sessions

Output session-workflow.gif

Set Shell "zsh"
Set FontSize 18
Set Width 800
Set Height 500
Set Theme "Dracula"
Set Padding 15
Set TypingSpeed 40ms

# Start of day - where was I?
Type "atlas where"
Enter
Sleep 2s

# Check breadcrumb trail
Type "atlas trail"
Enter
Sleep 2s

# Start working
Type "atlas session start myproject"
Enter
Sleep 2s

# Check status mid-session
Type "atlas session status"
Enter
Sleep 2s

# Leave a breadcrumb for context
Type "atlas crumb 'OAuth callback working'"
Enter
Sleep 1.5s

# End session with notes
Type "atlas session end"
Enter
Sleep 3s
