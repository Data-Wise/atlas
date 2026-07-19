/**
 * Unit tests for MigrateStatusUseCase (atlas migrate --status)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { MigrateStatusUseCase } from '../../../../src/use-cases/status/MigrateStatusUseCase.js'

describe('MigrateStatusUseCase', () => {
  let testDir
  let useCase

  beforeEach(async () => {
    testDir = join(tmpdir(), `migrate-status-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(testDir, { recursive: true })
    useCase = new MigrateStatusUseCase()
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  test('dry-run is the default — prints a diff, writes nothing', async () => {
    const legacy = `## Project: pkg
## Status: active
## Progress: 45
## Kind: package
## Target: JASA

Body text.
`
    await writeFile(join(testDir, '.STATUS'), legacy)

    const { results } = await useCase.execute({ path: testDir })
    expect(results).toHaveLength(1)
    const [r] = results
    expect(r.status).toBe('dry-run')
    expect(r.format).toBe('markdown')
    expect(r.diff).toContain('status')
    expect(r.diff).toContain('kind')
    expect(r.diff).toContain('target')

    // File on disk untouched
    const onDisk = await readFile(join(testDir, '.STATUS'), 'utf-8')
    expect(onDisk).toBe(legacy)
  })

  test('--apply writes canonical frontmatter, preserving all fields', async () => {
    const legacy = `## Project: pkg
## Status: active
## Progress: 45
## Kind: package
## Target: JASA
## Cran_state: pending
`
    await writeFile(join(testDir, '.STATUS'), legacy)

    const { results } = await useCase.execute({ path: testDir, apply: true })
    const [r] = results
    expect(r.status).toBe('migrated')
    expect(r.after.kind).toBe('package')
    expect(r.after.target).toBe('JASA')
    expect(r.after.cran_state).toBe('pending')

    const onDisk = await readFile(join(testDir, '.STATUS'), 'utf-8')
    expect(onDisk.trim().startsWith('---')).toBe(true)
    expect(onDisk).toContain('schema: atlas/v1')
  })

  test('already-canonical files are skipped', async () => {
    await writeFile(join(testDir, '.STATUS'), '---\nschema: atlas/v1\nstatus: active\nprogress: 10\n---\n')

    const { results } = await useCase.execute({ path: testDir })
    expect(results[0].status).toBe('skipped')
    expect(results[0].reason).toMatch(/already canonical/)
  })

  test('planted defect: duplicate keys + trailing-text progress migrate with warnings, values preserved (#87 semantics)', async () => {
    const legacy = `## Project: pkg
## Status: active
## Progress: 75 (manuscript on hold)
## Status: paused
`
    await writeFile(join(testDir, '.STATUS'), legacy)

    const { results } = await useCase.execute({ path: testDir })
    const [r] = results
    expect(r.status).toBe('dry-run')
    // last-occurrence-wins per #87 semantics
    expect(r.before.status).toBe('paused')
    // trailing text preserved the leading number
    expect(r.before.progress).toBe(75)
    expect(r.before.warnings.some(w => w.includes('duplicate key'))).toBe(true)
    expect(r.before.warnings.some(w => w.includes('trailing text'))).toBe(true)
    expect(r.diff).toContain('⚠')
  })

  test('no .STATUS file present is skipped, not an error', async () => {
    const { results } = await useCase.execute({ path: testDir })
    expect(results[0].status).toBe('skipped')
    expect(results[0].reason).toMatch(/no \.STATUS/)
  })
})
