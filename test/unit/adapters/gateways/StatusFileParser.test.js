/**
 * StatusFileParser Tests
 *
 * Tests for the .STATUS file scanner and parser.
 */

import { jest, beforeEach, afterEach, describe, test, expect } from '@jest/globals'
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
  })
})
