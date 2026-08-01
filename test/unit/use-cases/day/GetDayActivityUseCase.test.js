/**
 * GetDayActivityUseCase — backs `atlas day`. Uses a disposable tmp
 * project-tree fixture, never a real ~/projects tree (see the Phase 2b.5
 * incident note in the ORCHESTRATE plan for why that boundary matters).
 */
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GetDayActivityUseCase } from '../../../../src/use-cases/day/GetDayActivityUseCase.js'
import { GitGateway } from '../../../../src/adapters/gateways/GitGateway.js'

const execFileAsync = promisify(execFile)

async function git(cwd, args, dateISO) {
  const env = dateISO
    ? { ...process.env, GIT_AUTHOR_DATE: dateISO, GIT_COMMITTER_DATE: dateISO }
    : process.env
  return execFileAsync('git', args, { cwd, env })
}

async function makeRepo(path, { commitDate } = {}) {
  await mkdir(path, { recursive: true })
  await git(path, ['init', '-q'])
  await git(path, ['config', 'user.email', 't@e.com'])
  await git(path, ['config', 'user.name', 'T'])
  await writeFile(join(path, 'f.txt'), 'x')
  await git(path, ['add', '.'])
  await git(path, ['commit', '-q', '-m', `commit in ${path.split('/').pop()}`], commitDate)
}

/** Fake session repository/project repository — no real ~/.atlas access. */
function makeSessionRepository(sessions) {
  return { findByDateRange: jest.fn(async () => sessions) }
}
function makeProjectRepository(projectsByName) {
  return { findById: jest.fn(async (id) => projectsByName[id] || null) }
}

describe('GetDayActivityUseCase', () => {
  let root
  let gitGateway

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'atlas-day-fixture-'))
    gitGateway = new GitGateway()

    // dev-tools/: one repo with an on-date commit, one non-git dir (skip)
    await makeRepo(join(root, 'dev-tools', 'atlas'), { commitDate: '2026-08-01T09:00:00' })
    await mkdir(join(root, 'dev-tools', 'not-a-repo'), { recursive: true })

    // research/: one repo, but its commit is on a DIFFERENT date
    await makeRepo(join(root, 'research', 'me-review'), { commitDate: '2026-07-15T09:00:00' })

    // teaching/: directory exists but is empty
    await mkdir(join(root, 'teaching'), { recursive: true })

    // r-packages/: directory does not exist at all
  })

  afterAll(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const makeUseCase = (overrides = {}) =>
    new GetDayActivityUseCase({
      gitGateway,
      sessionRepository: makeSessionRepository([]),
      projectRepository: makeProjectRepository({}),
      projectsRoot: root,
      ...overrides
    })

  test('rejects a malformed date before any git call', async () => {
    const getCommitsSince = jest.spyOn(gitGateway, 'getCommitsSince')
    const useCase = makeUseCase()

    await expect(useCase.execute({ date: 'not-a-date' })).rejects.toThrow(/YYYY-MM-DD/)
    expect(getCommitsSince).not.toHaveBeenCalled()
    getCommitsSince.mockRestore()
  })

  test('returns all four tree keys always, even for a missing or empty tree directory', async () => {
    const useCase = makeUseCase()
    const result = await useCase.execute({ date: '2026-08-01' })

    expect(Object.keys(result).sort()).toEqual(['dev-tools', 'r-packages', 'research', 'teaching'])
    expect(result['r-packages']).toEqual({ commits: [], statusDiffs: [], sessionMinutes: 0 }) // missing dir
    expect(result.teaching).toEqual({ commits: [], statusDiffs: [], sessionMinutes: 0 }) // empty dir
  })

  test('aggregates commits per-repo, attributed by repo name, skipping non-git subdirectories', async () => {
    const useCase = makeUseCase()
    const result = await useCase.execute({ date: '2026-08-01' })

    expect(result['dev-tools'].commits).toEqual([
      { repo: 'atlas', commits: [expect.objectContaining({ subject: 'commit in atlas' })] }
    ])
  })

  test('excludes a repo whose only commit is on a different date', async () => {
    const useCase = makeUseCase()
    const result = await useCase.execute({ date: '2026-08-01' })

    expect(result.research.commits).toEqual([])
  })

  test('sums session minutes per tree, resolving session.project → path via projectRepository', async () => {
    const fakeSession = { project: 'atlas', getDuration: () => 45 }
    const useCase = makeUseCase({
      sessionRepository: makeSessionRepository([fakeSession]),
      projectRepository: makeProjectRepository({ atlas: { path: join(root, 'dev-tools', 'atlas') } })
    })

    const result = await useCase.execute({ date: '2026-08-01' })

    expect(result['dev-tools'].sessionMinutes).toBe(45)
    expect(result.research.sessionMinutes).toBe(0)
  })

  test('ignores a session whose project cannot be resolved, rather than throwing', async () => {
    const orphanSession = { project: 'ghost-project', getDuration: () => 30 }
    const useCase = makeUseCase({ sessionRepository: makeSessionRepository([orphanSession]) })

    await expect(useCase.execute({ date: '2026-08-01' })).resolves.toBeDefined()
  })
})
