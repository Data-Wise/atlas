# SPEC: Fix `project remove` name resolution (#22)

**Status:** Ready to implement  
**Effort:** XS (< 1h)  
**Issue:** [#22](https://github.com/Data-Wise/atlas/issues/22)  
**Date:** 2026-06-29

---

## Problem

`atlas project remove <name>` always returns "Project not found" even when `project list` shows the project.

**Root cause:** `FileSystemProjectRepository.delete(projectId)` matches on `p.id` (UUID). The CLI passes the user-supplied *name* string as `projectId` — a name never equals a UUID.

Call chain:
```
atlas project remove medrobust-cran-prep
  → unregister("medrobust-cran-prep")         # src/index.js:441
  → projectRepo.delete("medrobust-cran-prep") # src/index.js:443
  → findIndex(p => p.id === "medrobust-cran-prep")  # FileSystemProjectRepository.js:276
  → returns -1 → "Project not found"
```

---

## Fix

**Option A — two-liner in `unregister` (Recommended)**

Resolve name → project → id before calling `delete`. Minimal blast radius.

```js
// src/index.js — unregister()
async unregister(name) {
  const projectRepo = this.container.resolve('ProjectRepository')
  const all = await projectRepo.findAll()
  const project = all.find(p => p.name === name)
  const deleted = await projectRepo.delete(project?.id ?? name) // fallback: caller may pass id directly
  return {
    success: deleted,
    message: deleted ? `Unregistered: ${name}` : `Project not found: ${name}`
  }
}
```

**Option B — add `findByName` to FileSystemProjectRepository**

Cleaner interface long-term, but touches 2 files + interface + SQLite repo. Defer unless a second caller needs it.

---

## Acceptance Criteria

- [ ] `atlas project remove <name>` removes a project that `atlas project list` displays
- [ ] `atlas project remove nonexistent` still prints "Project not found"
- [ ] Existing behavior for callers passing an id directly is preserved

## Tests

Add to `test/unit/use-cases/` or integration test:
- `unregister('medrobust-cran-prep')` where project exists by that name → `success: true`
- `unregister('does-not-exist')` → `success: false`

**No changes needed** to `FileSystemProjectRepository.delete()` or its existing tests.

---

## Obsidian Coordination

None.

## Documentation & Discoverability

- [ ] CLI-REFERENCE.md — verify `project remove` description is accurate after fix
- [ ] CHANGELOG `[Unreleased]` entry

---

## Implementation Notes

- `findAll()` already exists and returns the full project array
- Project object shape: `{ id: UUID, name: string, path: string, ... }`
- The `?? name` fallback lets existing scripts that pass a UUID directly continue to work
