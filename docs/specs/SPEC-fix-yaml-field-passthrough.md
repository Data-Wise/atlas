# SPEC: Fix YAML field passthrough in `_generateYAMLFormat` (#65)

**Status:** Ready to implement  
**Effort:** S (1–2h)  
**Issues:** [#65](https://github.com/Data-Wise/atlas/issues/65), [#66](https://github.com/Data-Wise/atlas/issues/66) (duplicate of #65)  
**Date:** 2026-06-29

---

## Problem

`StatusFileGateway._generateYAMLFormat()` is a hand-rolled string template that emits only 5 fields:
`status`, `progress`, `type`, `next[]`, `metrics{}`.

`StatusFileParser._parseYAMLFormat()` parses 15+ fields. Fields dropped on any write:
`name/project`, `priority`, `phase`, `focus`, `kind`, `target/venue/journal`, `version`, `updated`, `checkpoint`, `tasks`.

**Impact:** Any `atlas sync` that rewrites a `.STATUS` file silently strips research metadata. The `_preserveResearchMetadata()` safety net in `SyncRegistryUseCase` only covers 4 registry fields — `phase`, `focus`, `version`, `updated`, `checkpoint` are still lost from the file itself.

**Issue #66** (filed 2026-06-29) is a duplicate — same root cause observed from opencode-resources scaffolding. Close #66 as duplicate of #65.

---

## Fix

**Option A — Passthrough unknown fields (minimal)**  
Collect unhandled keys in `_generateYAMLFormat` and emit them verbatim before the known fields. ~15-line change in `StatusFileGateway.js` only. Fragile for nested fields (tasks block, metrics).

**Option B — Adopt `yaml` package for the write path (Recommended)**  
`yaml` v2.3.4 is already a declared dependency (unused in this file). Replace `_generateYAMLFormat` with `yaml.stringify(frontmatterObj)` wrapped in `---\n...\n---\n` + body. Zero new dependencies, handles all field types correctly.

```js
// src/adapters/gateways/StatusFileGateway.js

import { stringify } from 'yaml'

// Replace _generateYAMLFormat(data):
_generateYAMLFormat(data) {
  // Build frontmatter object; put known fields first for stable ordering
  const fm = {}
  const KNOWN_ORDER = ['status', 'progress', 'type', 'kind', 'priority',
    'phase', 'focus', 'version', 'updated', 'target', 'checkpoint']
  for (const key of KNOWN_ORDER) {
    if (data[key] !== undefined && data[key] !== null) fm[key] = data[key]
  }
  // next and tasks as block sequences
  if (data.next?.length) fm.next = data.next
  if (data.tasks?.length) fm.tasks = data.tasks
  if (data.metrics && Object.keys(data.metrics).length) fm.metrics = data.metrics
  // Pass through any remaining keys
  for (const [key, value] of Object.entries(data)) {
    if (!(key in fm) && key !== 'body') fm[key] = value
  }
  const yaml = stringify(fm).trimEnd()
  const body = data.body ? '\n' + data.body.trim() + '\n' : ''
  return `---\n${yaml}\n---\n${body}`
}
```

**Risk:** The `# Auto-updated fields (do not edit manually)` comment above `metrics:` disappears. Acceptable — it was advisory only, and the metrics block is obvious.

---

## Acceptance Criteria

- [ ] A `.STATUS` file containing `kind`, `priority`, `phase`, `focus`, `version`, `target`, `checkpoint`, `tasks` round-trips through `read() → write()` without data loss
- [ ] Existing fields (`status`, `progress`, `type`, `next`, `metrics`) render identically
- [ ] All existing `StatusFileGateway` tests pass (no behavior regressions)

## Tests

Add to `test/unit/adapters/gateways/StatusFileGateway.test.js`:
- Round-trip test for each previously-dropped field (`kind`, `priority`, `version`, `phase`, `target`)
- Full round-trip: parse a research `.STATUS` fixture with all fields → write → parse again → deep-equal
- Unknown field passthrough: `data.customField = 'x'` → survives write

Close **#66** as duplicate of #65 when merging.

---

## Obsidian Coordination

None directly. Indirectly: obs reads `.STATUS` files but does not write them — the fix only affects atlas write path. No obs changes needed.

## Documentation & Discoverability

- [ ] CHANGELOG `[Unreleased]` entry (bug fix)
- [ ] ARCHITECTURE.md — update "Custom YAML parser" note (the write path now uses the `yaml` package; only the read path remains hand-rolled)

---

## Related

- `SyncRegistryUseCase._preserveResearchMetadata()` — partial safety net that compensates at registry level. Can be kept as defense-in-depth but is no longer load-bearing once the gateway fix ships.
- Architecture review `docs/reviews/ARCHITECTURE-REVIEW-2025-12-30.md` flags this exact issue ("Custom YAML parser — 86 lines, incomplete spec — Use yaml package").
