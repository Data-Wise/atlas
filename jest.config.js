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
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  verbose: true,
  // Force exit after tests complete to prevent hanging on leaked timers
  forceExit: true
}
