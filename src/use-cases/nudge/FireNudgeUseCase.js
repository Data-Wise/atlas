/**
 * FireNudgeUseCase
 *
 * Invoked by the launchd job at fire time — not meant for interactive use.
 * Looks the message up from the store by id (never from argv passed by
 * launchd) and displays it as an OS notification, then marks the Nudge
 * fired.
 *
 * Injection safety (SPEC Design §4, adversarial-review fix): the message is
 * passed to osascript as an AppleScript `argv` item via `on run argv`, never
 * string-concatenated into the `-e` script text. A naive
 * `-e 'display notification "<message>"...'` build would let a message
 * containing an unescaped `"` break out of the string literal and execute
 * arbitrary AppleScript — unattended, since launchd fires with nobody
 * present to notice. Do not regress this by reintroducing interpolation.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { Nudge } from '../../domain/entities/Nudge.js'

const execFileAsync = promisify(execFile)

const NOTIFY_SCRIPT = [
  '-e', 'on run argv',
  '-e', 'display notification (item 1 of argv) with title "atlas nudge"',
  '-e', 'end run'
]

export class FireNudgeUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../domain/gateways/INudgeStore.js').INudgeStore} dependencies.nudgeStore
   * @param {(command: string, args: string[]) => Promise<Object>} [dependencies.execFileFn] - Injectable for tests
   */
  constructor({ nudgeStore, execFileFn = execFileAsync }) {
    this.nudgeStore = nudgeStore
    this.execFileFn = execFileFn
  }

  /**
   * @param {Object} params
   * @param {string} params.id
   * @returns {Promise<import('../../domain/entities/Nudge.js').Nudge>} The fired nudge
   */
  async execute({ id }) {
    const nudge = await this.nudgeStore.get(id)
    if (!nudge) {
      throw new Error(`Nudge ${id} not found — cannot fire`)
    }

    // Argument array; `message` is data appended as a distinct argv entry,
    // never woven into the script text.
    await this.execFileFn('osascript', [...NOTIFY_SCRIPT, nudge.message])

    const fired = new Nudge({ ...nudge.toJSON(), state: 'fired' })
    await this.nudgeStore.update(fired)

    return fired
  }
}
