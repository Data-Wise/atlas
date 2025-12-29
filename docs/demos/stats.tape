# Atlas Stats Demo
# Shows session analytics and progress tracking

Output stats.gif

Set Shell "zsh"
Set FontSize 20
Set Width 1000
Set Height 600
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 50ms

# Weekly stats (default)
Type "# How's my week going?"
Enter
Sleep 500ms

Type "atlas stats"
Enter
Sleep 3s

# Monthly overview
Type "# Monthly summary"
Enter
Sleep 500ms

Type "atlas stats month"
Enter
Sleep 3s

# Filter by project
Type "# Just atlas project"
Enter
Sleep 500ms

Type "atlas stats --project atlas"
Enter
Sleep 3s

# JSON format for scripts
Type "# JSON for automation"
Enter
Sleep 500ms

Type "atlas stats --format json | head -20"
Enter
Sleep 2.5s
