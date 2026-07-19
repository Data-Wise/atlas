# SPEC: Canonical .STATUS Schema — YAML frontmatter, one parser, migration tooling

**Date:** 2026-07-19 · **Status:** approved (grilled 2026-07-19 — user chose YAML over the markdown-canonical recommendation, accepting the breaking change) · **Release:** v0.14.0 (parser unification + migrate tool), v0.15.0 (markdown read-path sunset warning)

## Problem (from audit)

Atlas ships **two divergent .STATUS parsers**: `StatusFileParser` (registry scan; markdown `## Key:` + bare yaml lines) and `StatusFileGateway` (read/write path; YAML frontmatter). The writer emits a format no template, doc, or deployed repo uses, and silently drops `kind`/`target`/`cran_state`/`tasks` when rewriting a markdown file — a data-loss bug against the 13 normalized research repos. Additional drift: validator enum omits `planning` (shipped by the `research` template); validator wants `next` as array, parser yields string; `{{user}}` template placeholder never substituted; markdown branch recognizes fewer keys than yaml branch.

## Goals

- **One schema, one parser, zero silent data loss.** Any atlas write of a .STATUS file round-trips every recognized and unrecognized field.
- **Machine-friendly canon.** YAML frontmatter (`---` block + free markdown body) becomes the single canonical format — structured for tooling (Obsidian properties, Dataview, jq) while the body stays human prose.
- **Templates and validator agree with reality.**

## Canonical schema (v1)

```yaml
---
schema: atlas/v1
status: active        # enum: active|paused|blocked|planning|stable|complete|archived
progress: 45          # integer 0–100
type: node            # project type (free)
kind: package         # research kind: manuscript|program|package (optional)
priority: high        # low|medium|high (optional)
focus: <one line>
next:                 # ordered list, first = next action
  - <action 1>
  - <action 2>
target: <venue/journal>   # optional; aliases venue/journal accepted on read
cran_state: <free>        # optional
version: 0.14.0           # optional
updated: 2026-07-19       # stamped by atlas writes
tasks:                    # optional structured tasks
  - text: <t>
    done: false
metrics: {}               # atlas-managed; sessions/evidence land here
---
<free markdown body — never parsed, always preserved byte-for-byte>
```

Casing: keys lowercase; enum values lowercase. Unknown frontmatter keys are preserved verbatim on write (extends the #65 round-trip guarantee).

## Deliverables

1. **Unified parser** — one module (`src/adapters/gateways/StatusFileParser.js` absorbs the gateway's parsing) that reads: (a) canonical YAML frontmatter, (b) legacy markdown `## Key:`, (c) legacy bare `key:` yaml lines — all into the same normalized object, with the PR #87 warning machinery extended to all three paths.
2. **Writer** — always emits canonical frontmatter; refuses to write (with a clear error naming `atlas migrate`) if given a legacy markdown file, unless `--migrate` is passed. No more silent format conversion or field dropping.
3. **`atlas migrate --status [path|--all-scanned]`** — converts legacy .STATUS to canonical, dry-run by default, prints a field-level diff, preserves the body and unrecognized `##` sections as body prose. Batch mode covers the 13 research repos + dev-tools.
4. **Templates** — all 6 builtin templates rewritten to canonical frontmatter; `{{user}}` substitution fixed (read from config `templateVariables` or git config); validator enum extended (`planning`, `blocked`, `stable`), `type` optional for `minimal`, `next` normalized to array everywhere.
5. **Docs** — RESEARCH-REGISTRY.md, CONFIGURATION.md, CLI-REFERENCE.md updated; new docs/STATUS-SCHEMA.md as the single normative reference.

## Verification

- **Golden-file suite:** fixture .STATUS files in all 3 accepted formats × parse → identical normalized objects; write → byte-stable canonical output; round-trip (parse→write→parse) lossless including unknown keys and body.
- **Migration E2E (required in PR body):** run `atlas migrate --status --dry-run` against a copy of ≥3 REAL research-repo .STATUS files (per the PR #87 lesson: real data, not synthetic) and quote the diff transcript; planted defect: a file with duplicate keys + trailing-text progress must migrate with warnings, values preserved per #87 semantics.
- **Data-loss regression test:** the exact audit scenario — gateway write against a markdown research .STATUS containing `kind`/`target`/`cran_state` — must now either migrate losslessly or refuse; asserting the old silent-drop behavior is gone.
- **Acceptance criteria:** `sync --from-status` produces identical registry entries before/after migrating a repo; mkdocs strict build green; all ~2,000 existing tests pass with fixtures updated.

## Non-goals

- No forced migration: legacy formats stay readable through v0.15 (sunset warning added then; removal decided in a future spec).
- No .STATUS schema for non-atlas consumers beyond documenting it (flow-cli/savant adopt on their own cadence).
- No change to registry storage format.

## Migration / compat

- **Breaking on the write path only.** Repos are never rewritten without explicit `atlas migrate` or `--migrate`. flow-cli reads .STATUS only via atlas JSON output — unaffected.
- Coordinated rollout: migrate dev-tools repos first, research repos batch-second (savant's normalized 13), announce in CHANGELOG with the schema doc linked.

## Release mapping

- **v0.14.0:** unified parser, safe writer, migrate tool, templates, docs.
- **v0.15.0:** legacy-format read warning; evaluate removal for v0.16.

## Execution (drivable by /craft:orch:drive or agent fleet)

**Worktree:** `~/.git-worktrees/atlas/feature-status-schema-v1` · **Branch:** `feature/status-schema-v1` (base `dev`) · **PR title:** `feat(status): canonical YAML frontmatter schema, unified parser, atlas migrate`

| # | Task | Acceptance |
|---|---|---|
| 1 | Unified read: StatusFileGateway parses via StatusFileParser normalization (frontmatter + legacy md + legacy yaml → same object, warnings preserved) | golden-file suite: 3 formats × same fixture → identical objects |
| 2 | Safe writer: canonical frontmatter only; refuses legacy input without `--migrate`; unknown keys + body byte-preserved | data-loss regression test (kind/target/cran_state survive or write refused) |
| 3 | `atlas migrate --status [path]` with `--dry-run` default + field diff | dry-run on ≥3 real research .STATUS copies, transcript in PR body |
| 4 | Templates → frontmatter; fix `{{user}}`; validator enum += planning/blocked/stable; `next` always array | template render test; validator tests |
| 5 | docs/STATUS-SCHEMA.md + RESEARCH-REGISTRY/CLI-REFERENCE/CONFIGURATION updates | `mkdocs build --strict` green |

**Verify gate:** `npm test` green + golden-file round-trip suite + `mkdocs build --strict`.
