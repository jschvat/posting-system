/**
 * Generate bcrypt hashes for test user passwords
 * Run: node generate_test_passwords.js
 */

const bcrypt = require('bcryptjs');

async function generateHashes() {
  const password = 'test123'; // Same password for all test users
  const rounds = 10;

  console.log('Generating password hash for:', password);
  console.log('Rounds:', rounds);
  console.log('');

  const hash = await bcrypt.hash(password, rounds);
  console.log('Hash:', hash);
  console.log('');
  console.log('Use this hash in your seed file:');
  console.log(`'${hash}'`);
}

generateHashes();
