/**
 * Script to seed marketplace listings with placeholder images
 * Downloads product images and associates them with marketplace listings
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'posting_system',
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Image mapping for each listing
const listingImages = {
  24: { // iPhone 14 Pro Max
    name: 'iphone',
    urls: [
      'https://via.placeholder.com/800x600/4A5568/FFFFFF?text=iPhone+14+Pro+Max',
      'https://via.placeholder.com/800x600/6B7280/FFFFFF?text=iPhone+Side+View',
      'https://via.placeholder.com/800x600/9CA3AF/FFFFFF?text=iPhone+Back+Camera'
    ]
  },
  25: { // MacBook Air M2
    name: 'macbook',
    urls: [
      'https://via.placeholder.com/800x600/374151/FFFFFF?text=MacBook+Air+M2',
      'https://via.placeholder.com/800x600/4B5563/FFFFFF?text=MacBook+Open',
      'https://via.placeholder.com/800x600/6B7280/FFFFFF?text=MacBook+Keyboard'
    ]
  },
  26: { // Gaming Desktop PC
    name: 'gaming-pc',
    urls: [
      'https://via.placeholder.com/800x600/1F2937/FFFFFF?text=Gaming+PC+RTX+4070',
      'https://via.placeholder.com/800x600/374151/FFFFFF?text=PC+Side+Panel',
      'https://via.placeholder.com/800x600/4B5563/FFFFFF?text=RGB+Lighting'
    ]
  },
  27: { // PlayStation 5
    name: 'ps5',
    urls: [
      'https://via.placeholder.com/800x600/FFFFFF/000000?text=PlayStation+5+Bundle',
      'https://via.placeholder.com/800x600/F3F4F6/374151?text=PS5+Controller',
      'https://via.placeholder.com/800x600/E5E7EB/4B5563?text=PS5+Games+Included'
    ]
  },
  28: { // Samsung TV
    name: 'samsung-tv',
    urls: [
      'https://via.placeholder.com/800x600/111827/FFFFFF?text=Samsung+65"+4K+TV',
      'https://via.placeholder.com/800x600/1F2937/FFFFFF?text=TV+Display+Quality'
    ]
  },
  29: { // Nintendo Switch
    name: 'switch',
    urls: [
      'https://via.placeholder.com/800x600/DC2626/FFFFFF?text=Nintendo+Switch+OLED',
      'https://via.placeholder.com/800x600/EF4444/FFFFFF?text=Switch+Controllers',
      'https://via.placeholder.com/800x600/F87171/FFFFFF?text=Switch+Dock'
    ]
  },
  30: { // Canon Camera
    name: 'canon-camera',
    urls: [
      'https://via.placeholder.com/800x600/0F172A/FFFFFF?text=Canon+EOS+R6',
      'https://via.placeholder.com/800x600/1E293B/FFFFFF?text=Camera+Controls',
      'https://via.placeholder.com/800x600/334155/FFFFFF?text=Camera+LCD+Screen'
    ]
  },
  31: { // Fender Guitar
    name: 'guitar',
    urls: [
      'https://via.placeholder.com/800x600/7C2D12/FFFFFF?text=Fender+Stratocaster',
      'https://via.placeholder.com/800x600/991B1B/FFFFFF?text=Guitar+Pickups',
      'https://via.placeholder.com/800x600/B91C1C/FFFFFF?text=Guitar+Neck'
    ]
  },
  32: { // Herman Miller Chair
    name: 'chair',
    urls: [
      'https://via.placeholder.com/800x600/064E3B/FFFFFF?text=Herman+Miller+Aeron',
      'https://via.placeholder.com/800x600/065F46/FFFFFF?text=Chair+Side+View'
    ]
  },
  33: { // Vinyl Records
    name: 'vinyl',
    urls: [
      'https://via.placeholder.com/800x600/581C87/FFFFFF?text=Vinyl+Record+Collection',
      'https://via.placeholder.com/800x600/6B21A8/FFFFFF?text=Classic+Albums',
      'https://via.placeholder.com/800x600/7C3AED/FFFFFF?text=Record+Sleeves'
    ]
  },
  34: { // Office Desk
    name: 'desk',
    urls: [
      'https://via.placeholder.com/800x600/78350F/FFFFFF?text=Office+Desk',
      'https://via.placeholder.com/800x600/92400E/FFFFFF?text=Desk+Surface'
    ]
  },
  35: { // Sony Headphones
    name: 'headphones',
    urls: [
      'https://via.placeholder.com/800x600/0C4A6E/FFFFFF?text=Sony+WH-1000XM5',
      'https://via.placeholder.com/800x600/0369A1/FFFFFF?text=Headphones+Side',
      'https://via.placeholder.com/800x600/0284C7/FFFFFF?text=Headphones+Case'
    ]
  }
};

// Download file from URL
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(dest);
      });

      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

// Main function
async function seedMarketplaceImages() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    const uploadsDir = path.join(__dirname, '../../../uploads/marketplace/images');

    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    console.log(`\nDownloading and associating images for ${Object.keys(listingImages).length} listings...\n`);

    for (const [listingId, imageData] of Object.entries(listingImages)) {
      console.log(`Processing listing ${listingId}: ${imageData.name}`);

      for (let i = 0; i < imageData.urls.length; i++) {
        const url = imageData.urls[i];
        const filename = `${imageData.name}-${listingId}-${i + 1}.png`;
        const filepath = path.join(uploadsDir, filename);
        const relativeUrl = `/uploads/marketplace/images/${filename}`;

        try {
          // Download image
          console.log(`  Downloading image ${i + 1}/${imageData.urls.length}...`);
          await downloadFile(url, filepath);

          // Get file stats
          const stats = fs.statSync(filepath);

          // Insert into database
          const insertQuery = `
            INSERT INTO marketplace_media (
              listing_id, file_url, file_type, file_size,
              display_order, is_primary, width, height
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `;

          const result = await client.query(insertQuery, [
            listingId,
            relativeUrl,
            'image/png',
            stats.size,
            i,  // display_order
            i === 0,  // is_primary (first image is primary)
            800,  // width
            600   // height
          ]);

          console.log(`  ✓ Saved image ${i + 1} (ID: ${result.rows[0].id})`);

        } catch (err) {
          console.error(`  ✗ Error processing image ${i + 1}:`, err.message);
        }
      }

      console.log(`✓ Completed listing ${listingId}\n`);
    }

    // Count total images
    const countResult = await client.query('SELECT COUNT(*) FROM marketplace_media');
    console.log(`\n✅ Successfully seeded ${countResult.rows[0].count} marketplace images`);

    // Show images per listing
    const summaryResult = await client.query(`
      SELECT
        ml.id,
        ml.title,
        COUNT(mm.id) as image_count,
        MAX(CASE WHEN mm.is_primary THEN mm.file_url END) as primary_image
      FROM marketplace_listings ml
      LEFT JOIN marketplace_media mm ON ml.id = mm.listing_id
      GROUP BY ml.id, ml.title
      ORDER BY ml.id
    `);

    console.log('\nImage Summary:');
    console.log('ID  | Images | Title');
    console.log('----+--------+-----------------------------------');
    summaryResult.rows.forEach(row => {
      console.log(`${String(row.id).padEnd(4)}| ${String(row.image_count).padEnd(7)}| ${row.title}`);
    });

  } catch (err) {
    console.error('Error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

// Run the script
if (require.main === module) {
  seedMarketplaceImages()
    .then(() => {
      console.log('\n✅ Image seeding completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Image seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedMarketplaceImages };
