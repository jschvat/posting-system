/**
 * Script to generate simple placeholder images for marketplace listings
 * Creates colored rectangles with text using Canvas
 */

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

// Image mapping for each listing with colors
const listingImages = {
  24: { // iPhone 14 Pro Max
    name: 'iphone',
    count: 3,
    color: '#374151'
  },
  25: { // MacBook Air M2
    name: 'macbook',
    count: 3,
    color: '#4B5563'
  },
  26: { // Gaming Desktop PC
    name: 'gaming-pc',
    count: 3,
    color: '#1F2937'
  },
  27: { // PlayStation 5
    name: 'ps5',
    count: 3,
    color: '#FFFFFF'
  },
  28: { // Samsung TV
    name: 'samsung-tv',
    count: 2,
    color: '#111827'
  },
  29: { // Nintendo Switch
    name: 'switch',
    count: 3,
    color: '#DC2626'
  },
  30: { // Canon Camera
    name: 'canon-camera',
    count: 3,
    color: '#0F172A'
  },
  31: { // Fender Guitar
    name: 'guitar',
    count: 3,
    color: '#7C2D12'
  },
  32: { // Herman Miller Chair
    name: 'chair',
    count: 2,
    color: '#064E3B'
  },
  33: { // Vinyl Records
    name: 'vinyl',
    count: 3,
    color: '#581C87'
  },
  34: { // Office Desk
    name: 'desk',
    count: 2,
    color: '#78350F'
  },
  35: { // Sony Headphones
    name: 'headphones',
    count: 3,
    color: '#0C4A6E'
  }
};

// Create a simple SVG placeholder
function createSVGPlaceholder(width, height, color, text) {
  const isDark = parseInt(color.slice(1), 16) < 0x808080;
  const textColor = isDark ? '#FFFFFF' : '#000000';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${color}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
}

// Main function
async function generateMarketplaceImages() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    const uploadsDir = path.join(__dirname, '../../../uploads/marketplace/images');

    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    console.log(`\nGenerating images for ${Object.keys(listingImages).length} listings...\n`);

    let totalImages = 0;

    for (const [listingId, imageData] of Object.entries(listingImages)) {
      console.log(`Processing listing ${listingId}: ${imageData.name}`);

      for (let i = 0; i < imageData.count; i++) {
        const filename = `${imageData.name}-${listingId}-${i + 1}.svg`;
        const filepath = path.join(uploadsDir, filename);
        const relativeUrl = `/uploads/marketplace/images/${filename}`;

        try {
          // Create SVG content
          const svgContent = createSVGPlaceholder(
            800,
            600,
            imageData.color,
            `${imageData.name.replace(/-/g, ' ')} ${i + 1}`
          );

          // Write SVG file
          fs.writeFileSync(filepath, svgContent);
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
            'image/svg+xml',
            stats.size,
            i,  // display_order
            i === 0,  // is_primary (first image is primary)
            800,  // width
            600   // height
          ]);

          console.log(`  ✓ Created image ${i + 1}/${imageData.count} (ID: ${result.rows[0].id})`);
          totalImages++;

        } catch (err) {
          console.error(`  ✗ Error creating image ${i + 1}:`, err.message);
        }
      }

      console.log(`✓ Completed listing ${listingId}\n`);
    }

    console.log(`\n✅ Successfully generated ${totalImages} marketplace images`);

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
  generateMarketplaceImages()
    .then(() => {
      console.log('\n✅ Image generation completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Image generation failed:', err);
      process.exit(1);
    });
}

module.exports = { generateMarketplaceImages };
