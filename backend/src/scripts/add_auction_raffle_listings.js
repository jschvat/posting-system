const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'posting_system',
  user: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function addAuctionAndRaffleListings() {
  const client = new Client(dbConfig);
  await client.connect();

  try {
    console.log('Converting some listings to auction and raffle types...\n');

    // Convert listing 27 (PS5) to auction
    await client.query(`
      UPDATE marketplace_listings
      SET listing_type = 'auction', price = 250.00
      WHERE id = 27
    `);

    await client.query(`
      INSERT INTO marketplace_auctions (
        listing_id, starting_bid, reserve_price, current_bid, bid_increment,
        end_time, status
      ) VALUES (
        27, 250.00, 400.00, 250.00, 10.00,
        NOW() + INTERVAL '7 days', 'active'
      )
    `);

    console.log('✓ Listing 27 (PS5) converted to auction');
    console.log('  - Starting bid: $250.00');
    console.log('  - Reserve price: $400.00');
    console.log('  - Bid increment: $10.00');
    console.log('  - Ends in 7 days\n');

    // Convert listing 31 (Guitar) to auction
    await client.query(`
      UPDATE marketplace_listings
      SET listing_type = 'auction', price = 400.00
      WHERE id = 31
    `);

    await client.query(`
      INSERT INTO marketplace_auctions (
        listing_id, starting_bid, reserve_price, current_bid, bid_increment,
        end_time, status
      ) VALUES (
        31, 400.00, 600.00, 400.00, 25.00,
        NOW() + INTERVAL '5 days', 'active'
      )
    `);

    console.log('✓ Listing 31 (Fender Guitar) converted to auction');
    console.log('  - Starting bid: $400.00');
    console.log('  - Reserve price: $600.00');
    console.log('  - Bid increment: $25.00');
    console.log('  - Ends in 5 days\n');

    // Convert listing 35 (Sony Headphones) to raffle
    await client.query(`
      UPDATE marketplace_listings
      SET listing_type = 'raffle', price = 5.00
      WHERE id = 35
    `);

    await client.query(`
      INSERT INTO marketplace_raffles (
        listing_id, ticket_price, total_tickets, tickets_sold,
        min_tickets_to_draw, max_tickets_per_user, end_time, status
      ) VALUES (
        35, 5.00, 100, 0, 50, 10,
        NOW() + INTERVAL '10 days', 'active'
      )
    `);

    console.log('✓ Listing 35 (Sony Headphones) converted to raffle');
    console.log('  - Ticket price: $5.00');
    console.log('  - Total tickets: 100');
    console.log('  - Max per user: 10');
    console.log('  - Minimum to draw: 50 tickets');
    console.log('  - Ends in 10 days\n');

    // Convert listing 30 (Canon Camera) to raffle
    await client.query(`
      UPDATE marketplace_listings
      SET listing_type = 'raffle', price = 10.00
      WHERE id = 30
    `);

    await client.query(`
      INSERT INTO marketplace_raffles (
        listing_id, ticket_price, total_tickets, tickets_sold,
        min_tickets_to_draw, max_tickets_per_user, end_time, status
      ) VALUES (
        30, 10.00, 200, 0, 100, 20,
        NOW() + INTERVAL '14 days', 'active'
      )
    `);

    console.log('✓ Listing 30 (Canon Camera) converted to raffle');
    console.log('  - Ticket price: $10.00');
    console.log('  - Total tickets: 200');
    console.log('  - Max per user: 20');
    console.log('  - Minimum to draw: 100 tickets');
    console.log('  - Ends in 14 days\n');

    // Add some sample bids to the PS5 auction
    await client.query(`
      INSERT INTO marketplace_auction_bids (auction_id, user_id, bid_amount, is_winning)
      VALUES
        ((SELECT id FROM marketplace_auctions WHERE listing_id = 27), 31, 250.00, FALSE),
        ((SELECT id FROM marketplace_auctions WHERE listing_id = 27), 32, 260.00, FALSE),
        ((SELECT id FROM marketplace_auctions WHERE listing_id = 27), 33, 280.00, TRUE)
    `);

    await client.query(`
      UPDATE marketplace_auctions
      SET current_bid = 280.00, total_bids = 3, winner_user_id = 33
      WHERE listing_id = 27
    `);

    console.log('✓ Added 3 sample bids to PS5 auction\n');

    // Add some sample raffle tickets
    await client.query(`
      INSERT INTO marketplace_raffle_tickets (raffle_id, user_id, ticket_number, purchase_amount)
      VALUES
        ((SELECT id FROM marketplace_raffles WHERE listing_id = 35), 31, 1, 5.00),
        ((SELECT id FROM marketplace_raffles WHERE listing_id = 35), 31, 2, 5.00),
        ((SELECT id FROM marketplace_raffles WHERE listing_id = 35), 32, 3, 5.00),
        ((SELECT id FROM marketplace_raffles WHERE listing_id = 35), 33, 4, 5.00),
        ((SELECT id FROM marketplace_raffles WHERE listing_id = 35), 34, 5, 5.00)
    `);

    await client.query(`
      UPDATE marketplace_raffles
      SET tickets_sold = 5
      WHERE listing_id = 35
    `);

    console.log('✓ Added 5 sample raffle tickets to Sony Headphones raffle\n');

    console.log('✅ Sample auction and raffle listings created!');
    console.log('\nSummary:');
    console.log('- 2 Auction listings (PS5, Guitar)');
    console.log('- 2 Raffle listings (Headphones, Camera)');
    console.log('- 8 Regular sale listings\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

addAuctionAndRaffleListings();
