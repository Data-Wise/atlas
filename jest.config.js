/**
 * Jest configuration for Atlas - ES modules
 */
export default {
  testEnvironment: 'node',
  transform: {},
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.js'],
  collectCoverageFrom: ['<rootDir>/src/**/*.js', '!<rootDir>/src/**/*.test.js'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  verbose: true,
  // Force exit after tests complete to prevent hanging on leaked timers
  forceExit: true
}
