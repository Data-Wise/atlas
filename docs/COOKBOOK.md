# Atlas Cookbook

> Task-oriented recipes for the research-ops workflow. Each recipe is **problem → do this → notes**.
> New here? Start with the [Research Registry tutorial](tutorials/research-registry.md); for the big picture
> see [RESEARCH-REGISTRY.md](RESEARCH-REGISTRY.md) and the cross-tool
> [research-ops overview](https://github.com/Data-Wise/docs-standards/blob/main/research-ops/overview.md).

---

## Recipe 1 — Tag a manuscript or program

**You want** a `.STATUS` that atlas can read as a research project.

```yaml
# ~/projects/research/collider/.STATUS
status: revise & resubmit
priority: P0
progress: 95
kind: manuscript          # manuscript | program
target: AMPPS             # or venue: / journal:
next: upload rev1 to the AMPPS portal (deadline Aug 7)
```

A **program** can carry a `tasks:` block (its proposals become task entries):

```yaml
kind: program
target: Epidemiology / JASA
tasks:
  - text: "01 incremental — promote code"; priority: P1; done: false
  - text: "05 data-fusion — copula kill-test"; priority: P2; done: true
```

**Notes.** `target:`, `venue:`, and `journal:` are aliases. A trailing `# comment` is stripped
(`target: CSDA # was JASA` → `CSDA`). Markdown-style (`## Kind: manuscript`) is also supported.

---

## Recipe 2 — Sync research projects (safely)

**You want** the registry to pick up `kind`/`target`/`tasks` from your research `.STATUS` files.

```bash
atlas sync --research                       # = --from-status, defaults to ~/projects/research
atlas sync --from-status --paths ~/projects/research   # explicit
atlas sync --from-status --paths ~/projects/research --dry-run   # preview
```

**Notes.** `--from-status` (and its `--research` alias) is the **authority** for research metadata. A plain
`atlas sync` is packages-only — it **preserves** existing `kind`/`target`/`tasks` but does not re-parse them,
and it **warns** you to re-run `--from-status` (see Recipe 7). See docs-standards **ADR-002**.

---

## Recipe 3 — List & query research projects

```bash
atlas project list --kind manuscript        # only manuscripts
atlas project list --kind program           # only programs
atlas project list --kind program --format json
# → [{ "name":"pmed-modern","kind":"program","target":"Epidemiology","taskCount":5,
#      "progress":80,"next":"…","priority":"P1" }]
```

JSON items carry `name, path, status, type, kind, target, taskCount, progress, next, priority` — enough for the
obs research board or any script to render manuscripts/programs without re-parsing `.STATUS`.

---

## Recipe 4 — Audit the settings contract (`doctor`)

**You want** to know which projects are missing `.STATUS` / `CLAUDE.md` / `.obs/sync.yml`.

```bash
atlas doctor                      # audit all real projects (excludes worktrees/tmp)
atlas doctor --kind manuscript    # restrict to manuscripts
atlas doctor --format json        # machine-readable summary + per-project rows
```

**Backfill** the missing `CLAUDE.md` files (preview first):

```bash
atlas doctor --fix                # preview what would be created
atlas doctor --fix --write        # actually create the stubs
```

**Notes.** `doctor` exits non-zero on a missing `.STATUS` — wire it into CI or a launchd job as a drift guard.
The contract itself lives in docs-standards (**ADR-001**).

---

## Recipe 5 — Retarget a manuscript's venue

**You want** to change a manuscript's venue but keep a note of the old one.

```yaml
target: CSDA # was JASA — retargeted 2026-06-25 (numerical-algorithm fit)
```

```bash
atlas sync --research      # re-parse; the board/list show venue = "CSDA"
```

The inline `# …` comment is stripped from the stored venue but stays in your `.STATUS` for the record.

---

## Recipe 6 — Track a monorepo's child repos

**You want** atlas to track the child repos inside an umbrella (e.g. `mcp-servers/*`), not just the umbrella.

```bash
touch ~/projects/dev-tools/mcp-servers/.atlas-scan-children
atlas sync
```

**Notes.** By default a project directory is a scan **leaf** (umbrella-only). The `.atlas-scan-children` marker
opts the umbrella in to having its children scanned too (bounded by `scanDepth`). See docs-standards **ADR-003**.

---

## Recipe 7 — Recover after a plain `atlas sync`

**Symptom.** After a routine `atlas sync` you see:

```
⚠️  4 research project(s) preserved but not refreshed by plain sync: collider, pmed-modern, …
   Run `atlas sync --from-status` to update kind/target/tasks.
```

**Do this.**

```bash
atlas sync --from-status --paths ~/projects/research
```

**Notes.** Plain sync never *strips* research metadata (fixed in 0.11.1) — it preserves it and reminds you to
refresh. This is the documented ownership contract (ADR-002), not an error.

---

## Recipe 8 — Render the vault research board (obs)

**You want** a live board in your Obsidian vault, generated from the atlas registry.

```bash
obs link                                  # stamp .obs/sync.yml (once per project)
obs research board --dry-run              # preview / drift check
obs research board --out Research/00_meta/_RESEARCH-BOARD.md
```

The board reads atlas via MCP/JSON, so keep the registry current with Recipe 2 first.

---

## Recipe 9 — Use the registry from Claude (MCP)

`atlas_get_projects` accepts a `kind` filter and returns the research fields:

```javascript
atlas_get_projects({ kind: 'program' })
// → pmed-modern  Kind: program  Venue: Epidemiology  Tasks: 5  Progress: 80%
```

See [MCP-SERVER.md](MCP-SERVER.md) for setup and the full tool list.

---

## Recipe 10 — Registry hygiene

**You want** to drop entries whose directories no longer exist.

```bash
atlas sync --remove-orphans          # remove projects no longer on disk
atlas doctor                         # confirm the count reflects real projects
```

**Notes.** If `--from-status` registered a project before any plain sync, the two used to create a duplicate;
that is fixed (plain sync resolves by path) — see CHANGELOG / issue #49.
