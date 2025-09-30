/**
 * Script to run the comment interactions migration
 */

const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./src/config/database');

async function runInteractionMigration() {
  try {
    console.log('🔗 Connecting to database...');
    const db = await initializeDatabase();

    console.log('📋 Loading migration file...');
    const migrationPath = path.join(__dirname, 'src', 'migrations', '004_add_comment_interactions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running interaction tracking migration...');
    await db.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('📊 Created tables:');
    console.log('  - comment_interactions (for tracking user interactions)');
    console.log('  - comment_metrics (for aggregated algorithm scores)');
    console.log('🔧 Created functions:');
    console.log('  - calculate_recency_score()');
    console.log('  - calculate_interaction_rate()');
    console.log('  - calculate_engagement_score()');
    console.log('  - update_comment_metrics() trigger function');

    // Verify tables were created
    const tablesResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('comment_interactions', 'comment_metrics')
      ORDER BY table_name
    `);

    console.log(`\n🎉 Verified ${tablesResult.rows.length} new tables created:`);
    tablesResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Check if metrics were initialized for existing comments
    const metricsCount = await db.query('SELECT COUNT(*) as count FROM comment_metrics');
    console.log(`📈 Initialized metrics for ${metricsCount.rows[0].count} existing comments`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runInteractionMigration();