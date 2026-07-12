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
kind: program                    # manuscript | program
tasks:                           # a program's proposals (optional)
  - text: "01 incremental — promote code"; priority: P1; done: false
  - text: "02 Sobol — run the grid"; priority: P2; done: false
```

`kind` and `tasks` are optional and additive — package `.STATUS` files are unaffected.

## 2. Sync into the registry

```bash
atlas sync --research        # shorthand; = --from-status --paths ~/projects/research
# ~ pmed-modern: kind: none → program, tasks: 0 → 5
```

> `--from-status` / `--research` is the **authority** for research metadata. A plain `atlas sync` preserves it
> but does not re-parse it, and warns you to re-run this — see the [Cookbook](../cookbook/COOKBOOK.md) (Recipe 7) and ADR-002.

## 3. Query

```bash
atlas project list --kind program
atlas project list --kind manuscript --format json
# JSON carries kind/target/taskCount/progress/next/priority
```

Via MCP, `atlas_get_projects({ kind: 'program' })` returns the same fields for Claude or the obs board.

## 4. Audit the settings contract

```bash
atlas doctor                 # which projects miss .STATUS / CLAUDE.md / .obs/sync.yml
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

See also: [Research Registry](../../RESEARCH-REGISTRY.md) · docs-standards `adr/ADR-001` ·
atlas `docs/plans/PHASE-3-research-registry-plan.md`.
