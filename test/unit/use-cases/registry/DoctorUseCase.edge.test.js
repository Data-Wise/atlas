/**
 * DoctorUseCase — edge cases for the settings-contract audit (v0.11).
 * Complements DoctorUseCase.test.js. fileExists/writeFile are injected so the
 * audit is deterministic. The exit-1-on-missing-.STATUS behavior lives in
 * bin/atlas.js (an e2e concern); here we only assert the use-case result shape
 * (summary.missingStatus, row.ok, fix actions).
 */
import { describe, test, expect } from '@jest/globals'
import { DoctorUseCase } from '../../../../src/use-cases/registry/DoctorUseCase.js'

const repoOf = (projects) => ({ findAll: async () => projects })

describe('DoctorUseCase — audit edge cases', () => {
  test('--kind with no matches yields an empty audit, not an error', async () => {
    const projects = [
      { name: 'prog', path: '/p/prog', metadata: { kind: 'program' } },
      { name: 'pkg', path: '/p/pkg', metadata: { kind: 'package' } }
    ]
    const uc = new DoctorUseCase({ projectRepository: repoOf(projects), fileExists: () => true })
    const { summary, rows } = await uc.execute({ kind: 'manuscript' })
    expect(rows).toHaveLength(0)
    expect(summary.total).toBe(0)
    expect(summary.ok).toBe(0)
    expect(summary.missingStatus).toBe(0)
  })

  test('empty registry produces a zeroed summary', async () => {
    const uc = new DoctorUseCase({ projectRepository: repoOf([]), fileExists: () => false })
    const { summary, rows } = await uc.execute()
    expect(rows).toHaveLength(0)
    expect(summary).toEqual({ total: 0, ok: 0, missingStatus: 0, missingClaude: 0, missingObsSync: 0 })
  })

  test('a project missing BOTH .STATUS and CLAUDE.md is not ok and counts in both gaps', async () => {
    const projects = [{ name: 'bare', path: '/p/bare' }]
    const uc = new DoctorUseCase({ projectRepository: repoOf(projects), fileExists: () => false })
    const { summary, rows } = await uc.execute()
    expect(rows[0].ok).toBe(false)
    expect(rows[0].missingRequired).toEqual(expect.arrayContaining(['.STATUS', 'CLAUDE.md']))
    expect(summary.missingStatus).toBe(1)
    expect(summary.missingClaude).toBe(1)
  })
})

describe('DoctorUseCase — fix edge cases', () => {
  test('fix is a no-op when every project already has CLAUDE.md', async () => {
    const projects = [
      { name: 'a', path: '/p/a' },
      { name: 'b', path: '/p/b' }
    ]
    const present = new Set(['/p/a/CLAUDE.md', '/p/a/.STATUS', '/p/b/CLAUDE.md', '/p/b/.STATUS'])
    const writes = []
    const uc = new DoctorUseCase({
      projectRepository: repoOf(projects),
      fileExists: (p) => present.has(p),
      writeFile: (p) => writes.push(p)
    })
    const { actions, wrote } = await uc.fix({ write: true })
    expect(actions).toHaveLength(0)
    expect(writes).toHaveLength(0)
    expect(wrote).toBe(true) // wrote reflects the flag, even with no actions
  })

  test('fix only ever creates CLAUDE.md — a missing .STATUS is left for the user', async () => {
    const projects = [{ name: 'bare', path: '/p/bare' }]
    const writes = []
    const uc = new DoctorUseCase({
      projectRepository: repoOf(projects),
      fileExists: () => false, // both .STATUS and CLAUDE.md missing
      writeFile: (p, c) => writes.push([p, c])
    })
    const { actions } = await uc.fix({ write: true })
    expect(actions.map(a => a.file)).toEqual(['CLAUDE.md'])
    expect(writes).toHaveLength(1)
    expect(writes[0][0]).toBe('/p/bare/CLAUDE.md')
  })
})
