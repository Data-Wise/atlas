/**
 * SyncRegistryUseCase — research metadata preservation
 *
 * Regression test for the plain-sync footgun: the packages-only plain sync
 * (SyncRegistryUseCase) must NOT strip the kind/target/tasks/priorityLabel that
 * `sync --from-status` (SyncFromStatusUseCase) populated. Before the fix, any
 * plain `atlas sync` / `sync --remove-orphans` silently nulled them on update.
 */

import { describe, test, expect } from '@jest/globals'
import { SyncRegistryUseCase } from '../../../../src/use-cases/registry/SyncRegistryUseCase.js'

class MockProjectRepository {
  constructor() {
    this.projects = new Map()
  }
  async findById(id) {
    return this.projects.get(id) || null
  }
  async findAll() {
    return [...this.projects.values()]
  }
  async save(project) {
    this.projects.set(project.id, project)
    return project
  }
  async delete(id) {
    this.projects.delete(id)
  }
}

class MockStatusFileGateway {
  constructor(map) {
    this.map = map || {} // path -> statusData
  }
  async read(path) {
    return this.map[path] || null
  }
}

class MockFsProjectRepository {
  constructor(projects) {
    this.projects = projects || []
  }
  async scan() {
    return this.projects
  }
}

// A freshly-scanned project, as the plain StatusFileGateway path produces it:
// no research metadata (kind/target/tasks/priorityLabel), because plain sync
// does not parse those keys.
function scannedProject(id, path) {
  return {
    id,
    path,
    type: { value: 'general' },
    description: null,
    metadata: {},
    totalSessions: 0,
    totalDuration: 0
  }
}

describe('SyncRegistryUseCase — research metadata preservation', () => {
  test('plain-sync update preserves kind/target/tasks/priorityLabel from the existing record', async () => {
    const repo = new MockProjectRepository()
    // Existing record carries research metadata set earlier by `sync --from-status`.
    repo.projects.set('p1', {
      id: 'p1',
      path: '/x/p1',
      type: { value: 'general' },
      description: 'old description',
      totalSessions: 5,
      totalDuration: 100,
      metadata: {
        status: 'active',
        progress: 50,
        nextAction: 'old next',
        kind: 'manuscript',
        target: 'JASA',
        tasks: [{ text: 'aim 1', priority: 'P0', done: false }],
        priorityLabel: 'P0'
      }
    })
    // A status change (progress 50 -> 80) forces an update + re-save.
    const gateway = new MockStatusFileGateway({
      '/x/p1': { status: 'active', progress: 80, next: [{ action: 'new next' }] }
    })
    const fs = new MockFsProjectRepository([scannedProject('p1', '/x/p1')])
    const useCase = new SyncRegistryUseCase({
      projectRepository: repo,
      statusFileGateway: gateway,
      fileSystemProjectRepository: fs
    })

    const result = await useCase.execute({ rootPaths: ['/x'], removeOrphans: false })

    expect(result.updated.length).toBe(1) // it DID update (progress changed)
    const saved = await repo.findById('p1')
    expect(saved.metadata.progress).toBe(80) // update applied
    // research metadata preserved, NOT stripped:
    expect(saved.metadata.kind).toBe('manuscript')
    expect(saved.metadata.target).toBe('JASA')
    expect(saved.metadata.tasks).toEqual([{ text: 'aim 1', priority: 'P0', done: false }])
    expect(saved.metadata.priorityLabel).toBe('P0')
    // session statistics also preserved
    expect(saved.totalSessions).toBe(5)
  })

  test('does not invent research metadata for a brand-new project', async () => {
    const repo = new MockProjectRepository()
    const gateway = new MockStatusFileGateway({
      '/x/p2': { status: 'active', progress: 10, next: [{ action: 'start' }] }
    })
    const fs = new MockFsProjectRepository([scannedProject('p2', '/x/p2')])
    const useCase = new SyncRegistryUseCase({
      projectRepository: repo,
      statusFileGateway: gateway,
      fileSystemProjectRepository: fs
    })

    const result = await useCase.execute({ rootPaths: ['/x'], removeOrphans: false })

    expect(result.discovered.length).toBe(1)
    const saved = await repo.findById('p2')
    expect(saved.metadata.kind).toBeUndefined()
    expect(saved.metadata.target).toBeUndefined()
  })
})

describe('SyncRegistryUseCase — research-not-refreshed warning (FW-27)', () => {
  function existingResearch(id, path, name, kind) {
    return {
      id,
      path,
      name,
      type: { value: 'general' },
      description: `${name} desc`,
      totalSessions: 0,
      totalDuration: 0,
      metadata: { status: 'active', kind }
    }
  }

  test('plain sync warns about research projects it preserved but did not refresh', async () => {
    const repo = new MockProjectRepository()
    repo.projects.set('m1', existingResearch('m1', '/x/m1', 'manuscript-one', 'manuscript'))
    repo.projects.set('pr1', existingResearch('pr1', '/x/pr1', 'program-one', 'program'))
    repo.projects.set('pkg', { id: 'pkg', path: '/x/pkg', name: 'pkg-one', type: { value: 'general' }, metadata: { status: 'active' } })
    const gateway = new MockStatusFileGateway({}) // no .STATUS changes
    const fs = new MockFsProjectRepository([
      scannedProject('m1', '/x/m1'),
      scannedProject('pr1', '/x/pr1'),
      scannedProject('pkg', '/x/pkg')
    ])
    const useCase = new SyncRegistryUseCase({
      projectRepository: repo,
      statusFileGateway: gateway,
      fileSystemProjectRepository: fs
    })

    const result = await useCase.execute({ rootPaths: ['/x'], removeOrphans: false })

    expect(result.warnings).toHaveLength(1)
    const w = result.warnings[0]
    expect(w.type).toBe('research-not-refreshed')
    expect(w.projects).toEqual(expect.arrayContaining(['manuscript-one', 'program-one']))
    expect(w.projects).not.toContain('pkg-one')
    expect(w.remedy).toBe('atlas sync --from-status')
  })

  test('no warning when no research projects are present', async () => {
    const repo = new MockProjectRepository()
    repo.projects.set('pkg', { id: 'pkg', path: '/x/pkg', name: 'pkg-one', type: { value: 'general' }, metadata: { status: 'active' } })
    const gateway = new MockStatusFileGateway({})
    const fs = new MockFsProjectRepository([scannedProject('pkg', '/x/pkg')])
    const useCase = new SyncRegistryUseCase({
      projectRepository: repo,
      statusFileGateway: gateway,
      fileSystemProjectRepository: fs
    })

    const result = await useCase.execute({ rootPaths: ['/x'], removeOrphans: false })

    expect(result.warnings).toHaveLength(0)
  })
})
