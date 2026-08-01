/**
 * GetDayActivityUseCase
 *
 * Backs `atlas day` — a multi-repo activity provider spanning the four
 * project trees, merging commits + .STATUS diffs + per-lane session time
 * into one JSON object keyed by tree name. Explicitly a MEMORY AID, never
 * a source of truth (SPEC Non-goals) — commits/diffs are a proxy for what
 * mattered, not proof of it.
 */
import { existsSync } from 'node:fs'
import { readdir } from 'fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

const TREES = ['r-packages', 'research', 'teaching', 'dev-tools']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export class GetDayActivityUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../adapters/gateways/GitGateway.js').GitGateway} dependencies.gitGateway
   * @param {import('../../domain/repositories/ISessionRepository.js').ISessionRepository} dependencies.sessionRepository
   * @param {import('../../domain/repositories/IProjectRepository.js').IProjectRepository} dependencies.projectRepository
   * @param {string} [dependencies.projectsRoot] - Root containing the four
   *   tree directories. Defaults to ~/projects. Tests MUST override this
   *   with a disposable fixture dir — never scan a real project tree.
   */
  constructor({ gitGateway, sessionRepository, projectRepository, projectsRoot }) {
    this.gitGateway = gitGateway
    this.sessionRepository = sessionRepository
    this.projectRepository = projectRepository
    this.projectsRoot = projectsRoot || join(homedir(), 'projects')
  }

  /**
   * @param {Object} params
   * @param {string} params.date - YYYY-MM-DD
   * @returns {Promise<Object>} Keyed by tree name; every tree always present
   */
  async execute({ date }) {
    if (!DATE_RE.test(date)) {
      throw new Error(`date must be YYYY-MM-DD, got: ${date}`)
    }

    const sessions = await this._sessionsOnDate(date)

    const result = {}
    for (const tree of TREES) {
      const treePath = join(this.projectsRoot, tree)
      const repoDirs = await this._listRepoDirs(treePath)

      const commits = []
      const statusDiffs = []
      for (const repoPath of repoDirs) {
        const repoCommits = await this.gitGateway.getCommitsSince(repoPath, date)
        if (repoCommits.length > 0) {
          commits.push({ repo: basename(repoPath), commits: repoCommits })
        }
        const diff = await this.gitGateway.getStatusDiff(repoPath, date)
        if (diff) {
          statusDiffs.push({ repo: basename(repoPath), diff })
        }
      }

      result[tree] = {
        commits,
        statusDiffs,
        sessionMinutes: await this._sessionMinutesForTree(sessions, treePath)
      }
    }

    return result
  }

  /**
   * @param {string} treePath
   * @returns {Promise<string[]>} Absolute paths of git repos directly under treePath
   * @private
   */
  async _listRepoDirs(treePath) {
    if (!existsSync(treePath)) return []
    const entries = await readdir(treePath, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => join(treePath, e.name))
      .filter((p) => existsSync(join(p, '.git')))
  }

  /**
   * @param {string} date
   * @returns {Promise<Array>}
   * @private
   */
  async _sessionsOnDate(date) {
    const start = new Date(`${date}T00:00:00`)
    const end = new Date(`${date}T23:59:59.999`)
    return await this.sessionRepository.findByDateRange(start, end)
  }

  /**
   * Sum session minutes whose resolved project path falls under treePath.
   * A session whose project can't be resolved is silently excluded — this
   * is a memory aid, not an audit trail (SPEC Non-goals).
   * @param {Array} sessions
   * @param {string} treePath
   * @returns {Promise<number>}
   * @private
   */
  async _sessionMinutesForTree(sessions, treePath) {
    let minutes = 0
    for (const session of sessions) {
      const project = await this.projectRepository.findById(session.project)
      if (project?.path && (project.path === treePath || project.path.startsWith(`${treePath}/`))) {
        minutes += session.getDuration()
      }
    }
    return minutes
  }
}
