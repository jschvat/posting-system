/**
 * Share Model
 * Handles post sharing and reposts
 */

const BaseModel = require('./BaseModel');

class Share extends BaseModel {
  constructor() {
    super('shares');
  }

  /**
   * Create a share
   * @param {Object} data - Share data
   * @param {number} data.user_id - User who is sharing
   * @param {number} data.post_id - Post being shared
   * @param {string} data.share_type - Type of share (repost, quote, external)
   * @param {string} data.share_comment - Optional comment on the share
   * @param {string} data.visibility - Share visibility (public, friends, private)
   * @returns {Object} Created share
   */
  async create(data) {
    const {
      user_id,
      post_id,
      share_type = 'repost',
      share_comment = null,
      visibility = 'public'
    } = data;

    const result = await this.raw(
      `INSERT INTO shares (user_id, post_id, share_type, share_comment, visibility)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, post_id, share_type, share_comment, visibility]
    );

    return result.rows[0];
  }

  /**
   * Check if a user has shared a post
   * @param {number} userId - User ID
   * @param {number} postId - Post ID
   * @returns {Object|null} Share or null
   */
  async hasShared(userId, postId) {
    const result = await this.raw(
      `SELECT * FROM shares
       WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all shares by a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset, type)
   * @returns {Array} Array of shares with post details
   */
  async getByUser(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      share_type = null
    } = options;

    let sql = `
      SELECT
        s.*,
        p.id as post_id,
        p.content as post_content,
        p.created_at as post_created_at,
        p.user_id as post_author_id,
        u.username as post_author_username,
        u.first_name as post_author_first_name,
        u.last_name as post_author_last_name,
        u.avatar_url as post_author_avatar,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_published = true) as comment_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', m.id,
              'filename', m.filename,
              'file_url', m.file_url,
              'media_type', m.media_type
            )
          ) FROM media m WHERE m.post_id = p.id),
          '[]'::json
        ) as post_media
      FROM shares s
      JOIN posts p ON s.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (share_type) {
      sql += ` AND s.share_type = $${paramIndex}`;
      params.push(share_type);
      paramIndex++;
    }

    sql += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.raw(sql, params);
    return result.rows;
  }

  /**
   * Get all shares of a specific post
   * @param {number} postId - Post ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Array} Array of shares with user details
   */
  async getByPost(postId, options = {}) {
    const {
      limit = 20,
      offset = 0
    } = options;

    const result = await this.raw(
      `SELECT
        s.*,
        u.id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        us.follower_count
       FROM shares s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN user_stats us ON u.id = us.user_id
       WHERE s.post_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get share count for a post
   * @param {number} postId - Post ID
   * @returns {number} Share count
   */
  async getShareCount(postId) {
    const result = await this.raw(
      `SELECT COUNT(*) as count FROM shares WHERE post_id = $1`,
      [postId]
    );

    return parseInt(result.rows[0]?.count || 0);
  }

  /**
   * Get share counts for multiple posts
   * @param {Array} postIds - Array of post IDs
   * @returns {Object} Map of post IDs to share counts
   */
  async getShareCounts(postIds) {
    if (postIds.length === 0) return {};

    const result = await this.raw(
      `SELECT post_id, COUNT(*) as count
       FROM shares
       WHERE post_id = ANY($1)
       GROUP BY post_id`,
      [postIds]
    );

    const counts = {};
    result.rows.forEach(row => {
      counts[row.post_id] = parseInt(row.count);
    });

    return counts;
  }

  /**
   * Delete a share (unshare)
   * @param {number} userId - User ID
   * @param {number} postId - Post ID
   * @returns {boolean} Success status
   */
  async deleteShare(userId, postId) {
    const result = await this.raw(
      `DELETE FROM shares
       WHERE user_id = $1 AND post_id = $2
       RETURNING *`,
      [userId, postId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get recent shares from users a user follows
   * For timeline/feed generation
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Array of shares from followed users
   */
  async getFollowingShares(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      since = null
    } = options;

    let sql = `
      SELECT
        s.*,
        s.user_id as sharer_id,
        sharer.username as sharer_username,
        sharer.first_name as sharer_first_name,
        sharer.last_name as sharer_last_name,
        sharer.avatar_url as sharer_avatar,
        p.id as post_id,
        p.content as post_content,
        p.created_at as post_created_at,
        p.user_id as post_author_id,
        author.username as post_author_username,
        author.first_name as post_author_first_name,
        author.last_name as post_author_last_name,
        author.avatar_url as post_author_avatar,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_published = true) as comment_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', m.id,
              'filename', m.filename,
              'file_url', m.file_url,
              'media_type', m.media_type
            )
          ) FROM media m WHERE m.post_id = p.id),
          '[]'::json
        ) as post_media
      FROM shares s
      JOIN follows f ON s.user_id = f.following_id
      JOIN posts p ON s.post_id = p.id
      JOIN users sharer ON s.user_id = sharer.id
      JOIN users author ON p.user_id = author.id
      WHERE f.follower_id = $1
        AND f.status = 'active'
        AND p.is_published = true
    `;

    const params = [userId];
    let paramIndex = 2;

    if (since) {
      sql += ` AND s.created_at > $${paramIndex}`;
      params.push(since);
      paramIndex++;
    }

    sql += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.raw(sql, params);
    return result.rows;
  }

  /**
   * Get popular shares (most shared posts)
   * @param {Object} options - Query options
   * @returns {Array} Array of most shared posts
   */
  async getPopularShares(options = {}) {
    const {
      limit = 10,
      timeframe = '7 days'
    } = options;

    const result = await this.raw(
      `SELECT
        p.id as post_id,
        p.content as post_content,
        p.user_id as post_author_id,
        u.username as post_author_username,
        u.first_name as post_author_first_name,
        u.last_name as post_author_last_name,
        u.avatar_url as post_author_avatar,
        COUNT(s.id) as share_count,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', m.id,
              'filename', m.filename,
              'file_url', m.file_url,
              'media_type', m.media_type
            )
          ) FROM media m WHERE m.post_id = p.id),
          '[]'::json
        ) as post_media
       FROM shares s
       JOIN posts p ON s.post_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE s.created_at > NOW() - INTERVAL '${timeframe}'
         AND p.is_published = true
       GROUP BY p.id, p.content, p.user_id, u.username, u.first_name, u.last_name, u.avatar_url
       HAVING COUNT(s.id) > 0
       ORDER BY share_count DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Update share comment
   * @param {number} userId - User ID
   * @param {number} postId - Post ID
   * @param {string} comment - New comment
   * @returns {Object} Updated share
   */
  async updateComment(userId, postId, comment) {
    const result = await this.raw(
      `UPDATE shares
       SET share_comment = $3
       WHERE user_id = $1 AND post_id = $2
       RETURNING *`,
      [userId, postId, comment]
    );

    return result.rows[0] || null;
  }
}

module.exports = new Share();
