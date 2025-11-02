const express = require('express');
const router = express.Router();
const { authenticate: authenticateToken } = require('../middleware/auth');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const MessageReaction = require('../models/messageReaction');

/**
 * @route   GET /api/messages/:id
 * @desc    Get message by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.getWithDetails(parseInt(id));

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is participant in the conversation
    const isParticipant = await Conversation.isParticipant(message.conversation_id, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this message'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error getting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get message'
    });
  }
});

/**
 * @route   PUT /api/messages/:id
 * @desc    Edit message
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const message = await Message.findById(parseInt(id));

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own messages'
      });
    }

    // Check if message is already deleted
    if (message.deleted_at) {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit deleted message'
      });
    }

    const updated = await Message.update(parseInt(id), content);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit message'
    });
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(parseInt(id));

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own messages'
      });
    }

    await Message.delete(parseInt(id));

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

/**
 * @route   POST /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(parseInt(id));

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is participant in the conversation
    const isParticipant = await Conversation.isParticipant(message.conversation_id, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this message'
      });
    }

    await Message.markAsRead(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

/**
 * @route   GET /api/messages/:id/read-receipts
 * @desc    Get read receipts for a message
 * @access  Private
 */
router.get('/:id/read-receipts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(parseInt(id));

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is participant in the conversation
    const isParticipant = await Conversation.isParticipant(message.conversation_id, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this message'
      });
    }

    const receipts = await Message.getReadReceipts(parseInt(id));

    res.json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Error getting read receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get read receipts'
    });
  }
});

/**
 * @route   POST /api/messages/:id/reactions
 * @desc    Toggle reaction on a message
 * @access  Private
 */
router.post('/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        error: 'Emoji is required'
      });
    }

    const message = await Message.findById(parseInt(id));
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is participant in the conversation
    const isParticipant = await Conversation.isParticipant(message.conversation_id, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this message'
      });
    }

    const result = await MessageReaction.toggleReaction(parseInt(id), req.user.id, emoji);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle reaction'
    });
  }
});

/**
 * @route   GET /api/messages/:id/reactions
 * @desc    Get reactions for a message
 * @access  Private
 */
router.get('/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(parseInt(id));
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is participant in the conversation
    const isParticipant = await Conversation.isParticipant(message.conversation_id, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this message'
      });
    }

    const reactions = await MessageReaction.getReactionSummary(parseInt(id));

    res.json({
      success: true,
      data: reactions
    });
  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reactions'
    });
  }
});

module.exports = router;
