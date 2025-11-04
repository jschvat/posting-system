# Push Notifications Implementation Plan

## Overview
This document outlines the complete implementation plan for adding iOS and Android push notifications to the posting-system application using Firebase Cloud Messaging (FCM).

---

## Architecture Decision: Firebase Cloud Messaging (FCM)

**Why FCM?**
- ✅ Single implementation for both iOS and Android
- ✅ Free for unlimited notifications
- ✅ Handles APNS (Apple Push Notification Service) automatically
- ✅ Reliable delivery with automatic retries
- ✅ Built-in analytics and debugging
- ✅ Well-maintained by Google
- ✅ Works with web, iOS, and Android

**Alternative Considered:**
- Native APNS + FCM separately: Too complex, duplicate code
- Expo Push: Limited to Expo apps only
- OneSignal/Pusher: Paid services with usage limits

---

## Implementation Phases

### Phase 1: Database Schema & Backend Foundation
### Phase 2: FCM Service Setup
### Phase 3: Backend API & Integration
### Phase 4: Frontend/Mobile Integration
### Phase 5: Testing & Deployment

---

## Phase 1: Database Schema & Backend Foundation

### 1.1 Database Migration: Device Tokens Table

**File:** `backend/src/database/migrations/020_push_notifications.sql`

```sql
-- Migration 020: Push Notifications System
-- Adds device token management and push notification tracking

-- Device tokens table (stores FCM tokens for user devices)
CREATE TABLE device_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name VARCHAR(255), -- e.g., "iPhone 14 Pro", "Pixel 7"
  device_id VARCHAR(255), -- unique device identifier
  app_version VARCHAR(50), -- e.g., "1.2.3"
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one token per device
  UNIQUE(user_id, device_id),
  -- Index for efficient queries
  INDEX idx_device_tokens_user_id (user_id),
  INDEX idx_device_tokens_active (user_id, is_active),
  INDEX idx_device_tokens_token (token)
);

-- Push notification delivery tracking
CREATE TABLE push_notification_logs (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  device_token_id INTEGER REFERENCES device_tokens(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_message_id VARCHAR(255), -- FCM response message ID
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  error_message TEXT, -- Error details if failed
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_push_logs_notification (notification_id),
  INDEX idx_push_logs_user (user_id),
  INDEX idx_push_logs_status (status),
  INDEX idx_push_logs_created (created_at)
);

-- Failed token tracking (for cleanup)
CREATE TABLE failed_tokens (
  id SERIAL PRIMARY KEY,
  device_token_id INTEGER REFERENCES device_tokens(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  error_code VARCHAR(50), -- 'NotRegistered', 'InvalidRegistration', etc.
  error_message TEXT,
  failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_failed_tokens_created (failed_at)
);

-- Add push_enabled to notification_preferences if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
    AND column_name = 'push_enabled'
  ) THEN
    ALTER TABLE notification_preferences
    ADD COLUMN push_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Trigger to update updated_at on device_tokens
CREATE OR REPLACE FUNCTION update_device_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_tokens_update_timestamp
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_token_timestamp();

-- Comments
COMMENT ON TABLE device_tokens IS 'Stores FCM device tokens for push notifications';
COMMENT ON TABLE push_notification_logs IS 'Tracks push notification delivery status';
COMMENT ON TABLE failed_tokens IS 'Tracks failed tokens for cleanup and debugging';
```

### 1.2 Rollback Migration

**File:** `backend/src/database/migrations/020_push_notifications_down.sql`

```sql
-- Rollback for Migration 020: Push Notifications System

DROP TRIGGER IF EXISTS device_tokens_update_timestamp ON device_tokens;
DROP FUNCTION IF EXISTS update_device_token_timestamp();

DROP TABLE IF EXISTS failed_tokens CASCADE;
DROP TABLE IF EXISTS push_notification_logs CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;

-- Remove push_enabled column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
    AND column_name = 'push_enabled'
  ) THEN
    ALTER TABLE notification_preferences
    DROP COLUMN push_enabled;
  END IF;
END $$;
```

---

## Phase 2: FCM Service Setup

### 2.1 Firebase Project Setup

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project or use existing
3. Add iOS app (Bundle ID required)
4. Add Android app (Package name required)
5. Add Web app (optional, for web push)
6. Download configuration files:
   - iOS: `GoogleService-Info.plist`
   - Android: `google-services.json`
7. Generate Service Account Key:
   - Project Settings → Service Accounts
   - Generate New Private Key
   - Save as `firebase-service-account.json`

### 2.2 Backend Dependencies

**Install FCM Admin SDK:**
```bash
cd backend
npm install firebase-admin
```

**Update `backend/package.json`:**
```json
{
  "dependencies": {
    // ... existing dependencies
    "firebase-admin": "^12.0.0"
  }
}
```

### 2.3 Environment Configuration

**Update `backend/.env`:**
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_PATH=/path/to/firebase-service-account.json
# OR embed the key directly (base64 encoded)
FIREBASE_PRIVATE_KEY_BASE64=your-base64-encoded-service-account-json

# Push Notification Settings
PUSH_NOTIFICATIONS_ENABLED=true
PUSH_NOTIFICATION_BADGE_ENABLED=true
PUSH_NOTIFICATION_SOUND=default
```

**Security Note:** Never commit `firebase-service-account.json` to git!

**Add to `.gitignore`:**
```
firebase-service-account.json
.env
```

---

## Phase 3: Backend API & Integration

### 3.1 Firebase Admin Service

**File:** `backend/src/services/firebaseAdmin.js`

```javascript
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

class FirebaseAdminService {
  constructor() {
    this.initialized = false;
    this.app = null;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    if (this.initialized) {
      return this.app;
    }

    try {
      let serviceAccount;

      // Option 1: Load from file path
      if (process.env.FIREBASE_PRIVATE_KEY_PATH) {
        const keyPath = path.resolve(process.env.FIREBASE_PRIVATE_KEY_PATH);
        serviceAccount = require(keyPath);
      }
      // Option 2: Load from base64 encoded environment variable
      else if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
        const decoded = Buffer.from(
          process.env.FIREBASE_PRIVATE_KEY_BASE64,
          'base64'
        ).toString('utf8');
        serviceAccount = JSON.parse(decoded);
      } else {
        throw new Error('Firebase credentials not configured');
      }

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      this.initialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
      return this.app;
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get Firebase Admin instance
   */
  getAdmin() {
    if (!this.initialized) {
      this.initialize();
    }
    return admin;
  }

  /**
   * Get Firebase Messaging instance
   */
  getMessaging() {
    if (!this.initialized) {
      this.initialize();
    }
    return admin.messaging();
  }
}

// Singleton instance
const firebaseAdminService = new FirebaseAdminService();

module.exports = firebaseAdminService;
```

### 3.2 Push Notification Service

**File:** `backend/src/services/pushNotificationService.js`

```javascript
const firebaseAdmin = require('./firebaseAdmin');
const db = require('../config/database');

class PushNotificationService {
  /**
   * Send push notification to specific device token
   */
  async sendToToken(token, notification, data = {}) {
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
      console.error('❌ Push notification failed:', error);

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
      // Get user's active device tokens
      const tokens = await this.getUserDeviceTokens(userId);

      if (tokens.length === 0) {
        console.log(`No active device tokens for user ${userId}`);
        return { success: true, sent: 0 };
      }

      // Check if push notifications are enabled for this notification type
      const preferences = await this.getUserPushPreferences(
        userId,
        notification.type
      );

      if (!preferences.push_enabled) {
        console.log(`Push notifications disabled for user ${userId}, type ${notification.type}`);
        return { success: true, sent: 0, skipped: 'disabled' };
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
    const logs = results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        return {
          notification_id: notificationId,
          device_token_id: result.value.deviceTokenId,
          user_id: userId,
          fcm_message_id: result.value.messageId,
          status: 'sent',
          sent_at: new Date()
        };
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
    });

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
       RETURNING id`,
      []
    );

    console.log(`🗑️  Cleaned up ${result.rowCount} old device tokens`);
    return result.rowCount;
  }
}

module.exports = new PushNotificationService();
```

### 3.3 Device Token Management API

**File:** `backend/src/routes/deviceTokens.js`

```javascript
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
      data: result.rows[0]
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
      message: 'Your push notifications are working!',
      type: 'system'
    };

    const result = await pushService.sendToUser(
      req.user.id,
      testNotification,
      { test: 'true' }
    );

    res.json({
      success: true,
      data: result
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
```

### 3.4 Update Notification Creation to Send Push

**Modify:** `backend/src/models/Notification.js`

Add this method to send push notifications when creating notifications:

```javascript
// Add at the top
const pushService = require('../services/pushNotificationService');

// Add this method to the Notification class
static async createAndNotify(data) {
  // Create the notification in database
  const notification = await this.create(data);

  // Send push notification asynchronously (don't wait)
  if (process.env.PUSH_NOTIFICATIONS_ENABLED === 'true') {
    pushService.sendToUser(data.user_id, notification).catch(error => {
      console.error('Push notification failed:', error);
      // Don't throw - push failure shouldn't fail the main operation
    });
  }

  return notification;
}
```

**Update existing code** to use `createAndNotify()` instead of `create()`:

```javascript
// BEFORE
await Notification.create({
  user_id: followerId,
  type: 'follow',
  // ...
});

// AFTER
await Notification.createAndNotify({
  user_id: followerId,
  type: 'follow',
  // ...
});
```

### 3.5 Register Device Token Routes

**Update:** `backend/src/server.js`

```javascript
// Add device tokens routes
const deviceTokensRoutes = require('./routes/deviceTokens');
app.use('/api/device-tokens', deviceTokensRoutes);
```

---

## Phase 4: Frontend/Mobile Integration

### 4.1 Web Push (React Frontend)

**Install Firebase SDK:**
```bash
cd frontend
npm install firebase
```

**File:** `frontend/src/services/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your Firebase configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('✅ Notification permission granted');

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
      });

      console.log('✅ FCM Token:', token);
      return token;
    } else {
      console.log('❌ Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('📩 Foreground message received:', payload);
      resolve(payload);
    });
  });

export { messaging };
```

**File:** `frontend/public/firebase-messaging-sw.js` (Service Worker)

```javascript
// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Background message received:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/badge-icon.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️  Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.actionUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUnmanaged: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
```

**File:** `frontend/src/hooks/usePushNotifications.ts`

```typescript
import { useState, useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from '../services/firebase';
import { api } from '../services/api';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Listen for foreground messages
    onMessageListener()
      .then((payload: any) => {
        console.log('Foreground push notification:', payload);
        // Show toast or update UI
        // showNotificationToast(payload);
      })
      .catch((err) => console.error('Failed to receive foreground message:', err));
  }, []);

  const requestPermission = async () => {
    const fcmToken = await requestNotificationPermission();

    if (fcmToken) {
      setToken(fcmToken);
      setPermission('granted');

      // Register token with backend
      await registerDeviceToken(fcmToken);
    } else {
      setPermission('denied');
    }
  };

  const registerDeviceToken = async (fcmToken: string) => {
    try {
      const deviceId = getDeviceId(); // Implement this based on your needs
      const deviceName = getBrowserInfo(); // Implement this

      await api.post('/device-tokens', {
        token: fcmToken,
        platform: 'web',
        device_name: deviceName,
        device_id: deviceId,
        app_version: process.env.REACT_APP_VERSION || '1.0.0'
      });

      console.log('✅ Device token registered with backend');
    } catch (error) {
      console.error('❌ Failed to register device token:', error);
    }
  };

  return {
    permission,
    token,
    requestPermission
  };
};

// Helper: Generate unique device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

// Helper: Get browser info
const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown Browser';
};
```

**Update:** `frontend/src/App.tsx`

```typescript
import { usePushNotifications } from './hooks/usePushNotifications';

function App() {
  const { permission, requestPermission } = usePushNotifications();

  useEffect(() => {
    // Auto-request permission on first login or when user is authenticated
    if (user && permission === 'default') {
      // Show a nice prompt first, then request
      requestPermission();
    }
  }, [user, permission]);

  // ... rest of your app
}
```

### 4.2 iOS Implementation (React Native / Swift)

**React Native with Firebase:**

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

**File:** `mobile/src/services/pushNotifications.ts`

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { api } from './api';

export const initializePushNotifications = async () => {
  // Request permission (iOS)
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log('Push notification permission denied');
    return null;
  }

  // Get FCM token
  const token = await messaging().getToken();
  console.log('FCM Token:', token);

  // Register with backend
  await registerDeviceToken(token);

  // Listen for token refresh
  messaging().onTokenRefresh(async (newToken) => {
    await registerDeviceToken(newToken);
  });

  // Handle foreground messages
  messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground push notification:', remoteMessage);
    // Show in-app notification
  });

  return token;
};

const registerDeviceToken = async (token: string) => {
  try {
    const deviceId = await getDeviceId();
    const deviceName = await getDeviceName();

    await api.post('/device-tokens', {
      token,
      platform: Platform.OS, // 'ios' or 'android'
      device_name: deviceName,
      device_id: deviceId,
      app_version: '1.0.0' // From app config
    });

    console.log('✅ Device token registered');
  } catch (error) {
    console.error('❌ Failed to register device token:', error);
  }
};

// Handle background messages (iOS)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message:', remoteMessage);
});
```

### 4.3 Android Implementation

Same as iOS, but ensure you add `google-services.json` to your Android project.

---

## Phase 5: Testing & Deployment

### 5.1 Testing Checklist

**Backend Testing:**
- [ ] Run migration to create device_tokens tables
- [ ] Initialize Firebase Admin SDK
- [ ] Test device token registration API
- [ ] Test sending push to single device
- [ ] Test sending push to all user devices
- [ ] Test invalid token handling
- [ ] Test notification preferences (push enabled/disabled)
- [ ] Test delivery logging

**Frontend/Mobile Testing:**
- [ ] Request notification permission
- [ ] Obtain FCM token
- [ ] Register token with backend
- [ ] Receive foreground push notification
- [ ] Receive background push notification
- [ ] Click notification and verify navigation
- [ ] Test token refresh
- [ ] Test multiple devices for same user
- [ ] Test unregistering device

**Integration Testing:**
- [ ] Create a new post → followers receive push
- [ ] Send a message → recipient receives push
- [ ] Like a post → owner receives push
- [ ] Comment on post → owner receives push
- [ ] Follow user → target receives push

**Performance Testing:**
- [ ] Send push to 100 users simultaneously
- [ ] Send push to 1000 users simultaneously
- [ ] Measure delivery latency
- [ ] Monitor failed token cleanup

### 5.2 Deployment Steps

**1. Backend Deployment:**
```bash
# Run migration
npm run migrate

# Set environment variables
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_BASE64=your-base64-key
PUSH_NOTIFICATIONS_ENABLED=true

# Restart backend
pm2 restart posting-system-backend
```

**2. Frontend Deployment:**
```bash
# Add Firebase config to .env
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_VAPID_KEY=...

# Build and deploy
npm run build
# Deploy to hosting
```

**3. Mobile Deployment:**
- Add `GoogleService-Info.plist` to iOS project
- Add `google-services.json` to Android project
- Enable push notification capability in Xcode
- Build and submit to App Store / Play Store

### 5.3 Monitoring & Maintenance

**Set up cron job for token cleanup:**

```javascript
// backend/src/jobs/cleanupTokens.js
const cron = require('node-cron');
const pushService = require('../services/pushNotificationService');

// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('🧹 Running device token cleanup...');
  await pushService.cleanupFailedTokens(30); // Remove tokens older than 30 days
});
```

**Analytics Queries:**

```sql
-- Delivery success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM push_notification_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY status;

-- Active devices by platform
SELECT
  platform,
  COUNT(*) as active_devices
FROM device_tokens
WHERE is_active = true
GROUP BY platform;

-- Most common failure reasons
SELECT
  error_code,
  COUNT(*) as count
FROM failed_tokens
WHERE failed_at > NOW() - INTERVAL '7 days'
GROUP BY error_code
ORDER BY count DESC;
```

---

## Summary

This implementation provides:

✅ **Full push notification infrastructure** for iOS, Android, and Web
✅ **Firebase Cloud Messaging** integration (single implementation)
✅ **Device token management** with automatic cleanup
✅ **Delivery tracking** and analytics
✅ **User preferences** for notification types
✅ **Badge counts** for unread notifications
✅ **Multi-device support** per user
✅ **Automatic retry** and error handling
✅ **Production-ready** with monitoring and maintenance

---

## Estimated Implementation Time

- **Phase 1 (Database):** 2 hours
- **Phase 2 (FCM Setup):** 2 hours
- **Phase 3 (Backend):** 8 hours
- **Phase 4 (Frontend/Mobile):** 6 hours
- **Phase 5 (Testing):** 4 hours

**Total:** ~22 hours of development time

---

## Next Steps

1. Review this implementation plan
2. Set up Firebase project and obtain credentials
3. Run database migration
4. Implement backend services
5. Integrate with frontend/mobile
6. Test thoroughly
7. Deploy to production

Let me know if you'd like to proceed with implementation!
