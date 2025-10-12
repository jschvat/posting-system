const db = require('../config/database');
const GroupCommentMedia = require('./GroupCommentMedia');

class GroupComment {
  /**
   * Create a new comment
   */
  static async create({
    post_id,
    parent_id = null,
    user_id,
    content,
    status = 'published'
  }) {
    const query = `
      INSERT INTO group_comments (post_id, parent_id, user_id, content, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [post_id, parent_id, user_id, content, status];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find comment by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM group_comments WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get comment with author info
   */
  static async getWithAuthor(id, user_id = null) {
    const query = `
      SELECT gc.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             ${user_id ? `
               (SELECT vote_type FROM group_votes WHERE comment_id = gc.id AND user_id = $2) as user_vote
             ` : 'NULL as user_vote'}
      FROM group_comments gc
      INNER JOIN users u ON gc.user_id = u.id
      WHERE gc.id = $1
    `;

    const values = user_id ? [id, user_id] : [id];
    const result = await db.query(query, values);
    const comment = result.rows[0];

    if (comment) {
      // Fetch media for this comment
      comment.media = await GroupCommentMedia.getByCommentId(comment.id);
    }

    return comment;
  }

  /**
   * Update comment
   */
  static async update(id, updates) {
    const allowedFields = [
      'content', 'status', 'removed_by', 'removed_at', 'removal_reason'
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
    if (updates.content) {
      fields.push('edited_at = CURRENT_TIMESTAMP');
    }

    values.push(id);
    const query = `
      UPDATE group_comments
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete comment
   */
  static async delete(id) {
    const query = 'DELETE FROM group_comments WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Soft delete (mark as deleted)
   */
  static async softDelete(id) {
    return this.update(id, { status: 'deleted', content: '[deleted]' });
  }

  /**
   * Remove comment (moderator action)
   */
  static async remove(id, removed_by, removal_reason) {
    return this.update(id, {
      status: 'removed',
      content: '[removed]',
      removed_by,
      removed_at: new Date().toISOString(),
      removal_reason
    });
  }

  /**
   * Get comments for a post (flat list)
   */
  static async getPostComments(post_id, {
    user_id = null,
    status = 'published',
    limit = 100,
    offset = 0,
    sort_by = 'best' // 'best', 'new', 'top', 'controversial'
  } = {}) {
    let orderClause;
    switch (sort_by) {
      case 'new':
        orderClause = 'gc.created_at DESC';
        break;
      case 'top':
        orderClause = 'gc.score DESC, gc.created_at DESC';
        break;
      case 'controversial':
        // Comments with similar upvotes and downvotes
        orderClause = 'ABS(gc.upvotes - gc.downvotes) ASC, (gc.upvotes + gc.downvotes) DESC';
        break;
      case 'best':
      default:
        // Best algorithm: Wilson score confidence interval
        orderClause = `(
          (gc.upvotes + 1.9208) / (gc.upvotes + gc.downvotes + 1) -
          1.96 * SQRT((gc.upvotes * gc.downvotes) / (gc.upvotes + gc.downvotes + 1) + 0.9604) /
          (gc.upvotes + gc.downvotes + 1)
        ) / (1 + 3.8416 / (gc.upvotes + gc.downvotes + 1)) DESC`;
        break;
    }

    const query = `
      SELECT gc.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             ${user_id ? `
               (SELECT vote_type FROM group_votes WHERE comment_id = gc.id AND user_id = $4) as user_vote
             ` : 'NULL as user_vote'},
             (SELECT COUNT(*) FROM group_comment_media WHERE comment_id = gc.id) as media_count
      FROM group_comments gc
      INNER JOIN users u ON gc.user_id = u.id
      WHERE gc.post_id = $1 AND gc.status = $2
      ORDER BY ${orderClause}
      LIMIT $3 OFFSET ${user_id ? '$5' : '$4'}
    `;

    const values = user_id
      ? [post_id, status, limit, user_id, offset]
      : [post_id, status, limit, offset];

    const result = await db.query(query, values);
    const comments = result.rows;

    // Fetch media for each comment
    await Promise.all(
      comments.map(async (comment) => {
        comment.media = await GroupCommentMedia.getByCommentId(comment.id);
      })
    );

    return comments;
  }

  /**
   * Get nested comments (tree structure)
   */
  static async getNestedComments(post_id, {
    user_id = null,
    status = 'published',
    max_depth = 10
  } = {}) {
    const query = `
      WITH RECURSIVE comment_tree AS (
        -- Top-level comments
        SELECT gc.*,
               u.username, u.first_name, u.last_name, u.avatar_url,
               ${user_id ? `
                 (SELECT vote_type FROM group_votes WHERE comment_id = gc.id AND user_id = $3) as user_vote,
               ` : 'NULL as user_vote,'}
               0 as level,
               ARRAY[gc.id] as path_array
        FROM group_comments gc
        INNER JOIN users u ON gc.user_id = u.id
        WHERE gc.post_id = $1 AND gc.parent_id IS NULL AND gc.status = $2

        UNION ALL

        -- Nested comments
        SELECT gc.*,
               u.username, u.first_name, u.last_name, u.avatar_url,
               ${user_id ? `
                 (SELECT vote_type FROM group_votes WHERE comment_id = gc.id AND user_id = $3) as user_vote,
               ` : 'NULL as user_vote,'}
               ct.level + 1,
               ct.path_array || gc.id
        FROM group_comments gc
        INNER JOIN users u ON gc.user_id = u.id
        INNER JOIN comment_tree ct ON gc.parent_id = ct.id
        WHERE gc.status = $2 AND ct.level < $${user_id ? '4' : '3'}
      )
      SELECT * FROM comment_tree
      ORDER BY path_array
    `;

    const values = user_id
      ? [post_id, status, user_id, max_depth]
      : [post_id, status, max_depth];

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get replies to a comment
   */
  static async getReplies(parent_id, {
    user_id = null,
    status = 'published'
  } = {}) {
    const query = `
      SELECT gc.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             ${user_id ? `
               (SELECT vote_type FROM group_votes WHERE comment_id = gc.id AND user_id = $3) as user_vote
             ` : 'NULL as user_vote'}
      FROM group_comments gc
      INNER JOIN users u ON gc.user_id = u.id
      WHERE gc.parent_id = $1 AND gc.status = $2
      ORDER BY gc.score DESC, gc.created_at ASC
    `;

    const values = user_id ? [parent_id, status, user_id] : [parent_id, status];
    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get user's comments in a group
   */
  static async getUserComments(user_id, group_id, {
    limit = 20,
    offset = 0
  } = {}) {
    const query = `
      SELECT gc.*,
             gp.title as post_title, gp.group_id,
             g.slug as group_slug, g.display_name as group_name
      FROM group_comments gc
      INNER JOIN group_posts gp ON gc.post_id = gp.id
      INNER JOIN groups g ON gp.group_id = g.id
      WHERE gc.user_id = $1 AND g.id = $2
      ORDER BY gc.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await db.query(query, [user_id, group_id, limit, offset]);
    return result.rows;
  }

  /**
   * Get comment count for a post
   */
  static async getCommentCount(post_id, status = 'published') {
    const query = `
      SELECT COUNT(*) as count
      FROM group_comments
      WHERE post_id = $1 AND status = $2
    `;

    const result = await db.query(query, [post_id, status]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get comment with media
   */
  static async getWithMedia(id, user_id = null) {
    const comment = await this.getWithAuthor(id, user_id);
    if (!comment) return null;

    const mediaQuery = `
      SELECT * FROM group_comment_media
      WHERE comment_id = $1
      ORDER BY display_order ASC, uploaded_at ASC
    `;

    const mediaResult = await db.query(mediaQuery, [id]);
    comment.media = mediaResult.rows;

    return comment;
  }

  /**
   * Add media to comment
   */
  static async addMedia(comment_id, mediaData) {
    const query = `
      INSERT INTO group_comment_media (
        comment_id, file_name, file_path, file_url, file_type, file_size,
        mime_type, media_type, width, height, duration, thumbnail_url, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      comment_id,
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
   * Get comment media
   */
  static async getMedia(comment_id) {
    const query = `
      SELECT * FROM group_comment_media
      WHERE comment_id = $1
      ORDER BY display_order ASC, uploaded_at ASC
    `;

    const result = await db.query(query, [comment_id]);
    return result.rows;
  }

  /**
   * Delete media
   */
  static async deleteMedia(media_id) {
    const query = 'DELETE FROM group_comment_media WHERE id = $1 RETURNING *';
    const result = await db.query(query, [media_id]);
    return result.rows[0];
  }
}

module.exports = GroupComment;
