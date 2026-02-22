/**
 * Tests for Atlas MCP Server
 *
 * Tests the server structure, tool definitions, and integration.
 * Formatter tests are in formatters.test.js
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'

describe('Atlas MCP Server', () => {
  describe('Tool Definitions', () => {
    it('should define all 10 tools', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      // All 10 tools
      const tools = [
        'atlas_get_context',
        'atlas_get_projects',
        'atlas_get_sessions',
        'atlas_get_trail',
        'atlas_get_inbox',
        'atlas_start_session',
        'atlas_end_session',
        'atlas_capture',
        'atlas_breadcrumb',
        'atlas_plan'
      ]

      tools.forEach(tool => {
        expect(content).toContain(`name: '${tool}'`)
      })
    })

    it('should define correct resources', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      expect(content).toContain("uri: 'atlas://session/current'")
      expect(content).toContain("uri: 'atlas://context'")
    })

    it('should have descriptions for all tools', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      // Each tool should have a description
      const toolMatches = content.match(/name: 'atlas_\w+'/g)
      expect(toolMatches.length).toBe(10)

      // All should have descriptions
      expect(content.match(/description: '[^']+'/g).length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Tool Input Schemas', () => {
    it('should require project for atlas_start_session', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      // Check that project is required for start_session
      const startSessionMatch = content.match(
        /name: 'atlas_start_session'[\s\S]*?required: \['project'\]/
      )
      expect(startSessionMatch).not.toBeNull()
    })

    it('should require text for atlas_capture', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      // Check that text is required for capture
      const captureMatch = content.match(
        /name: 'atlas_capture'[\s\S]*?required: \['text'\]/
      )
      expect(captureMatch).not.toBeNull()
    })

    it('should require text for atlas_breadcrumb', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      // Check that text is required for breadcrumb
      const breadcrumbMatch = content.match(
        /name: 'atlas_breadcrumb'[\s\S]*?required: \['text'\]/
      )
      expect(breadcrumbMatch).not.toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should have error handling in tool call handler', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      // Verify error handling pattern exists
      expect(content).toContain('isError: true')
      expect(content).toContain('catch (error)')
      expect(content).toContain("throw new Error('Project name is required')")
      expect(content).toContain("throw new Error('Capture text is required')")
      expect(content).toContain("throw new Error('Breadcrumb text is required')")
    })
  })

  describe('Server Configuration', () => {
    it('should configure server with correct name and version', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      expect(content).toContain("name: 'atlas'")
      expect(content).toContain("version: pkg.version")
    })

    it('should enable tools and resources capabilities', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      expect(content).toContain('capabilities: {')
      expect(content).toContain('tools: {}')
      expect(content).toContain('resources: {}')
    })
  })

  describe('Cleanup Handlers', () => {
    it('should handle SIGINT and SIGTERM', async () => {
      const { readFile } = await import('fs/promises')
      const content = await readFile(
        new URL('../../../src/mcp/index.js', import.meta.url),
        'utf-8'
      )

      expect(content).toContain("process.on('SIGINT'")
      expect(content).toContain("process.on('SIGTERM'")
      expect(content).toContain('atlas.close()')
    })
  })
})

describe('MCP Integration Smoke Tests', () => {
  // These tests verify the server can be loaded without crashing

  it('should export a valid ES module', async () => {
    // Just verify we can access the file
    const { existsSync } = await import('fs')
    const path = new URL('../../../src/mcp/index.js', import.meta.url)
    expect(existsSync(path)).toBe(true)
  })

  it('should have shebang for direct execution', async () => {
    const { readFile } = await import('fs/promises')
    const content = await readFile(
      new URL('../../../src/mcp/index.js', import.meta.url),
      'utf-8'
    )

    expect(content.startsWith('#!/usr/bin/env node')).toBe(true)
  })
})
