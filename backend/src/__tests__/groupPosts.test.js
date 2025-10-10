/**
 * Group Posts routes comprehensive tests
 * Tests all group post endpoints including voting and moderation
 */

const request = require('supertest');
const express = require('express');
const {
  clearTables,
  createTestUser,
  getModels
} = require('./testDb');
const {
  expectSuccessResponse,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const groupsRoutes = require('../routes/groups');
const groupPostsRoutes = require('../routes/groupPosts');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/groups', groupsRoutes);
app.use('/api/groups', groupPostsRoutes);

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Group Posts Routes', () => {
  let models, testUser1, testUser2, testUser3, testUser4, token1, token2, token3, token4;
  let testGroup, testPost;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();

    // Create test users
    testUser1 = await createTestUser({ username: 'postadmin', email: 'postadmin@test.com' });
    testUser2 = await createTestUser({ username: 'postmod', email: 'postmod@test.com' });
    testUser3 = await createTestUser({ username: 'postmember', email: 'postmember@test.com' });
    testUser4 = await createTestUser({ username: 'nonmember', email: 'nonmember@test.com' });

    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
    token3 = generateTestToken(testUser3);
    token4 = generateTestToken(testUser4);

    // Create test group
    const groupResponse = await request(app)
      .post('/api/groups')
      .set('Authorization', authHeader(token1))
      .send({
        name: 'testgroup',
        display_name: 'Test Group',
        visibility: 'public',
        post_approval_required: false
      });
    testGroup = groupResponse.body.data;

    // Add user2 as moderator
    await request(app)
      .post('/api/groups/testgroup/join')
      .set('Authorization', authHeader(token2));

    await request(app)
      .post(`/api/groups/testgroup/members/${testUser2.id}/role`)
      .set('Authorization', authHeader(token1))
      .send({ role: 'moderator' });

    // Add user3 as member
    await request(app)
      .post('/api/groups/testgroup/join')
      .set('Authorization', authHeader(token3));
  });

  describe('POST /api/groups/:slug/posts - Create Post', () => {
    it('should create a text post successfully', async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Test Post',
          content: 'This is a test post',
          post_type: 'text'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Post');
      expect(response.body.data.content).toBe('This is a test post');
      expect(response.body.data.post_type).toBe('text');
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.upvotes).toBe(0);
      expect(response.body.data.downvotes).toBe(0);
      expect(response.body.data.score).toBe(0);
    });

    it('should create a link post successfully', async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Interesting Article',
          post_type: 'link',
          link_url: 'https://example.com/article',
          link_title: 'Example Article',
          link_description: 'An interesting article'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.post_type).toBe('link');
      expect(response.body.data.link_url).toBe('https://example.com/article');
    });

    it('should require title', async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Content without title',
          post_type: 'text'
        });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .send({
          title: 'Test',
          content: 'Test',
          post_type: 'text'
        });

      expect(response.status).toBe(401);
    });

    it('should create pending post if approval required', async () => {
      // Update group to require approval
      await request(app)
        .put('/api/groups/testgroup')
        .set('Authorization', authHeader(token1))
        .send({ post_approval_required: true });

      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Pending Post',
          content: 'This should be pending',
          post_type: 'text'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.message).toContain('pending');
    });

    it('should allow moderator to bypass approval', async () => {
      // Update group to require approval
      await request(app)
        .put('/api/groups/testgroup')
        .set('Authorization', authHeader(token1))
        .send({ post_approval_required: true });

      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token2))
        .send({
          title: 'Moderator Post',
          content: 'Should be published immediately',
          post_type: 'text'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.status).toBe('published');
    });
  });

  describe('GET /api/groups/:slug/posts - List Posts', () => {
    beforeEach(async () => {
      // Create test posts
      const post1 = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'First Post',
          content: 'Content 1',
          post_type: 'text'
        });
      testPost = post1.body.data;

      await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Second Post',
          content: 'Content 2',
          post_type: 'text'
        });
    });

    it('should list all published posts', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('posts');
      expect(Array.isArray(response.body.data.posts)).toBe(true);
      expect(response.body.data.posts.length).toBe(2);
    });

    it('should support hot sorting', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts?sort_by=hot');

      expectSuccessResponse(response);
      expect(response.body.data.posts.length).toBeGreaterThanOrEqual(2);
    });

    it('should support new sorting', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts?sort_by=new');

      expectSuccessResponse(response);
      expect(response.body.data.posts[0].title).toBe('Second Post'); // Most recent first
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts?limit=1&offset=0');

      expectSuccessResponse(response);
      expect(response.body.data.posts.length).toBe(1);
      expect(response.body.data).toHaveProperty('total', 2);
    });
  });

  describe('GET /api/groups/:slug/posts/:postId - Get Single Post', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Single Post',
          content: 'Content for single post',
          post_type: 'text'
        });
      testPost = response.body.data;
    });

    it('should get post by ID', async () => {
      const response = await request(app)
        .get(`/api/groups/testgroup/posts/${testPost.id}`);

      expectSuccessResponse(response);
      expect(response.body.data.id).toBe(testPost.id);
      expect(response.body.data.title).toBe('Single Post');
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/groups/:slug/posts/:postId - Update Post', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Original Title',
          content: 'Original content',
          post_type: 'text'
        });
      testPost = response.body.data;
    });

    it('should allow author to update their post', async () => {
      const response = await request(app)
        .put(`/api/groups/testgroup/posts/${testPost.id}`)
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Updated Title',
          content: 'Updated content'
        });

      expectSuccessResponse(response);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.content).toBe('Updated content');
      expect(response.body.data.edited_at).not.toBeNull();
    });

    it('should allow moderator to update any post', async () => {
      const response = await request(app)
        .put(`/api/groups/testgroup/posts/${testPost.id}`)
        .set('Authorization', authHeader(token2))
        .send({
          title: 'Moderator Updated',
          content: 'Updated by mod'
        });

      expectSuccessResponse(response);
      expect(response.body.data.title).toBe('Moderator Updated');
    });

    it('should prevent non-author non-moderator from updating post', async () => {
      const response = await request(app)
        .put(`/api/groups/testgroup/posts/${testPost.id}`)
        .set('Authorization', authHeader(token4))
        .send({
          title: 'Hacked'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/groups/:slug/posts/:postId - Delete Post', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Delete Me',
          content: 'To be deleted',
          post_type: 'text'
        });
      testPost = response.body.data;
    });

    it('should allow author to delete their post', async () => {
      const response = await request(app)
        .delete(`/api/groups/testgroup/posts/${testPost.id}`)
        .set('Authorization', authHeader(token3));

      expectSuccessResponse(response);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/groups/testgroup/posts/${testPost.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should allow moderator to delete any post', async () => {
      const response = await request(app)
        .delete(`/api/groups/testgroup/posts/${testPost.id}`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
    });

    it('should prevent non-author non-moderator from deleting post', async () => {
      const response = await request(app)
        .delete(`/api/groups/testgroup/posts/${testPost.id}`)
        .set('Authorization', authHeader(token4));

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/groups/:slug/posts/:postId/vote - Vote on Post', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Vote Test',
          content: 'Vote on this',
          post_type: 'text'
        });
      testPost = response.body.data;
    });

    it('should allow upvoting a post', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });

      expectSuccessResponse(response);
      expect(response.body.data.vote.vote_type).toBe('upvote');
      expect(response.body.data.counts.upvotes).toBe('1');
      expect(response.body.data.counts.score).toBe('1');
    });

    it('should allow downvoting a post', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'downvote' });

      expectSuccessResponse(response);
      expect(response.body.data.vote.vote_type).toBe('downvote');
      expect(response.body.data.counts.downvotes).toBe('1');
      expect(response.body.data.counts.score).toBe('-1');
    });

    it('should toggle vote if same vote type', async () => {
      // First upvote
      await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });

      // Second upvote (should remove)
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });

      expectSuccessResponse(response);
      expect(response.body.message).toContain('removed');
      expect(response.body.data.counts.score).toBe('0');
    });

    it('should change vote if different vote type', async () => {
      // First upvote
      await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });

      // Change to downvote
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'downvote' });

      expectSuccessResponse(response);
      expect(response.body.data.vote.vote_type).toBe('downvote');
      expect(response.body.data.counts.score).toBe('-1');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .send({ vote_type: 'upvote' });

      expect(response.status).toBe(401);
    });

    it('should validate vote_type', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'superhot' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/groups/:slug/posts/:postId/vote - Remove Vote', () => {
    beforeEach(async () => {
      const postResponse = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Unvote Test',
          content: 'Remove vote',
          post_type: 'text'
        });
      testPost = postResponse.body.data;

      // Add a vote
      await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });
    });

    it('should remove existing vote', async () => {
      const response = await request(app)
        .delete(`/api/groups/testgroup/posts/${testPost.id}/vote`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.counts.score).toBe('0');
    });
  });

  describe('POST /api/groups/:slug/posts/:postId/pin - Pin Post (Moderator)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Pin Test',
          content: 'To be pinned',
          post_type: 'text'
        });
      testPost = response.body.data;
    });

    it('should allow moderator to pin post', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/pin`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.is_pinned).toBe(true);
    });

    it('should allow moderator to unpin post', async () => {
      // Pin first
      await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/pin`)
        .set('Authorization', authHeader(token2));

      // Unpin
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/pin`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.is_pinned).toBe(false);
    });

    it('should prevent regular member from pinning', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/pin`)
        .set('Authorization', authHeader(token3));

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/groups/:slug/posts/:postId/lock - Lock Post (Moderator)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Lock Test',
          content: 'To be locked',
          post_type: 'text'
        });
      testPost = response.body.data;
    });

    it('should allow moderator to lock post', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/lock`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.is_locked).toBe(true);
    });

    it('should prevent non-moderator from locking', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/lock`)
        .set('Authorization', authHeader(token3));

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/groups/:slug/posts/:postId/remove - Remove Post (Moderator)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Remove Test',
          content: 'To be removed',
          post_type: 'text'
        });
      testPost = response.body.data;
    });

    it('should allow moderator to remove post with reason', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/remove`)
        .set('Authorization', authHeader(token2))
        .send({ removal_reason: 'Spam content' });

      expectSuccessResponse(response);
      expect(response.body.data.removed_by).toBe(testUser2.id);
      expect(response.body.data.removal_reason).toBe('Spam content');
      expect(response.body.data.removed_at).not.toBeNull();
    });

    it('should prevent regular member from removing post', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/remove`)
        .set('Authorization', authHeader(token3))
        .send({ removal_reason: 'Bad' });

      expect(response.status).toBe(403);
    });

    it('should require removal_reason', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/remove`)
        .set('Authorization', authHeader(token2))
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/groups/:slug/posts/:postId/approve - Approve Post (Moderator)', () => {
    beforeEach(async () => {
      // Enable approval requirement
      await request(app)
        .put('/api/groups/testgroup')
        .set('Authorization', authHeader(token1))
        .send({ post_approval_required: true });

      // Create pending post
      const response = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Pending Post',
          content: 'Awaiting approval',
          post_type: 'text'
        });
      testPost = response.body.data;
    });

    it('should allow moderator to approve pending post', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/approve`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.approved_by).toBe(testUser2.id);
      expect(response.body.data.approved_at).not.toBeNull();
    });

    it('should prevent regular member from approving', async () => {
      const response = await request(app)
        .post(`/api/groups/testgroup/posts/${testPost.id}/approve`)
        .set('Authorization', authHeader(token3));

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/groups/:slug/posts/pending - List Pending Posts (Moderator)', () => {
    beforeEach(async () => {
      // Enable approval requirement
      await request(app)
        .put('/api/groups/testgroup')
        .set('Authorization', authHeader(token1))
        .send({ post_approval_required: true });

      // Create pending posts
      await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Pending 1',
          content: 'Awaiting approval 1',
          post_type: 'text'
        });

      await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Pending 2',
          content: 'Awaiting approval 2',
          post_type: 'text'
        });
    });

    it('should allow moderator to view pending posts', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts/pending')
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
      expect(response.body.data.posts.length).toBe(2);
      response.body.data.posts.forEach(post => {
        expect(post.status).toBe('pending');
      });
    });

    it('should prevent regular member from viewing pending posts', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts/pending')
        .set('Authorization', authHeader(token3));

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/groups/:slug/posts/top - Top Posts by Period', () => {
    beforeEach(async () => {
      // Create posts with votes
      const post1 = await request(app)
        .post('/api/groups/testgroup/posts')
        .set('Authorization', authHeader(token3))
        .send({
          title: 'Popular Post',
          content: 'Lots of upvotes',
          post_type: 'text'
        });

      // Vote on it
      await request(app)
        .post(`/api/groups/testgroup/posts/${post1.body.data.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });

      await request(app)
        .post(`/api/groups/testgroup/posts/${post1.body.data.id}/vote`)
        .set('Authorization', authHeader(token2))
        .send({ vote_type: 'upvote' });
    });

    it('should get top posts for day', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts/top?period=day');

      expectSuccessResponse(response);
      expect(response.body.data.posts.length).toBeGreaterThan(0);
    });

    it('should get top posts for week', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts/top?period=week');

      expectSuccessResponse(response);
      expect(response.body.data.posts.length).toBeGreaterThan(0);
    });

    it('should default to all time if no period', async () => {
      const response = await request(app)
        .get('/api/groups/testgroup/posts/top');

      expectSuccessResponse(response);
    });
  });
});
