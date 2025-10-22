const db = require('../config/database');

class Conversation {
  /**
   * Create a new conversation
   */
  static async create({ type, title = null, created_by }) {
    const query = `
      INSERT INTO conversations (type, title, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [type, title, created_by]);
    return result.rows[0];
  }

  /**
   * Create a direct conversation between two users
   */
  static async createDirect(user1_id, user2_id) {
    const query = 'SELECT create_direct_conversation($1, $2) as conversation_id';
    const result = await db.query(query, [user1_id, user2_id]);
    return result.rows[0].conversation_id;
  }

  /**
   * Find conversation by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM conversations WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get conversation with participants and last message
   */
  static async getWithDetails(conversation_id, user_id) {
    const query = `
      SELECT c.*,
             (SELECT json_agg(
               json_build_object(
                 'id', u.id,
                 'username', u.username,
                 'first_name', u.first_name,
                 'last_name', u.last_name,
                 'avatar_url', u.avatar_url,
                 'role', cp.role,
                 'joined_at', cp.joined_at
               )
             )
             FROM conversation_participants cp
             INNER JOIN users u ON cp.user_id = u.id
             WHERE cp.conversation_id = c.id
               AND cp.left_at IS NULL
             ) as participants,
             (SELECT json_build_object(
               'id', m.id,
               'content', CASE
                 WHEN m.deleted_at IS NOT NULL THEN '[Message deleted]'
                 ELSE m.content
               END,
               'message_type', m.message_type,
               'sender_id', m.sender_id,
               'sender_username', u.username,
               'created_at', m.created_at
             )
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.id = c.last_message_id
             ) as last_message,
             get_unread_count(c.id, $2) as unread_count
      FROM conversations c
      WHERE c.id = $1
    `;

    const result = await db.query(query, [conversation_id, user_id]);
    return result.rows[0];
  }

  /**
   * Get user's conversations list
   */
  static async getUserConversations(user_id, { limit = 20, offset = 0, include_archived = false } = {}) {
    const query = `
      SELECT c.*,
             cp.muted,
             cp.archived,
             cp.last_read_at,
             (SELECT json_agg(
               json_build_object(
                 'id', u.id,
                 'username', u.username,
                 'first_name', u.first_name,
                 'last_name', u.last_name,
                 'avatar_url', u.avatar_url
               )
             )
             FROM conversation_participants cp2
             INNER JOIN users u ON cp2.user_id = u.id
             WHERE cp2.conversation_id = c.id
               AND cp2.left_at IS NULL
               AND cp2.user_id != $1
             ) as other_participants,
             (SELECT json_build_object(
               'id', m.id,
               'content', CASE
                 WHEN m.deleted_at IS NOT NULL THEN '[Message deleted]'
                 ELSE m.content
               END,
               'message_type', m.message_type,
               'sender_id', m.sender_id,
               'sender_username', u.username,
               'created_at', m.created_at
             )
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.id = c.last_message_id
             ) as last_message,
             get_unread_count(c.id, $1) as unread_count
      FROM conversations c
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
        AND cp.left_at IS NULL
        ${!include_archived ? 'AND cp.archived = FALSE' : ''}
      ORDER BY c.updated_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [user_id, limit, offset]);
    return result.rows;
  }

  /**
   * Get total unread message count for user
   */
  static async getTotalUnreadCount(user_id) {
    const query = `
      SELECT SUM(get_unread_count(c.id, $1))::INTEGER as total_unread
      FROM conversations c
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
        AND cp.left_at IS NULL
        AND cp.archived = FALSE
        AND cp.muted = FALSE
    `;

    const result = await db.query(query, [user_id]);
    return result.rows[0].total_unread || 0;
  }

  /**
   * Add participant to conversation
   */
  static async addParticipant(conversation_id, user_id, role = 'member') {
    const query = `
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (conversation_id, user_id, left_at)
      DO UPDATE SET left_at = NULL, joined_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await db.query(query, [conversation_id, user_id, role]);
    return result.rows[0];
  }

  /**
   * Remove participant from conversation (mark as left)
   */
  static async removeParticipant(conversation_id, user_id) {
    const query = `
      UPDATE conversation_participants
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, [conversation_id, user_id]);
    return result.rows[0];
  }

  /**
   * Check if user is participant in conversation
   */
  static async isParticipant(conversation_id, user_id) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
      ) as is_participant
    `;

    const result = await db.query(query, [conversation_id, user_id]);
    return result.rows[0].is_participant;
  }

  /**
   * Mute/unmute conversation
   */
  static async setMuted(conversation_id, user_id, muted) {
    const query = `
      UPDATE conversation_participants
      SET muted = $3
      WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, [conversation_id, user_id, muted]);
    return result.rows[0];
  }

  /**
   * Archive/unarchive conversation
   */
  static async setArchived(conversation_id, user_id, archived) {
    const query = `
      UPDATE conversation_participants
      SET archived = $3
      WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, [conversation_id, user_id, archived]);
    return result.rows[0];
  }

  /**
   * Update conversation (title, etc.)
   */
  static async update(id, updates) {
    const allowedFields = ['title'];
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
      UPDATE conversations
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete conversation (only if user is creator)
   */
  static async delete(id, user_id) {
    const query = `
      DELETE FROM conversations
      WHERE id = $1 AND created_by = $2
      RETURNING *
    `;

    const result = await db.query(query, [id, user_id]);
    return result.rows[0];
  }
}

module.exports = Conversation;
