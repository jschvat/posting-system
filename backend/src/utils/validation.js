/**
 * Common validation utilities
 * Provides helper functions for data validation and sanitization
 */

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validatePassword(password) {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password should contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateUsername(username) {
  const errors = [];

  if (!username) {
    errors.push('Username is required');
    return { isValid: false, errors };
  }

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 50) {
    errors.push('Username cannot exceed 50 characters');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  if (/^[0-9_]/.test(username)) {
    errors.push('Username cannot start with a number or underscore');
  }

  // Reserved usernames
  const reserved = ['admin', 'root', 'user', 'test', 'api', 'www', 'mail', 'support', 'help', 'about', 'contact'];
  if (reserved.includes(username.toLowerCase())) {
    errors.push('This username is reserved and cannot be used');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateEmail(email) {
  const errors = [];

  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }

  if (email.length > 255) {
    errors.push('Email address cannot exceed 255 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize HTML content to prevent XSS
 * @param {string} content - Content to sanitize
 * @returns {string} Sanitized content
 */
function sanitizeContent(content) {
  if (!content) return '';

  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate file type against allowed types
 * @param {string} mimetype - File MIME type
 * @param {Array<string>} allowedTypes - Array of allowed MIME types
 * @returns {boolean} Whether file type is allowed
 */
function isAllowedFileType(mimetype, allowedTypes) {
  return allowedTypes.includes(mimetype);
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} Whether file size is within limit
 */
function isValidFileSize(size, maxSize) {
  return size <= maxSize;
}

/**
 * Generate a secure random token
 * @param {number} length - Length of token (default: 32)
 * @returns {string} Random hex token
 */
function generateSecureToken(length = 32) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {number} maxLimit - Maximum allowed limit
 * @returns {Object} Validated pagination parameters
 */
function validatePagination(page = 1, limit = 20, maxLimit = 100) {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));

  return {
    page: validPage,
    limit: validLimit,
    offset: (validPage - 1) * validLimit
  };
}

/**
 * Clean and normalize text content
 * @param {string} text - Text to clean
 * @param {number} maxLength - Maximum length (optional)
 * @returns {string} Cleaned text
 */
function cleanText(text, maxLength = null) {
  if (!text) return '';

  let cleaned = text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\r\n|\r|\n/g, '\n'); // Normalize line breaks

  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength).trim();
  }

  return cleaned;
}

/**
 * Check if a string is a valid JSON
 * @param {string} str - String to check
 * @returns {boolean} Whether string is valid JSON
 */
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  validatePassword,
  validateUsername,
  validateEmail,
  sanitizeContent,
  isAllowedFileType,
  isValidFileSize,
  generateSecureToken,
  validatePagination,
  cleanText,
  isValidJSON
};