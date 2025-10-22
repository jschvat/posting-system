const db = require('../config/database');
const GroupPostMedia = require('./GroupPostMedia');

class GroupPost {
  /**
   * Create a new post in a group
   */
  static async create({
    group_id,
    user_id,
    title,
    content,
    post_type = 'text',
    link_url = null,
    link_title = null,
    link_description = null,
    link_thumbnail = null,
    status = 'published',
    is_pinned = false,
    is_locked = false,
    is_nsfw = false,
    is_spoiler = false,
    poll_question = null,
    poll_ends_at = null,
    poll_allow_multiple = false
  }) {
    const query = `
      INSERT INTO group_posts (
        group_id, user_id, title, content, post_type,
        link_url, link_title, link_description, link_thumbnail,
        status, is_pinned, is_locked, is_nsfw, is_spoiler,
        poll_question, poll_ends_at, poll_allow_multiple
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      group_id, user_id, title, content, post_type,
      link_url, link_title, link_description, link_thumbnail,
      status, is_pinned, is_locked, is_nsfw, is_spoiler,
      poll_question, poll_ends_at, poll_allow_multiple
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find post by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM group_posts WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get post with author and group info
   */
  static async getWithDetails(id, user_id = null) {
    const query = `
      SELECT gp.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             COALESCE(ur.reputation_score, 0) as reputation_score,
             g.name as group_name, g.slug as group_slug, g.display_name as group_display_name,
             g.visibility as group_visibility,
             ${user_id ? `
               (SELECT vote_type FROM group_votes WHERE post_id = gp.id AND user_id = $2) as user_vote
             ` : 'NULL as user_vote'}
      FROM group_posts gp
      INNER JOIN users u ON gp.user_id = u.id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      INNER JOIN groups g ON gp.group_id = g.id
      WHERE gp.id = $1
    `;

    const values = user_id ? [id, user_id] : [id];
    const result = await db.query(query, values);
    const post = result.rows[0];

    if (post) {
      // Fetch media for this post
      post.media = await GroupPostMedia.getByPostId(post.id);

      // Fetch poll data if it's a poll
      if (post.post_type === 'poll') {
        const PollOption = require('./PollOption');
        const PollVote = require('./PollVote');

        // Get poll options with vote distribution
        post.poll_options = await PollOption.getVoteDistribution(post.id);

        // Get user's vote if authenticated
        if (user_id) {
          const userVote = await PollVote.getUserVote(post.id, user_id);
          post.user_poll_vote = userVote ? userVote.option_id : null;
        }

        // Check if poll has ended
        post.poll_has_ended = post.poll_ends_at ? new Date(post.poll_ends_at) < new Date() : false;
      }
    }

    return post;
  }

  /**
   * Update post
   */
  static async update(id, updates) {
    const allowedFields = [
      'title', 'content', 'link_url', 'link_title', 'link_description',
      'link_thumbnail', 'status', 'is_pinned', 'is_locked', 'is_nsfw', 'is_spoiler',
      'approved_by', 'approved_at', 'removed_by', 'removed_at', 'removal_reason'
    ];

    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return null;
    }

    // Add edited_at if content changed
    if (updates.content || updates.title) {
      fields.push('edited_at = CURRENT_TIMESTAMP');
    }

    values.push(id);
    const query = `
      UPDATE group_posts
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete post
   */
  static async delete(id) {
    const query = 'DELETE FROM group_posts WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Soft delete (mark as deleted)
   */
  static async softDelete(id, removed_by, removal_reason = null) {
    return this.update(id, {
      status: 'deleted',
      removed_by,
      removed_at: new Date().toISOString(),
      removal_reason
    });
  }

  /**
   * Remove post (moderator action)
   */
  static async remove(id, removed_by, removal_reason) {
    return this.update(id, {
      status: 'removed',
      removed_by,
      removed_at: new Date().toISOString(),
      removal_reason
    });
  }

  /**
   * Approve post
   */
  static async approve(id, approved_by) {
    return this.update(id, {
      status: 'published',
      approved_by,
      approved_at: new Date().toISOString()
    });
  }

  /**
   * Pin/unpin post
   */
  static async togglePin(id) {
    const post = await this.findById(id);
    return this.update(id, { is_pinned: !post.is_pinned });
  }

  /**
   * Lock/unlock post
   */
  static async toggleLock(id) {
    const post = await this.findById(id);
    return this.update(id, { is_locked: !post.is_locked });
  }

  /**
   * Get posts in a group
   */
  static async getGroupPosts(group_id, {
    status = 'published',
    user_id = null,
    limit = 20,
    offset = 0,
    sort_by = 'hot' // 'hot', 'new', 'top'
  } = {}) {
    let orderClause;
    switch (sort_by) {
      case 'new':
        orderClause = 'gp.created_at DESC';
        break;
      case 'top':
        orderClause = 'gp.score DESC, gp.created_at DESC';
        break;
      case 'hot':
      default:
        // Hot algorithm: score / (age in hours + 2)^1.5
        orderClause = `(gp.score / POWER((EXTRACT(EPOCH FROM (NOW() - gp.created_at)) / 3600) + 2, 1.5)) DESC`;
        break;
    }

    const query = `
      SELECT gp.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             COALESCE(ur.reputation_score, 0) as reputation_score,
             ${user_id ? `
               (SELECT vote_type FROM group_votes WHERE post_id = gp.id AND user_id = $4) as user_vote
             ` : 'NULL as user_vote'},
             (SELECT COUNT(*) FROM group_post_media WHERE post_id = gp.id) as media_count
      FROM group_posts gp
      INNER JOIN users u ON gp.user_id = u.id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE gp.group_id = $1 AND gp.status = $2
      ORDER BY gp.is_pinned DESC, ${orderClause}
      LIMIT $3 OFFSET ${user_id ? '$5' : '$4'}
    `;

    const values = user_id
      ? [group_id, status, limit, user_id, offset]
      : [group_id, status, limit, offset];

    const countQuery = `
      SELECT COUNT(*) as total
      FROM group_posts
      WHERE group_id = $1 AND status = $2
    `;

    const [postsResult, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, [group_id, status])
    ]);

    const posts = postsResult.rows;

    // Fetch media for each post
    await Promise.all(
      posts.map(async (post) => {
        post.media = await GroupPostMedia.getByPostId(post.id);
      })
    );

    return {
      posts,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    };
  }

  /**
   * Get user's posts in a group
   */
  static async getUserPosts(group_id, user_id, {
    limit = 20,
    offset = 0
  } = {}) {
    const query = `
      SELECT gp.*,
             (SELECT COUNT(*) FROM group_post_media WHERE post_id = gp.id) as media_count
      FROM group_posts gp
      WHERE gp.group_id = $1 AND gp.user_id = $2
      ORDER BY gp.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await db.query(query, [group_id, user_id, limit, offset]);
    return result.rows;
  }

  /**
   * Get pending posts (requiring approval)
   */
  static async getPendingPosts(group_id, {
    limit = 20,
    offset = 0
  } = {}) {
    const query = `
      SELECT gp.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             COALESCE(ur.reputation_score, 0) as reputation_score
      FROM group_posts gp
      INNER JOIN users u ON gp.user_id = u.id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE gp.group_id = $1 AND gp.status = 'pending'
      ORDER BY gp.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [group_id, limit, offset]);
    return result.rows;
  }

  /**
   * Get removed posts
   */
  static async getRemovedPosts(group_id, {
    limit = 20,
    offset = 0
  } = {}) {
    const query = `
      SELECT gp.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             COALESCE(ur.reputation_score, 0) as reputation_score,
             mod.username as removed_by_username
      FROM group_posts gp
      INNER JOIN users u ON gp.user_id = u.id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      LEFT JOIN users mod ON gp.removed_by = mod.id
      WHERE gp.group_id = $1 AND gp.status = 'removed'
      ORDER BY gp.removed_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [group_id, limit, offset]);
    return result.rows;
  }

  /**
   * Search posts in a group
   */
  static async search(group_id, searchTerm, {
    limit = 20,
    offset = 0
  } = {}) {
    const query = `
      SELECT gp.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             ts_rank(to_tsvector('english', COALESCE(gp.title, '') || ' ' || COALESCE(gp.content, '')),
                     plainto_tsquery('english', $2)) as rank
      FROM group_posts gp
      INNER JOIN users u ON gp.user_id = u.id
      WHERE gp.group_id = $1
        AND gp.status = 'published'
        AND to_tsvector('english', COALESCE(gp.title, '') || ' ' || COALESCE(gp.content, ''))
            @@ plainto_tsquery('english', $2)
      ORDER BY rank DESC, gp.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await db.query(query, [group_id, searchTerm, limit, offset]);
    return result.rows;
  }

  /**
   * Get top posts in a time period
   */
  static async getTopPosts(group_id, {
    period = 'week', // 'day', 'week', 'month', 'year', 'all'
    limit = 20,
    offset = 0
  } = {}) {
    const periodMap = {
      day: '1 day',
      week: '7 days',
      month: '30 days',
      year: '365 days',
      all: '100 years'
    };

    const interval = periodMap[period] || '7 days';

    const query = `
      SELECT gp.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             (SELECT COUNT(*) FROM group_post_media WHERE post_id = gp.id) as media_count
      FROM group_posts gp
      INNER JOIN users u ON gp.user_id = u.id
      WHERE gp.group_id = $1
        AND gp.status = 'published'
        AND gp.created_at > NOW() - INTERVAL '${interval}'
      ORDER BY gp.score DESC, gp.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [group_id, limit, offset]);
    return result.rows;
  }

  /**
   * Get post with media
   */
  static async getWithMedia(id, user_id = null) {
    const post = await this.getWithDetails(id, user_id);
    if (!post) return null;

    const mediaQuery = `
      SELECT * FROM group_post_media
      WHERE post_id = $1
      ORDER BY display_order ASC, uploaded_at ASC
    `;

    const mediaResult = await db.query(mediaQuery, [id]);
    post.media = mediaResult.rows;

    return post;
  }

  /**
   * Add media to post
   */
  static async addMedia(post_id, mediaData) {
    const query = `
      INSERT INTO group_post_media (
        post_id, file_name, file_path, file_url, file_type, file_size,
        mime_type, media_type, width, height, duration, thumbnail_url, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      post_id,
      mediaData.file_name,
      mediaData.file_path,
      mediaData.file_url,
      mediaData.file_type,
      mediaData.file_size,
      mediaData.mime_type,
      mediaData.media_type,
      mediaData.width || null,
      mediaData.height || null,
      mediaData.duration || null,
      mediaData.thumbnail_url || null,
      mediaData.display_order || 0
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get post media
   */
  static async getMedia(post_id) {
    const query = `
      SELECT * FROM group_post_media
      WHERE post_id = $1
      ORDER BY display_order ASC, uploaded_at ASC
    `;

    const result = await db.query(query, [post_id]);
    return result.rows;
  }

  /**
   * Delete media
   */
  static async deleteMedia(media_id) {
    const query = 'DELETE FROM group_post_media WHERE id = $1 RETURNING *';
    const result = await db.query(query, [media_id]);
    return result.rows[0];
  }
}

module.exports = GroupPost;
