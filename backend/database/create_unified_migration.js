#!/usr/bin/env node
/**
 * Unified Migration Script Generator
 * Combines all migration files into a single, idempotent migration script
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../src/database/migrations');
const OUTPUT_FILE = path.join(__dirname, 'unified_migration.sql');

// Migration files in dependency order
const MIGRATION_ORDER = [
  '001_initial_schema.sql',
  'add_file_url_to_media.sql',
  '002_follow_share_system.sql',
  '003_comment_tracking_system.sql',
  '004_rating_reputation_system.sql',
  '005_comment_metrics_helpers.sql',
  '006_geolocation_system.sql',
  '007_add_address_fields.sql',
  '008_update_location_function.sql',
  '009_group_system.sql',
  '010_allow_public_posting.sql',
  '010_post_soft_delete.sql',
  '011_group_geolocation_restrictions.sql',
  '012_moderator_permissions.sql',
  '013_post_type_controls.sql',
  '014_profile_enhancements.sql',
  '015_interests_and_skills.sql',
  '016_expand_interests_enums.sql',
  '017_add_polls.sql',
  '018_messaging_system.sql',
  '019_notifications_system.sql',
  '020_message_reactions.sql',
  '020_group_chat_integration.sql'
];

function generateHeader() {
  return `-- ============================================================================
-- UNIFIED DATABASE MIGRATION SCRIPT
-- ============================================================================
-- Description: Complete database schema for posting-system application
-- Generated: ${new Date().toISOString()}
--
-- This script creates the entire database schema from scratch, including:
-- - Extensions
-- Enum types
-- - Tables (in dependency order)
-- - Indexes
-- - Functions and stored procedures
-- - Triggers
--
-- Usage:
--   psql -U <user> -d <database> -f unified_migration.sql
--
-- Note: This script is idempotent and can be run multiple times safely
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS ltree;

`;
}

function generateFooter() {
  return `
-- ============================================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- ============================================================================

-- Analyze tables for query optimization
ANALYZE;

`;
}

function processSQL(content, filename) {
  // Don't modify content - keep all BEGIN/COMMIT as they are needed for functions
  // Just add section header
  const header = `
-- ============================================================================
-- MIGRATION: ${filename}
-- ============================================================================
`;

  return header + content + '\n';
}

async function generateUnifiedMigration() {
  console.log('Generating unified migration script...');

  let output = generateHeader();

  // Process each migration file in order
  for (const filename of MIGRATION_ORDER) {
    const filepath = path.join(MIGRATIONS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      console.warn(`Warning: Migration file not found: ${filename}`);
      continue;
    }

    console.log(`Processing: ${filename}`);
    const content = fs.readFileSync(filepath, 'utf8');
    output += processSQL(content, filename);
  }

  output += generateFooter();

  // Write output file
  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  console.log(`\nUnified migration script created: ${OUTPUT_FILE}`);
  console.log(`Total size: ${(output.length / 1024).toFixed(2)} KB`);
}

// Run the script
generateUnifiedMigration().catch(err => {
  console.error('Error generating migration:', err);
  process.exit(1);
});
