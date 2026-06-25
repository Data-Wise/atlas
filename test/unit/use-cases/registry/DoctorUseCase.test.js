/**
 * DoctorUseCase — read-only settings-contract audit (docs-standards ADR-001).
 * fileExists is injected so the audit is deterministic without touching disk.
 */
import { describe, test, expect } from '@jest/globals'
import { DoctorUseCase } from '../../../../src/use-cases/registry/DoctorUseCase.js'

const repoOf = (projects) => ({ findAll: async () => projects })

describe('DoctorUseCase — settings contract audit', () => {
  test('flags missing .STATUS and CLAUDE.md; counts gaps', async () => {
    const projects = [
      { name: 'good', path: '/p/good', metadata: { kind: 'program' } },
      { name: 'no-status', path: '/p/no-status' },
      { name: 'no-claude', path: '/p/no-claude' }
    ]
    const present = new Set([
      '/p/good/.STATUS', '/p/good/CLAUDE.md', '/p/good/.obs/sync.yml',
      '/p/no-status/CLAUDE.md',
      '/p/no-claude/.STATUS'
    ])
    const uc = new DoctorUseCase({ projectRepository: repoOf(projects), fileExists: (p) => present.has(p) })
    const { summary, rows } = await uc.execute()

    expect(summary.total).toBe(3)
    expect(summary.ok).toBe(1)
    expect(summary.missingStatus).toBe(1)
    expect(summary.missingClaude).toBe(1)

    expect(rows.find(r => r.name === 'good').ok).toBe(true)
    expect(rows.find(r => r.name === 'no-status').missingRequired).toContain('.STATUS')
    expect(rows.find(r => r.name === 'no-claude').missingRequired).toContain('CLAUDE.md')
  })

  test('recognizes legacy .flow/obsidian-sync.yml as the mirror map', async () => {
    const projects = [{ name: 'legacy', path: '/p/legacy' }]
    const present = new Set(['/p/legacy/.STATUS', '/p/legacy/CLAUDE.md', '/p/legacy/.flow/obsidian-sync.yml'])
    const uc = new DoctorUseCase({ projectRepository: repoOf(projects), fileExists: (p) => present.has(p) })
    const { rows } = await uc.execute()
    expect(rows[0].has.obsSync).toBe(true)
    expect(rows[0].ok).toBe(true)
  })

  test('--kind filter narrows the audit', async () => {
    const projects = [
      { name: 'prog', path: '/p/prog', metadata: { kind: 'program' } },
      { name: 'pkg', path: '/p/pkg', metadata: { kind: 'package' } }
    ]
    const uc = new DoctorUseCase({ projectRepository: repoOf(projects), fileExists: () => true })
    const { rows } = await uc.execute({ kind: 'program' })
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('prog')
  })
})
