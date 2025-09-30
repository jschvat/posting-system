module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/setup.js',
    '<rootDir>/src/__tests__/testDb.js',
    '<rootDir>/src/__tests__/testHelpers.js'
  ],

  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/__tests__/**',
    '!src/server.js',
    '!src/migrations/**',
    '!src/seeders/**',
    '!**/node_modules/**'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles (useful for debugging)
  detectOpenHandles: false,

  // Transform configuration (if needed for ES6 modules)
  transform: {},

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined
};