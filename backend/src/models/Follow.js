/**
 * Follow Model
 * Handles user follow relationships
 */

const BaseModel = require('./BaseModel');

class Follow extends BaseModel {
  constructor() {
    super('follows');
  }

  /**
   * Create a follow relationship
   * @param {Object} data - Follow data
   * @param {number} data.follower_id - User who is following
   * @param {number} data.following_id - User being followed
   * @param {string} data.status - Follow status (active, muted, blocked)
   * @param {boolean} data.notifications_enabled - Whether notifications are enabled
   * @returns {Object} Created follow relationship
   */
  async create(data) {
    const {
      follower_id,
      following_id,
      status = 'active',
      notifications_enabled = true
    } = data;

    const result = await this.raw(
      `INSERT INTO follows (follower_id, following_id, status, notifications_enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [follower_id, following_id, status, notifications_enabled]
    );

    return result.rows[0];
  }

  /**
   * Check if user A follows user B
   * @param {number} followerId - User who might be following
   * @param {number} followingId - User who might be followed
   * @returns {Object|null} Follow relationship or null
   */
  async isFollowing(followerId, followingId) {
    const result = await this.raw(
      `SELECT * FROM follows
       WHERE follower_id = $1 AND following_id = $2 AND status = 'active'`,
      [followerId, followingId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all users that a user follows
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset, status)
   * @returns {Array} Array of followed users with details
   */
  async getFollowing(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      status = 'active'
    } = options;

    const result = await this.raw(
      `SELECT
        f.*,
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio,
        us.follower_count,
        us.following_count,
        us.post_count
       FROM follows f
       JOIN users u ON f.following_id = u.id
       LEFT JOIN user_stats us ON u.id = us.user_id
       WHERE f.follower_id = $1 AND f.status = $2
       ORDER BY f.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, status, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get all followers of a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset, status)
   * @returns {Array} Array of followers with details
   */
  async getFollowers(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      status = 'active'
    } = options;

    const result = await this.raw(
      `SELECT
        f.*,
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio,
        us.follower_count,
        us.following_count,
        us.post_count
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       LEFT JOIN user_stats us ON u.id = us.user_id
       WHERE f.following_id = $1 AND f.status = $2
       ORDER BY f.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, status, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get follower and following counts for a user
   * @param {number} userId - User ID
   * @returns {Object} Counts object
   */
  async getCounts(userId) {
    const result = await this.raw(
      `SELECT
        follower_count,
        following_count
       FROM user_stats
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || { follower_count: 0, following_count: 0 };
  }

  /**
   * Unfollow a user (delete the relationship)
   * @param {number} followerId - User who is unfollowing
   * @param {number} followingId - User being unfollowed
   * @returns {boolean} Success status
   */
  async unfollow(followerId, followingId) {
    const result = await this.raw(
      `DELETE FROM follows
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [followerId, followingId]
    );

    return result.rows.length > 0;
  }

  /**
   * Update follow status (mute/unmute)
   * @param {number} followerId - User who is following
   * @param {number} followingId - User being followed
   * @param {string} status - New status (active, muted)
   * @returns {Object} Updated follow relationship
   */
  async updateStatus(followerId, followingId, status) {
    const result = await this.raw(
      `UPDATE follows
       SET status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [followerId, followingId, status]
    );

    return result.rows[0] || null;
  }

  /**
   * Toggle notifications for a follow relationship
   * @param {number} followerId - User who is following
   * @param {number} followingId - User being followed
   * @param {boolean} enabled - Notifications enabled
   * @returns {Object} Updated follow relationship
   */
  async toggleNotifications(followerId, followingId, enabled) {
    const result = await this.raw(
      `UPDATE follows
       SET notifications_enabled = $3, updated_at = CURRENT_TIMESTAMP
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [followerId, followingId, enabled]
    );

    return result.rows[0] || null;
  }

  /**
   * Get mutual follows (users who follow each other)
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Array of mutual followers
   */
  async getMutualFollows(userId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const result = await this.raw(
      `SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio,
        us.follower_count,
        us.following_count,
        us.post_count
       FROM follows f1
       JOIN follows f2 ON f1.following_id = f2.follower_id
                      AND f1.follower_id = f2.following_id
       JOIN users u ON f1.following_id = u.id
       LEFT JOIN user_stats us ON u.id = us.user_id
       WHERE f1.follower_id = $1
         AND f1.status = 'active'
         AND f2.status = 'active'
       ORDER BY f1.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get follow suggestions for a user
   * Based on: users followed by people you follow, popular users, etc.
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Array of suggested users
   */
  async getSuggestions(userId, options = {}) {
    const { limit = 10 } = options;

    // Get users followed by people you follow, excluding yourself and who you already follow
    const result = await this.raw(
      `SELECT DISTINCT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio,
        us.follower_count,
        us.following_count,
        us.post_count,
        COUNT(*) OVER (PARTITION BY u.id) as mutual_count
       FROM follows f1
       JOIN follows f2 ON f1.following_id = f2.follower_id
       JOIN users u ON f2.following_id = u.id
       LEFT JOIN user_stats us ON u.id = us.user_id
       WHERE f1.follower_id = $1
         AND f2.following_id != $1
         AND f1.status = 'active'
         AND f2.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM follows f3
           WHERE f3.follower_id = $1 AND f3.following_id = u.id
         )
       ORDER BY us.follower_count DESC, mutual_count DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Check if two users have a mutual follow relationship
   * @param {number} userId1 - First user ID
   * @param {number} userId2 - Second user ID
   * @returns {boolean} True if mutual follow exists
   */
  async isMutualFollow(userId1, userId2) {
    const result = await this.raw(
      `SELECT EXISTS (
         SELECT 1 FROM follows f1
         JOIN follows f2 ON f1.following_id = f2.follower_id
                        AND f1.follower_id = f2.following_id
         WHERE f1.follower_id = $1
           AND f1.following_id = $2
           AND f1.status = 'active'
           AND f2.status = 'active'
       ) as is_mutual`,
      [userId1, userId2]
    );

    return result.rows[0]?.is_mutual || false;
  }

  /**
   * Get a list of user IDs that a user follows
   * Useful for timeline queries
   * @param {number} userId - User ID
   * @returns {Array} Array of user IDs
   */
  async getFollowingIds(userId) {
    const result = await this.raw(
      `SELECT following_id FROM follows
       WHERE follower_id = $1 AND status = 'active'`,
      [userId]
    );

    return result.rows.map(row => row.following_id);
  }
}

module.exports = new Follow();
