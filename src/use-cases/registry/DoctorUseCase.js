/**
 * DoctorUseCase
 *
 * Audit (and optionally fix) the born-ready Project Settings Contract
 * (docs-standards ADR-001 — research-ops ecosystem ownership):
 *   - .STATUS                    (atlas registry header)            [required]
 *   - CLAUDE.md                  (project rules / Claude context)   [required: warn]
 *   - .flow/obsidian-sync.yml    (vault↔repo mirror map)            [info — obs `flow_init.py`/savant `/obs:sync` owns it]
 *
 * `.obs/sync.yml` (the pre-v4.3.1 obsidian-cli-ops schema/`obs link` command) is
 * checked only for backward compatibility with existing repos that predate the
 * migration — obs removed `obs link` and that schema in v4.3.1 (2026-07-12); do
 * not treat `.obs/sync.yml` as current or write new instructions that reference it.
 *
 * Audit is read-only. `fix()` previews by default and only writes CLAUDE.md when
 * `write` is set — it never creates `.flow/obsidian-sync.yml` (that's obs/savant's
 * to scaffold, not atlas's).
 * By default the audit excludes registry cruft (worktrees, /tmp, node_modules);
 * pass `allRegistered` to include everything.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { legacyConfigDir, xdgConfigDir, migrationMarkerPath } from '../../utils/configPath.js'
import { migrateToXdg } from '../../utils/migrateXdg.js'

export class DoctorUseCase {
  /**
   * @param {Object} deps
   * @param {IProjectRepository} deps.projectRepository
   * @param {(p:string)=>boolean} [deps.fileExists] - injectable for tests
   * @param {(p:string,c:string)=>void} [deps.writeFile] - injectable for tests
   * @param {StatusFileParser} [deps.statusFileParser] - optional; when provided,
   *   .STATUS parse warnings (non-numeric progress, duplicate keys) surface as findings
   * @param {Function} [deps.migrateToXdgFn] - injectable for tests (SPEC-xdg-config-migration §4)
   */
  constructor({
    projectRepository,
    fileExists = existsSync,
    writeFile = writeFileSync,
    statusFileParser = null,
    migrateToXdgFn = migrateToXdg
  }) {
    if (!projectRepository) throw new Error('projectRepository is required')
    this.projectRepository = projectRepository
    this.fileExists = fileExists
    this.writeFile = writeFile
    this.statusFileParser = statusFileParser
    this.migrateToXdgFn = migrateToXdgFn
  }

  /**
   * Non-project-scoped check: is atlas's own data directory still on the
   * legacy ~/.atlas path with a real XDG migration available? Informational
   * only — staying on the legacy path is a fully supported steady state.
   *
   * Skipped entirely when ATLAS_CONFIG/ATLAS_DATA_DIR is set: those
   * overrides mean the active config dir isn't derived from legacy/XDG
   * detection at all, so a leftover ~/.atlas (e.g. from before the
   * override was introduced) is irrelevant — nudging to migrate it would
   * point at data atlas isn't even using.
   * @private
   */
  _xdgMigrationAvailable() {
    if (process.env.ATLAS_CONFIG || process.env.ATLAS_DATA_DIR) return false
    const legacy = legacyConfigDir()
    const xdg = xdgConfigDir()
    return this.fileExists(legacy) && !this.fileExists(migrationMarkerPath(xdg))
  }

  /** Skip registry cruft so the audit reflects real projects. */
  _isAuditable(path) {
    if (!path) return false
    if (path.includes('/worktrees/')) return false
    if (path.includes('/node_modules/')) return false
    if (path.startsWith('/tmp/') || path.startsWith('/private/tmp/')) return false
    return true
  }

  async _rows(options = {}) {
    const { kind = null, allRegistered = false } = options
    const projects = await this.projectRepository.findAll()
    const filtered = projects
      .filter(p => allRegistered || this._isAuditable(p.path || p.id))
      .filter(p => !kind || (p.metadata?.kind || p.kind) === kind)

    // Two+ registered entries sharing a name (e.g. a stale duplicate left
    // over from a repo move/archival) can otherwise shadow each other in
    // name-only output — surface the path so it's unambiguous which entry
    // a given audit row describes.
    const nameCounts = new Map()
    for (const p of filtered) nameCounts.set(p.name, (nameCounts.get(p.name) || 0) + 1)

    return filtered.map(p => {
      const path = p.path || p.id
      const orphaned = !this.fileExists(path)
      const has = {
        status: !orphaned && this.fileExists(join(path, '.STATUS')),
        claude: !orphaned && this.fileExists(join(path, 'CLAUDE.md')),
        obsSync:
          !orphaned &&
          (this.fileExists(join(path, '.flow', 'obsidian-sync.yml')) ||
            // pre-v4.3.1 legacy path — obs removed `obs link`/this schema; kept for
            // backward compatibility with repos that haven't migrated yet
            this.fileExists(join(path, '.obs', 'sync.yml')))
      }
      const missingRequired = []
      if (!has.status) missingRequired.push('.STATUS')
      if (!has.claude) missingRequired.push('CLAUDE.md')
      return {
        name: p.name,
        path,
        kind: p.metadata?.kind || p.kind || null,
        has,
        missingRequired,
        orphaned,
        duplicateName: nameCounts.get(p.name) > 1,
        ok: !orphaned && missingRequired.length === 0
      }
    })
  }

  /**
   * Attach `.STATUS` parse warnings (non-numeric progress, duplicate keys) to
   * each row that has a `.STATUS` file. Requires `statusFileParser` to have
   * been injected; no-op otherwise (keeps `execute()` backward compatible).
   * @private
   */
  async _attachParseWarnings(rows) {
    if (!this.statusFileParser) return rows
    for (const row of rows) {
      if (!row.has.status) continue
      const parsed = await this.statusFileParser.parse(join(row.path, '.STATUS'))
      row.parseWarnings = parsed?._parseWarnings || []
    }
    return rows
  }

  async execute(options = {}) {
    const rows = await this._attachParseWarnings(await this._rows(options))
    const summary = {
      total: rows.length,
      ok: rows.filter(r => r.ok).length,
      missingStatus: rows.filter(r => !r.has.status).length,
      missingClaude: rows.filter(r => !r.has.claude).length,
      missingObsSync: rows.filter(r => !r.has.obsSync).length,
      orphaned: rows.filter(r => r.orphaned).length,
      parseWarnings: rows.reduce((n, r) => n + (r.parseWarnings?.length || 0), 0)
    }
    // Informational only (SPEC-xdg-config-migration §4) — staying on the
    // legacy path is a fully supported steady state, not a gap to fix.
    const xdgHint = this._xdgMigrationAvailable()
      ? `atlas found a newer, tidier home for your data (${xdgConfigDir()}). Run 'atlas migrate --xdg' whenever you'd like — no rush.`
      : null
    return { summary, rows, xdgHint }
  }

  /**
   * Create missing CLAUDE.md (preview unless options.write). Never creates
   * .flow/obsidian-sync.yml — that's obs/savant's to scaffold (ADR-001).
   *
   * Also previews/applies the XDG data-directory migration (SPEC
   * -xdg-config-migration §4), following the same two-tier pattern:
   * `--fix` alone previews, `--fix --write` calls the guarded
   * `migrateToXdg({ apply: true })` path — same process-lock guard as a
   * manual `atlas migrate --xdg --apply`. If that guard trips, the
   * migration is skipped for this run (reported, not forced) — --write
   * never bypasses a safety check just because it was passed.
   *
   * Per-action objects carry a `type` discriminator ('claude-md' |
   * 'xdg-migration') since the XDG action isn't project-scoped and can't
   * share the {project, file} shape the per-project actions use.
   *
   * @returns {Promise<{actions: Array, wrote: boolean}>}
   */
  async fix(options = {}) {
    const write = options.write === true
    const rows = await this._rows(options)
    const actions = []
    for (const r of rows) {
      if (r.orphaned) continue
      if (!r.has.claude) {
        const path = join(r.path, 'CLAUDE.md')
        if (write) this.writeFile(path, this._claudeStub(r))
        actions.push({ type: 'claude-md', project: r.name, file: 'CLAUDE.md', path, written: write })
      }
    }

    if (this._xdgMigrationAvailable()) {
      const to = xdgConfigDir()
      const from = legacyConfigDir()
      if (!write) {
        actions.push({ type: 'xdg-migration', from, to, written: false })
      } else {
        const result = await this.migrateToXdgFn({ apply: true, atlasVersion: options.atlasVersion })
        actions.push({
          type: 'xdg-migration',
          from,
          to,
          written: !!result.success,
          skipped: !result.success,
          detail: result.message
        })
      }
    }

    return { actions, wrote: write }
  }

  _claudeStub(r) {
    return [
      `# ${r.name} — Claude context`,
      '',
      '**Purpose:** <one line — what this project is>',
      '',
      '## Conventions',
      '- Branch workflow: `main` ← `feature/*` (PR only). See `~/.claude/CLAUDE.md`.',
      '- Settings contract (`atlas doctor`): `.STATUS` + `CLAUDE.md` + `.flow/obsidian-sync.yml`. See docs-standards ADR-001.',
      ''
    ].join('\n')
  }
}

export default DoctorUseCase
