# Research Registry

Atlas treats **research artifacts** — manuscripts, multi-paper programs, and their proposals —
as first-class registry citizens alongside code packages. This lets `atlas plan`, `project list`,
and the MCP server surface "where do I stand across every paper and program" the same way they do
for software projects.

It is **additive**: ordinary package `.STATUS` files are unaffected, and every field below is optional.

---

## The research `.STATUS` schema

A research project's `.STATUS` is the same key/value header used everywhere, plus a few optional
research fields. Keys are free-text `key: value` lines at the top of the file; prose may follow.

```yaml
status: active                 # free text: active | draft | paused | planning | "revise & resubmit"
priority: P1                   # free text: high | -- | P0 | P1 ...
progress: 75                   # 0–100
next: advance 05 data-fusion   # one-line next action
type: research                 # atlas project type
target: Epidemiology / JASA    # publication venue (alias: `venue:`)
kind: program                  # manuscript | program  (research only)
program: pmed-modern           # program id (proposals reference their parent)
updated: 2026-06-25
tasks:                         # a program's proposals, as task entries
  - text: "01 incremental-elasticity — promote code to probmed/R"; priority: P1; done: false
  - text: "02 Sobol — run the full grid"; priority: P2; done: false
  - text: "05 data-fusion — copula kill-test"; priority: P2; done: true
```

### Field notes
- **`kind`** — `manuscript` (a single paper) or `program` (a multi-paper effort). Packages are
  `package` (inferred); omitting `kind` leaves it `null`.
- **`target` / `venue`** — the publication venue (e.g. `JASA`, `Biometrika`, `AMPPS`).
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

---

## Querying

```bash
# Filter the registry by kind
atlas project list --kind program
atlas project list --kind manuscript

# JSON carries the research fields (for obs / scripts)
atlas project list --kind program --format json
# → [{ "name":"pmed-modern", "kind":"program", "target":"Epidemiology / JASA", "taskCount":5, ... }]
```

`--format json` items include `name, path, status, type, kind, target, taskCount`.

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

## Worked example

`~/projects/research/pmed-modern/.STATUS` declares `kind: program`, a venue, and a `tasks:` block of
five proposals. After `atlas sync --from-status --paths ~/projects/research`:

```
$ atlas project list --kind program --format json
• pmed-modern | kind=program | tasks=5 | venue=Epidemiology / JASA / Biometrika / Bernoulli
```

---

## Design notes

- **Storage:** research fields live in `project.metadata` (`kind`, `target`, `tasks`) — no change to
  the `Project` schema, so package behavior and serialization are untouched.
- **Proposals = tasks:** a program's proposals are task entries on the program Project, not separate
  Projects (lighter weight; one row per program in the registry).
- **Parser:** `StatusFileParser` reads the research keys and the `tasks:` block; `summarize()` groups
  projects `byKind`.

See [`specs/SPEC-atlas-research-registry.md`](specs/SPEC-atlas-research-registry.md) for the design
and [`specs/GAP-ANALYSIS-research-registry.md`](specs/GAP-ANALYSIS-research-registry.md) for coverage
and the Phase-3 roadmap.
