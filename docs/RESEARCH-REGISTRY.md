# Research Registry

Atlas treats **research artifacts** — manuscripts, multi-paper programs, and their proposals —
as first-class registry citizens alongside code packages. This lets `atlas plan`, `project list`,
and the MCP server surface "where do I stand across every paper and program" the same way they do
for software projects.

It is **additive**: ordinary package `.STATUS` files are unaffected, and every field below is optional.

---

## The research `.STATUS` schema

As of schema `atlas/v1` (see [STATUS-SCHEMA.md](STATUS-SCHEMA.md) for the full normative
reference), a research project's `.STATUS` is canonical **YAML frontmatter** plus a few optional
research fields. Legacy bare `key: value` headers (shown further below for historical repos) still
read correctly — atlas normalizes both to the same object — but every project's `.STATUS` is
written back in frontmatter form once touched by `atlas migrate` or any atlas write.

```yaml
---
schema: atlas/v1
status: active                 # active | paused | blocked | planning | stable | complete | archived
priority: high                 # low | medium | high
progress: 75                   # 0–100
next:                          # ordered list; first = next action
  - advance 05 data-fusion
type: research                 # atlas project type
target: Epidemiology / JASA    # publication venue (alias: `venue:`/`journal:` accepted on read)
kind: program                  # manuscript | program | package  (research only)
cran_state: dev                # package-kind only — see CRAN state, below
program: pmed-modern           # program id (proposals reference their parent)
updated: 2026-06-25
tasks:                         # a program's proposals, as task entries
  - text: "01 incremental-elasticity — promote code to probmed/R"
    priority: P1
    done: false
  - text: "02 Sobol — run the full grid"
    priority: P2
    done: false
  - text: "05 data-fusion — copula kill-test"
    priority: P2
    done: true
---
Free markdown body — notes, links, prose. Never parsed, always preserved.
```

<details>
<summary>Legacy bare-yaml form (still readable, no longer written)</summary>

```yaml
status: active
priority: P1
progress: 75
next: advance 05 data-fusion
type: research
target: Epidemiology / JASA
kind: program
cran_state: dev
```

</details>

### Field notes
- **`kind`** — `manuscript` (a single paper), `program` (a multi-paper effort), or `package` (an R
  package under active CRAN work). All three are explicit author-set values, same as any other
  `.STATUS` field — `kind` is never inferred from directory structure or file contents. Omitting it
  leaves it `null`.
- **`target` / `venue`** — the publication venue (e.g. `JASA`, `Biometrika`, `AMPPS`).
- **`cran_state`** — free text, package-kind projects only (e.g. `dev`, `planned`, `submitted`,
  `hold`, `accepted`, `on_cran`). No enum is enforced — same passthrough convention as `kind`/`target`.
  See [CRAN state](#cran-state-package-kind-projects), below.
- **`tasks:`** — a block of inline items. Each item is `- text: "..."; priority: ...; done: true|false`
  (`est:` optional). These are a program's **proposals**, stored as task entries on the program
  Project (not as separate heavyweight projects).

---

## Syncing

```bash
# Scan a research tree and register everything it finds
atlas sync --from-status --paths ~/projects/research

# Preview only
atlas sync --from-status --paths ~/projects/research --dry-run

# Ecosystem summary (counts by status / kind / progress), no writes
atlas sync --from-status --paths ~/projects/research --report
```

Sync is idempotent. The change report calls out research fields, e.g.
`~ pmed-modern: kind: none → program, tasks: 0 → 5`.

> **Which sync owns research metadata?** `sync --from-status` is the **authority** — it parses and updates
> `kind`/`target`/`cranState`/`tasks`/`priority`. A plain `atlas sync` (packages-only) **preserves** existing
> research metadata but does not re-parse it, so re-run `--from-status` after editing a manuscript's `.STATUS`.
> *(Plain sync used to silently strip these fields — fixed in 0.11.1; see issue #36.)*
>
> **Parse warnings:** `--from-status` never blocks on a malformed `.STATUS` field — it surfaces two
> classes of issue instead: a non-numeric `progress:` (parsed as `0`, bad value quoted in the warning)
> and a duplicate top-level key (last occurrence wins; both line numbers named). The latter is common
> in files that keep a stale "preserved original content" block below an active header — its
> `status:`/`progress:`/`target:` lines still match and silently shadow the real ones without a warning
> to catch it. Warnings print under the sync summary and are also visible per-project via `atlas doctor`.

---

## Querying

```bash
# Filter the registry by kind
atlas project list --kind program
atlas project list --kind manuscript

# JSON carries the research fields (for obs / scripts)
atlas project list --kind program --format json
# → [{ "name":"pmed-modern", "kind":"program", "target":"Epidemiology / JASA", "taskCount":5, ... }]

# Package-kind items carry cranState instead of a venue
atlas project list --kind package --format json
# → [{ "name":"medrobust", "kind":"package", "target":null, "cranState":"hold", "progress":65, ... }]
```

`--format json` items include `name, path, status, type, kind, target, cranState, taskCount, progress, next, priority`.
`cranState` is `null` for non-package projects and for package projects that haven't set `cran_state:`.

### Via MCP (for Claude / the obs research board)

`atlas_get_projects` accepts a `kind` filter and returns `kind`, `target`, and `taskCount` for each
project, so an agent (or the obs `research board`) can render manuscripts/programs without re-parsing
`.STATUS` files.

```javascript
atlas_get_projects({ kind: 'program' })
// → 🟢 pmed-modern   Type: research | Status: active | Kind: program
//      Venue: Epidemiology / JASA
//      Tasks: 5
```

---

## Validating — `atlas doctor`

`atlas doctor` audits every registered project against the **Project Settings Contract**
(`.STATUS`, `CLAUDE.md`, `.flow/obsidian-sync.yml`) and reports the gaps:

```bash
atlas doctor                      # audit all real projects (excludes worktrees/tmp)
atlas doctor --kind manuscript    # restrict to one kind
atlas doctor --fix --write        # create missing CLAUDE.md (preview without --write)
```

It exits non-zero on a missing `.STATUS` (a CI / launchd drift guard). The contract itself is defined in
`dev-tools/docs-standards` (ADR-001).

---

## CRAN state (package-kind projects)

Package-kind projects (`kind: package`) can optionally carry a `cran_state:` field tracking where
they stand in a CRAN release cycle. It's a free-text passthrough — same convention as `kind`/`target`,
no enum validation — but the ecosystem convention (used across the mediationverse packages) is:

| Value | Meaning |
|---|---|
| `dev` | Actively developed, not yet CRAN-ready |
| `planned` | CRAN-ready or scheduled, submission not yet sent |
| `submitted` | Submitted, awaiting CRAN review |
| `hold` | CRAN-ready but deliberately held (e.g. pending a companion manuscript submission) |
| `accepted` | CRAN accepted the submission |
| `on_cran` | Live on CRAN |

```yaml
kind: package
cran_state: hold
next: Complete vignettes, prepare for CRAN submission
```

```bash
$ atlas project list --kind package --format json
# → cranState surfaces per project, null if the field is unset
```

`obs research board` (obsidian-cli-ops) renders a dedicated Packages section with a CRAN-state badge
column using this field — see that project's docs for the render side.

---

## Worked example

`~/projects/research/pmed-modern/.STATUS` declares `kind: program`, a venue, and a `tasks:` block of
five proposals. After `atlas sync --from-status --paths ~/projects/research`:

```
$ atlas project list --kind program --format json
• pmed-modern | kind=program | tasks=5 | venue=Epidemiology / JASA / Biometrika / Bernoulli
```

---

## Design notes

- **Storage:** research fields live in `project.metadata` (`kind`, `target`, `cranState`, `tasks`) —
  no change to the `Project` schema, so package behavior and serialization are untouched.
- **Proposals = tasks:** a program's proposals are task entries on the program Project, not separate
  Projects (lighter weight; one row per program in the registry).
- **Parser:** `StatusFileParser` reads the research keys and the `tasks:` block, tracks duplicate
  top-level keys, and validates `progress:` leniently (extracts the leading integer, warns rather
  than rejects on trailing text or non-numeric values); `summarize()` groups projects `byKind`.

Design and gap analysis specs are available in the repository's `docs/specs/` directory.
