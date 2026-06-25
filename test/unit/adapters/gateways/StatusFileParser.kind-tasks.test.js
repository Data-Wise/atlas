/**
 * Research-registry additions (RFC-000 / SPEC-atlas):
 * StatusFileParser now parses `kind`, `target`/`venue`, and a `tasks:` block
 * (proposals) from .STATUS, and summarize() groups byKind.
 * All additive — package .STATUS output is unchanged.
 */
import { describe, test, expect } from '@jest/globals'
import { StatusFileParser } from '../../../../src/adapters/gateways/StatusFileParser.js'

describe('StatusFileParser — kind/target/tasks (research-registry)', () => {
  const parser = new StatusFileParser()

  const programStatus = [
    'status: active',
    'priority: P1',
    'progress: 75',
    'type: research',
    'kind: program',
    'target: Epidemiology / JASA',
    'next: advance 05 data-fusion',
    'tasks:',
    '  - text: "01 incremental - promote code"; priority: P1; done: false',
    '  - text: "02 Sobol - run grid"; priority: P2; done: false',
    '  - text: "05 data-fusion - copula kill-test"; priority: P2; done: true',
    '',
    '# prose separator below',
    '## Notes',
    '- not a task line'
  ].join('\n')

  test('parses kind, target, and a tasks block (YAML-style)', () => {
    const d = parser._parseYAMLFormat(programStatus, 'pmed-modern')
    expect(d.kind).toBe('program')
    expect(d.target).toBe('Epidemiology / JASA')
    expect(d.tasks).toHaveLength(3)
    expect(d.tasks[0]).toEqual({ text: '01 incremental - promote code', priority: 'P1', done: false })
    expect(d.tasks[2].done).toBe(true)
    // existing fields still parse
    expect(d.status).toBe('active')
    expect(d.progress).toBe(75)
  })

  test('package-style .STATUS has no kind and no tasks (additive, no regression)', () => {
    const pkg = ['status: active', 'priority: P0', 'progress: 90', 'type: r-package', 'next: submit to CRAN'].join('\n')
    const d = parser._parseYAMLFormat(pkg, 'medfit')
    expect(d.kind).toBeNull()
    expect(d.target).toBeNull()
    expect(d.tasks).toEqual([])
    expect(d.status).toBe('active')
    expect(d.progress).toBe(90)
  })

  test('summarize() groups byKind', () => {
    const scan = [
      { path: '/a', parsed: parser._parseYAMLFormat('status: active\nkind: program', 'a') },
      { path: '/b', parsed: parser._parseYAMLFormat('status: draft\nkind: manuscript', 'b') },
      { path: '/c', parsed: parser._parseYAMLFormat('status: active\ntype: r-package', 'c') }
    ]
    const summary = parser.summarize(scan)
    expect(summary.byKind.program).toHaveLength(1)
    expect(summary.byKind.manuscript).toHaveLength(1)
    expect(summary.byKind.unspecified).toHaveLength(1)
  })

  test('markdown-format .STATUS also parses kind/target', () => {
    const md = ['## Status: active', '## Kind: manuscript', '## Target: AMPPS'].join('\n')
    const d = parser._parseMarkdownFormat(md, 'collider')
    expect(d.kind).toBe('manuscript')
    expect(d.target).toBe('AMPPS')
  })
})
