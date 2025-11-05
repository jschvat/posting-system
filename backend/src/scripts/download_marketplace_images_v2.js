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

// Product image URLs from free CDNs and stock photo sites
const productImages = {
  24: { // iPhone 14 Pro Max
    name: 'iphone',
    urls: [
      'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  25: { // MacBook Air M2
    name: 'macbook',
    urls: [
      'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  26: { // Gaming Desktop PC
    name: 'gaming-pc',
    urls: [
      'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/2582927/pexels-photo-2582927.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/7967323/pexels-photo-7967323.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  27: { // PlayStation 5
    name: 'ps5',
    urls: [
      'https://images.pexels.com/photos/4009622/pexels-photo-4009622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/3945657/pexels-photo-3945657.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  28: { // Samsung TV
    name: 'samsung-tv',
    urls: [
      'https://images.pexels.com/photos/1201996/pexels-photo-1201996.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1201999/pexels-photo-1201999.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  29: { // Nintendo Switch
    name: 'switch',
    urls: [
      'https://images.pexels.com/photos/371924/pexels-photo-371924.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/459762/pexels-photo-459762.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  30: { // Canon Camera
    name: 'canon-camera',
    urls: [
      'https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/279906/pexels-photo-279906.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  31: { // Fender Guitar
    name: 'guitar',
    urls: [
      'https://images.pexels.com/photos/1407322/pexels-photo-1407322.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1751731/pexels-photo-1751731.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  32: { // Herman Miller Chair
    name: 'chair',
    urls: [
      'https://images.pexels.com/photos/276534/pexels-photo-276534.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  33: { // Vinyl Records
    name: 'vinyl',
    urls: [
      'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1389429/pexels-photo-1389429.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1630340/pexels-photo-1630340.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  34: { // Office Desk
    name: 'desk',
    urls: [
      'https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  35: { // Sony Headphones
    name: 'headphones',
    urls: [
      'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/3587478/pexels-photo-3587478.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/2582928/pexels-photo-2582928.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
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

    console.log('\nDownloading real product images from Pexels...\n');

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
          await new Promise(resolve => setTimeout(resolve, 300));

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
