#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';

/**
 * Ink POC Entry Point
 *
 * This is a proof-of-concept for migrating Atlas dashboard from blessed to Ink.
 *
 * Purpose:
 * - Validate that Ink can replicate core dashboard functionality
 * - Compare developer experience (blessed imperative vs React declarative)
 * - Assess performance and terminal compatibility
 *
 * To run:
 *   npx tsx src/cli/dashboard-ink/index.tsx
 */

const { waitUntilExit } = render(<App onExit={() => process.exit(0)} />);

waitUntilExit().then(() => {
  process.exit(0);
});
