# Atlas Context Switching Demo
# Shows park/unpark for ADHD-friendly context switching

Output context-switch.gif

Set Shell "zsh"
Set FontSize 20
Set Width 1000
Set Height 600
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 50ms

# Working on Project A
Type "# Deep in Project A..."
Enter
Sleep 500ms

Type "atlas session status"
Enter
Sleep 2s

# Urgent interruption!
Type "# URGENT: Bug in production API!"
Enter
Sleep 1s

# Park current context
Type "atlas park 'was implementing OAuth, callback almost done'"
Enter
Sleep 2s

# Switch to urgent project
Type "cd ~/projects/api && atlas session start api 'Fix prod bug'"
Enter
Sleep 2s

# Fix the bug...
Type "# ... fix the bug ..."
Enter
Sleep 1s

Type "atlas session end 'Fixed null pointer in user endpoint'"
Enter
Sleep 2s

# Return to original context
Type "# Back to Project A"
Enter
Sleep 500ms

Type "atlas unpark"
Enter
Sleep 2.5s

# Context restored!
Type "atlas session status"
Enter
Sleep 2s
