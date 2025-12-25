#compdef atlas

# Atlas CLI completion for ZSH
# Install: source /path/to/atlas.zsh or add to ~/.zshrc

_atlas() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  local -a commands
  commands=(
    'project:Project registry operations'
    'focus:Get or set project focus'
    'status:Get or update project status'
    'session:Session management'
    'catch:Quick capture an idea or task'
    'inbox:Show captured items'
    'where:Show current context'
    'crumb:Leave a breadcrumb trail marker'
    'trail:Show breadcrumb trail'
    'dashboard:Launch interactive dashboard TUI'
    'init:Initialize atlas configuration'
    'sync:Sync registry from .STATUS files'
    'migrate:Migrate data between storage backends'
  )

  local -a global_options
  global_options=(
    '--storage[Storage backend: filesystem or sqlite]:storage:(filesystem sqlite)'
    '-V[Show version]'
    '--version[Show version]'
    '-h[Show help]'
    '--help[Show help]'
  )

  _arguments -C \
    $global_options \
    '1: :->command' \
    '*::arg:->args'

  case $state in
    command)
      _describe -t commands 'atlas command' commands
      ;;
    args)
      case $line[1] in
        project)
          local -a project_commands
          project_commands=(
            'add:Register a project'
            'list:List all projects'
            'show:Show project details'
            'remove:Unregister a project'
          )
          _describe -t commands 'project command' project_commands
          ;;
        session)
          local -a session_commands
          session_commands=(
            'start:Start a work session'
            'end:End current session'
            'status:Show current session'
          )
          _describe -t commands 'session command' session_commands
          ;;
        status)
          _arguments \
            '--set[Set status]:status:(active paused blocked archived complete)' \
            '--progress[Set progress (0-100)]:percent:' \
            '--focus[Set current focus]:text:' \
            '--next[Set next action]:action:' \
            '--complete[Mark current next action as done]' \
            '--then[After completing, add this as next action]:action:' \
            '--increment[Increment progress]:amount:' \
            '--create[Create .STATUS file if missing]' \
            '1:project:_atlas_projects'
          ;;
        focus)
          _arguments \
            '1:project:_atlas_projects' \
            '2:focus text:'
          ;;
        catch)
          _arguments \
            '-p[Associate with project]:project:_atlas_projects' \
            '-t[Type]:type:(idea task bug note question)' \
            '1:text:'
          ;;
        inbox)
          _arguments \
            '-p[Filter by project]:project:_atlas_projects' \
            '--triage[Interactive triage mode]' \
            '--stats[Show inbox statistics]'
          ;;
        where|trail)
          _arguments \
            '1:project:_atlas_projects'
          ;;
        crumb)
          _arguments \
            '-p[Associate with project]:project:_atlas_projects' \
            '1:text:'
          ;;
        sync)
          _arguments \
            '-d[Show what would be synced]' \
            '--dry-run[Show what would be synced]' \
            '-w[Watch for changes]' \
            '--watch[Watch for changes]' \
            '-p[Comma-separated root paths]:paths:_files -/' \
            '--paths[Comma-separated root paths]:paths:_files -/' \
            '--remove-orphans[Remove projects no longer on disk]'
          ;;
        migrate)
          _arguments \
            '-f[Source storage type]:from:(filesystem sqlite)' \
            '--from[Source storage type]:from:(filesystem sqlite)' \
            '-t[Target storage type]:to:(filesystem sqlite)' \
            '--to[Target storage type]:to:(filesystem sqlite)' \
            '--dry-run[Show what would be migrated]'
          ;;
      esac
      ;;
  esac
}

# Helper function to complete project names
_atlas_projects() {
  local -a projects
  # Get project list from atlas (cached for performance)
  if [[ -z "$_atlas_project_cache" ]] || [[ $(( $(date +%s) - $_atlas_project_cache_time )) -gt 60 ]]; then
    _atlas_project_cache=($(atlas project list --format names 2>/dev/null))
    _atlas_project_cache_time=$(date +%s)
  fi
  projects=($_atlas_project_cache)
  _describe -t projects 'project' projects
}

compdef _atlas atlas
