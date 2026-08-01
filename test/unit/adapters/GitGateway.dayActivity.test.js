/**
 * GitGateway — date-range methods backing `atlas day` (SPEC Design §5).
 *
 * Uses a disposable tmp git repo with controlled commit dates, never a real
 * project tree — see the Phase 2b.5 incident note in the ORCHESTRATE plan
 * for why that boundary matters.
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GitGateway } from '../../../src/adapters/gateways/GitGateway.js'

const execFileAsync = promisify(execFile)

async function git(cwd, args, dateISO) {
  const env = dateISO
    ? { ...process.env, GIT_AUTHOR_DATE: dateISO, GIT_COMMITTER_DATE: dateISO }
    : process.env
  return execFileAsync('git', args, { cwd, env })
}

async function buildFixtureRepo() {
  const dir = await mkdtemp(join(tmpdir(), 'atlas-git-fixture-'))
  await git(dir, ['init', '-q'])
  await git(dir, ['config', 'user.email', 'test@example.com'])
  await git(dir, ['config', 'user.name', 'Test'])

  // Day-before commit — must NOT appear in a --date 2026-08-01 query.
  await writeFile(join(dir, 'README.md'), 'v0')
  await git(dir, ['add', '.'])
  await git(dir, ['commit', '-q', '-m', 'day-before commit'], '2026-07-31T10:00:00')

  // On-date, non-.STATUS commit.
  await writeFile(join(dir, 'README.md'), 'v1')
  await git(dir, ['add', '.'])
  await git(dir, ['commit', '-q', '-m', 'touches README only'], '2026-08-01T09:00:00')

  // On-date, .STATUS commit.
  await writeFile(join(dir, '.STATUS'), 'status: active\nprogress: 50\n')
  await git(dir, ['add', '.'])
  await git(dir, ['commit', '-q', '-m', 'touches .STATUS'], '2026-08-01T14:00:00')

  // Day-after commit — must NOT appear.
  await writeFile(join(dir, 'README.md'), 'v2')
  await git(dir, ['add', '.'])
  await git(dir, ['commit', '-q', '-m', 'day-after commit'], '2026-08-02T09:00:00')

  return dir
}

describe('GitGateway — date-range methods', () => {
  let gateway
  let dir

  beforeAll(async () => {
    gateway = new GitGateway()
    dir = await buildFixtureRepo()
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  describe('getCommitsSince', () => {
    test('returns only commits on the given date', async () => {
      const commits = await gateway.getCommitsSince(dir, '2026-08-01')
      expect(commits).toHaveLength(2)
      expect(commits.some((c) => c.subject === 'touches README only')).toBe(true)
      expect(commits.some((c) => c.subject === 'touches .STATUS')).toBe(true)
      expect(commits.some((c) => c.subject === 'day-before commit')).toBe(false)
      expect(commits.some((c) => c.subject === 'day-after commit')).toBe(false)
    })

    test('returns an empty array (not null/throw) for a date with no activity', async () => {
      const commits = await gateway.getCommitsSince(dir, '2026-01-01')
      expect(commits).toEqual([])
    })

    test('returns an empty array for a non-git directory rather than throwing', async () => {
      const commits = await gateway.getCommitsSince('/tmp', '2026-08-01')
      expect(commits).toEqual([])
    })
  })

  describe('getStatusDiff', () => {
    test('includes only the .STATUS-touching commit, scoped by pathspec', async () => {
      const diff = await gateway.getStatusDiff(dir, '2026-08-01')
      expect(diff).toContain('touches .STATUS')
      expect(diff).not.toContain('touches README only')
      expect(diff).toContain('status: active')
    })

    test('returns an empty string for a date with no .STATUS activity', async () => {
      const diff = await gateway.getStatusDiff(dir, '2026-01-01')
      expect(diff).toBe('')
    })
  })
})
