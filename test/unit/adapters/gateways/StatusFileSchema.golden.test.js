/**
 * Golden-file suite for the unified .STATUS schema (atlas/v1).
 *
 * Verifies:
 * 1. The same logical content, expressed in all 3 accepted formats
 *    (canonical YAML frontmatter, legacy markdown, legacy bare-yaml),
 *    normalizes to the same business-field object via
 *    StatusFileParser.normalize().
 * 2. Writing a normalized object always emits canonical frontmatter,
 *    byte-stable and re-parseable.
 * 3. Round-trip (parse → write → parse) is lossless, including unknown
 *    frontmatter keys and the markdown body.
 * 4. Data-loss regression: writing over a legacy markdown file with
 *    kind/target/cran_state either refuses (default) or migrates
 *    losslessly (--migrate) — the PR#87 silent-drop bug never recurs.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { StatusFileParser } from '../../../../src/adapters/gateways/StatusFileParser.js'
import { StatusFileGateway, LegacyStatusFileError } from '../../../../src/adapters/gateways/StatusFileGateway.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, '..', '..', '..', 'fixtures', 'status-schema')

const parser = new StatusFileParser()
const gateway = new StatusFileGateway()

// Business fields expected identical across all 3 source formats for the
// shared fixture content. (priority/body are intentionally excluded — see
// PR body / STATUS-SCHEMA.md for the documented markdown-priority and
// body-boundary limitations of the legacy formats.)
const CORE_FIELDS = ['status', 'progress', 'type', 'kind', 'focus', 'next', 'target', 'cran_state', 'version']

describe('StatusFileSchema golden-file suite (schema atlas/v1)', () => {
  let testDir

  beforeEach(async () => {
    testDir = join(tmpdir(), `status-golden-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  test('3 formats × same fixture → identical normalized core fields', async () => {
    const [fm, md, yaml] = await Promise.all([
      readFile(join(FIXTURES, 'frontmatter.STATUS'), 'utf-8'),
      readFile(join(FIXTURES, 'markdown.STATUS'), 'utf-8'),
      readFile(join(FIXTURES, 'bare-yaml.STATUS'), 'utf-8')
    ])

    const nFm = parser.normalize(parser.parseContent(fm, 'widget-pkg'))
    const nMd = parser.normalize(parser.parseContent(md, 'widget-pkg'))
    const nYaml = parser.normalize(parser.parseContent(yaml, 'widget-pkg'))

    expect(nFm.sourceFormat).toBe('frontmatter')
    expect(nMd.sourceFormat).toBe('markdown')
    expect(nYaml.sourceFormat).toBe('yaml')

    for (const field of CORE_FIELDS) {
      expect(nMd[field]).toEqual(nFm[field])
      expect(nYaml[field]).toEqual(nFm[field])
    }
  })

  test('write() always emits canonical frontmatter, re-parseable', async () => {
    const data = {
      status: 'active', progress: 45, type: 'r-package', kind: 'package',
      priority: 'high', focus: 'Ship it', next: ['Finish tests'],
      target: 'CRAN', cran_state: 'pending', version: '0.14.0',
      body: '# widget-pkg\n\nBody.'
    }
    await gateway.write(testDir, data)
    const content = await readFile(join(testDir, '.STATUS'), 'utf-8')
    expect(content.trim().startsWith('---')).toBe(true)
    expect(content).toContain('schema: atlas/v1')

    const readBack = await gateway.read(testDir)
    expect(readBack.status).toBe('active')
    expect(readBack.progress).toBe(45)
    expect(readBack.kind).toBe('package')
    expect(readBack.target).toBe('CRAN')
    expect(readBack.cran_state).toBe('pending')
    expect(readBack.next).toEqual(['Finish tests'])
  })

  test('round-trip (parse → write → parse) preserves unknown keys and body byte-for-byte', async () => {
    const original = `---
schema: atlas/v1
status: active
progress: 30
type: node
custom_extra_field: kept-verbatim
nested_thing:
  a: 1
  b: [1, 2, 3]
---

# Body Heading

- a bullet
- another bullet
`
    await writeFile(join(testDir, '.STATUS'), original)

    const first = await gateway.read(testDir)
    await gateway.write(testDir, first)
    const second = await gateway.read(testDir)

    expect(second.status).toBe('active')
    expect(second.progress).toBe(30)
    expect(second.custom_extra_field).toBe('kept-verbatim')
    expect(second.nested_thing).toEqual({ a: 1, b: [1, 2, 3] })
    expect(second.body).toBe(first.body)
    expect(second.body).toContain('# Body Heading')
    expect(second.body).toContain('- a bullet')
  })

  test('data-loss regression: writing a markdown .STATUS with kind/target/cran_state refuses by default', async () => {
    const legacyContent = await readFile(join(FIXTURES, 'markdown.STATUS'), 'utf-8')
    await writeFile(join(testDir, '.STATUS'), legacyContent)

    const before = await gateway.read(testDir)
    expect(before.kind).toBe('package')
    expect(before.target).toBe('CRAN')
    expect(before.cran_state).toBe('pending')

    // PR#87 bug: the old writer silently dropped kind/target/cran_state
    // when rewriting a markdown file. The new writer must REFUSE instead.
    await expect(gateway.write(testDir, { ...before, progress: 99 })).rejects.toThrow(LegacyStatusFileError)

    // The file on disk must be untouched — no silent partial write.
    const stillLegacy = await readFile(join(testDir, '.STATUS'), 'utf-8')
    expect(stillLegacy).toBe(legacyContent)
  })

  test('data-loss regression: --migrate preserves kind/target/cran_state losslessly', async () => {
    const legacyContent = await readFile(join(FIXTURES, 'markdown.STATUS'), 'utf-8')
    await writeFile(join(testDir, '.STATUS'), legacyContent)

    const before = await gateway.read(testDir)
    await gateway.write(testDir, { ...before, progress: 99 }, { migrate: true })

    const after = await gateway.read(testDir)
    expect(after.kind).toBe('package')
    expect(after.target).toBe('CRAN')
    expect(after.cran_state).toBe('pending')
    expect(after.progress).toBe(99)
    expect(after.sourceFormat).toBe('frontmatter')
  })
})
