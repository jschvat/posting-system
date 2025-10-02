/**
 * TimelineCache Model
 * Handles pre-computed timeline entries with scoring algorithm
 */

const BaseModel = require('./BaseModel');

class TimelineCache extends BaseModel {
  constructor() {
    super('timeline_cache');
  }

  /**
   * Calculate score for a post in a user's timeline
   * Scoring factors (0-100 points):
   * - Relationship strength (0-40): Direct follow, mutual, friends of friends
   * - Recency (0-25): How recent the post is
   * - Engagement (0-20): Reactions, comments, shares
   * - Content type (0-10): Has media, text only
   * - User activity (0-5): Poster's activity level
   *
   * @param {Object} post - Post data
   * @param {Object} context - Context (userId, followsFollowing, etc.)
   * @returns {number} Score (0-100)
   */
  calculateScore(post, context = {}) {
    let score = 0;
    const { userId, isFollowing, isMutual, postAge, hasMedia, authorStats } = context;

    // 1. Relationship Strength (0-40 points)
    if (isMutual) {
      score += 35; // Mutual follow
    } else if (isFollowing) {
      score += 40; // Direct follow
    } else {
      score += 10; // Discovered content
    }

    // 2. Recency (0-25 points)
    const hoursAgo = postAge / (1000 * 60 * 60);
    if (hoursAgo < 1) {
      score += 25;
    } else if (hoursAgo < 6) {
      score += 20;
    } else if (hoursAgo < 24) {
      score += 15;
    } else if (hoursAgo < 72) {
      score += 10;
    } else if (hoursAgo < 168) {
      score += 5;
    }

    // 3. Engagement (0-20 points)
    const reactions = post.reaction_count || 0;
    const comments = post.comment_count || 0;
    const shares = post.share_count || 0;

    const reactionPoints = Math.min(10, reactions * 2);
    const commentPoints = Math.min(10, comments * 3);
    const sharePoints = Math.min(10, shares * 5);
    const engagementScore = Math.min(20, reactionPoints + commentPoints + sharePoints);
    score += engagementScore;

    // 4. Content Type (0-10 points)
    if (hasMedia) {
      score += 10;
    } else {
      score += 5;
    }

    // 5. User Activity (0-5 points)
    if (authorStats) {
      const postsPerDay = authorStats.post_count / Math.max(1, authorStats.days_active || 1);
      if (postsPerDay >= 1 && postsPerDay <= 5) {
        score += 5; // Active but not spammy
      } else if (postsPerDay > 5) {
        score += 2; // Very active
      } else {
        score += 3; // Moderate
      }
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Add entry to timeline cache
   * @param {Object} data - Cache entry data
   * @returns {Object} Created cache entry
   */
  async addEntry(data) {
    const {
      user_id,
      post_id,
      score,
      reason
    } = data;

    const result = await this.raw(
      `INSERT INTO timeline_cache (user_id, post_id, score, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, post_id) DO UPDATE
       SET score = EXCLUDED.score,
           reason = EXCLUDED.reason,
           created_at = CURRENT_TIMESTAMP,
           expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days'
       RETURNING *`,
      [user_id, post_id, score, reason]
    );

    return result.rows[0];
  }

  /**
   * Get timeline for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Timeline posts with scores
   */
  async getTimeline(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      minScore = 0
    } = options;

    const result = await this.raw(
      `SELECT
        tc.*,
        p.id as post_id,
        p.content,
        p.privacy_level,
        p.created_at as post_created_at,
        p.user_id as author_id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_published = true) as comment_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', m.id,
            'filename', m.filename,
            'file_url', m.file_url,
            'media_type', m.media_type
          )) FROM media m WHERE m.post_id = p.id),
          '[]'::json
        ) as media
       FROM timeline_cache tc
       JOIN posts p ON tc.post_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE tc.user_id = $1
         AND tc.score >= $2
         AND tc.expires_at > CURRENT_TIMESTAMP
         AND p.is_published = true
       ORDER BY tc.score DESC, tc.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, minScore, limit, offset]
    );

    return result.rows;
  }

  /**
   * Generate timeline cache for a user
   * Creates entries for posts from followed users
   * @param {number} userId - User ID
   * @param {Object} options - Generation options
   * @returns {number} Number of entries created
   */
  async generateForUser(userId, options = {}) {
    const { limit = 100 } = options;

    // Get users the person follows
    const followsResult = await this.raw(
      `SELECT following_id FROM follows
       WHERE follower_id = $1 AND status = 'active'`,
      [userId]
    );

    const followingIds = followsResult.rows.map(r => r.following_id);

    if (followingIds.length === 0) {
      return 0;
    }

    // Get recent posts from followed users
    const postsResult = await this.raw(
      `SELECT
        p.*,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_published = true) as comment_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        (SELECT COUNT(*) > 0 FROM media WHERE post_id = p.id) as has_media,
        EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
          WHERE f1.follower_id = $1 AND f1.following_id = p.user_id
            AND f1.status = 'active' AND f2.status = 'active'
        ) as is_mutual
       FROM posts p
       WHERE p.user_id = ANY($2)
         AND p.is_published = true
         AND p.created_at > NOW() - INTERVAL '7 days'
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [userId, followingIds, limit]
    );

    let entriesCreated = 0;

    for (const post of postsResult.rows) {
      const postAge = Date.now() - new Date(post.created_at).getTime();

      const score = this.calculateScore(post, {
        userId,
        isFollowing: true,
        isMutual: post.is_mutual,
        postAge,
        hasMedia: post.has_media
      });

      await this.addEntry({
        user_id: userId,
        post_id: post.id,
        score,
        reason: 'following'
      });

      entriesCreated++;
    }

    return entriesCreated;
  }

  /**
   * Clean up expired timeline entries
   * @returns {number} Number of entries deleted
   */
  async cleanup() {
    const result = await this.raw(
      `DELETE FROM timeline_cache
       WHERE expires_at < CURRENT_TIMESTAMP
       RETURNING *`
    );

    return result.rows.length;
  }

  /**
   * Update score for a specific timeline entry
   * @param {number} userId - User ID
   * @param {number} postId - Post ID
   * @param {number} newScore - New score
   * @returns {Object} Updated entry
   */
  async updateScore(userId, postId, newScore) {
    const result = await this.raw(
      `UPDATE timeline_cache
       SET score = $3,
           created_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND post_id = $2
       RETURNING *`,
      [userId, postId, newScore]
    );

    return result.rows[0] || null;
  }

  /**
   * Remove entry from timeline cache
   * @param {number} userId - User ID
   * @param {number} postId - Post ID
   * @returns {boolean} Success status
   */
  async removeEntry(userId, postId) {
    const result = await this.raw(
      `DELETE FROM timeline_cache
       WHERE user_id = $1 AND post_id = $2
       RETURNING *`,
      [userId, postId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get popular/trending posts for discovery
   * @param {number} userId - User ID (to exclude already seen)
   * @param {Object} options - Query options
   * @returns {Array} Popular posts
   */
  async getPopularPosts(userId, options = {}) {
    const {
      limit = 10,
      timeframe = '24 hours'
    } = options;

    const result = await this.raw(
      `SELECT
        p.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_published = true) as comment_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', m.id,
            'filename', m.filename,
            'file_url', m.file_url,
            'media_type', m.media_type
          )) FROM media m WHERE m.post_id = p.id),
          '[]'::json
        ) as media,
        (
          (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) * 1 +
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 2 +
          (SELECT COUNT(*) FROM shares WHERE post_id = p.id) * 3
        ) as engagement_score
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.is_published = true
         AND p.privacy_level = 'public'
         AND p.created_at > NOW() - INTERVAL $1
         AND NOT EXISTS (
           SELECT 1 FROM timeline_cache tc
           WHERE tc.user_id = $2 AND tc.post_id = p.id
         )
       ORDER BY engagement_score DESC, p.created_at DESC
       LIMIT $3`,
      [timeframe, userId, limit]
    );

    return result.rows;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  async getStats() {
    const result = await this.raw(
      `SELECT
        COUNT(*) as total_entries,
        COUNT(DISTINCT user_id) as users_with_cache,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score,
        COUNT(*) FILTER (WHERE reason = 'following') as following_count,
        COUNT(*) FILTER (WHERE reason = 'popular') as popular_count,
        COUNT(*) FILTER (WHERE reason = 'shared') as shared_count,
        COUNT(*) FILTER (WHERE reason = 'suggested') as suggested_count
       FROM timeline_cache
       WHERE expires_at > CURRENT_TIMESTAMP`
    );

    return result.rows[0];
  }
}

module.exports = new TimelineCache();
