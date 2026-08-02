/**
 * E2E — atlas sync --from-status (frontmatter + priority normalization)
 *
 * Scope: exercises the CLI end-to-end for `atlas sync --from-status`,
 * including the regression where a frontmatter-format .STATUS file with a
 * non-numeric `priority` (e.g. `P1`) crashed `summarize()` with
 * "Cannot read properties of undefined (reading 'push')".
 *
 * Uses execFileSync (never execSync) and an isolated HOME + ATLAS_CONFIG so
 * the real ~/.atlas is never touched. Each test cleans up its temp dirs in
 * a finally block.
 */
import { describe, test, expect } from '@jest/globals'
import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_PATH = join(__dirname, '../../bin/atlas.js')

function runCLI(args, env) {
  try {
    const stdout = execFileSync('node', [CLI_PATH, ...args], {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test', ...env },
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status,
    }
  }
}

function makeEnv() {
  const home = mkdtempSync(join(tmpdir(), 'atlas-e2e-fs-'))
  return { home, env: { HOME: home, ATLAS_CONFIG: join(home, '.atlas') } }
}

function makeScanRoot(projects) {
  const scanRoot = mkdtempSync(join(tmpdir(), 'atlas-e2e-fsscan-'))
  for (const proj of projects) {
    const dir = join(scanRoot, proj.name)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '.STATUS'), proj.content)
  }
  return scanRoot
}

const FRONTMATTER_STATUS = (name) => `---
schema: atlas/v1
name: ${name}
status: active
progress: 40
priority: P1
---

# ${name}
`

const MARKDOWN_STATUS = (name) => `## Project: ${name}
## Type: node-package
## Status: active
## Priority: 2
## Progress: 30
`

describe('E2E — sync --from-status (frontmatter priority normalization)', () => {
  test('frontmatter .STATUS with non-numeric priority P1 syncs without crashing', async () => {
    const { home, env } = makeEnv()
    const scanRoot = makeScanRoot([{ name: 'proj-p1', content: FRONTMATTER_STATUS('proj-p1') }])
    try {
      const { stdout, exitCode } = runCLI(['sync', '--from-status', '--paths', scanRoot], env)
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Found 1 projects')
      expect(stdout).toContain('proj-p1')
      expect(stdout).not.toContain('undefined')
      expect(stdout).not.toContain('NaN')
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(scanRoot, { recursive: true, force: true })
    }
  })

  test('mixed frontmatter + markdown formats sync together', async () => {
    const { home, env } = makeEnv()
    const scanRoot = makeScanRoot([
      { name: 'proj-front', content: FRONTMATTER_STATUS('proj-front') },
      { name: 'proj-md', content: MARKDOWN_STATUS('proj-md') },
    ])
    try {
      const { stdout, exitCode } = runCLI(['sync', '--from-status', '--paths', scanRoot], env)
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Found 2 projects')
      expect(stdout).toContain('proj-front')
      expect(stdout).toContain('proj-md')
      expect(stdout).toContain('Created: 2 projects')
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(scanRoot, { recursive: true, force: true })
    }
  })

  test('--report mode (no registry write) handles non-numeric priority', async () => {
    const { home, env } = makeEnv()
    const scanRoot = makeScanRoot([{ name: 'proj-p1', content: FRONTMATTER_STATUS('proj-p1') }])
    try {
      const { stdout, exitCode } = runCLI(
        ['sync', '--from-status', '--report', '--paths', scanRoot],
        env,
      )
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Found 1 projects')
      expect(stdout).not.toContain('undefined')
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(scanRoot, { recursive: true, force: true })
    }
  })

  test('empty scan root reports zero projects', async () => {
    const { home, env } = makeEnv()
    const scanRoot = makeScanRoot([])
    try {
      const { stdout, exitCode } = runCLI(['sync', '--from-status', '--paths', scanRoot], env)
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Found 0 projects')
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(scanRoot, { recursive: true, force: true })
    }
  })
})
