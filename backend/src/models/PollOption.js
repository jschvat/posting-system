const db = require('../config/database');

class PollOption {
  /**
   * Create poll options for a post
   */
  static async createMultiple(post_id, options) {
    if (!options || options.length === 0) {
      return [];
    }

    // Build the VALUES part of the query
    const valueStrings = [];
    const values = [];
    let paramIndex = 1;

    options.forEach((option, index) => {
      valueStrings.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
      values.push(post_id, option.text || option, index);
      paramIndex += 3;
    });

    const query = `
      INSERT INTO poll_options (post_id, option_text, option_order)
      VALUES ${valueStrings.join(', ')}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get options for a post
   */
  static async getByPostId(post_id) {
    const query = `
      SELECT * FROM poll_options
      WHERE post_id = $1
      ORDER BY option_order ASC
    `;

    const result = await db.query(query, [post_id]);
    return result.rows;
  }

  /**
   * Get options with user's vote
   */
  static async getByPostIdWithUserVote(post_id, user_id) {
    const query = `
      SELECT po.*,
             EXISTS(
               SELECT 1 FROM poll_votes
               WHERE poll_votes.option_id = po.id
               AND poll_votes.user_id = $2
             ) as user_voted
      FROM poll_options po
      WHERE po.post_id = $1
      ORDER BY po.option_order ASC
    `;

    const result = await db.query(query, [post_id, user_id]);
    return result.rows;
  }

  /**
   * Get option by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM poll_options WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update option
   */
  static async update(id, updates) {
    const allowedFields = ['option_text', 'option_order'];

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

    values.push(id);
    const query = `
      UPDATE poll_options
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete option
   */
  static async delete(id) {
    const query = 'DELETE FROM poll_options WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Delete all options for a post
   */
  static async deleteByPostId(post_id) {
    const query = 'DELETE FROM poll_options WHERE post_id = $1';
    await db.query(query, [post_id]);
  }

  /**
   * Get vote distribution for a poll
   */
  static async getVoteDistribution(post_id) {
    const query = `
      SELECT po.id, po.option_text, po.vote_count, po.option_order,
             COALESCE(
               ROUND((po.vote_count::decimal / NULLIF(gp.poll_total_votes, 0)) * 100, 1),
               0
             ) as percentage
      FROM poll_options po
      INNER JOIN group_posts gp ON po.post_id = gp.id
      WHERE po.post_id = $1
      ORDER BY po.option_order ASC
    `;

    const result = await db.query(query, [post_id]);
    return result.rows;
  }
}

module.exports = PollOption;
