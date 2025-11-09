/**
 * MarketplacePaymentMethod Model
 * Handles user payment methods (tokenized, no sensitive data stored)
 */

const pool = require('../config/database');

class MarketplacePaymentMethod {
  /**
   * Create a new payment method
   */
  static async create({
    userId,
    paymentType,
    provider = 'mock',
    providerPaymentMethodId = null,
    displayName,
    brand = null,
    last4 = null,
    expMonth = null,
    expYear = null,
    isDefault = false,
    metadata = {}
  }) {
    // If this is being set as default, unset all other defaults for this user
    if (isDefault) {
      await pool.query(
        'UPDATE marketplace_payment_methods SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    const query = `
      INSERT INTO marketplace_payment_methods (
        user_id, payment_type, provider, provider_payment_method_id,
        display_name, brand, last4, exp_month, exp_year,
        is_default, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      userId, paymentType, provider, providerPaymentMethodId,
      displayName, brand, last4, expMonth, expYear,
      isDefault, JSON.stringify(metadata)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get payment method by ID
   */
  static async getById(paymentMethodId, userId = null) {
    let query = 'SELECT * FROM marketplace_payment_methods WHERE id = $1';
    const params = [paymentMethodId];

    if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Get all payment methods for a user
   */
  static async getByUser(userId, activeOnly = true) {
    let query = `
      SELECT *
      FROM marketplace_payment_methods
      WHERE user_id = $1
    `;

    if (activeOnly) {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY is_default DESC, created_at DESC';

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get default payment method for a user
   */
  static async getDefault(userId) {
    const query = `
      SELECT *
      FROM marketplace_payment_methods
      WHERE user_id = $1 AND is_default = true AND is_active = true
      LIMIT 1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Set payment method as default
   */
  static async setDefault(paymentMethodId, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Unset all defaults for this user
      await client.query(
        'UPDATE marketplace_payment_methods SET is_default = false WHERE user_id = $1',
        [userId]
      );

      // Set this one as default
      const result = await client.query(
        `UPDATE marketplace_payment_methods
         SET is_default = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_active = true
         RETURNING *`,
        [paymentMethodId, userId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update payment method
   */
  static async update(paymentMethodId, userId, updates) {
    const allowedUpdates = ['display_name', 'is_default', 'metadata'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramCount}`);
        values.push(key === 'metadata' ? JSON.stringify(value) : value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // If setting as default, unset others first
    if (updates.isDefault) {
      await pool.query(
        'UPDATE marketplace_payment_methods SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(paymentMethodId, userId);

    const query = `
      UPDATE marketplace_payment_methods
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Deactivate payment method (soft delete)
   */
  static async deactivate(paymentMethodId, userId) {
    const query = `
      UPDATE marketplace_payment_methods
      SET
        is_active = false,
        is_default = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [paymentMethodId, userId]);
    return result.rows[0];
  }

  /**
   * Delete payment method (hard delete)
   */
  static async delete(paymentMethodId, userId) {
    const query = `
      DELETE FROM marketplace_payment_methods
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [paymentMethodId, userId]);
    return result.rows[0];
  }

  /**
   * Count active payment methods for a user
   */
  static async countActive(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM marketplace_payment_methods
      WHERE user_id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Validate card expiration
   */
  static isCardExpired(expMonth, expYear) {
    if (!expMonth || !expYear) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (expYear < currentYear) return true;
    if (expYear === currentYear && expMonth < currentMonth) return true;

    return false;
  }

  /**
   * Get expired cards for a user
   */
  static async getExpired(userId) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const query = `
      SELECT *
      FROM marketplace_payment_methods
      WHERE user_id = $1
        AND payment_type = 'card'
        AND is_active = true
        AND (
          exp_year < $2
          OR (exp_year = $2 AND exp_month < $3)
        )
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId, currentYear, currentMonth]);
    return result.rows;
  }
}

module.exports = MarketplacePaymentMethod;
