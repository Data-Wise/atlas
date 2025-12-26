/**
 * Config class tests
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Config } from '../../../src/utils/Config.js';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Config', () => {
  let tempDir;
  let config;

  beforeEach(async () => {
    tempDir = `/tmp/atlas-config-test-${Date.now()}`;
    await mkdir(tempDir, { recursive: true });
    config = new Config(tempDir);
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true });
    }
  });

  describe('load()', () => {
    it('returns default config when no file exists', async () => {
      const cfg = await config.load();
      expect(cfg.scanPaths).toBeDefined();
      expect(cfg.storage).toBe('filesystem');
      expect(cfg.preferences).toBeDefined();
    });

    it('merges saved config with defaults', async () => {
      await writeFile(
        join(tempDir, 'config.json'),
        JSON.stringify({ storage: 'sqlite' })
      );
      const cfg = await config.load();
      expect(cfg.storage).toBe('sqlite');
      expect(cfg.scanPaths).toBeDefined(); // from defaults
    });

    it('deep merges preferences', async () => {
      await writeFile(
        join(tempDir, 'config.json'),
        JSON.stringify({
          preferences: {
            adhd: { showStreak: false }
          }
        })
      );
      const cfg = await config.load();
      expect(cfg.preferences.adhd.showStreak).toBe(false);
      expect(cfg.preferences.adhd.showTimeCues).toBe(true); // from defaults
    });
  });

  describe('save()', () => {
    it('creates config directory if not exists', async () => {
      const newDir = join(tempDir, 'subdir');
      const newConfig = new Config(newDir);
      await newConfig.save({ test: true });
      expect(existsSync(join(newDir, 'config.json'))).toBe(true);
    });

    it('persists config to disk', async () => {
      await config.save({ storage: 'sqlite' });
      const data = await readFile(join(tempDir, 'config.json'), 'utf-8');
      const saved = JSON.parse(data);
      expect(saved.storage).toBe('sqlite');
    });
  });

  describe('get() / set()', () => {
    it('gets a config value', async () => {
      await config.save({ scanDepth: 5 });
      const value = await config.get('scanDepth');
      expect(value).toBe(5);
    });

    it('sets a config value', async () => {
      await config.set('storage', 'sqlite');
      const value = await config.get('storage');
      expect(value).toBe('sqlite');
    });
  });

  describe('scan paths', () => {
    it('adds a scan path', async () => {
      const paths = await config.addScanPath('/test/path');
      expect(paths).toContain('/test/path');
    });

    it('does not duplicate paths', async () => {
      await config.addScanPath('/test/path');
      const paths = await config.addScanPath('/test/path');
      const count = paths.filter(p => p === '/test/path').length;
      expect(count).toBe(1);
    });

    it('removes a scan path', async () => {
      await config.addScanPath('/test/path');
      const paths = await config.removeScanPath('/test/path');
      expect(paths).not.toContain('/test/path');
    });
  });

  describe('preferences', () => {
    it('gets a preference with dot notation', async () => {
      const value = await config.getPreference('adhd.showStreak');
      expect(value).toBe(true);
    });

    it('sets a preference with dot notation', async () => {
      await config.setPreference('adhd.showStreak', false);
      const value = await config.getPreference('adhd.showStreak');
      expect(value).toBe(false);
    });

    it('sets nested preferences that do not exist yet', async () => {
      await config.setPreference('custom.nested.value', 'test');
      const value = await config.getPreference('custom.nested.value');
      expect(value).toBe('test');
    });

    it('gets all preferences', async () => {
      const prefs = await config.getPreferences();
      expect(prefs.theme).toBeDefined();
      expect(prefs.adhd).toBeDefined();
      expect(prefs.session).toBeDefined();
      expect(prefs.dashboard).toBeDefined();
    });

    it('gets ADHD preferences', async () => {
      const adhd = await config.getADHDPreferences();
      expect(adhd.showStreak).toBeDefined();
      expect(adhd.flowThresholdMinutes).toBeDefined();
    });

    it('gets session preferences', async () => {
      const session = await config.getSessionPreferences();
      expect(session.pomodoroLength).toBe(25);
      expect(session.breakLength).toBe(5);
    });

    it('gets dashboard preferences', async () => {
      const dashboard = await config.getDashboardPreferences();
      expect(dashboard.refreshInterval).toBe(1000);
      expect(dashboard.zenMode).toBe(false);
    });

    it('resets preferences to defaults', async () => {
      await config.setPreference('theme', 'custom');
      await config.resetPreferences();
      const theme = await config.getPreference('theme');
      expect(theme).toBe('default');
    });
  });

  describe('export()', () => {
    it('exports config as formatted JSON', async () => {
      const json = await config.export();
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.preferences).toBeDefined();
    });
  });

  describe('static getDefaults()', () => {
    it('returns default configuration', () => {
      const defaults = Config.getDefaults();
      expect(defaults.scanPaths).toBeDefined();
      expect(defaults.preferences).toBeDefined();
      expect(defaults.preferences.adhd).toBeDefined();
    });

    it('returns a copy, not the original', () => {
      const defaults1 = Config.getDefaults();
      defaults1.storage = 'modified';
      const defaults2 = Config.getDefaults();
      expect(defaults2.storage).toBe('filesystem');
    });
  });
});
