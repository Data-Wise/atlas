# Atlas Session Workflow Demo
# Demonstrates starting, tracking, and ending work sessions

Output session-workflow.gif

Set Shell "zsh"
Set FontSize 20
Set Width 1000
Set Height 600
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 50ms

# Start of day - where was I?
Type "# Morning: Where was I?"
Enter
Sleep 500ms

Type "atlas where"
Enter
Sleep 2s

# Check breadcrumb trail
Type "atlas trail"
Enter
Sleep 2s

# Start working
Type "# Starting work session"
Enter
Sleep 500ms

Type "atlas session start myproject 'Implementing auth flow'"
Enter
Sleep 2s

# Check status mid-session
Type "# Check progress"
Enter
Sleep 500ms

Type "atlas session status"
Enter
Sleep 2s

# Leave a breadcrumb for context
Type "atlas crumb 'OAuth callback working, need refresh token'"
Enter
Sleep 1.5s

# End session with notes
Type "# End of session"
Enter
Sleep 500ms

Type "atlas session end 'OAuth flow complete, tests passing'"
Enter
Sleep 3s
