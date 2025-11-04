const firebaseAdmin = require('./firebaseAdmin');
const db = require('../config/database');

class PushNotificationService {
  /**
   * Send push notification to specific device token
   */
  async sendToToken(token, notification, data = {}) {
    // Check if Firebase is enabled
    if (!firebaseAdmin.isEnabled()) {
      console.log('ℹ️  Push notifications disabled - skipping send');
      return { success: false, skipped: true, reason: 'firebase_disabled' };
    }

    try {
      const messaging = firebaseAdmin.getMessaging();

      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.message,
          imageUrl: notification.image_url || undefined
        },
        data: {
          notificationId: String(notification.id || ''),
          type: notification.type || 'general',
          entityType: notification.entity_type || '',
          entityId: String(notification.entity_id || ''),
          actionUrl: notification.action_url || '',
          ...data
        },
        android: {
          priority: 'high',
          notification: {
            sound: process.env.PUSH_NOTIFICATION_SOUND || 'default',
            channelId: 'default',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        apns: {
          payload: {
            aps: {
              sound: process.env.PUSH_NOTIFICATION_SOUND || 'default',
              badge: data.badge || undefined,
              contentAvailable: true
            }
          }
        }
      };

      const response = await messaging.send(message);

      console.log('✅ Push notification sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ Push notification failed:', error.message);

      // Handle token errors
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await this.handleInvalidToken(token, error);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to user (all their devices)
   */
  async sendToUser(userId, notification, data = {}) {
    try {
      // Check if Firebase is enabled
      if (!firebaseAdmin.isEnabled()) {
        console.log('ℹ️  Push notifications disabled - skipping send to user', userId);
        return { success: true, sent: 0, skipped: 'firebase_disabled' };
      }

      // Get user's active device tokens
      const tokens = await this.getUserDeviceTokens(userId);

      if (tokens.length === 0) {
        console.log(`No active device tokens for user ${userId}`);
        return { success: true, sent: 0, reason: 'no_tokens' };
      }

      // Check if push notifications are enabled for this notification type
      const preferences = await this.getUserPushPreferences(
        userId,
        notification.type
      );

      if (!preferences.push_enabled) {
        console.log(`Push notifications disabled for user ${userId}, type ${notification.type}`);
        return { success: true, sent: 0, skipped: 'user_disabled' };
      }

      // Get unread count for badge
      const unreadCount = await this.getUnreadNotificationCount(userId);
      data.badge = unreadCount;

      // Send to all devices
      const results = await Promise.allSettled(
        tokens.map(tokenData =>
          this.sendToToken(tokenData.token, notification, data).then(
            result => ({
              ...result,
              deviceTokenId: tokenData.id,
              platform: tokenData.platform
            })
          )
        )
      );

      // Log delivery results
      await this.logDeliveryResults(notification.id, userId, results);

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success
      ).length;

      console.log(
        `✅ Push notification sent to ${successCount}/${tokens.length} devices for user ${userId}`
      );

      return {
        success: true,
        sent: successCount,
        total: tokens.length
      };
    } catch (error) {
      console.error('❌ Error sending push to user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMultipleUsers(userIds, notification, data = {}) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, notification, data))
    );

    return {
      success: true,
      results: results.map((r, i) => ({
        userId: userIds[i],
        ...(r.status === 'fulfilled' ? r.value : { error: r.reason })
      }))
    };
  }

  /**
   * Get user's active device tokens
   */
  async getUserDeviceTokens(userId) {
    const result = await db.query(
      `SELECT id, token, platform, device_id
       FROM device_tokens
       WHERE user_id = $1 AND is_active = true
       ORDER BY last_used_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get user's push notification preferences
   */
  async getUserPushPreferences(userId, notificationType) {
    const result = await db.query(
      `SELECT push_enabled, in_app_enabled
       FROM notification_preferences
       WHERE user_id = $1 AND notification_type = $2`,
      [userId, notificationType]
    );

    if (result.rows.length === 0) {
      // Default: push enabled
      return { push_enabled: true, in_app_enabled: true };
    }

    return result.rows[0];
  }

  /**
   * Get unread notification count for badge
   */
  async getUnreadNotificationCount(userId) {
    const result = await db.query(
      `SELECT COUNT(*)::integer as count
       FROM notifications
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );

    return result.rows[0]?.count || 0;
  }

  /**
   * Log delivery results to push_notification_logs
   */
  async logDeliveryResults(notificationId, userId, results) {
    const logs = results
      .map((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          return {
            notification_id: notificationId,
            device_token_id: result.value.deviceTokenId,
            user_id: userId,
            fcm_message_id: result.value.messageId,
            status: 'sent',
            sent_at: new Date()
          };
        } else if (result.status === 'fulfilled' && result.value.skipped) {
          // Don't log skipped sends
          return null;
        } else {
          return {
            notification_id: notificationId,
            device_token_id: result.value?.deviceTokenId || null,
            user_id: userId,
            status: 'failed',
            error_message: result.value?.error || result.reason,
            sent_at: new Date()
          };
        }
      })
      .filter(log => log !== null);

    if (logs.length > 0) {
      const values = logs
        .map(
          (log, i) =>
            `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
        )
        .join(', ');

      const params = logs.flatMap(log => [
        log.notification_id,
        log.device_token_id,
        log.user_id,
        log.fcm_message_id || null,
        log.status,
        log.error_message || null,
        log.sent_at
      ]);

      await db.query(
        `INSERT INTO push_notification_logs
         (notification_id, device_token_id, user_id, fcm_message_id, status, error_message, sent_at)
         VALUES ${values}`,
        params
      );
    }
  }

  /**
   * Handle invalid/expired tokens
   */
  async handleInvalidToken(token, error) {
    try {
      // Mark token as inactive
      await db.query(
        `UPDATE device_tokens
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE token = $1`,
        [token]
      );

      // Log failed token
      await db.query(
        `INSERT INTO failed_tokens (device_token_id, token, error_code, error_message)
         SELECT id, token, $1, $2
         FROM device_tokens
         WHERE token = $3`,
        [error.code, error.message, token]
      );

      console.log(`🗑️  Marked token as inactive: ${token.substring(0, 20)}...`);
    } catch (err) {
      console.error('Error handling invalid token:', err);
    }
  }

  /**
   * Clean up old failed tokens (run periodically)
   */
  async cleanupFailedTokens(daysOld = 30) {
    const result = await db.query(
      `DELETE FROM device_tokens
       WHERE is_active = false
       AND updated_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`
    );

    console.log(`🗑️  Cleaned up ${result.rowCount} old device tokens`);
    return result.rowCount;
  }
}

module.exports = new PushNotificationService();
