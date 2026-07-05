# SPEC — atlas: Task CLI + schedule push/agenda (Track B)

> Repo: `atlas` (Node, Clean Arch, Jest). Status: proposed.
> Companion (other repo): `flow-cli/docs/specs/SPEC-planning-coordination-2026-07-01.md` + `flow-cli/docs/ATLAS-CONTRACT.md` v1.2.0 (the read/write contract this SPEC implements).
> Resolves: gap-analysis roadmap item #5 in `GAP-ANALYSIS-research-registry.md` l.78 — "promote `metadata.tasks` → formal `Task` entities + `atlas task list`... only if proposal-level workflow is wanted." **This is that concrete request.**

## 1. Context / problem

flow-cli's schedule engine (v7.14.0, merged) ships a third schedule source, `_schedule_atlas_items`, that calls `atlas agenda <window-days> --format=json` — capability-probed, currently a silent no-op because **no atlas release implements `agenda`, `schedule`, or `task` as top-level commands** (confirmed: zero hits in `bin/atlas.js`). Two other things are already true and unconnected:

- `src/domain/entities/Task.js` is a complete entity (`dueDate`, `isOverdue()`, `isDueSoon()`, etc.) and `src/domain/repositories/ITaskRepository.js` defines a full repository interface — **but zero implementations exist** (no `FileSystemTaskRepository`, no `SQLiteTaskRepository`, no `Container.js` registration).
- `SPEC-atlas-research-registry.md` Phase 3 (⏳ planned) already proposed "formal `Task` entities + `atlas task`" for research-proposal action items, but was deliberately deferred — gap-analysis roadmap item #5 says invest only "if a concrete `atlas task` workflow is requested" (`GAP-ANALYSIS-research-registry.md:91`).

This SPEC is that concrete request, arriving from the flow-cli side. It builds ONE `atlas task` CLI that serves both origins — proposal-derived tasks (research-registry's use) and deadline-bearing tasks (flow-cli agenda's use) — since they're the same `Task` entity already.

## 2. Goals / non-goals

**Goals:**
- `atlas task {add,list,done,rm}` — CRUD over the existing `Task` entity, `--format json` on `list`, with `--due`/`--priority`/`--project` filters/fields.
- `atlas schedule push --format=json --data=<json>` — receive pre-normalized dated records (the pinned write-direction contract, `ATLAS-CONTRACT.md:66,125-158`). Atlas does **not** parse `.STATUS` `## Schedule:` blocks itself — ADR-001 (`docs-standards/adr/ADR-001-research-ops-ecosystem-ownership.md:21`) already assigns that read to flow-cli. Atlas only stores what it's handed.
- `atlas agenda <window-days> --format=json` — merge native `Task.dueDate` entries + pushed schedule records into the pinned read-direction JSON shape (`ATLAS-CONTRACT.md:87-99`, 5 fields, no `source`).
- Respond to `atlas agenda --help` / `atlas schedule --help` (flow-cli's capability probe checks this).

**Non-goals:**
- Parsing `.STATUS` `## Schedule:` blocks or `.flow/teach-config.yml` — flow-cli's job (ADR-001), not atlas's.
- Migrating existing research-proposal `metadata.tasks` to the new `Task` entity — additive only; `metadata.tasks` stays as-is for now (a future spec can migrate it once this CLI is proven).
- A dashboard/TUI view for tasks — CLI + JSON only, this cycle.
- Recurring-record expansion (`recurrence: weekly:<dow>` → concrete dates) — flow-cli already expands recurrence before pushing (`schedule.zsh` `_schedule_expand_recurring`); atlas stores/echoes `recurrence` verbatim, does not compute it.

## 3. Data contract (pinned by the other repo — do not redesign)

**Read** (`atlas agenda <window-days> --format=json`) — atlas emits, flow-cli maps `source=atlas` itself:
```json
[{"date":"2026-07-05","label":"Submit grant report","type":"research","project":"grant-writing","recurrence":"none"}]
```
`type` ∈ `teaching | research | general | recurring | holiday`. No `source` field — flow-cli stamps it during ingestion (`ATLAS-CONTRACT.md:87-90`).

**Write** (`atlas schedule push --format=json --data=<json>`) — flow-cli sends, atlas stores as-is:
```json
[{"date":"2026-06-20","label":"Submit JRSS-B revision","type":"research","project":"manuscript-x","recurrence":"none","source":"status"}]
```
`source` ∈ `status | teach-config`. Upsert keyed on `(project, date, label)` (`ATLAS-CONTRACT.md:154`).

**`atlas task` CLI shape** (new — this SPEC's own design, not externally pinned): `add <description> [--due=YYYY-MM-DD] [--priority=N] [--project=<name>]`, `list [--format=json] [--project=<name>] [--overdue] [--due-soon]`, `done <id>`, `rm <id>`. `list --format json` emits `Task.getSummary()` (`Task.js:278-300`) per row — the entity's existing natural JSON shape, reused rather than inventing a new one.

## 4. Design / changes

- **domain:** no entity change — `Task.js` and `ITaskRepository.js` are already complete and sufficient. New: `ScheduleRecord` (lightweight VO or plain-object entity — NOT `Task`; pushed records don't need `Task`'s full lifecycle, just `date/label/type/project/recurrence/source`) for the `schedule push` store.
- **adapters/repositories:** `FileSystemTaskRepository` + `SQLiteTaskRepository`, built from the `FileSystemCaptureRepository`/`SQLiteCaptureRepository` pair as the template (same DI/Container pattern). `FileSystemScheduleRecordRepository` (+ SQLite if the project's storage backend requires parity — check `Container.js` for whether FS-only repos already exist elsewhere as precedent before assuming both are mandatory).
- **use-cases** (`src/use-cases/task/`, new dir, following `CaptureIdeaUseCase.js`'s DI/execute/return-entity shape):
  - `AddTaskUseCase`, `ListTasksUseCase`, `CompleteTaskUseCase`, `RemoveTaskUseCase`
  - `ReceiveSchedulePushUseCase` (upsert `ScheduleRecord`s keyed on `(project, date, label)`)
  - `AgendaUseCase` (query `ITaskRepository.findAll()` filtered by `dueDate` within the window + `ScheduleRecordRepository` records within the window → merge → map to the pinned read shape)
- **Container.js:** register the two new repositories + 6 use-cases via the existing `'Name': () => this.getXUseCase()` map (`Container.js:383-423` pattern).
- **`src/index.js` (Atlas facade):** new `this.tasks = new TasksAPI(this.container)`, mirroring `this.capture = new CaptureAPI(...)` (`index.js:611-635`).
- **`bin/atlas.js` (Commander.js):** `program.command('task ...')` subcommands + `program.command('schedule push')` + `program.command('agenda <window-days>')`, each following the existing `.option('--format <format>', ..., 'table')` + explicit `if (options.format === 'json')` pattern (`bin/atlas.js:299` precedent) — no global format middleware, matches house style.
- **MCP:** optionally surface `atlas_list_tasks`/`atlas_agenda` in `src/mcp/index.js` alongside the existing `atlas_get_*` tools — deferred to a follow-up unless trivial once the use-cases exist (not required for the flow-cli contract, which is CLI-only).

## 5. Tests (Jest — house style: injected fakes, no real I/O, `@jest/globals`, per `DoctorUseCase.test.js`)

- `AddTaskUseCase`/`ListTasksUseCase`/`CompleteTaskUseCase`/`RemoveTaskUseCase`: standard CRUD unit tests against a fake `ITaskRepository`.
- `ReceiveSchedulePushUseCase`: upsert semantics — same `(project,date,label)` pushed twice updates, not duplicates; malformed payload → typed error, not a crash.
- `AgendaUseCase`: merges `Task.dueDate` + `ScheduleRecord` sources correctly within a window; window boundary (day 0/7/30/3650) inclusive/exclusive per flow-cli's `SCHEDULE_DEFAULT_WINDOW` semantics — confirm against `schedule.zsh`'s actual filter behavior, don't assume; empty-both-sources → empty array, not error.
- **Contract-shape tests** (the highest-value tests here): `atlas agenda ... --format=json` output validated against the exact 5-field shape flow-cli's `test-atlas-contract.zsh` / `tests/fixtures/atlas-agenda-stub.json` (flow-cli repo) already assert — this is the two-repo seam; a shape drift here breaks flow-cli silently unless caught. Consider a shared fixture (see §8).
- `FileSystemTaskRepository`/`FileSystemScheduleRecordRepository`: parity tests against the existing `FileSystemCaptureRepository` test file's structure.
- CLI: `atlas agenda --help` and `atlas schedule --help` exit 0 with usage text (this is literally flow-cli's capability probe — must not regress).

## 6. Observability

`atlas doctor` — add a check that `task`/`schedule`/`agenda` commands are registered (mirrors existing command-presence checks, if any exist; else skip — not blocking). No new `.STATUS` schema impact (this SPEC touches no `.STATUS` parsing).

## 7. Migration / rollback

Purely additive — no existing entity/schema changes, no `metadata.tasks` migration. Rollback = revert the PR; `Task`/`ITaskRepository` remain exactly as unused as before. New repos/use-cases have no readers yet outside the new CLI, so there's no downstream breakage risk from reverting.

## 8. Cross-repo verification plan

Because the read-side JSON shape is a real two-repo contract (not just this repo's own convention), the SPEC's own test suite is necessary but not sufficient. Before this ships:
1. Run flow-cli's `tests/test-atlas-contract.zsh` (already extended, per flow-cli PR #483) against a **real built atlas binary** with this branch checked out — not just flow-cli's stub — to catch shape drift the stub can't (stub-parity risk flagged in flow-cli's own grill decision D16).
2. Flip flow-cli's `_FLOW_ATLAS_HAS_AGENDA` capability probe from "no atlas" to "real atlas with `agenda --help`" in a local dogfood session; confirm `agenda -m` in flow-cli renders atlas-sourced deadlines end-to-end.
3. Only after both pass: flow-cli's dark-ready code can be considered "lit."

## 9. Sequencing (per atlas `.STATUS` today)

`.STATUS`'s `## Next:` currently queues two options: v0.13.0 (AnalyticsView, dead-zone iCal, multi-project calibration) OR the ecosystem P1 scaffold (`atlas catch`→obs write-through, gated on obs v4.2.0's IPC bridge). This SPEC is a **third, independent option** — no dependency on either queued item, no shared files with the P1 scaffold (that touches `ObsidianGateway.js`/capture; this touches `Task`/schedule). Can run in parallel with whichever of the two is picked next, or be sequenced after — reviewer's call, not a technical constraint.

## 10. Estimate

`atlas task` CRUD: **S** (repository pair + 4 thin use-cases, entity already exists). `schedule push` + `agenda`: **M** (`ScheduleRecord` is new, `AgendaUseCase`'s merge logic is the real design work). Contract-shape tests + cross-repo verification (§8): **S**, but not optional — this is the seam that determines whether flow-cli's already-merged dark-ready code actually lights up correctly. Total: **M**. Branch `feature/task-agenda` → PR → `dev`.

## 11. Open questions for review

- Does `ScheduleRecord` need a SQLite-backed repo on day one, or is FileSystem-only acceptable for a first cut (matching whichever of `Task`'s eventual two repos ships first)?
- Should `atlas task` also gain a `--kind`/`--program` link to research-registry's existing `metadata.tasks` model now, or stay fully separate until a real need to unify surfaces (this SPEC defaults to: stay separate, `metadata.tasks` untouched)?
- MCP surface (§4's "optional... deferred") — in or out of this PR's scope?
