/**
 * Script to add a nested comment for testing recursive rendering
 */

const { initializeDatabase } = require('./src/config/database');

async function addNestedComment() {
  try {
    console.log('🔗 Connecting to database...');
    const db = await initializeDatabase();

    console.log('📝 Adding nested comment...');
    const result = await db.query(
      `INSERT INTO comments (post_id, user_id, parent_id, content, is_published, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [24, 16, 178, 'I agree! TechCrunch Disrupt was amazing. Did you attend the AI sessions?', true]
    );

    console.log('✅ Nested comment added:', result.rows[0]);

    // Add another level of nesting
    const parentId = result.rows[0].id;
    const result2 = await db.query(
      `INSERT INTO comments (post_id, user_id, parent_id, content, is_published, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [24, 17, parentId, 'Yes! The AI panel was incredible. GPT-4 demos blew my mind!', true]
    );

    console.log('✅ Deep nested comment added:', result2.rows[0]);

    console.log('🎉 Nested comments created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding nested comment:', error);
    process.exit(1);
  }
}

addNestedComment();