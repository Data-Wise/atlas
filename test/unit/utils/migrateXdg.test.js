/**
 * migrateToXdg() tests
 *
 * All tests stub HOME to an isolated temp dir (same discipline as
 * configPath.test.js) so the real ~/.atlas on the machine running these
 * tests is never touched.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { migrateToXdg } from '../../../src/utils/migrateXdg.js';
import { legacyConfigDir, xdgConfigDir, migrationMarkerPath } from '../../../src/utils/configPath.js';
import { acquireLock, releaseLock } from '../../../src/utils/atlasLock.js';

describe('migrateToXdg', () => {
  let tempHome;
  let savedEnv;

  beforeEach(async () => {
    tempHome = `/tmp/atlas-migratexdg-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await mkdir(tempHome, { recursive: true });

    savedEnv = {
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      ATLAS_CONFIG: process.env.ATLAS_CONFIG,
      ATLAS_DATA_DIR: process.env.ATLAS_DATA_DIR
    };
    process.env.HOME = tempHome;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.ATLAS_CONFIG;
    delete process.env.ATLAS_DATA_DIR;
  });

  afterEach(async () => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    releaseLock(legacyConfigDir());
    await rm(tempHome, { recursive: true, force: true });
  });

  async function seedLegacyData() {
    const legacy = legacyConfigDir();
    await mkdir(legacy, { recursive: true });
    await writeFile(join(legacy, 'config.json'), JSON.stringify({ storage: 'filesystem' }));
    await writeFile(join(legacy, 'projects.json'), JSON.stringify([{ id: 1 }]));
  }

  it('reports nothing to migrate when legacy dir does not exist', async () => {
    const result = await migrateToXdg({ apply: false, atlasVersion: '1.0.0' });
    expect(result.success).toBe(true);
    expect(result.alreadyDone).toBe(true);
    expect(result.message).toMatch(/Nothing to migrate/);
  });

  it('dry-run reports file count and byte size without moving anything', async () => {
    await seedLegacyData();
    const result = await migrateToXdg({ apply: false, atlasVersion: '1.0.0' });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.stats.fileCount).toBe(2);
    expect(existsSync(legacyConfigDir())).toBe(true);
    expect(existsSync(xdgConfigDir())).toBe(false);
  });

  it('--apply moves the directory and writes the migration marker last', async () => {
    await seedLegacyData();
    const result = await migrateToXdg({ apply: true, atlasVersion: '1.2.3' });

    expect(result.success).toBe(true);
    expect(existsSync(legacyConfigDir())).toBe(false);
    expect(existsSync(xdgConfigDir())).toBe(true);
    expect(existsSync(join(xdgConfigDir(), 'projects.json'))).toBe(true);

    const marker = JSON.parse(await readFile(migrationMarkerPath(xdgConfigDir()), 'utf-8'));
    expect(marker.from).toBe(legacyConfigDir());
    expect(marker.atlasVersion).toBe('1.2.3');
    expect(typeof marker.migratedAt).toBe('string');
  });

  it('reports already-migrated on a second run without touching anything', async () => {
    await seedLegacyData();
    await migrateToXdg({ apply: true, atlasVersion: '1.0.0' });

    // Simulate a stale leftover legacy dir alongside a completed migration.
    await mkdir(legacyConfigDir(), { recursive: true });

    const result = await migrateToXdg({ apply: true, atlasVersion: '1.0.0' });
    expect(result.success).toBe(true);
    expect(result.alreadyDone).toBe(true);
  });

  it('refuses --apply when the XDG target already exists, and --force does not override it', async () => {
    await seedLegacyData();
    await mkdir(xdgConfigDir(), { recursive: true }); // simulate a partial prior migration, no marker

    const withoutForce = await migrateToXdg({ apply: true, atlasVersion: '1.0.0' });
    expect(withoutForce.success).toBe(false);
    expect(withoutForce.message).toMatch(/already exists/);

    const withForce = await migrateToXdg({ apply: true, force: true, atlasVersion: '1.0.0' });
    expect(withForce.success).toBe(false);
    expect(withForce.message).toMatch(/already exists/);

    // Legacy data must still be untouched — the refusal is absolute.
    expect(existsSync(join(legacyConfigDir(), 'projects.json'))).toBe(true);
  });

  it('refuses --apply when a process lock is held, and --force overrides it', async () => {
    await seedLegacyData();
    acquireLock(legacyConfigDir(), 'atlas dash');

    const blocked = await migrateToXdg({ apply: true, atlasVersion: '1.0.0' });
    expect(blocked.success).toBe(false);
    expect(blocked.message).toMatch(/atlas dash is running/);
    expect(existsSync(legacyConfigDir())).toBe(true);

    const forced = await migrateToXdg({ apply: true, force: true, atlasVersion: '1.0.0' });
    expect(forced.success).toBe(true);
    expect(existsSync(xdgConfigDir())).toBe(true);
  });

  it('a stale lock (dead PID) does not block --apply even without --force', async () => {
    await seedLegacyData();
    // Write a lock referencing a PID that can't be alive.
    const { lockPath } = await import('../../../src/utils/atlasLock.js');
    await writeFile(lockPath(legacyConfigDir()), JSON.stringify({ pid: 999999, process: 'atlas-mcp', startedAt: new Date().toISOString() }));

    const result = await migrateToXdg({ apply: true, atlasVersion: '1.0.0' });
    expect(result.success).toBe(true);
  });
});
