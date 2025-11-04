const admin = require('firebase-admin');
const path = require('path');

class FirebaseAdminService {
  constructor() {
    this.initialized = false;
    this.app = null;
    this.enabled = false;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    if (this.initialized) {
      return this.app;
    }

    // Check if push notifications are enabled
    if (process.env.PUSH_NOTIFICATIONS_ENABLED !== 'true') {
      console.log('ℹ️  Push notifications are disabled (PUSH_NOTIFICATIONS_ENABLED=false)');
      this.initialized = true;
      this.enabled = false;
      return null;
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
        console.log('ℹ️  Firebase credentials not configured - push notifications disabled');
        console.log('   Set FIREBASE_PRIVATE_KEY_PATH or FIREBASE_PRIVATE_KEY_BASE64 to enable');
        this.initialized = true;
        this.enabled = false;
        return null;
      }

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      this.initialized = true;
      this.enabled = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
      return this.app;
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error.message);
      console.log('   Push notifications will be disabled');
      this.initialized = true;
      this.enabled = false;
      return null;
    }
  }

  /**
   * Check if Firebase is enabled and initialized
   */
  isEnabled() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.enabled;
  }

  /**
   * Get Firebase Admin instance
   */
  getAdmin() {
    if (!this.initialized) {
      this.initialize();
    }
    if (!this.enabled) {
      throw new Error('Firebase Admin is not enabled');
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
    if (!this.enabled) {
      throw new Error('Firebase Admin is not enabled');
    }
    return admin.messaging();
  }
}

// Singleton instance
const firebaseAdminService = new FirebaseAdminService();

module.exports = firebaseAdminService;
