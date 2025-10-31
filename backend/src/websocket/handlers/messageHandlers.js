/**
 * WebSocket Message Event Handlers
 * Handles real-time messaging events: send, edit, delete, typing indicators
 */

const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const Notification = require('../../models/Notification');

/**
 * Register all message-related event handlers
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Socket instance
 * @param {Map} userSockets - Map of user IDs to socket IDs
 * @param {Map} typingUsers - Map of conversation IDs to typing user IDs
 */
function registerHandlers(io, socket, userSockets, typingUsers) {
  const userId = socket.userId;

  /**
   * Join a conversation room
   * Client sends: { conversationId: number }
   */
  socket.on('conversation:join', async (data) => {
    try {
      const { conversationId } = data;

      // Verify user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return socket.emit('error', {
          event: 'conversation:join',
          message: 'You are not a participant in this conversation'
        });
      }

      // Join the conversation room
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);

      // Notify others in the room that a user joined
      socket.to(`conversation:${conversationId}`).emit('conversation:user:joined', {
        conversationId,
        userId,
        username: socket.username
      });

      // Get all active users in this conversation
      const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
      const activeUserIds = [];
      if (room) {
        for (const socketId of room) {
          const sock = io.sockets.sockets.get(socketId);
          if (sock && sock.userId) {
            activeUserIds.push({
              userId: sock.userId,
              username: sock.username
            });
          }
        }
      }

      socket.emit('conversation:joined', {
        conversationId,
        activeUsers: activeUserIds
      });
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', {
        event: 'conversation:join',
        message: 'Failed to join conversation'
      });
    }
  });

  /**
   * Leave a conversation room
   * Client sends: { conversationId: number }
   */
  socket.on('conversation:leave', (data) => {
    const { conversationId } = data;

    // Notify others in the room that a user left
    socket.to(`conversation:${conversationId}`).emit('conversation:user:left', {
      conversationId,
      userId,
      username: socket.username
    });

    socket.leave(`conversation:${conversationId}`);
    console.log(`User ${userId} left conversation ${conversationId}`);
    socket.emit('conversation:left', { conversationId });
  });

  /**
   * Send a new message
   * Client sends: { conversationId, content, messageType?, replyToId? }
   */
  socket.on('message:send', async (data) => {
    try {
      const { conversationId, content, messageType = 'text', replyToId } = data;

      // Verify user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return socket.emit('error', {
          event: 'message:send',
          message: 'You are not a participant in this conversation'
        });
      }

      // Create message in database
      const message = await Message.create({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: messageType,
        reply_to_id: replyToId
      });

      // Get full message details
      const fullMessage = await Message.getWithDetails(message.id);

      // Emit to all participants in the conversation
      io.to(`conversation:${conversationId}`).emit('message:new', {
        message: fullMessage,
        conversationId
      });

      // Send notification to other participants
      const conversation = await Conversation.getWithDetails(conversationId, userId);
      const otherParticipants = conversation.other_participants || [];

      for (const participant of otherParticipants) {
        // Create in-app notification
        await Notification.create({
          user_id: participant.id,
          type: 'new_message',
          title: 'New Message',
          message: `${socket.username}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          actor_id: userId,
          entity_type: 'message',
          entity_id: message.id,
          action_url: `/messages/${conversationId}`,
          priority: 'normal'
        });

        // Emit real-time notification if user is online
        io.to(`user:${participant.id}`).emit('notification:new', {
          type: 'new_message',
          conversationId,
          messageId: message.id,
          from: {
            id: userId,
            username: socket.username
          },
          preview: content.substring(0, 100)
        });
      }

      // Stop typing indicator for sender
      const typing = typingUsers.get(conversationId);
      if (typing && typing.has(userId)) {
        typing.delete(userId);
        io.to(`conversation:${conversationId}`).emit('user:typing:stop', {
          conversationId,
          userId,
          username: socket.username
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', {
        event: 'message:send',
        message: 'Failed to send message',
        details: error.message
      });
    }
  });

  /**
   * Edit a message
   * Client sends: { messageId, content }
   */
  socket.on('message:edit', async (data) => {
    try {
      const { messageId, content } = data;

      // Get message
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', {
          event: 'message:edit',
          message: 'Message not found'
        });
      }

      // Verify ownership
      if (message.sender_id !== userId) {
        return socket.emit('error', {
          event: 'message:edit',
          message: 'You can only edit your own messages'
        });
      }

      // Check if deleted
      if (message.deleted_at) {
        return socket.emit('error', {
          event: 'message:edit',
          message: 'Cannot edit deleted message'
        });
      }

      // Update message
      const updated = await Message.update(messageId, content);
      const fullMessage = await Message.getWithDetails(messageId);

      // Emit to conversation
      io.to(`conversation:${message.conversation_id}`).emit('message:edited', {
        message: fullMessage,
        conversationId: message.conversation_id
      });
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', {
        event: 'message:edit',
        message: 'Failed to edit message'
      });
    }
  });

  /**
   * Delete a message
   * Client sends: { messageId }
   */
  socket.on('message:delete', async (data) => {
    try {
      const { messageId } = data;

      // Get message
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', {
          event: 'message:delete',
          message: 'Message not found'
        });
      }

      // Verify ownership
      if (message.sender_id !== userId) {
        return socket.emit('error', {
          event: 'message:delete',
          message: 'You can only delete your own messages'
        });
      }

      // Delete message (soft delete)
      await Message.delete(messageId);

      // Emit to conversation
      io.to(`conversation:${message.conversation_id}`).emit('message:deleted', {
        messageId,
        conversationId: message.conversation_id
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', {
        event: 'message:delete',
        message: 'Failed to delete message'
      });
    }
  });

  /**
   * Mark message as read
   * Client sends: { messageId }
   */
  socket.on('message:read', async (data) => {
    try {
      const { messageId } = data;

      // Mark as read
      await Message.markAsRead(messageId, userId);

      // Get message to find conversation
      const message = await Message.findById(messageId);
      if (message) {
        // Emit read receipt to conversation
        io.to(`conversation:${message.conversation_id}`).emit('message:read', {
          messageId,
          conversationId: message.conversation_id,
          userId,
          username: socket.username,
          readAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      socket.emit('error', {
        event: 'message:read',
        message: 'Failed to mark message as read'
      });
    }
  });

  /**
   * Mark entire conversation as read
   * Client sends: { conversationId }
   */
  socket.on('conversation:read', async (data) => {
    try {
      const { conversationId } = data;

      // Mark all messages as read
      const count = await Message.markConversationAsRead(conversationId, userId);

      socket.emit('conversation:read', {
        conversationId,
        markedCount: count
      });

      // Emit to conversation participants
      io.to(`conversation:${conversationId}`).emit('conversation:read:user', {
        conversationId,
        userId,
        username: socket.username
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      socket.emit('error', {
        event: 'conversation:read',
        message: 'Failed to mark conversation as read'
      });
    }
  });

  /**
   * User is typing
   * Client sends: { conversationId }
   */
  socket.on('user:typing:start', async (data) => {
    try {
      const { conversationId } = data;

      // Verify user is a participant
      const isParticipant = await Conversation.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return;
      }

      // Track typing user
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId).add(userId);

      // Emit to other participants (not to sender)
      socket.to(`conversation:${conversationId}`).emit('user:typing:start', {
        conversationId,
        userId,
        username: socket.username
      });

      // Auto-clear typing indicator after 5 seconds
      setTimeout(() => {
        const typing = typingUsers.get(conversationId);
        if (typing && typing.has(userId)) {
          typing.delete(userId);
          socket.to(`conversation:${conversationId}`).emit('user:typing:stop', {
            conversationId,
            userId,
            username: socket.username
          });
        }
      }, 5000);
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });

  /**
   * User stopped typing
   * Client sends: { conversationId }
   */
  socket.on('user:typing:stop', async (data) => {
    try {
      const { conversationId } = data;

      // Remove from typing users
      const typing = typingUsers.get(conversationId);
      if (typing) {
        typing.delete(userId);
      }

      // Emit to other participants
      socket.to(`conversation:${conversationId}`).emit('user:typing:stop', {
        conversationId,
        userId,
        username: socket.username
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });
}

module.exports = {
  registerHandlers
};
