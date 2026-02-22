# ORCHESTRATE: Fix Flaky UnparkContext Test

## Problem

CI on `main` fails on Node 18: `UnparkContextUseCase > list() > returns list of parked contexts`

**Root cause:** Two test contexts use `new Date().toISOString()` called in rapid succession, producing identical `createdAt` timestamps. The use case sorts by `createdAt` descending — when timestamps tie, sort order is non-deterministic across Node versions.

**Error:**
```
Expected: "ctx-123-"
Received: "ctx-abc-"
```

## Fix

### Step 1: Fix the test timestamps

**File:** `test/unit/use-cases/UnparkContextUseCase.test.js`

In the `returns list of parked contexts` test (~line 201-238):

- Context `ctx-123-456-789` (line 213): Use `new Date(Date.now()).toISOString()` — newer, sorts first
- Context `ctx-abc-def-ghi` (line 225): Use `new Date(Date.now() - 1000).toISOString()` — older, sorts second

This makes `ctx-123-` deterministically first in descending sort order, matching the assertion on line 234.

### Step 2: Audit for similar patterns

Search the full test suite for other instances of multiple `new Date().toISOString()` calls in the same test block that feed into sorted results. Fix any found.

```bash
grep -rn "new Date().toISOString()" test/ | head -30
```

### Step 3: Run tests

```bash
npm test
```

Confirm all pass, including the fixed test.

### Step 4: Commit and PR

```bash
git add test/unit/use-cases/UnparkContextUseCase.test.js
git commit -m "fix(test): make UnparkContext list test deterministic

Give test contexts distinct createdAt timestamps so sort order
is deterministic across Node versions. Fixes CI failure on Node 18."
```

Then: `gh pr create --base dev`

## Acceptance Criteria

- [ ] `UnparkContextUseCase.test.js` list test uses distinct timestamps
- [ ] No other tests have the same pattern
- [ ] Full test suite passes
- [ ] PR created to dev
