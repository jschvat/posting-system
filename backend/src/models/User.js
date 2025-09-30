/**
 * User model for the social media platform
 * Raw SQL implementation
 */

const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Use require directly to avoid potential circular dependencies
let config;
try {
  config = require('../../../config/app.config').config;
} catch (error) {
  console.error('Failed to load config in User model:', error);
  config = null;
}

class User extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * Create a new user with password hashing
   * @param {Object} userData - User data
   * @returns {Object} Created user without sensitive data
   */
  async create(userData) {
    // Hash password if provided
    if (userData.password) {
      userData.password_hash = await this.hashPassword(userData.password);
      delete userData.password; // Remove plain password
    }

    // Normalize email
    if (userData.email) {
      userData.email = userData.email.toLowerCase().trim();
    }

    // Trim string fields
    if (userData.username) userData.username = userData.username.trim();
    if (userData.first_name) userData.first_name = userData.first_name.trim();
    if (userData.last_name) userData.last_name = userData.last_name.trim();

    const user = await super.create(userData);
    return this.getPublicData(user);
  }

  /**
   * Find user by username or email
   * @param {string} identifier - Username or email
   * @returns {Object|null} User or null if not found
   */
  async findByIdentifier(identifier) {
    const normalizedIdentifier = identifier.toLowerCase().trim();
    const result = await this.raw(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [normalizedIdentifier, normalizedIdentifier]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   * @param {string} email - Email address
   * @returns {Object|null} User or null if not found
   */
  async findByEmail(email) {
    return await this.findOne({ email: email.toLowerCase().trim() });
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Object|null} User or null if not found
   */
  async findByUsername(username) {
    return await this.findOne({ username: username.trim() });
  }

  /**
   * Verify password
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {boolean} True if password matches
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Hash a password
   * @param {string} password - Plain text password
   * @returns {string} Hashed password
   */
  async hashPassword(password) {
    const rounds = config?.security?.bcryptRounds || 12;
    return await bcrypt.hash(password, rounds);
  }

  /**
   * Update user's password
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Object|null} Updated user
   */
  async updatePassword(userId, newPassword) {
    const passwordHash = await this.hashPassword(newPassword);
    return await this.update(userId, { password_hash: passwordHash });
  }

  /**
   * Update last login timestamp
   * @param {number} userId - User ID
   * @returns {Object|null} Updated user
   */
  async updateLastLogin(userId) {
    return await this.update(userId, { last_login: new Date() });
  }

  /**
   * Generate password reset token
   * @param {number} userId - User ID
   * @returns {string} Reset token
   */
  async generatePasswordResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await this.update(userId, {
      password_reset_token: token,
      password_reset_expires: expires
    });

    return token;
  }

  /**
   * Generate email verification token
   * @param {number} userId - User ID
   * @returns {string} Verification token
   */
  async generateEmailVerificationToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');

    await this.update(userId, {
      email_verification_token: token
    });

    return token;
  }

  /**
   * Verify email using token
   * @param {string} token - Verification token
   * @returns {boolean} True if verification successful
   */
  async verifyEmail(token) {
    const user = await this.findOne({ email_verification_token: token });

    if (!user) return false;

    await this.update(user.id, {
      email_verified: true,
      email_verification_token: null
    });

    return true;
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {boolean} True if reset successful
   */
  async resetPassword(token, newPassword) {
    const currentTime = new Date().toISOString();
    const user = await this.raw(
      `SELECT * FROM users
       WHERE password_reset_token = $1
       AND password_reset_expires > $2`,
      [token, currentTime]
    );

    if (user.rows.length === 0) return false;

    const passwordHash = await this.hashPassword(newPassword);

    await this.update(user.rows[0].id, {
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null
    });

    return true;
  }

  /**
   * Get user's public data (excluding sensitive information)
   * @param {Object} user - User object
   * @returns {Object} Public user data
   */
  getPublicData(user) {
    if (!user) return null;

    const {
      password_hash,
      password_reset_token,
      password_reset_expires,
      email_verification_token,
      ...publicData
    } = user;

    // Ensure boolean fields are properly typed
    publicData.is_active = Boolean(publicData.is_active);
    publicData.email_verified = Boolean(publicData.email_verified);

    // Add computed fields
    publicData.full_name = `${user.first_name} ${user.last_name}`;
    publicData.display_name = user.first_name && user.last_name
      ? publicData.full_name
      : user.username;

    return publicData;
  }

  /**
   * Get user data (alias for getPublicData)
   * @param {Object} user - User object
   * @returns {Object} User data
   */
  getUserData(user) {
    return this.getPublicData(user);
  }

  /**
   * Get user profile with additional info
   * @param {number} userId - User ID
   * @returns {Object|null} User profile
   */
  async getProfile(userId) {
    const user = await this.findById(userId);
    if (!user) return null;

    // Get user's post count
    const postCountResult = await this.raw(
      'SELECT COUNT(*) as post_count FROM posts WHERE user_id = $1 AND is_published = true',
      [userId]
    );

    const profile = this.getPublicData(user);
    profile.post_count = parseInt(postCountResult.rows[0].post_count);

    return profile;
  }

  /**
   * Check if username exists
   * @param {string} username - Username to check
   * @param {number} excludeUserId - User ID to exclude from check
   * @returns {boolean} True if username exists
   */
  async usernameExists(username, excludeUserId = null) {
    let sql = 'SELECT COUNT(*) FROM users WHERE username = $1';
    const params = [username.trim()];

    if (excludeUserId) {
      sql += ' AND id != $2';
      params.push(excludeUserId);
    }

    const result = await this.raw(sql, params);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {number} excludeUserId - User ID to exclude from check
   * @returns {boolean} True if email exists
   */
  async emailExists(email, excludeUserId = null) {
    let sql = 'SELECT COUNT(*) FROM users WHERE email = $1';
    const params = [email.toLowerCase().trim()];

    if (excludeUserId) {
      sql += ' AND id != $2';
      params.push(excludeUserId);
    }

    const result = await this.raw(sql, params);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Deactivate user account
   * @param {number} userId - User ID
   * @returns {Object|null} Updated user
   */
  async deactivate(userId) {
    return await this.update(userId, { is_active: false });
  }

  /**
   * Activate user account
   * @param {number} userId - User ID
   * @returns {Object|null} Updated user
   */
  async activate(userId) {
    return await this.update(userId, { is_active: true });
  }
}

module.exports = new User();