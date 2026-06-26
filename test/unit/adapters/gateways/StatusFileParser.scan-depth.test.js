/**
 * StatusFileParser.scanDirectory — depth convention (characterization).
 *
 * The parser's _scanRecursive guard is `currentDepth > maxDepth` and it inspects
 * .STATUS FILES in dirPath (so the scan root itself is level 0). This differs
 * deliberately from FileSystemProjectRepository, whose guard is `>=` because it
 * inspects CHILD DIRS of dirPath (root's children are level 0). The two
 * conventions compensate: both reach 3 directory levels below the root. This
 * test pins the parser side — a .STATUS in the root is found, and files are
 * found down to maxDepth levels deep but not beyond — so a future "make the
 * guards match" refactor cannot silently change the reachable depth.
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { StatusFileParser } from '../../../../src/adapters/gateways/StatusFileParser.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('StatusFileParser.scanDirectory — depth convention', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'atlas-scan-depth-'))
  })
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
    root = null
  })

  test('finds .STATUS at the root (level 0) through maxDepth levels, but not beyond', async () => {
    // root/.STATUS (L0), a/.STATUS (L1), a/b/.STATUS (L2), a/b/c/.STATUS (L3),
    // a/b/c/d/.STATUS (L4 — beyond maxDepth=3).
    const dirs = ['', 'a', 'a/b', 'a/b/c', 'a/b/c/d']
    for (const d of dirs) {
      const dir = d ? join(root, d) : root
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, '.STATUS'), 'status: active\n')
    }

    const results = await new StatusFileParser().scanDirectory(root, { maxDepth: 3 })
    const found = results.map(r => r.path).sort()

    expect(found).toEqual([
      root, // L0 — the root .STATUS is found (parser inspects files in dirPath)
      join(root, 'a'), // L1
      join(root, 'a', 'b'), // L2
      join(root, 'a', 'b', 'c') // L3
    ].sort())
    expect(found).not.toContain(join(root, 'a', 'b', 'c', 'd')) // L4 beyond maxDepth
  })
})
