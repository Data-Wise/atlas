/**
 * GitGateway
 *
 * Adapter for reading git repository information.
 * Provides git status, branch, and uncommitted changes.
 */

import { exec, execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

/** date + 1 day, as YYYY-MM-DD, for a git --until upper bound. */
function nextDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export class GitGateway {
  /**
   * Get git status for a project
   * @param {string} projectPath - Path to project directory
   * @returns {Promise<Object|null>} Git status or null if not a git repo
   */
  async getStatus(projectPath) {
    // Check if directory exists and has .git
    if (!existsSync(projectPath)) {
      return null
    }

    const gitDir = join(projectPath, '.git')
    if (!existsSync(gitDir)) {
      return null
    }

    try {
      // Get current branch (handles detached HEAD in CI)
      let branch = ''
      try {
        const { stdout: branchOutput } = await execAsync('git branch --show-current', {
          cwd: projectPath
        })
        branch = branchOutput.trim()
      } catch {
        // Ignore - will try fallback
      }

      // Fallback for detached HEAD (common in CI)
      if (!branch) {
        try {
          const { stdout: headOutput } = await execAsync('git rev-parse --short HEAD', {
            cwd: projectPath
          })
          branch = `HEAD@${headOutput.trim()}`
        } catch {
          branch = 'unknown'
        }
      }

      // Get git status --porcelain for changes
      const { stdout: statusOutput } = await execAsync('git status --porcelain', {
        cwd: projectPath
      })

      const uncommittedFiles = statusOutput
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const status = line.substring(0, 2).trim()
          const file = line.substring(3).trim()
          return { status, file }
        })

      // Get ahead/behind counts
      let ahead = 0
      let behind = 0

      try {
        const { stdout: aheadBehindOutput } = await execAsync(
          'git rev-list --left-right --count @{u}...HEAD',
          { cwd: projectPath }
        )

        const [behindStr, aheadStr] = aheadBehindOutput.trim().split('\t')
        ahead = parseInt(aheadStr, 10) || 0
        behind = parseInt(behindStr, 10) || 0
      } catch (error) {
        // No upstream branch configured - that's okay
      }

      return {
        branch,
        ahead,
        behind,
        dirty: uncommittedFiles.length > 0,
        uncommittedFiles
      }
    } catch (error) {
      console.error(`Warning: Could not read git status: ${error.message}`)
      return null
    }
  }

  /**
   * Check if path is a git repository
   * @param {string} projectPath - Path to check
   * @returns {Promise<boolean>}
   */
  async isGitRepository(projectPath) {
    const gitDir = join(projectPath, '.git')
    return existsSync(gitDir)
  }

  /**
   * Get last commit message
   * @param {string} projectPath - Path to project directory
   * @returns {Promise<string|null>}
   */
  async getLastCommitMessage(projectPath) {
    try {
      const { stdout } = await execAsync('git log -1 --pretty=%B', {
        cwd: projectPath
      })
      return stdout.trim()
    } catch (error) {
      return null
    }
  }

  /**
   * Get the current HEAD commit sha (short form)
   * @param {string} projectPath - Path to project directory
   * @returns {Promise<string|null>}
   */
  async getHeadSha(projectPath) {
    if (!(await this.isGitRepository(projectPath))) {
      return null
    }
    try {
      const { stdout } = await execAsync('git rev-parse --short HEAD', {
        cwd: projectPath
      })
      return stdout.trim() || null
    } catch {
      return null
    }
  }

  /**
   * Compute a git activity delta since a given timestamp — used to back
   * "session end" with real evidence instead of an unchecked completed flag.
   *
   * @param {string} projectPath - Path to project directory
   * @param {string|Date} since - ISO timestamp (or Date) to diff from
   * @returns {Promise<Object|null>} { branch, commits: [{sha, subject}], files: string[] } or null if not a git repo
   */
  async getDelta(projectPath, since) {
    if (!existsSync(projectPath) || !(await this.isGitRepository(projectPath))) {
      return null
    }

    const sinceIso = since instanceof Date ? since.toISOString() : since

    try {
      let branch = ''
      try {
        const { stdout } = await execAsync('git branch --show-current', { cwd: projectPath })
        branch = stdout.trim()
      } catch {
        branch = 'unknown'
      }

      const { stdout: logOutput } = await execAsync(
        `git log --since="${sinceIso}" --pretty=format:%h%x09%s`,
        { cwd: projectPath }
      )

      const commits = logOutput
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [sha, ...rest] = line.split('\t')
          return { sha, subject: rest.join('\t') }
        })

      let files = []
      if (commits.length > 0) {
        const { stdout: filesOutput } = await execAsync(
          `git log --since="${sinceIso}" --name-only --pretty=format:`,
          { cwd: projectPath }
        )
        files = [...new Set(filesOutput.split('\n').map(f => f.trim()).filter(Boolean))]
      }

      return {
        branch,
        commits,
        files,
        hasActivity: commits.length > 0
      }
    } catch (error) {
      console.error(`Warning: Could not compute git delta: ${error.message}`)
      return null
    }
  }

  /**
   * List commits made on a given calendar date. Backs `atlas day` (SPEC
   * Design §5). Uses execFile with an argument array — never a
   * string-interpolated exec() — since `date` originates from a CLI flag
   * (adversarial-review injection-safety finding).
   * @param {string} projectPath
   * @param {string} date - YYYY-MM-DD (validated by the caller, GetDayActivityUseCase)
   * @returns {Promise<Array<{sha: string, subject: string}>>} Empty array for a non-repo or no activity
   */
  async getCommitsSince(projectPath, date) {
    if (!existsSync(join(projectPath, '.git'))) return []

    try {
      const { stdout } = await execFileAsync('git', [
        'log',
        // A bare YYYY-MM-DD's time-of-day defaults to "now" in git's
        // approxidate parser, not midnight — silently excludes same-day
        // commits earlier than the current wall-clock time. Verified via
        // direct git testing; always pin an explicit 00:00:00.
        `--since=${date} 00:00:00`,
        `--until=${nextDay(date)} 00:00:00`,
        '--pretty=format:%H\t%s'
      ], { cwd: projectPath })

      return stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [sha, ...rest] = line.split('\t')
          return { sha, subject: rest.join('\t') }
        })
    } catch {
      return []
    }
  }

  /**
   * `.STATUS`-only diff for commits on a given calendar date. Deliberately
   * scoped to the `.STATUS` pathspec, not a full multi-file diff (SPEC
   * Design §5) — status edits often mark work that produced no commit, but
   * a full diff would re-introduce the "commits are a bad proxy" problem
   * `atlas day` exists to avoid.
   * @param {string} projectPath
   * @param {string} date - YYYY-MM-DD
   * @returns {Promise<string>} Empty string for a non-repo or no .STATUS activity
   */
  async getStatusDiff(projectPath, date) {
    if (!existsSync(join(projectPath, '.git'))) return ''

    try {
      const { stdout } = await execFileAsync('git', [
        'log',
        '-p',
        `--since=${date} 00:00:00`,
        `--until=${nextDay(date)} 00:00:00`,
        '--',
        '.STATUS'
      ], { cwd: projectPath })

      return stdout
    } catch {
      return ''
    }
  }
}
