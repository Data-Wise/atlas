# Tutorial — Research Registry & Doctor

Atlas can track your **manuscripts and research programs** alongside code, audit that every project is
set up correctly, and feed a live dashboard. This short walkthrough takes you from a `.STATUS` file to a
rendered research board.

## 1. Tag a research project

Add research fields to the project's `.STATUS` header:

```yaml
status: active
priority: P1
progress: 75
next: advance the data-fusion proposal
type: research
target: Epidemiology / JASA      # publication venue (alias: venue:)
kind: program                    # manuscript | program | package
tasks:                           # a program's proposals (optional)
  - text: "01 incremental — promote code"; priority: P1; done: false
  - text: "02 Sobol — run the grid"; priority: P2; done: false
```

`kind` and `tasks` are optional and additive — package `.STATUS` files are unaffected.

Package-kind (`kind: package`) projects can also set `cran_state:` (e.g. `dev`, `planned`, `hold`,
`submitted`, `accepted`, `on_cran`) to track CRAN release-cycle position — surfaced as `cranState`
via `--format json` and rendered as a badge column by `obs research board`.

## 2. Sync into the registry

```bash
atlas sync --research        # shorthand; = --from-status --paths ~/projects/research
# ~ pmed-modern: kind: none → program, tasks: 0 → 5
```

> `--from-status` / `--research` is the **authority** for research metadata. A plain `atlas sync` preserves it
> but does not re-parse it, and warns you to re-run this — see the [Cookbook](../cookbook/COOKBOOK.md) (Recipe 7) and ADR-002.
>
> Sync never rejects a malformed `.STATUS` field — it warns instead. A non-numeric `progress:` parses
> as `0` (bad value quoted); a duplicate top-level key uses the last occurrence (both line numbers
> named). The latter is common when a stale "preserved original content" block sits below an active
> header — check `atlas doctor`'s output if a project's data looks wrong after sync.

## 3. Query

```bash
atlas project list --kind program
atlas project list --kind manuscript --format json
# JSON carries kind/target/cranState/taskCount/progress/next/priority
```

Via MCP, `atlas_get_projects({ kind: 'program' })` returns the same fields for Claude or the obs board.

## 4. Audit the settings contract

```bash
atlas doctor                 # which projects miss .STATUS / CLAUDE.md / .flow/obsidian-sync.yml
atlas doctor --fix           # preview missing CLAUDE.md
atlas doctor --fix --write   # create them
```

`atlas doctor` exits **1** on a missing `.STATUS`, so it doubles as a CI / launchd drift guard. The
contract it enforces lives in docs-standards `adr/ADR-001`.

## 5. Render the board (obs)

[`obs research board`](https://github.com/Data-Wise/obsidian-cli-ops) consumes `atlas project list
--format json` and writes a deterministic, marker-bounded dashboard into your Obsidian vault:

```bash
obs research board --out ~/vault/00_meta/_RESEARCH-BOARD.md
```

## Where it fits

`.STATUS` → **atlas** (registry + `doctor`) → **`obs research board`** → vault dashboard.

See also: [.STATUS Schema — Research fields](../../STATUS-SCHEMA.md#research-fields-manuscripts-programs-packages) ·
docs-standards `adr/ADR-001` · atlas `docs/plans/PHASE-3-research-registry-plan.md`.

---

**Now what?** → [.STATUS Schema](../../STATUS-SCHEMA.md)
