/**
 * WebSocket Presence Event Handlers
 * Handles user online/offline status and presence tracking
 */

/**
 * Handle user coming online
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Socket instance
 * @param {Map} userSockets - Map of user IDs to socket IDs
 */
function handleUserOnline(io, socket, userSockets) {
  const userId = socket.userId;
  const username = socket.username;

  // Emit to user's contacts/friends that they're online
  socket.broadcast.emit('user:online', {
    userId,
    username,
    timestamp: new Date()
  });

  console.log(`✅ User ${userId} (${username}) is online`);
}

/**
 * Handle user going offline
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Socket instance
 * @param {number} userId - User ID
 */
function handleUserOffline(io, socket, userId) {
  const username = socket.username;

  // Emit to user's contacts/friends that they're offline
  io.emit('user:offline', {
    userId,
    username,
    timestamp: new Date()
  });

  console.log(`❌ User ${userId} (${username}) is offline`);
}

/**
 * Register presence-related event handlers
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Socket instance
 * @param {Map} userSockets - Map of user IDs to socket IDs
 */
function registerHandlers(io, socket, userSockets) {
  /**
   * Get online status of specific users
   * Client sends: { userIds: number[] }
   */
  socket.on('presence:check', (data) => {
    try {
      const { userIds } = data;

      if (!Array.isArray(userIds)) {
        return socket.emit('error', {
          event: 'presence:check',
          message: 'userIds must be an array'
        });
      }

      const onlineStatus = {};
      for (const uid of userIds) {
        onlineStatus[uid] = userSockets.has(uid);
      }

      socket.emit('presence:status', {
        users: onlineStatus,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error checking presence:', error);
      socket.emit('error', {
        event: 'presence:check',
        message: 'Failed to check presence'
      });
    }
  });

  /**
   * Subscribe to presence updates for specific users
   * Client sends: { userIds: number[] }
   */
  socket.on('presence:subscribe', (data) => {
    try {
      const { userIds } = data;

      if (!Array.isArray(userIds)) {
        return socket.emit('error', {
          event: 'presence:subscribe',
          message: 'userIds must be an array'
        });
      }

      // Join presence rooms for each user
      for (const uid of userIds) {
        socket.join(`presence:${uid}`);
      }

      // Send current status
      const onlineStatus = {};
      for (const uid of userIds) {
        onlineStatus[uid] = userSockets.has(uid);
      }

      socket.emit('presence:subscribed', {
        users: onlineStatus,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error subscribing to presence:', error);
      socket.emit('error', {
        event: 'presence:subscribe',
        message: 'Failed to subscribe to presence'
      });
    }
  });

  /**
   * Unsubscribe from presence updates
   * Client sends: { userIds: number[] }
   */
  socket.on('presence:unsubscribe', (data) => {
    try {
      const { userIds } = data;

      if (!Array.isArray(userIds)) {
        return;
      }

      // Leave presence rooms
      for (const uid of userIds) {
        socket.leave(`presence:${uid}`);
      }

      socket.emit('presence:unsubscribed', {
        userIds,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error unsubscribing from presence:', error);
    }
  });
}

module.exports = {
  handleUserOnline,
  handleUserOffline,
  registerHandlers
};
