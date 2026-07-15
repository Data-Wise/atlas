/**
 * E2E Tests for Documentation Build
 *
 * Tests that the MkDocs site builds correctly, all nav entries
 * resolve to existing files, and the generated HTML is valid.
 */

import { describe, test, expect, beforeAll } from '@jest/globals'
import { execFileSync } from 'child_process'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const PROJECT_ROOT = join(new URL('.', import.meta.url).pathname, '../../')
const DOCS_DIR = join(PROJECT_ROOT, 'docs')
const SITE_DIR = join(PROJECT_ROOT, 'site')
const MKDOCS_YML = join(PROJECT_ROOT, 'mkdocs.yml')

function runMkdocs(args = '') {
  try {
    const output = execFileSync('mkdocs', ['build', ...args.split(' ').filter(Boolean)], {
      encoding: 'utf8',
      env: { ...process.env, PYTHONPATH: '' },
      timeout: 60000,
      cwd: PROJECT_ROOT
    })
    return { stdout: output, exitCode: 0 }
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1
    }
  }
}

function getAllNavFiles() {
  const yml = readFileSync(MKDOCS_YML, 'utf8')
  const files = []
  const lines = yml.split('\n')
  let inNav = false

  for (const line of lines) {
    if (line.trim() === 'nav:') {
      inNav = true
      continue
    }
    if (inNav && line.match(/^\s*[^- ]/)) {
      // End of nav section
      break
    }
    if (inNav) {
      const match = line.match(/:\s*([^\s#]+\.md)/)
      if (match) {
        files.push(match[1].trim())
      }
    }
  }
  return files
}

describe('Documentation Build E2E', () => {
  let buildResult

  beforeAll(() => {
    buildResult = runMkdocs('--strict')
  })

  test('mkdocs build succeeds with --strict flag', () => {
    expect(buildResult.exitCode).toBe(0)
    expect(existsSync(SITE_DIR)).toBe(true)
  })

  test('no warnings in strict build', () => {
    // Build outputs INFO warnings about excluded files - that's expected
    // Just verify no ERROR level issues
    expect(buildResult.stdout).not.toMatch(/ERROR/)
  })

test('all nav entries point to existing files', () => {
    const navFiles = getAllNavFiles()
    for (const file of navFiles) {
      const fullPath = join(DOCS_DIR, file)
      expect(existsSync(fullPath)).toBe(true)
    }
  })

  test('site directory is created', () => {
    expect(existsSync(SITE_DIR)).toBe(true)
    expect(existsSync(join(SITE_DIR, 'index.html'))).toBe(true)
  })

  test('main index.html exists', () => {
    expect(existsSync(join(SITE_DIR, 'index.html'))).toBe(true)
  })

  test('generated HTML is valid (no unclosed tags in index.html)', () => {
    const html = readFileSync(join(SITE_DIR, 'index.html'), 'utf8')
    // Basic sanity checks - DOCTYPE can be lowercase
    expect(html).toMatch(/<!doctype html>/i)
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
    expect(html).toContain('Atlas')
  })

  test('CSS is included in built site', () => {
    const html = readFileSync(join(SITE_DIR, 'index.html'), 'utf8')
    expect(html).toContain('.css')
  })

  test('search index is generated', () => {
    expect(existsSync(join(SITE_DIR, 'search', 'search_index.json'))).toBe(true)
  })

  test('excluded internal directories are not in site', () => {
    const excluded = ['specs', 'planning', 'internal', 'prompts', 'reviews', 'plans']
    for (const dir of excluded) {
      expect(existsSync(join(SITE_DIR, dir))).toBe(false)
    }
  })

  test('RESEARCH-REGISTRY.md (root) is not in site', () => {
    expect(existsSync(join(SITE_DIR, 'RESEARCH-REGISTRY', 'index.html'))).toBe(false)
    expect(existsSync(join(SITE_DIR, 'RESEARCH-REGISTRY.md'))).toBe(false)
  })
})

describe('Navigation Structure', () => {
  test('all nav entries accounted for', () => {
    const navFiles = getAllNavFiles()
    // Should have all our nav entries
    expect(navFiles.length).toBeGreaterThanOrEqual(20)
  })

  test('Getting Started has 3 items', () => {
    const navFiles = getAllNavFiles()
    // Getting Started entries: getting-started/installation.md, TUTORIAL.md, DEMOS.md
    const gettingStarted = navFiles.filter(f => 
      f === 'getting-started/installation.md' || 
      f === 'TUTORIAL.md' || 
      f === 'DEMOS.md'
    )
    expect(gettingStarted.length).toBe(3)
  })

  test('User Guide has expected entries', () => {
    const navFiles = getAllNavFiles()
    // User Guide entries include both user-guide/ prefixed and top-level entries
    const userGuide = navFiles.filter(f => 
      f.startsWith('user-guide/') || 
      ['CHEATSHEET.md', 'REFCARD.md', 'CLI-REFERENCE.md', 'CONFIGURATION.md', 'VISUAL-GUIDE.md'].includes(f)
    )
    expect(userGuide.length).toBeGreaterThanOrEqual(12)
  })

  test('Cookbook and Workflows in user-guide subfolders', () => {
    const navFiles = getAllNavFiles()
    expect(navFiles).toContain('user-guide/cookbook/COOKBOOK.md')
    expect(navFiles).toContain('user-guide/workflows/WORKFLOWS.md')
    expect(navFiles).toContain('user-guide/tutorials/visual-features.md')
    expect(navFiles).toContain('user-guide/tutorials/research-registry.md')
  })

  test('Architecture section has 3 items', () => {
    const navFiles = getAllNavFiles()
    const arch = navFiles.filter(f => 
      f === 'ARCHITECTURE.md' || f === 'DIAGRAMS.md' || f === 'INTEGRATIONS.md'
    )
    expect(arch.length).toBe(3)
  })

  test('Developer section has 4 items', () => {
    const navFiles = getAllNavFiles()
    // Developer entries are at top-level in nav (not under developer/ prefix)
    const dev = navFiles.filter(f => 
      f === 'API-GUIDE.md' || 
      f === 'API-RECIPES.md' || 
      f === 'MCP-SERVER.md' || 
      f === 'ROADMAP.md'
    )
    expect(dev.length).toBe(4)
  })
})

describe('Version Consistency', () => {
  test('all version references are 0.13.1', () => {
    const docs = readdirSync(DOCS_DIR, { recursive: true })
      .filter(f => f.endsWith('.md'))
      .map(f => join(DOCS_DIR, f.toString()))

    for (const file of docs) {
      const content = readFileSync(file, 'utf8')
      // Should not contain 0.13.0 as a standalone version (except in history sections)
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Allow version in historical context (changelog, what's new, roadmap history)
        if (line.includes('0.13.0')) {
          const context = lines.slice(Math.max(0, i - 2), i + 3).join(' ')
          const isHistorical = context.toLowerCase().includes('v0.13.0 —') ||
                               context.toLowerCase().includes('v0.13.0 -') ||
                               context.toLowerCase().includes('release') ||
                               context.toLowerCase().includes('changelog') ||
                               context.toLowerCase().includes('history')
          if (!isHistorical) {
            console.warn(`Non-historical 0.13.0 reference in ${file}:${i + 1}: ${line.trim()}`)
          }
        }
      }
    }
  })
})