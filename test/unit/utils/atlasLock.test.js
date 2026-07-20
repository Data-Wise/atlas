/**
 * atlasLock — process-lock helper tests
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { acquireLock, releaseLock, checkLock, lockPath } from '../../../src/utils/atlasLock.js';

describe('atlasLock', () => {
  const configDir = '/tmp/atlas-lock-test-dir';

  afterEach(() => {
    releaseLock(configDir);
  });

  it('checkLock returns null when no lock exists', () => {
    expect(checkLock(configDir)).toBeNull();
  });

  it('acquireLock writes a lock that checkLock finds, keyed by the calling process', () => {
    acquireLock(configDir, 'atlas-mcp');
    const lock = checkLock(configDir);
    expect(lock).not.toBeNull();
    expect(lock.pid).toBe(process.pid);
    expect(lock.process).toBe('atlas-mcp');
  });

  it('releaseLock removes the lock', () => {
    acquireLock(configDir, 'atlas dash');
    expect(checkLock(configDir)).not.toBeNull();
    releaseLock(configDir);
    expect(checkLock(configDir)).toBeNull();
  });

  it('releaseLock is a no-op when no lock exists (does not throw)', () => {
    expect(() => releaseLock(configDir)).not.toThrow();
  });

  it('treats a lock referencing a dead PID as stale (not locked)', () => {
    // A PID essentially guaranteed not to be running.
    const deadPid = 999999;
    writeFileSync(lockPath(configDir), JSON.stringify({
      pid: deadPid,
      process: 'atlas-mcp',
      startedAt: new Date().toISOString()
    }));

    expect(checkLock(configDir)).toBeNull();
  });

  it('different configDirs hash to different lock paths', () => {
    expect(lockPath('/tmp/a')).not.toBe(lockPath('/tmp/b'));
  });

  it('checkLock tolerates a malformed lock file rather than throwing', () => {
    writeFileSync(lockPath(configDir), 'not json');
    expect(() => checkLock(configDir)).not.toThrow();
    expect(checkLock(configDir)).toBeNull();
  });
});
