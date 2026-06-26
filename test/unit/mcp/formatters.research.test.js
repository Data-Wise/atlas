/**
 * Research-registry surface (RFC-000 / SPEC-atlas Phase 2):
 * formatProjects renders kind / venue (target) / task count when present,
 * reading either top-level fields or metadata, and stays unchanged for
 * plain packages.
 */
import { describe, it, expect } from '@jest/globals'
import { formatProjects } from '../../../src/mcp/formatters.js'

describe('formatProjects — research kind/target/tasks', () => {
  it('renders kind, venue, and task count for a research program (top-level)', () => {
    const out = formatProjects([
      {
        name: 'pmed-modern', type: 'research', status: 'active',
        kind: 'program', target: 'Epidemiology / JASA', taskCount: 5, path: '/x/pmed-modern'
      }
    ])
    expect(out).toContain('Kind: program')
    expect(out).toContain('Venue: Epidemiology / JASA')
    expect(out).toContain('Tasks: 5')
  })

  it('reads kind/target/tasks from metadata when not top-level', () => {
    const out = formatProjects([
      {
        name: 'collider', type: 'quarto', status: 'active',
        metadata: { kind: 'manuscript', target: 'AMPPS', tasks: [{}, {}] }, path: '/x/collider'
      }
    ])
    expect(out).toContain('Kind: manuscript')
    expect(out).toContain('Venue: AMPPS')
    expect(out).toContain('Tasks: 2')
  })

  it('omits kind/venue/tasks lines for a plain package (no regression)', () => {
    const out = formatProjects([
      { name: 'medfit', type: 'r-package', status: 'active', path: '/x/medfit' }
    ])
    expect(out).toContain('medfit')
    expect(out).not.toContain('Kind:')
    expect(out).not.toContain('Venue:')
    expect(out).not.toContain('Tasks:')
  })

  it('renders progress and next when present (FW-4)', () => {
    const out = formatProjects([
      { name: 'pmed-modern', type: 'research', status: 'active', kind: 'program', progress: 92, next: 'advance 05' }
    ])
    expect(out).toContain('Progress: 92%')
    expect(out).toContain('Next: advance 05')
  })
})
