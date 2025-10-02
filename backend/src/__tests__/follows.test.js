/**
 * Follows routes comprehensive tests
 * Tests all follow/unfollow endpoints and follow system functionality
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
const followsRoutes = require('../routes/follows');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/follows', followsRoutes);

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Follows Routes', () => {
  let models, testUser1, testUser2, testUser3, token1, token2, token3;

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

    // Generate tokens
    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
    token3 = generateTestToken(testUser3);
  });

  afterAll(async () => {
    await clearTables();
  });

  describe('POST /api/follows/:userId - Follow user', () => {
    it('should allow authenticated user to follow another user', async () => {
      const response = await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.follow).toBeDefined();
      expect(response.body.data.follow.follower_id).toBe(testUser1.id);
      expect(response.body.data.follow.following_id).toBe(testUser2.id);
      expect(response.body.data.follow.status).toBe('active');
    });

    it('should not allow user to follow themselves', async () => {
      const response = await request(app)
        .post(`/api/follows/${testUser1.id}`)
        .set('Authorization', authHeader(token1));

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('cannot follow yourself');
    });

    it('should not allow following the same user twice', async () => {
      // First follow
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      // Try to follow again
      const response = await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('already following');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/follows/${testUser2.id}`);

      expectAuthError(response);
    });

    it('should update follower/following counts', async () => {
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      // Check stats
      const statsResponse = await request(app)
        .get(`/api/follows/stats/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expect(statsResponse.body.data.counts.follower_count).toBe(1);

      const user1Stats = await request(app)
        .get(`/api/follows/stats/${testUser1.id}`)
        .set('Authorization', authHeader(token1));

      expect(user1Stats.body.data.counts.following_count).toBe(1);
    });
  });

  describe('DELETE /api/follows/:userId - Unfollow user', () => {
    beforeEach(async () => {
      // Create a follow relationship
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));
    });

    it('should allow unfollowing a user', async () => {
      const response = await request(app)
        .delete(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.message).toContain('Unfollowed successfully');
    });

    it('should update follower/following counts after unfollow', async () => {
      await request(app)
        .delete(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      const statsResponse = await request(app)
        .get(`/api/follows/stats/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expect(statsResponse.body.data.counts.follower_count).toBe(0);
    });

    it('should not allow unfollowing a user not being followed', async () => {
      const response = await request(app)
        .delete(`/api/follows/${testUser3.id}`)
        .set('Authorization', authHeader(token1));

      expectErrorResponse(response, 404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/follows/${testUser2.id}`);

      expectAuthError(response);
    });
  });

  describe('GET /api/follows/followers/:userId - Get followers', () => {
    beforeEach(async () => {
      // User2 and User3 follow User1
      await request(app)
        .post(`/api/follows/${testUser1.id}`)
        .set('Authorization', authHeader(token2));

      await request(app)
        .post(`/api/follows/${testUser1.id}`)
        .set('Authorization', authHeader(token3));
    });

    it('should return list of followers', async () => {
      const response = await request(app)
        .get(`/api/follows/followers/${testUser1.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.followers).toHaveLength(2);
      expect(response.body.data.total_count).toBe(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/follows/followers/${testUser1.id}?page=1&limit=1`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.followers).toHaveLength(1);
      expect(response.body.data.pagination.has_next_page).toBe(true);
    });

    it('should work without authentication for public profiles', async () => {
      const response = await request(app)
        .get(`/api/follows/followers/${testUser1.id}`);

      expectSuccessResponse(response);
      expect(response.body.data.followers).toBeDefined();
    });
  });

  describe('GET /api/follows/following/:userId - Get following', () => {
    beforeEach(async () => {
      // User1 follows User2 and User3
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      await request(app)
        .post(`/api/follows/${testUser3.id}`)
        .set('Authorization', authHeader(token1));
    });

    it('should return list of users being followed', async () => {
      const response = await request(app)
        .get(`/api/follows/following/${testUser1.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.following).toHaveLength(2);
      expect(response.body.data.total_count).toBe(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/follows/following/${testUser1.id}?page=1&limit=1`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.following).toHaveLength(1);
      expect(response.body.data.pagination.has_next_page).toBe(true);
    });
  });

  describe('GET /api/follows/mutual - Get mutual follows', () => {
    beforeEach(async () => {
      // User1 and User2 follow each other (mutual)
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      await request(app)
        .post(`/api/follows/${testUser1.id}`)
        .set('Authorization', authHeader(token2));

      // User1 follows User3 (not mutual)
      await request(app)
        .post(`/api/follows/${testUser3.id}`)
        .set('Authorization', authHeader(token1));
    });

    it('should return only mutual follows', async () => {
      const response = await request(app)
        .get('/api/follows/mutual')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.mutual_follows).toHaveLength(1);
      expect(response.body.data.mutual_follows[0].id).toBe(testUser2.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/follows/mutual');

      expectAuthError(response);
    });
  });

  describe('GET /api/follows/check/:userId - Check if following', () => {
    it('should return true if following', async () => {
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      const response = await request(app)
        .get(`/api/follows/check/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.is_following).toBe(true);
    });

    it('should return false if not following', async () => {
      const response = await request(app)
        .get(`/api/follows/check/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.is_following).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/follows/check/${testUser2.id}`);

      expectAuthError(response);
    });
  });

  describe('GET /api/follows/suggestions - Get follow suggestions', () => {
    it('should return suggested users to follow', async () => {
      // User1 follows User2
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      const response = await request(app)
        .get('/api/follows/suggestions?limit=5')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.suggestions).toBeDefined();
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get('/api/follows/suggestions?limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.suggestions).toBeDefined();
    });
  });

  describe('PATCH /api/follows/:userId/mute - Mute user', () => {
    beforeEach(async () => {
      // Create follow relationship
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));
    });

    it('should allow muting a followed user', async () => {
      const response = await request(app)
        .patch(`/api/follows/${testUser2.id}/mute`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.message).toContain('muted');
    });

    it('should not affect follower count when muting', async () => {
      await request(app)
        .patch(`/api/follows/${testUser2.id}/mute`)
        .set('Authorization', authHeader(token1));

      const statsResponse = await request(app)
        .get(`/api/follows/stats/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expect(statsResponse.body.data.counts.follower_count).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/follows/${testUser2.id}/mute`);

      expectAuthError(response);
    });
  });

  describe('PATCH /api/follows/:userId/unmute - Unmute user', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      await request(app)
        .patch(`/api/follows/${testUser2.id}/mute`)
        .set('Authorization', authHeader(token1));
    });

    it('should allow unmuting a muted user', async () => {
      const response = await request(app)
        .patch(`/api/follows/${testUser2.id}/unmute`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.message).toContain('unmuted');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/follows/${testUser2.id}/unmute`);

      expectAuthError(response);
    });
  });

  describe('GET /api/follows/stats/:userId - Get follow statistics', () => {
    beforeEach(async () => {
      // Create some follow relationships
      await request(app)
        .post(`/api/follows/${testUser1.id}`)
        .set('Authorization', authHeader(token2));

      await request(app)
        .post(`/api/follows/${testUser2.id}`)
        .set('Authorization', authHeader(token1));
    });

    it('should return follower and following counts', async () => {
      const response = await request(app)
        .get(`/api/follows/stats/${testUser1.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.counts).toBeDefined();
      expect(response.body.data.counts.follower_count).toBe(1);
      expect(response.body.data.counts.following_count).toBe(1);
    });

    it('should include user_stats data', async () => {
      const response = await request(app)
        .get(`/api/follows/stats/${testUser1.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get(`/api/follows/stats/${testUser1.id}`);

      expectSuccessResponse(response);
      expect(response.body.data.counts).toBeDefined();
    });
  });
});
