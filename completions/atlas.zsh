#compdef atlas

# Atlas CLI completion for ZSH
# Version: 0.13.0
# Install: source /path/to/atlas.zsh or add to ~/.zshrc
# Docs: https://data-wise.github.io/atlas/

_atlas() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  local -a commands
  commands=(
    'project:Project registry operations'
    'focus:Get or set project focus'
    'status:Get or update project status'
    'session:Session management'
    'stats:Show session analytics'
    'plan:Morning planning ritual'
    'catch:Quick capture an idea or task'
    'inbox:Show captured items'
    'where:Show current context'
    'crumb:Leave a breadcrumb trail marker'
    'trail:Show breadcrumb trail'
    'park:Park current context for later'
    'unpark:Restore a parked context'
    'parked:List parked contexts'
    'dashboard:Launch interactive dashboard TUI'
    'init:Initialize atlas configuration'
    'template:Manage project templates'
    'doctor:Audit projects for settings contract'
    'sync:Sync registry from .STATUS files'
    'migrate:Migrate data between storage backends'
    'completions:Generate shell completions'
    'config:Manage atlas configuration'
    'task:Task management'
    'schedule:Schedule sync/push operations'
    'agenda:Show tasks and schedule items'
  )

  local -a global_options
  global_options=(
    '--storage[Storage backend]:storage:(filesystem sqlite)'
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
          _arguments -C \
            '1: :->subcmd' \
            '*::arg:->subargs'
          case $line[1] in
            add)
              _arguments \
                '-t[Tags]:tags:_atlas_tags' \
                '--tags[Tags]:tags:_atlas_tags' \
                '-s[Initial status]:status:(active paused archived)' \
                '--status[Initial status]:status:(active paused archived)' \
                '1:project path:_files -/'
              ;;
            list)
              _arguments \
                '-s[Filter by status]:status:(active paused blocked archived complete)' \
                '--status[Filter by status]:status:(active paused blocked archived complete)' \
                '-t[Filter by tag]:tag:' \
                '--tag[Filter by tag]:tag:' \
                '--format[Output format]:format:(table json names)' \
                '--count[Show project count only]' \
                '--suggest[Suggest project for input]'
              ;;
            show)
              _arguments \
                '--json[Output as JSON]' \
                '1:project:_atlas_projects'
              ;;
            remove)
              _arguments \
                '1:project:_atlas_projects'
              ;;
            *)
              _describe -t commands 'project subcommand' project_commands
              ;;
          esac
          ;;
        session)
          local -a session_commands
          session_commands=(
            'start:Start a work session'
            'end:End current session'
            'status:Show current session'
            'export:Export sessions to iCal/ICS format'
          )
          _arguments -C \
            '1: :->subcmd' \
            '*::arg:->subargs'
          case $line[1] in
            start)
              _arguments \
                '1:project:_atlas_projects' \
                '2:note:'
              ;;
            end)
              _arguments \
                '1:note:'
              ;;
            status)
              _arguments \
                '--format[Output format]:format:(table json text)' \
                '--json[Output as JSON]'
              ;;
            export)
              _arguments \
                '-f[Output file]:file:_files' \
                '--format[Export format]:format:(ical ics json)' \
                '--days[Number of days]:days:' \
                '--project[Filter by project]:project:_atlas_projects'
              ;;
            *)
              _describe -t commands 'session subcommand' session_commands
              ;;
          esac
          ;;
        task)
          local -a task_commands
          task_commands=(
            'add:Add a new task'
            'list:List tasks'
            'done:Mark task as completed'
            'rm:Delete a task'
          )
          _arguments -C \
            '1: :->subcmd' \
            '*::arg:->subargs'
          case $line[1] in
            add)
              _arguments \
                '-p[Project]:project:_atlas_projects' \
                '--project[Project]:project:_atlas_projects' \
                '--due[Due date]:date:' \
                '--priority[Priority]:priority:(low medium high urgent)' \
                '1:description:'
              ;;
            list)
              _arguments \
                '--completed[Show completed tasks]' \
                '--incomplete[Show incomplete tasks]' \
                '--overdue[Show overdue tasks]' \
                '--due-soon[Show tasks due soon]' \
                '--project[Filter by project]:project:_atlas_projects' \
                '--format[Output format]:format:(table json text)'
              ;;
            done)
              _arguments \
                '1:task id:'
              ;;
            rm)
              _arguments \
                '1:task id:'
              ;;
            *)
              _describe -t commands 'task subcommand' task_commands
              ;;
          esac
          ;;
        schedule)
          local -a schedule_commands
          schedule_commands=(
            'push:Push schedule data'
          )
          _arguments -C \
            '1: :->subcmd' \
            '*::arg:->subargs'
          case $line[1] in
            push)
              _arguments \
                '--format[Output format]:format:(table json text)' \
                '--data[Schedule data]:data:'
              ;;
            *)
              _describe -t commands 'schedule subcommand' schedule_commands
              ;;
          esac
          ;;
        template)
          local -a template_commands
          template_commands=(
            'list:List all available templates'
            'show:Show template content'
            'create:Create a new custom template'
            'export:Export a built-in template'
            'delete:Delete a custom template'
            'dir:Show custom templates directory'
          )
          _arguments -C \
            '1: :->subcmd' \
            '*::arg:->subargs'
          case $line[1] in
            show)
              _arguments \
                '1:template:_atlas_templates'
              ;;
            create)
              _arguments \
                '-t[Template type]:type:(node r-package python quarto research minimal)' \
                '--type[Template type]:type:(node r-package python quarto research minimal)' \
                '1:template id:'
              ;;
            export)
              _arguments \
                '1:template:_atlas_templates'
              ;;
            delete)
              _arguments \
                '1:template:_atlas_templates'
              ;;
            *)
              _describe -t commands 'template subcommand' template_commands
              ;;
          esac
          ;;
        config)
          local -a config_commands
          config_commands=(
            'paths:Show configured scan paths'
            'add-path:Add a scan path'
            'remove-path:Remove a scan path'
            'show:Show all configuration'
            'setup:Interactive configuration wizard'
            'prefs:Manage preferences'
          )
          _arguments -C \
            '1: :->subcmd' \
            '*::arg:->subargs'
          case $line[1] in
            add-path|remove-path)
              _arguments \
                '1:path:_files -/'
              ;;
            prefs)
              local -a prefs_commands
              prefs_commands=(
                'show:Show all preferences'
                'set:Set a preference'
                'get:Get a preference value'
              )
              _describe -t commands 'prefs subcommand' prefs_commands
              ;;
            *)
              _describe -t commands 'config subcommand' config_commands
              ;;
          esac
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
            '--json[Output as JSON]' \
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
            '--project[Associate with project]:project:_atlas_projects' \
            '-t[Type]:type:(idea task bug note question)' \
            '--type[Type]:type:(idea task bug note question)' \
            '1:text:'
          ;;
        inbox)
          _arguments \
            '-p[Filter by project]:project:_atlas_projects' \
            '--project[Filter by project]:project:_atlas_projects' \
            '--type[Filter by type]:type:(idea task bug note question parked win)' \
            '--limit[Maximum items]:limit:' \
            '--triage[Interactive triage mode]' \
            '--stats[Show inbox statistics]' \
            '--count[Print pending count only]'
          ;;
        where)
          _arguments \
            '1:project:_atlas_projects'
          ;;
        crumb)
          _arguments \
            '-p[Associate with project]:project:_atlas_projects' \
            '--project[Associate with project]:project:_atlas_projects' \
            '1:text:'
          ;;
        trail)
          _arguments \
            '-d[Days to show]:days:' \
            '--days[Days to show]:days:' \
            '--limit[Maximum breadcrumbs]:limit:' \
            '1:project:_atlas_projects'
          ;;
        park)
          _arguments \
            '-f[Park even without active session]' \
            '--force[Park even without active session]' \
            '-k[Keep session running]' \
            '--keep-session[Keep session running]' \
            '1:note:'
          ;;
        unpark)
          _arguments \
            '1:parked id:'
          ;;
        stats)
          _arguments \
            '-d[Number of days]:days:' \
            '--days[Number of days]:days:' \
            '-p[Filter by project]:project:_atlas_projects' \
            '--project[Filter by project]:project:_atlas_projects' \
            '--format[Output format]:format:(table json text md)' \
            '-e[Export to file]:file:_files' \
            '--export[Export to file]:file:_files' \
            '--velocity[Show velocity trend]' \
            '--patterns[Show productivity patterns]' \
            '--calibrate[Show time calibration]:project:_atlas_projects' \
            '--minutes[Proposed duration]:minutes:' \
            '1:period:(week month)'
          ;;
        plan)
          _arguments \
            '--ecosystem[Scan .STATUS files in directory]:path:_files -/' \
            '--json[Output as JSON]'
          ;;
        doctor)
          _arguments \
            '--kind[Only audit given kind]:kind:(manuscript program package)' \
            '--all[List all audited projects]' \
            '--all-registered[Include worktrees/tmp entries]' \
            '--fix[Create missing CLAUDE.md]' \
            '--write[Actually write files with --fix]' \
            '--format[Output format]:format:(table json)'
          ;;
        sync)
          _arguments \
            '-d[Dry run]' \
            '--dry-run[Dry run]' \
            '-w[Watch for changes]' \
            '--watch[Watch for changes]' \
            '-p[Root paths]:paths:' \
            '--paths[Root paths]:paths:' \
            '--remove-orphans[Remove projects no longer on disk]' \
            '--from-status[Scan for .STATUS files]' \
            '--research[Research-aware sync]' \
            '--report[Show ecosystem summary]'
          ;;
        migrate)
          _arguments \
            '-f[Source storage type]:from:(filesystem sqlite)' \
            '--from[Source storage type]:from:(filesystem sqlite)' \
            '-t[Target storage type]:to:(filesystem sqlite)' \
            '--to[Target storage type]:to:(filesystem sqlite)' \
            '--dry-run[Show what would be migrated]'
          ;;
        init)
          _arguments \
            '-g[Initialize global config]' \
            '--global[Initialize global config]' \
            '-t[Create .STATUS from template]:template:(node r-package python quarto research minimal)' \
            '--template[Create .STATUS from template]:template:(node r-package python quarto research minimal)' \
            '-n[Project name]:name:' \
            '--name[Project name]:name:' \
            '--list-templates[List available templates]'
          ;;
        completions)
          _arguments \
            '1:shell:(zsh bash fish)'
          ;;
        agenda)
          _arguments \
            '1:window days:' \
            '--format[Output format]:format:(table json text md)'
          ;;
        dashboard)
          # No additional options
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

# Helper function to complete template names
_atlas_templates() {
  local -a templates
  templates=($(atlas template list 2>/dev/null | awk '{print $1}'))
  _describe -t templates 'template' templates
}

# Helper function to complete tags
_atlas_tags() {
  _alternative \
    'tags:tag:_tags' \
    'files:directory:_files -/'
}

compdef _atlas atlas
