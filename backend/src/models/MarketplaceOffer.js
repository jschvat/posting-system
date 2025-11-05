const db = require('../config/database');

class MarketplaceOffer {
  /**
   * Create a new offer
   */
  static async create(offerData) {
    const { listing_id, buyer_id, seller_id, offer_amount, message } = offerData;

    const result = await db.query(
      `INSERT INTO marketplace_offers (
        listing_id, buyer_id, seller_id, offer_amount, message
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [listing_id, buyer_id, seller_id, offer_amount, message]
    );

    return result.rows[0];
  }

  /**
   * Get offer by ID
   */
  static async findById(offerId) {
    const result = await db.query(
      `SELECT
        o.*,
        l.title as listing_title,
        l.price as listing_price,
        l.status as listing_status,
        (SELECT file_url FROM marketplace_media WHERE listing_id = l.id AND is_primary = TRUE LIMIT 1) as listing_image,
        buyer.username as buyer_username,
        buyer.full_name as buyer_name,
        seller.username as seller_username,
        seller.full_name as seller_name
      FROM marketplace_offers o
      JOIN marketplace_listings l ON o.listing_id = l.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE o.id = $1`,
      [offerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get offers for a listing (seller view)
   */
  static async findByListing(listingId, sellerId) {
    const result = await db.query(
      `SELECT
        o.*,
        buyer.username as buyer_username,
        buyer.full_name as buyer_name,
        buyer.profile_image_url as buyer_image
      FROM marketplace_offers o
      JOIN users buyer ON o.buyer_id = buyer.id
      WHERE o.listing_id = $1 AND o.seller_id = $2
      ORDER BY
        CASE o.status
          WHEN 'pending' THEN 1
          WHEN 'countered' THEN 2
          ELSE 3
        END,
        o.created_at DESC`,
      [listingId, sellerId]
    );

    return result.rows;
  }

  /**
   * Get received offers (seller view)
   */
  static async findReceivedOffers(sellerId, { status, limit = 20, offset = 0 }) {
    let query = `
      SELECT
        o.*,
        l.title as listing_title,
        l.price as listing_price,
        (SELECT file_url FROM marketplace_media WHERE listing_id = l.id AND is_primary = TRUE LIMIT 1) as listing_image,
        buyer.username as buyer_username,
        buyer.full_name as buyer_name,
        buyer.profile_image_url as buyer_image
      FROM marketplace_offers o
      JOIN marketplace_listings l ON o.listing_id = l.id
      JOIN users buyer ON o.buyer_id = buyer.id
      WHERE o.seller_id = $1
    `;

    const params = [sellerId];
    let paramIndex = 2;

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get sent offers (buyer view)
   */
  static async findSentOffers(buyerId, { status, limit = 20, offset = 0 }) {
    let query = `
      SELECT
        o.*,
        l.title as listing_title,
        l.price as listing_price,
        l.status as listing_status,
        (SELECT file_url FROM marketplace_media WHERE listing_id = l.id AND is_primary = TRUE LIMIT 1) as listing_image,
        seller.username as seller_username,
        seller.full_name as seller_name
      FROM marketplace_offers o
      JOIN marketplace_listings l ON o.listing_id = l.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE o.buyer_id = $1
    `;

    const params = [buyerId];
    let paramIndex = 2;

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Accept an offer
   */
  static async accept(offerId, sellerId) {
    const result = await db.query(
      `UPDATE marketplace_offers
       SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND seller_id = $2 AND status = 'pending'
       RETURNING *`,
      [offerId, sellerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Reject an offer
   */
  static async reject(offerId, sellerId) {
    const result = await db.query(
      `UPDATE marketplace_offers
       SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND seller_id = $2 AND status = 'pending'
       RETURNING *`,
      [offerId, sellerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Counter an offer
   */
  static async counter(offerId, sellerId, counterAmount, counterMessage) {
    const result = await db.query(
      `UPDATE marketplace_offers
       SET
        status = 'countered',
        counter_amount = $1,
        counter_message = $2,
        responded_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND seller_id = $4 AND status = 'pending'
       RETURNING *`,
      [counterAmount, counterMessage, offerId, sellerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Accept counter offer (buyer)
   */
  static async acceptCounter(offerId, buyerId) {
    const result = await db.query(
      `UPDATE marketplace_offers
       SET status = 'counter_accepted'
       WHERE id = $1 AND buyer_id = $2 AND status = 'countered'
       RETURNING *`,
      [offerId, buyerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Reject counter offer (buyer)
   */
  static async rejectCounter(offerId, buyerId) {
    const result = await db.query(
      `UPDATE marketplace_offers
       SET status = 'counter_rejected'
       WHERE id = $1 AND buyer_id = $2 AND status = 'countered'
       RETURNING *`,
      [offerId, buyerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Withdraw an offer (buyer)
   */
  static async withdraw(offerId, buyerId) {
    const result = await db.query(
      `UPDATE marketplace_offers
       SET status = 'withdrawn'
       WHERE id = $1 AND buyer_id = $2 AND status IN ('pending', 'countered')
       RETURNING *`,
      [offerId, buyerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Expire old pending offers (cron job)
   */
  static async expireOldOffers() {
    const result = await db.query(
      `UPDATE marketplace_offers
       SET status = 'expired'
       WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP
       RETURNING id`
    );

    return result.rows.length;
  }
}

module.exports = MarketplaceOffer;
