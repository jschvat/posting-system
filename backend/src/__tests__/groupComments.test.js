/**
 * Group Comments routes comprehensive tests
 * Tests all group comment endpoints including nested comments and moderation
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
const groupCommentsRoutes = require('../routes/groupComments');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/groups', groupsRoutes);
app.use('/api/groups', groupPostsRoutes);
app.use('/api/groups', groupCommentsRoutes);

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Group Comments Routes', () => {
  let models, testUser1, testUser2, testUser3, testUser4, token1, token2, token3, token4;
  let testGroup, testPost, testComment;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();

    // Create test users
    testUser1 = await createTestUser({ username: 'commentadmin', email: 'commentadmin@test.com' });
    testUser2 = await createTestUser({ username: 'commentmod', email: 'commentmod@test.com' });
    testUser3 = await createTestUser({ username: 'commentmember', email: 'commentmember@test.com' });
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
        name: 'commentgroup',
        display_name: 'Comment Group',
        visibility: 'public'
      });
    testGroup = groupResponse.body.data;

    // Add user2 as moderator
    await request(app)
      .post('/api/groups/commentgroup/join')
      .set('Authorization', authHeader(token2));

    await request(app)
      .post(`/api/groups/commentgroup/members/${testUser2.id}/role`)
      .set('Authorization', authHeader(token1))
      .send({ role: 'moderator' });

    // Add user3 as member
    await request(app)
      .post('/api/groups/commentgroup/join')
      .set('Authorization', authHeader(token3));

    // Create test post
    const postResponse = await request(app)
      .post('/api/groups/commentgroup/posts')
      .set('Authorization', authHeader(token3))
      .send({
        title: 'Test Post for Comments',
        content: 'Post content',
        post_type: 'text'
      });
    testPost = postResponse.body.data;
  });

  describe('POST /api/groups/:slug/posts/:postId/comments - Create Comment', () => {
    it('should create a top-level comment', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token1))
        .send({
          content: 'This is a great post!'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.content).toBe('This is a great post!');
      expect(response.body.data.parent_id).toBeNull();
      expect(response.body.data.depth).toBe(0);
      expect(response.body.data.upvotes).toBe(0);
      expect(response.body.data.downvotes).toBe(0);
    });

    it('should create a nested reply comment', async () => {
      // Create parent comment
      const parentResponse = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token1))
        .send({
          content: 'Parent comment'
        });
      const parentComment = parentResponse.body.data;

      // Create reply
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token2))
        .send({
          content: 'Reply to parent',
          parent_id: parentComment.id
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.parent_id).toBe(parentComment.id);
      expect(response.body.data.depth).toBe(1);
      expect(response.body.data.path).toContain(parentComment.id.toString());
    });

    it('should require content', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token1))
        .send({});

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .send({
          content: 'Anonymous comment'
        });

      expect(response.status).toBe(401);
    });

    it('should prevent comments on locked posts for non-moderators', async () => {
      // Lock the post
      await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/lock`)
        .set('Authorization', authHeader(token2));

      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Comment on locked post'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('locked');
    });

    it('should allow moderators to comment on locked posts', async () => {
      // Lock the post
      await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/lock`)
        .set('Authorization', authHeader(token2));

      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token2))
        .send({
          content: 'Moderator comment on locked post'
        });

      expectSuccessResponse(response, 201);
    });
  });

  describe('GET /api/groups/:slug/posts/:postId/comments - List Comments', () => {
    beforeEach(async () => {
      // Create test comments
      const comment1 = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token1))
        .send({
          content: 'First comment'
        });
      testComment = comment1.body.data;

      await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token2))
        .send({
          content: 'Second comment'
        });
    });

    it('should list all comments for a post', async () => {
      const response = await request(app)
        .get(`/api/groups/commentgroup/posts/${testPost.id}/comments`);

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('comments');
      expect(Array.isArray(response.body.data.comments)).toBe(true);
      expect(response.body.data.comments.length).toBe(2);
    });

    it('should support best sorting', async () => {
      const response = await request(app)
        .get(`/api/groups/commentgroup/posts/${testPost.id}/comments?sort_by=best`);

      expectSuccessResponse(response);
      expect(response.body.data.comments.length).toBe(2);
    });

    it('should support new sorting', async () => {
      const response = await request(app)
        .get(`/api/groups/commentgroup/posts/${testPost.id}/comments?sort_by=new`);

      expectSuccessResponse(response);
      expect(response.body.data.comments[0].content).toBe('Second comment');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/groups/commentgroup/posts/${testPost.id}/comments?limit=1`);

      expectSuccessResponse(response);
      expect(response.body.data.comments.length).toBe(1);
    });
  });

  describe('GET /api/groups/:slug/posts/:postId/comments/nested - Nested Comments', () => {
    beforeEach(async () => {
      // Create nested comment structure
      const parent = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token1))
        .send({
          content: 'Parent'
        });

      const child1 = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token2))
        .send({
          content: 'Child 1',
          parent_id: parent.body.data.id
        });

      await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Grandchild',
          parent_id: child1.body.data.id
        });
    });

    it('should return nested comment structure', async () => {
      const response = await request(app)
        .get(`/api/groups/commentgroup/posts/${testPost.id}/comments/nested`);

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('comments');
      expect(Array.isArray(response.body.data.comments)).toBe(true);

      // Check that nesting exists
      const parent = response.body.data.comments.find(c => c.content === 'Parent');
      expect(parent).toBeDefined();
      expect(parent.depth).toBe(0);
    });

    it('should support max_depth parameter', async () => {
      const response = await request(app)
        .get(`/api/groups/commentgroup/posts/${testPost.id}/comments/nested?max_depth=1`);

      expectSuccessResponse(response);
      const comments = response.body.data.comments;
      const maxDepth = Math.max(...comments.map(c => c.depth));
      expect(maxDepth).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/groups/:slug/comments/:commentId - Get Single Comment', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token1))
        .send({
          content: 'Single comment test'
        });
      testComment = response.body.data;
    });

    it('should get comment by ID', async () => {
      const response = await request(app)
        .get(`/api/groups/commentgroup/comments/${testComment.id}`);

      expectSuccessResponse(response);
      expect(response.body.data.id).toBe(testComment.id);
      expect(response.body.data.content).toBe('Single comment test');
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .get('/api/groups/commentgroup/comments/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/groups/:slug/comments/:commentId/replies - Get Replies', () => {
    beforeEach(async () => {
      const parentResponse = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token1))
        .send({
          content: 'Parent for replies'
        });
      testComment = parentResponse.body.data;

      // Add replies
      await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token2))
        .send({
          content: 'Reply 1',
          parent_id: testComment.id
        });

      await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Reply 2',
          parent_id: testComment.id
        });
    });

    it('should get all direct replies', async () => {
      const response = await request(app)
        .get(`/api/groups/commentgroup/comments/${testComment.id}/replies`);

      expectSuccessResponse(response);
      expect(response.body.data.replies.length).toBe(2);
      response.body.data.replies.forEach(reply => {
        expect(reply.parent_id).toBe(testComment.id);
      });
    });
  });

  describe('PUT /api/groups/:slug/comments/:commentId - Update Comment', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Original comment content'
        });
      testComment = response.body.data;
    });

    it('should allow author to update their comment', async () => {
      const response = await request(app)
        .put(`/api/groups/commentgroup/comments/${testComment.id}`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Updated comment content'
        });

      expectSuccessResponse(response);
      expect(response.body.data.content).toBe('Updated comment content');
      expect(response.body.data.edited_at).not.toBeNull();
    });

    it('should prevent non-author from updating comment', async () => {
      const response = await request(app)
        .put(`/api/groups/commentgroup/comments/${testComment.id}`)
        .set('Authorization', authHeader(token1))
        .send({
          content: 'Hacked content'
        });

      expect(response.status).toBe(403);
    });

    it('should require content', async () => {
      const response = await request(app)
        .put(`/api/groups/commentgroup/comments/${testComment.id}`)
        .set('Authorization', authHeader(token3))
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/groups/:slug/comments/:commentId - Delete Comment', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Comment to delete'
        });
      testComment = response.body.data;
    });

    it('should allow author to delete their comment', async () => {
      const response = await request(app)
        .delete(`/api/groups/commentgroup/comments/${testComment.id}`)
        .set('Authorization', authHeader(token3));

      expectSuccessResponse(response);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/groups/commentgroup/comments/${testComment.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should allow moderator to delete any comment', async () => {
      const response = await request(app)
        .delete(`/api/groups/commentgroup/comments/${testComment.id}`)
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
    });

    it('should prevent non-author non-moderator from deleting comment', async () => {
      const response = await request(app)
        .delete(`/api/groups/commentgroup/comments/${testComment.id}`)
        .set('Authorization', authHeader(token4));

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/groups/:slug/comments/:commentId/vote - Vote on Comment', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Comment to vote on'
        });
      testComment = response.body.data;
    });

    it('should allow upvoting a comment', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/comments/${testComment.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });

      expectSuccessResponse(response);
      expect(response.body.data.vote.vote_type).toBe('upvote');
      expect(response.body.data.counts.upvotes).toBe('1');
      expect(response.body.data.counts.score).toBe('1');
    });

    it('should allow downvoting a comment', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/comments/${testComment.id}/vote`)
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
        .post(`/api/groups/commentgroup/comments/${testComment.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });

      // Second upvote (should remove)
      const response = await request(app)
        .post(`/api/groups/commentgroup/comments/${testComment.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });

      expectSuccessResponse(response);
      expect(response.body.message).toContain('removed');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/comments/${testComment.id}/vote`)
        .send({ vote_type: 'upvote' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/groups/:slug/comments/:commentId/vote - Remove Vote', () => {
    beforeEach(async () => {
      const commentResponse = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Comment with vote'
        });
      testComment = commentResponse.body.data;

      // Add vote
      await request(app)
        .post(`/api/groups/commentgroup/comments/${testComment.id}/vote`)
        .set('Authorization', authHeader(token1))
        .send({ vote_type: 'upvote' });
    });

    it('should remove existing vote', async () => {
      const response = await request(app)
        .delete(`/api/groups/commentgroup/comments/${testComment.id}/vote`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.counts.score).toBe('0');
    });
  });

  describe('POST /api/groups/:slug/comments/:commentId/remove - Remove Comment (Moderator)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/posts/${testPost.id}/comments`)
        .set('Authorization', authHeader(token3))
        .send({
          content: 'Comment to be removed by mod'
        });
      testComment = response.body.data;
    });

    it('should allow moderator to remove comment with reason', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/comments/${testComment.id}/remove`)
        .set('Authorization', authHeader(token2))
        .send({ removal_reason: 'Inappropriate content' });

      expectSuccessResponse(response);
      expect(response.body.data.removed_by).toBe(testUser2.id);
      expect(response.body.data.removal_reason).toBe('Inappropriate content');
      expect(response.body.data.removed_at).not.toBeNull();
      expect(response.body.data.status).toBe('removed');
    });

    it('should prevent regular member from removing comment', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/comments/${testComment.id}/remove`)
        .set('Authorization', authHeader(token3))
        .send({ removal_reason: 'Bad' });

      expect(response.status).toBe(403);
    });

    it('should require removal_reason', async () => {
      const response = await request(app)
        .post(`/api/groups/commentgroup/comments/${testComment.id}/remove`)
        .set('Authorization', authHeader(token2))
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
