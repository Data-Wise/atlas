/**
 * DoctorUseCase
 *
 * Read-only audit of the born-ready Project Settings Contract
 * (docs-standards ADR-001 — research-ops ecosystem ownership):
 *   - .STATUS    (atlas registry header)            [required]
 *   - CLAUDE.md  (project rules / Claude context)   [required: warn]
 *   - .obs/sync.yml | .flow/obsidian-sync.yml (mirror map) [info — `obs link` owns it]
 * Registration is implied (the project is in the registry).
 *
 * No writes. Returns a structured report; the CLI maps it to an exit code.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export class DoctorUseCase {
  /**
   * @param {Object} deps
   * @param {IProjectRepository} deps.projectRepository
   * @param {(p:string)=>boolean} [deps.fileExists] - injectable for tests
   */
  constructor({ projectRepository, fileExists = existsSync }) {
    if (!projectRepository) throw new Error('projectRepository is required')
    this.projectRepository = projectRepository
    this.fileExists = fileExists
  }

  /**
   * @param {Object} [options]
   * @param {string|null} [options.kind] - only audit a given kind (manuscript|program|package)
   * @returns {Promise<{summary: Object, rows: Array}>}
   */
  async execute(options = {}) {
    const { kind = null } = options
    const projects = await this.projectRepository.findAll()

    const rows = projects
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
        // Contract: .STATUS is the hard requirement; CLAUDE.md is required-but-warn;
        // .obs/sync.yml is info-only until `obs link` owns the schema.
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

    const summary = {
      total: rows.length,
      ok: rows.filter(r => r.ok).length,
      missingStatus: rows.filter(r => !r.has.status).length,
      missingClaude: rows.filter(r => !r.has.claude).length,
      missingObsSync: rows.filter(r => !r.has.obsSync).length
    }
    return { summary, rows }
  }
}

export default DoctorUseCase
