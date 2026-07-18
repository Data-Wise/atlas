/**
 * ObsidianGateway
 *
 * Adapter for writing captures into an Obsidian vault via the `obs` CLI
 * (obsidian-cli-ops). Optional dependency, capability-probed — mirrors the
 * flow-cli ATLAS-CONTRACT pattern (probe, cache, graceful fallback).
 *
 * `obs write` / `obs daily` are not yet shipped (obsidian-cli-ops targets
 * an IPC bridge to the Obsidian app). Until then, every call fails closed
 * and callers should queue the capture for a later `atlas flush`.
 *
 * @module adapters/gateways/ObsidianGateway
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export class ObsidianGateway {
  constructor({ execFn = execFileAsync } = {}) {
    this._exec = execFn
    this._available = null
  }

  /**
   * Probe whether the `obs` binary is on PATH. Cached for the process
   * lifetime — matches flow-cli's session-cached `command -v` probe.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (this._available !== null) return this._available
    try {
      await this._exec('which', ['obs'])
      this._available = true
    } catch {
      this._available = false
    }
    return this._available
  }

  /**
   * Write a capture as a vault note.
   * @param {Object} capture - Capture entity (or its toJSON() shape)
   * @param {Object} [opts]
   * @param {string} [opts.vault] - Vault id; falls back to obs's default vault
   * @returns {Promise<{ok: boolean, path?: string, error?: string}>}
   */
  async write(capture, { vault } = {}) {
    if (!(await this.isAvailable())) {
      return { ok: false, error: 'obs not installed' }
    }

    const title = capture.text.slice(0, 80)
    const args = ['write', '--title', title, '--content', capture.text]
    if (vault) args.unshift('--vault', vault)

    try {
      const { stdout } = await this._exec('obs', args)
      return { ok: true, path: stdout.trim() }
    } catch (err) {
      // obs write isn't shipped yet (obsidian-cli-ops v4.3.0) — this is the
      // expected path until the IPC bridge lands. Treat as a normal
      // "vault unreachable" outcome, not a crash.
      return { ok: false, error: err.message }
    }
  }
}

export default ObsidianGateway
