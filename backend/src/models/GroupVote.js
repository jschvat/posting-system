const db = require('../database/db');

class GroupVote {
  /**
   * Cast or update a vote
   */
  static async vote({
    user_id,
    post_id = null,
    comment_id = null,
    vote_type // 'upvote' or 'downvote'
  }) {
    // Validate that either post_id or comment_id is provided
    if (!post_id && !comment_id) {
      throw new Error('Either post_id or comment_id must be provided');
    }
    if (post_id && comment_id) {
      throw new Error('Cannot vote on both post and comment simultaneously');
    }

    const query = `
      INSERT INTO group_votes (user_id, post_id, comment_id, vote_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, ${post_id ? 'post_id' : 'comment_id'})
      DO UPDATE SET
        vote_type = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [user_id, post_id, comment_id, vote_type];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Remove a vote
   */
  static async unvote({
    user_id,
    post_id = null,
    comment_id = null
  }) {
    const conditions = ['user_id = $1'];
    const values = [user_id];

    if (post_id) {
      conditions.push('post_id = $2');
      values.push(post_id);
    } else if (comment_id) {
      conditions.push('comment_id = $2');
      values.push(comment_id);
    } else {
      throw new Error('Either post_id or comment_id must be provided');
    }

    const query = `
      DELETE FROM group_votes
      WHERE ${conditions.join(' AND ')}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get user's vote on a post
   */
  static async getUserPostVote(user_id, post_id) {
    const query = `
      SELECT * FROM group_votes
      WHERE user_id = $1 AND post_id = $2
    `;

    const result = await db.query(query, [user_id, post_id]);
    return result.rows[0];
  }

  /**
   * Get user's vote on a comment
   */
  static async getUserCommentVote(user_id, comment_id) {
    const query = `
      SELECT * FROM group_votes
      WHERE user_id = $1 AND comment_id = $2
    `;

    const result = await db.query(query, [user_id, comment_id]);
    return result.rows[0];
  }

  /**
   * Toggle vote (upvote/downvote/remove)
   */
  static async toggleVote({
    user_id,
    post_id = null,
    comment_id = null,
    vote_type
  }) {
    const existingVote = post_id
      ? await this.getUserPostVote(user_id, post_id)
      : await this.getUserCommentVote(user_id, comment_id);

    // If vote exists and is the same type, remove it
    if (existingVote && existingVote.vote_type === vote_type) {
      return this.unvote({ user_id, post_id, comment_id });
    }

    // Otherwise, create or update the vote
    return this.vote({ user_id, post_id, comment_id, vote_type });
  }

  /**
   * Get votes for a post
   */
  static async getPostVotes(post_id) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
        COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes,
        COUNT(*) FILTER (WHERE vote_type = 'upvote') - COUNT(*) FILTER (WHERE vote_type = 'downvote') as score
      FROM group_votes
      WHERE post_id = $1
    `;

    const result = await db.query(query, [post_id]);
    return result.rows[0];
  }

  /**
   * Get votes for a comment
   */
  static async getCommentVotes(comment_id) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
        COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes,
        COUNT(*) FILTER (WHERE vote_type = 'upvote') - COUNT(*) FILTER (WHERE vote_type = 'downvote') as score
      FROM group_votes
      WHERE comment_id = $1
    `;

    const result = await db.query(query, [comment_id]);
    return result.rows[0];
  }

  /**
   * Get users who voted on a post
   */
  static async getPostVoters(post_id, {
    vote_type = null,
    limit = 50,
    offset = 0
  } = {}) {
    const conditions = ['gv.post_id = $1'];
    const values = [post_id];
    let paramIndex = 2;

    if (vote_type) {
      conditions.push(`gv.vote_type = $${paramIndex}`);
      values.push(vote_type);
      paramIndex++;
    }

    values.push(limit, offset);

    const query = `
      SELECT gv.*, u.username, u.first_name, u.last_name, u.avatar_url
      FROM group_votes gv
      INNER JOIN users u ON gv.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY gv.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get users who voted on a comment
   */
  static async getCommentVoters(comment_id, {
    vote_type = null,
    limit = 50,
    offset = 0
  } = {}) {
    const conditions = ['gv.comment_id = $1'];
    const values = [comment_id];
    let paramIndex = 2;

    if (vote_type) {
      conditions.push(`gv.vote_type = $${paramIndex}`);
      values.push(vote_type);
      paramIndex++;
    }

    values.push(limit, offset);

    const query = `
      SELECT gv.*, u.username, u.first_name, u.last_name, u.avatar_url
      FROM group_votes gv
      INNER JOIN users u ON gv.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY gv.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get user's voting history in a group
   */
  static async getUserVotingHistory(user_id, group_id, {
    limit = 20,
    offset = 0
  } = {}) {
    const query = `
      SELECT gv.*,
             CASE
               WHEN gv.post_id IS NOT NULL THEN 'post'
               ELSE 'comment'
             END as vote_target,
             COALESCE(gp.title, gc.content) as target_content,
             g.slug as group_slug, g.display_name as group_name
      FROM group_votes gv
      LEFT JOIN group_posts gp ON gv.post_id = gp.id
      LEFT JOIN group_comments gc ON gv.comment_id = gc.id
      LEFT JOIN groups g ON COALESCE(gp.group_id, (SELECT group_id FROM group_posts WHERE id = gc.post_id)) = g.id
      WHERE gv.user_id = $1
        AND g.id = $2
      ORDER BY gv.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await db.query(query, [user_id, group_id, limit, offset]);
    return result.rows;
  }

  /**
   * Get vote counts for multiple posts (batch)
   */
  static async getBatchPostVotes(post_ids) {
    if (!post_ids || post_ids.length === 0) {
      return [];
    }

    const query = `
      SELECT
        post_id,
        COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
        COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes,
        COUNT(*) FILTER (WHERE vote_type = 'upvote') - COUNT(*) FILTER (WHERE vote_type = 'downvote') as score
      FROM group_votes
      WHERE post_id = ANY($1)
      GROUP BY post_id
    `;

    const result = await db.query(query, [post_ids]);
    return result.rows;
  }

  /**
   * Get user's votes for multiple posts (batch)
   */
  static async getUserBatchPostVotes(user_id, post_ids) {
    if (!post_ids || post_ids.length === 0) {
      return [];
    }

    const query = `
      SELECT post_id, vote_type
      FROM group_votes
      WHERE user_id = $1 AND post_id = ANY($2)
    `;

    const result = await db.query(query, [user_id, post_ids]);
    return result.rows;
  }
}

module.exports = GroupVote;
