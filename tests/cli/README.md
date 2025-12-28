# Atlas CLI Test Suite

Dogfooding tests for the Atlas CLI. Generated 2025-12-28.

## Quick Start

```bash
# Run automated tests (CI-ready)
bash tests/cli/automated-tests.sh

# Run interactive tests (human QA)
bash tests/cli/interactive-tests.sh
```

## Test Suites

### automated-tests.sh

Non-interactive test suite for CI/CD pipelines.

**Features:**
- 45+ tests across 14 categories
- Exit code validation
- Pattern matching
- Colored output
- JSON log files

**Exit Codes:**
- `0` - All tests passed
- `1` - One or more tests failed

**Usage:**
```bash
bash tests/cli/automated-tests.sh
```

**CI Integration (.github/workflows/test.yml):**
```yaml
- name: Run CLI Dogfood Tests
  run: bash tests/cli/automated-tests.sh
```

### interactive-tests.sh

Human-guided QA with expected/actual comparison.

**Features:**
- Visual comparison interface
- Progress tracking
- Single-keystroke verdicts
- Test re-run capability
- Session logging

**Controls:**
| Key | Action |
|-----|--------|
| `y` | Mark test as passed |
| `n` | Mark test as failed |
| `s` | Skip test |
| `r` | Re-run current test |
| `q` | Quit early |

**Usage:**
```bash
bash tests/cli/interactive-tests.sh
```

## Test Categories

| Category | Coverage |
|----------|----------|
| Smoke Tests | Version, help, aliases |
| Project Commands | list, add, show, remove |
| Session Commands | start, end, status |
| Capture Commands | catch, inbox, triage |
| Context Commands | where, crumb, trail |
| Park/Unpark | park, unpark, parked |
| Templates | list, show, create, dir |
| Config | paths, show, setup, prefs |
| Sync & Migrate | sync, migrate |
| Completions | zsh, bash, fish |
| Dashboard | dash, dashboard |
| Status & Focus | status, focus |
| Error Handling | Invalid commands, missing args |

## Log Files

Test logs are saved to `tests/cli/logs/`:

```
logs/
├── automated-20251228-143052.log
├── interactive-20251228-143215.log
└── ...
```

## Adding New Tests

### Automated Tests

Edit `automated-tests.sh` and add:

```bash
test_success "Test Name" \
    "$CLI your-command" \
    "pattern-to-match"

test_failure "Should Fail Test" \
    "$CLI invalid-command" \
    "expected error pattern"
```

### Interactive Tests

Edit `interactive-tests.sh` and add:

```bash
add_test "Test Name" \
    "$CLI your-command" \
    "Description of expected output"
```

## npm Scripts

The tests are integrated into package.json:

```bash
npm run test:dogfood       # Original dogfood.sh
npm run test:dogfood-auto  # Comprehensive automated
npm run test:dogfood-ui    # Interactive v2
```

To add the new tests:

```json
{
  "scripts": {
    "test:cli": "bash tests/cli/automated-tests.sh",
    "test:cli-ui": "bash tests/cli/interactive-tests.sh"
  }
}
```

## Relationship to Existing Tests

| Location | Type | Purpose |
|----------|------|---------|
| `test/unit/` | Jest | Unit tests (1055 tests) |
| `test/integration/` | Jest | Integration tests |
| `test/e2e/` | Jest | End-to-end tests |
| `test/dogfood*.sh` | Bash | Original dogfood scripts |
| `tests/cli/` | Bash | **New consolidated CLI tests** |

The `tests/cli/` suite provides:
- Modern, clean implementation
- Proper separation (automated vs interactive)
- Better logging
- Consistent structure

The original `test/dogfood*.sh` files remain for backwards compatibility.
