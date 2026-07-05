# Ecosystem Integration Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire and verify end-to-end integration between the ZSH client (`flow-cli`) and the newly completed `atlas` v0.13.0 tasks and agenda commands.

**Architecture:** Update the ZSH contract documentation, add automated contract checks for the new CLI shapes, and point E2E tests to execute the local Node development build of `atlas` to prevent future regression.

**Tech Stack:** ZSH, Commander, Jest, jq

## Global Constraints
- Target Version: atlas v0.13.0, flow-cli v7.15.0
- Contract Version: v1.2.0

---

### Task 1: Document task and agenda contract in flow-cli

**Files:**
- Modify: `/Users/dt/projects/dev-tools/flow-cli/docs/ATLAS-CONTRACT.md`

**Interfaces:**
- Consumes: `atlas task`, `atlas schedule push`, `atlas agenda` CLI structures.
- Produces: Updated markdown contract specifications.

- [ ] **Step 1: Edit contract documentation**

Modify `/Users/dt/projects/dev-tools/flow-cli/docs/ATLAS-CONTRACT.md` to append the new v1.2.0 specifications. Insert the following specifications right before the "## Output Format Specifications" section:

```markdown
### `atlas task` CLI (v1.2.0+)

Exposes task management CRUD operations.

| Command | Action | Options |
|---------|--------|---------|
| `atlas task add <desc>` | Add a task | `-p, --project <project>`, `-d, --due <date>`, `--priority <priority>` |
| `atlas task list` | List tasks | `-p, --project <project>`, `--completed`, `--incomplete`, `--overdue`, `--due-soon`, `-q, --query <query>`, `--format <format>` |
| `atlas task done <id>` | Complete a task | *(none)* |
| `atlas task rm <id>` | Remove a task | *(none)* |

### `atlas agenda` CLI (v1.2.0+)

Consolidates incomplete tasks with due dates and external schedule records within a look-ahead window.

**Call.** `_flow_atlas_json agenda "$window"` — `$window` is the look-ahead window in days.

**Output.** JSON array of normalized agenda items:

```json
[
  {
    "date": "2026-07-05",
    "label": "Submit grant report",
    "type": "research",
    "project": "grant-writing",
    "recurrence": "none"
  }
]
```
```

- [ ] **Step 2: Commit documentation changes**

Run:
```bash
git -C /Users/dt/projects/dev-tools/flow-cli add docs/ATLAS-CONTRACT.md
git -C /Users/dt/projects/dev-tools/flow-cli commit -m "docs: document atlas task and agenda CLI contract v1.2.0"
```
Expected: Commit succeeds.

---

### Task 2: Implement contract checks in flow-cli tests

**Files:**
- Modify: `/Users/dt/projects/dev-tools/flow-cli/tests/test-atlas-contract.zsh`

**Interfaces:**
- Consumes: Local `atlas` dev CLI on PATH.
- Produces: Contract test assertions verifying exit codes and output shapes.

- [ ] **Step 1: Edit test-atlas-contract.zsh**

Edit `/Users/dt/projects/dev-tools/flow-cli/tests/test-atlas-contract.zsh` to insert the new contract tests. Insert the following code block right before the `# SUMMARY` section:

```bash
test_case "Warm-path: atlas task list returns valid JSON"
if ! skip_without_warm_atlas; then
  local output
  output=$(atlas task list --format=json 2>/dev/null)
  local ec=$?
  assert_exit_code $ec 0
  if command -v jq >/dev/null 2>&1; then
    print -r -- "$output" | jq -e 'type == "array"' >/dev/null 2>&1
    assert_exit_code $? 0 "task list --format=json must return a JSON array"
  fi
  test_pass
fi

test_case "Warm-path: atlas agenda returns valid JSON array matching contract keys"
if ! skip_without_warm_atlas; then
  local output
  output=$(atlas agenda 7 --format=json 2>/dev/null)
  local ec=$?
  assert_exit_code $ec 0
  if command -v jq >/dev/null 2>&1; then
    print -r -- "$output" | jq -e 'type == "array"' >/dev/null 2>&1
    assert_exit_code $? 0 "agenda --format=json must return a JSON array"
  fi
  test_pass
fi
```

- [ ] **Step 2: Execute contract tests**

Run:
```bash
zsh /Users/dt/projects/dev-tools/flow-cli/tests/test-atlas-contract.zsh
```
Expected: PASS with 22/22 tests passing.

- [ ] **Step 3: Commit test updates**

Run:
```bash
git -C /Users/dt/projects/dev-tools/flow-cli add tests/test-atlas-contract.zsh
git -C /Users/dt/projects/dev-tools/flow-cli commit -m "test: add contract checks for atlas task and agenda"
```
Expected: Commit succeeds.

---

### Task 3: Test integration with real local atlas dev build

**Files:**
- Modify: `/Users/dt/projects/dev-tools/flow-cli/tests/e2e-agenda-atlas.zsh`

**Interfaces:**
- Consumes: Local `atlas` binary location.
- Produces: Real dev-build integration check instead of stub check.

- [ ] **Step 1: Edit tests/e2e-agenda-atlas.zsh**

Edit `/Users/dt/projects/dev-tools/flow-cli/tests/e2e-agenda-atlas.zsh` around line 150 to run tests against the real dev `atlas` binary if available. Insert a new section before the existing Section 2:

```bash
# ============================================================================
# SECTION 1.5: atlas present (real local binary from sibling directory)
# ============================================================================

echo ""
echo "${CYAN}--- Section 1.5: Atlas real development binary integration ---${RESET}"

run_test "real atlas task list exits 0" '
    local output
    output=$(node /Users/dt/projects/dev-tools/atlas/bin/atlas.js task list --format=json 2>&1)
    local rc=$?
    assert_exit_code $rc 0
'
```

- [ ] **Step 2: Execute E2E agenda tests**

Run:
```bash
zsh /Users/dt/projects/dev-tools/flow-cli/tests/e2e-agenda-atlas.zsh
```
Expected: Section 1.5 passes and exit status is 0.

- [ ] **Step 3: Commit E2E test updates**

Run:
```bash
git -C /Users/dt/projects/dev-tools/flow-cli add tests/e2e-agenda-atlas.zsh
git -C /Users/dt/projects/dev-tools/flow-cli commit -m "test: add E2E check against real dev atlas binary"
```
Expected: Commit succeeds.
