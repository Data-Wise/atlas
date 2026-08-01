/**
 * Interface for persisting Nudges to the shared cross-surface guards file.
 * Implementations should be in the adapters/gateways layer.
 *
 * Deliberately a gateway, not a repository: repository accessors in
 * Container.js branch on the configured storage backend (FileSystem vs
 * SQLite), but Nudge state must live in guards.json regardless of backend —
 * that file is the cross-surface contract other tools read. A
 * SQLiteNudgeStore could never legitimately exist, so the repository
 * abstraction would be a lie. See SPEC Design §1.
 */
export class INudgeStore {
  /**
   * Persist a new Nudge.
   * @param {import('../entities/Nudge.js').Nudge} nudge
   * @returns {Promise<import('../entities/Nudge.js').Nudge>} The persisted nudge
   */
  async add(nudge) { throw new Error('Not implemented') }

  /**
   * Fetch a single Nudge by id.
   * @param {string} id
   * @returns {Promise<import('../entities/Nudge.js').Nudge|null>} The nudge, or null if absent
   */
  async get(id) { throw new Error('Not implemented') }

  /**
   * List all persisted Nudges.
   * @param {Object} [options]
   * @param {boolean} [options.outstandingOnly] - Exclude acked nudges
   * @returns {Promise<Array<import('../entities/Nudge.js').Nudge>>}
   */
  async list(options) { throw new Error('Not implemented') }

  /**
   * Replace an existing Nudge, matched by id.
   * @param {import('../entities/Nudge.js').Nudge} nudge
   * @returns {Promise<import('../entities/Nudge.js').Nudge>} The updated nudge
   */
  async update(nudge) { throw new Error('Not implemented') }

  /**
   * Delete a Nudge by id.
   * @param {string} id
   * @returns {Promise<boolean>} True if a nudge was removed, false if absent
   */
  async remove(id) { throw new Error('Not implemented') }
}
