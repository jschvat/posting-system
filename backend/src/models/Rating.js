/**
 * Rating Model
 * Handles user rating operations
 */

const { query } = require('../config/database');

class Rating {
  /**
   * Create a new rating
   * @param {Object} data - Rating data
   * @returns {Promise<Object>} Created rating
   */
  static async create({
    rater_id,
    rated_user_id,
    rating_type,
    rating_value,
    context_type = null,
    context_id = null,
    review_text = null,
    is_anonymous = false,
    is_verified = false
  }) {
    const result = await query(
      `INSERT INTO user_ratings
       (rater_id, rated_user_id, rating_type, rating_value, context_type, context_id, review_text, is_anonymous, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [rater_id, rated_user_id, rating_type, rating_value, context_type, context_id, review_text, is_anonymous, is_verified]
    );
    return result.rows[0];
  }

  /**
   * Update an existing rating
   * @param {number} id - Rating ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated rating
   */
  static async update(id, { rating_value, review_text }) {
    const result = await query(
      `UPDATE user_ratings
       SET rating_value = COALESCE($2, rating_value),
           review_text = COALESCE($3, review_text),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, rating_value, review_text]
    );
    return result.rows[0];
  }

  /**
   * Delete a rating
   * @param {number} id - Rating ID
   * @returns {Promise<Object>} Deleted rating
   */
  static async delete(id) {
    const result = await query(
      'DELETE FROM user_ratings WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Get rating by ID
   * @param {number} id - Rating ID
   * @returns {Promise<Object>} Rating
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM user_ratings WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Get ratings for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of ratings
   */
  static async getRatingsForUser(userId, { limit = 20, offset = 0, rating_type = null } = {}) {
    let sqlQuery = `
      SELECT
        ur.*,
        u.username as rater_username,
        u.first_name as rater_first_name,
        u.last_name as rater_last_name,
        u.avatar_url as rater_avatar
      FROM user_ratings ur
      JOIN users u ON ur.rater_id = u.id
      WHERE ur.rated_user_id = $1
        AND (ur.is_anonymous = false OR ur.is_anonymous IS NULL)
    `;
    const params = [userId];

    if (rating_type) {
      sqlQuery += ` AND ur.rating_type = $${params.length + 1}`;
      params.push(rating_type);
    }

    sqlQuery += ` ORDER BY ur.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sqlQuery, params);
    return result.rows;
  }

  /**
   * Get ratings given by a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of ratings
   */
  static async getRatingsGivenByUser(userId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT
        ur.*,
        u.username as rated_username,
        u.first_name as rated_first_name,
        u.last_name as rated_last_name,
        u.avatar_url as rated_avatar
      FROM user_ratings ur
      JOIN users u ON ur.rated_user_id = u.id
      WHERE ur.rater_id = $1
      ORDER BY ur.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Get rating by rater and context
   * @param {number} rater_id - Rater user ID
   * @param {number} rated_user_id - Rated user ID
   * @param {string} context_type - Context type
   * @param {number} context_id - Context ID
   * @returns {Promise<Object>} Rating
   */
  static async getByRaterAndContext(rater_id, rated_user_id, context_type, context_id) {
    const result = await query(
      'SELECT * FROM user_ratings WHERE rater_id = $1 AND rated_user_id = $2 AND context_type = $3 AND context_id = $4',
      [rater_id, rated_user_id, context_type, context_id]
    );
    return result.rows[0];
  }

  /**
   * Check if user can rate another user
   * Users can rate if they have interacted (followed, commented on posts, etc)
   * @param {number} rater_id - Rater user ID
   * @param {number} rated_user_id - Rated user ID
   * @returns {Promise<boolean>} Can rate
   */
  static async canRate(rater_id, rated_user_id) {
    // Prevent self-rating
    if (rater_id === rated_user_id) {
      return false;
    }

    // Check if users have interacted
    const result = await query(
      `SELECT EXISTS(
        -- Check if rater follows rated user
        SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2
        UNION
        -- Check if rater commented on rated user's posts
        SELECT 1 FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.user_id = $1 AND p.user_id = $2
        UNION
        -- Check if rated user commented on rater's posts
        SELECT 1 FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.user_id = $2 AND p.user_id = $1
        UNION
        -- Check if they are mutual followers
        SELECT 1 FROM follows f1
        JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
        WHERE f1.follower_id = $1 AND f1.following_id = $2
      ) as can_rate`,
      [rater_id, rated_user_id]
    );
    return result.rows[0].can_rate;
  }

  /**
   * Get rating statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Rating statistics
   */
  static async getStats(userId) {
    const result = await query(
      `SELECT
        COUNT(*) as total_ratings,
        AVG(rating_value) as average_rating,
        COUNT(*) FILTER (WHERE rating_value = 5) as five_star,
        COUNT(*) FILTER (WHERE rating_value = 4) as four_star,
        COUNT(*) FILTER (WHERE rating_value = 3) as three_star,
        COUNT(*) FILTER (WHERE rating_value = 2) as two_star,
        COUNT(*) FILTER (WHERE rating_value = 1) as one_star
      FROM user_ratings
      WHERE rated_user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Report a rating
   * @param {number} rating_id - Rating ID
   * @param {number} reporter_id - Reporter user ID
   * @param {string} report_reason - Reason for report
   * @param {string} report_details - Details
   * @returns {Promise<Object>} Report record
   */
  static async report(rating_id, reporter_id, report_reason, report_details = null) {
    const result = await query(
      `INSERT INTO rating_reports (rating_id, reporter_id, report_reason, report_details)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [rating_id, reporter_id, report_reason, report_details]
    );
    return result.rows[0];
  }

  /**
   * Get reports for a rating
   * @param {number} rating_id - Rating ID
   * @returns {Promise<Array>} Reports
   */
  static async getReports(rating_id) {
    const result = await query(
      `SELECT
        rr.*,
        u.username as reporter_username
      FROM rating_reports rr
      JOIN users u ON rr.reporter_id = u.id
      WHERE rr.rating_id = $1
      ORDER BY rr.created_at DESC`,
      [rating_id]
    );
    return result.rows;
  }

  /**
   * Execute raw SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  static async raw(query, params = []) {
    return await pool.query(query, params);
  }
}

module.exports = Rating;
