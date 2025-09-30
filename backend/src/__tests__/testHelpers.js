/**
 * Test helper functions
 * Provides utilities for testing API endpoints
 */

const jwt = require('jsonwebtoken');
const { config } = require('../../../config/app.config');

/**
 * Generate JWT token for testing
 */
function generateTestToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email
  };

  return jwt.sign(payload, config.auth.jwt.secret, {
    expiresIn: '1h',
    issuer: config.auth.jwt.issuer,
    audience: config.auth.jwt.audience
  });
}

/**
 * Create authorization header
 */
function authHeader(token) {
  return `Bearer ${token}`;
}

/**
 * Mock file for upload tests
 */
function createMockFile(filename = 'test.jpg', mimetype = 'image/jpeg', size = 1024) {
  return {
    fieldname: 'files',
    originalname: filename,
    encoding: '7bit',
    mimetype: mimetype,
    destination: '/tmp/uploads',
    filename: 'mock-' + filename,
    path: '/tmp/uploads/mock-' + filename,
    size: size,
    buffer: Buffer.from('fake file content')
  };
}

/**
 * Expect standard success response format
 */
function expectSuccessResponse(response, statusCode = 200) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', true);
  return response.body;
}

/**
 * Expect standard error response format
 */
function expectErrorResponse(response, statusCode, errorType = null) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toHaveProperty('message');
  expect(response.body.error).toHaveProperty('type');

  if (errorType) {
    expect(response.body.error.type).toBe(errorType);
  }

  return response.body.error;
}

/**
 * Expect validation error response
 */
function expectValidationError(response) {
  const error = expectErrorResponse(response, 400, 'VALIDATION_ERROR');
  expect(error).toHaveProperty('details');
  expect(Array.isArray(error.details)).toBe(true);
  return error;
}

/**
 * Expect authentication error
 */
function expectAuthError(response) {
  return expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
}

/**
 * Expect authorization error
 */
function expectAuthorizationError(response) {
  return expectErrorResponse(response, 403, 'AUTHORIZATION_ERROR');
}

/**
 * Expect not found error
 */
function expectNotFoundError(response) {
  return expectErrorResponse(response, 404, 'NOT_FOUND');
}

/**
 * Expect paginated response format
 */
function expectPaginatedResponse(response, statusCode = 200) {
  const body = expectSuccessResponse(response, statusCode);
  expect(body).toHaveProperty('data');
  expect(body.data).toHaveProperty('pagination');

  const pagination = body.data.pagination;
  expect(pagination).toHaveProperty('current_page');
  expect(pagination).toHaveProperty('total_pages');
  expect(pagination).toHaveProperty('total_count');
  expect(pagination).toHaveProperty('limit');
  expect(pagination).toHaveProperty('has_next_page');
  expect(pagination).toHaveProperty('has_prev_page');

  return body.data;
}

/**
 * Wait for async operations
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create test data payload
 */
function createTestPayload(overrides = {}) {
  const defaults = {
    username: 'testuser' + Math.random().toString(36).substr(2, 5),
    email: `test${Math.random().toString(36).substr(2, 5)}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User'
  };

  return { ...defaults, ...overrides };
}

/**
 * Validate user object structure
 */
function expectUserStructure(user) {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('first_name');
  expect(user).toHaveProperty('last_name');
  expect(user).toHaveProperty('is_active');
  expect(user).toHaveProperty('email_verified');
  expect(user).toHaveProperty('created_at');
  expect(user).toHaveProperty('updated_at');

  // Should not contain sensitive fields
  expect(user).not.toHaveProperty('password_hash');
  expect(user).not.toHaveProperty('password_reset_token');
  expect(user).not.toHaveProperty('email_verification_token');

  return user;
}

/**
 * Validate post object structure
 */
function expectPostStructure(post) {
  expect(post).toHaveProperty('id');
  expect(post).toHaveProperty('user_id');
  expect(post).toHaveProperty('content');
  expect(post).toHaveProperty('privacy_level');
  expect(post).toHaveProperty('is_published');
  expect(post).toHaveProperty('views_count');
  expect(post).toHaveProperty('created_at');
  expect(post).toHaveProperty('updated_at');

  return post;
}

/**
 * Validate comment object structure
 */
function expectCommentStructure(comment) {
  expect(comment).toHaveProperty('id');
  expect(comment).toHaveProperty('user_id');
  expect(comment).toHaveProperty('post_id');
  expect(comment).toHaveProperty('content');
  expect(comment).toHaveProperty('is_published');
  expect(comment).toHaveProperty('depth');
  expect(comment).toHaveProperty('created_at');
  expect(comment).toHaveProperty('updated_at');

  return comment;
}

/**
 * Validate media object structure
 */
function expectMediaStructure(media) {
  expect(media).toHaveProperty('id');
  expect(media).toHaveProperty('user_id');
  expect(media).toHaveProperty('filename');
  expect(media).toHaveProperty('file_path');
  expect(media).toHaveProperty('file_url');
  expect(media).toHaveProperty('mime_type');
  expect(media).toHaveProperty('file_size');
  expect(media).toHaveProperty('media_type');
  expect(media).toHaveProperty('is_processed');
  expect(media).toHaveProperty('created_at');
  expect(media).toHaveProperty('updated_at');

  return media;
}

/**
 * Validate reaction object structure
 */
function expectReactionStructure(reaction) {
  expect(reaction).toHaveProperty('id');
  expect(reaction).toHaveProperty('user_id');
  expect(reaction).toHaveProperty('emoji_name');
  expect(reaction).toHaveProperty('emoji_unicode');
  expect(reaction).toHaveProperty('created_at');
  expect(reaction).toHaveProperty('updated_at');

  return reaction;
}

module.exports = {
  generateTestToken,
  authHeader,
  createMockFile,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectAuthError,
  expectAuthorizationError,
  expectNotFoundError,
  expectPaginatedResponse,
  sleep,
  createTestPayload,
  expectUserStructure,
  expectPostStructure,
  expectCommentStructure,
  expectMediaStructure,
  expectReactionStructure
};