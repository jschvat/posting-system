/**
 * Reputation Model
 * Handles user reputation and scoring operations
 */

const { query } = require('../config/database');

class Reputation {
  /**
   * Get reputation for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Reputation record
   */
  static async getByUserId(userId) {
    const result = await query(
      'SELECT * FROM user_reputation WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Get or create reputation record for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Reputation record
   */
  static async getOrCreate(userId) {
    let reputation = await this.getByUserId(userId);
    if (!reputation) {
      const result = await query(
        'INSERT INTO user_reputation (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
      reputation = result.rows[0];
    }
    return reputation;
  }

  /**
   * Recalculate reputation score for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} New reputation score
   */
  static async recalculateScore(userId) {
    const result = await query(
      'SELECT calculate_reputation_score($1) as score',
      [userId]
    );
    return result.rows[0].score;
  }

  /**
   * Get top users by reputation
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Top users
   */
  static async getTopUsers({ limit = 10, level = null } = {}) {
    let query = `
      SELECT
        ur.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio
      FROM user_reputation ur
      JOIN users u ON ur.user_id = u.id
    `;
    const params = [];

    if (level) {
      query += ' WHERE ur.reputation_level = $1';
      params.push(level);
    }

    query += ` ORDER BY ur.reputation_score DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(query, params);
    return result.rows;
  }

  /**
   * Get reputation leaderboard with rankings
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Leaderboard
   */
  static async getLeaderboard({ limit = 50, offset = 0 } = {}) {
    const result = await query(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY ur.reputation_score DESC) as rank,
        ur.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio
      FROM user_reputation ur
      JOIN users u ON ur.user_id = u.id
      ORDER BY ur.reputation_score DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Get user's rank by reputation
   * @param {number} userId - User ID
   * @returns {Promise<number>} Rank (1-indexed)
   */
  static async getUserRank(userId) {
    const result = await query(
      `WITH ranked_users AS (
        SELECT
          user_id,
          ROW_NUMBER() OVER (ORDER BY reputation_score DESC) as rank
        FROM user_reputation
      )
      SELECT rank FROM ranked_users WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.rank || null;
  }

  /**
   * Update quality content counts
   * @param {number} userId - User ID
   * @param {string} type - 'post' or 'comment'
   * @param {boolean} increment - true to increment, false to decrement
   * @returns {Promise<Object>} Updated reputation
   */
  static async updateQualityContent(userId, type, increment = true) {
    const column = type === 'post' ? 'quality_posts_count' : 'quality_comments_count';
    const value = increment ? 1 : -1;

    const result = await query(
      `INSERT INTO user_reputation (user_id, ${column})
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE
       SET ${column} = GREATEST(0, user_reputation.${column} + $2),
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, value]
    );

    // Recalculate score
    await this.recalculateScore(userId);

    return result.rows[0];
  }

  /**
   * Mark content as helpful
   * @param {number} userId - User marking as helpful
   * @param {string} targetType - 'post', 'comment', or 'user'
   * @param {number} targetId - Target ID
   * @returns {Promise<Object>} Helpful mark record
   */
  static async markHelpful(userId, targetType, targetId) {
    try {
      const result = await query(
        'INSERT INTO helpful_marks (user_id, target_type, target_id) VALUES ($1, $2, $3) RETURNING *',
        [userId, targetType, targetId]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Already marked as helpful');
      }
      throw error;
    }
  }

  /**
   * Remove helpful mark
   * @param {number} userId - User removing helpful mark
   * @param {string} targetType - 'post', 'comment', or 'user'
   * @param {number} targetId - Target ID
   * @returns {Promise<Object>} Deleted helpful mark
   */
  static async unmarkHelpful(userId, targetType, targetId) {
    const result = await query(
      'DELETE FROM helpful_marks WHERE user_id = $1 AND target_type = $2 AND target_id = $3 RETURNING *',
      [userId, targetType, targetId]
    );

    if (result.rows[0]) {
      // Get target user and decrement helpful count
      let targetUserId;

      if (targetType === 'post') {
        const post = await query('SELECT user_id FROM posts WHERE id = $1', [targetId]);
        targetUserId = post.rows[0]?.user_id;
      } else if (targetType === 'comment') {
        const comment = await query('SELECT user_id FROM comments WHERE id = $1', [targetId]);
        targetUserId = comment.rows[0]?.user_id;
      } else if (targetType === 'user') {
        targetUserId = targetId;
      }

      if (targetUserId) {
        await query(
          'UPDATE user_reputation SET helpful_count = GREATEST(0, helpful_count - 1), updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
          [targetUserId]
        );
        await this.recalculateScore(targetUserId);
      }
    }

    return result.rows[0];
  }

  /**
   * Check if user has marked content as helpful
   * @param {number} userId - User ID
   * @param {string} targetType - Target type
   * @param {number} targetId - Target ID
   * @returns {Promise<boolean>} Has marked
   */
  static async hasMarkedHelpful(userId, targetType, targetId) {
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM helpful_marks WHERE user_id = $1 AND target_type = $2 AND target_id = $3) as marked',
      [userId, targetType, targetId]
    );
    return result.rows[0].marked;
  }

  /**
   * Get helpful marks count for content
   * @param {string} targetType - Target type
   * @param {number} targetId - Target ID
   * @returns {Promise<number>} Count
   */
  static async getHelpfulCount(targetType, targetId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM helpful_marks WHERE target_type = $1 AND target_id = $2',
      [targetType, targetId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Increment reported count
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated reputation
   */
  static async incrementReported(userId) {
    const result = await query(
      `INSERT INTO user_reputation (user_id, reported_count)
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE
       SET reported_count = user_reputation.reported_count + 1,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId]
    );

    // Recalculate score
    await this.recalculateScore(userId);

    return result.rows[0];
  }

  /**
   * Award badge to user
   * @param {number} userId - User ID
   * @param {Object} badge - Badge data
   * @returns {Promise<Object>} Updated reputation
   */
  static async awardBadge(userId, badge) {
    const reputation = await this.getOrCreate(userId);
    const badges = reputation.badges || [];

    // Check if badge already awarded
    if (badges.some(b => b.id === badge.id)) {
      throw new Error('Badge already awarded');
    }

    badges.push({
      ...badge,
      awarded_at: new Date().toISOString()
    });

    const result = await query(
      'UPDATE user_reputation SET badges = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING *',
      [userId, JSON.stringify(badges)]
    );

    return result.rows[0];
  }

  /**
   * Get badges for user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Badges
   */
  static async getBadges(userId) {
    const reputation = await this.getByUserId(userId);
    return reputation?.badges || [];
  }

  /**
   * Recalculate all user reputation scores (admin function)
   * @returns {Promise<number>} Number of users updated
   */
  static async recalculateAll() {
    const result = await query(
      'SELECT user_id FROM user_reputation'
    );

    let count = 0;
    for (const row of result.rows) {
      await this.recalculateScore(row.user_id);
      count++;
    }

    return count;
  }

  /**
   * Execute raw SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  static async raw(query, params = []) {
    return await query(query, params);
  }
}

module.exports = Reputation;
