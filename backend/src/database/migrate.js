/**
 * Database migration utility
 * Sets up database schema using raw SQL
 */

const fs = require('fs');
const path = require('path');
const { initializeDatabase, query, closeConnection } = require('../config/database');

/**
 * Run database migrations
 */
async function migrate() {
  try {
    console.log('🔄 Starting database migration...');

    // Initialize database connection
    initializeDatabase();

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing database schema...');
    await query(schemaSql);

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

/**
 * Drop all tables (use with caution!)
 */
async function dropTables() {
  try {
    console.log('🗑️  Dropping all tables...');

    // Initialize database connection
    initializeDatabase();

    const dropSql = `
      DROP TABLE IF EXISTS reactions CASCADE;
      DROP TABLE IF EXISTS media CASCADE;
      DROP TABLE IF EXISTS comments CASCADE;
      DROP TABLE IF EXISTS posts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    `;

    await query(dropSql);

    console.log('✅ All tables dropped successfully!');
  } catch (error) {
    console.error('❌ Failed to drop tables:', error);
    process.exit(1);
  }
}

/**
 * Reset database (drop and recreate)
 */
async function resetDatabase() {
  try {
    await dropTables();
    await migrate();
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Handle command line arguments
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      migrate().then(() => closeConnection());
      break;
    case 'drop':
      dropTables().then(() => closeConnection());
      break;
    case 'reset':
      resetDatabase();
      break;
    default:
      console.log('Usage: node migrate.js [migrate|drop|reset]');
      console.log('  migrate - Run database migrations');
      console.log('  drop    - Drop all tables');
      console.log('  reset   - Drop and recreate all tables');
      break;
  }
}

module.exports = {
  migrate,
  dropTables,
  resetDatabase
};