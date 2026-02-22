/**
 * Jest configuration for Atlas - ES modules
 */
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {}],
  },
  rootDir: '.',
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js',
    '<rootDir>/src/**/*.tsx',
    '!<rootDir>/src/**/*.test.js',
    '!<rootDir>/src/**/*.test.tsx',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: ['/node_modules/'],
  // Transform ESM-only packages but skip blessed (has legacy octal escapes that break SWC strict mode)
  transformIgnorePatterns: [
    '/node_modules/(?!.*/(ink|ink-testing-library|cli-truncate|slice-ansi|string-width|wrap-ansi|ansi-regex|ansi-escapes|ansi-styles|emoji-regex|is-fullwidth-code-point|cli-boxes|yoga-layout|yoga-wasm-web|ws|widest-line|chalk|strip-ansi|type-fest|environment)/)(?!.*\\.mjs$)',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  verbose: true,
  // Force exit after tests complete to prevent hanging on leaked timers
  forceExit: true
}
