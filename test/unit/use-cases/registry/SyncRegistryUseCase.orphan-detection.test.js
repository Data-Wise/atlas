/**
 * SyncRegistryUseCase — orphan detection uses real filesystem existence
 * (atlas#90). Previously "orphaned" meant "not discovered by this scan",
 * so a narrow --paths scope would wrongly orphan every unrelated
 * registered project. Orphan status must be independent of scan scope.
 */

import { describe, test, expect } from '@jest/globals'
import { SyncRegistryUseCase } from '../../../../src/use-cases/registry/SyncRegistryUseCase.js'

class MockProjectRepository {
  constructor(projects) {
    this.projects = new Map((projects || []).map(p => [p.id, p]))
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
  async read() {
    return null
  }
}

class MockFsProjectRepository {
  async scan() {
    return []
  }
}

function registered(id, path) {
  return {
    id,
    path,
    name: id,
    type: { value: 'general' },
    description: null,
    metadata: {},
    totalSessions: 0,
    totalDuration: 0
  }
}

function useCaseFor(repo, fileExists) {
  return new SyncRegistryUseCase({
    projectRepository: repo,
    statusFileGateway: new MockStatusFileGateway(),
    fileSystemProjectRepository: new MockFsProjectRepository(),
    fileExists
  })
}

describe('SyncRegistryUseCase — orphan detection (atlas#90)', () => {
  test('a registered path that no longer exists on disk is orphaned and removed', async () => {
    const repo = new MockProjectRepository([registered('dead', '/gone/craft')])
    const fileExists = (p) => p !== '/gone/craft'

    const result = await useCaseFor(repo, fileExists).execute({
      rootPaths: ['/x'],
      removeOrphans: true
    })

    expect(result.orphaned.map(p => p.id)).toEqual(['dead'])
    expect(await repo.findById('dead')).toBeNull()
  })

  test('a narrow scan scope does NOT orphan real projects outside it', async () => {
    // Two real, on-disk projects registered; this run only scans one of them.
    const repo = new MockProjectRepository([
      registered('a', '/real/a'),
      registered('b', '/real/b')
    ])
    const fileExists = () => true // both paths exist on disk

    const result = await useCaseFor(repo, fileExists).execute({
      rootPaths: ['/real/a'], // narrow --paths scope; 'b' is never discovered this run
      removeOrphans: true
    })

    expect(result.orphaned).toEqual([])
    expect(await repo.findById('a')).not.toBeNull()
    expect(await repo.findById('b')).not.toBeNull()
  })

  test('dryRun reports orphans without deleting', async () => {
    const repo = new MockProjectRepository([registered('dead', '/gone/craft')])
    const fileExists = () => false

    const result = await useCaseFor(repo, fileExists).execute({
      rootPaths: ['/x'],
      removeOrphans: true,
      dryRun: true
    })

    expect(result.orphaned.map(p => p.id)).toEqual(['dead'])
    expect(await repo.findById('dead')).not.toBeNull()
  })
})
