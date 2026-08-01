/**
 * LaunchdNudgeScheduler
 *
 * Registers/unregisters the OS-level launchd job that fires a Nudge at its
 * wall-clock time, independently of whether any Claude app is open. This is
 * the mechanism that replaced mcp__scheduled-tasks in the SPEC's v2 revision
 * — that MCP tool only runs while some Claude app is open (deferring to
 * next launch otherwise), which cannot satisfy "fires at 23:00."
 *
 * A one-shot Nudge gets a StartCalendarInterval including the exact
 * Day/Month/Year (fires once). A --daily Nudge omits Day/Month, which
 * launchd treats as "every day at this time."
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

const execFileAsync = promisify(execFile)

const DEFAULT_LAUNCH_AGENTS_DIR = join(homedir(), 'Library', 'LaunchAgents')

/**
 * Build the plist XML for a nudge. `atlasBinPath`/`nodePath` are passed
 * explicitly (rather than resolved here) so tests can point them at a
 * fixture. `nodePath` is invoked directly as ProgramArguments[0] rather
 * than relying on atlas.js's own `#!/usr/bin/env node` shebang — launchd
 * runs jobs with a minimal default PATH (/usr/bin:/bin:/usr/sbin:/sbin)
 * that does not include Homebrew/nvm node install locations, so `env`
 * cannot resolve `node` and the job exits 127 before atlas.js ever runs.
 * @param {Object} params
 * @param {string} params.label
 * @param {string} params.nodePath - Absolute path to the node binary
 * @param {string} params.atlasBinPath - Absolute path to the atlas CLI entry
 * @param {string} params.nudgeId
 * @param {{hour: number, minute: number}} params.schedule
 * @param {boolean} params.daily
 * @returns {string}
 */
export function buildPlist({ label, nodePath, atlasBinPath, nudgeId, schedule, daily }) {
  const now = new Date()

  const calendarEntries = daily
    ? `<key>Hour</key><integer>${schedule.hour}</integer>
    <key>Minute</key><integer>${schedule.minute}</integer>`
    : `<key>Hour</key><integer>${schedule.hour}</integer>
    <key>Minute</key><integer>${schedule.minute}</integer>
    <key>Day</key><integer>${now.getDate()}</integer>
    <key>Month</key><integer>${now.getMonth() + 1}</integer>
    <key>Year</key><integer>${now.getFullYear()}</integer>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${atlasBinPath}</string>
    <string>nudge</string>
    <string>fire</string>
    <string>${nudgeId}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    ${calendarEntries}
  </dict>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
`
}

export class LaunchdNudgeScheduler {
  /**
   * @param {Object} [options]
   * @param {string} [options.nodePath] - Absolute path to the node binary
   *   invoked by the plist. Defaults to `process.execPath` (the node
   *   running this process) — never relies on `env`/PATH resolution,
   *   since launchd's default PATH lacks Homebrew/nvm install locations.
   * @param {string} [options.atlasBinPath] - Absolute path to the atlas CLI
   *   entry point invoked by the plist. Defaults to this package's own
   *   bin/atlas.js so a globally-linked `atlas` isn't required at fire time.
   * @param {string} [options.launchAgentsDir] - Override for
   *   ~/Library/LaunchAgents. Tests MUST supply a tmp dir here — the
   *   default is a real, live directory read by the actual OS launchd.
   * @param {(cmd: string, args: string[]) => Promise<{stdout: string}>} [options.execFileFn]
   *   Injectable for tests, matching FireNudgeUseCase's pattern — avoids
   *   mocking node's child_process module, which this codebase doesn't do
   *   elsewhere. Defaults to the real promisified execFile.
   */
  constructor({ nodePath, atlasBinPath, launchAgentsDir, execFileFn } = {}) {
    this.nodePath = nodePath || process.execPath
    this.atlasBinPath =
      atlasBinPath || join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', 'bin', 'atlas.js')
    this.launchAgentsDir = launchAgentsDir || DEFAULT_LAUNCH_AGENTS_DIR
    this.execFileFn = execFileFn || execFileAsync
  }

  /**
   * Path to a nudge's plist, given its launchd label.
   * @param {string} label
   * @returns {string}
   * @private
   */
  _plistPath(label) {
    return join(this.launchAgentsDir, `${label}.plist`)
  }

  /**
   * Write the plist and load it via launchctl, verifying the load actually
   * took. Rolls back (deletes the plist) on any failure — never leaves a
   * half-registered job, which would show as "pending" forever with nothing
   * actually scheduled.
   * @param {import('../../domain/entities/Nudge.js').Nudge} nudge
   * @returns {Promise<void>}
   */
  async schedule(nudge) {
    const label = nudge.launchdLabel
    const path = this._plistPath(label)

    await mkdir(this.launchAgentsDir, { recursive: true })
    await writeFile(
      path,
      buildPlist({
        label,
        nodePath: this.nodePath,
        atlasBinPath: this.atlasBinPath,
        nudgeId: nudge.id,
        schedule: nudge.schedule,
        daily: nudge.recurring
      }),
      'utf8'
    )

    try {
      await this.execFileFn('launchctl', ['load', path])
    } catch (err) {
      await this._cleanupPlist(path)
      throw new Error(`launchctl load failed for ${label}: ${err.message}`)
    }

    const loaded = await this._isLoaded(label)
    if (!loaded) {
      await this.execFileFn('launchctl', ['unload', path]).catch(() => {})
      await this._cleanupPlist(path)
      throw new Error(
        `launchctl reported success but ${label} is not listed as loaded — refusing to leave a ` +
        `nudge that would silently never fire. Plist removed.`
      )
    }
  }

  /**
   * Unload and delete the plist for a nudge. Safe to call when nothing is
   * loaded (e.g. a prior partial failure) — never throws for that case.
   * @param {import('../../domain/entities/Nudge.js').Nudge} nudge
   * @returns {Promise<void>}
   */
  async unschedule(nudge) {
    const path = this._plistPath(nudge.launchdLabel)
    await this.execFileFn('launchctl', ['unload', path]).catch(() => {})
    await this._cleanupPlist(path)
  }

  /**
   * @param {string} label
   * @returns {Promise<boolean>}
   * @private
   */
  async _isLoaded(label) {
    try {
      const { stdout } = await this.execFileFn('launchctl', ['list'])
      return stdout.split('\n').some((line) => line.includes(label))
    } catch {
      return false
    }
  }

  /**
   * @param {string} path
   * @private
   */
  async _cleanupPlist(path) {
    if (existsSync(path)) {
      await unlink(path).catch(() => {})
    }
  }

  /**
   * Diagnostic helper for `atlas doctor`'s nudge reconciliation check.
   * @param {string} label
   * @returns {Promise<boolean>}
   */
  async isLoaded(label) {
    return this._isLoaded(label)
  }
}
