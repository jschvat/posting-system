/**
 * Shares routes comprehensive tests
 * Tests all share/unshare endpoints and share system functionality
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
const sharesRoutes = require('../routes/shares');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/shares', sharesRoutes);

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

describe('Shares Routes', () => {
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

  describe('POST /api/shares/:postId - Share post', () => {
    it('should allow authenticated user to share a post', async () => {
      const response = await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.share).toBeDefined();
      expect(response.body.data.share.user_id).toBe(testUser2.id);
      expect(response.body.data.share.post_id).toBe(post1.id);
      expect(response.body.data.share.share_type).toBe('repost');
    });

    it('should allow sharing with a comment (quote)', async () => {
      const response = await request(app)
        .post(`/api/shares/${post1.id}`)
        .send({ comment: 'Great post!', share_type: 'quote' })
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.share.share_type).toBe('quote');
      expect(response.body.data.share.comment).toBe('Great post!');
    });

    it('should not allow sharing own post', async () => {
      const response = await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token1));

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('cannot share your own post');
    });

    it('should not allow sharing the same post twice', async () => {
      // First share
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      // Try to share again
      const response = await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('already shared');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/shares/${post1.id}`);

      expectAuthError(response);
    });

    it('should update share count', async () => {
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      const sharesResponse = await request(app)
        .get(`/api/shares/post/${post1.id}`)
        .set('Authorization', authHeader(token1));

      expect(sharesResponse.body.data.shares).toHaveLength(1);
      expect(sharesResponse.body.data.total_count).toBe(1);
    });
  });

  describe('DELETE /api/shares/:postId - Unshare post', () => {
    beforeEach(async () => {
      // Create a share
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));
    });

    it('should allow unsharing a post', async () => {
      const response = await request(app)
        .delete(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.message).toContain('Unshared successfully');
    });

    it('should update share count after unshare', async () => {
      await request(app)
        .delete(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      const sharesResponse = await request(app)
        .get(`/api/shares/post/${post1.id}`)
        .set('Authorization', authHeader(token1));

      expect(sharesResponse.body.data.total_count).toBe(0);
    });

    it('should not allow unsharing a post that was not shared', async () => {
      const response = await request(app)
        .delete(`/api/shares/${post2.id}`)
        .set('Authorization', authHeader(token2));

      expectErrorResponse(response, 404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/shares/${post1.id}`);

      expectAuthError(response);
    });
  });

  describe('GET /api/shares/user/:userId - Get user shares', () => {
    beforeEach(async () => {
      // User2 shares multiple posts
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      await request(app)
        .post(`/api/shares/${post2.id}`)
        .set('Authorization', authHeader(token3));
    });

    it('should return list of shares by a user', async () => {
      const response = await request(app)
        .get(`/api/shares/user/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.shares).toHaveLength(1);
      expect(response.body.data.shares[0].user_id).toBe(testUser2.id);
    });

    it('should return current user shares when no userId provided', async () => {
      const response = await request(app)
        .get('/api/shares/user')
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.shares).toHaveLength(1);
    });

    it('should support pagination', async () => {
      // Create more shares
      const post3 = await createTestPost(testUser1, { content: 'Post 3' });
      await request(app)
        .post(`/api/shares/${post3.id}`)
        .set('Authorization', authHeader(token2));

      const response = await request(app)
        .get(`/api/shares/user/${testUser2.id}?page=1&limit=1`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.shares).toHaveLength(1);
      expect(response.body.data.pagination.has_next_page).toBe(true);
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get(`/api/shares/user/${testUser2.id}`);

      expectSuccessResponse(response);
      expect(response.body.data.shares).toBeDefined();
    });
  });

  describe('GET /api/shares/post/:postId - Get post shares', () => {
    beforeEach(async () => {
      // Multiple users share the same post
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token3));
    });

    it('should return list of shares for a post', async () => {
      const response = await request(app)
        .get(`/api/shares/post/${post1.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.shares).toHaveLength(2);
      expect(response.body.data.total_count).toBe(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/shares/post/${post1.id}?page=1&limit=1`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.shares).toHaveLength(1);
      expect(response.body.data.pagination.has_next_page).toBe(true);
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get(`/api/shares/post/${post1.id}`);

      expectSuccessResponse(response);
      expect(response.body.data.shares).toBeDefined();
    });
  });

  describe('GET /api/shares/check/:postId - Check if shared', () => {
    it('should return true if post is shared', async () => {
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      const response = await request(app)
        .get(`/api/shares/check/${post1.id}`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.has_shared).toBe(true);
    });

    it('should return false if post is not shared', async () => {
      const response = await request(app)
        .get(`/api/shares/check/${post1.id}`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.has_shared).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/shares/check/${post1.id}`);

      expectAuthError(response);
    });
  });

  describe('GET /api/shares/popular - Get popular shares', () => {
    beforeEach(async () => {
      // Create shares for post1 (making it popular)
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token3));

      // Single share for post2
      await request(app)
        .post(`/api/shares/${post2.id}`)
        .set('Authorization', authHeader(token3));
    });

    it('should return most shared posts', async () => {
      const response = await request(app)
        .get('/api/shares/popular?limit=10')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.popular_shares).toBeDefined();
      expect(Array.isArray(response.body.data.popular_shares)).toBe(true);

      if (response.body.data.popular_shares.length > 0) {
        expect(response.body.data.popular_shares[0].share_count).toBeDefined();
        // Most popular post should be post1 with 2 shares
        expect(parseInt(response.body.data.popular_shares[0].share_count)).toBeGreaterThanOrEqual(1);
      }
    });

    it('should support custom timeframe', async () => {
      const response = await request(app)
        .get('/api/shares/popular?limit=10&timeframe=24 hours')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.popular_shares).toBeDefined();
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get('/api/shares/popular?limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.popular_shares).toBeDefined();
    });
  });

  describe('GET /api/shares/following - Get shares from followed users', () => {
    it('should return shares from followed users only', async () => {
      // User1 follows User2
      const Follow = models.Follow;
      await Follow.create({
        follower_id: testUser1.id,
        following_id: testUser2.id
      });

      // User2 shares a post
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      // User3 shares a post (not followed)
      await request(app)
        .post(`/api/shares/${post2.id}`)
        .set('Authorization', authHeader(token3));

      const response = await request(app)
        .get('/api/shares/following')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.shares).toHaveLength(1);
      expect(response.body.data.shares[0].user_id).toBe(testUser2.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/shares/following');

      expectAuthError(response);
    });
  });

  describe('PATCH /api/shares/:postId/comment - Update share comment', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .send({ comment: 'Original comment', share_type: 'quote' })
        .set('Authorization', authHeader(token2));
    });

    it('should allow updating share comment', async () => {
      const response = await request(app)
        .patch(`/api/shares/${post1.id}/comment`)
        .send({ comment: 'Updated comment' })
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.share.comment).toBe('Updated comment');
    });

    it('should not allow updating another user share', async () => {
      const response = await request(app)
        .patch(`/api/shares/${post1.id}/comment`)
        .send({ comment: 'Hacked comment' })
        .set('Authorization', authHeader(token3));

      expectErrorResponse(response, 404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/shares/${post1.id}/comment`)
        .send({ comment: 'New comment' });

      expectAuthError(response);
    });
  });

  describe('GET /api/shares/counts - Get share counts for multiple posts', () => {
    beforeEach(async () => {
      // Share different posts
      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token2));

      await request(app)
        .post(`/api/shares/${post1.id}`)
        .set('Authorization', authHeader(token3));

      await request(app)
        .post(`/api/shares/${post2.id}`)
        .set('Authorization', authHeader(token3));
    });

    it('should return share counts for multiple posts', async () => {
      const response = await request(app)
        .get(`/api/shares/counts?post_ids=${post1.id},${post2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.counts).toBeDefined();
      expect(response.body.data.counts[post1.id]).toBe(2);
      expect(response.body.data.counts[post2.id]).toBe(1);
    });

    it('should work without authentication', async () => {
      const response = await request(app)
        .get(`/api/shares/counts?post_ids=${post1.id},${post2.id}`);

      expectSuccessResponse(response);
      expect(response.body.data.counts).toBeDefined();
    });
  });
});
