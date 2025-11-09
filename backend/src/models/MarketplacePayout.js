/**
 * MarketplacePayout Model
 * Handles seller payout requests and history
 */

const pool = require('../config/database');

class MarketplacePayout {
  /**
   * Create a new payout request
   */
  static async create({
    sellerId,
    amount,
    currency = 'USD',
    feeAmount = 0,
    payoutMethod = null,
    payoutProvider = 'mock',
    bankAccountLast4 = null,
    routingNumberLast4 = null,
    scheduledFor = null,
    metadata = {}
  }) {
    const query = `
      INSERT INTO marketplace_payouts (
        seller_id, amount, currency, fee_amount,
        payout_method, payout_provider,
        bank_account_last4, routing_number_last4,
        status, scheduled_for, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
      RETURNING *
    `;

    const values = [
      sellerId, amount, currency, feeAmount,
      payoutMethod, payoutProvider,
      bankAccountLast4, routingNumberLast4,
      scheduledFor, JSON.stringify(metadata)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get payout by ID
   */
  static async getById(payoutId, sellerId = null) {
    let query = `
      SELECT
        p.*,
        u.username as seller_username,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
        u.email as seller_email
      FROM marketplace_payouts p
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.id = $1
    `;
    const params = [payoutId];

    if (sellerId) {
      query += ' AND p.seller_id = $2';
      params.push(sellerId);
    }

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Get all payouts for a seller
   */
  static async getBySeller(sellerId, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT *
      FROM marketplace_payouts
      WHERE seller_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [sellerId, limit, offset]);
    return result.rows;
  }

  /**
   * Get pending payouts (for processing)
   */
  static async getPending({ limit = 100 } = {}) {
    const query = `
      SELECT
        p.*,
        u.username as seller_username,
        u.email as seller_email
      FROM marketplace_payouts p
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'pending'
        AND (p.scheduled_for IS NULL OR p.scheduled_for <= CURRENT_TIMESTAMP)
      ORDER BY p.created_at ASC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Update payout status
   */
  static async updateStatus(payoutId, status, errorMessage = null) {
    const query = `
      UPDATE marketplace_payouts
      SET
        status = $1,
        error_message = $2,
        updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, errorMessage, payoutId]);
    return result.rows[0];
  }

  /**
   * Mark payout as processing
   */
  static async markProcessing(payoutId, providerTransactionId = null) {
    const query = `
      UPDATE marketplace_payouts
      SET
        status = 'processing',
        payout_provider_transaction_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [providerTransactionId, payoutId]);
    return result.rows[0];
  }

  /**
   * Mark payout as completed
   */
  static async markCompleted(payoutId, providerTransactionId = null) {
    const query = `
      UPDATE marketplace_payouts
      SET
        status = 'completed',
        payout_provider_transaction_id = COALESCE($1, payout_provider_transaction_id),
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [providerTransactionId, payoutId]);
    return result.rows[0];
  }

  /**
   * Mark payout as failed
   */
  static async markFailed(payoutId, errorMessage, incrementRetry = true) {
    const query = `
      UPDATE marketplace_payouts
      SET
        status = 'failed',
        error_message = $1,
        retry_count = CASE WHEN $2 THEN retry_count + 1 ELSE retry_count END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [errorMessage, incrementRetry, payoutId]);
    return result.rows[0];
  }

  /**
   * Retry a failed payout
   */
  static async retry(payoutId) {
    const query = `
      UPDATE marketplace_payouts
      SET
        status = 'pending',
        error_message = NULL,
        scheduled_for = CURRENT_TIMESTAMP + INTERVAL '1 hour',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'failed' AND retry_count < 3
      RETURNING *
    `;

    const result = await pool.query(query, [payoutId]);
    return result.rows[0];
  }

  /**
   * Get seller balance (available for payout)
   */
  static async getSellerBalance(sellerId) {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN (t.total_amount - t.service_fee) ELSE 0 END), 0) as total_earnings,
        COALESCE((SELECT SUM(net_amount) FROM marketplace_payouts WHERE seller_id = $1 AND status = 'completed'), 0) as total_paid_out,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN (t.total_amount - t.service_fee) ELSE 0 END), 0) -
        COALESCE((SELECT SUM(net_amount) FROM marketplace_payouts WHERE seller_id = $1 AND status = 'completed'), 0) as available_balance,
        COALESCE((SELECT SUM(amount) FROM marketplace_payouts WHERE seller_id = $1 AND status IN ('pending', 'processing')), 0) as pending_payouts
      FROM marketplace_transactions t
      WHERE t.seller_id = $1
    `;

    const result = await pool.query(query, [sellerId]);
    return result.rows[0];
  }

  /**
   * Get payout statistics for a seller
   */
  static async getSellerStats(sellerId) {
    const query = `
      SELECT
        COUNT(*) as total_payouts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payouts,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payouts,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payouts,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END), 0) as total_received,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN fee_amount ELSE 0 END), 0) as total_fees
      FROM marketplace_payouts
      WHERE seller_id = $1
    `;

    const result = await pool.query(query, [sellerId]);
    return result.rows[0];
  }

  /**
   * Get recent payouts (for admin)
   */
  static async getRecent({ limit = 20, offset = 0 } = {}) {
    const query = `
      SELECT
        p.*,
        u.username as seller_username,
        u.email as seller_email
      FROM marketplace_payouts p
      LEFT JOIN users u ON p.seller_id = u.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Calculate minimum payout amount
   */
  static getMinimumPayoutAmount() {
    return 10.00; // $10 minimum
  }

  /**
   * Check if seller can request payout
   */
  static async canRequestPayout(sellerId) {
    const balance = await this.getSellerBalance(sellerId);
    const minAmount = this.getMinimumPayoutAmount();

    return {
      canRequest: parseFloat(balance.available_balance) >= minAmount,
      availableBalance: parseFloat(balance.available_balance),
      minimumRequired: minAmount,
      reason: parseFloat(balance.available_balance) < minAmount
        ? `Minimum payout amount is $${minAmount}`
        : null
    };
  }
}

module.exports = MarketplacePayout;
