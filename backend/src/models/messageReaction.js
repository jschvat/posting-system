const db = require('../config/database');

class MessageReaction {
  /**
   * Add a reaction to a message
   * @param {number} messageId
   * @param {number} userId
   * @param {string} emoji
   * @returns {Promise<Object>}
   */
  static async addReaction(messageId, userId, emoji) {
    const query = `
      INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING
      RETURNING *
    `;
    const result = await db.query(query, [messageId, userId, emoji]);
    return result.rows[0];
  }

  /**
   * Remove a reaction from a message
   * @param {number} messageId
   * @param {number} userId
   * @param {string} emoji
   * @returns {Promise<boolean>}
   */
  static async removeReaction(messageId, userId, emoji) {
    const query = `
      DELETE FROM message_reactions
      WHERE message_id = $1 AND user_id = $2 AND emoji = $3
      RETURNING *
    `;
    const result = await db.query(query, [messageId, userId, emoji]);
    return result.rows.length > 0;
  }

  /**
   * Get all reactions for a message
   * @param {number} messageId
   * @returns {Promise<Array>}
   */
  static async getMessageReactions(messageId) {
    const query = `
      SELECT
        mr.id,
        mr.message_id,
        mr.user_id,
        mr.emoji,
        mr.created_at,
        u.username,
        u.avatar_url
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id = $1
      ORDER BY mr.created_at ASC
    `;
    const result = await db.query(query, [messageId]);
    return result.rows;
  }

  /**
   * Get reaction summary for a message (grouped by emoji)
   * @param {number} messageId
   * @returns {Promise<Array>}
   */
  static async getReactionSummary(messageId) {
    const query = `
      SELECT
        emoji,
        COUNT(*) as count,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'user_id', user_id,
            'username', u.username
          )
        ) as users
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE message_id = $1
      GROUP BY emoji
      ORDER BY count DESC, emoji ASC
    `;
    const result = await db.query(query, [messageId]);
    return result.rows;
  }

  /**
   * Get reactions for multiple messages
   * @param {Array<number>} messageIds
   * @returns {Promise<Object>} Map of messageId => reactions
   */
  static async getReactionsForMessages(messageIds) {
    if (!messageIds || messageIds.length === 0) {
      return {};
    }

    const query = `
      SELECT
        mr.message_id,
        mr.emoji,
        COUNT(*) as count,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'user_id', mr.user_id,
            'username', u.username
          )
        ) as users
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id = ANY($1)
      GROUP BY mr.message_id, mr.emoji
      ORDER BY mr.message_id, count DESC
    `;
    const result = await db.query(query, [messageIds]);

    // Group by message_id
    const reactionsMap = {};
    result.rows.forEach(row => {
      if (!reactionsMap[row.message_id]) {
        reactionsMap[row.message_id] = [];
      }
      reactionsMap[row.message_id].push({
        emoji: row.emoji,
        count: parseInt(row.count),
        users: row.users
      });
    });

    return reactionsMap;
  }

  /**
   * Toggle a reaction (add if doesn't exist, remove if exists)
   * @param {number} messageId
   * @param {number} userId
   * @param {string} emoji
   * @returns {Promise<Object>} { action: 'added' | 'removed', reaction: Object }
   */
  static async toggleReaction(messageId, userId, emoji) {
    const checkQuery = `
      SELECT * FROM message_reactions
      WHERE message_id = $1 AND user_id = $2 AND emoji = $3
    `;
    const checkResult = await db.query(checkQuery, [messageId, userId, emoji]);

    if (checkResult.rows.length > 0) {
      // Remove reaction
      await this.removeReaction(messageId, userId, emoji);
      return { action: 'removed', reaction: checkResult.rows[0] };
    } else {
      // Add reaction
      const reaction = await this.addReaction(messageId, userId, emoji);
      return { action: 'added', reaction };
    }
  }
}

module.exports = MessageReaction;
