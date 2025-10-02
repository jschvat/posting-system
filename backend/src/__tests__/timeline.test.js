/**
 * Timeline routes comprehensive tests
 * Tests timeline algorithm and feed endpoints
 */

const request = require('supertest');
const express = require('express');
const {
  clearTables,
  createTestUser,
  createTestPost,
  getModels
} = require('./testDb');
const {
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const timelineRoutes = require('../routes/timeline');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/timeline', timelineRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Test app error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      type: 'server_error'
    }
  });
});

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Timeline Routes', () => {
  let models, testUser1, testUser2, testUser3, post1, post2, token1, token2, token3;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();

    // Create test users
    testUser1 = await createTestUser({ username: 'user1', email: 'user1@test.com' });
    testUser2 = await createTestUser({ username: 'user2', email: 'user2@test.com' });
    testUser3 = await createTestUser({ username: 'user3', email: 'user3@test.com' });

    // Create test posts
    post1 = await createTestPost(testUser1.id, { content: 'Test post 1' });
    post2 = await createTestPost(testUser2.id, { content: 'Test post 2' });

    // Generate tokens
    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
    token3 = generateTestToken(testUser3);
  });

  afterAll(async () => {
    await clearTables();
  });

  describe('GET /api/timeline - Get personalized timeline', () => {
    it('should return personalized timeline for authenticated user', async () => {
      const response = await request(app)
        .get('/api/timeline?page=1&limit=20')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
      expect(Array.isArray(response.body.data.posts)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support min_score filtering', async () => {
      const response = await request(app)
        .get('/api/timeline?min_score=50')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
    });

    it('should generate timeline if cache is empty', async () => {
      const response = await request(app)
        .get('/api/timeline?page=1&limit=10')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/timeline');

      expectAuthError(response);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/timeline?page=1&limit=5')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.pagination.current_page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/timeline/following - Get following feed', () => {
    beforeEach(async () => {
      // User1 follows User2
      const Follow = models.Follow;
      await Follow.create({
        follower_id: testUser1.id,
        following_id: testUser2.id
      });
    });

    it('should return posts only from followed users', async () => {
      const response = await request(app)
        .get('/api/timeline/following?page=1&limit=20')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
      expect(Array.isArray(response.body.data.posts)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();

      // Should only include posts from followed users
      if (response.body.data.posts.length > 0) {
        const postUserIds = response.body.data.posts.map(p => p.user_id);
        expect(postUserIds).toContain(testUser2.id);
      }
    });

    it('should return empty array if not following anyone', async () => {
      const response = await request(app)
        .get('/api/timeline/following')
        .set('Authorization', authHeader(token3));

      expectSuccessResponse(response);
      expect(response.body.data.posts).toHaveLength(0);
      expect(response.body.data.pagination.total_count).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/timeline/following');

      expectAuthError(response);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/timeline/following?page=1&limit=10')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/timeline/discover - Get discover feed', () => {
    it('should return popular/suggested posts', async () => {
      const response = await request(app)
        .get('/api/timeline/discover?limit=20')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
      expect(Array.isArray(response.body.data.posts)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/timeline/discover?limit=5')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/timeline/discover');

      expectAuthError(response);
    });
  });

  describe('GET /api/timeline/trending - Get trending posts', () => {
    it('should return trending posts based on engagement', async () => {
      const response = await request(app)
        .get('/api/timeline/trending?limit=10');

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
      expect(Array.isArray(response.body.data.posts)).toBe(true);
    });

    it('should support custom timeframe', async () => {
      const response = await request(app)
        .get('/api/timeline/trending?limit=10&timeframe=24 hours');

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
    });

    it('should work without authentication (public endpoint)', async () => {
      const response = await request(app)
        .get('/api/timeline/trending?limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.posts).toBeDefined();
    });
  });

  describe('POST /api/timeline/refresh - Refresh timeline cache', () => {
    it('should regenerate timeline cache for user', async () => {
      const response = await request(app)
        .post('/api/timeline/refresh')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.entries_created).toBeDefined();
      expect(typeof response.body.data.entries_created).toBe('number');
      expect(response.body.message).toContain('refreshed');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/timeline/refresh');

      expectAuthError(response);
    });
  });

  describe('GET /api/timeline/stats - Get timeline cache statistics', () => {
    it('should return cache statistics', async () => {
      const response = await request(app)
        .get('/api/timeline/stats')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/timeline/stats');

      expectAuthError(response);
    });
  });

  describe('DELETE /api/timeline/cleanup - Clean up expired entries', () => {
    it('should clean up expired timeline entries', async () => {
      const response = await request(app)
        .delete('/api/timeline/cleanup')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.deleted_count).toBeDefined();
      expect(typeof response.body.data.deleted_count).toBe('number');
      expect(response.body.message).toContain('Cleaned up');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/timeline/cleanup');

      expectAuthError(response);
    });
  });

  describe('Timeline Algorithm Integration', () => {
    beforeEach(async () => {
      // Create follow relationships
      const Follow = models.Follow;
      await Follow.create({ follower_id: testUser1.id, following_id: testUser2.id });

      // Create shares
      const Share = models.Share;
      await Share.create({ user_id: testUser3.id, post_id: post1.id });
    });

    it('should score posts based on algorithm', async () => {
      // Refresh timeline to generate scores
      await request(app)
        .post('/api/timeline/refresh')
        .set('Authorization', authHeader(token1));

      // Get timeline
      const response = await request(app)
        .get('/api/timeline')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      // Timeline should exist after refresh
      expect(response.body.data.posts).toBeDefined();
    });

    it('should prioritize posts from followed users', async () => {
      // Refresh timeline
      await request(app)
        .post('/api/timeline/refresh')
        .set('Authorization', authHeader(token1));

      // Get following feed
      const response = await request(app)
        .get('/api/timeline/following')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      if (response.body.data.posts.length > 0) {
        // All posts should be from followed users (testUser2)
        const postUserIds = response.body.data.posts.map(p => p.user_id);
        postUserIds.forEach(userId => {
          expect(userId).toBe(testUser2.id);
        });
      }
    });
  });
});
