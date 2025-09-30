/**
 * Posts routes comprehensive tests
 * Tests all posts endpoints with CRUD operations and various scenarios
 */

const request = require('supertest');
const express = require('express');
const {
  clearTables,
  createTestUser,
  createTestPost,
  createTestComment,
  createTestMedia,
  createTestReaction,
  getModels
} = require('./testDb');
const {
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectAuthError,
  expectAuthorizationError,
  expectNotFoundError,
  expectPaginatedResponse,
  expectPostStructure,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const postsRoutes = require('../routes/posts');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/posts', postsRoutes);

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Posts Routes', () => {
  let models, testUser1, testUser2, token1, token2;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();

    // Create test users
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();

    // Generate tokens
    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
  });

  describe('GET /api/posts', () => {
    it('should return public posts for unauthenticated users', async () => {
      // Create posts with different privacy levels
      await createTestPost(testUser1.id, { content: 'Public post', privacy_level: 'public' });
      await createTestPost(testUser1.id, { content: 'Friends post', privacy_level: 'friends' });
      await createTestPost(testUser1.id, { content: 'Private post', privacy_level: 'private' });

      const response = await request(app)
        .get('/api/posts');

      const data = expectPaginatedResponse(response);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].content).toBe('Public post');
      expect(data.posts[0].privacy_level).toBe('public');
    });

    it('should return appropriate posts for authenticated users', async () => {
      // Create posts from different users with different privacy levels
      const publicPost = await createTestPost(testUser1.id, { content: 'Public post', privacy_level: 'public' });
      const friendsPost = await createTestPost(testUser1.id, { content: 'Friends post', privacy_level: 'friends' });
      const privatePost = await createTestPost(testUser1.id, { content: 'Private post', privacy_level: 'private' });
      const otherUserPost = await createTestPost(testUser2.id, { content: 'Other user private', privacy_level: 'private' });

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', authHeader(token1));

      const data = expectPaginatedResponse(response);
      // Should see: public post + own friends/private posts
      expect(data.posts).toHaveLength(3);

      const contents = data.posts.map(p => p.content);
      expect(contents).toContain('Public post');
      expect(contents).toContain('Friends post');
      expect(contents).toContain('Private post');
      expect(contents).not.toContain('Other user private');
    });

    it('should support pagination', async () => {
      // Create multiple posts
      for (let i = 1; i <= 25; i++) {
        await createTestPost(testUser1.id, { content: `Post ${i}` });
      }

      // Test first page
      const response1 = await request(app)
        .get('/api/posts?page=1&limit=10');

      const data1 = expectPaginatedResponse(response1);
      expect(data1.posts).toHaveLength(10);
      expect(data1.pagination.current_page).toBe(1);
      expect(data1.pagination.total_count).toBe(25);
      expect(data1.pagination.total_pages).toBe(3);
      expect(data1.pagination.has_next_page).toBe(true);
      expect(data1.pagination.has_prev_page).toBe(false);

      // Test second page
      const response2 = await request(app)
        .get('/api/posts?page=2&limit=10');

      const data2 = expectPaginatedResponse(response2);
      expect(data2.posts).toHaveLength(10);
      expect(data2.pagination.current_page).toBe(2);
      expect(data2.pagination.has_next_page).toBe(true);
      expect(data2.pagination.has_prev_page).toBe(true);
    });

    it('should support filtering by user_id', async () => {
      await createTestPost(testUser1.id, { content: 'User 1 post' });
      await createTestPost(testUser2.id, { content: 'User 2 post' });

      const response = await request(app)
        .get(`/api/posts?user_id=${testUser1.id}`);

      const data = expectPaginatedResponse(response);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].content).toBe('User 1 post');
      expect(data.posts[0].user_id).toBe(testUser1.id);
    });

    it('should support sorting by newest/oldest', async () => {
      const post1 = await createTestPost(testUser1.id, { content: 'First post' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const post2 = await createTestPost(testUser1.id, { content: 'Second post' });

      // Test newest first (default)
      const newestResponse = await request(app)
        .get('/api/posts?sort=newest');

      const newestData = expectPaginatedResponse(newestResponse);
      expect(newestData.posts[0].content).toBe('Second post');
      expect(newestData.posts[1].content).toBe('First post');

      // Test oldest first
      const oldestResponse = await request(app)
        .get('/api/posts?sort=oldest');

      const oldestData = expectPaginatedResponse(oldestResponse);
      expect(oldestData.posts[0].content).toBe('First post');
      expect(oldestData.posts[1].content).toBe('Second post');
    });

    it('should support privacy level filtering', async () => {
      await createTestPost(testUser1.id, { content: 'Public post', privacy_level: 'public' });
      await createTestPost(testUser1.id, { content: 'Friends post', privacy_level: 'friends' });

      const response = await request(app)
        .get('/api/posts?privacy=public');

      const data = expectPaginatedResponse(response);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].privacy_level).toBe('public');
    });

    it('should include author information', async () => {
      await createTestPost(testUser1.id, { content: 'Test post' });

      const response = await request(app)
        .get('/api/posts');

      const data = expectPaginatedResponse(response);
      expect(data.posts[0]).toHaveProperty('author');
      expect(data.posts[0].author.id).toBe(testUser1.id);
      expect(data.posts[0].author.username).toBe(testUser1.username);
      expect(data.posts[0].author).not.toHaveProperty('password_hash');
    });

    it('should include reaction counts', async () => {
      const post = await createTestPost(testUser1.id, { content: 'Test post' });
      await createTestReaction(testUser1.id, post.id);
      await createTestReaction(testUser2.id, post.id, null, { emoji_name: 'heart', emoji_unicode: '❤️' });

      const response = await request(app)
        .get('/api/posts');

      const data = expectPaginatedResponse(response);
      expect(data.posts[0]).toHaveProperty('reaction_counts');
      expect(data.posts[0].reaction_counts).toHaveLength(2);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/posts?page=0&limit=101&sort=invalid&privacy=invalid');

      expectValidationError(response);
    });

    it('should handle empty results gracefully', async () => {
      const response = await request(app)
        .get('/api/posts');

      const data = expectPaginatedResponse(response);
      expect(data.posts).toHaveLength(0);
      expect(data.pagination.total_count).toBe(0);
    });
  });

  describe('GET /api/posts/:id', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(testUser1.id, { content: 'Test post' });
    });

    it('should return post details for public post', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost.id}`);

      const body = expectSuccessResponse(response);
      const post = expectPostStructure(body.data);
      expect(post.id).toBe(testPost.id);
      expect(post.content).toBe('Test post');
      expect(post).toHaveProperty('author');
    });

    it('should return post with comments tree', async () => {
      // Create nested comments
      const comment1 = await createTestComment(testUser1.id, testPost.id, { content: 'Root comment' });
      const comment2 = await createTestComment(testUser2.id, testPost.id, {
        content: 'Reply to root',
        parent_id: comment1.id,
        depth: 1
      });

      const response = await request(app)
        .get(`/api/posts/${testPost.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data).toHaveProperty('comments');
      expect(body.data.comments).toHaveLength(1); // One root comment
      expect(body.data.comments[0].replies).toHaveLength(1); // One reply
      expect(body.data.comments[0].replies[0].content).toBe('Reply to root');
    });

    it('should include media attachments', async () => {
      await createTestMedia(testUser1.id, testPost.id);

      const response = await request(app)
        .get(`/api/posts/${testPost.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data).toHaveProperty('media');
      expect(body.data.media).toHaveLength(1);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/99999');

      expectNotFoundError(response);
    });

    it('should return 403 for private post by other user', async () => {
      const privatePost = await createTestPost(testUser1.id, {
        content: 'Private post',
        privacy_level: 'private'
      });

      const response = await request(app)
        .get(`/api/posts/${privatePost.id}`)
        .set('Authorization', authHeader(token2));

      expectAuthorizationError(response);
    });

    it('should allow owner to view their private post', async () => {
      const privatePost = await createTestPost(testUser1.id, {
        content: 'Private post',
        privacy_level: 'private'
      });

      const response = await request(app)
        .get(`/api/posts/${privatePost.id}`)
        .set('Authorization', authHeader(token1));

      const body = expectSuccessResponse(response);
      expect(body.data.content).toBe('Private post');
    });

    it('should validate post ID parameter', async () => {
      const response = await request(app)
        .get('/api/posts/invalid-id');

      expectValidationError(response);
    });
  });

  describe('POST /api/posts', () => {
    it('should create a new post with valid data', async () => {
      const postData = {
        content: 'This is a new test post',
        privacy_level: 'public'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', authHeader(token1))
        .send(postData);

      const body = expectSuccessResponse(response, 201);
      expect(body.message).toBe('Post created successfully');

      const post = expectPostStructure(body.data);
      expect(post.content).toBe(postData.content);
      expect(post.privacy_level).toBe(postData.privacy_level);
      expect(post.user_id).toBe(testUser1.id);
      expect(post).toHaveProperty('author');

      // Verify post was created in database
      const dbPost = await models.Post.findByPk(post.id);
      expect(dbPost).not.toBeNull();
      expect(dbPost.content).toBe(postData.content);
    });

    it('should create post with default privacy level', async () => {
      const postData = {
        content: 'Post with default privacy'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', authHeader(token1))
        .send(postData);

      const body = expectSuccessResponse(response, 201);
      expect(body.data.privacy_level).toBe('public'); // Default
    });

    it('should reject post creation without authentication', async () => {
      const postData = {
        content: 'Unauthorized post'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData);

      expectAuthError(response);
    });

    it('should validate content length', async () => {
      const shortContent = '';
      const longContent = 'a'.repeat(10001);

      // Test empty content
      const shortResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', authHeader(token1))
        .send({ content: shortContent });

      expectValidationError(shortResponse);

      // Test too long content
      const longResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', authHeader(token1))
        .send({ content: longContent });

      expectValidationError(longResponse);
    });

    it('should validate privacy level', async () => {
      const postData = {
        content: 'Test post',
        privacy_level: 'invalid-privacy'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', authHeader(token1))
        .send(postData);

      expectValidationError(response);
    });

    it('should trim whitespace from content', async () => {
      const postData = {
        content: '  Content with whitespace  '
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', authHeader(token1))
        .send(postData);

      const body = expectSuccessResponse(response, 201);
      expect(body.data.content).toBe('Content with whitespace');
    });
  });

  describe('PUT /api/posts/:id', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(testUser1.id, {
        content: 'Original content',
        privacy_level: 'public'
      });
    });

    it('should update post by owner', async () => {
      const updateData = {
        content: 'Updated content',
        privacy_level: 'private'
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(token1))
        .send(updateData);

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Post updated successfully');
      expect(body.data.content).toBe(updateData.content);
      expect(body.data.privacy_level).toBe(updateData.privacy_level);

      // Verify update in database
      const dbPost = await models.Post.findByPk(testPost.id);
      expect(dbPost.content).toBe(updateData.content);
    });

    it('should allow partial updates', async () => {
      const updateData = {
        content: 'Only content updated'
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(token1))
        .send(updateData);

      const body = expectSuccessResponse(response);
      expect(body.data.content).toBe(updateData.content);
      expect(body.data.privacy_level).toBe('public'); // Unchanged
    });

    it('should reject update without authentication', async () => {
      const updateData = {
        content: 'Unauthorized update'
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .send(updateData);

      expectAuthError(response);
    });

    it('should reject update by non-owner', async () => {
      const updateData = {
        content: 'Unauthorized update'
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(token2))
        .send(updateData);

      expectAuthorizationError(response);
    });

    it('should allow admin to update any post', async () => {
      // Create admin user (ID = 1)
      const adminUser = await createTestUser({ id: 1 });
      const adminToken = generateTestToken(adminUser);

      const updateData = {
        content: 'Admin update'
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(adminToken))
        .send(updateData);

      const body = expectSuccessResponse(response);
      expect(body.data.content).toBe(updateData.content);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .put('/api/posts/99999')
        .set('Authorization', authHeader(token1))
        .send({ content: 'Update' });

      expectNotFoundError(response);
    });

    it('should validate update data', async () => {
      const invalidData = {
        content: 'a'.repeat(10001), // Too long
        privacy_level: 'invalid'
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(token1))
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(testUser1.id, { content: 'Post to delete' });
    });

    it('should delete post by owner', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(token1));

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Post deleted successfully');

      // Verify post was deleted from database
      const dbPost = await models.Post.findByPk(testPost.id);
      expect(dbPost).toBeNull();
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost.id}`);

      expectAuthError(response);
    });

    it('should reject delete by non-owner', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(token2));

      expectAuthorizationError(response);
    });

    it('should allow admin to delete any post', async () => {
      // Create admin user (ID = 1)
      const adminUser = await createTestUser({ id: 1 });
      const adminToken = generateTestToken(adminUser);

      const response = await request(app)
        .delete(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(adminToken));

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Post deleted successfully');

      // Verify post was deleted
      const dbPost = await models.Post.findByPk(testPost.id);
      expect(dbPost).toBeNull();
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .delete('/api/posts/99999')
        .set('Authorization', authHeader(token1));

      expectNotFoundError(response);
    });

    it('should cascade delete comments and reactions', async () => {
      // Create related data
      const comment = await createTestComment(testUser1.id, testPost.id);
      const reaction = await createTestReaction(testUser1.id, testPost.id);

      // Delete post
      await request(app)
        .delete(`/api/posts/${testPost.id}`)
        .set('Authorization', authHeader(token1));

      // Verify cascading deletes
      const dbComment = await models.Comment.findByPk(comment.id);
      const dbReaction = await models.Reaction.findByPk(reaction.id);
      expect(dbComment).toBeNull();
      expect(dbReaction).toBeNull();
    });

    it('should validate post ID parameter', async () => {
      const response = await request(app)
        .delete('/api/posts/invalid-id')
        .set('Authorization', authHeader(token1));

      expectValidationError(response);
    });
  });

  describe('Post visibility and privacy', () => {
    it('should respect privacy levels for unauthenticated users', async () => {
      const publicPost = await createTestPost(testUser1.id, {
        content: 'Public',
        privacy_level: 'public'
      });
      const privatePost = await createTestPost(testUser1.id, {
        content: 'Private',
        privacy_level: 'private'
      });

      // Should see only public posts
      const listResponse = await request(app)
        .get('/api/posts');

      const data = expectPaginatedResponse(listResponse);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].content).toBe('Public');

      // Should be able to view public post
      const publicResponse = await request(app)
        .get(`/api/posts/${publicPost.id}`);
      expectSuccessResponse(publicResponse);

      // Should not be able to view private post
      const privateResponse = await request(app)
        .get(`/api/posts/${privatePost.id}`);
      expectAuthorizationError(privateResponse);
    });

    it('should handle unpublished posts correctly', async () => {
      const unpublishedPost = await createTestPost(testUser1.id, {
        content: 'Unpublished',
        is_published: false
      });

      // Should not appear in listings
      const listResponse = await request(app)
        .get('/api/posts');

      const data = expectPaginatedResponse(listResponse);
      expect(data.posts).toHaveLength(0);

      // Only owner should be able to view
      const ownerResponse = await request(app)
        .get(`/api/posts/${unpublishedPost.id}`)
        .set('Authorization', authHeader(token1));
      expectSuccessResponse(ownerResponse);

      const otherResponse = await request(app)
        .get(`/api/posts/${unpublishedPost.id}`)
        .set('Authorization', authHeader(token2));
      expectAuthorizationError(otherResponse);
    });
  });
});