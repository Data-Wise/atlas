import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LaunchdNudgeScheduler, buildPlist } from '../../../../src/adapters/gateways/LaunchdNudgeScheduler.js'
import { Nudge } from '../../../../src/domain/entities/Nudge.js'

/** Builds an execFileFn stub keyed by launchctl subcommand (args[0]). */
function fakeExecFile(handlers) {
  return jest.fn(async (cmd, args) => {
    const handler = handlers[args[0]]
    if (!handler) return { stdout: '', stderr: '' }
    const result = handler(cmd, args)
    if (result instanceof Error) throw result
    return result
  })
}

describe('buildPlist', () => {
  const params = {
    label: 'com.data-wise.atlas-nudge.ndg_x',
    nodePath: '/opt/homebrew/bin/node',
    atlasBinPath: '/opt/atlas/bin/atlas.js',
    nudgeId: 'ndg_x',
    schedule: { hour: 23, minute: 0 }
  }

  it('includes Day/Month/Year for a one-shot nudge (fires exactly once)', () => {
    const xml = buildPlist({ ...params, daily: false })
    expect(xml).toContain('<key>Day</key>')
    expect(xml).toContain('<key>Month</key>')
    expect(xml).toContain('<key>Year</key>')
  })

  it('omits Day/Month/Year for a --daily nudge (launchd repeats it every day)', () => {
    const xml = buildPlist({ ...params, daily: true })
    expect(xml).not.toContain('<key>Day</key>')
    expect(xml).not.toContain('<key>Month</key>')
    expect(xml).not.toContain('<key>Year</key>')
  })

  it('invokes "atlas nudge fire <id>" as ProgramArguments, not a shell string', () => {
    const xml = buildPlist({ ...params, daily: false })
    expect(xml).toContain('<string>/opt/atlas/bin/atlas.js</string>')
    expect(xml).toContain('<string>nudge</string>')
    expect(xml).toContain('<string>fire</string>')
    expect(xml).toContain('<string>ndg_x</string>')
  })

  it('invokes the node binary directly (not via the shebang) so launchd\'s minimal PATH cannot fail to resolve it', () => {
    // Root cause of the first live E2E failure: launchd's default PATH is
    // just /usr/bin:/bin:/usr/sbin:/sbin. `#!/usr/bin/env node` can't
    // resolve a Homebrew/nvm-installed node from there, so the job exits
    // 127 before ever running atlas.js. Passing the resolved node path as
    // ProgramArguments[0] sidesteps PATH resolution entirely.
    const xml = buildPlist({ ...params, daily: false })
    const programArgsMatch = xml.match(/<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/)
    const strings = [...programArgsMatch[1].matchAll(/<string>(.*?)<\/string>/g)].map((m) => m[1])
    expect(strings).toEqual(['/opt/homebrew/bin/node', '/opt/atlas/bin/atlas.js', 'nudge', 'fire', 'ndg_x'])
  })

  it('includes the correct hour/minute', () => {
    const xml = buildPlist({ ...params, schedule: { hour: 9, minute: 5 }, daily: true })
    expect(xml).toContain('<integer>9</integer>')
    expect(xml).toContain('<integer>5</integer>')
  })
})

describe('LaunchdNudgeScheduler', () => {
  let dir
  const nudge = new Nudge({ id: 'ndg_sched', time: '23:00', message: 'wrap up' })
  const plistFile = () => join(dir, `${nudge.launchdLabel}.plist`)

  const makeScheduler = (execFileFn) =>
    new LaunchdNudgeScheduler({ atlasBinPath: '/opt/atlas/bin/atlas.js', launchAgentsDir: dir, execFileFn })

  beforeEach(async () => {
    // NEVER omit launchAgentsDir in a test — the real default is the live
    // ~/Library/LaunchAgents directory the actual OS launchd reads.
    dir = await mkdtemp(join(tmpdir(), 'atlas-launchagents-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  describe('schedule', () => {
    it('writes the plist and loads the job, verifying via launchctl list before resolving', async () => {
      const execFileFn = fakeExecFile({
        load: () => ({ stdout: '', stderr: '' }),
        list: () => ({ stdout: `-\t0\t${nudge.launchdLabel}\n`, stderr: '' })
      })
      const scheduler = makeScheduler(execFileFn)

      await expect(scheduler.schedule(nudge)).resolves.toBeUndefined()

      expect(existsSync(plistFile())).toBe(true)
      expect(await readFile(plistFile(), 'utf8')).toContain(nudge.launchdLabel)

      const loadCall = execFileFn.mock.calls.find(([, args]) => args[0] === 'load')
      expect(loadCall[0]).toBe('launchctl')
      expect(loadCall[1]).toEqual(['load', plistFile()])
    })

    it('rolls back the plist when launchctl load itself fails', async () => {
      const execFileFn = fakeExecFile({
        load: () => new Error('Load failed: 5: Input/output error')
      })
      const scheduler = makeScheduler(execFileFn)

      await expect(scheduler.schedule(nudge)).rejects.toThrow(/launchctl load failed/)
      expect(existsSync(plistFile())).toBe(false)
    })

    it('rolls back when load "succeeds" but launchctl list never shows the job', async () => {
      // The failure mode the adversarial review specifically flagged: a
      // silent load failure that would otherwise leave `nudge ls` showing a
      // reminder that never fires.
      const execFileFn = fakeExecFile({
        load: () => ({ stdout: '', stderr: '' }),
        list: () => ({ stdout: 'nothing relevant here\n', stderr: '' })
      })
      const scheduler = makeScheduler(execFileFn)

      await expect(scheduler.schedule(nudge)).rejects.toThrow(/not listed as loaded/)
      expect(existsSync(plistFile())).toBe(false)
    })
  })

  describe('unschedule', () => {
    it('unloads and deletes the plist, never throwing even if nothing was loaded', async () => {
      const execFileFn = fakeExecFile({ unload: () => new Error('No such process') })
      const scheduler = makeScheduler(execFileFn)

      await expect(scheduler.unschedule(nudge)).resolves.toBeUndefined()
      expect(existsSync(plistFile())).toBe(false)
    })

    it('deletes an existing plist after unload succeeds', async () => {
      const execFileFn = fakeExecFile({
        load: () => ({ stdout: '', stderr: '' }),
        list: () => ({ stdout: `-\t0\t${nudge.launchdLabel}\n`, stderr: '' }),
        unload: () => ({ stdout: '', stderr: '' })
      })
      const scheduler = makeScheduler(execFileFn)
      await scheduler.schedule(nudge)
      expect(existsSync(plistFile())).toBe(true)

      await scheduler.unschedule(nudge)
      expect(existsSync(plistFile())).toBe(false)
    })
  })

  describe('isLoaded', () => {
    it('reflects launchctl list output', async () => {
      const scheduler = makeScheduler(fakeExecFile({
        list: () => ({ stdout: `-\t0\t${nudge.launchdLabel}\n`, stderr: '' })
      }))
      expect(await scheduler.isLoaded(nudge.launchdLabel)).toBe(true)
    })

    it('returns false when launchctl itself errors', async () => {
      const scheduler = makeScheduler(fakeExecFile({
        list: () => new Error('launchctl not found')
      }))
      expect(await scheduler.isLoaded(nudge.launchdLabel)).toBe(false)
    })
  })
})
