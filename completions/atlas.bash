# Atlas CLI completion for Bash
# Install: source /path/to/atlas.bash or add to ~/.bashrc

_atlas_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  # Main commands
  commands="project focus status session catch inbox where crumb trail dashboard init sync migrate"

  # Project subcommands
  project_commands="add list show remove"

  # Session subcommands
  session_commands="start end status"

  # Status values
  status_values="active paused blocked archived complete"

  # Capture types
  capture_types="idea task bug note question"

  # Storage types
  storage_types="filesystem sqlite"

  case "${COMP_WORDS[1]}" in
    project)
      case "$prev" in
        add)
          COMPREPLY=($(compgen -d -- "$cur"))
          ;;
        show|remove)
          COMPREPLY=($(compgen -W "$(_atlas_projects)" -- "$cur"))
          ;;
        *)
          COMPREPLY=($(compgen -W "$project_commands" -- "$cur"))
          ;;
      esac
      ;;
    session)
      COMPREPLY=($(compgen -W "$session_commands" -- "$cur"))
      ;;
    status)
      case "$prev" in
        --set)
          COMPREPLY=($(compgen -W "$status_values" -- "$cur"))
          ;;
        status|--progress|--focus|--next|--then|--increment)
          COMPREPLY=()
          ;;
        *)
          if [[ ${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "--set --progress --focus --next --complete --then --increment --create" -- "$cur"))
          else
            COMPREPLY=($(compgen -W "$(_atlas_projects)" -- "$cur"))
          fi
          ;;
      esac
      ;;
    focus)
      COMPREPLY=($(compgen -W "$(_atlas_projects)" -- "$cur"))
      ;;
    catch)
      case "$prev" in
        -p)
          COMPREPLY=($(compgen -W "$(_atlas_projects)" -- "$cur"))
          ;;
        -t)
          COMPREPLY=($(compgen -W "$capture_types" -- "$cur"))
          ;;
        *)
          if [[ ${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "-p -t" -- "$cur"))
          fi
          ;;
      esac
      ;;
    inbox)
      case "$prev" in
        -p)
          COMPREPLY=($(compgen -W "$(_atlas_projects)" -- "$cur"))
          ;;
        *)
          COMPREPLY=($(compgen -W "-p --triage --stats" -- "$cur"))
          ;;
      esac
      ;;
    where|trail)
      COMPREPLY=($(compgen -W "$(_atlas_projects)" -- "$cur"))
      ;;
    crumb)
      case "$prev" in
        -p)
          COMPREPLY=($(compgen -W "$(_atlas_projects)" -- "$cur"))
          ;;
        *)
          if [[ ${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "-p" -- "$cur"))
          fi
          ;;
      esac
      ;;
    sync)
      COMPREPLY=($(compgen -W "-d --dry-run -w --watch -p --paths --remove-orphans" -- "$cur"))
      ;;
    migrate)
      case "$prev" in
        -f|--from|-t|--to)
          COMPREPLY=($(compgen -W "$storage_types" -- "$cur"))
          ;;
        *)
          COMPREPLY=($(compgen -W "-f --from -t --to --dry-run" -- "$cur"))
          ;;
      esac
      ;;
    *)
      if [[ ${cur} == -* ]]; then
        COMPREPLY=($(compgen -W "--storage -V --version -h --help" -- "$cur"))
      else
        COMPREPLY=($(compgen -W "$commands" -- "$cur"))
      fi
      ;;
  esac
}

# Helper function to get project names
_atlas_projects() {
  atlas project list --format names 2>/dev/null
}

complete -F _atlas_completions atlas
