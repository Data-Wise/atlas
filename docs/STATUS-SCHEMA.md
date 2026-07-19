# .STATUS Schema (atlas/v1)

Normative reference for the `.STATUS` file format atlas reads and writes.

## Canonical format

```yaml
---
schema: atlas/v1
status: active        # enum: active|paused|blocked|planning|stable|complete|archived
progress: 45           # integer 0-100
type: node             # project type (free text)
kind: package           # research kind: manuscript|program|package (optional)
priority: high          # low|medium|high (optional)
focus: <one line>
next:                    # ordered list, first = next action
  - <action 1>
  - <action 2>
target: <venue/journal>   # optional; aliases venue/journal accepted on read
cran_state: <free>        # optional
version: 0.14.0            # optional
updated: 2026-07-19          # stamped by atlas writes
tasks:                        # optional structured tasks
  - text: <t>
    done: false
metrics: {}                     # atlas-managed; sessions/evidence land here
---
<free markdown body — never parsed, always preserved byte-for-byte>
```

Keys are lowercase; enum values are lowercase. Unknown frontmatter keys are
preserved verbatim on every write.

## Accepted read formats

atlas reads three formats, all normalizing to the same object:

1. **Canonical YAML frontmatter** (above) — the only format atlas writes.
2. **Legacy markdown** — `## Key: Value` headers (e.g. `## Status: active`).
3. **Legacy bare-yaml** — plain `key: value` lines with no `---` delimiters.

Parsing all three paths runs the same duplicate-key and progress-value
warning machinery (see `StatusFileParser`), so malformed input is always
surfaced, never silently miscoerced.

## Write behavior

- `StatusFileGateway.write()` always emits canonical frontmatter.
- If the file on disk is in a legacy format, `write()` **refuses** and
  throws `LegacyStatusFileError` naming `atlas migrate` — unless the caller
  passes `{ migrate: true }`.
- Unknown/extra frontmatter keys and the markdown body are always
  preserved byte-for-byte across a write.

## Migrating legacy files

```bash
atlas migrate --status [path]              # dry-run (default): prints a field-level diff
atlas migrate --status [path] --apply      # writes canonical frontmatter
atlas migrate --status [path] --all-scanned --apply   # batch a directory tree
```

Dry-run never writes. The diff lists every recognized field plus any parse
warnings (duplicate keys, non-numeric progress, etc.) so you can fix the
source before applying.

## Field notes

- `next` is always normalized to an array. Plain strings (canonical) and
  legacy `{action, priority, estimate, blockers}` objects both validate.
- `target` accepts `venue` and `journal` as read-time aliases.
- `type` is optional — the `minimal` template omits it.
- `status` enum was extended from `active|paused|archived|complete` to
  include `blocked`, `planning`, `stable` (matches what the `research`
  template already shipped).

## Compatibility

Legacy formats remain readable indefinitely as of v0.14.0 — no repo is
rewritten without an explicit `atlas migrate` or `write(..., { migrate: true
})`. A read-path sunset warning is planned for v0.15.0.
