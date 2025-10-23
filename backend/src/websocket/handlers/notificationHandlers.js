/**
 * WebSocket Notification Event Handlers
 * Handles real-time notification events and acknowledgments
 */

const Notification = require('../../models/Notification');

/**
 * Register notification-related event handlers
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Socket instance
 */
function registerHandlers(io, socket) {
  const userId = socket.userId;

  /**
   * Mark notification as read
   * Client sends: { notificationId }
   */
  socket.on('notification:read', async (data) => {
    try {
      const { notificationId } = data;

      // Get notification
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return socket.emit('error', {
          event: 'notification:read',
          message: 'Notification not found'
        });
      }

      // Verify ownership
      if (notification.user_id !== userId) {
        return socket.emit('error', {
          event: 'notification:read',
          message: 'Unauthorized'
        });
      }

      // Mark as read
      await Notification.markAsRead(notificationId);

      socket.emit('notification:read:success', {
        notificationId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      socket.emit('error', {
        event: 'notification:read',
        message: 'Failed to mark notification as read'
      });
    }
  });

  /**
   * Mark all notifications as read
   */
  socket.on('notification:read:all', async () => {
    try {
      const count = await Notification.markAllAsRead(userId);

      socket.emit('notification:read:all:success', {
        count,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      socket.emit('error', {
        event: 'notification:read:all',
        message: 'Failed to mark all notifications as read'
      });
    }
  });

  /**
   * Delete notification
   * Client sends: { notificationId }
   */
  socket.on('notification:delete', async (data) => {
    try {
      const { notificationId } = data;

      // Get notification
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return socket.emit('error', {
          event: 'notification:delete',
          message: 'Notification not found'
        });
      }

      // Verify ownership
      if (notification.user_id !== userId) {
        return socket.emit('error', {
          event: 'notification:delete',
          message: 'Unauthorized'
        });
      }

      // Delete notification
      await Notification.delete(notificationId);

      socket.emit('notification:deleted', {
        notificationId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      socket.emit('error', {
        event: 'notification:delete',
        message: 'Failed to delete notification'
      });
    }
  });

  /**
   * Get unread notification count
   */
  socket.on('notification:count', async () => {
    try {
      const count = await Notification.getUnreadCount(userId);

      socket.emit('notification:count:response', {
        count,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error getting notification count:', error);
      socket.emit('error', {
        event: 'notification:count',
        message: 'Failed to get notification count'
      });
    }
  });

  /**
   * Subscribe to notification updates
   * User is automatically subscribed when connecting (joined user room)
   */
  socket.on('notification:subscribe', () => {
    socket.emit('notification:subscribed', {
      userId,
      timestamp: new Date()
    });
  });
}

/**
 * Send real-time notification to user
 * @param {Server} io - Socket.io server instance
 * @param {number} userId - User ID to send notification to
 * @param {Object} notification - Notification data
 */
function sendNotification(io, userId, notification) {
  io.to(`user:${userId}`).emit('notification:new', notification);
}

/**
 * Send bulk notifications to multiple users
 * @param {Server} io - Socket.io server instance
 * @param {number[]} userIds - Array of user IDs
 * @param {Object} notification - Notification data
 */
function sendBulkNotifications(io, userIds, notification) {
  for (const userId of userIds) {
    sendNotification(io, userId, notification);
  }
}

module.exports = {
  registerHandlers,
  sendNotification,
  sendBulkNotifications
};
