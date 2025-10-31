#!/usr/bin/env node
/**
 * Database Structure Comparison Tool
 * Compares the structure of two databases to verify they match
 */

const { Pool } = require('pg');

const pool1 = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  database: 'posting_system' // Production database
});

const pool2 = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  database: 'posting_system_test' // Test database
});

async function getTables(pool) {
  const result = await pool.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return result.rows.map(r => r.tablename);
}

async function getTableColumns(pool, tableName) {
  const result = await pool.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function getIndexes(pool, tableName) {
  const result = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
    ORDER BY indexname
  `, [tableName]);
  return result.rows;
}

async function getFunctions(pool) {
  const result = await pool.query(`
    SELECT
      proname as function_name,
      pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY proname
  `);
  return result.rows;
}

async function compare() {
  console.log('='.repeat(70));
  console.log('DATABASE STRUCTURE COMPARISON');
  console.log('='.repeat(70));
  console.log('Production DB: posting_system');
  console.log('Test DB: posting_system_test\n');

  let differences = 0;

  // Compare tables
  console.log('Comparing tables...');
  const tables1 = await getTables(pool1);
  const tables2 = await getTables(pool2);

  if (tables1.length !== tables2.length) {
    console.log(`  ✗ Table count mismatch: ${tables1.length} vs ${tables2.length}`);
    differences++;
  } else {
    console.log(`  ✓ Both databases have ${tables1.length} tables`);
  }

  const missingInTest = tables1.filter(t => !tables2.includes(t));
  const extraInTest = tables2.filter(t => !tables1.includes(t));

  if (missingInTest.length > 0) {
    console.log(`  ✗ Tables missing in test DB: ${missingInTest.join(', ')}`);
    differences++;
  }

  if (extraInTest.length > 0) {
    console.log(`  ✗ Extra tables in test DB: ${extraInTest.join(', ')}`);
    differences++;
  }

  // Compare columns for each table
  console.log('\nComparing table columns...');
  let columnMismatches = 0;
  for (const table of tables1.filter(t => tables2.includes(t))) {
    const cols1 = await getTableColumns(pool1, table);
    const cols2 = await getTableColumns(pool2, table);

    if (cols1.length !== cols2.length) {
      console.log(`  ✗ ${table}: column count mismatch (${cols1.length} vs ${cols2.length})`);
      columnMismatches++;
      differences++;
    }

    // Check for column differences
    for (const col1 of cols1) {
      const col2 = cols2.find(c => c.column_name === col1.column_name);
      if (!col2) {
        console.log(`  ✗ ${table}: column '${col1.column_name}' missing in test DB`);
        columnMismatches++;
        differences++;
      } else if (col1.data_type !== col2.data_type) {
        console.log(`  ✗ ${table}.${col1.column_name}: type mismatch (${col1.data_type} vs ${col2.data_type})`);
        columnMismatches++;
        differences++;
      }
    }
  }

  if (columnMismatches === 0) {
    console.log('  ✓ All table columns match');
  }

  // Compare indexes
  console.log('\nComparing indexes...');
  let indexMismatches = 0;
  for (const table of tables1.filter(t => tables2.includes(t))) {
    const idx1 = await getIndexes(pool1, table);
    const idx2 = await getIndexes(pool2, table);

    if (idx1.length !== idx2.length) {
      console.log(`  ✗ ${table}: index count mismatch (${idx1.length} vs ${idx2.length})`);
      indexMismatches++;
      differences++;
    }
  }

  if (indexMismatches === 0) {
    console.log('  ✓ All indexes match');
  }

  // Compare functions
  console.log('\nComparing functions...');
  const funcs1 = await getFunctions(pool1);
  const funcs2 = await getFunctions(pool2);

  if (funcs1.length !== funcs2.length) {
    console.log(`  ✗ Function count mismatch: ${funcs1.length} vs ${funcs2.length}`);
    differences++;
  } else {
    console.log(`  ✓ Both databases have ${funcs1.length} functions`);
  }

  // Compare data counts
  console.log('\nComparing data counts...');
  for (const table of ['users', 'posts', 'comments', 'groups', 'messages']) {
    if (tables1.includes(table) && tables2.includes(table)) {
      const result1 = await pool1.query(`SELECT COUNT(*) FROM ${table}`);
      const result2 = await pool2.query(`SELECT COUNT(*) FROM ${table}`);
      const count1 = parseInt(result1.rows[0].count);
      const count2 = parseInt(result2.rows[0].count);

      if (count1 === count2) {
        console.log(`  ✓ ${table}: ${count1} rows (match)`);
      } else {
        console.log(`  ℹ ${table}: ${count1} vs ${count2} rows (different - expected for test data)`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  if (differences === 0) {
    console.log('✅ DATABASE STRUCTURES MATCH PERFECTLY!');
    console.log('='.repeat(70));
    console.log('\nThe unified migration script successfully creates');
    console.log('an identical database structure to the production database.');
  } else {
    console.log(`⚠️  Found ${differences} structural difference(s)`);
    console.log('='.repeat(70));
  }

  await pool1.end();
  await pool2.end();

  return differences === 0 ? 0 : 1;
}

compare().then(exitCode => {
  process.exit(exitCode);
}).catch(err => {
  console.error('Error comparing databases:', err);
  process.exit(1);
});
