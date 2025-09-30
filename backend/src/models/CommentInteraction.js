/**
 * CommentInteraction Model - Pure PostgreSQL implementation
 * Handles tracking of user interactions with comments for algorithm support
 */

const { initializeDatabase } = require('../config/database');

class CommentInteraction {
  /**
   * Create a new comment interaction
   */
  static async create(data) {
    const db = await initializeDatabase();

    const {
      comment_id,
      interaction_type,
      user_id = null,
      session_id = null,
      ip_address = null,
      user_agent = null,
      metadata = {}
    } = data;

    const result = await db.query(
      `INSERT INTO comment_interactions
       (comment_id, interaction_type, user_id, session_id, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [comment_id, interaction_type, user_id, session_id, ip_address, user_agent, JSON.stringify(metadata)]
    );

    return result.rows[0];
  }

  /**
   * Get interactions for a specific comment
   */
  static async getByCommentId(commentId, options = {}) {
    const db = await initializeDatabase();

    const {
      interaction_type = null,
      limit = 100,
      offset = 0,
      sort = 'DESC'
    } = options;

    let query = `
      SELECT ci.*, u.username
      FROM comment_interactions ci
      LEFT JOIN users u ON ci.user_id = u.id
      WHERE ci.comment_id = $1
    `;

    const params = [commentId];

    if (interaction_type) {
      query += ` AND ci.interaction_type = $${params.length + 1}`;
      params.push(interaction_type);
    }

    query += ` ORDER BY ci.created_at ${sort} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get interaction counts by type for a comment
   */
  static async getInteractionCounts(commentId) {
    const db = await initializeDatabase();

    const result = await db.query(
      `SELECT interaction_type, COUNT(*) as count
       FROM comment_interactions
       WHERE comment_id = $1
       GROUP BY interaction_type`,
      [commentId]
    );

    return result.rows.reduce((acc, row) => {
      acc[row.interaction_type] = parseInt(row.count);
      return acc;
    }, {});
  }

  /**
   * Track a comment view (with deduplication)
   */
  static async trackView(commentId, options = {}) {
    const db = await initializeDatabase();

    const {
      user_id = null,
      session_id = null,
      ip_address = null,
      user_agent = null
    } = options;

    // Check for recent view to prevent spam
    const recentViewQuery = `
      SELECT id FROM comment_interactions
      WHERE comment_id = $1
      AND interaction_type = 'view'
      AND created_at > NOW() - INTERVAL '10 minutes'
      AND (
        (user_id IS NOT NULL AND user_id = $2) OR
        (session_id IS NOT NULL AND session_id = $3) OR
        (ip_address IS NOT NULL AND ip_address = $4)
      )
      LIMIT 1
    `;

    const recentView = await db.query(recentViewQuery, [commentId, user_id, session_id, ip_address]);

    if (recentView.rows.length === 0) {
      return await this.create({
        comment_id: commentId,
        interaction_type: 'view',
        user_id,
        session_id,
        ip_address,
        user_agent
      });
    }

    return null; // View already tracked recently
  }

  /**
   * Track a deep read (extended viewing)
   */
  static async trackDeepRead(commentId, options = {}) {
    return await this.create({
      comment_id: commentId,
      interaction_type: 'deep_read',
      ...options
    });
  }

  /**
   * Track a reply interaction
   */
  static async trackReply(commentId, options = {}) {
    return await this.create({
      comment_id: commentId,
      interaction_type: 'reply',
      ...options
    });
  }

  /**
   * Track a reaction interaction
   */
  static async trackReaction(commentId, options = {}) {
    return await this.create({
      comment_id: commentId,
      interaction_type: 'reaction',
      ...options
    });
  }

  /**
   * Track a share interaction
   */
  static async trackShare(commentId, options = {}) {
    return await this.create({
      comment_id: commentId,
      interaction_type: 'share',
      ...options
    });
  }

  /**
   * Get popular comments based on recent interactions
   */
  static async getPopularComments(postId, options = {}) {
    const db = await initializeDatabase();

    const {
      hours = 24,
      interaction_types = ['view', 'reply', 'reaction', 'share'],
      limit = 10
    } = options;

    const result = await db.query(
      `SELECT
         ci.comment_id,
         COUNT(*) as interaction_count,
         COUNT(DISTINCT ci.user_id) as unique_users,
         c.content,
         u.username as author
       FROM comment_interactions ci
       JOIN comments c ON ci.comment_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       AND ci.interaction_type = ANY($2)
       AND ci.created_at > NOW() - INTERVAL '${hours} hours'
       GROUP BY ci.comment_id, c.content, u.username
       ORDER BY interaction_count DESC, unique_users DESC
       LIMIT $3`,
      [postId, interaction_types, limit]
    );

    return result.rows;
  }

  /**
   * Raw database query method
   */
  static async raw(query, params = []) {
    const db = await initializeDatabase();
    return await db.query(query, params);
  }
}

module.exports = CommentInteraction;