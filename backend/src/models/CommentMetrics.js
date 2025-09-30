/**
 * CommentMetrics Model - Pure PostgreSQL implementation
 * Handles aggregated comment metrics for algorithm-based sorting and prioritization
 */

const { initializeDatabase } = require('../config/database');

class CommentMetrics {
  /**
   * Get metrics for a specific comment
   */
  static async getByCommentId(commentId) {
    const db = await initializeDatabase();

    const result = await db.query(
      'SELECT * FROM comment_metrics WHERE comment_id = $1',
      [commentId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get metrics for multiple comments (bulk operation)
   */
  static async getByCommentIds(commentIds) {
    if (!commentIds || commentIds.length === 0) return [];

    const db = await initializeDatabase();

    const result = await db.query(
      'SELECT * FROM comment_metrics WHERE comment_id = ANY($1)',
      [commentIds]
    );

    // Return as a map for easy lookup
    return result.rows.reduce((acc, metrics) => {
      acc[metrics.comment_id] = metrics;
      return acc;
    }, {});
  }

  /**
   * Update algorithm scores for a comment
   */
  static async updateAlgorithmScores(commentId, scores = {}) {
    const db = await initializeDatabase();

    const {
      recency_score = null,
      interaction_rate = null,
      engagement_score = null,
      combined_algorithm_score = null
    } = scores;

    const result = await db.query(
      `UPDATE comment_metrics SET
         recency_score = COALESCE($2, recency_score),
         interaction_rate = COALESCE($3, interaction_rate),
         engagement_score = COALESCE($4, engagement_score),
         combined_algorithm_score = COALESCE($5, combined_algorithm_score),
         last_updated = NOW()
       WHERE comment_id = $1
       RETURNING *`,
      [commentId, recency_score, interaction_rate, engagement_score, combined_algorithm_score]
    );

    return result.rows[0];
  }

  /**
   * Get top comments by algorithm score for a post
   */
  static async getTopCommentsByAlgorithm(postId, options = {}) {
    const db = await initializeDatabase();

    const {
      algorithm = 'combined_algorithm_score',
      limit = 10,
      min_interactions = 0
    } = options;

    const validAlgorithms = ['combined_algorithm_score', 'recency_score', 'interaction_rate', 'engagement_score'];
    const scoreColumn = validAlgorithms.includes(algorithm) ? algorithm : 'combined_algorithm_score';

    const result = await db.query(
      `SELECT
         c.id,
         c.content,
         c.created_at,
         u.username as author,
         cm.${scoreColumn} as algorithm_score,
         cm.view_count,
         cm.reply_count,
         cm.reaction_count,
         cm.total_interaction_count
       FROM comments c
       JOIN comment_metrics cm ON c.id = cm.comment_id
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       AND c.is_published = true
       AND cm.total_interaction_count >= $2
       ORDER BY cm.${scoreColumn} DESC
       LIMIT $3`,
      [postId, min_interactions, limit]
    );

    return result.rows;
  }

  /**
   * Recalculate all algorithm scores for comments
   * Useful for batch updates or algorithm changes
   */
  static async recalculateAllScores(postId = null) {
    const db = await initializeDatabase();

    let whereClause = '';
    const params = [];

    if (postId) {
      whereClause = 'WHERE c.post_id = $1';
      params.push(postId);
    }

    const query = `
      UPDATE comment_metrics cm SET
        recency_score = calculate_recency_score(c.created_at),
        interaction_rate = calculate_interaction_rate(cm.total_interaction_count, c.created_at),
        engagement_score = calculate_engagement_score(cm.reply_count, cm.reaction_count, cm.deep_read_count, cm.view_count),
        combined_algorithm_score = (
          calculate_recency_score(c.created_at) * 0.3 +
          calculate_interaction_rate(cm.total_interaction_count, c.created_at) * 0.4 +
          calculate_engagement_score(cm.reply_count, cm.reaction_count, cm.deep_read_count, cm.view_count) * 0.3
        ),
        last_updated = NOW()
      FROM comments c
      WHERE cm.comment_id = c.id
      ${whereClause}
    `;

    const result = await db.query(query, params);
    return result.rowCount;
  }

  /**
   * Get trending comments (high recent activity)
   */
  static async getTrendingComments(postId, options = {}) {
    const db = await initializeDatabase();

    const {
      hours = 6,
      limit = 10,
      min_recent_interactions = 3
    } = options;

    const result = await db.query(
      `SELECT
         c.id,
         c.content,
         c.created_at,
         u.username as author,
         cm.combined_algorithm_score,
         cm.total_interaction_count,
         recent_stats.recent_interactions,
         recent_stats.recent_unique_users
       FROM comments c
       JOIN comment_metrics cm ON c.id = cm.comment_id
       JOIN users u ON c.user_id = u.id
       JOIN (
         SELECT
           ci.comment_id,
           COUNT(*) as recent_interactions,
           COUNT(DISTINCT ci.user_id) as recent_unique_users
         FROM comment_interactions ci
         WHERE ci.created_at > NOW() - INTERVAL '${hours} hours'
         GROUP BY ci.comment_id
         HAVING COUNT(*) >= $2
       ) recent_stats ON c.id = recent_stats.comment_id
       WHERE c.post_id = $1
       AND c.is_published = true
       ORDER BY recent_stats.recent_interactions DESC, cm.combined_algorithm_score DESC
       LIMIT $3`,
      [postId, min_recent_interactions, limit]
    );

    return result.rows;
  }

  /**
   * Get comment performance analytics
   */
  static async getAnalytics(postId, options = {}) {
    const db = await initializeDatabase();

    const {
      days = 7
    } = options;

    const result = await db.query(
      `SELECT
         COUNT(*) as total_comments,
         AVG(cm.view_count) as avg_views_per_comment,
         AVG(cm.reply_count) as avg_replies_per_comment,
         AVG(cm.reaction_count) as avg_reactions_per_comment,
         AVG(cm.engagement_score) as avg_engagement_score,
         MAX(cm.combined_algorithm_score) as max_algorithm_score,
         AVG(cm.combined_algorithm_score) as avg_algorithm_score
       FROM comments c
       JOIN comment_metrics cm ON c.id = cm.comment_id
       WHERE c.post_id = $1
       AND c.is_published = true
       AND c.created_at > NOW() - INTERVAL '${days} days'`,
      [postId]
    );

    return result.rows[0];
  }

  /**
   * Initialize metrics for a new comment
   */
  static async initializeForComment(commentId) {
    const db = await initializeDatabase();

    const result = await db.query(
      `INSERT INTO comment_metrics (comment_id, first_interaction_at)
       VALUES ($1, NOW())
       ON CONFLICT (comment_id) DO NOTHING
       RETURNING *`,
      [commentId]
    );

    return result.rows[0];
  }

  /**
   * Raw database query method
   */
  static async raw(query, params = []) {
    const db = await initializeDatabase();
    return await db.query(query, params);
  }
}

module.exports = CommentMetrics;