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
      // Legacy blessed dashboard — unimported, superseded by the Ink dashboard
      // (src/cli/dashboard-ink/**). Its unused widget bindings are side-effecting
      // constructions; linting dead code we're removing adds only noise.
      'src/cli/dashboard-blessed.js',
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
      // Unused *args* and *caught errors* are intentional here: interface
      // stubs (domain/**/I*.js) and mock signatures name params to document
      // the contract, and `catch (e)` after an existence probe ignores `e`.
      // Unused imports / local vars are real dead code — keep warning on those.
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
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
