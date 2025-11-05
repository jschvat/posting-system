const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

/**
 * POST /api/marketplace/raffles/:listingId/tickets
 * Buy raffle tickets
 */
router.post('/:listingId/tickets', authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const { listingId } = req.params;
    const { ticket_count } = req.body;
    const userId = req.user.id;

    // Validate ticket count
    if (!ticket_count || isNaN(ticket_count) || parseInt(ticket_count) <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket count'
      });
    }

    const count = parseInt(ticket_count);

    // Get raffle details
    const raffleResult = await client.query(
      `SELECT r.*, l.user_id as seller_id, l.status as listing_status
       FROM marketplace_raffles r
       JOIN marketplace_listings l ON r.listing_id = l.id
       WHERE r.listing_id = $1`,
      [listingId]
    );

    if (raffleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Raffle not found'
      });
    }

    const raffle = raffleResult.rows[0];

    // Validate raffle is active
    if (raffle.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Raffle is not active'
      });
    }

    // Check if raffle has ended
    if (new Date(raffle.end_time) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Raffle has ended'
      });
    }

    // Check if user is the seller
    if (raffle.seller_id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'You cannot buy tickets for your own raffle'
      });
    }

    // Check if enough tickets available
    const remaining = raffle.total_tickets - raffle.tickets_sold;
    if (count > remaining) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Only ${remaining} tickets remaining`
      });
    }

    // Check max tickets per user
    if (raffle.max_tickets_per_user) {
      const userTicketsResult = await client.query(
        'SELECT COUNT(*) as count FROM marketplace_raffle_tickets WHERE raffle_id = $1 AND user_id = $2',
        [raffle.id, userId]
      );

      const currentUserTickets = parseInt(userTicketsResult.rows[0].count);
      if (currentUserTickets + count > raffle.max_tickets_per_user) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Maximum ${raffle.max_tickets_per_user} tickets per user. You already have ${currentUserTickets}.`
        });
      }
    }

    // Get starting ticket number
    const startingTicket = raffle.tickets_sold + 1;
    const ticketPrice = parseFloat(raffle.ticket_price);
    const totalCost = ticketPrice * count;

    // Insert ticket purchases
    const tickets = [];
    for (let i = 0; i < count; i++) {
      const ticketNumber = startingTicket + i;
      const ticketResult = await client.query(
        `INSERT INTO marketplace_raffle_tickets (
          raffle_id, user_id, ticket_number, purchase_amount
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [raffle.id, userId, ticketNumber, ticketPrice]
      );
      tickets.push(ticketResult.rows[0]);
    }

    // Update raffle tickets_sold
    await client.query(
      'UPDATE marketplace_raffles SET tickets_sold = tickets_sold + $1 WHERE id = $2',
      [count, raffle.id]
    );

    // Check if raffle should be drawn (all tickets sold)
    const newTicketsSold = raffle.tickets_sold + count;
    if (newTicketsSold >= raffle.total_tickets) {
      await client.query(
        "UPDATE marketplace_raffles SET status = 'ended' WHERE id = $1",
        [raffle.id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        tickets,
        total_cost: totalCost,
        ticket_numbers: tickets.map(t => t.ticket_number)
      },
      message: `Successfully purchased ${count} ticket${count > 1 ? 's' : ''}`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error buying tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to buy tickets'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/marketplace/raffles/:listingId/tickets
 * Get all tickets for a raffle (with optional user filter)
 */
router.get('/:listingId/tickets', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { user_id } = req.query;

    let query = `
      SELECT
        t.id, t.ticket_number, t.purchase_amount, t.is_winner, t.created_at,
        u.username
      FROM marketplace_raffle_tickets t
      JOIN marketplace_raffles r ON t.raffle_id = r.id
      JOIN users u ON t.user_id = u.id
      WHERE r.listing_id = $1
    `;

    const params = [listingId];

    if (user_id) {
      query += ' AND t.user_id = $2';
      params.push(user_id);
    }

    query += ' ORDER BY t.ticket_number ASC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets'
    });
  }
});

module.exports = router;
