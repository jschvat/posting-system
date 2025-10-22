const db = require('../config/database');

class Message {
  /**
   * Create a new message
   */
  static async create({
    conversation_id,
    sender_id,
    content,
    message_type = 'text',
    attachment_url = null,
    attachment_type = null,
    attachment_size = null,
    attachment_name = null,
    reply_to_id = null
  }) {
    const query = `
      INSERT INTO messages (
        conversation_id, sender_id, content, message_type,
        attachment_url, attachment_type, attachment_size, attachment_name, reply_to_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      conversation_id, sender_id, content, message_type,
      attachment_url, attachment_type, attachment_size, attachment_name, reply_to_id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get message by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM messages WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get message with sender details
   */
  static async getWithDetails(id) {
    const query = `
      SELECT m.*,
             u.username as sender_username,
             u.first_name as sender_first_name,
             u.last_name as sender_last_name,
             u.avatar_url as sender_avatar_url,
             (SELECT json_build_object(
               'id', rm.id,
               'content', rm.content,
               'sender_username', ru.username
             )
             FROM messages rm
             LEFT JOIN users ru ON rm.sender_id = ru.id
             WHERE rm.id = m.reply_to_id
             ) as reply_to_message
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get messages for a conversation
   */
  static async getByConversationId(conversation_id, { limit = 50, offset = 0, before_id = null } = {}) {
    let query = `
      SELECT m.*,
             u.username as sender_username,
             u.first_name as sender_first_name,
             u.last_name as sender_last_name,
             u.avatar_url as sender_avatar_url,
             (SELECT json_build_object(
               'id', rm.id,
               'content', CASE
                 WHEN rm.deleted_at IS NOT NULL THEN '[Message deleted]'
                 ELSE rm.content
               END,
               'sender_username', ru.username
             )
             FROM messages rm
             LEFT JOIN users ru ON rm.sender_id = ru.id
             WHERE rm.id = m.reply_to_id
             ) as reply_to_message,
             (SELECT COUNT(*)::INTEGER
              FROM message_reads mr
              WHERE mr.message_id = m.id
             ) as read_count
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
        AND m.deleted_at IS NULL
    `;

    const params = [conversation_id];
    let paramIndex = 2;

    if (before_id) {
      query += ` AND m.id < $${paramIndex}`;
      params.push(before_id);
      paramIndex++;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows.reverse(); // Return in chronological order
  }

  /**
   * Search messages in a conversation
   */
  static async search(conversation_id, search_term, { limit = 20, offset = 0 } = {}) {
    const query = `
      SELECT m.*,
             u.username as sender_username,
             u.first_name as sender_first_name,
             u.last_name as sender_last_name,
             u.avatar_url as sender_avatar_url
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
        AND m.deleted_at IS NULL
        AND m.content ILIKE $2
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await db.query(query, [conversation_id, `%${search_term}%`, limit, offset]);
    return result.rows;
  }

  /**
   * Update message (edit)
   */
  static async update(id, content) {
    const query = `
      UPDATE messages
      SET content = $2, edited_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, [id, content]);
    return result.rows[0];
  }

  /**
   * Delete message (soft delete)
   */
  static async delete(id) {
    const query = `
      UPDATE messages
      SET deleted_at = CURRENT_TIMESTAMP,
          content = '[Message deleted]'
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Mark message as read by user
   */
  static async markAsRead(message_id, user_id) {
    const query = `
      INSERT INTO message_reads (message_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (message_id, user_id) DO NOTHING
      RETURNING *
    `;

    const result = await db.query(query, [message_id, user_id]);
    return result.rows[0];
  }

  /**
   * Mark all messages in conversation as read
   */
  static async markConversationAsRead(conversation_id, user_id) {
    // First, get all unread message IDs
    const getUnreadQuery = `
      SELECT m.id
      FROM messages m
      LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = $2
      WHERE m.conversation_id = $1
        AND m.sender_id != $2
        AND m.deleted_at IS NULL
        AND mr.id IS NULL
    `;

    const unreadMessages = await db.query(getUnreadQuery, [conversation_id, user_id]);

    if (unreadMessages.rows.length === 0) {
      return 0;
    }

    // Mark all as read
    const messageIds = unreadMessages.rows.map(row => row.id);
    const query = `
      INSERT INTO message_reads (message_id, user_id)
      SELECT unnest($1::integer[]), $2
      ON CONFLICT (message_id, user_id) DO NOTHING
    `;

    await db.query(query, [messageIds, user_id]);

    // Update participant's last_read_at
    const updateParticipantQuery = `
      UPDATE conversation_participants
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $1 AND user_id = $2
    `;

    await db.query(updateParticipantQuery, [conversation_id, user_id]);

    return messageIds.length;
  }

  /**
   * Get read receipts for a message
   */
  static async getReadReceipts(message_id) {
    const query = `
      SELECT mr.*,
             u.username,
             u.first_name,
             u.last_name,
             u.avatar_url
      FROM message_reads mr
      INNER JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id = $1
      ORDER BY mr.read_at DESC
    `;

    const result = await db.query(query, [message_id]);
    return result.rows;
  }

  /**
   * Check if message has been read by specific user
   */
  static async hasBeenReadBy(message_id, user_id) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM message_reads
        WHERE message_id = $1 AND user_id = $2
      ) as has_read
    `;

    const result = await db.query(query, [message_id, user_id]);
    return result.rows[0].has_read;
  }
}

module.exports = Message;
