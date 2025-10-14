/**
 * Script to download and set sample avatars for existing groups
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'posting_system',
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Group avatar mappings with Unsplash image IDs
const groupAvatars = {
  'testgroup': 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=400&fit=crop', // Gradient
  'techcommunity': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop', // Tech
  'foodieheaven': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop', // Food
  'gaminghub': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=400&fit=crop', // Gaming
  'general': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop', // Community
  'sf-bay-area': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=400&fit=crop', // SF Bridge
  'california': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop', // California landscape
  'usa': 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&h=400&fit=crop' // USA flag/landscape
};

// Download image from URL
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Process and save avatar
async function processAvatar(slug, imageBuffer) {
  const uploadDir = path.join(__dirname, '../src/uploads/groups/avatars');
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `group-avatar-${slug}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // Resize and optimize with Sharp
  await sharp(imageBuffer)
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  return `/uploads/groups/avatars/${filename}`;
}

// Update group avatar in database
async function updateGroupAvatar(slug, avatarUrl) {
  const query = 'UPDATE groups SET avatar_url = $1 WHERE slug = $2';
  await pool.query(query, [avatarUrl, slug]);
}

// Main function
async function main() {
  console.log('🖼️  Starting group avatar update...\n');

  for (const [slug, imageUrl] of Object.entries(groupAvatars)) {
    try {
      console.log(`📥 Downloading avatar for: ${slug}`);
      const imageBuffer = await downloadImage(imageUrl);

      console.log(`🔄 Processing image...`);
      const avatarUrl = await processAvatar(slug, imageBuffer);

      console.log(`💾 Updating database...`);
      await updateGroupAvatar(slug, avatarUrl);

      console.log(`✅ ${slug}: ${avatarUrl}\n`);
    } catch (error) {
      console.error(`❌ Failed to update ${slug}:`, error.message, '\n');
    }
  }

  await pool.end();
  console.log('🎉 Avatar update complete!');
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
