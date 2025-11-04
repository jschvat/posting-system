const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

/**
 * @route   POST /api/device-tokens
 * @desc    Register a device token for push notifications
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      token,
      platform, // 'ios', 'android', 'web'
      device_name,
      device_id,
      app_version
    } = req.body;

    if (!token || !platform || !device_id) {
      return res.status(400).json({
        success: false,
        error: 'Token, platform, and device_id are required'
      });
    }

    // Validate platform
    if (!['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Platform must be ios, android, or web'
      });
    }

    // Upsert device token (update if exists, insert if new)
    const result = await db.query(
      `INSERT INTO device_tokens
       (user_id, token, platform, device_name, device_id, app_version, is_active, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET
         token = EXCLUDED.token,
         platform = EXCLUDED.platform,
         device_name = EXCLUDED.device_name,
         app_version = EXCLUDED.app_version,
         is_active = true,
         last_used_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, token, platform, device_id, is_active`,
      [req.user.id, token, platform, device_name, device_id, app_version]
    );

    console.log(`✅ Device token registered for user ${req.user.id}, platform: ${platform}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Device token registered successfully'
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register device token'
    });
  }
});

/**
 * @route   GET /api/device-tokens
 * @desc    Get user's registered devices
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id,
         platform,
         device_name,
         device_id,
         app_version,
         is_active,
         last_used_at,
         created_at
       FROM device_tokens
       WHERE user_id = $1
       ORDER BY last_used_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting device tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get device tokens'
    });
  }
});

/**
 * @route   DELETE /api/device-tokens/:deviceId
 * @desc    Unregister a device token
 * @access  Private
 */
router.delete('/:deviceId', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await db.query(
      `UPDATE device_tokens
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND device_id = $2
       RETURNING id`,
      [req.user.id, deviceId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device token not found'
      });
    }

    console.log(`🗑️  Device token unregistered for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Device token unregistered successfully'
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister device token'
    });
  }
});

/**
 * @route   POST /api/device-tokens/test
 * @desc    Send test push notification to user's devices
 * @access  Private
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const pushService = require('../services/pushNotificationService');

    const testNotification = {
      id: 0,
      title: '🔔 Test Notification',
      message: 'Your push notifications are working perfectly!',
      type: 'system'
    };

    const result = await pushService.sendToUser(
      req.user.id,
      testNotification,
      { test: 'true' }
    );

    res.json({
      success: true,
      data: result,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

module.exports = router;
