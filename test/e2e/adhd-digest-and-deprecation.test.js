/**
 * WS3 (ADHD workflow streamline) — flow-cli contract snapshot lock + deprecation
 * warning coverage.
 *
 * These pin the exact stdout shape flow-cli depends on for `where`, `session
 * status --format json`, `inbox --count`, and `trail --limit` so that the
 * bare-`atlas` digest addition (this same feature) cannot silently change
 * them. See docs/specs/SPEC-adhd-workflow-streamline-2026-07-19.md.
 *
 * Every test runs against an isolated, temp ATLAS_DATA_DIR/HOME — never the
 * real ~/.atlas.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CLI_PATH = join(__dirname, '../../bin/atlas.js')

function runCLI(args = '', env = {}) {
  const result = spawnSync('node', [CLI_PATH, ...args.split(' ').filter(Boolean)], {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', ...env }
  })
  return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.status }
}

describe('flow-cli contract snapshots (unchanged by the digest addition)', () => {
  let home
  let env

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'atlas-contract-'))
    env = { HOME: home, ATLAS_CONFIG: join(home, '.atlas'), ATLAS_DATA_DIR: join(home, '.atlas') }
  })

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  test('where: no project, empty context — exact header line preserved', () => {
    const { stdout, exitCode } = runCLI('where', env)
    expect(exitCode).toBe(0)
    expect(stdout).toContain('CURRENT CONTEXT')
  })

  test('session status --format json: null when no active session (flow-cli greps this)', () => {
    const { stdout, exitCode } = runCLI('session status --format json', env)
    expect(exitCode).toBe(0)
    expect(stdout.trim()).toBe('null')
  })

  test('inbox --count: bare integer, no other output', () => {
    const { stdout, exitCode } = runCLI('inbox --count', env)
    expect(exitCode).toBe(0)
    expect(stdout.trim()).toBe('0')
  })

  test('trail --limit: still renders (deprecation warning goes to stderr only)', () => {
    const { stdout, exitCode } = runCLI('trail --limit 3', env)
    expect(exitCode).toBe(0)
    expect(stdout).not.toContain('deprecated')
  })
})

describe('Deprecation-with-warning tier (v0.14 — nothing removed)', () => {
  let home
  let env

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'atlas-deprecation-'))
    env = { HOME: home, ATLAS_CONFIG: join(home, '.atlas'), ATLAS_DATA_DIR: join(home, '.atlas') }
  })

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  test('crumb prints a one-line stderr deprecation pointer, stdout unchanged', () => {
    const { stdout, stderr, exitCode } = runCLI('crumb hello', env)
    expect(exitCode).toBe(0)
    expect(stderr).toContain('deprecated')
    expect(stderr).toContain('session note')
    expect(stdout).toContain('Breadcrumb')
  })

  test('trail prints a one-line stderr deprecation pointer, stdout unchanged', () => {
    const { stderr, exitCode } = runCLI('trail', env)
    expect(exitCode).toBe(0)
    expect(stderr).toContain('deprecated')
  })

  test('park prints a one-line stderr deprecation pointer', () => {
    const { stderr, exitCode } = runCLI('park -f "test note"', env)
    expect(exitCode).toBe(0)
    expect(stderr).toContain('deprecated')
  })

  test('unpark prints a one-line stderr deprecation pointer', () => {
    const { stderr, exitCode } = runCLI('unpark', env)
    expect(exitCode).toBe(0)
    expect(stderr).toContain('deprecated')
  })

  test('parked prints a one-line stderr deprecation pointer', () => {
    const { stderr, exitCode } = runCLI('parked', env)
    expect(exitCode).toBe(0)
    expect(stderr).toContain('deprecated')
  })
})

describe('Bare `atlas` digest — additive, isolated', () => {
  let home
  let env

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'atlas-digest-'))
    env = { HOME: home, ATLAS_CONFIG: join(home, '.atlas'), ATLAS_DATA_DIR: join(home, '.atlas') }
  })

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  test('renders one glanceable screen: active session, inbox, streak sections', () => {
    const { stdout, exitCode } = runCLI('', env)
    expect(exitCode).toBe(0)
    expect(stdout).toContain('ATLAS DIGEST')
    expect(stdout).toContain('Active: none')
    expect(stdout).toMatch(/Inbox: \d+/)
  })

  test('inbox count reflects captures scoped to the active session project', () => {
    runCLI('project add /tmp', env)
    runCLI('catch an-idea -p tmp', env)
    expect(runCLI('session start tmp', env).exitCode).toBe(0)

    const { stdout, exitCode } = runCLI('', env)
    expect(exitCode).toBe(0)
    expect(stdout).toContain('Inbox: 1')
  })
})
