/**
 * WebSocket Server Setup for Real-time Messaging and Notifications
 * Handles Socket.io initialization, authentication, and event routing
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { config } = require('../../../config/app.config');
const messageHandlers = require('./handlers/messageHandlers');
const notificationHandlers = require('./handlers/notificationHandlers');
const presenceHandlers = require('./handlers/presenceHandlers');

// Store active user connections (userId -> Set of socket IDs)
const userSockets = new Map();

// Store typing indicators (conversationId -> Set of user IDs)
const typingUsers = new Map();

/**
 * Initialize WebSocket server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
function initializeWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST']
    },
    // Increase ping timeout for better stability
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.auth.jwt.secret, {
        issuer: config.auth.jwt.issuer,
        audience: config.auth.jwt.audience
      });

      // Attach user data to socket
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      socket.email = decoded.email;

      console.log(`✅ WebSocket authenticated: User ${socket.userId} (${socket.username})`);
      next();
    } catch (error) {
      console.error('❌ WebSocket authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User ${userId} connected (Socket ID: ${socket.id})`);

    // Track user connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Handle presence (online status)
    presenceHandlers.handleUserOnline(io, socket, userSockets);

    // Register message event handlers
    messageHandlers.registerHandlers(io, socket, userSockets, typingUsers);

    // Register notification event handlers
    notificationHandlers.registerHandlers(io, socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User ${userId} disconnected (Socket ID: ${socket.id})`);

      // Remove socket from tracking
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // User is fully offline
          presenceHandlers.handleUserOffline(io, socket, userId);
        }
      }

      // Clear typing indicators
      typingUsers.forEach((users, conversationId) => {
        if (users.has(userId)) {
          users.delete(userId);
          io.to(`conversation:${conversationId}`).emit('user:typing:stop', {
            conversationId,
            userId,
            username: socket.username
          });
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
}

/**
 * Get all socket IDs for a user
 * @param {number} userId - User ID
 * @returns {Set<string>} Set of socket IDs
 */
function getUserSockets(userId) {
  return userSockets.get(userId) || new Set();
}

/**
 * Check if user is online
 * @param {number} userId - User ID
 * @returns {boolean} True if user has active connections
 */
function isUserOnline(userId) {
  const sockets = userSockets.get(userId);
  return sockets && sockets.size > 0;
}

/**
 * Get all online users
 * @returns {number[]} Array of online user IDs
 */
function getOnlineUsers() {
  return Array.from(userSockets.keys());
}

/**
 * Emit event to specific user (all their connections)
 * @param {Server} io - Socket.io server instance
 * @param {number} userId - User ID
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
function emitToUser(io, userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit event to conversation participants
 * @param {Server} io - Socket.io server instance
 * @param {number} conversationId - Conversation ID
 * @param {string} event - Event name
 * @param {*} data - Event data
 */
function emitToConversation(io, conversationId, event, data) {
  io.to(`conversation:${conversationId}`).emit(event, data);
}

module.exports = {
  initializeWebSocket,
  getUserSockets,
  isUserOnline,
  getOnlineUsers,
  emitToUser,
  emitToConversation,
  userSockets,
  typingUsers
};
