/**
 * Research-registry additions (RFC-000 / SPEC-atlas):
 * SyncFromStatusUseCase carries kind/target/tasks into project.metadata
 * (proposals = task entries on the program Project) and reports kind/task
 * changes. Package sync behavior unchanged.
 */
import { describe, test, expect } from '@jest/globals'
import { SyncFromStatusUseCase } from '../../../../src/use-cases/registry/SyncFromStatusUseCase.js'

describe('SyncFromStatusUseCase — kind/tasks → metadata', () => {
  const uc = new SyncFromStatusUseCase({ projectRepository: {}, statusFileParser: {} })

  const parsed = {
    format: 'yaml',
    name: 'pmed-modern',
    status: 'active',
    progress: 75,
    priority: 1,
    type: 'research',
    kind: 'program',
    target: 'Epidemiology / JASA',
    next: 'advance 05 data-fusion',
    tasks: [
      { text: '01 incremental', priority: 'P1', done: false },
      { text: '02 Sobol', priority: 'P2', done: false }
    ]
  }

  test('_createProjectFromStatus carries kind/target/tasks into metadata', () => {
    const p = uc._createProjectFromStatus('/Users/dt/projects/research/pmed-modern', parsed)
    expect(p.metadata.kind).toBe('program')
    expect(p.metadata.target).toBe('Epidemiology / JASA')
    expect(p.metadata.tasks).toHaveLength(2)
    expect(p.metadata.status).toBe('active')
  })

  test('package-style parsed (no kind/tasks) → metadata.kind null, tasks []', () => {
    const pkg = {
      format: 'yaml', name: 'medfit', status: 'active', progress: 90,
      priority: 0, type: 'r-package', next: 'submit', kind: null, target: null, tasks: []
    }
    const p = uc._createProjectFromStatus('/x/medfit', pkg)
    expect(p.metadata.kind).toBeNull()
    expect(p.metadata.tasks).toEqual([])
  })

  test('_hasChanges + _getChanges report kind and task-count changes', () => {
    const existing = {
      id: '/x/p', name: 'p', path: '/x/p', type: undefined,
      totalSessions: 0, totalDuration: 0, lastAccessedAt: new Date(), description: '',
      metadata: { status: 'active', progress: 75, priority: 1, phase: null, kind: null, tasks: [] }
    }
    const updated = uc._updateProjectFromStatus(existing, parsed)
    expect(uc._hasChanges(existing, updated)).toBe(true)
    const changes = uc._getChanges(existing, updated)
    expect(changes.some(c => c.startsWith('kind:'))).toBe(true)
    expect(changes.some(c => c.startsWith('tasks:'))).toBe(true)
  })
})
