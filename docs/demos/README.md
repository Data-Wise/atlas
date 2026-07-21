# Atlas Demo GIFs

Terminal recordings for Atlas documentation using [VHS](https://github.com/charmbracelet/vhs).

## Requirements

```bash
brew install vhs
```

## Generate GIFs

```bash
# Generate all demos
for tape in *.tape; do
  vhs "$tape"
done

# Or generate specific demo
vhs getting-started.tape
```

## Available Demos

| Demo | Description | Duration |
|------|-------------|----------|
| `getting-started.tape` | Core workflow overview | ~30s |
| `session-workflow.tape` | Start, track, end sessions | ~25s |
| `quick-capture.tape` | Capture ideas without losing focus | ~20s |
| `context-switch.tape` | Park/unpark for interruptions | ~30s |
| `stats.tape` | Session analytics | ~20s |

## Customization

Edit tape files to adjust:

- `Set FontSize` - Text size (default: 20)
- `Set Width/Height` - GIF dimensions
- `Set Theme` - Color scheme (Dracula, etc.)
- `Set TypingSpeed` - How fast text appears
- `Sleep` - Pause duration between commands

## Embedding in Docs

```markdown
![Getting Started](./demos/getting-started.gif)
```

## CI/CD Generation

Add to GitHub Actions:

```yaml

- name: Generate demo GIFs
  run: |
    brew install vhs
    cd docs/demos
    for tape in *.tape; do
      vhs "$tape"
    done
```
