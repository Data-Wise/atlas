/**
 * FileSystemProjectRepository scan — FW-28 marker edge cases.
 *
 * Complements ScannerRecurseMarker.test.js. Both cases stay within the default
 * scan depth and assert well-defined behavior:
 *   - a marker on a dir with no child .STATUS yields just the umbrella
 *   - markers nest: an opted-in umbrella whose child is also opted in exposes
 *     the grandchild too.
 */

import { describe, test, expect, afterEach } from '@jest/globals'
import { FileSystemProjectRepository } from '../../src/adapters/repositories/FileSystemProjectRepository.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('FileSystemProjectRepository scan — FW-28 marker edge cases', () => {
  let root

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
    root = null
  })

  const status = (dir) => writeFileSync(join(dir, '.STATUS'), 'status: active\n')
  const marker = (dir) => writeFileSync(join(dir, '.atlas-scan-children'), '')

  test('marker on a dir whose children are not projects still yields only the umbrella', async () => {
    root = mkdtempSync(join(tmpdir(), 'atlas-fw28-edge-'))
    const umb = join(root, 'umbrella')
    mkdirSync(join(umb, 'src'), { recursive: true }) // ordinary subdir, no .STATUS
    mkdirSync(join(umb, 'docs'), { recursive: true })
    status(umb)
    marker(umb) // opted in, but there is nothing project-shaped below

    const repo = new FileSystemProjectRepository(join(root, 'projects.json'))
    const names = (await repo.scan(root, { useCache: false, forceRefresh: true })).map(p => p.name)

    expect(names).toContain('umbrella')
    expect(names).not.toContain('src')
    expect(names).not.toContain('docs')
  })

  test('markers nest: an opted-in umbrella with an opted-in child exposes the grandchild', async () => {
    root = mkdtempSync(join(tmpdir(), 'atlas-fw28-nest-'))
    const umb = join(root, 'umbrella')
    const child = join(umb, 'child')
    const grand = join(child, 'grand')
    mkdirSync(grand, { recursive: true })
    status(umb); marker(umb)
    status(child); marker(child)
    status(grand)

    const repo = new FileSystemProjectRepository(join(root, 'projects.json'))
    const names = (await repo.scan(root, { useCache: false, forceRefresh: true })).map(p => p.name)

    expect(names).toEqual(expect.arrayContaining(['umbrella', 'child', 'grand']))
  })
})
