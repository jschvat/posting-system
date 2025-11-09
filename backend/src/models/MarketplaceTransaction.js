/**
 * MarketplaceTransaction Model
 * Handles all marketplace purchase transactions
 */

const pool = require('../config/database');

class MarketplaceTransaction {
  /**
   * Create a new transaction
   */
  static async create({
    listingId,
    sellerId,
    buyerId,
    transactionType,
    salePrice,
    shippingCost = 0,
    serviceFee = 0,
    paymentMethod = null,
    fulfillmentMethod = null
  }) {
    const totalAmount = parseFloat(salePrice) + parseFloat(shippingCost) + parseFloat(serviceFee);

    const query = `
      INSERT INTO marketplace_transactions (
        listing_id, seller_id, buyer_id, transaction_type,
        sale_price, shipping_cost, service_fee, total_amount,
        payment_method, fulfillment_method,
        payment_status, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'pending')
      RETURNING *
    `;

    const values = [
      listingId, sellerId, buyerId, transactionType,
      salePrice, shippingCost, serviceFee, totalAmount,
      paymentMethod, fulfillmentMethod
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get transaction by ID
   */
  static async getById(transactionId) {
    const query = `
      SELECT
        t.*,
        l.title as listing_title,
        l.category_id as listing_category_id,
        buyer.username as buyer_username,
        buyer.first_name as buyer_first_name,
        buyer.last_name as buyer_last_name,
        seller.username as seller_username,
        seller.first_name as seller_first_name,
        seller.last_name as seller_last_name
      FROM marketplace_transactions t
      LEFT JOIN marketplace_listings l ON t.listing_id = l.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      LEFT JOIN users seller ON t.seller_id = seller.id
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [transactionId]);
    return result.rows[0] || null;
  }

  /**
   * Get all transactions for a buyer
   */
  static async getByBuyer(buyerId, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT
        t.*,
        l.title as listing_title,
        l.category_id as listing_category_id,
        seller.username as seller_username,
        seller.first_name as seller_first_name,
        seller.last_name as seller_last_name
      FROM marketplace_transactions t
      LEFT JOIN marketplace_listings l ON t.listing_id = l.id
      LEFT JOIN users seller ON t.seller_id = seller.id
      WHERE t.buyer_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [buyerId, limit, offset]);
    return result.rows;
  }

  /**
   * Get all transactions for a seller
   */
  static async getBySeller(sellerId, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT
        t.*,
        l.title as listing_title,
        l.category_id as listing_category_id,
        buyer.username as buyer_username,
        buyer.first_name as buyer_first_name,
        buyer.last_name as buyer_last_name
      FROM marketplace_transactions t
      LEFT JOIN marketplace_listings l ON t.listing_id = l.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      WHERE t.seller_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [sellerId, limit, offset]);
    return result.rows;
  }

  /**
   * Update transaction payment status
   */
  static async updatePaymentStatus(transactionId, paymentStatus, paymentId = null) {
    const query = `
      UPDATE marketplace_transactions
      SET
        payment_status = $1,
        payment_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [paymentStatus, paymentId, transactionId]);
    return result.rows[0];
  }

  /**
   * Update transaction status
   */
  static async updateStatus(transactionId, status) {
    const query = `
      UPDATE marketplace_transactions
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, transactionId]);
    return result.rows[0];
  }

  /**
   * Update shipping information
   */
  static async updateShipping(transactionId, trackingNumber) {
    const query = `
      UPDATE marketplace_transactions
      SET
        tracking_number = $1,
        shipped_at = CURRENT_TIMESTAMP,
        status = 'shipped',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [trackingNumber, transactionId]);
    return result.rows[0];
  }

  /**
   * Mark transaction as delivered
   */
  static async markDelivered(transactionId) {
    const query = `
      UPDATE marketplace_transactions
      SET
        delivered_at = CURRENT_TIMESTAMP,
        status = 'delivered',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [transactionId]);
    return result.rows[0];
  }

  /**
   * Mark transaction as completed
   */
  static async markCompleted(transactionId) {
    const query = `
      UPDATE marketplace_transactions
      SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [transactionId]);
    return result.rows[0];
  }

  /**
   * Cancel transaction
   */
  static async cancel(transactionId, reason = null) {
    const query = `
      UPDATE marketplace_transactions
      SET
        status = 'cancelled',
        payment_status = 'refunded',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `;

    const result = await pool.query(query, [transactionId]);
    return result.rows[0];
  }

  /**
   * Process refund
   */
  static async refund(transactionId) {
    const query = `
      UPDATE marketplace_transactions
      SET
        status = 'refunded',
        payment_status = 'refunded',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [transactionId]);
    return result.rows[0];
  }

  /**
   * Get transaction statistics for a seller
   */
  static async getSellerStats(sellerId) {
    const query = `
      SELECT
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
        COUNT(CASE WHEN status IN ('pending', 'paid', 'shipped', 'delivered') THEN 1 END) as active_transactions,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN service_fee ELSE 0 END), 0) as total_fees,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN (total_amount - service_fee) ELSE 0 END), 0) as net_revenue
      FROM marketplace_transactions
      WHERE seller_id = $1
    `;

    const result = await pool.query(query, [sellerId]);
    return result.rows[0];
  }

  /**
   * Get recent transactions (for admin)
   */
  static async getRecent({ limit = 20, offset = 0 } = {}) {
    const query = `
      SELECT
        t.*,
        l.title as listing_title,
        buyer.username as buyer_username,
        seller.username as seller_username
      FROM marketplace_transactions t
      LEFT JOIN marketplace_listings l ON t.listing_id = l.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      LEFT JOIN users seller ON t.seller_id = seller.id
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }
}

module.exports = MarketplaceTransaction;
