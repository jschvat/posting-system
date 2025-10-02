/**
 * UserStats Model
 * Handles denormalized user statistics for performance
 */

const BaseModel = require('./BaseModel');

class UserStats extends BaseModel {
  constructor() {
    super('user_stats');
  }

  /**
   * Get stats for a user
   * @param {number} userId - User ID
   * @returns {Object|null} User stats or null
   */
  async getByUserId(userId) {
    const result = await this.raw(
      `SELECT * FROM user_stats WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get stats for multiple users
   * @param {Array} userIds - Array of user IDs
   * @returns {Object} Map of user IDs to stats
   */
  async getByUserIds(userIds) {
    if (userIds.length === 0) return {};

    const result = await this.raw(
      `SELECT * FROM user_stats WHERE user_id = ANY($1)`,
      [userIds]
    );

    const stats = {};
    result.rows.forEach(row => {
      stats[row.user_id] = row;
    });

    return stats;
  }

  /**
   * Initialize stats for a user
   * @param {number} userId - User ID
   * @returns {Object} Created stats
   */
  async initialize(userId) {
    const result = await this.raw(
      `INSERT INTO user_stats (
        user_id,
        follower_count,
        following_count,
        post_count,
        total_reactions_received,
        total_shares_received,
        total_comments_received,
        engagement_score,
        last_post_at
      )
      VALUES ($1, 0, 0, 0, 0, 0, 0, 0, NULL)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *`,
      [userId]
    );

    return result.rows[0] || await this.getByUserId(userId);
  }

  /**
   * Update follower count
   * @param {number} userId - User ID
   * @param {number} delta - Change in count (+1 or -1)
   * @returns {Object} Updated stats
   */
  async updateFollowerCount(userId, delta) {
    const result = await this.raw(
      `UPDATE user_stats
       SET follower_count = GREATEST(0, follower_count + $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId, delta]
    );

    return result.rows[0] || null;
  }

  /**
   * Update following count
   * @param {number} userId - User ID
   * @param {number} delta - Change in count (+1 or -1)
   * @returns {Object} Updated stats
   */
  async updateFollowingCount(userId, delta) {
    const result = await this.raw(
      `UPDATE user_stats
       SET following_count = GREATEST(0, following_count + $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId, delta]
    );

    return result.rows[0] || null;
  }

  /**
   * Update post count and last post time
   * @param {number} userId - User ID
   * @param {number} delta - Change in count (+1 or -1)
   * @returns {Object} Updated stats
   */
  async updatePostCount(userId, delta) {
    const result = await this.raw(
      `UPDATE user_stats
       SET post_count = GREATEST(0, post_count + $2),
           last_post_at = CASE WHEN $2 > 0 THEN CURRENT_TIMESTAMP ELSE last_post_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId, delta]
    );

    return result.rows[0] || null;
  }

  /**
   * Update reaction count
   * @param {number} userId - User ID (post/comment owner)
   * @param {number} delta - Change in count (+1 or -1)
   * @returns {Object} Updated stats
   */
  async updateReactionCount(userId, delta) {
    const result = await this.raw(
      `UPDATE user_stats
       SET total_reactions_received = GREATEST(0, total_reactions_received + $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId, delta]
    );

    return result.rows[0] || null;
  }

  /**
   * Update share count
   * @param {number} userId - User ID (post owner)
   * @param {number} delta - Change in count (+1 or -1)
   * @returns {Object} Updated stats
   */
  async updateShareCount(userId, delta) {
    const result = await this.raw(
      `UPDATE user_stats
       SET total_shares_received = GREATEST(0, total_shares_received + $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId, delta]
    );

    return result.rows[0] || null;
  }

  /**
   * Update comment count
   * @param {number} userId - User ID (post owner)
   * @param {number} delta - Change in count (+1 or -1)
   * @returns {Object} Updated stats
   */
  async updateCommentCount(userId, delta) {
    const result = await this.raw(
      `UPDATE user_stats
       SET total_comments_received = GREATEST(0, total_comments_received + $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId, delta]
    );

    return result.rows[0] || null;
  }

  /**
   * Calculate and update engagement score
   * Score = (reactions * 1) + (comments * 2) + (shares * 3)
   * @param {number} userId - User ID
   * @returns {Object} Updated stats
   */
  async updateEngagementScore(userId) {
    const result = await this.raw(
      `UPDATE user_stats
       SET engagement_score = (
         (total_reactions_received * 1.0) +
         (total_comments_received * 2.0) +
         (total_shares_received * 3.0)
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Recalculate all stats from actual data
   * Useful for fixing inconsistencies
   * @param {number} userId - User ID
   * @returns {Object} Updated stats
   */
  async recalculate(userId) {
    const result = await this.raw(
      `INSERT INTO user_stats (
        user_id,
        follower_count,
        following_count,
        post_count,
        total_reactions_received,
        total_shares_received,
        total_comments_received,
        engagement_score,
        last_post_at
      )
      SELECT
        $1,
        (SELECT COUNT(*) FROM follows WHERE following_id = $1 AND status = 'active'),
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND status = 'active'),
        (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_published = true),
        (SELECT COUNT(*) FROM reactions r
         JOIN posts p ON r.post_id = p.id
         WHERE p.user_id = $1),
        (SELECT COUNT(*) FROM shares s
         JOIN posts p ON s.post_id = p.id
         WHERE p.user_id = $1),
        (SELECT COUNT(*) FROM comments c
         JOIN posts p ON c.post_id = p.id
         WHERE p.user_id = $1 AND c.is_published = true),
        0,
        (SELECT MAX(created_at) FROM posts WHERE user_id = $1)
      ON CONFLICT (user_id) DO UPDATE SET
        follower_count = EXCLUDED.follower_count,
        following_count = EXCLUDED.following_count,
        post_count = EXCLUDED.post_count,
        total_reactions_received = EXCLUDED.total_reactions_received,
        total_shares_received = EXCLUDED.total_shares_received,
        total_comments_received = EXCLUDED.total_comments_received,
        last_post_at = EXCLUDED.last_post_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [userId]
    );

    const stats = result.rows[0];

    // Update engagement score
    if (stats) {
      await this.updateEngagementScore(userId);
    }

    return await this.getByUserId(userId);
  }

  /**
   * Get top users by follower count
   * @param {Object} options - Query options
   * @returns {Array} Array of top users
   */
  async getTopByFollowers(options = {}) {
    const { limit = 10, offset = 0 } = options;

    const result = await this.raw(
      `SELECT
        us.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio
       FROM user_stats us
       JOIN users u ON us.user_id = u.id
       WHERE u.is_active = true
       ORDER BY us.follower_count DESC, u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  /**
   * Get top users by engagement score
   * @param {Object} options - Query options
   * @returns {Array} Array of top users
   */
  async getTopByEngagement(options = {}) {
    const { limit = 10, offset = 0 } = options;

    const result = await this.raw(
      `SELECT
        us.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio
       FROM user_stats us
       JOIN users u ON us.user_id = u.id
       WHERE u.is_active = true AND us.engagement_score > 0
       ORDER BY us.engagement_score DESC, u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  /**
   * Get most active users (recent posters)
   * @param {Object} options - Query options
   * @returns {Array} Array of active users
   */
  async getMostActive(options = {}) {
    const { limit = 10, timeframe = '7 days' } = options;

    const result = await this.raw(
      `SELECT
        us.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio
       FROM user_stats us
       JOIN users u ON us.user_id = u.id
       WHERE u.is_active = true
         AND us.last_post_at > NOW() - INTERVAL $1
       ORDER BY us.last_post_at DESC
       LIMIT $2`,
      [timeframe, limit]
    );

    return result.rows;
  }

  /**
   * Get overall platform statistics
   * @returns {Object} Platform-wide stats
   */
  async getPlatformStats() {
    const result = await this.raw(
      `SELECT
        COUNT(DISTINCT user_id) as total_users,
        SUM(follower_count) as total_follows,
        SUM(post_count) as total_posts,
        SUM(total_reactions_received) as total_reactions,
        SUM(total_shares_received) as total_shares,
        SUM(total_comments_received) as total_comments,
        AVG(follower_count) as avg_followers_per_user,
        AVG(following_count) as avg_following_per_user,
        AVG(engagement_score) as avg_engagement_score
       FROM user_stats`
    );

    return result.rows[0];
  }
}

module.exports = new UserStats();
