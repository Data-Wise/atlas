import { mkdtemp, readFile, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  GuardsFileNudgeStore,
  resolveGuardsFile
} from '../../../../src/adapters/gateways/GuardsFileNudgeStore.js'
import { Nudge } from '../../../../src/domain/entities/Nudge.js'

/**
 * A realistic guards.json as cc-config writes it. The guard entries here are
 * the thing this gateway must never disturb.
 */
const EXISTING_GUARDS = {
  guards: {
    'branch-guard': { enabled: true, muted_until: '2026-07-24T00:39:40Z', mute_window_min: 30 },
    'no-switch-guard': { enabled: true, muted_until: null, mute_window_min: 30 },
    'reference-scope-guard': { enabled: true, muted_until: null, mute_window_min: 30 }
  }
}

describe('GuardsFileNudgeStore', () => {
  let dir
  let guardsFile
  let store

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'atlas-guards-'))
    guardsFile = join(dir, 'guards.json')
    store = new GuardsFileNudgeStore(guardsFile)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  const seedGuards = () => writeFile(guardsFile, `${JSON.stringify(EXISTING_GUARDS, null, 2)}\n`)
  const readRaw = async () => JSON.parse(await readFile(guardsFile, 'utf8'))
  const makeNudge = (overrides = {}) =>
    new Nudge({ time: '23:00', message: 'wrap up', ...overrides })

  describe('concurrent writers', () => {
    it('never loses a write when two operations race on the same guards.json', async () => {
      // Regression for the unlocked-read-modify-write finding: a launchd
      // fire (state update) racing an interactive `nudge add`/`ack` used to
      // be able to silently clobber one write with a stale copy of the
      // rest of the file. Fire off several concurrent operations against
      // the SAME store instance and the same file — every one of them
      // must survive.
      const nudges = Array.from({ length: 8 }, (_, i) => makeNudge({ id: `ndg_race_${i}` }))

      await Promise.all(nudges.map((n) => store.add(n)))

      const persisted = await store.list()
      expect(persisted.map((n) => n.id).sort()).toEqual(nudges.map((n) => n.id).sort())
    })

    it('never loses a concurrent update racing an add', async () => {
      const base = makeNudge({ id: 'ndg_base' })
      await store.add(base)

      const other = makeNudge({ id: 'ndg_other' })
      const updated = new Nudge({ ...base.toJSON(), state: 'fired' })

      await Promise.all([store.add(other), store.update(updated)])

      const persisted = await store.list()
      expect(persisted.find((n) => n.id === 'ndg_other')).toBeTruthy()
      expect(persisted.find((n) => n.id === 'ndg_base').state).toBe('fired')
    })
  })

  describe('guard-key isolation', () => {
    it('leaves the guards key byte-for-byte identical across a full lifecycle', async () => {
      await seedGuards()
      const before = JSON.stringify((await readRaw()).guards)

      const nudge = makeNudge({ id: 'ndg_lifecycle' })
      await store.add(nudge)
      await store.update(new Nudge({ ...nudge.toJSON(), state: 'fired' }))
      await store.update(new Nudge({ ...nudge.toJSON(), state: 'acked' }))
      await store.remove('ndg_lifecycle')

      expect(JSON.stringify((await readRaw()).guards)).toBe(before)
    })

    it('preserves unknown top-level keys written by other tools', async () => {
      await writeFile(
        guardsFile,
        `${JSON.stringify({ ...EXISTING_GUARDS, someFutureTool: { a: 1 } }, null, 2)}\n`
      )

      await store.add(makeNudge())

      const data = await readRaw()
      expect(data.someFutureTool).toEqual({ a: 1 })
      expect(data.guards).toEqual(EXISTING_GUARDS.guards)
    })

    it('preserves sibling keys under nudges other than wall-clock', async () => {
      await writeFile(
        guardsFile,
        `${JSON.stringify({ ...EXISTING_GUARDS, nudges: { 'session-scoped': [{ x: 1 }] } }, null, 2)}\n`
      )

      await store.add(makeNudge())

      const data = await readRaw()
      expect(data.nudges['session-scoped']).toEqual([{ x: 1 }])
      expect(data.nudges['wall-clock']).toHaveLength(1)
    })
  })

  describe('add', () => {
    it('creates the file when guards.json does not exist yet', async () => {
      const nudge = await store.add(makeNudge())
      const data = await readRaw()
      expect(data.nudges['wall-clock']).toHaveLength(1)
      expect(data.nudges['wall-clock'][0].id).toBe(nudge.id)
    })

    it('rejects a duplicate id', async () => {
      await store.add(makeNudge({ id: 'ndg_dup' }))
      await expect(store.add(makeNudge({ id: 'ndg_dup' }))).rejects.toThrow(/already exists/)
    })
  })

  describe('get', () => {
    it('returns a hydrated Nudge instance, not a plain object', async () => {
      await store.add(makeNudge({ id: 'ndg_get' }))
      const found = await store.get('ndg_get')
      expect(found).toBeInstanceOf(Nudge)
      expect(found.launchdLabel).toBe('com.data-wise.atlas-nudge.ndg_get')
    })

    it('returns null for an unknown id', async () => {
      await seedGuards()
      expect(await store.get('ndg_missing')).toBeNull()
    })
  })

  describe('list', () => {
    it('returns an empty array when the file is absent', async () => {
      expect(await store.list()).toEqual([])
    })

    it('returns an empty array when the file exists but has no nudges', async () => {
      await seedGuards()
      expect(await store.list()).toEqual([])
    })

    it('filters acked nudges when outstandingOnly is set', async () => {
      await store.add(makeNudge({ id: 'ndg_a', state: 'pending' }))
      await store.add(makeNudge({ id: 'ndg_b', state: 'fired' }))
      await store.add(makeNudge({ id: 'ndg_c', state: 'acked' }))

      expect(await store.list()).toHaveLength(3)
      const outstanding = await store.list({ outstandingOnly: true })
      expect(outstanding.map((n) => n.id)).toEqual(['ndg_a', 'ndg_b'])
    })
  })

  describe('update', () => {
    it('replaces the matching record and persists the new state', async () => {
      const nudge = await store.add(makeNudge({ id: 'ndg_up' }))
      await store.update(new Nudge({ ...nudge.toJSON(), state: 'fired' }))
      expect((await store.get('ndg_up')).state).toBe('fired')
    })

    it('throws for an unknown id rather than silently inserting', async () => {
      await expect(store.update(makeNudge({ id: 'ndg_ghost' }))).rejects.toThrow(/not found/)
    })
  })

  describe('remove', () => {
    it('returns true and deletes the record', async () => {
      await store.add(makeNudge({ id: 'ndg_rm' }))
      expect(await store.remove('ndg_rm')).toBe(true)
      expect(await store.get('ndg_rm')).toBeNull()
    })

    it('returns false for an unknown id', async () => {
      await seedGuards()
      expect(await store.remove('ndg_nope')).toBe(false)
    })
  })

  describe('malformed file handling', () => {
    it('refuses to overwrite an unparseable guards.json', async () => {
      await writeFile(guardsFile, '{ this is not json')
      await expect(store.add(makeNudge())).rejects.toThrow(/Refusing to overwrite/)
      // The original bytes must survive the failed write.
      expect(await readFile(guardsFile, 'utf8')).toBe('{ this is not json')
    })

    it('treats an empty file as empty state rather than an error', async () => {
      await writeFile(guardsFile, '')
      await expect(store.add(makeNudge())).resolves.toBeDefined()
    })
  })

  describe('resolveGuardsFile', () => {
    const original = { ...process.env }
    afterEach(() => {
      process.env = { ...original }
    })

    it('prefers ATLAS_GUARDS_FILE above all else', () => {
      process.env.ATLAS_GUARDS_FILE = '/tmp/override.json'
      process.env.CLAUDE_CONFIG_DIR = '/tmp/claude'
      expect(resolveGuardsFile()).toBe('/tmp/override.json')
    })

    it('falls back to CLAUDE_CONFIG_DIR', () => {
      delete process.env.ATLAS_GUARDS_FILE
      process.env.CLAUDE_CONFIG_DIR = '/tmp/claude'
      expect(resolveGuardsFile()).toBe('/tmp/claude/guards.json')
    })

    it('defaults to ~/.claude/guards.json — never atlas own config dir', () => {
      delete process.env.ATLAS_GUARDS_FILE
      delete process.env.CLAUDE_CONFIG_DIR
      // Deliberately NOT resolveConfigDir(): relocating atlas's config must
      // not move the shared cross-surface file. See SPEC Design §1.
      expect(resolveGuardsFile()).toMatch(/\.claude\/guards\.json$/)
      expect(resolveGuardsFile()).not.toMatch(/\.atlas/)
    })
  })
})
