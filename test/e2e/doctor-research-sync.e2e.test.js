/**
 * E2E — research-sync report + doctor contract, through the real atlas binary.
 *
 * Covers the CLI-layer behavior that the use-case unit tests cannot reach:
 *   - `sync --from-status --report` / the `--research` alias scan + summarize
 *   - `atlas doctor --format json` exit code (1 when a registered project is
 *     missing .STATUS, 0 otherwise) — that exit logic lives in bin/atlas.js.
 *
 * Uses execFileSync (not execSync) per the security hook, and an isolated
 * HOME + ATLAS_CONFIG so the user's real ~/.atlas is never touched. doctor is
 * always called with --all-registered so the default /tmp exclusion (Linux CI
 * tmpdir is under /tmp) does not hide the fixture project.
 */

import { describe, test, expect } from '@jest/globals'
import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_PATH = join(__dirname, '../../bin/atlas.js')

function runCLI(args, env) {
  try {
    const stdout = execFileSync('node', [CLI_PATH, ...args], {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test', ...env }
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stderr || '', exitCode: error.status }
  }
}

// A markdown-format research .STATUS (manuscript, P1/active) so it surfaces in
// the report's "Active P1" block by name.
const RESEARCH_STATUS = [
  '## Project: pmed-modern',
  '## Type: manuscript',
  '## Status: active',
  '## Priority: 1',
  '## Progress: 40',
  '## Kind: manuscript',
  '## Target: JASA',
  '## Next: derive estimand'
].join('\n') + '\n'

function makeEnv() {
  const home = mkdtempSync(join(tmpdir(), 'atlas-e2e-rs-'))
  return { home, env: { HOME: home, ATLAS_CONFIG: join(home, '.atlas') } }
}

function makeScanRoot() {
  const scanRoot = mkdtempSync(join(tmpdir(), 'atlas-e2e-scan-'))
  const proj = join(scanRoot, 'pmed-modern')
  mkdirSync(proj, { recursive: true })
  writeFileSync(join(proj, '.STATUS'), RESEARCH_STATUS)
  return { scanRoot, proj }
}

describe('E2E — sync --from-status --report (research surface)', () => {
  test('reports the scanned research project without writing the registry', () => {
    const { home, env } = makeEnv()
    const { scanRoot } = makeScanRoot()
    try {
      const { stdout, exitCode } = runCLI(
        ['sync', '--from-status', '--report', '--paths', scanRoot],
        env
      )
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Found 1 projects')
      expect(stdout).toContain('pmed-modern')
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(scanRoot, { recursive: true, force: true })
    }
  })

  test('the --research alias also reaches the report path (root overridden by --paths)', () => {
    const { home, env } = makeEnv()
    const { scanRoot } = makeScanRoot()
    try {
      const { stdout, exitCode } = runCLI(
        ['sync', '--research', '--report', '--paths', scanRoot],
        env
      )
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Found 1 projects')
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(scanRoot, { recursive: true, force: true })
    }
  })
})

describe('E2E — doctor exit-code contract', () => {
  test('exit 0 when the registered project has its .STATUS (missing CLAUDE.md is a non-fatal gap)', () => {
    const { home, env } = makeEnv()
    const { scanRoot } = makeScanRoot()
    try {
      // Register the project (no --report → persists to the isolated registry).
      expect(runCLI(['sync', '--from-status', '--paths', scanRoot], env).exitCode).toBe(0)

      const { stdout, exitCode } = runCLI(['doctor', '--format', 'json', '--all-registered'], env)
      expect(exitCode).toBe(0)
      const { summary, rows } = JSON.parse(stdout)
      expect(summary.total).toBeGreaterThanOrEqual(1)
      expect(summary.missingStatus).toBe(0)
      const row = rows.find(r => r.name === 'pmed-modern')
      expect(row).toBeTruthy()
      expect(row.missingRequired).toContain('CLAUDE.md') // no CLAUDE.md in the fixture
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(scanRoot, { recursive: true, force: true })
    }
  })

  test('exit 1 when a registered project has lost its .STATUS', () => {
    const { home, env } = makeEnv()
    const { scanRoot, proj } = makeScanRoot()
    try {
      // Register, then remove the .STATUS so the registry points at a now-bare dir.
      expect(runCLI(['sync', '--from-status', '--paths', scanRoot], env).exitCode).toBe(0)
      unlinkSync(join(proj, '.STATUS'))

      const { stdout, exitCode } = runCLI(['doctor', '--format', 'json', '--all-registered'], env)
      expect(exitCode).toBe(1)
      const { summary } = JSON.parse(stdout)
      expect(summary.missingStatus).toBeGreaterThanOrEqual(1)
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(scanRoot, { recursive: true, force: true })
    }
  })
})
