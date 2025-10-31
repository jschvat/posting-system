#!/usr/bin/env node
/**
 * Modular Seed Script Generator
 * Exports current database data into separate, loadable seed scripts
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const SEEDS_DIR = path.join(__dirname, 'seeds');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  database: process.env.DB_NAME || 'posting_system'
});

// Define seed sections with their tables in dependency order
const SEED_SECTIONS = {
  '01_users': {
    description: 'User accounts and profiles',
    tables: ['users', 'user_stats', 'user_reputation', 'location_history']
  },
  '02_follows': {
    description: 'Follow relationships between users',
    tables: ['follows']
  },
  '03_posts': {
    description: 'User posts and associated data',
    tables: ['posts', 'media', 'reactions', 'shares', 'comments', 'comment_interactions', 'comment_metrics', 'poll_options', 'poll_votes']
  },
  '04_groups': {
    description: 'Groups, memberships, and group content',
    tables: ['groups', 'group_memberships', 'group_invitations', 'group_posts', 'group_post_media', 'group_comments', 'group_comment_media', 'group_votes', 'group_activity_log']
  },
  '05_messaging': {
    description: 'Conversations and messages',
    tables: ['conversations', 'conversation_participants', 'messages', 'message_reads', 'message_reactions', 'typing_indicators']
  },
  '06_notifications': {
    description: 'Notifications and preferences',
    tables: ['notifications', 'notification_preferences', 'notification_batches']
  },
  '07_ratings': {
    description: 'User ratings and reports',
    tables: ['user_ratings', 'rating_reports', 'helpful_marks']
  }
};

function escapeSQL(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'ARRAY[]::text[]';
    const items = value.map(v => escapeSQL(v)).join(',');
    return `ARRAY[${items}]`;
  }
  // String - escape single quotes
  return `'${value.toString().replace(/'/g, "''")}'`;
}

function generateInsertStatement(tableName, rows) {
  if (!rows || rows.length === 0) {
    return `-- No data for ${tableName}\n`;
  }

  const columns = Object.keys(rows[0]);
  let sql = `-- Insert data into ${tableName} (${rows.length} rows)\n`;
  sql += `INSERT INTO ${tableName} (${columns.join(', ')})\nVALUES\n`;

  const valueRows = rows.map((row, idx) => {
    const values = columns.map(col => escapeSQL(row[col])).join(', ');
    const comma = idx < rows.length - 1 ? ',' : ';';
    return `  (${values})${comma}`;
  });

  sql += valueRows.join('\n') + '\n';

  // Add sequence update if table has an id column
  if (columns.includes('id')) {
    const maxId = Math.max(...rows.map(r => r.id || 0));
    sql += `SELECT setval('${tableName}_id_seq', ${maxId}, true);\n`;
  }

  return sql + '\n';
}

async function exportTableData(tableName) {
  try {
    const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY id`);
    return result.rows;
  } catch (error) {
    console.warn(`Warning: Could not export ${tableName}: ${error.message}`);
    return [];
  }
}

async function generateSeedFile(sectionKey, section) {
  console.log(`\nGenerating seed file: ${sectionKey}`);

  let sql = `-- ============================================================================
-- SEED SCRIPT: ${section.description}
-- ============================================================================
-- Generated: ${new Date().toISOString()}
--
-- Tables included:
${section.tables.map(t => `--   - ${t}`).join('\n')}
--
-- Usage:
--   psql -U <user> -d <database> -f ${sectionKey}.sql
--
-- Note: Run these scripts in numerical order (01, 02, 03, etc.)
-- ============================================================================

BEGIN;

-- Temporarily disable triggers for faster bulk insert
SET session_replication_role = 'replica';

`;

  // Export each table in order
  for (const tableName of section.tables) {
    console.log(`  Exporting ${tableName}...`);
    const rows = await exportTableData(tableName);
    sql += generateInsertStatement(tableName, rows);
  }

  sql += `-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Analyze tables for query optimization
${section.tables.map(t => `ANALYZE ${t};`).join('\n')}
`;

  // Write to file
  const filename = path.join(SEEDS_DIR, `${sectionKey}.sql`);
  fs.writeFileSync(filename, sql, 'utf8');
  console.log(`  ✓ Created: ${filename}`);

  return sql.length;
}

async function generateMasterSeedScript() {
  console.log('\nGenerating master seed script...');

  let sql = `-- ============================================================================
-- MASTER SEED SCRIPT - Load All Data
-- ============================================================================
-- Generated: ${new Date().toISOString()}
--
-- This script loads all seed data in the correct order.
-- Alternatively, you can run individual seed files for specific data sections.
--
-- Usage:
--   psql -U <user> -d <database> -f seed_all.sql
--
-- Or load individual sections:
${Object.keys(SEED_SECTIONS).map(k => `--   psql -U <user> -d <database> -f seeds/${k}.sql`).join('\n')}
-- ============================================================================

`;

  for (const sectionKey of Object.keys(SEED_SECTIONS)) {
    sql += `\\i seeds/${sectionKey}.sql\n`;
  }

  const filename = path.join(SEEDS_DIR, '../seed_all.sql');
  fs.writeFileSync(filename, sql, 'utf8');
  console.log(`  ✓ Created master script: ${filename}`);
}

async function main() {
  try {
    console.log('='.repeat(70));
    console.log('MODULAR SEED SCRIPT GENERATOR');
    console.log('='.repeat(70));

    // Create seeds directory
    if (!fs.existsSync(SEEDS_DIR)) {
      fs.mkdirSync(SEEDS_DIR, { recursive: true });
    }

    // Generate each seed file
    let totalSize = 0;
    for (const [sectionKey, section] of Object.entries(SEED_SECTIONS)) {
      const size = await generateSeedFile(sectionKey, section);
      totalSize += size;
    }

    // Generate master script
    await generateMasterSeedScript();

    console.log('\n' + '='.repeat(70));
    console.log('GENERATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total seed data size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`\nSeed files created in: ${SEEDS_DIR}`);
    console.log('\nTo load all data:');
    console.log('  psql -U dev_user -d new_database -f seed_all.sql');
    console.log('\nTo load specific sections:');
    console.log('  psql -U dev_user -d new_database -f seeds/01_users.sql');

    await pool.end();
  } catch (error) {
    console.error('Error generating seed scripts:', error);
    process.exit(1);
  }
}

main();
