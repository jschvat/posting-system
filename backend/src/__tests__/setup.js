/**
 * Test setup file
 * Configures the testing environment for Jest
 */

const { initTestDb, cleanTestDb } = require('./testDb');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';

// Set test timeouts
jest.setTimeout(30000);

// Initialize test database before all tests
beforeAll(async () => {
  console.log('Setup: Initializing test database...');
  await initTestDb();
  console.log('Setup: Test database initialized');
});

// Clean up after all tests
afterAll(async () => {
  await cleanTestDb();
}, 60000); // 60 second timeout for cleanup

// Mock console methods to reduce noise during tests (optional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}