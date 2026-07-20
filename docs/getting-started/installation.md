# Installation

## Requirements

- **Node.js**: 18.0 or higher
- **Operating System**: macOS, Linux, or Windows (WSL)

## Recommended: Homebrew (macOS) :material-apple:

```bash
brew tap data-wise/tap
brew install atlas
```

To upgrade:
```bash
brew upgrade atlas
```

That's it — skip to [Initial Setup](#initial-setup).

??? note "Other install methods (curl, npm, from source)"

    ### Direct Install (curl) :material-download:

    One-line installation for any Unix-like system:

    ```bash
    curl -fsSL https://raw.githubusercontent.com/Data-Wise/atlas/main/install.sh | bash
    ```

    This script detects your architecture, downloads the latest release,
    installs to `~/.local/bin`, and adds it to `PATH` if needed.

    ### npm :material-npm:

    ```bash
    npm install -g @data-wise/atlas
    ```

    ### From Source :material-git:

    For development or customization:

    ```bash
    git clone https://github.com/Data-Wise/atlas.git
    cd atlas
    npm install
    npm link  # Makes 'atlas' available globally
    ```

## Verify Installation

```bash
atlas --version
# Should output: 0.14.0 (or current version)

atlas --help
# Shows available commands
```

??? note "Shell completions"

    Enable tab completion for your shell:

    === "Zsh"

        ```bash
        # Write completions to fpath
        atlas completions zsh > ~/.config/zsh/completions/_atlas

        # Add to ~/.zshrc (if not already present):
        fpath=(~/.config/zsh/completions $fpath)
        autoload -Uz compinit && compinit
        ```

    === "Bash"

        ```bash
        # Write completions file
        atlas completions bash > ~/.bash_completion.d/atlas

        # Add to ~/.bashrc (if not already present):
        source ~/.bash_completion.d/atlas
        ```

    === "Fish"

        ```bash
        atlas completions fish > ~/.config/fish/completions/atlas.fish
        ```

??? note "Man pages"

    Atlas ships with man pages for offline reference:

    ```bash
    # Add to your MANPATH (add to ~/.zshrc or ~/.bashrc)
    export MANPATH="$HOME/projects/dev-tools/atlas/man:$MANPATH"

    # Then read man pages
    man atlas            # Main man page — all commands, options, files
    man atlas-session    # Session management
    man atlas-project    # Project registry
    man atlas-status     # Status updates and .STATUS format
    ```

    If you installed from source into a different location, adjust the path
    accordingly.

## Initial Setup

After installation, initialize Atlas:

```bash
atlas init
```

This creates the `~/.atlas/` directory with default configuration.

### With a Template

Initialize a project with a template:

```bash
atlas init --template node --name my-app
atlas init --template r-package --name my-package
atlas init --template python --name my-package
```

See available templates:
```bash
atlas init --list-templates
```

## Next Steps

- [Tutorial](../TUTORIAL.md) - Learn Atlas basics in 15 minutes
- [CLI Reference](../CLI-REFERENCE.md) - Explore all commands
- [Configuration](../CONFIGURATION.md) - Customize your setup

---

**Now what?** → [Tutorial: 15-minute walkthrough](../TUTORIAL.md)
