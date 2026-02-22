import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';

/**
 * Ink Dashboard Entry Point
 *
 * React-based terminal UI for Atlas project dashboard.
 * Replaces the blessed-based dashboard with a modern, maintainable alternative.
 *
 * Features:
 * - All 7 views (BROWSE, DETAIL, FOCUS, ZEN, TIMELINE, ECOSYSTEM, PLAN)
 * - State machine for view transitions
 * - Keyboard navigation (j/k, Enter, f, z, T, e, p, q)
 * - 75% code reduction vs blessed version
 */

/**
 * Run the Ink dashboard
 *
 * @param {Object} atlas - Atlas container instance (not used in POC, uses mock data)
 * @returns {Promise<void>}
 */
export async function runDashboard(atlas) {
  const { waitUntilExit } = render(<App onExit={() => process.exit(0)} />);
  await waitUntilExit();
}

// Allow direct execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const { waitUntilExit } = render(<App onExit={() => process.exit(0)} />);
  await waitUntilExit();
}
