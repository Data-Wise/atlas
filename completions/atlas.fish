# Atlas CLI completion for Fish
# Install: cp atlas.fish ~/.config/fish/completions/

# Disable file completion by default
complete -c atlas -f

# Helper function to get project names
function __atlas_projects
    atlas project list --format names 2>/dev/null
end

# Main commands
complete -c atlas -n "__fish_use_subcommand" -a "project" -d "Project registry operations"
complete -c atlas -n "__fish_use_subcommand" -a "focus" -d "Get or set project focus"
complete -c atlas -n "__fish_use_subcommand" -a "status" -d "Get or update project status"
complete -c atlas -n "__fish_use_subcommand" -a "session" -d "Session management"
complete -c atlas -n "__fish_use_subcommand" -a "catch" -d "Quick capture an idea or task"
complete -c atlas -n "__fish_use_subcommand" -a "inbox" -d "Show captured items"
complete -c atlas -n "__fish_use_subcommand" -a "where" -d "Show current context"
complete -c atlas -n "__fish_use_subcommand" -a "crumb" -d "Leave a breadcrumb trail marker"
complete -c atlas -n "__fish_use_subcommand" -a "trail" -d "Show breadcrumb trail"
complete -c atlas -n "__fish_use_subcommand" -a "dashboard" -d "Launch interactive dashboard TUI"
complete -c atlas -n "__fish_use_subcommand" -a "dash" -d "Launch interactive dashboard TUI (alias)"
complete -c atlas -n "__fish_use_subcommand" -a "init" -d "Initialize atlas configuration"
complete -c atlas -n "__fish_use_subcommand" -a "sync" -d "Sync registry from .STATUS files"
complete -c atlas -n "__fish_use_subcommand" -a "migrate" -d "Migrate data between storage backends"

# Global options
complete -c atlas -l storage -d "Storage backend" -xa "filesystem sqlite"
complete -c atlas -s V -l version -d "Show version"
complete -c atlas -s h -l help -d "Show help"

# Project subcommands
complete -c atlas -n "__fish_seen_subcommand_from project" -a "add" -d "Register a project"
complete -c atlas -n "__fish_seen_subcommand_from project" -a "list" -d "List all projects"
complete -c atlas -n "__fish_seen_subcommand_from project" -a "show" -d "Show project details"
complete -c atlas -n "__fish_seen_subcommand_from project" -a "remove" -d "Unregister a project"

# Project add options
complete -c atlas -n "__fish_seen_subcommand_from project; and __fish_seen_subcommand_from add" -s t -l tags -d "Comma-separated tags"
complete -c atlas -n "__fish_seen_subcommand_from project; and __fish_seen_subcommand_from add" -s s -l status -d "Initial status" -xa "active paused archived"

# Project list options
complete -c atlas -n "__fish_seen_subcommand_from project; and __fish_seen_subcommand_from list" -s s -l status -d "Filter by status" -xa "active paused blocked archived complete"
complete -c atlas -n "__fish_seen_subcommand_from project; and __fish_seen_subcommand_from list" -s t -l tag -d "Filter by tag"
complete -c atlas -n "__fish_seen_subcommand_from project; and __fish_seen_subcommand_from list" -l format -d "Output format" -xa "table json names"

# Project show/remove - complete with project names
complete -c atlas -n "__fish_seen_subcommand_from project; and __fish_seen_subcommand_from show" -xa "(__atlas_projects)"
complete -c atlas -n "__fish_seen_subcommand_from project; and __fish_seen_subcommand_from remove" -xa "(__atlas_projects)"

# Session subcommands
complete -c atlas -n "__fish_seen_subcommand_from session" -a "start" -d "Start a work session"
complete -c atlas -n "__fish_seen_subcommand_from session" -a "end" -d "End current session"
complete -c atlas -n "__fish_seen_subcommand_from session" -a "status" -d "Show current session"

# Session start - complete with project names
complete -c atlas -n "__fish_seen_subcommand_from session; and __fish_seen_subcommand_from start" -xa "(__atlas_projects)"

# Status command options
complete -c atlas -n "__fish_seen_subcommand_from status" -l set -d "Set status" -xa "active paused blocked archived complete"
complete -c atlas -n "__fish_seen_subcommand_from status" -l progress -d "Set progress (0-100)"
complete -c atlas -n "__fish_seen_subcommand_from status" -l focus -d "Set current focus"
complete -c atlas -n "__fish_seen_subcommand_from status" -l next -d "Set next action"
complete -c atlas -n "__fish_seen_subcommand_from status" -l complete -d "Mark current next action as done"
complete -c atlas -n "__fish_seen_subcommand_from status" -l then -d "After completing, add this as next action"
complete -c atlas -n "__fish_seen_subcommand_from status" -l increment -d "Increment progress by amount"
complete -c atlas -n "__fish_seen_subcommand_from status" -l create -d "Create .STATUS file if missing"
complete -c atlas -n "__fish_seen_subcommand_from status" -xa "(__atlas_projects)"

# Focus command - complete with project names
complete -c atlas -n "__fish_seen_subcommand_from focus" -xa "(__atlas_projects)"

# Catch command options
complete -c atlas -n "__fish_seen_subcommand_from catch" -s p -l project -d "Associate with project" -xa "(__atlas_projects)"
complete -c atlas -n "__fish_seen_subcommand_from catch" -s t -l type -d "Type" -xa "idea task bug note question"

# Inbox command options
complete -c atlas -n "__fish_seen_subcommand_from inbox" -s p -l project -d "Filter by project" -xa "(__atlas_projects)"
complete -c atlas -n "__fish_seen_subcommand_from inbox" -l triage -d "Interactive triage mode"
complete -c atlas -n "__fish_seen_subcommand_from inbox" -l stats -d "Show inbox statistics"

# Where/trail commands - complete with project names
complete -c atlas -n "__fish_seen_subcommand_from where" -xa "(__atlas_projects)"
complete -c atlas -n "__fish_seen_subcommand_from trail" -xa "(__atlas_projects)"
complete -c atlas -n "__fish_seen_subcommand_from trail" -s d -l days -d "Days to show"

# Crumb command options
complete -c atlas -n "__fish_seen_subcommand_from crumb" -s p -l project -d "Associate with project" -xa "(__atlas_projects)"

# Sync command options
complete -c atlas -n "__fish_seen_subcommand_from sync" -s d -l dry-run -d "Show what would be synced"
complete -c atlas -n "__fish_seen_subcommand_from sync" -s w -l watch -d "Watch for changes"
complete -c atlas -n "__fish_seen_subcommand_from sync" -s p -l paths -d "Comma-separated root paths"
complete -c atlas -n "__fish_seen_subcommand_from sync" -l remove-orphans -d "Remove projects no longer on disk"

# Migrate command options
complete -c atlas -n "__fish_seen_subcommand_from migrate" -s f -l from -d "Source storage type" -xa "filesystem sqlite"
complete -c atlas -n "__fish_seen_subcommand_from migrate" -s t -l to -d "Target storage type" -xa "filesystem sqlite"
complete -c atlas -n "__fish_seen_subcommand_from migrate" -l dry-run -d "Show what would be migrated"

# Init command options
complete -c atlas -n "__fish_seen_subcommand_from init" -s g -l global -d "Initialize global atlas config"
