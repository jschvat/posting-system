const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

/**
 * POST /api/marketplace/auctions/:listingId/bid
 * Place a bid on an auction
 */
router.post('/:listingId/bid', authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const { listingId } = req.params;
    const { bid_amount, max_bid_amount } = req.body;
    const userId = req.user.id;

    // Validate bid amount
    if (!bid_amount || isNaN(bid_amount) || parseFloat(bid_amount) <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invalid bid amount'
      });
    }

    // Get auction details
    const auctionResult = await client.query(
      `SELECT a.*, l.user_id as seller_id, l.status as listing_status
       FROM marketplace_auctions a
       JOIN marketplace_listings l ON a.listing_id = l.id
       WHERE a.listing_id = $1`,
      [listingId]
    );

    if (auctionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    const auction = auctionResult.rows[0];

    // Validate auction is active
    if (auction.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Auction is not active'
      });
    }

    // Check if auction has ended
    if (new Date(auction.end_time) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Auction has ended'
      });
    }

    // Check if user is the seller
    if (auction.seller_id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'You cannot bid on your own auction'
      });
    }

    // Validate minimum bid
    const minBid = parseFloat(auction.current_bid) + parseFloat(auction.bid_increment);
    if (parseFloat(bid_amount) < minBid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Minimum bid is $${minBid.toFixed(2)}`
      });
    }

    // Mark all previous bids as not winning and outbid
    await client.query(
      `UPDATE marketplace_auction_bids
       SET is_winning = FALSE, is_outbid = TRUE
       WHERE auction_id = $1 AND is_winning = TRUE`,
      [auction.id]
    );

    // Insert new bid
    const bidResult = await client.query(
      `INSERT INTO marketplace_auction_bids (
        auction_id, user_id, bid_amount, max_bid_amount, is_winning
      ) VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *`,
      [auction.id, userId, bid_amount, max_bid_amount || bid_amount]
    );

    // Update auction current bid and winner
    await client.query(
      `UPDATE marketplace_auctions
       SET current_bid = $1, total_bids = total_bids + 1, winner_user_id = $2
       WHERE id = $3`,
      [bid_amount, userId, auction.id]
    );

    // Check for auto-extend
    const endTime = new Date(auction.end_time);
    const now = new Date();
    const minutesRemaining = (endTime - now) / (1000 * 60);

    if (auction.auto_extend && minutesRemaining < auction.extension_minutes) {
      const newEndTime = new Date(now.getTime() + auction.extension_minutes * 60 * 1000);
      await client.query(
        'UPDATE marketplace_auctions SET end_time = $1 WHERE id = $2',
        [newEndTime, auction.id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: bidResult.rows[0],
      message: 'Bid placed successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error placing bid:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to place bid'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/marketplace/auctions/:listingId/bids
 * Get all bids for an auction
 */
router.get('/:listingId/bids', async (req, res) => {
  try {
    const { listingId } = req.params;

    const result = await db.query(
      `SELECT
        b.id, b.bid_amount, b.is_winning, b.created_at,
        u.username
       FROM marketplace_auction_bids b
       JOIN marketplace_auctions a ON b.auction_id = a.id
       JOIN users u ON b.user_id = u.id
       WHERE a.listing_id = $1
       ORDER BY b.created_at DESC`,
      [listingId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bids'
    });
  }
});

module.exports = router;
