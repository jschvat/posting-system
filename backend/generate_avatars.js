/**
 * Script to generate random avatar images for all users
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { initializeDatabase } = require('./src/config/database');
const User = require('./src/models/User');

// Avatar styles and configurations
const avatarStyles = [
  'adventurer',
  'adventurer-neutral',
  'avataaars',
  'big-ears',
  'big-ears-neutral',
  'big-smile',
  'bottts',
  'croodles',
  'croodles-neutral',
  'fun-emoji',
  'icons',
  'identicon',
  'initials',
  'lorelei',
  'lorelei-neutral',
  'micah',
  'miniavs',
  'open-peeps',
  'personas',
  'pixel-art',
  'pixel-art-neutral'
];

// Function to download image from URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file async
      reject(err);
    });
  });
}

// Function to generate random seed
function generateSeed() {
  return Math.random().toString(36).substring(2, 15);
}

// Function to get random avatar style
function getRandomStyle() {
  return avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
}

async function generateAvatarsForAllUsers() {
  try {
    console.log('🔗 Connecting to database...');
    await initializeDatabase();

    // Get all users
    const users = await User.findAll();
    console.log(`📋 Found ${users.length} users to generate avatars for`);

    // Ensure uploads/avatars directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    const avatarsDir = path.join(uploadsDir, 'avatars');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    console.log('🎨 Generating random avatars...');

    for (const user of users) {
      try {
        // Generate unique parameters for each user
        const style = getRandomStyle();
        const seed = generateSeed();
        const size = 200; // 200x200 pixels

        // Create filename
        const filename = `user_${user.id}_${seed}.png`;
        const filepath = path.join(avatarsDir, filename);

        // Generate avatar URL from DiceBear API
        const avatarUrl = `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&size=${size}&backgroundColor=transparent`;

        console.log(`📥 Downloading avatar for ${user.username} (${style} style)...`);

        // Download the avatar image
        await downloadImage(avatarUrl, filepath);

        // Update user with avatar URL (relative path)
        const relativeAvatarUrl = `/uploads/avatars/${filename}`;
        await user.update({ avatar_url: relativeAvatarUrl });

        console.log(`✅ Generated avatar for ${user.username}: ${relativeAvatarUrl}`);

        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Failed to generate avatar for ${user.username}:`, error.message);
      }
    }

    console.log('🎉 Avatar generation completed!');
    console.log(`📂 Avatars saved to: ${avatarsDir}`);

    // List generated files
    const files = fs.readdirSync(avatarsDir);
    console.log(`📊 Generated ${files.length} avatar files:`);
    files.forEach(file => console.log(`   - ${file}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating avatars:', error);
    process.exit(1);
  }
}

generateAvatarsForAllUsers();