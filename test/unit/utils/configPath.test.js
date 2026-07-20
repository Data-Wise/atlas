/**
 * resolveConfigDir() precedence tests
 *
 * All tests stub HOME to an isolated temp dir so real ~/.atlas / ~/.config
 * on the machine running these tests never leaks into the result — per
 * docs/specs/SPEC-xdg-config-migration-2026-07-19.md's CI-isolation decision
 * (ledger #18): trust nothing about the ambient environment.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  resolveConfigDir,
  legacyConfigDir,
  xdgConfigDir,
  migrationMarkerPath,
  MIGRATION_MARKER_FILENAME
} from '../../../src/utils/configPath.js';

describe('resolveConfigDir', () => {
  let tempHome;
  let savedEnv;

  beforeEach(async () => {
    tempHome = `/tmp/atlas-configpath-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    await rm(tempHome, { recursive: true, force: true });
  });

  it('prefers ATLAS_CONFIG over everything else', async () => {
    await mkdir(join(tempHome, '.atlas'), { recursive: true });
    process.env.ATLAS_CONFIG = '/tmp/from-config-env';
    process.env.ATLAS_DATA_DIR = '/tmp/from-data-env';
    expect(resolveConfigDir()).toBe('/tmp/from-config-env');
  });

  it('falls back to ATLAS_DATA_DIR when ATLAS_CONFIG is unset', () => {
    process.env.ATLAS_DATA_DIR = '/tmp/from-data-env';
    expect(resolveConfigDir()).toBe('/tmp/from-data-env');
  });

  it('resolves to the XDG default when neither legacy nor env vars exist (fresh install)', () => {
    expect(resolveConfigDir()).toBe(xdgConfigDir());
    expect(resolveConfigDir()).toBe(join(tempHome, '.config', 'atlas'));
  });

  it('honors XDG_CONFIG_HOME when set, for a fresh install', () => {
    process.env.XDG_CONFIG_HOME = join(tempHome, 'custom-xdg');
    expect(resolveConfigDir()).toBe(join(tempHome, 'custom-xdg', 'atlas'));
  });

  it('keeps resolving to legacy ~/.atlas when it exists and no migration marker is present', async () => {
    await mkdir(legacyConfigDir(), { recursive: true });
    expect(resolveConfigDir()).toBe(legacyConfigDir());
  });

  it('resolves to XDG once the migration marker exists, even though legacy still exists too', async () => {
    await mkdir(legacyConfigDir(), { recursive: true });
    const xdg = xdgConfigDir();
    await mkdir(xdg, { recursive: true });
    await writeFile(migrationMarkerPath(xdg), JSON.stringify({ from: legacyConfigDir() }));

    expect(resolveConfigDir()).toBe(xdg);
  });

  it('an XDG dir existing WITHOUT a marker does not shadow legacy data (the bug this design avoids)', async () => {
    await mkdir(legacyConfigDir(), { recursive: true });
    await mkdir(xdgConfigDir(), { recursive: true }); // e.g. a stray/unrelated mkdir, no marker

    expect(resolveConfigDir()).toBe(legacyConfigDir());
  });

  it('migrationMarkerPath uses the documented filename', () => {
    expect(migrationMarkerPath('/some/dir')).toBe(`/some/dir/${MIGRATION_MARKER_FILENAME}`);
  });
});
