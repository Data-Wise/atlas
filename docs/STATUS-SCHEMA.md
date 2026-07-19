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

## Research fields (manuscripts, programs, packages)

Research artifacts — manuscripts, multi-paper programs, and their proposals — are first-class
registry citizens alongside code packages. This is **additive**: ordinary package `.STATUS`
files are unaffected, and every field below is optional.

```yaml
---
schema: atlas/v1
status: active
priority: high
progress: 75
next:
  - advance 05 data-fusion
type: research
target: Epidemiology / JASA    # publication venue (aliases: venue, journal)
kind: program                  # manuscript | program | package (research only)
cran_state: dev                # package-kind only — see CRAN state, below
program: pmed-modern           # program id (proposals reference their parent)
tasks:                         # a program's proposals, as task entries
  - text: "01 incremental-elasticity — promote code to probmed/R"
    priority: P1
    done: false
---
```

- **`kind`** — `manuscript` (single paper), `program` (multi-paper effort), or `package` (R
  package under active CRAN work). Always author-set, never inferred. Omitting it leaves it `null`.
- **`target`** — publication venue (e.g. `JASA`, `Biometrika`). `venue`/`journal` accepted on read.
- **`tasks`** — a program's proposals, stored as task entries on the program Project (not
  separate heavyweight projects). Each item: `text`, `priority`, `done` (`est` optional).

### Sync authority

`atlas sync --from-status` (alias `atlas sync --research`) is the **authority** for research
metadata — it parses and updates `kind`/`target`/`cranState`/`tasks`/`priority`. A plain `atlas
sync` (packages-only) preserves existing research metadata but does not re-parse it — re-run
`--from-status` after editing a manuscript's `.STATUS`.

### Querying

```bash
atlas project list --kind program --format json
# → [{ "name":"pmed-modern", "kind":"program", "target":"Epidemiology / JASA", "taskCount":5, ... }]
```

`--format json` items include `name, path, status, type, kind, target, cranState, taskCount,
progress, next, priority`. Via MCP, `atlas_get_projects({ kind: 'program' })` returns the same
fields for Claude or the `obs research board`.

### CRAN state (package-kind projects)

Free-text passthrough on `cran_state:` — no enum enforced, but the ecosystem convention:

| Value | Meaning |
|---|---|
| `dev` | Actively developed, not yet CRAN-ready |
| `planned` | CRAN-ready or scheduled, submission not yet sent |
| `submitted` | Submitted, awaiting CRAN review |
| `hold` | CRAN-ready but deliberately held |
| `accepted` | CRAN accepted the submission |
| `on_cran` | Live on CRAN |

### Validating — `atlas doctor`

```bash
atlas doctor                      # audit all real projects
atlas doctor --kind manuscript    # restrict to one kind
atlas doctor --fix --write        # create missing CLAUDE.md
```

Audits every registered project against the Project Settings Contract (`.STATUS`, `CLAUDE.md`,
`.flow/obsidian-sync.yml`) and exits non-zero on a missing `.STATUS` — usable as a CI/launchd
drift guard.

Full walkthrough: [Tutorial — Research Registry & Doctor](user-guide/tutorials/research-registry.md).

---

**Now what?** → [Tutorial — Research Registry & Doctor](user-guide/tutorials/research-registry.md)
