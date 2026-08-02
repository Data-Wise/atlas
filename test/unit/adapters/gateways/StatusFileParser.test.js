/**
 * StatusFileParser Tests
 *
 * Tests for the .STATUS file scanner and parser.
 */

import { beforeEach, afterEach, describe, test, expect } from '@jest/globals'
import { StatusFileParser } from '../../../../src/adapters/gateways/StatusFileParser.js'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('StatusFileParser', () => {
  let parser
  let testDir

  beforeEach(async () => {
    parser = new StatusFileParser()
    testDir = join(tmpdir(), `atlas-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  describe('parse() - Markdown format', () => {
    test('parses markdown-style .STATUS file', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `## Project: test-project
## Type: node-package
## Status: active
## Progress: 75
## Priority: 1
## Phase: v1.0.0 Development
## Focus: Implement feature X
`)

      const result = await parser.parse(statusPath)

      expect(result.format).toBe('markdown')
      expect(result.name).toBe('test-project')
      expect(result.type).toBe('node-package')
      expect(result.status).toBe('active')
      expect(result.progress).toBe(75)
      expect(result.priority).toBe(1)
      expect(result.phase).toBe('v1.0.0 Development')
      expect(result.focus).toBe('Implement feature X')
    })

    test('handles missing fields gracefully', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `## Project: minimal
## Status: draft
`)

      const result = await parser.parse(statusPath)

      expect(result.name).toBe('minimal')
      expect(result.status).toBe('draft')
      expect(result.progress).toBe(0)
      expect(result.priority).toBe(3)
      expect(result.type).toBe('generic')
    })

    test('uses directory name if project name not specified', async () => {
      const subDir = join(testDir, 'my-project')
      await mkdir(subDir)
      const statusPath = join(subDir, '.STATUS')
      await writeFile(statusPath, `## Status: active
`)

      const result = await parser.parse(statusPath)

      expect(result.name).toBe('my-project')
    })
  })

  describe('parse() - YAML format', () => {
    test('parses YAML-style .STATUS file', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `status: active
priority: 1
progress: 50
next: Complete API implementation
type: dev
`)

      const result = await parser.parse(statusPath)

      expect(result.format).toBe('yaml')
      expect(result.status).toBe('active')
      expect(result.priority).toBe(1)
      expect(result.progress).toBe(50)
      expect(result.next).toBe('Complete API implementation')
      expect(result.type).toBe('dev')
    })

    test('handles quoted values', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `status: "active"
next: "Fix bug #123"
focus: 'Important task'
`)

      const result = await parser.parse(statusPath)

      expect(result.status).toBe('active')
      expect(result.next).toBe('Fix bug #123')
      expect(result.focus).toBe('Important task')
    })

    test('uses checkpoint as focus if focus not set', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `status: active
checkpoint: Strategic refocus complete
`)

      const result = await parser.parse(statusPath)

      expect(result.focus).toBe('Strategic refocus complete')
    })
  })

  describe('parse() - Frontmatter format', () => {
    test('parses YAML frontmatter .STATUS file', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `---
schema: atlas/v1
name: test-project
status: active
progress: 75
priority: 1
type: node-package
next: Implement feature X
---

# test-project
`)

      const result = await parser.parse(statusPath)

      expect(result.format).toBe('frontmatter')
      expect(result.name).toBe('test-project')
      expect(result.status).toBe('active')
      expect(result.progress).toBe(75)
      expect(result.priority).toBe(1)
      expect(result.next).toEqual(['Implement feature X'])
    })

    test('coerces non-numeric priority to default 3', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `---
schema: atlas/v1
name: test-project
status: active
priority: P1
---

# test-project
`)

      const result = await parser.parse(statusPath)

      expect(result.format).toBe('frontmatter')
      expect(result.priority).toBe(3)
    })
  })

  describe('parse() - Markdown edge cases', () => {
    test('parses version and updated fields', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `## Project: versioned
## Status: released
## Version: 2.1.0
`)

      const result = await parser.parse(statusPath)

      expect(result.version).toBe('2.1.0')
    })

    test('handles empty file', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, '')

      const result = await parser.parse(statusPath)

      expect(result.status).toBe('unknown')
      expect(result.progress).toBe(0)
    })

    test('parses next field in markdown format', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `## Status: active
next: Add more tests
`)

      const result = await parser.parse(statusPath)

      expect(result.next).toBe('Add more tests')
    })

    test('handles whitespace in values', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `## Project:   spaced-name
## Status:  active
## Progress:   50
`)

      const result = await parser.parse(statusPath)

      expect(result.name).toBe('spaced-name')
      expect(result.status).toBe('active')
      expect(result.progress).toBe(50)
    })

    test('handles case-insensitive keys', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `## PROJECT: upper-case
## STATUS: Active
## PROGRESS: 75
`)

      const result = await parser.parse(statusPath)

      expect(result.name).toBe('upper-case')
      expect(result.status).toBe('active')
      expect(result.progress).toBe(75)
    })
  })

  describe('parse() - YAML edge cases', () => {
    test('parses name as alternative to project', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `name: named-project
status: active
`)

      const result = await parser.parse(statusPath)

      expect(result.name).toBe('named-project')
    })

    test('handles comments in YAML', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `# This is a comment
status: active
# Another comment
progress: 50
`)

      const result = await parser.parse(statusPath)

      expect(result.status).toBe('active')
      expect(result.progress).toBe(50)
    })

    test('handles updated field', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `status: active
updated: 2025-12-30
`)

      const result = await parser.parse(statusPath)

      expect(result.updated).toBe('2025-12-30')
    })

    test('handles invalid progress values gracefully', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `status: active
progress: not-a-number
`)

      const result = await parser.parse(statusPath)

      expect(result.progress).toBe(0)
    })

    test('handles invalid priority values gracefully', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, `status: active
priority: invalid
`)

      const result = await parser.parse(statusPath)

      expect(result.priority).toBe(3)
    })
  })

  describe('parse() - Error handling', () => {
    test('returns null for non-existent file', async () => {
      const result = await parser.parse('/nonexistent/path/.STATUS')
      expect(result).toBeNull()
    })
  })

  describe('scanDirectory()', () => {
    test('finds .STATUS files in directory tree', async () => {
      // Create nested structure
      const proj1 = join(testDir, 'project1')
      const proj2 = join(testDir, 'project2')
      const nested = join(testDir, 'dir', 'nested-project')

      await mkdir(proj1, { recursive: true })
      await mkdir(proj2, { recursive: true })
      await mkdir(nested, { recursive: true })

      await writeFile(join(proj1, '.STATUS'), '## Status: active\n## Progress: 50')
      await writeFile(join(proj2, '.STATUS'), 'status: paused\nprogress: 25')
      await writeFile(join(nested, '.STATUS'), '## Status: draft')

      const results = await parser.scanDirectory(testDir)

      expect(results).toHaveLength(3)
      expect(results.map(r => r.parsed.status).sort()).toEqual(['active', 'draft', 'paused'])
    })

    test('respects maxDepth option', async () => {
      const deep = join(testDir, 'a', 'b', 'c', 'd', 'deep-project')
      await mkdir(deep, { recursive: true })
      await writeFile(join(deep, '.STATUS'), '## Status: active')

      // Default maxDepth is 3, so depth 4 shouldn't be found
      const results = await parser.scanDirectory(testDir)

      expect(results).toHaveLength(0)

      // With higher maxDepth it should be found
      const deepResults = await parser.scanDirectory(testDir, { maxDepth: 5 })

      expect(deepResults).toHaveLength(1)
    })

    test('excludes specified directories', async () => {
      const nodeModules = join(testDir, 'node_modules', 'some-pkg')
      const git = join(testDir, '.git', 'hooks')
      const valid = join(testDir, 'valid-project')

      await mkdir(nodeModules, { recursive: true })
      await mkdir(git, { recursive: true })
      await mkdir(valid, { recursive: true })

      await writeFile(join(nodeModules, '.STATUS'), '## Status: active')
      await writeFile(join(git, '.STATUS'), '## Status: active')
      await writeFile(join(valid, '.STATUS'), '## Status: active')

      const results = await parser.scanDirectory(testDir)

      expect(results).toHaveLength(1)
      expect(results[0].parsed.name).toBe('valid-project')
    })

    test('includes path information in results', async () => {
      const project = join(testDir, 'my-project')
      await mkdir(project)
      await writeFile(join(project, '.STATUS'), '## Status: active')

      const results = await parser.scanDirectory(testDir)

      expect(results[0].path).toBe(project)
      expect(results[0].file).toBe(join(project, '.STATUS'))
      expect(results[0].parsed).toBeDefined()
    })

    test('uses custom exclude list', async () => {
      const keep = join(testDir, 'node_modules', 'keep-this')
      const exclude = join(testDir, 'custom_exclude')

      await mkdir(keep, { recursive: true })
      await mkdir(exclude, { recursive: true })

      await writeFile(join(keep, '.STATUS'), '## Status: active')
      await writeFile(join(exclude, '.STATUS'), '## Status: active')

      // Custom exclude list that doesn't include node_modules
      const results = await parser.scanDirectory(testDir, {
        exclude: ['custom_exclude']
      })

      expect(results).toHaveLength(1)
      expect(results[0].path).toContain('node_modules')
    })

    test('handles empty directory', async () => {
      const results = await parser.scanDirectory(testDir)

      expect(results).toHaveLength(0)
    })

    test('skips hidden directories by default', async () => {
      const hidden = join(testDir, '.hidden-dir')
      await mkdir(hidden, { recursive: true })
      await writeFile(join(hidden, '.STATUS'), '## Status: active')

      const results = await parser.scanDirectory(testDir)

      expect(results).toHaveLength(0)
    })

    test('handles .STATUS file at root directory', async () => {
      await writeFile(join(testDir, '.STATUS'), '## Status: active')

      const results = await parser.scanDirectory(testDir)

      // Root .STATUS IS found - the scanner finds .STATUS at any level
      expect(results).toHaveLength(1)
      expect(results[0].parsed.status).toBe('active')
    })
  })

  describe('summarize()', () => {
    test('groups projects by status', async () => {
      const scanResults = [
        { path: '/a', parsed: { status: 'active', progress: 50, priority: 1 } },
        { path: '/b', parsed: { status: 'active', progress: 75, priority: 2 } },
        { path: '/c', parsed: { status: 'paused', progress: 25, priority: 3 } },
        { path: '/d', parsed: { status: 'archived', progress: 100, priority: 3 } }
      ]

      const summary = parser.summarize(scanResults)

      expect(summary.total).toBe(4)
      expect(summary.byStatus.active).toHaveLength(2)
      expect(summary.byStatus.paused).toHaveLength(1)
      expect(summary.byStatus.archived).toHaveLength(1)
    })

    test('groups projects by priority', async () => {
      const scanResults = [
        { path: '/a', parsed: { status: 'active', progress: 50, priority: 1 } },
        { path: '/b', parsed: { status: 'active', progress: 75, priority: 1 } },
        { path: '/c', parsed: { status: 'paused', progress: 25, priority: 2 } },
        { path: '/d', parsed: { status: 'archived', progress: 100, priority: 3 } }
      ]

      const summary = parser.summarize(scanResults)

      expect(summary.byPriority[1]).toHaveLength(2)
      expect(summary.byPriority[2]).toHaveLength(1)
      expect(summary.byPriority[3]).toHaveLength(1)
    })

    test('groups projects by progress', async () => {
      const scanResults = [
        { path: '/a', parsed: { status: 'active', progress: 100, priority: 1 } },
        { path: '/b', parsed: { status: 'active', progress: 75, priority: 2 } },
        { path: '/c', parsed: { status: 'paused', progress: 0, priority: 3 } }
      ]

      const summary = parser.summarize(scanResults)

      expect(summary.byProgress.complete).toHaveLength(1)
      expect(summary.byProgress.inProgress).toHaveLength(1)
      expect(summary.byProgress.notStarted).toHaveLength(1)
    })

    test('handles empty scan results', async () => {
      const summary = parser.summarize([])

      expect(summary.total).toBe(0)
      expect(summary.byStatus).toEqual({})
      expect(summary.byPriority).toEqual({ 1: [], 2: [], 3: [] })
      expect(summary.byProgress.complete).toEqual([])
    })

    test('clamps priority values to valid range', async () => {
      const scanResults = [
        { path: '/a', parsed: { status: 'active', progress: 50, priority: -5 } },  // -5 → clamped to 1
        { path: '/b', parsed: { status: 'active', progress: 50, priority: 5 } },   // 5 → clamped to 3
        { path: '/c', parsed: { status: 'active', progress: 50, priority: 10 } }   // 10 → clamped to 3
      ]

      const summary = parser.summarize(scanResults)

      // -5 clamps to 1, 5 and 10 clamp to 3
      expect(summary.byPriority[1]).toHaveLength(1)
      expect(summary.byPriority[3]).toHaveLength(2)
    })

    test('treats priority 0 as missing (defaults to 3)', async () => {
      // Note: priority=0 is treated as falsy/missing by the || operator
      const scanResults = [
        { path: '/a', parsed: { status: 'active', progress: 50, priority: 0 } }
      ]

      const summary = parser.summarize(scanResults)

      // 0 is treated as "no priority specified" → defaults to 3
      expect(summary.byPriority[3]).toHaveLength(1)
    })

    test('buckets non-numeric priority under 3 without throwing', async () => {
      const scanResults = [
        { path: '/a', parsed: { status: 'active', progress: 50, priority: 'P1' } }
      ]

      const summary = parser.summarize(scanResults)

      expect(summary.total).toBe(1)
      expect(summary.byPriority[3]).toHaveLength(1)
      expect(summary.byPriority[3][0].path).toBe('/a')
    })

    test('handles missing priority values', async () => {
      const scanResults = [
        { path: '/a', parsed: { status: 'active', progress: 50 } } // no priority
      ]

      const summary = parser.summarize(scanResults)

      expect(summary.byPriority[3]).toHaveLength(1)
    })

    test('handles missing progress values', async () => {
      const scanResults = [
        { path: '/a', parsed: { status: 'active' } } // no progress
      ]

      const summary = parser.summarize(scanResults)

      expect(summary.byProgress.notStarted).toHaveLength(1)
    })

    test('includes path in grouped results', async () => {
      const scanResults = [
        { path: '/projects/atlas', parsed: { name: 'atlas', status: 'active', progress: 50, priority: 1 } }
      ]

      const summary = parser.summarize(scanResults)

      expect(summary.byStatus.active[0].path).toBe('/projects/atlas')
      expect(summary.byStatus.active[0].name).toBe('atlas')
    })

    test('categorizes edge progress values correctly', async () => {
      const scanResults = [
        { path: '/a', parsed: { status: 'active', progress: 99, priority: 1 } },
        { path: '/b', parsed: { status: 'active', progress: 100, priority: 1 } },
        { path: '/c', parsed: { status: 'active', progress: 101, priority: 1 } } // edge case
      ]

      const summary = parser.summarize(scanResults)

      expect(summary.byProgress.inProgress).toHaveLength(1) // 99%
      expect(summary.byProgress.complete).toHaveLength(2)   // 100% and 101%
    })
  })

  describe('progress-field parse hardening', () => {
    test('markdown: numeric progress parses cleanly, no warnings', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, '## Status: active\n## Progress: 45\n')
      const result = await parser.parse(statusPath)
      expect(result.progress).toBe(45)
      expect(result._parseWarnings).toEqual([])
    })

    test('markdown: prose progress parses as 0 with a warning', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, '## Status: in-development\n## Progress: manuscript submission prep ON HOLD\n')
      const result = await parser.parse(statusPath)
      expect(result.progress).toBe(0)
      expect(result._parseWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('non-numeric value')])
      )
    })

    test('markdown: "Phase 3 of 5" does not silently become progress 3', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, '## Status: active\n## Progress: Phase 3 of 5, ~60%\n')
      const result = await parser.parse(statusPath)
      expect(result.progress).toBe(0)
      expect(result._parseWarnings.length).toBeGreaterThan(0)
    })

    test('yaml: a leading number with a trailing parenthetical note preserves the value (no regression from parseInt)', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, 'status: developing\nprogress: 75  (§1–§6 complete & verified, only §7 remains)\n')
      const result = await parser.parse(statusPath)
      expect(result.progress).toBe(75)
      expect(result._parseWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('trailing text after the number')])
      )
    })

    test('yaml: numeric and %-suffixed progress both parse cleanly', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, 'status: active\nprogress: 95%\ntype: research\n')
      const result = await parser.parse(statusPath)
      expect(result.progress).toBe(95)
      expect(result._parseWarnings).toEqual([])
    })

    test('yaml: prose progress parses as 0 with a warning', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, 'status: active\nprogress: manuscript submission prep ON HOLD\ntype: research\n')
      const result = await parser.parse(statusPath)
      expect(result.progress).toBe(0)
      expect(result._parseWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('non-numeric value')])
      )
    })
  })

  describe('duplicate-key detection', () => {
    test('markdown: duplicate key warns but keeps last-occurrence value (unchanged behavior)', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, '## Status: active\n## Progress: 45\n## Progress: 90\n')
      const result = await parser.parse(statusPath)
      expect(result.progress).toBe(90)
      expect(result._parseWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('duplicate key "progress"')])
      )
    })

    test('yaml: stale duplicate block (real "preserved original content" shape) warns per duplicated key', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, [
        'status: active',
        'progress: 45',
        'target: Biostatistics',
        '',
        '# preserved original content below',
        'status: Planning',
        'progress: 5',
        'target: TBD'
      ].join('\n'))
      const result = await parser.parse(statusPath)
      expect(result.status).toBe('planning')
      expect(result.progress).toBe(5)
      expect(result.target).toBe('TBD')
      const messages = result._parseWarnings.join(' | ')
      expect(messages).toContain('duplicate key "status"')
      expect(messages).toContain('duplicate key "progress"')
      expect(messages).toContain('duplicate key "target"')
    })

    test('yaml: commented-out duplicate keys do not trigger warnings', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, [
        'status: active',
        'progress: 45',
        '# status: Planning        (stale duplicate — do not parse)',
        '# progress: 5             (stale duplicate — do not parse)'
      ].join('\n'))
      const result = await parser.parse(statusPath)
      expect(result.status).toBe('active')
      expect(result.progress).toBe(45)
      expect(result._parseWarnings).toEqual([])
    })

    test('no duplicates: single occurrence of each key produces zero warnings', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, 'status: active\nprogress: 45\ntarget: Biostatistics\n')
      const result = await parser.parse(statusPath)
      expect(result._parseWarnings).toEqual([])
    })

    test('yaml: nested keys inside a backlog block do not warn or overwrite top-level fields', async () => {
      // Real-world shape: rforge/.STATUS keeps a `backlog:` sequence of
      // mappings where every item legitimately has its own `priority:`.
      // The flat line scanner must treat column-0 keys as the project
      // fields and ignore nested keys entirely (13 false duplicate-key
      // warnings + priorityLabel pollution before this fix).
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, [
        'project: demo',
        'status: active',
        'priority: high',
        'progress: 80',
        '',
        'backlog:',
        '  - title: "v2.3.0 — hardening"',
        '    priority: merged-to-dev',
        '    notes: "MERGED to dev. Unreleased."',
        '  - title: "v2.4.0 — discovery"',
        '    priority: SHIPPED',
        '    notes: "SHIPPED."',
        '  - title: "Path B v1.4.0"',
        '    priority: parked',
        '    notes: "Descoped pending demand."'
      ].join('\n'))
      const result = await parser.parse(statusPath)
      expect(result.status).toBe('active')
      expect(result.priority).toBe(3) // 'high' label → numeric default, not the last backlog item
      expect(result.priorityLabel).toBe('high')
      expect(result.progress).toBe(80)
      expect(result._parseWarnings).toEqual([])
    })

    test('yaml: indented duplicate of a top-level key is ignored (not last-occurrence-wins)', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, [
        'status: active',
        'progress: 45',
        'notes:',
        '  status: Planning',
        '  progress: 5'
      ].join('\n'))
      const result = await parser.parse(statusPath)
      expect(result.status).toBe('active')
      expect(result.progress).toBe(45)
      expect(result._parseWarnings).toEqual([])
    })

    test('yaml: tasks block items still parse after the nested-key guard', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, [
        'status: active',
        'tasks:',
        '  - text: "define estimand"; priority: P1; done: false',
        '  - text: "run simulation"; priority: P2; done: true',
        'next: ship it'
      ].join('\n'))
      const result = await parser.parse(statusPath)
      expect(result.tasks).toHaveLength(2)
      expect(result.tasks[0]).toMatchObject({ text: 'define estimand', priority: 'P1', done: false })
      expect(result.next).toBe('ship it')
      expect(result._parseWarnings).toEqual([])
    })
  })

  describe('cran_state (package kind)', () => {
    test('yaml: cran_state is parsed and lowercased', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, 'status: active\nprogress: 100\nkind: package\ncran_state: HOLD\n')
      const result = await parser.parse(statusPath)
      expect(result.cranState).toBe('hold')
    })

    test('markdown: cran_state is parsed and lowercased', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, '## Status: active\n## Progress: 100\n## Kind: package\n## Cran_state: Planned\n')
      const result = await parser.parse(statusPath)
      expect(result.cranState).toBe('planned')
    })

    test('absent cran_state defaults to null (not "unspecified" or empty string)', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, 'status: active\nprogress: 50\n')
      const result = await parser.parse(statusPath)
      expect(result.cranState).toBeNull()
    })

    test('yaml: duplicate cran_state warns and last occurrence wins', async () => {
      const statusPath = join(testDir, '.STATUS')
      await writeFile(statusPath, 'cran_state: dev\ncran_state: submitted\n')
      const result = await parser.parse(statusPath)
      expect(result.cranState).toBe('submitted')
      expect(result._parseWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('duplicate key "cran_state"')])
      )
    })
  })
})
