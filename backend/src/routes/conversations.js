const express = require('express');
const router = express.Router();
const { authenticate: authenticateToken } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

/**
 * @route   GET /api/conversations
 * @desc    Get user's conversations list
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, include_archived = false } = req.query;

    const conversations = await Conversation.getUserConversations(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      include_archived: include_archived === 'true'
    });

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
});

/**
 * @route   GET /api/conversations/unread-count
 * @desc    Get total unread message count
 * @access  Private
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Conversation.getTotalUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

/**
 * @route   POST /api/conversations
 * @desc    Create a new conversation
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, title, participant_ids } = req.body;

    // Validate required fields
    if (!type || !participant_ids || !Array.isArray(participant_ids)) {
      return res.status(400).json({
        success: false,
        error: 'Type and participant_ids are required'
      });
    }

    // For direct conversations, use the helper function
    if (type === 'direct') {
      if (participant_ids.length !== 1) {
        return res.status(400).json({
          success: false,
          error: 'Direct conversations require exactly one other participant'
        });
      }

      const conversationId = await Conversation.createDirect(req.user.id, participant_ids[0]);
      const conversation = await Conversation.getWithDetails(conversationId, req.user.id);

      return res.status(201).json({
        success: true,
        data: conversation
      });
    }

    // For group conversations
    if (type === 'group') {
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required for group conversations'
        });
      }

      if (participant_ids.length < 1) {
        return res.status(400).json({
          success: false,
          error: 'Group conversations require at least one other participant'
        });
      }

      // Create the conversation
      const conversation = await Conversation.create({
        type: 'group',
        title,
        created_by: req.user.id
      });

      // Add creator as admin
      await Conversation.addParticipant(conversation.id, req.user.id, 'admin');

      // Add other participants
      for (const userId of participant_ids) {
        await Conversation.addParticipant(conversation.id, userId, 'member');
      }

      const fullConversation = await Conversation.getWithDetails(conversation.id, req.user.id);

      return res.status(201).json({
        success: true,
        data: fullConversation
      });
    }

    res.status(400).json({
      success: false,
      error: 'Invalid conversation type'
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
});

/**
 * @route   GET /api/conversations/:id
 * @desc    Get conversation details
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    const conversation = await Conversation.getWithDetails(parseInt(id), req.user.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation'
    });
  }
});

/**
 * @route   PUT /api/conversations/:id
 * @desc    Update conversation (title, etc.)
 * @access  Private (Admin only for group conversations)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    const updated = await Conversation.update(parseInt(id), { title });

    if (!updated) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversation'
    });
  }
});

/**
 * @route   DELETE /api/conversations/:id
 * @desc    Leave or delete conversation
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    // Remove user from conversation
    await Conversation.removeParticipant(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Left conversation successfully'
    });
  } catch (error) {
    console.error('Error leaving conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave conversation'
    });
  }
});

/**
 * @route   POST /api/conversations/:id/archive
 * @desc    Archive or unarchive conversation
 * @access  Private
 */
router.post('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { archived = true } = req.body;

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    await Conversation.setArchived(parseInt(id), req.user.id, archived);

    res.json({
      success: true,
      message: archived ? 'Conversation archived' : 'Conversation unarchived'
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive conversation'
    });
  }
});

/**
 * @route   POST /api/conversations/:id/mute
 * @desc    Mute or unmute conversation
 * @access  Private
 */
router.post('/:id/mute', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { muted = true } = req.body;

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    await Conversation.setMuted(parseInt(id), req.user.id, muted);

    res.json({
      success: true,
      message: muted ? 'Conversation muted' : 'Conversation unmuted'
    });
  } catch (error) {
    console.error('Error muting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mute conversation'
    });
  }
});

/**
 * @route   POST /api/conversations/:id/members
 * @desc    Add members to group conversation
 * @access  Private (Admin only)
 */
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;

    if (!user_ids || !Array.isArray(user_ids)) {
      return res.status(400).json({
        success: false,
        error: 'user_ids array is required'
      });
    }

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    // Add members
    for (const userId of user_ids) {
      await Conversation.addParticipant(parseInt(id), userId, 'member');
    }

    res.json({
      success: true,
      message: 'Members added successfully'
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add members'
    });
  }
});

/**
 * @route   DELETE /api/conversations/:id/members/:userId
 * @desc    Remove member from group conversation
 * @access  Private (Admin only)
 */
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    await Conversation.removeParticipant(parseInt(id), parseInt(userId));

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove member'
    });
  }
});

/**
 * @route   GET /api/conversations/:id/messages
 * @desc    Get messages in a conversation
 * @access  Private
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, before_id } = req.query;

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    const messages = await Message.getByConversationId(parseInt(id), {
      limit: parseInt(limit),
      offset: parseInt(offset),
      before_id: before_id ? parseInt(before_id) : null
    });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

/**
 * @route   POST /api/conversations/:id/messages
 * @desc    Send a message in a conversation
 * @access  Private
 */
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      content,
      message_type = 'text',
      attachment_url,
      attachment_type,
      attachment_size,
      attachment_name,
      reply_to_id
    } = req.body;

    // Validate required fields
    if (!content && !attachment_url) {
      return res.status(400).json({
        success: false,
        error: 'Message content or attachment is required'
      });
    }

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    const message = await Message.create({
      conversation_id: parseInt(id),
      sender_id: req.user.id,
      content,
      message_type,
      attachment_url,
      attachment_type,
      attachment_size,
      attachment_name,
      reply_to_id: reply_to_id ? parseInt(reply_to_id) : null
    });

    const fullMessage = await Message.getWithDetails(message.id);

    res.status(201).json({
      success: true,
      data: fullMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * @route   GET /api/conversations/:id/messages/search
 * @desc    Search messages in a conversation
 * @access  Private
 */
router.get('/:id/messages/search', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    const messages = await Message.search(parseInt(id), q, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search messages'
    });
  }
});

/**
 * @route   POST /api/conversations/:id/read
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is participant
    const isParticipant = await Conversation.isParticipant(parseInt(id), req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this conversation'
      });
    }

    const count = await Message.markConversationAsRead(parseInt(id), req.user.id);

    res.json({
      success: true,
      data: { marked_read: count }
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

module.exports = router;
