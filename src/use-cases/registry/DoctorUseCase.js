/**
 * DoctorUseCase
 *
 * Audit (and optionally fix) the born-ready Project Settings Contract
 * (docs-standards ADR-001 — research-ops ecosystem ownership):
 *   - .STATUS    (atlas registry header)            [required]
 *   - CLAUDE.md  (project rules / Claude context)   [required: warn]
 *   - .obs/sync.yml | .flow/obsidian-sync.yml       [info — `obs link` owns it]
 *
 * Audit is read-only. `fix()` previews by default and only writes CLAUDE.md when
 * `write` is set — it never creates `.obs/sync.yml` (that schema belongs to `obs link`).
 * By default the audit excludes registry cruft (worktrees, /tmp, node_modules);
 * pass `allRegistered` to include everything.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export class DoctorUseCase {
  /**
   * @param {Object} deps
   * @param {IProjectRepository} deps.projectRepository
   * @param {(p:string)=>boolean} [deps.fileExists] - injectable for tests
   * @param {(p:string,c:string)=>void} [deps.writeFile] - injectable for tests
   */
  constructor({ projectRepository, fileExists = existsSync, writeFile = writeFileSync }) {
    if (!projectRepository) throw new Error('projectRepository is required')
    this.projectRepository = projectRepository
    this.fileExists = fileExists
    this.writeFile = writeFile
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
    return projects
      .filter(p => allRegistered || this._isAuditable(p.path || p.id))
      .filter(p => !kind || (p.metadata?.kind || p.kind) === kind)
      .map(p => {
        const path = p.path || p.id
        const has = {
          status: this.fileExists(join(path, '.STATUS')),
          claude: this.fileExists(join(path, 'CLAUDE.md')),
          obsSync:
            this.fileExists(join(path, '.obs', 'sync.yml')) ||
            this.fileExists(join(path, '.flow', 'obsidian-sync.yml'))
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
          ok: missingRequired.length === 0
        }
      })
  }

  async execute(options = {}) {
    const rows = await this._rows(options)
    const summary = {
      total: rows.length,
      ok: rows.filter(r => r.ok).length,
      missingStatus: rows.filter(r => !r.has.status).length,
      missingClaude: rows.filter(r => !r.has.claude).length,
      missingObsSync: rows.filter(r => !r.has.obsSync).length
    }
    return { summary, rows }
  }

  /**
   * Create missing CLAUDE.md (preview unless options.write). Never creates
   * .obs/sync.yml — that belongs to `obs link` (ADR-001).
   * @returns {Promise<{actions: Array, wrote: boolean}>}
   */
  async fix(options = {}) {
    const write = options.write === true
    const rows = await this._rows(options)
    const actions = []
    for (const r of rows) {
      if (!r.has.claude) {
        const path = join(r.path, 'CLAUDE.md')
        if (write) this.writeFile(path, this._claudeStub(r))
        actions.push({ project: r.name, file: 'CLAUDE.md', path, written: write })
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
      '- Settings contract (`atlas doctor`): `.STATUS` + `CLAUDE.md` + `.obs/sync.yml`. See docs-standards ADR-001.',
      ''
    ].join('\n')
  }
}

export default DoctorUseCase
