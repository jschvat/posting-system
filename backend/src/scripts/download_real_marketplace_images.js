const fs = require('fs');
const path = require('path');
const https = require('https');
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

// Product image URLs from Unsplash (free to use)
const productImages = {
  24: { // iPhone 14 Pro Max
    name: 'iphone',
    urls: [
      'https://images.unsplash.com/photo-1678652632052-1f6d36b95bf4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1678685888044-e0728c8c558f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1678911820864-e5c67c32dd9f?w=800&h=600&fit=crop'
    ]
  },
  25: { // MacBook Air M2
    name: 'macbook',
    urls: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=600&fit=crop'
    ]
  },
  26: { // Gaming Desktop PC
    name: 'gaming-pc',
    urls: [
      'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1591238372338-7ea303f9cc50?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&h=600&fit=crop'
    ]
  },
  27: { // PlayStation 5
    name: 'ps5',
    urls: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&h=600&fit=crop'
    ]
  },
  28: { // Samsung TV
    name: 'samsung-tv',
    urls: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1593359863503-7e18f1b0366e?w=800&h=600&fit=crop'
    ]
  },
  29: { // Nintendo Switch
    name: 'switch',
    urls: [
      'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1585857188823-8c2f55de25e8?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1585857188823-8c2f55de25e8?w=800&h=600&fit=crop&sat=-50'
    ]
  },
  30: { // Canon Camera
    name: 'canon-camera',
    urls: [
      'https://images.unsplash.com/photo-1606980707291-ff0c2f31c0c4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1606980707291-ff0c2f31c0c4?w=800&h=600&fit=crop&sat=20',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=600&fit=crop'
    ]
  },
  31: { // Fender Guitar
    name: 'guitar',
    urls: [
      'https://images.unsplash.com/photo-1564186763535-ebb21d6bc2bf?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=600&fit=crop'
    ]
  },
  32: { // Herman Miller Chair
    name: 'chair',
    urls: [
      'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&h=600&fit=crop'
    ]
  },
  33: { // Vinyl Records
    name: 'vinyl',
    urls: [
      'https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1619983081563-430f63602796?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1594226801341-5d2b34f9c8e1?w=800&h=600&fit=crop'
    ]
  },
  34: { // Office Desk
    name: 'desk',
    urls: [
      'https://images.unsplash.com/photo-1595428773653-c7b455c3c73f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1595428773653-c7b455c3c73f?w=800&h=600&fit=crop&sat=20'
    ]
  },
  35: { // Sony Headphones
    name: 'headphones',
    urls: [
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=600&fit=crop'
    ]
  }
};

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`✓ Downloaded: ${path.basename(filepath)}`);
        resolve(filepath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadMarketplaceImages() {
  const client = new Client(dbConfig);
  await client.connect();

  try {
    // Create uploads directory
    const uploadsDir = path.join(__dirname, '../../../uploads/marketplace/images');
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Delete old images
    console.log('Deleting old marketplace images...');
    await client.query('DELETE FROM marketplace_media WHERE listing_id BETWEEN 24 AND 35');

    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file !== '.gitkeep') {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
    }

    console.log('\nDownloading real product images from Unsplash...\n');

    for (const [listingId, imageData] of Object.entries(productImages)) {
      console.log(`\nProcessing listing ${listingId}: ${imageData.name}`);

      for (let i = 0; i < imageData.urls.length; i++) {
        const url = imageData.urls[i];
        const extension = 'jpg';
        const filename = `${imageData.name}-${listingId}-${i + 1}.${extension}`;
        const filepath = path.join(uploadsDir, filename);
        const relativeUrl = `/uploads/marketplace/images/${filename}`;

        try {
          await downloadImage(url, filepath);

          // Wait a bit to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

          const stats = fs.statSync(filepath);

          // Insert into database
          await client.query(`
            INSERT INTO marketplace_media (
              listing_id, file_url, file_type, file_size,
              display_order, is_primary, width, height
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [listingId, relativeUrl, 'image/jpeg', stats.size, i, i === 0, 800, 600]);

        } catch (error) {
          console.error(`✗ Error downloading ${filename}:`, error.message);
        }
      }
    }

    console.log('\n✅ All images downloaded successfully!');

    // Verify counts
    const result = await client.query(`
      SELECT listing_id, COUNT(*) as image_count
      FROM marketplace_media
      WHERE listing_id BETWEEN 24 AND 35
      GROUP BY listing_id
      ORDER BY listing_id
    `);

    console.log('\nImage counts per listing:');
    result.rows.forEach(row => {
      console.log(`  Listing ${row.listing_id}: ${row.image_count} images`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

downloadMarketplaceImages();
