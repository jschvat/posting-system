/**
 * Database Backup Script
 * Creates a complete backup of the database structure and data
 */

const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'posting_system',
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function backupDatabase() {
  const timestamp = Date.now();
  const backupData = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    database: process.env.DB_NAME || 'posting_system',
    tables: {}
  };

  try {
    console.log('Starting database backup...');

    // Get all table names
    const tablesResult = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`Found ${tablesResult.rows.length} tables`);

    // For each table, get structure and data
    for (const { tablename } of tablesResult.rows) {
      console.log(`Backing up table: ${tablename}`);

      // Get table structure
      const structureResult = await pool.query(`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tablename]);

      // Get table data
      const dataResult = await pool.query(`SELECT * FROM ${tablename}`);

      // Get indexes
      const indexesResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = $1
      `, [tablename]);

      // Get constraints
      const constraintsResult = await pool.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = $1::regclass
      `, [`public.${tablename}`]);

      backupData.tables[tablename] = {
        structure: structureResult.rows,
        data: dataResult.rows,
        indexes: indexesResult.rows,
        constraints: constraintsResult.rows,
        rowCount: dataResult.rowCount
      };
    }

    // Get functions and triggers
    const functionsResult = await pool.query(`
      SELECT
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
    `);

    backupData.functions = functionsResult.rows;

    // Save to file
    const filename = `database_backup_${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup file: ${filename}`);
    console.log(`📊 Tables backed up: ${Object.keys(backupData.tables).length}`);
    console.log(`📝 Total rows: ${Object.values(backupData.tables).reduce((sum, t) => sum + t.rowCount, 0)}`);

    return filename;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run backup
backupDatabase()
  .then(filename => {
    console.log(`\nBackup saved to: ${filename}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
