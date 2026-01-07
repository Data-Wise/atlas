# Ink Dashboard Tests

Comprehensive test suite for the Ink-based dashboard POC.

## Test Structure

```
test/
├── unit/cli/dashboard-ink/           # Unit tests
│   ├── components/
│   │   ├── shared/
│   │   │   └── Card.test.tsx         # Card component tests (44 tests)
│   │   └── views/
│   │       └── MainView.test.tsx     # MainView component tests (47 tests)
│   └── README.md                     # This file
├── e2e/dashboard-ink/                # E2E tests
│   └── app.test.tsx                  # Full app flow tests (55 tests)
└── dogfood/dashboard-ink/            # Shell-based dogfooding tests
    └── basic-functionality.sh        # Real terminal tests (10 tests)
```

## Running Tests

### Quick Start

```bash
# Run all Ink tests (unit + E2E + dogfooding)
npm run test:ink:all

# Run only unit and E2E tests
npm run test:ink

# Run only unit tests
npm run test:ink:unit

# Run only E2E tests
npm run test:ink:e2e

# Run only dogfooding tests
npm run test:ink:dogfood
```

### Individual Test Files

```bash
# Card component tests
npx jest test/unit/cli/dashboard-ink/components/shared/Card.test.tsx

# MainView component tests
npx jest test/unit/cli/dashboard-ink/components/views/MainView.test.tsx

# App E2E tests
npx jest test/e2e/dashboard-ink/app.test.tsx

# Dogfooding tests
bash test/dogfood/dashboard-ink/basic-functionality.sh
```

### With Coverage

```bash
# Coverage for all Ink tests
npm run test:ink -- --coverage

# Coverage for specific file
npx jest test/unit/cli/dashboard-ink/components/shared/Card.test.tsx --coverage
```

## Test Categories

### 1. Unit Tests (91 tests)

**Card Component (44 tests):**
- ✅ Rendering (project name, type, status, progress, focus)
- ✅ Selection state (blue border when selected)
- ✅ Status colors (active=green, paused=yellow, stable=cyan, complete=gray)
- ✅ Progress bar rendering (0%, 50%, 100%)
- ✅ Edge cases (long names, long focus, invalid progress)

**MainView Component (47 tests):**
- ✅ Rendering (header, command bar, project cards, position indicator)
- ✅ Empty state (0 projects)
- ✅ Keyboard navigation (j/k, arrows, boundaries)
- ✅ Large project lists (10, 100 projects)
- ✅ Single project
- ✅ Visual scrolling

### 2. E2E Tests (55 tests)

**Full Application Flow:**
- ✅ Complete app rendering (header, cards, command bar)
- ✅ Navigation flow (forward, backward, boundaries)
- ✅ Exit flow (quit with 'q')
- ✅ Visual consistency after navigation
- ✅ Mock data verification (all 5 projects, different statuses)
- ✅ Stress tests (rapid navigation, mixed keys)
- ✅ Performance tests (render time, navigation lag)

### 3. Dogfooding Tests (10 tests)

**Real Terminal Tests:**
- ✅ POC launches without errors
- ✅ POC renders expected output
- ✅ TTY handling (graceful non-TTY degradation)
- ✅ Interactive mode (pseudo-TTY)
- ✅ TypeScript compilation
- ✅ All 5 mock projects render
- ✅ Progress bars render
- ✅ File structure exists
- ✅ Dependencies installed
- ✅ Multiple runs work

## Test Coverage Goals

| Component | Coverage Target | Current |
|-----------|----------------|---------|
| Card.tsx | 95%+ | ✅ Achieved |
| MainView.tsx | 90%+ | ✅ Achieved |
| App.tsx | 85%+ | ✅ Achieved |

## Test Philosophy

### Unit Tests
- **Focus:** Individual component behavior
- **Tools:** ink-testing-library
- **Isolation:** Mocked dependencies
- **Speed:** Fast (<100ms per test)

### E2E Tests
- **Focus:** Full application flow
- **Tools:** ink-testing-library
- **Integration:** Real component interaction
- **Coverage:** User journeys

### Dogfooding Tests
- **Focus:** Real terminal behavior
- **Tools:** Bash scripts, actual CLI execution
- **Environment:** Multiple terminal types
- **Purpose:** Catch environment-specific issues

## Common Test Patterns

### Testing Rendering

```tsx
it('should render project name', () => {
  const { lastFrame } = render(<Card project={mockProject} />);
  expect(lastFrame()).toContain('project-name');
});
```

### Testing Keyboard Input

```tsx
it('should navigate down with j key', () => {
  const { lastFrame, stdin } = render(<MainView projects={mockProjects} />);

  stdin.write('j');

  expect(lastFrame()).toContain('[2/3]');
});
```

### Testing Visual Output

```tsx
it('should show progress bar', () => {
  const { lastFrame } = render(<Card project={mockProject} />);
  expect(lastFrame()).toMatch(/[█░]/); // Block characters
});
```

## Debugging Tests

### Enable Debug Output

```bash
# See what ink-testing-library renders
DEBUG=ink npx jest test/unit/cli/dashboard-ink/components/shared/Card.test.tsx

# Run single test with full output
npx jest test/unit/cli/dashboard-ink/components/shared/Card.test.tsx -t "should render project name"
```

### Common Issues

**Issue:** Test times out
```bash
# Increase timeout
npx jest --testTimeout=10000
```

**Issue:** ANSI escape codes in snapshots
```tsx
// Use stripAnsi if needed
import stripAnsi from 'strip-ansi';
expect(stripAnsi(lastFrame())).toContain('text');
```

**Issue:** Stdin not working
```tsx
// Make sure to wait for next frame after stdin.write()
stdin.write('j');
await new Promise(resolve => setTimeout(resolve, 10));
```

## Adding New Tests

### 1. Create Test File

```tsx
// test/unit/cli/dashboard-ink/components/NewComponent.test.tsx
import React from 'react';
import { render } from 'ink-testing-library';
import { NewComponent } from '../src/cli/dashboard-ink/components/NewComponent.js';

describe('NewComponent', () => {
  it('should render', () => {
    const { lastFrame } = render(<NewComponent />);
    expect(lastFrame()).toBeTruthy();
  });
});
```

### 2. Run New Test

```bash
npx jest test/unit/cli/dashboard-ink/components/NewComponent.test.tsx
```

### 3. Update This README

Add your new test file to the structure and test count.

## Test Data

### Mock Projects

All tests use consistent mock data defined in individual test files:

```tsx
const mockProject = {
  id: '1',
  name: 'test-project',
  type: 'node-package',
  status: 'active',
  progress: 75,
  focus: 'Working on feature X',
};
```

For MainView/App tests, use the 5-project mock:
- atlas (node-package, 100%, active)
- flow-cli (zsh-package, 95%, stable)
- mcp-server-statistical-research (mcp-server, 80%, active)
- rmediation (r-package, 60%, paused)
- causal-inference (teaching, 45%, active)

## CI Integration

Tests run automatically on:
- Push to main
- Pull requests
- Pre-publish hook

```yaml
# .github/workflows/test.yml
- name: Run Ink tests
  run: npm run test:ink:all
```

## Resources

- [ink-testing-library docs](https://github.com/vadimdemedes/ink-testing-library)
- [Jest docs](https://jestjs.io/docs/getting-started)
- [Ink docs](https://github.com/vadimdemedes/ink)

## Test Metrics

**Total Tests:** 156 (91 unit + 55 E2E + 10 dogfooding)
**Execution Time:** ~15 seconds (unit + E2E), ~30 seconds (dogfooding)
**Coverage:** 95%+ (components)

## Next Steps

As the Ink migration continues:
- [ ] Add tests for DetailView component
- [ ] Add tests for state management (React Context)
- [ ] Add tests for custom hooks (useProjects, useKeyboard, useTheme)
- [ ] Add tests for dialogs
- [ ] Add visual regression tests (if needed)
