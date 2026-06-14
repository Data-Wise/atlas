# Specification: Inbox Type Filter (`atlas inbox --type --limit`)

**Status:** draft
**Created:** 2026-06-14
**Parent Spec:** SPEC-flow-cli-integration-2026-06-13.md (F6 — deferred feature)
**Version:** 0.1

---

## Overview

Add `--type` and `--limit` flags to `atlas inbox` so callers can filter captures by type and cap the result count. This is **Feature F6** from the flow-cli integration contract work, deferred from the initial v0.9.3 flag set.

**Context:** The flow-cli `at` dispatcher calls `atlas inbox` to surface pending captures in shell prompts and dashboards. Without filtering, high-volume inboxes drown relevant items. The primary caller wants `--type=win` to surface only wins — but `win` is not a current `Capture.TYPES` member, which is the key design issue this spec must resolve before implementation can begin.

**Goal:** Deliver `atlas inbox --type <type> --limit <n>` with a clear, consistent data model that satisfies both the atlas domain and the flow-cli caller's expectation of a `win` type.

---

## Primary User Story

**As a** developer using flow-cli's `at` dispatcher,
**I want** `atlas inbox --type win --limit 5` to return only my win captures,
**So that** I can surface recent wins in my shell prompt without seeing unrelated inbox noise.

### Acceptance Criteria

1. `atlas inbox --type <type>` filters inbox captures to those matching `type`. Unrecognized types exit 1 with a message listing valid values.
2. `atlas inbox --limit <n>` caps output to the `n` most-recent inbox items (sorted by `createdAt` descending).
3. `atlas inbox --type <type> --limit <n>` combines both filters (type first, then limit).
4. `atlas inbox --type win` works — the `win` type is addressable via one of the two approaches in the Design Issue below.
5. All existing `atlas inbox` behaviour (no flags) is unchanged.
6. Exit code 0 for empty result sets (0 items is valid, not an error).
7. `--type` values are documented in `atlas inbox --help`.

---

## Design Issue: The `win` Type

### Current State

`Capture.TYPES = ['idea', 'task', 'bug', 'note', 'question', 'parked']`

`win` is **not** in this list. flow-cli has its own `win` command (`win <text>` → logs an accomplishment) and expects to be able to retrieve those captures via `atlas inbox --type=win`.

### Option A — Add `win` as a First-Class CaptureType

Extend `Capture.TYPES` to include `'win'`:

```javascript
static TYPES = ['idea', 'task', 'bug', 'note', 'question', 'parked', 'win']
```

**Pros:**
- Semantically honest — a win is distinct from a bug or task.
- No ambiguity: `--type=win` maps 1:1 to `type === 'win'`.
- Consistent with how flow-cli's `win` command thinks about the data.
- Simpler query: `captures.filter(c => c.type === 'win')`.

**Cons:**
- Validation in `Capture._validate()` must be updated, plus any tests that assert the type set.
- Slightly inflates the type enum with a UX concept rather than a capture *shape*.

> **No SQLite migration required** (verified): the captures table is `type TEXT NOT NULL` with **no type CHECK constraint** (`src/adapters/repositories/SQLiteDatabase.js:146`). The type enum is enforced only at the domain layer (`Capture._validate`), so SQLite already accepts any type string. The earlier-feared schema migration does not exist.

### Option B — Map `win` to an Existing Type + Tag

Keep `Capture.TYPES` unchanged. When flow-cli calls `atlas catch <text> -t win`, atlas maps this to `type: 'idea'` (or `type: 'note'`) and auto-applies `tags: ['win']`. The filter `--type=win` then becomes a tag query rather than a type query.

```
atlas inbox --type win
→ internally: captures where tags.includes('win') && status === 'inbox'
```

**Pros:**
- No schema migration; existing data model is unchanged.
- `win` is a *semantic label*, not a structural type — Option B honours the distinction.
- Tags are already a first-class field on `Capture`; no new validators needed.

**Cons:**
- Leaky abstraction: `--type` flag silently behaves differently for `win` than for true types (`idea`, `task`, etc.). A caller cannot tell from the CLI interface that `win` is tag-backed.
- Two code paths in `InboxFilterUseCase`: type-based filter for real types, tag-based filter for `win`.
- If another caller uses `tags: ['win']` for a different purpose, false positives emerge.

### Recommendation: **Option A**

Add `win` as a first-class `CaptureType`. The conceptual cleanliness and single code path outweigh the migration cost. The migration is low-risk:

- The change is effectively one line (`Capture.TYPES`) plus tests — the enum is the single source of truth (domain-layer `_validate`).
- SQLite needs **no** schema change (`type TEXT NOT NULL`, no CHECK constraint).
- A back-fill of pre-existing win captures is only relevant *if* such captures exist in atlas — see the Migration Strategy precondition below.

**If the team prefers Option B** (minimal schema change), the spec author requests an explicit decision before implementation, as it changes the `--type` flag's contract from "type filter" to "type-or-tag filter".

---

## Architecture

### Affected Layers

```
flow-cli (caller)
    │  atlas inbox --type win --limit 5
    ▼
atlas CLI (src/index.js)
    │  parse --type, --limit
    ▼
InboxFilterUseCase (new or extended GetInboxUseCase)
    │  filter by type, slice by limit
    ▼
ICaptureRepository.getByStatus('inbox')
    │  existing method; no change needed
    ▼
FileSystemCaptureRepository / SQLiteCaptureRepository
```

### New / Modified Files

| File | Change |
|------|--------|
| `src/domain/entities/Capture.js` | Add `'win'` to `TYPES` array (Option A) |
| `src/use-cases/capture/FilterInboxUseCase.js` | New use case (or extend `TriageInboxUseCase`) |
| `src/adapters/repositories/FileSystemCaptureRepository.js` | Add `getByTypeAndStatus(type, status)` or extend `getByStatus` with options |
| `src/adapters/repositories/SQLiteCaptureRepository.js` | Same |
| `src/domain/repositories/ICaptureRepository.js` | Add interface method if needed |
| `bin/atlas.js` (inbox command) | Add `--type <type>` and `--limit <n>` options |
| `test/unit/use-cases/capture/FilterInbox.test.js` | New unit tests |
| `test/unit/domain/entities/Capture.test.js` | Update type validation tests |

---

## API Design

### CLI Interface

```
atlas inbox [--type <type>] [--limit <n>] [--count]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--type <type>` | string | *(all)* | Filter by capture type. Valid: `idea`, `task`, `bug`, `note`, `question`, `parked`, `win` |
| `--limit <n>` | integer | *(no cap)* | Return at most `n` items, most-recent first |
| `--count` | boolean | false | Print bare integer count instead of listing (already contracted in v0.9.3) |

Flags compose: `atlas inbox --type win --limit 5 --count` → integer count of win captures, capped at 5.

### Output Format (no `--count`)

Existing text output, filtered. One capture per line, format unchanged from current `atlas inbox`.

### Error Cases

| Condition | Exit | Output |
|-----------|------|--------|
| Unknown `--type` value | 1 | `Error: unknown type "X". Valid types: idea, task, bug, note, question, parked, win` |
| `--limit` ≤ 0 | 1 | `Error: --limit must be a positive integer` |
| Valid filters, 0 results | 0 | *(empty output)* |

---

## Data Models

### Capture Entity (Option A delta)

```javascript
// src/domain/entities/Capture.js
static TYPES = ['idea', 'task', 'bug', 'note', 'question', 'parked', 'win']
```

No other field changes. `win` captures are stored identically to other types.

### Migration Strategy (Option A)

> **Precondition — verify before implementing.** This back-fill only matters if flow-cli's `win` command has actually written captures into atlas as `type: 'idea' + tags: ['win']`. That is **unconfirmed**: today `atlas catch -t win` would fail validation (`win` isn't a valid type), so flow-cli's `win` likely writes to its own store, not atlas. If no win-tagged atlas captures exist, this helper is **unnecessary** — drop it. Confirm flow-cli's `win` write path (does it call `atlas catch` at all, and with what type/tags?) first.

If (and only if) such captures exist, a lazy-migration helper in `FileSystemCaptureRepository.fromJSON()`:

```javascript
// If a capture has tags: ['win'] and type: 'idea', auto-upgrade type to 'win'
// Remove after one major version cycle.
if (data.type === 'idea' && data.tags?.includes('win')) {
  data = { ...data, type: 'win', tags: data.tags.filter(t => t !== 'win') }
}
```

This is opt-in and write-through: the migrated type is saved back to disk on next write.

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `atlas inbox --count` (v0.9.3) | Shipped | Already contracted; `--type` and `--limit` must compose with it |
| `Capture.TYPES` enum | Existing | Option A adds `'win'`; Option B leaves unchanged |
| `ICaptureRepository.getByStatus` | Existing | May need options bag for type filter |
| flow-cli `win` command | External | Calls `atlas catch <text> -t win`; must write `type: 'win'` after this spec ships |

---

## Open Questions

1. **Option A vs B decision** — Does the team accept `win` as a first-class `CaptureType`? (Recommendation: yes. See Design Issue above.)
2. **`catch -t win` behaviour** — After Option A ships, should `atlas catch "text" -t win` write `type: 'win'` directly? Currently `catch` only accepts `-t idea|task|bug|note`. The CLI validation must be updated in the same PR.
3. **`--type` on `atlas inbox --count`** — Confirm composability: `atlas inbox --type win --count` should return the count of win-type inbox captures. (Expected: yes, composable.)
4. ~~**SQLite schema migration**~~ — **N/A (verified).** The captures table is `type TEXT NOT NULL` with no type CHECK constraint (`SQLiteDatabase.js:146`), so a new type value needs zero DB migration. (Resolved in review 2026-06-14.)
6. **flow-cli `win` write path** — Confirm whether flow-cli's `win` command writes to atlas (and with what type/tags). Determines whether the back-fill helper is needed at all (see Migration Strategy precondition). Also note: `catch --help` currently advertises only `idea|task|bug|note` (`bin/atlas.js:463`) though the enum has 6 types — when `win` lands, update `catch`'s `-t` help/validation alongside `inbox --help`.
5. **`win` in triage** — Should `atlas triage` display `win` captures? Should they be auto-triageable to a `wins` project? Out of scope; flag for future spec.

---

## Review Checklist

- [ ] Option A vs B decision recorded and signed off
- [ ] `Capture.TYPES` change reviewed for downstream impact (SQLite, serialization, tests)
- [ ] `FilterInboxUseCase` design reviewed (new use case vs options on existing triage)
- [ ] Lazy-migration helper reviewed for correctness and removal timeline
- [ ] `--type` and `--limit` compose correctly with `--count` (v0.9.3 flag)
- [ ] `atlas inbox --help` updated with new flags and valid type list
- [ ] flow-cli `win` command updated to write `type: 'win'` (tracked separately in flow-cli)
- [ ] Tests cover: empty result, unknown type error, limit > result count, limit < result count, win type round-trip

---

## Implementation Notes

- `FilterInboxUseCase` should accept `{ type?: string, limit?: number }` options and delegate to the capture repository's `getByStatus('inbox')`, then filter/slice in-process. This avoids adding repository methods for what is pure application logic.
- The `--limit` slice must be applied **after** type-filter to preserve consistent semantics with `atlas trail --limit`.
- Output ordering: most-recent first (`createdAt` descending). This matches `--limit`'s natural expectation ("give me the last 5 wins").
- Do not add `--format` to `atlas inbox` in this spec — that is a separate concern and would require a format support matrix update in `ATLAS-CONTRACT.md`.

---

## History

| Date | Author | Note |
|------|--------|------|
| 2026-06-14 | Claude (scheduled agent) | Initial draft; F6 from SPEC-flow-cli-integration-2026-06-13.md |
