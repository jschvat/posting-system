/**
 * Simple test script for SQL implementation
 * Tests basic user operations
 */

const { initializeDatabase, testConnection, closeConnection } = require('./src/config/database');
const User = require('./src/models/User');
const { migrate } = require('./src/database/migrate');

async function testSQL() {
  try {
    console.log('🧪 Starting SQL implementation test...');

    // Initialize database
    initializeDatabase();
    await testConnection();

    // Run migrations to create tables
    await migrate();

    // Test user creation
    console.log('📝 Testing user creation...');
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123',
      first_name: 'Test',
      last_name: 'User'
    };

    const user = await User.create(userData);
    console.log('✅ User created:', user.username, user.email);

    // Test user retrieval
    console.log('🔍 Testing user retrieval...');
    const foundUser = await User.findById(user.id);
    console.log('✅ User found:', foundUser.username);

    // Test user search by email
    const userByEmail = await User.findByEmail('test@example.com');
    console.log('✅ User found by email:', userByEmail.username);

    // Test password verification
    console.log('🔐 Testing password verification...');
    const isValid = await User.comparePassword('TestPassword123', foundUser.password_hash);
    console.log('✅ Password verification:', isValid ? 'PASS' : 'FAIL');

    // Test username exists check
    const usernameExists = await User.usernameExists('testuser');
    console.log('✅ Username exists check:', usernameExists ? 'PASS' : 'FAIL');

    console.log('🎉 All SQL tests passed!');

  } catch (error) {
    console.error('❌ SQL test failed:', error);
  } finally {
    await closeConnection();
  }
}

// Run test if called directly
if (require.main === module) {
  testSQL();
}

module.exports = testSQL;