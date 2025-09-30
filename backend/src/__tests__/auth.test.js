/**
 * Authentication routes comprehensive tests
 * Tests all auth endpoints with various scenarios
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const {
  clearTables,
  createTestUser,
  getModels,
  query
} = require('./testDb');
const {
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectAuthError,
  expectUserStructure,
  createTestPayload,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const authRoutes = require('../routes/auth');

// Create test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

// No mocking needed - auth route will directly use test models in test environment

// Use real config - no mocking needed

describe('Authentication Routes', () => {
  let models;

  beforeAll(() => {
    models = getModels();
  });

  beforeEach(async () => {
    await clearTables();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = createTestPayload();

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const body = expectSuccessResponse(response, 201);
      expect(body.message).toBe('User registered successfully');
      expect(body.data).toHaveProperty('user');
      expect(body.data).toHaveProperty('token');

      const user = expectUserStructure(body.data.user);
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.first_name).toBe(userData.first_name);
      expect(user.last_name).toBe(userData.last_name);
      expect(user.is_active).toBe(true);

      // Check JWT token is valid
      expect(typeof body.data.token).toBe('string');
      expect(body.data.token.length).toBeGreaterThan(0);

      // Verify user was created in database
      const result = await query('SELECT * FROM users WHERE email = $1', [userData.email.toLowerCase()]);
      expect(result.rows.length).toBe(1);
      const dbUser = result.rows[0];
      expect(dbUser.username).toBe(userData.username);
    });

    it('should reject registration with invalid email', async () => {
      const userData = createTestPayload({ email: 'invalid-email' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response);
    });

    it('should reject registration with weak password', async () => {
      const userData = createTestPayload({ password: 'weak' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response);
    });

    it('should reject registration with short username', async () => {
      const userData = createTestPayload({ username: 'ab' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response);
    });

    it('should reject registration with non-alphanumeric username', async () => {
      const userData = createTestPayload({ username: 'user@name' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response);
    });

    it('should reject registration with duplicate username', async () => {
      const userData = createTestPayload();

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to create second user with same username
      const duplicateData = createTestPayload({
        username: userData.username,
        email: 'different@example.com'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData);

      const error = expectErrorResponse(response, 400, 'DUPLICATE_ERROR');
      expect(error.message).toContain('username');
      expect(error.field).toBe('username');
    });

    it('should reject registration with duplicate email', async () => {
      const userData = createTestPayload();

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to create second user with same email
      const duplicateData = createTestPayload({
        username: 'differentuser',
        email: userData.email
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData);

      const error = expectErrorResponse(response, 400, 'DUPLICATE_ERROR');
      expect(error.message).toContain('email');
      expect(error.field).toBe('email');
    });

    it('should normalize email to lowercase', async () => {
      const userData = createTestPayload({ email: 'TEST@EXAMPLE.COM' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const body = expectSuccessResponse(response, 201);
      expect(body.data.user.email).toBe('test@example.com');
    });

    it('should trim whitespace from string fields', async () => {
      const userData = createTestPayload({
        username: '  testuser  ',
        first_name: '  Test  ',
        last_name: '  User  '
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const body = expectSuccessResponse(response, 201);
      expect(body.data.user.username).toBe('testuser');
      expect(body.data.user.first_name).toBe('Test');
      expect(body.data.user.last_name).toBe('User');
    });

    it('should validate bio length if provided', async () => {
      const longBio = 'a'.repeat(501);
      const userData = createTestPayload({ bio: longBio });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response);
    });

    it('should accept valid avatar URL', async () => {
      const userData = createTestPayload({ avatar_url: 'https://example.com/avatar.jpg' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const body = expectSuccessResponse(response, 201);
      expect(body.data.user.avatar_url).toBe(userData.avatar_url);
    });

    it('should reject invalid avatar URL', async () => {
      const userData = createTestPayload({ avatar_url: 'not-a-valid-url' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should login with valid username and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: 'TestPassword123!'
        });

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Login successful');
      expect(body.data).toHaveProperty('user');
      expect(body.data).toHaveProperty('token');
      expect(body.data).toHaveProperty('expires_in');

      const user = expectUserStructure(body.data.user);
      expect(user.id).toBe(testUser.id);
      expect(user.username).toBe(testUser.username);

      // Check that last_login was updated
      const updatedUser = await models.User.findByPk(testUser.id);
      expect(updatedUser.last_login).not.toBeNull();
    });

    it('should login with valid email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email,
          password: 'TestPassword123!'
        });

      const body = expectSuccessResponse(response);
      expect(body.data.user.id).toBe(testUser.id);
    });

    it('should reject login with invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistentuser',
          password: 'TestPassword123!'
        });

      const error = expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
      expect(error.message).toContain('Invalid username/email or password');
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: 'WrongPassword123!'
        });

      const error = expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
      expect(error.message).toContain('Invalid username/email or password');
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for inactive account', async () => {
      // Deactivate user
      await testUser.update({ is_active: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: 'TestPassword123!'
        });

      const error = expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
      expect(error.message).toContain('Account is deactivated');
      expect(error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should handle remember_me option', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: 'TestPassword123!',
          remember_me: true
        });

      const body = expectSuccessResponse(response);
      expect(body.data.expires_in).toBe('30d');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'TestPassword123!'
        });

      expectValidationError(response);
    });

    it('should normalize email case in identifier', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email.toUpperCase(),
          password: 'TestPassword123!'
        });

      const body = expectSuccessResponse(response);
      expect(body.data.user.id).toBe(testUser.id);
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser();
      token = generateTestToken(testUser);
    });

    it('should logout authenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', authHeader(token));

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Logout successful');
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expectAuthError(response);
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expectAuthError(response);
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser();
      token = generateTestToken(testUser);
    });

    it('should return user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', authHeader(token));

      const body = expectSuccessResponse(response);
      const user = expectUserStructure(body.data);
      expect(user.id).toBe(testUser.id);
      expect(user.username).toBe(testUser.username);
      expect(user.email).toBe(testUser.email);
    });

    it('should reject request when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expectAuthError(response);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expectAuthError(response);
    });

    it('should reject request with expired token', async () => {
      // This would require mocking JWT verification to simulate expired token
      // For now, we'll test with malformed token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer expired.token.here');

      expectAuthError(response);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser();
      token = generateTestToken(testUser);
    });

    it('should refresh token for authenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', authHeader(token));

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Token refreshed successfully');
      expect(body.data).toHaveProperty('token');
      expect(body.data).toHaveProperty('user');

      // New token should be different from old token
      expect(body.data.token).not.toBe(token);

      const user = expectUserStructure(body.data.user);
      expect(user.id).toBe(testUser.id);
    });

    it('should reject refresh without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expectAuthError(response);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should handle forgot password request for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: testUser.email
        });

      const body = expectSuccessResponse(response);
      expect(body.message).toContain('If the email exists in our system');

      // In development mode, should return reset token
      expect(body).toHaveProperty('reset_token');

      // Check that reset token was saved in database
      const updatedUser = await models.User.findByPk(testUser.id);
      expect(updatedUser.password_reset_token).not.toBeNull();
      expect(updatedUser.password_reset_expires).not.toBeNull();
    });

    it('should handle forgot password request for non-existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      // Should still return success to prevent email enumeration
      const body = expectSuccessResponse(response);
      expect(body.message).toContain('If the email exists in our system');
      expect(body).not.toHaveProperty('reset_token');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'invalid-email'
        });

      expectValidationError(response);
    });

    it('should require email field', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expectValidationError(response);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let testUser, resetToken;

    beforeEach(async () => {
      testUser = await createTestUser();
      resetToken = await testUser.generatePasswordResetToken();
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        });

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Password reset successfully');

      // Verify user can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: newPassword
        });

      expectSuccessResponse(loginResponse);

      // Verify old password no longer works
      const oldLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: 'TestPassword123!'
        });

      expectErrorResponse(oldLoginResponse, 401);

      // Verify reset token was cleared
      const updatedUser = await models.User.findByPk(testUser.id);
      expect(updatedUser.password_reset_token).toBeNull();
      expect(updatedUser.password_reset_expires).toBeNull();
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!'
        });

      const error = expectErrorResponse(response, 400, 'VALIDATION_ERROR');
      expect(error.message).toContain('Invalid or expired reset token');
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired reset token', async () => {
      // Manually expire the token
      await testUser.update({
        password_reset_expires: new Date(Date.now() - 3600000) // 1 hour ago
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!'
        });

      const error = expectErrorResponse(response, 400, 'VALIDATION_ERROR');
      expect(error.message).toContain('Invalid or expired reset token');
    });

    it('should validate new password strength', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'weak'
        });

      expectValidationError(response);
    });

    it('should require both token and password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken
        });

      expectValidationError(response);
    });
  });

  describe('POST /api/auth/change-password', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser();
      token = generateTestToken(testUser);
    });

    it('should change password for authenticated user', async () => {
      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', authHeader(token))
        .send({
          current_password: 'TestPassword123!',
          new_password: newPassword
        });

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Password changed successfully');

      // Verify user can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.username,
          password: newPassword
        });

      expectSuccessResponse(loginResponse);
    });

    it('should reject change with wrong current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', authHeader(token))
        .send({
          current_password: 'WrongPassword123!',
          new_password: 'NewPassword123!'
        });

      const error = expectErrorResponse(response, 400, 'AUTHENTICATION_ERROR');
      expect(error.message).toContain('Current password is incorrect');
      expect(error.code).toBe('INVALID_PASSWORD');
    });

    it('should reject change without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          current_password: 'TestPassword123!',
          new_password: 'NewPassword123!'
        });

      expectAuthError(response);
    });

    it('should validate new password strength', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', authHeader(token))
        .send({
          current_password: 'TestPassword123!',
          new_password: 'weak'
        });

      expectValidationError(response);
    });

    it('should require both passwords', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', authHeader(token))
        .send({
          current_password: 'TestPassword123!'
        });

      expectValidationError(response);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let testUser, verificationToken;

    beforeEach(async () => {
      testUser = await createTestUser({ email_verified: false });
      verificationToken = await testUser.generateEmailVerificationToken();
    });

    it('should verify email with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: verificationToken
        });

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Email verified successfully');

      // Verify email_verified flag was set to true
      const updatedUser = await models.User.findByPk(testUser.id);
      expect(updatedUser.email_verified).toBe(true);
      expect(updatedUser.email_verification_token).toBeNull();
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'invalid-token'
        });

      const error = expectErrorResponse(response, 400, 'VALIDATION_ERROR');
      expect(error.message).toContain('Invalid verification token');
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('should require verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({});

      expectValidationError(response);
    });
  });
});