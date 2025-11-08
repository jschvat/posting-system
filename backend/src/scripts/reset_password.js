#!/usr/bin/env node

/**
 * CLI tool to reset a user's password
 * Usage: node backend/src/scripts/reset_password.js <username_or_email> [password]
 *
 * Examples:
 *   node backend/src/scripts/reset_password.js admin_alice test123
 *   node backend/src/scripts/reset_password.js alice@example.com test123
 *   node backend/src/scripts/reset_password.js admin_alice (defaults to test123)
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'posting_system',
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function resetPassword(identifier, newPassword = 'test123') {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Normalize identifier
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Find user by username or email
    console.log(`Looking for user: ${identifier}...`);
    const userResult = await client.query(
      'SELECT id, username, email, first_name, last_name FROM users WHERE username = $1 OR email = $2',
      [normalizedIdentifier, normalizedIdentifier]
    );

    if (userResult.rows.length === 0) {
      console.error(`\n❌ Error: User not found with identifier: ${identifier}`);
      console.log('\nTry one of these commands:');
      console.log('  node backend/src/scripts/reset_password.js <username>');
      console.log('  node backend/src/scripts/reset_password.js <email>');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✓ Found user: ${user.username} (${user.email})`);
    console.log(`  Name: ${user.first_name} ${user.last_name}`);
    console.log(`  ID: ${user.id}\n`);

    // Hash the new password
    console.log(`Hashing password...`);
    const bcryptRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);
    console.log(`✓ Password hashed\n`);

    // Update password
    console.log(`Updating password in database...`);
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.id]
    );

    console.log(`✓ Password updated successfully!\n`);
    console.log('═══════════════════════════════════════');
    console.log(`  Username: ${user.username}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${newPassword}`);
    console.log('═══════════════════════════════════════\n');
    console.log('You can now log in with these credentials.');

  } catch (error) {
    console.error('\n❌ Error resetting password:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node backend/src/scripts/reset_password.js <username_or_email> [password]');
  console.log('');
  console.log('Arguments:');
  console.log('  username_or_email   Username or email of the user to reset');
  console.log('  password            New password (optional, defaults to "test123")');
  console.log('');
  console.log('Examples:');
  console.log('  node backend/src/scripts/reset_password.js admin_alice');
  console.log('  node backend/src/scripts/reset_password.js alice@example.com');
  console.log('  node backend/src/scripts/reset_password.js admin_alice MyNewPass123');
  console.log('');
  process.exit(1);
}

const identifier = args[0];
const password = args[1] || 'test123';

// Run the password reset
resetPassword(identifier, password)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
