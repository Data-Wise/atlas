/**
 * Regression test (bug found 2026-06-23, see docs/specs/SPEC-atlas-research-registry.md):
 *
 * A single stored project whose `description` exceeded the 500-char Project limit
 * made `_deserializeProject` throw inside `findAll()`, which the load wrapper rethrew
 * as "Failed to load projects". Because findAll loads the WHOLE registry, one corrupt
 * row bricked `atlas sync` for every project. The fix truncates the description on
 * read so a corrupt row degrades gracefully instead of crashing the registry.
 */
import { FileSystemProjectRepository } from '../../../src/adapters/repositories/FileSystemProjectRepository.js'

describe('FileSystemProjectRepository._deserializeProject — description guard', () => {
  const repo = new FileSystemProjectRepository('/tmp/atlas-deserialize-test.json')

  const base = {
    id: '/x/p',
    name: 'p',
    type: 'general',
    path: '/x/p',
    tags: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    totalSessions: 0,
    totalDuration: 0
  }

  it('truncates an over-long stored description to 500 chars instead of throwing', () => {
    const data = { ...base, description: 'x'.repeat(600) }
    let project
    expect(() => {
      project = repo._deserializeProject(data)
    }).not.toThrow()
    expect(project.description.length).toBe(500)
  })

  it('preserves a normal (<=500) description unchanged', () => {
    const data = { ...base, description: 'short description' }
    const project = repo._deserializeProject(data)
    expect(project.description).toBe('short description')
  })

  it('tolerates a missing/non-string description', () => {
    const data = { ...base }
    delete data.description
    expect(() => repo._deserializeProject(data)).not.toThrow()
  })
})
