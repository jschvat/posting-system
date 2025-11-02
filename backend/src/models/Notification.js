const db = require('../config/database');

class Notification {
  /**
   * Create a new notification
   */
  static async create({
    user_id,
    type,
    title,
    message,
    actor_id = null,
    entity_type = null,
    entity_id = null,
    action_url = null,
    priority = 'normal',
    expires_at = null
  }) {
    const query = `
      SELECT create_notification($1, $2, $3, $4, $5, $6, $7, $8, $9) as notification_id
    `;

    const values = [
      user_id, type, title, message, actor_id,
      entity_type, entity_id, action_url, priority
    ];

    const result = await db.query(query, values);
    const notificationId = result.rows[0].notification_id;

    if (!notificationId) {
      return null; // Notification not created (user preferences disabled or self-action)
    }

    // If expires_at provided, update it
    if (expires_at) {
      await db.query(
        'UPDATE notifications SET expires_at = $1 WHERE id = $2',
        [expires_at, notificationId]
      );
    }

    return this.findById(notificationId);
  }

  /**
   * Find notification by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get notification with actor details
   */
  static async getWithDetails(id) {
    const query = `
      SELECT n.*,
             u.username as actor_username,
             u.first_name as actor_first_name,
             u.last_name as actor_last_name,
             u.avatar_url as actor_avatar_url
      FROM notifications n
      LEFT JOIN users u ON n.actor_id = u.id
      WHERE n.id = $1
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get user's notifications
   */
  static async getUserNotifications(user_id, { limit = 20, offset = 0, unread_only = false, type = null } = {}) {
    let query = `
      SELECT n.*,
             u.username as actor_username,
             u.first_name as actor_first_name,
             u.last_name as actor_last_name,
             u.avatar_url as actor_avatar_url
      FROM notifications n
      LEFT JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = $1
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
    `;

    const params = [user_id];
    let paramIndex = 2;

    if (unread_only) {
      query += ` AND n.read_at IS NULL`;
    }

    if (type) {
      // Support multiple types (comma-separated string or array)
      let types;
      if (typeof type === 'string' && type.includes(',')) {
        types = type.split(',').map(t => t.trim()).filter(t => t);
      } else if (Array.isArray(type)) {
        types = type;
      } else {
        types = [type];
      }

      if (types.length === 1) {
        // Single type - use equality
        query += ` AND n.type = $${paramIndex}`;
        params.push(types[0]);
        paramIndex++;
      } else if (types.length > 1) {
        // Multiple types - use IN clause
        query += ` AND n.type = ANY($${paramIndex})`;
        params.push(types);
        paramIndex++;
      }
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(user_id) {
    const query = 'SELECT get_unread_notification_count($1) as count';
    const result = await db.query(query, [user_id]);
    return result.rows[0].count || 0;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id, user_id) {
    const query = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, [id, user_id]);
    return result.rows[0];
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(user_id) {
    const query = 'SELECT mark_notifications_read($1) as count';
    const result = await db.query(query, [user_id]);
    return result.rows[0].count || 0;
  }

  /**
   * Mark notification as clicked
   */
  static async markAsClicked(id, user_id) {
    const query = `
      UPDATE notifications
      SET clicked_at = CURRENT_TIMESTAMP,
          read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [id, user_id]);
    return result.rows[0];
  }

  /**
   * Delete notification
   */
  static async delete(id, user_id) {
    const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [id, user_id]);
    return result.rows[0];
  }

  /**
   * Delete all notifications for user
   */
  static async deleteAll(user_id) {
    const query = `
      DELETE FROM notifications
      WHERE user_id = $1 AND read_at IS NOT NULL
    `;

    await db.query(query, [user_id]);
  }

  /**
   * Get user's notification preferences
   */
  static async getPreferences(user_id) {
    const query = `
      SELECT * FROM notification_preferences
      WHERE user_id = $1
      ORDER BY notification_type
    `;

    const result = await db.query(query, [user_id]);
    return result.rows;
  }

  /**
   * Get preference for specific notification type
   */
  static async getPreference(user_id, notification_type) {
    const query = `
      SELECT * FROM notification_preferences
      WHERE user_id = $1 AND notification_type = $2
    `;

    const result = await db.query(query, [user_id, notification_type]);
    return result.rows[0];
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(user_id, notification_type, preferences) {
    const allowedFields = ['email_enabled', 'push_enabled', 'in_app_enabled', 'frequency'];
    const fields = [];
    const values = [user_id, notification_type];
    let paramIndex = 3;

    Object.keys(preferences).forEach(key => {
      if (allowedFields.includes(key) && preferences[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(preferences[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return null;
    }

    const query = `
      UPDATE notification_preferences
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND notification_type = $2
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Batch notification (group similar notifications)
   */
  static async batchNotification(user_id, type, entity_type, entity_id, actor_id) {
    const query = 'SELECT batch_notification($1, $2, $3, $4, $5) as batch_id';
    const result = await db.query(query, [user_id, type, entity_type, entity_id, actor_id]);
    return result.rows[0].batch_id;
  }

  /**
   * Get notification batches for user
   */
  static async getBatches(user_id) {
    const query = `
      SELECT nb.*,
             u.username as last_actor_username,
             u.first_name as last_actor_first_name,
             u.last_name as last_actor_last_name,
             u.avatar_url as last_actor_avatar_url
      FROM notification_batches nb
      LEFT JOIN users u ON nb.last_actor_id = u.id
      WHERE nb.user_id = $1
      ORDER BY nb.updated_at DESC
      LIMIT 20
    `;

    const result = await db.query(query, [user_id]);
    return result.rows;
  }

  /**
   * Clean up old notifications
   */
  static async cleanup() {
    const query = 'SELECT cleanup_old_notifications() as count';
    const result = await db.query(query);
    return result.rows[0].count || 0;
  }

  /**
   * Create notification for multiple users
   */
  static async createBulk(notifications) {
    const results = [];

    for (const notif of notifications) {
      const result = await this.create(notif);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }
}

module.exports = Notification;
