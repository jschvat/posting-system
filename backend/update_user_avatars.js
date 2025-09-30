/**
 * Script to update user avatar URLs in the database
 */

const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./src/config/database');

async function updateUserAvatars() {
  try {
    console.log('🔗 Connecting to database...');
    const db = await initializeDatabase();

    // Get avatar files
    const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
    const files = fs.readdirSync(avatarsDir);

    console.log(`📋 Found ${files.length} avatar files to update in database`);

    for (const file of files) {
      // Extract user ID from filename (user_12_xyz.png -> 12)
      const match = file.match(/user_(\d+)_/);
      if (!match) {
        console.log(`⚠️  Skipping invalid filename: ${file}`);
        continue;
      }

      const userId = parseInt(match[1]);
      const avatarUrl = `/uploads/avatars/${file}`;

      try {
        // Update user avatar URL using raw SQL
        const result = await db.query(
          'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
          [avatarUrl, userId]
        );

        console.log(`✅ Updated avatar for user ${userId}: ${avatarUrl}`);
      } catch (error) {
        console.error(`❌ Failed to update user ${userId}:`, error.message);
      }
    }

    // Verify updates
    console.log('\n📊 Verifying avatar updates...');
    const users = await db.query('SELECT id, username, avatar_url FROM users ORDER BY id');

    users.rows.forEach(user => {
      if (user.avatar_url) {
        console.log(`✅ ${user.username} (ID: ${user.id}): ${user.avatar_url}`);
      } else {
        console.log(`❌ ${user.username} (ID: ${user.id}): No avatar`);
      }
    });

    console.log('\n🎉 Avatar URL updates completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating avatar URLs:', error);
    process.exit(1);
  }
}

updateUserAvatars();