const express = require('express');
const router = express.Router();
const { authenticate: authenticateToken } = require('../middleware/auth');
const Notification = require('../models/Notification');

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unread_only = false, type } = req.query;

    const notifications = await Notification.getUserNotifications(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unread_only: unread_only === 'true',
      type: type || null
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

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
 * @route   GET /api/notifications/batches
 * @desc    Get notification batches
 * @access  Private
 */
router.get('/batches', authenticateToken, async (req, res) => {
  try {
    const batches = await Notification.getBatches(req.user.id);

    res.json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('Error getting notification batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification batches'
    });
  }
});

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await Notification.getPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences'
    });
  }
});

/**
 * @route   PUT /api/notifications/preferences/:type
 * @desc    Update notification preferences for a type
 * @access  Private
 */
router.put('/preferences/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { email_enabled, push_enabled, in_app_enabled, frequency } = req.body;

    const updated = await Notification.updatePreferences(req.user.id, type, {
      email_enabled,
      push_enabled,
      in_app_enabled,
      frequency
    });

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
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.getWithDetails(parseInt(id));

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Check if notification belongs to user
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this notification'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error getting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification'
    });
  }
});

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Notification.markAsRead(parseInt(id), req.user.id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or already read'
      });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * @route   POST /api/notifications/:id/click
 * @desc    Mark notification as clicked
 * @access  Private
 */
router.post('/:id/click', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Notification.markAsClicked(parseInt(id), req.user.id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error marking notification as clicked:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as clicked'
    });
  }
});

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      data: { marked_read: count }
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Notification.delete(parseInt(id), req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

/**
 * @route   DELETE /api/notifications/clear-all
 * @desc    Clear all read notifications
 * @access  Private
 */
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteAll(req.user.id);

    res.json({
      success: true,
      message: 'All read notifications cleared'
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear notifications'
    });
  }
});

module.exports = router;
