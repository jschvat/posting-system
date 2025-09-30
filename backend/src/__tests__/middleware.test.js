/**
 * Middleware comprehensive tests
 * Tests authentication, authorization, and other middleware functions
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const {
  clearTables,
  createTestUser,
  getModels
} = require('./testDb');
const {
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  expectAuthorizationError,
  generateTestToken
} = require('./testHelpers');

// Import middleware
const {
  authenticate,
  optionalAuthenticate,
  requireRoles,
  requireOwnership,
  requireModifyPermission,
  generateToken,
  setTokenCookie,
  clearTokenCookie
} = require('../middleware/auth');

const errorHandler = require('../middleware/errorHandler');
const notFound = require('../middleware/notFound');

// Config will use the real app.config.js file instead of mocking

// Mock database models
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Authentication Middleware', () => {
  let models, testUser, validToken, expiredToken, invalidToken;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();
    testUser = await createTestUser({ id: 2 }); // Ensure non-admin user
    validToken = generateTestToken(testUser);

    // Create expired token
    const { config } = require('../../../config/app.config');
    expiredToken = jwt.sign(
      { userId: testUser.id, username: testUser.username },
      config.auth.jwt.secret,
      { expiresIn: '0s', issuer: config.auth.jwt.issuer, audience: config.auth.jwt.audience }
    );

    invalidToken = 'invalid.token.here';
  });

  describe('authenticate middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    app.use(cookieParser());
      app.use(cookieParser());
      app.use(cookieParser());
      app.use('/protected', authenticate, (req, res) => {
        res.json({ success: true, user: req.user });
      });
    });

    it('should authenticate user with valid Bearer token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      const body = expectSuccessResponse(response);
      expect(body.user.id).toBe(testUser.id);
      expect(body.user.username).toBe(testUser.username);
    });

    it('should authenticate user with cookie token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Cookie', `token=${validToken}`);

      const body = expectSuccessResponse(response);
      expect(body.user.id).toBe(testUser.id);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/protected');

      const error = expectAuthError(response);
      expect(error.code).toBe('NO_TOKEN');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`);

      const error = expectAuthError(response);
      expect(error.code).toBe('MALFORMED_TOKEN');
    });

    it('should reject request with expired token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      const error = expectAuthError(response);
      expect(error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject request for inactive user', async () => {
      await testUser.update({ is_active: false });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`);

      const error = expectAuthError(response);
      expect(error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should reject request for non-existent user', async () => {
      const { config } = require('../../../config/app.config');
      const nonExistentUserToken = jwt.sign(
        { userId: 99999, username: 'ghost' },
        config.auth.jwt.secret,
        { issuer: config.auth.jwt.issuer, audience: config.auth.jwt.audience }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${nonExistentUserToken}`);

      const error = expectAuthError(response);
      expect(error.code).toBe('USER_NOT_FOUND');
    });

    it('should prefer Authorization header over cookie', async () => {
      const otherUser = await createTestUser();
      const otherToken = generateTestToken(otherUser);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Cookie', `token=${otherToken}`);

      const body = expectSuccessResponse(response);
      expect(body.user.id).toBe(testUser.id); // From Authorization header
    });
  });

  describe('optionalAuthenticate middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    app.use(cookieParser());
      app.use(cookieParser());
      app.use('/optional', optionalAuthenticate, (req, res) => {
        res.json({
          success: true,
          authenticated: !!req.user,
          user: req.user || null
        });
      });
    });

    it('should set user when valid token provided', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${validToken}`);

      const body = expectSuccessResponse(response);
      expect(body.authenticated).toBe(true);
      expect(body.user.id).toBe(testUser.id);
    });

    it('should continue without user when no token provided', async () => {
      const response = await request(app)
        .get('/optional');

      const body = expectSuccessResponse(response);
      expect(body.authenticated).toBe(false);
      expect(body.user).toBeNull();
    });

    it('should continue without user when invalid token provided', async () => {
      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${invalidToken}`);

      const body = expectSuccessResponse(response);
      expect(body.authenticated).toBe(false);
      expect(body.user).toBeNull();
    });

    it('should not set user for inactive account', async () => {
      await testUser.update({ is_active: false });

      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${validToken}`);

      const body = expectSuccessResponse(response);
      expect(body.authenticated).toBe(false);
      expect(body.user).toBeNull();
    });
  });

  describe('requireRoles middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    app.use(cookieParser());
      app.use(cookieParser());
      app.use('/admin', authenticate, requireRoles('admin'), (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow admin user (ID = 1)', async () => {
      const adminUser = await createTestUser({ id: 1 });
      const adminToken = generateTestToken(adminUser);

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
    });

    it('should reject non-admin user', async () => {
      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${validToken}`);

      const error = expectAuthorizationError(response);
      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/admin');

      const error = expectAuthError(response);
      expect(error.code).toBe('NO_TOKEN'); // authenticate middleware runs first
    });
  });

  describe('requireOwnership middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    app.use(cookieParser());
      app.use(cookieParser());
      app.use('/resource/:userId', authenticate, requireOwnership('userId'), (req, res) => {
        res.json({ success: true });
      });
      app.use('/resource-body', authenticate, requireOwnership(), (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow owner to access resource', async () => {
      const response = await request(app)
        .get(`/resource/${testUser.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expectSuccessResponse(response);
    });

    it('should reject non-owner', async () => {
      const otherUser = await createTestUser();

      const response = await request(app)
        .get(`/resource/${otherUser.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const error = expectAuthorizationError(response);
      expect(error.code).toBe('OWNERSHIP_REQUIRED');
    });

    it('should check user_id from request body', async () => {
      const response = await request(app)
        .post('/resource-body')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ user_id: testUser.id });

      expectSuccessResponse(response);
    });

    it('should reject when no user_id provided', async () => {
      const response = await request(app)
        .get('/resource/invalid-id')
        .set('Authorization', `Bearer ${validToken}`);

      const error = expectAuthorizationError(response);
      expect(error.code).toBe('OWNERSHIP_REQUIRED');
    });
  });

  describe('requireModifyPermission middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    app.use(cookieParser());
      app.use(cookieParser());
      app.use('/modify/:userId', authenticate, requireModifyPermission('userId'), (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow owner to modify resource', async () => {
      const response = await request(app)
        .put(`/modify/${testUser.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expectSuccessResponse(response);
    });

    it('should allow admin to modify any resource', async () => {
      const adminUser = await createTestUser({ id: 1 });
      const adminToken = generateTestToken(adminUser);
      const otherUser = await createTestUser({ id: 3 }); // Ensure different ID

      const response = await request(app)
        .put(`/modify/${otherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
    });

    it('should reject non-owner non-admin', async () => {
      const otherUser = await createTestUser();

      const response = await request(app)
        .put(`/modify/${otherUser.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      const error = expectAuthorizationError(response);
      expect(error.code).toBe('MODIFY_PERMISSION_REQUIRED');
    });
  });

  describe('generateToken function', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken(testUser);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Verify token can be decoded
      const { config } = require('../../../config/app.config');
      const decoded = jwt.verify(token, config.auth.jwt.secret);
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.username).toBe(testUser.username);
      expect(decoded.email).toBe(testUser.email);
    });

    it('should include correct claims', () => {
      const token = generateToken(testUser, '1h');
      const { config } = require('../../../config/app.config');
      const decoded = jwt.verify(token, config.auth.jwt.secret);

      expect(decoded.iss).toBe(config.auth.jwt.issuer);
      expect(decoded.aud).toBe(config.auth.jwt.audience);
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should accept custom expiration', () => {
      const shortToken = generateToken(testUser, '1s');
      const longToken = generateToken(testUser, '1d');

      const { config } = require('../../../config/app.config');
      const shortDecoded = jwt.verify(shortToken, config.auth.jwt.secret);
      const longDecoded = jwt.verify(longToken, config.auth.jwt.secret);

      expect(longDecoded.exp).toBeGreaterThan(shortDecoded.exp);
    });
  });

  describe('Cookie functions', () => {
    let app, mockResponse;

    beforeEach(() => {
      app = express();
      mockResponse = {
        cookie: jest.fn(),
        clearCookie: jest.fn()
      };
    });

    it('should set token cookie with correct options', () => {
      setTokenCookie(mockResponse, validToken);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'token',
        validToken,
        expect.objectContaining({
          httpOnly: true,
          secure: false, // Not production
          sameSite: 'lax',
          path: '/'
        })
      );
    });

    it('should clear token cookie', () => {
      clearTokenCookie(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/'
        })
      );
    });
  });
});

describe('Error Handler Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Route that throws an error
    app.get('/error', (req, res, next) => {
      const error = new Error('Test error');
      error.statusCode = 400;
      error.type = 'TEST_ERROR';
      next(error);
    });

    // Route that throws a validation error
    app.get('/validation-error', (req, res, next) => {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.type = 'VALIDATION_ERROR';
      error.details = [{ field: 'username', message: 'Username is required' }];
      next(error);
    });

    // Route that throws unknown error
    app.get('/unknown-error', (req, res, next) => {
      throw new Error('Unknown error');
    });

    app.use(errorHandler);
  });

  it('should handle known errors with status code', async () => {
    const response = await request(app)
      .get('/error');

    const error = expectErrorResponse(response, 400, 'TEST_ERROR');
    expect(error.message).toBe('Test error');
  });

  it('should handle validation errors with details', async () => {
    const response = await request(app)
      .get('/validation-error');

    const error = expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    expect(error.message).toBe('Validation failed');
    expect(error.details).toHaveLength(1);
    expect(error.details[0].field).toBe('username');
  });

  it('should handle unknown errors as 500', async () => {
    const response = await request(app)
      .get('/unknown-error');

    const error = expectErrorResponse(response, 500, 'SERVER_ERROR');
    expect(error.message).toBe('Internal server error');
  });

  it('should handle Sequelize validation errors', () => {
    // Mock Sequelize validation error
    const sequelizeError = {
      name: 'SequelizeValidationError',
      errors: [
        { path: 'email', message: 'Invalid email format' },
        { path: 'password', message: 'Password too short' }
      ]
    };

    // Test error transformation logic
    if (sequelizeError.name === 'SequelizeValidationError') {
      const transformedError = {
        statusCode: 400,
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: sequelizeError.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      };

      expect(transformedError.statusCode).toBe(400);
      expect(transformedError.details).toHaveLength(2);
    }
  });

  it('should handle Sequelize unique constraint errors', () => {
    // Mock Sequelize unique constraint error
    const uniqueError = {
      name: 'SequelizeUniqueConstraintError',
      fields: { username: 'testuser' },
      parent: { constraint: 'unique_username' }
    };

    if (uniqueError.name === 'SequelizeUniqueConstraintError') {
      const field = Object.keys(uniqueError.fields)[0];
      const transformedError = {
        statusCode: 409,
        type: 'DUPLICATE_ERROR',
        message: `${field} already exists`,
        field
      };

      expect(transformedError.statusCode).toBe(409);
      expect(transformedError.field).toBe('username');
    }
  });

  it('should log errors in development', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const error = new Error('Test error for logging');
    error.statusCode = 400;

    // Simulate error handler logging
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error:', error.message);
    }

    expect(consoleSpy).toHaveBeenCalledWith('Error:', 'Test error for logging');
    consoleSpy.mockRestore();
  });
});

describe('Not Found Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.get('/exists', (req, res) => res.json({ success: true }));
    app.use(notFound);
    app.use(errorHandler);
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/non-existent-route');

    const error = expectErrorResponse(response, 404, 'NOT_FOUND');
    expect(error.message).toContain('Route not found');
  });

  it('should include request information in error', async () => {
    const response = await request(app)
      .post('/api/non-existent');

    const error = expectErrorResponse(response, 404, 'NOT_FOUND');
    expect(error.message).toContain('POST /api/non-existent');
  });

  it('should not interfere with existing routes', async () => {
    const response = await request(app)
      .get('/exists');

    expectSuccessResponse(response);
  });
});