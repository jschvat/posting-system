const db = require('../config/database');

class PollVote {
  /**
   * Cast a vote on a poll option
   */
  static async create(post_id, option_id, user_id) {
    const query = `
      INSERT INTO poll_votes (post_id, option_id, user_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [post_id, option_id, user_id]);
    return result.rows[0];
  }

  /**
   * Get user's vote on a poll
   */
  static async getUserVote(post_id, user_id) {
    const query = `
      SELECT pv.*, po.option_text
      FROM poll_votes pv
      INNER JOIN poll_options po ON pv.option_id = po.id
      WHERE pv.post_id = $1 AND pv.user_id = $2
    `;

    const result = await db.query(query, [post_id, user_id]);
    return result.rows[0];
  }

  /**
   * Check if user has voted on a poll
   */
  static async hasVoted(post_id, user_id) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM poll_votes
        WHERE post_id = $1 AND user_id = $2
      ) as has_voted
    `;

    const result = await db.query(query, [post_id, user_id]);
    return result.rows[0].has_voted;
  }

  /**
   * Remove a vote
   */
  static async delete(post_id, user_id) {
    const query = `
      DELETE FROM poll_votes
      WHERE post_id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [post_id, user_id]);
    return result.rows[0];
  }

  /**
   * Update user's vote (change to different option)
   */
  static async update(post_id, user_id, new_option_id) {
    const query = `
      UPDATE poll_votes
      SET option_id = $3, created_at = CURRENT_TIMESTAMP
      WHERE post_id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [post_id, user_id, new_option_id]);
    return result.rows[0];
  }

  /**
   * Get all votes for a poll
   */
  static async getByPostId(post_id) {
    const query = `
      SELECT pv.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             po.option_text
      FROM poll_votes pv
      INNER JOIN users u ON pv.user_id = u.id
      INNER JOIN poll_options po ON pv.option_id = po.id
      WHERE pv.post_id = $1
      ORDER BY pv.created_at DESC
    `;

    const result = await db.query(query, [post_id]);
    return result.rows;
  }

  /**
   * Get vote count for a specific option
   */
  static async getOptionVoteCount(option_id) {
    const query = `
      SELECT COUNT(*) as count
      FROM poll_votes
      WHERE option_id = $1
    `;

    const result = await db.query(query, [option_id]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get total vote count for a poll
   */
  static async getTotalVotes(post_id) {
    const query = `
      SELECT COUNT(*) as count
      FROM poll_votes
      WHERE post_id = $1
    `;

    const result = await db.query(query, [post_id]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get voters for a specific option
   */
  static async getOptionVoters(option_id, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url,
             pv.created_at as voted_at
      FROM poll_votes pv
      INNER JOIN users u ON pv.user_id = u.id
      WHERE pv.option_id = $1
      ORDER BY pv.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [option_id, limit, offset]);
    return result.rows;
  }

  /**
   * Check if poll has ended
   */
  static async isPollEnded(post_id) {
    const query = `
      SELECT poll_ends_at
      FROM group_posts
      WHERE id = $1
    `;

    const result = await db.query(query, [post_id]);
    const post = result.rows[0];

    if (!post || !post.poll_ends_at) {
      return false;
    }

    return new Date(post.poll_ends_at) < new Date();
  }
}

module.exports = PollVote;
