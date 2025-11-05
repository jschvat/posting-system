const db = require('../config/database');

class MarketplaceSaved {
  /**
   * Save a listing
   */
  static async save(userId, listingId, folder = null, notes = null) {
    const result = await db.query(
      `INSERT INTO marketplace_saved_listings (user_id, listing_id, folder, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, listing_id) DO UPDATE
       SET folder = EXCLUDED.folder, notes = EXCLUDED.notes
       RETURNING *`,
      [userId, listingId, folder, notes]
    );

    return result.rows[0];
  }

  /**
   * Unsave a listing
   */
  static async unsave(userId, listingId) {
    const result = await db.query(
      `DELETE FROM marketplace_saved_listings
       WHERE user_id = $1 AND listing_id = $2
       RETURNING id`,
      [userId, listingId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get user's saved listings
   */
  static async findByUser(userId, { folder, limit = 20, offset = 0 }) {
    let query = `
      SELECT
        s.*,
        l.title, l.price, l.status, l.location_city, l.location_state,
        l.listing_type, l.condition,
        c.name as category_name,
        (SELECT file_url FROM marketplace_media WHERE listing_id = l.id AND is_primary = TRUE LIMIT 1) as primary_image,
        u.username as seller_username
      FROM marketplace_saved_listings s
      JOIN marketplace_listings l ON s.listing_id = l.id
      LEFT JOIN marketplace_categories c ON l.category_id = c.id
      JOIN users u ON l.user_id = u.id
      WHERE s.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (folder !== undefined) {
      if (folder === null) {
        query += ` AND s.folder IS NULL`;
      } else {
        query += ` AND s.folder = $${paramIndex}`;
        params.push(folder);
        paramIndex++;
      }
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get user's folders
   */
  static async getFolders(userId) {
    const result = await db.query(
      `SELECT
        folder,
        COUNT(*) as count
      FROM marketplace_saved_listings
      WHERE user_id = $1 AND folder IS NOT NULL
      GROUP BY folder
      ORDER BY folder`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Check if listing is saved by user
   */
  static async isSaved(userId, listingId) {
    const result = await db.query(
      `SELECT id FROM marketplace_saved_listings
       WHERE user_id = $1 AND listing_id = $2`,
      [userId, listingId]
    );

    return result.rows.length > 0;
  }

  /**
   * Set price alert
   */
  static async setPriceAlert(userId, listingId, enabled, threshold = null) {
    const result = await db.query(
      `UPDATE marketplace_saved_listings
       SET price_alert_enabled = $1, price_alert_threshold = $2
       WHERE user_id = $3 AND listing_id = $4
       RETURNING *`,
      [enabled, threshold, userId, listingId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get listings with price alerts that should trigger
   */
  static async getTriggeredAlerts() {
    const result = await db.query(
      `SELECT
        s.user_id,
        s.listing_id,
        s.price_alert_threshold,
        l.price as current_price,
        l.title as listing_title,
        u.email,
        u.username
      FROM marketplace_saved_listings s
      JOIN marketplace_listings l ON s.listing_id = l.id
      JOIN users u ON s.user_id = u.id
      WHERE s.price_alert_enabled = TRUE
        AND s.price_alert_threshold IS NOT NULL
        AND l.price <= s.price_alert_threshold
        AND l.status = 'active'`
    );

    return result.rows;
  }

  /**
   * Update folder for saved listing
   */
  static async updateFolder(userId, listingId, folder) {
    const result = await db.query(
      `UPDATE marketplace_saved_listings
       SET folder = $1
       WHERE user_id = $2 AND listing_id = $3
       RETURNING *`,
      [folder, userId, listingId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update notes for saved listing
   */
  static async updateNotes(userId, listingId, notes) {
    const result = await db.query(
      `UPDATE marketplace_saved_listings
       SET notes = $1
       WHERE user_id = $2 AND listing_id = $3
       RETURNING *`,
      [notes, userId, listingId]
    );

    return result.rows[0] || null;
  }
}

module.exports = MarketplaceSaved;
