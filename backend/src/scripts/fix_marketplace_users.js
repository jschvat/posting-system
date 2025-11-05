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

async function fixMarketplaceUsers() {
  const client = new Client(dbConfig);
  await client.connect();

  try {
    console.log('Distributing marketplace listings across multiple users...\n');

    // Get some users to distribute listings to
    const usersResult = await client.query(`
      SELECT id, username FROM users
      WHERE id IN (30, 31, 32, 33, 34, 35, 36, 37, 38, 39)
      ORDER BY id
      LIMIT 10
    `);

    if (usersResult.rows.length === 0) {
      console.log('No users found. Please ensure users exist in the database.');
      return;
    }

    console.log(`Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach(u => console.log(`  - User ${u.id}: ${u.username}`));
    console.log('');

    // Distribute listings across users
    const listingUserMap = {
      24: 30, // iPhone -> admin_alice
      25: 31, // MacBook -> user 31
      26: 32, // Gaming PC -> user 32
      27: 33, // PS5 -> user 33
      28: 34, // Samsung TV -> user 34
      29: 35, // Nintendo Switch -> user 35
      30: 36, // Canon Camera -> user 36
      31: 37, // Guitar -> user 37
      32: 38, // Chair -> user 38
      33: 39, // Vinyl -> user 39
      34: 30, // Desk -> admin_alice
      35: 31  // Headphones -> user 31
    };

    for (const [listingId, userId] of Object.entries(listingUserMap)) {
      // Check if user exists
      const userExists = usersResult.rows.find(u => u.id === userId);
      const finalUserId = userExists ? userId : usersResult.rows[0].id;

      await client.query(
        'UPDATE marketplace_listings SET user_id = $1 WHERE id = $2',
        [finalUserId, listingId]
      );

      console.log(`✓ Listing ${listingId} assigned to user ${finalUserId}`);
    }

    console.log('\n✅ Marketplace listings distributed across users!');

    // Show distribution
    const distribution = await client.query(`
      SELECT
        u.id,
        u.username,
        COUNT(ml.id) as listing_count,
        array_agg(ml.title ORDER BY ml.id) as listings
      FROM users u
      INNER JOIN marketplace_listings ml ON u.id = ml.user_id
      WHERE ml.id BETWEEN 24 AND 35
      GROUP BY u.id, u.username
      ORDER BY u.id
    `);

    console.log('\nDistribution summary:');
    distribution.rows.forEach(row => {
      console.log(`\nUser ${row.id} (${row.username}): ${row.listing_count} listings`);
      row.listings.forEach(title => console.log(`  - ${title}`));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixMarketplaceUsers();
