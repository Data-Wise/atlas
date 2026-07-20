import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';
import { AtlasProvider } from './lib/AtlasContext.js';
// @ts-ignore — JS module without type declarations
import { Container } from '../../adapters/Container.js';
// @ts-ignore — JS module without type declarations
import { acquireLock, releaseLock } from '../../utils/atlasLock.js';

/**
 * Ink Dashboard Entry Point
 *
 * React-based terminal UI for Atlas project dashboard.
 * The sole dashboard implementation (the legacy blessed dashboards were removed in #94).
 *
 * The dashboard creates its own Container since it runs as a child process
 * (spawned via npx tsx). The AtlasProvider makes the container available
 * to all hooks via React Context.
 */

/**
 * Render and run the dashboard against a given Container, holding a process
 * lock (SPEC-xdg-config-migration §2) for the duration so `atlas migrate
 * --xdg --apply` can detect this long-running process and refuse rather
 * than move the data directory out from under it mid-session.
 */
async function startDashboard(container: any) {
  const configDir = container.config.dataDir;
  acquireLock(configDir, 'atlas dash');

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseLock(configDir);
  };
  const exit = () => {
    release();
    process.exit(0);
  };

  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);

  try {
    const { waitUntilExit } = render(
      <AtlasProvider container={container}>
        <App onExit={exit} />
      </AtlasProvider>
    );
    await waitUntilExit();
  } finally {
    release();
  }
}

/**
 * Run the Ink dashboard
 *
 * @param {Object} atlas - Atlas instance (container extracted if available)
 * @returns {Promise<void>}
 */
export async function runDashboard(atlas?: any) {
  const container = atlas?.container ?? new Container();
  await startDashboard(container);
}

// Allow direct execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  await startDashboard(new Container());
}
