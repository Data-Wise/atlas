/**
 * DoctorUseCase — XDG migration integration (SPEC-xdg-config-migration-2026-07-19 §4)
 *
 * fileExists is injected (same pattern as the rest of this suite), so these
 * tests never touch the real filesystem or the machine's real ~/.atlas —
 * legacyConfigDir()/xdgConfigDir() compute real path strings from the real
 * process.env.HOME, but whether those paths "exist" is entirely controlled
 * by the injected fileExists fake.
 */
import { describe, test, expect } from '@jest/globals'
import { DoctorUseCase } from '../../../../src/use-cases/registry/DoctorUseCase.js'
import { legacyConfigDir, xdgConfigDir, migrationMarkerPath } from '../../../../src/utils/configPath.js'

const repoOf = (projects) => ({ findAll: async () => projects })

describe('DoctorUseCase — XDG migration', () => {
  test('execute(): no hint when legacy dir does not exist (fresh/already-migrated install)', async () => {
    const uc = new DoctorUseCase({ projectRepository: repoOf([]), fileExists: () => false })
    const { xdgHint } = await uc.execute()
    expect(xdgHint).toBeNull()
  })

  test('execute(): no hint when a migration marker already exists at the XDG path', async () => {
    const present = new Set([legacyConfigDir(), migrationMarkerPath(xdgConfigDir())])
    const uc = new DoctorUseCase({ projectRepository: repoOf([]), fileExists: (p) => present.has(p) })
    const { xdgHint } = await uc.execute()
    expect(xdgHint).toBeNull()
  })

  test('execute(): surfaces an informational hint when legacy exists with no marker', async () => {
    const present = new Set([legacyConfigDir()])
    const uc = new DoctorUseCase({ projectRepository: repoOf([]), fileExists: (p) => present.has(p) })
    const { xdgHint } = await uc.execute()
    expect(xdgHint).toMatch(/migrate --xdg/)
    expect(xdgHint).toMatch(/no rush/i)
  })

  test('fix() preview (no --write): adds an xdg-migration action, does not call migrateToXdgFn', async () => {
    const present = new Set([legacyConfigDir()])
    let called = false
    const uc = new DoctorUseCase({
      projectRepository: repoOf([]),
      fileExists: (p) => present.has(p),
      migrateToXdgFn: async () => { called = true; return { success: true, message: 'should not be called' } }
    })
    const { actions, wrote } = await uc.fix({})
    expect(wrote).toBe(false)
    expect(called).toBe(false)
    const xdgAction = actions.find(a => a.type === 'xdg-migration')
    expect(xdgAction).toBeDefined()
    expect(xdgAction.written).toBe(false)
    expect(xdgAction.from).toBe(legacyConfigDir())
    expect(xdgAction.to).toBe(xdgConfigDir())
  })

  test('fix({ write: true }): calls the guarded migrateToXdgFn and reports success', async () => {
    const present = new Set([legacyConfigDir()])
    const uc = new DoctorUseCase({
      projectRepository: repoOf([]),
      fileExists: (p) => present.has(p),
      migrateToXdgFn: async (opts) => {
        expect(opts.apply).toBe(true)
        return { success: true, message: 'Moved your atlas data to /fake/xdg/path.' }
      }
    })
    const { actions } = await uc.fix({ write: true })
    const xdgAction = actions.find(a => a.type === 'xdg-migration')
    expect(xdgAction.written).toBe(true)
    expect(xdgAction.skipped).toBe(false)
  })

  test('fix({ write: true }): a guard refusal (e.g. lock held) is reported as skipped, not thrown', async () => {
    const present = new Set([legacyConfigDir()])
    const uc = new DoctorUseCase({
      projectRepository: repoOf([]),
      fileExists: (p) => present.has(p),
      migrateToXdgFn: async () => ({ success: false, message: 'atlas dash is running (pid 123) — close it and try again.' })
    })
    const { actions } = await uc.fix({ write: true })
    const xdgAction = actions.find(a => a.type === 'xdg-migration')
    expect(xdgAction.written).toBe(false)
    expect(xdgAction.skipped).toBe(true)
    expect(xdgAction.detail).toMatch(/atlas dash is running/)
  })

  test('fix(): no xdg-migration action at all once already migrated', async () => {
    const present = new Set([legacyConfigDir(), migrationMarkerPath(xdgConfigDir())])
    const uc = new DoctorUseCase({ projectRepository: repoOf([]), fileExists: (p) => present.has(p) })
    const { actions } = await uc.fix({})
    expect(actions.find(a => a.type === 'xdg-migration')).toBeUndefined()
  })

  test('fix(): per-project claude-md actions carry the type discriminator too', async () => {
    const projects = [{ name: 'no-claude', path: '/p/no-claude' }]
    const present = new Set(['/p/no-claude', '/p/no-claude/.STATUS'])
    const uc = new DoctorUseCase({ projectRepository: repoOf(projects), fileExists: (p) => present.has(p) })
    const { actions } = await uc.fix({})
    const claudeAction = actions.find(a => a.type === 'claude-md')
    expect(claudeAction).toBeDefined()
    expect(claudeAction.project).toBe('no-claude')
  })
})
