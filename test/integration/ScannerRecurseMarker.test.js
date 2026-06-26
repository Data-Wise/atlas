/**
 * FileSystemProjectRepository scan — FW-28 child-recurse marker
 *
 * By default the scanner stops at the first project-dir (umbrella-only), so a
 * monorepo umbrella hides its child repos. A `.atlas-scan-children` marker opts
 * the umbrella in to having its children scanned too.
 */

import { describe, test, expect, afterEach } from '@jest/globals'
import { FileSystemProjectRepository } from '../../src/adapters/repositories/FileSystemProjectRepository.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('FileSystemProjectRepository scan — FW-28 child-recurse marker', () => {
  let root

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
    root = null
  })

  function setup({ marker }) {
    root = mkdtempSync(join(tmpdir(), 'atlas-fw28-'))
    const umb = join(root, 'umbrella')
    mkdirSync(join(umb, 'child1'), { recursive: true })
    mkdirSync(join(umb, 'child2'), { recursive: true })
    // `.STATUS` marks each dir as an atlas-tracked project.
    writeFileSync(join(umb, '.STATUS'), 'status: active\n')
    writeFileSync(join(umb, 'child1', '.STATUS'), 'status: active\n')
    writeFileSync(join(umb, 'child2', '.STATUS'), 'status: active\n')
    if (marker) writeFileSync(join(umb, '.atlas-scan-children'), '')
    return new FileSystemProjectRepository(join(root, 'projects.json'))
  }

  test('umbrella-only by default — children are hidden', async () => {
    const repo = setup({ marker: false })
    const names = (await repo.scan(root, { useCache: false, forceRefresh: true })).map(p => p.name)
    expect(names).toContain('umbrella')
    expect(names).not.toContain('child1')
    expect(names).not.toContain('child2')
  })

  test('.atlas-scan-children marker exposes the children too', async () => {
    const repo = setup({ marker: true })
    const names = (await repo.scan(root, { useCache: false, forceRefresh: true })).map(p => p.name)
    expect(names).toEqual(expect.arrayContaining(['umbrella', 'child1', 'child2']))
  })
})
