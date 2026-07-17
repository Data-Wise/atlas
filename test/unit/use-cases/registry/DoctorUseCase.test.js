/**
 * DoctorUseCase — read-only settings-contract audit + preview/write fix (ADR-001).
 * fileExists/writeFile are injected so the audit is deterministic without touching disk.
 */
import { describe, test, expect } from '@jest/globals'
import { DoctorUseCase } from '../../../../src/use-cases/registry/DoctorUseCase.js'

const repoOf = (projects) => ({ findAll: async () => projects })

describe('DoctorUseCase — audit', () => {
  test('flags missing .STATUS and CLAUDE.md; counts gaps', async () => {
    const projects = [
      { name: 'good', path: '/p/good', metadata: { kind: 'program' } },
      { name: 'no-status', path: '/p/no-status' },
      { name: 'no-claude', path: '/p/no-claude' }
    ]
    const present = new Set([
      '/p/good', '/p/no-status', '/p/no-claude',
      '/p/good/.STATUS', '/p/good/CLAUDE.md', '/p/good/.flow/obsidian-sync.yml',
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

  test('recognizes legacy .obs/sync.yml (pre-v4.3.1 obs schema) as satisfying the contract for backward compatibility', async () => {
    const projects = [{ name: 'legacy', path: '/p/legacy' }]
    const present = new Set(['/p/legacy', '/p/legacy/.STATUS', '/p/legacy/CLAUDE.md', '/p/legacy/.obs/sync.yml'])
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

  test('excludes worktrees/tmp by default; --all-registered includes them', async () => {
    const projects = [
      { name: 'real', path: '/Users/x/projects/real' },
      { name: 'wt', path: '/Users/x/projects/r-packages/worktrees/wt' },
      { name: 'tmp', path: '/tmp/focus-test/projects/t' }
    ]
    const uc = new DoctorUseCase({ projectRepository: repoOf(projects), fileExists: () => false })
    const def = await uc.execute()
    expect(def.summary.total).toBe(1)
    expect(def.rows[0].name).toBe('real')
    const all = await uc.execute({ allRegistered: true })
    expect(all.summary.total).toBe(3)
  })
})

describe('DoctorUseCase — fix', () => {
  const projects = [
    { name: 'has-claude', path: '/p/has' },
    { name: 'no-claude', path: '/p/no' }
  ]
  const present = new Set(['/p/has', '/p/no', '/p/has/CLAUDE.md', '/p/has/.STATUS', '/p/no/.STATUS'])

  test('preview lists CLAUDE.md to create, writes nothing', async () => {
    const writes = []
    const uc = new DoctorUseCase({
      projectRepository: repoOf(projects),
      fileExists: (p) => present.has(p),
      writeFile: (p) => writes.push(p)
    })
    const { actions, wrote } = await uc.fix()
    expect(wrote).toBe(false)
    expect(writes).toHaveLength(0)
    expect(actions.map(a => a.project)).toEqual(['no-claude'])
    expect(actions[0].written).toBe(false)
  })

  test('--write creates the missing CLAUDE.md', async () => {
    const writes = []
    const uc = new DoctorUseCase({
      projectRepository: repoOf(projects),
      fileExists: (p) => present.has(p),
      writeFile: (p, c) => writes.push([p, c])
    })
    const { actions, wrote } = await uc.fix({ write: true })
    expect(wrote).toBe(true)
    expect(writes).toHaveLength(1)
    expect(writes[0][0]).toBe('/p/no/CLAUDE.md')
    expect(writes[0][1]).toContain('# no-claude — Claude context')
    expect(writes[0][1]).toContain('.flow/obsidian-sync.yml')
    expect(writes[0][1]).not.toContain('.obs/sync.yml')
    expect(actions[0].written).toBe(true)
  })
})
