# Ink Dashboard E2E Tests

## Status: Temporarily Disabled

The e2e tests for the Ink dashboard (`app.test.js.skip`) are currently disabled due to a known compatibility issue.

## Issue

**Root Cause:** yoga-layout (a dependency of Ink used for terminal layout) uses top-level await in its built JavaScript output:

```javascript
// node_modules/yoga-layout/dist/src/index.js:13
const Yoga = wrapAssembly(await loadYoga());
```

**Impact:** This top-level await is incompatible with Jest's CommonJS test environment, causing:
```
ReferenceError: await is not defined
    at Object.wrapAssembly (node_modules/yoga-layout/src/index.ts:21:14)
```

## Test Coverage

The view transition logic is thoroughly tested via integration tests:
- **test/integration/dashboard-ink/view-transitions.test.js** - 25 tests passing
  - All state transitions (BROWSE → DETAIL, FOCUS, ZEN, TIMELINE, ECOSYSTEM, PLAN)
  - Reverse transitions (all views back to BROWSE)
  - Cross-view transitions
  - Event emission (enter, exit, transition events)
  - State data management

## Solutions Attempted

1. ✗ Configured transformIgnorePatterns to transform yoga-layout
2. ✗ Configured @swc/jest with top-level await support
3. ✗ Used Jest experimental ESM mode (`NODE_OPTIONS="--experimental-vm-modules"`)
4. ✗ Removed moduleNameMapper
5. ✗ Used ES6 module output instead of CommonJS

All approaches failed because the issue is in yoga-layout's built output, not configuration.

## Path Forward

### Option 1: Wait for ecosystem improvements (Recommended)
- **yoga-layout** provides CommonJS builds without top-level await
- **Jest** improves ESM/top-level await support in transformers
- **Ink** switches to a different layout engine

### Option 2: Alternative test runner
Use Vitest (native ESM support) for e2e tests:
```bash
npm install -D vitest
npx vitest test/e2e/dashboard-ink/app.test.js.skip
```

### Option 3: Manual testing
Test the Ink dashboard interactively:
```bash
npm link
atlas dash
# Test navigation: j/k, Enter, f, z, T, e, p, q
```

## Re-enabling Tests

When the compatibility issue is resolved:

1. Rename the test file:
   ```bash
   mv test/e2e/dashboard-ink/app.test.js.skip test/e2e/dashboard-ink/app.test.js
   ```

2. Run the tests:
   ```bash
   npx jest test/e2e/dashboard-ink/app.test.js
   ```

3. Update this README if any test expectations need adjustment

## References

- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs
- [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library) - Testing utilities
- [yoga-layout](https://github.com/facebook/yoga) - Cross-platform layout engine
- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
