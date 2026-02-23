import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';
import { AtlasProvider } from './lib/AtlasContext.js';
// @ts-ignore — JS module without type declarations
import { Container } from '../../adapters/Container.js';

/**
 * Ink Dashboard Entry Point
 *
 * React-based terminal UI for Atlas project dashboard.
 * Replaces the blessed-based dashboard with a modern, maintainable alternative.
 *
 * The dashboard creates its own Container since it runs as a child process
 * (spawned via npx tsx). The AtlasProvider makes the container available
 * to all hooks via React Context.
 */

/**
 * Run the Ink dashboard
 *
 * @param {Object} atlas - Atlas instance (container extracted if available)
 * @returns {Promise<void>}
 */
export async function runDashboard(atlas?: any) {
  const container = atlas?.container ?? new Container();
  const { waitUntilExit } = render(
    <AtlasProvider container={container}>
      <App onExit={() => process.exit(0)} />
    </AtlasProvider>
  );
  await waitUntilExit();
}

// Allow direct execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const container = new Container();
  const { waitUntilExit } = render(
    <AtlasProvider container={container}>
      <App onExit={() => process.exit(0)} />
    </AtlasProvider>
  );
  await waitUntilExit();
}
