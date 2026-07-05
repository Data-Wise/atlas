import { describe, test, expect } from '@jest/globals'
import { Atlas } from '../../../src/index.js'

function seededProjects() {
  return [
    { id: 'uuid-collider-123', name: 'collider', path: '/x/collider' },
    { id: 'uuid-pmed-456', name: 'pmed-modern', path: '/x/pmed-modern' },
    { id: 'uuid-duplicate-1', name: 'duplicate-pkg', path: '/x/dup1' },
    { id: 'uuid-duplicate-2', name: 'duplicate-pkg', path: '/y/dup2' }
  ]
}

function makeProjectsApi(mockProjectRepo) {
  const atlas = new Atlas({ configPath: '/tmp/atlas-unregister-test', storage: 'filesystem' })
  atlas.projects.container = {
    resolve: (name) => {
      if (name === 'ProjectRepository') return mockProjectRepo
      throw new Error(`unexpected container.resolve('${name}')`)
    }
  }
  return atlas.projects
}

describe('ProjectsAPI.unregister()', () => {
  test('unregisters project by exact name match', async () => {
    const deletedIds = []
    const mockRepo = {
      findAll: async () => seededProjects(),
      delete: async (id) => {
        deletedIds.push(id)
        return true
      }
    }

    const projectsApi = makeProjectsApi(mockRepo)
    const result = await projectsApi.unregister('pmed-modern')

    expect(result.success).toBe(true)
    expect(result.message).toBe('Unregistered: pmed-modern')
    expect(deletedIds).toEqual(['uuid-pmed-456'])
  })

  test('unregisters project case-insensitively by name', async () => {
    const deletedIds = []
    const mockRepo = {
      findAll: async () => seededProjects(),
      delete: async (id) => {
        deletedIds.push(id)
        return true
      }
    }

    const projectsApi = makeProjectsApi(mockRepo)
    const result = await projectsApi.unregister('Collider')

    expect(result.success).toBe(true)
    expect(result.message).toBe('Unregistered: Collider')
    expect(deletedIds).toEqual(['uuid-collider-123'])
  })

  test('falls back to direct UUID/id delete when no name match is found', async () => {
    const deletedIds = []
    const mockRepo = {
      findAll: async () => seededProjects(),
      delete: async (id) => {
        deletedIds.push(id)
        return id === 'some-direct-uuid'
      }
    }

    const projectsApi = makeProjectsApi(mockRepo)
    const result = await projectsApi.unregister('some-direct-uuid')

    expect(result.success).toBe(true)
    expect(deletedIds).toEqual(['some-direct-uuid'])
  })

  test('throws a descriptive error when multiple projects match by name (duplicate collision)', async () => {
    const mockRepo = {
      findAll: async () => seededProjects(),
      delete: async () => true
    }

    const projectsApi = makeProjectsApi(mockRepo)
    
    await expect(projectsApi.unregister('duplicate-pkg')).rejects.toThrow(
      /Ambiguous project name "duplicate-pkg"\. Multiple matches found:\n\s+- duplicate-pkg \(\/x\/dup1\) \[ID: uuid-duplicate-1\]\n\s+- duplicate-pkg \(\/y\/dup2\) \[ID: uuid-duplicate-2\]\n\nPlease specify by ID instead\./
    )
  })
})
