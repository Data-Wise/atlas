/**
 * ESLint flat config for Atlas.
 *
 * NOTE: Atlas pins ESLint 8.57.x, where flat config is opt-in. The `lint`
 * npm script sets `ESLINT_USE_FLAT_CONFIG=true` so a bare `eslint` run loads
 * this file. On ESLint 9 (flat config by default) that env var becomes a
 * harmless no-op and can be dropped from the script.
 *
 * Scope: lints the plain-JS sources and tests only. The Ink dashboard's
 * TypeScript (`src/cli/dashboard-ink/**` .ts/.tsx) is ignored — linting it
 * would require the typescript-eslint parser, which is not a dependency.
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'docs/**',
      // TypeScript sources need a TS parser we don't depend on.
      '**/*.ts',
      '**/*.tsx',
    ],
  },

  // Base recommended rules for all JavaScript.
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Real signal, but the codebase has never been linted — surface as
      // warnings so `npm run lint` stays exit-0 while gaps get cleaned up.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Empty `catch {}` after an existence probe (fs.access) is an
      // intentional idiom here; still flag genuinely-empty blocks elsewhere.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Test files run under Jest; provide its globals (34 test files rely on
  // implicit describe/it/expect rather than importing @jest/globals).
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
];
