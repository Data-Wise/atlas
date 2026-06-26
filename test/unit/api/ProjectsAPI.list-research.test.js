/**
 * ProjectsAPI.list() — research fields + --kind filter (FW-16)
 *
 * Direct (not transitive) coverage of the research surface: that list() maps
 * kind/target/taskCount/progress/next/priority and that --kind narrows the set.
 * ProjectsAPI is not exported, so we drive it through the public Atlas instance
 * with an injected mock container (no filesystem, no real ~/.atlas).
 */

import { describe, test, expect } from '@jest/globals'
import { Atlas } from '../../../src/index.js'

function seededScan() {
  return {
    discovered: [
      {
        name: 'collider',
        path: '/x/collider',
        type: 'quarto',
        metadata: { status: 'active', kind: 'manuscript', target: 'AMPPS', tasks: [], progress: 95, priorityLabel: 'P0', next: 'submit to AMPPS' }
      },
      {
        name: 'pmed-modern',
        path: '/x/pmed-modern',
        type: 'research',
        metadata: { status: 'active', kind: 'program', target: 'Epidemiology', tasks: [{}, {}, {}, {}, {}], progress: 80 }
      },
      {
        name: 'medfit',
        path: '/x/medfit',
        type: 'r-package',
        metadata: { status: 'active' } // no research metadata
      }
    ],
    updated: []
  }
}

// Build a ProjectsAPI (via Atlas) with the scan + config stubbed out.
function makeProjectsApi() {
  const atlas = new Atlas({ configPath: '/tmp/atlas-fw16-test-store', storage: 'filesystem' })
  atlas.projects.config = { getScanPaths: async () => ['/x'] }
  atlas.projects.container = {
    resolve: (name) => {
      if (name === 'ScanProjectsUseCase') return { execute: async () => seededScan() }
      throw new Error(`unexpected container.resolve('${name}') in FW-16 test`)
    }
  }
  return atlas.projects
}

describe('ProjectsAPI.list() — research fields + --kind filter (FW-16)', () => {
  test('maps kind/target/taskCount/progress/next/priority for research projects', async () => {
    const all = await makeProjectsApi().list({})
    expect(all).toHaveLength(3)

    const collider = all.find(p => p.name === 'collider')
    expect(collider).toMatchObject({
      kind: 'manuscript',
      target: 'AMPPS',
      taskCount: 0,
      progress: 95,
      next: 'submit to AMPPS',
      priority: 'P0'
    })

    const pmed = all.find(p => p.name === 'pmed-modern')
    expect(pmed.kind).toBe('program')
    expect(pmed.taskCount).toBe(5)
    expect(pmed.target).toBe('Epidemiology')
  })

  test('non-research projects map kind/target to null (no crash)', async () => {
    const medfit = (await makeProjectsApi().list({})).find(p => p.name === 'medfit')
    expect(medfit.kind).toBeNull()
    expect(medfit.target).toBeNull()
    expect(medfit.taskCount).toBe(0)
  })

  test('--kind narrows by manuscript / program / package', async () => {
    expect((await makeProjectsApi().list({ kind: 'manuscript' })).map(p => p.name)).toEqual(['collider'])
    expect((await makeProjectsApi().list({ kind: 'program' })).map(p => p.name)).toEqual(['pmed-modern'])
    // none of the seeded projects declare kind 'package'
    expect(await makeProjectsApi().list({ kind: 'package' })).toHaveLength(0)
  })
})
