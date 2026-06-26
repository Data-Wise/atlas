/**
 * SyncRegistryUseCase — research-safe plain-sync edge cases (v0.11–v0.12)
 *
 * Complements SyncRegistryUseCase.preserve-research-meta.test.js with the
 * boundary conditions of _preserveResearchMetadata and the FW-30 id/path
 * convergence. Behavior is pinned to the quoted source:
 *   _preserveResearchMetadata copies a key only when updated[key] === undefined
 *   AND existing[key] !== undefined (so a stored `null` IS carried forward).
 *   FW-30 converges only on a findByPath hit; otherwise the project is new.
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
  async findByPath(path) {
    for (const p of this.projects.values()) {
      if (p.path === path) return p
    }
    return null
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
    this.map = map || {}
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

function useCaseFor(repo, gateway, fs) {
  return new SyncRegistryUseCase({
    projectRepository: repo,
    statusFileGateway: gateway,
    fileSystemProjectRepository: fs
  })
}

describe('SyncRegistryUseCase — _preserveResearchMetadata boundaries', () => {
  test('partial metadata: only the defined fields are carried, others stay undefined', async () => {
    const repo = new MockProjectRepository()
    // Existing record has `kind` but no target/tasks/priorityLabel.
    repo.projects.set('p1', {
      id: 'p1',
      path: '/x/p1',
      name: 'p1',
      type: { value: 'general' },
      description: 'old',
      totalSessions: 0,
      totalDuration: 0,
      metadata: { status: 'active', progress: 50, kind: 'manuscript' }
    })
    const gateway = new MockStatusFileGateway({
      '/x/p1': { status: 'active', progress: 80, next: [{ action: 'go' }] }
    })
    const fs = new MockFsProjectRepository([scannedProject('p1', '/x/p1')])

    const result = await useCaseFor(repo, gateway, fs).execute({ rootPaths: ['/x'], removeOrphans: false })

    expect(result.updated.length).toBe(1)
    const saved = await repo.findById('p1')
    expect(saved.metadata.kind).toBe('manuscript')
    expect(saved.metadata.target).toBeUndefined()
    expect(saved.metadata.tasks).toBeUndefined()
    expect(saved.metadata.priorityLabel).toBeUndefined()
  })

  test('a stored null is preserved (null !== undefined), not dropped', async () => {
    const repo = new MockProjectRepository()
    repo.projects.set('p2', {
      id: 'p2',
      path: '/x/p2',
      name: 'p2',
      type: { value: 'general' },
      description: 'old',
      totalSessions: 0,
      totalDuration: 0,
      metadata: { status: 'active', progress: 10, kind: 'program', target: null, tasks: null }
    })
    const gateway = new MockStatusFileGateway({
      '/x/p2': { status: 'active', progress: 40, next: [{ action: 'go' }] }
    })
    const fs = new MockFsProjectRepository([scannedProject('p2', '/x/p2')])

    const result = await useCaseFor(repo, gateway, fs).execute({ rootPaths: ['/x'], removeOrphans: false })

    expect(result.updated.length).toBe(1)
    const saved = await repo.findById('p2')
    expect(saved.metadata.kind).toBe('program')
    expect(saved.metadata.target).toBeNull()
    expect(saved.metadata.tasks).toBeNull()
  })
})

describe('SyncRegistryUseCase — FW-30 convergence only on a path hit', () => {
  test('no path match: the scanned project is discovered as new, the original is untouched', async () => {
    const repo = new MockProjectRepository()
    // Existing research record at one path.
    repo.projects.set('manu', {
      id: 'manu',
      path: '/x/manu',
      name: 'manu',
      type: { value: 'general' },
      description: 'manu desc',
      totalSessions: 0,
      totalDuration: 0,
      metadata: { status: 'active', kind: 'manuscript', target: 'JASA' }
    })
    // Scanner finds a DIFFERENT path (project moved/renamed) — id and path both miss.
    const gateway = new MockStatusFileGateway({
      '/x/manu-moved': { status: 'active', progress: 20, next: [{ action: 'go' }] }
    })
    const fs = new MockFsProjectRepository([scannedProject('/x/manu-moved', '/x/manu-moved')])

    const result = await useCaseFor(repo, gateway, fs).execute({ rootPaths: ['/x'], removeOrphans: false })

    // The moved project is a fresh discovery; convergence did NOT fire.
    expect(result.discovered.length).toBe(1)
    expect(repo.projects.size).toBe(2)
    // Original record is intact with its research metadata.
    const original = await repo.findById('manu')
    expect(original.metadata.kind).toBe('manuscript')
    expect(original.metadata.target).toBe('JASA')
  })
})
