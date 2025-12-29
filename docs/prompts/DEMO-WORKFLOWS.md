# Demo & Documentation Workflow Prompts

Reusable prompts for creating, testing, and maintaining terminal demos and documentation visuals.

---

## 1. Mermaid Diagram Theme Verification

Use this prompt after adding or modifying mermaid diagrams in documentation.

### Prompt

```
Visually inspect the mermaid diagrams in the documentation for both light and dark themes.

Tasks:
1. Open the docs site in a browser (run `mkdocs serve` if needed)
2. Navigate to each page containing mermaid diagrams
3. For each diagram:
   - Check readability in light theme
   - Toggle to dark theme and verify contrast
   - Ensure text is legible in both modes
   - Check that colors don't clash with theme backgrounds
4. Report any diagrams that need color adjustments

Pages to check:
- ARCHITECTURE.md
- DIAGRAMS.md
- WORKFLOWS.md
- Any page with ```mermaid blocks

Fix any issues by adding theme-aware styling:
%%{init: {'theme': 'neutral'}}%%
```

### Expected Output

- List of diagrams checked
- Pass/fail status for each theme
- Specific fixes applied (if any)

---

## 2. Terminal Demo GIF Creation

Use this prompt to create new terminal demo GIFs or regenerate existing ones.

### Prompt

```
Create terminal demo GIFs using VHS for the following workflows:
[LIST YOUR WORKFLOWS HERE]

Requirements:
1. Create .tape files in docs/demos/ with these settings:
   - Shell: zsh
   - FontSize: 18
   - Width: 800, Height: 500
   - Theme: Dracula
   - TypingSpeed: 40ms

2. Important rules for .tape files:
   - Do NOT type comments (# lines) - they cause zsh errors
   - Use Sleep between commands for readability
   - Start with a clean state (no active sessions)
   - Show realistic but successful command output

3. Generate and verify each GIF:
   - Run: vhs <name>.tape
   - Watch the generated GIF for errors
   - Check that all commands execute successfully
   - Verify output matches expected behavior

4. Optimize GIFs with gifsicle:
   - Run: gifsicle -O3 --lossy=80 input.gif -o output.gif
   - Target ~30% size reduction

5. If any GIF shows errors:
   - Identify the failing command
   - Fix the underlying bug OR adjust the tape file
   - Regenerate and verify again

Report file sizes before/after optimization.
```

### Example .tape Template

```tape
# Demo Name
Output demo-name.gif

Set Shell "zsh"
Set FontSize 18
Set Width 800
Set Height 500
Set Theme "Dracula"
Set Padding 15
Set TypingSpeed 40ms

Type "command one"
Enter
Sleep 2s

Type "command two"
Enter
Sleep 2s
```

---

## 3. GIF Testing and Validation

Use this prompt to verify existing demo GIFs are still accurate.

### Prompt

```
Test all terminal demo GIFs in docs/demos/ for accuracy.

For each .tape file:
1. Read the tape file to understand expected commands
2. Run each command manually to verify it still works
3. Check for:
   - Command syntax changes
   - Output format changes
   - New error conditions
   - Missing dependencies

4. If commands have changed:
   - Update the .tape file
   - Regenerate the GIF: vhs <name>.tape
   - Optimize: gifsicle -O3 --lossy=80 <name>.gif -o <name>-opt.gif
   - Replace original with optimized version

5. Verify the regenerated GIF:
   - Watch it play through
   - Confirm no error messages appear
   - Check timing is appropriate

Report:
- Number of GIFs tested
- Any that needed updates
- Commands that changed
```

---

## 4. Add GIF Generation to CI

Use this prompt to set up automated GIF generation and testing in GitHub Actions.

### Prompt

```
Add GIF generation and validation to the CI pipeline.

Create a GitHub Actions workflow that:

1. Triggers on:
   - Push to main (docs/demos/*.tape changes)
   - Pull requests modifying tape files
   - Manual workflow dispatch

2. Setup steps:
   - Install VHS: brew install charmbracelet/tap/vhs
   - Install gifsicle: brew install gifsicle
   - Install ttyd (VHS dependency)
   - Install project: npm install && npm link

3. Validation job:
   - For each .tape file in docs/demos/:
     - Run VHS to generate GIF
     - Check exit code (non-zero = command failed)
     - Verify GIF file was created
     - Check file size is reasonable (< 2MB)

4. Optional: Commit generated GIFs
   - Only on push to main
   - Optimize with gifsicle before committing
   - Use bot commit with [skip ci] to prevent loops

5. Error reporting:
   - If any tape fails, show which commands errored
   - Upload failed GIF as artifact for debugging
   - Post comment on PR with failure details

Create the workflow file at .github/workflows/demos.yml
```

### Example Workflow Structure

```yaml
name: Demo GIFs

on:
  push:
    branches: [main]
    paths: ['docs/demos/*.tape']
  pull_request:
    paths: ['docs/demos/*.tape']
  workflow_dispatch:

jobs:
  validate-demos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install VHS
        run: brew install charmbracelet/tap/vhs

      - name: Install gifsicle
        run: brew install gifsicle

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install && npm link

      - name: Generate and validate GIFs
        run: |
          cd docs/demos
          for tape in *.tape; do
            echo "Processing $tape..."
            if ! vhs "$tape"; then
              echo "::error::Failed to generate GIF from $tape"
              exit 1
            fi
          done

      - name: Optimize GIFs
        run: |
          cd docs/demos
          for gif in *.gif; do
            gifsicle -O3 --lossy=80 "$gif" -o "${gif%.gif}-opt.gif"
            mv "${gif%.gif}-opt.gif" "$gif"
          done

      - name: Upload GIFs as artifacts
        uses: actions/upload-artifact@v4
        with:
          name: demo-gifs
          path: docs/demos/*.gif
```

---

## Quick Reference

| Task | Tool | Command |
|------|------|---------|
| Generate GIF | VHS | `vhs demo.tape` |
| Optimize GIF | gifsicle | `gifsicle -O3 --lossy=80 in.gif -o out.gif` |
| Serve docs | MkDocs | `mkdocs serve` |
| Check themes | Browser | Toggle light/dark in docs site |

## File Locations

```
docs/
├── demos/
│   ├── getting-started.tape    # Tape source files
│   ├── getting-started.gif     # Generated GIFs
│   └── ...
├── DEMOS.md                    # Embedded demo page
└── prompts/
    └── DEMO-WORKFLOWS.md       # This file
```
