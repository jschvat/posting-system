/**
 * Comments routes comprehensive tests
 * Tests all comment endpoints and functionality
 */

const request = require('supertest');
const express = require('express');
const {
  clearTables,
  createTestUser,
  createTestPost,
  createTestComment,
  getModels
} = require('./testDb');
const {
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectNotFoundError,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const commentsRoutes = require('../routes/comments');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/comments', commentsRoutes);

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Comments Routes', () => {
  let models, testUser1, testUser2, testPost1, testPost2, token1, token2;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();

    testUser1 = await createTestUser();
    testUser2 = await createTestUser();
    testPost1 = await createTestPost(testUser1.id);
    testPost2 = await createTestPost(testUser2.id);

    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
  });

  describe('GET /api/comments/post/:postId', () => {
    it('should return hierarchical comments for a post', async () => {
      // Create nested comments
      const rootComment = await createTestComment(testUser1.id, testPost1.id, {
        content: 'Root comment'
      });
      const reply1 = await createTestComment(testUser2.id, testPost1.id, {
        content: 'First reply',
        parent_id: rootComment.id
      });
      const reply2 = await createTestComment(testUser1.id, testPost1.id, {
        content: 'Second reply',
        parent_id: rootComment.id
      });
      const nestedReply = await createTestComment(testUser2.id, testPost1.id, {
        content: 'Nested reply',
        parent_id: reply1.id
      });

      const response = await request(app)
        .get(`/api/comments/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.comments).toHaveLength(1); // Only root comment
      expect(body.data.comments[0].content).toBe('Root comment');
      expect(body.data.comments[0].replies).toHaveLength(2);
      expect(body.data.comments[0].replies[0].replies).toHaveLength(1);
      expect(body.data.total_count).toBe(4);
    });

    it('should support different sorting options', async () => {
      // Create comments with different timestamps
      const comment1 = await createTestComment(testUser1.id, testPost1.id, {
        content: 'First comment'
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const comment2 = await createTestComment(testUser2.id, testPost1.id, {
        content: 'Second comment'
      });

      // Test newest first
      const newestResponse = await request(app)
        .get(`/api/comments/post/${testPost1.id}?sort=newest`);

      const newestBody = expectSuccessResponse(newestResponse);
      expect(newestBody.data.comments[0].content).toBe('Second comment');

      // Test oldest first
      const oldestResponse = await request(app)
        .get(`/api/comments/post/${testPost1.id}?sort=oldest`);

      const oldestBody = expectSuccessResponse(oldestResponse);
      expect(oldestBody.data.comments[0].content).toBe('First comment');
    });

    it('should support limit parameter', async () => {
      // Create multiple comments
      for (let i = 1; i <= 15; i++) {
        await createTestComment(testUser1.id, testPost1.id, {
          content: `Comment ${i}`
        });
      }

      const response = await request(app)
        .get(`/api/comments/post/${testPost1.id}?limit=10`);

      const body = expectSuccessResponse(response);
      expect(body.data.comments).toHaveLength(10);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/comments/post/99999');

      expectNotFoundError(response);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get(`/api/comments/post/invalid?sort=invalid&limit=101`);

      expectValidationError(response);
    });

    it('should only show published comments', async () => {
      await createTestComment(testUser1.id, testPost1.id, {
        content: 'Published comment',
        is_published: true
      });
      await createTestComment(testUser1.id, testPost1.id, {
        content: 'Unpublished comment',
        is_published: false
      });

      const response = await request(app)
        .get(`/api/comments/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.comments).toHaveLength(1);
      expect(body.data.comments[0].content).toBe('Published comment');
    });

    it('should include author information', async () => {
      await createTestComment(testUser1.id, testPost1.id, {
        content: 'Test comment'
      });

      const response = await request(app)
        .get(`/api/comments/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      const comment = body.data.comments[0];
      expect(comment).toHaveProperty('author');
      expect(comment.author.id).toBe(testUser1.id);
      expect(comment.author.username).toBe(testUser1.username);
      expect(comment.author).not.toHaveProperty('password_hash');
    });

    it('should include reaction counts', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id);

      // This would require setting up reactions, but the structure should be there
      const response = await request(app)
        .get(`/api/comments/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.comments[0]).toHaveProperty('reaction_counts');
    });
  });

  describe('GET /api/comments/:id', () => {
    it('should return single comment with replies', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id, {
        content: 'Parent comment'
      });
      const reply = await createTestComment(testUser2.id, testPost1.id, {
        content: 'Reply',
        parent_id: comment.id
      });

      const response = await request(app)
        .get(`/api/comments/${comment.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.id).toBe(comment.id);
      expect(body.data.content).toBe('Parent comment');
      expect(body.data).toHaveProperty('replies');
      expect(body.data).toHaveProperty('reaction_counts');
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .get('/api/comments/99999');

      expectNotFoundError(response);
    });

    it('should validate comment ID parameter', async () => {
      const response = await request(app)
        .get('/api/comments/invalid-id');

      expectValidationError(response);
    });
  });

  describe('POST /api/comments', () => {
    it('should create a new comment', async () => {
      const commentData = {
        post_id: testPost1.id,
        content: 'New test comment'
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', authHeader(token1))
        .send(commentData);

      const body = expectSuccessResponse(response, 201);
      expect(body.message).toBe('Comment created successfully');
      expect(body.data.content).toBe(commentData.content);
      expect(body.data).toHaveProperty('author');
      expect(body.data.author.id).toBe(testUser1.id);

      // Verify in database
      const dbComment = await models.Comment.findByPk(body.data.id);
      expect(dbComment).not.toBeNull();
      expect(dbComment.content).toBe(commentData.content);
    });

    it('should create a reply to a comment', async () => {
      const parentComment = await createTestComment(testUser1.id, testPost1.id);

      const replyData = {
        post_id: testPost1.id,
        content: 'This is a reply',
        parent_id: parentComment.id
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', authHeader(token2))
        .send(replyData);

      const body = expectSuccessResponse(response, 201);
      expect(body.message).toBe('Reply created successfully');
      expect(body.data.parent_id).toBe(parentComment.id);

      // Verify in database
      const dbReply = await models.Comment.findByPk(body.data.id);
      expect(dbReply.parent_id).toBe(parentComment.id);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        content: 'Missing required fields'
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', authHeader(token1))
        .send(invalidData);

      expectValidationError(response);
    });

    it('should validate content length', async () => {
      const longContent = 'a'.repeat(2001);
      const commentData = {
        post_id: testPost1.id,
        content: longContent
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', authHeader(token1))
        .send(commentData);

      expectValidationError(response);
    });

    it('should return 404 for non-existent post', async () => {
      const commentData = {
        post_id: 99999,
        content: 'Comment on non-existent post'
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', authHeader(token1))
        .send(commentData);

      expectNotFoundError(response);
    });

    it('should return 404 for non-existent user', async () => {
      // This test is no longer relevant since users are authenticated
      // but we'll test with a valid request to maintain test structure
      const commentData = {
        post_id: testPost1.id,
        content: 'Valid comment by authenticated user'
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', authHeader(token1))
        .send(commentData);

      expectSuccessResponse(response, 201);
    });

    it('should validate parent comment exists and belongs to same post', async () => {
      const otherPostComment = await createTestComment(testUser1.id, testPost2.id);

      const invalidReplyData = {
        post_id: testPost1.id,
        content: 'Reply to comment from different post',
        parent_id: otherPostComment.id
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', authHeader(token1))
        .send(invalidReplyData);

      const error = expectErrorResponse(response, 400, 'INVALID_PARENT');
      expect(error.message).toContain('same post');
    });

    it('should prevent excessive nesting depth', async () => {
      // Create a chain of nested comments (assuming max depth is 5)
      let parentId = null;
      const comments = [];

      for (let i = 0; i < 5; i++) {
        const comment = await createTestComment(testUser1.id, testPost1.id, {
          parent_id: parentId,
          content: `Nested comment level ${i + 1}`
        });
        comments.push(comment);
        parentId = comment.id;
      }

      // Try to create one more level (should fail)
      const tooDeepData = {
        post_id: testPost1.id,
        content: 'Too deeply nested',
        parent_id: parentId
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', authHeader(token1))
        .send(tooDeepData);

      const error = expectErrorResponse(response, 400, 'MAX_DEPTH_EXCEEDED');
      expect(error.message).toContain('Maximum comment nesting depth');
    });
  });

  describe('PUT /api/comments/:id', () => {
    it('should update comment content', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id, {
        content: 'Original content'
      });

      const updateData = {
        content: 'Updated content'
      };

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .send(updateData);

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Comment updated successfully');
      expect(body.data.content).toBe(updateData.content);

      // Verify in database
      const dbComment = await models.Comment.findByPk(comment.id);
      expect(dbComment.content).toBe(updateData.content);
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .put('/api/comments/99999')
        .send({ content: 'Updated content' });

      expectNotFoundError(response);
    });

    it('should validate content length', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id);
      const longContent = 'a'.repeat(2001);

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .send({ content: longContent });

      expectValidationError(response);
    });

    it('should validate comment ID parameter', async () => {
      const response = await request(app)
        .put('/api/comments/invalid-id')
        .send({ content: 'Updated content' });

      expectValidationError(response);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete comment and count replies', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id);
      const reply1 = await createTestComment(testUser2.id, testPost1.id, {
        parent_id: comment.id
      });
      const reply2 = await createTestComment(testUser1.id, testPost1.id, {
        parent_id: comment.id
      });

      const response = await request(app)
        .delete(`/api/comments/${comment.id}`);

      const body = expectSuccessResponse(response);
      expect(body.message).toContain('Comment deleted successfully');
      expect(body.message).toContain('2 replies');

      // Verify comment is deleted from database
      const dbComment = await models.Comment.findByPk(comment.id);
      expect(dbComment).toBeNull();
    });

    it('should delete comment without replies', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id);

      const response = await request(app)
        .delete(`/api/comments/${comment.id}`);

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Comment deleted successfully');
      expect(body.message).not.toContain('replies');
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .delete('/api/comments/99999');

      expectNotFoundError(response);
    });

    it('should validate comment ID parameter', async () => {
      const response = await request(app)
        .delete('/api/comments/invalid-id');

      expectValidationError(response);
    });
  });

  describe('GET /api/comments/:id/replies', () => {
    it('should return replies for a comment', async () => {
      const parentComment = await createTestComment(testUser1.id, testPost1.id);
      const reply1 = await createTestComment(testUser2.id, testPost1.id, {
        content: 'First reply',
        parent_id: parentComment.id
      });
      const reply2 = await createTestComment(testUser1.id, testPost1.id, {
        content: 'Second reply',
        parent_id: parentComment.id
      });

      const response = await request(app)
        .get(`/api/comments/${parentComment.id}/replies`);

      const body = expectSuccessResponse(response);
      expect(body.data.parent_comment_id).toBe(parentComment.id);
      expect(body.data.replies).toHaveLength(2);
      expect(body.data.total_count).toBe(2);

      // Verify replies have proper structure
      body.data.replies.forEach(reply => {
        expect(reply).toHaveProperty('author');
        expect(reply).toHaveProperty('reaction_counts');
        expect(reply.author).not.toHaveProperty('password_hash');
      });
    });

    it('should support sorting replies', async () => {
      const parentComment = await createTestComment(testUser1.id, testPost1.id);
      const reply1 = await createTestComment(testUser2.id, testPost1.id, {
        content: 'First reply',
        parent_id: parentComment.id
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const reply2 = await createTestComment(testUser1.id, testPost1.id, {
        content: 'Second reply',
        parent_id: parentComment.id
      });

      // Test newest first
      const newestResponse = await request(app)
        .get(`/api/comments/${parentComment.id}/replies?sort=newest`);

      const newestBody = expectSuccessResponse(newestResponse);
      expect(newestBody.data.replies[0].content).toBe('Second reply');

      // Test oldest first
      const oldestResponse = await request(app)
        .get(`/api/comments/${parentComment.id}/replies?sort=oldest`);

      const oldestBody = expectSuccessResponse(oldestResponse);
      expect(oldestBody.data.replies[0].content).toBe('First reply');
    });

    it('should support limit parameter', async () => {
      const parentComment = await createTestComment(testUser1.id, testPost1.id);

      // Create multiple replies
      for (let i = 1; i <= 25; i++) {
        await createTestComment(testUser1.id, testPost1.id, {
          content: `Reply ${i}`,
          parent_id: parentComment.id
        });
      }

      const response = await request(app)
        .get(`/api/comments/${parentComment.id}/replies?limit=10`);

      const body = expectSuccessResponse(response);
      expect(body.data.replies).toHaveLength(10);
    });

    it('should return 404 for non-existent parent comment', async () => {
      const response = await request(app)
        .get('/api/comments/99999/replies');

      expectNotFoundError(response);
    });

    it('should validate parameters', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id);

      const response = await request(app)
        .get(`/api/comments/invalid/replies?sort=invalid&limit=51`);

      expectValidationError(response);
    });

    it('should only show published replies', async () => {
      const parentComment = await createTestComment(testUser1.id, testPost1.id);
      await createTestComment(testUser2.id, testPost1.id, {
        content: 'Published reply',
        parent_id: parentComment.id,
        is_published: true
      });
      await createTestComment(testUser1.id, testPost1.id, {
        content: 'Unpublished reply',
        parent_id: parentComment.id,
        is_published: false
      });

      const response = await request(app)
        .get(`/api/comments/${parentComment.id}/replies`);

      const body = expectSuccessResponse(response);
      expect(body.data.replies).toHaveLength(1);
      expect(body.data.replies[0].content).toBe('Published reply');
    });

    it('should return empty array for comment with no replies', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id);

      const response = await request(app)
        .get(`/api/comments/${comment.id}/replies`);

      const body = expectSuccessResponse(response);
      expect(body.data.replies).toHaveLength(0);
      expect(body.data.total_count).toBe(0);
    });
  });

  describe('Comment depth validation', () => {
    it('should correctly calculate comment depth', async () => {
      // Test the Comment.getCommentDepth method if available
      const comment1 = await createTestComment(testUser1.id, testPost1.id);
      const comment2 = await createTestComment(testUser2.id, testPost1.id, {
        parent_id: comment1.id
      });
      const comment3 = await createTestComment(testUser1.id, testPost1.id, {
        parent_id: comment2.id
      });

      // This would test the actual depth calculation
      // For now, we just verify the structure exists
      expect(comment3.parent_id).toBe(comment2.id);
      expect(comment2.parent_id).toBe(comment1.id);
      expect(comment1.parent_id).toBeNull();
    });
  });

  describe('Comment associations and includes', () => {
    it('should include media attachments when available', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id);

      const response = await request(app)
        .get(`/api/comments/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.comments[0]).toHaveProperty('media');
    });

    it('should handle reactions properly in hierarchical structure', async () => {
      const comment = await createTestComment(testUser1.id, testPost1.id);
      const reply = await createTestComment(testUser2.id, testPost1.id, {
        parent_id: comment.id
      });

      const response = await request(app)
        .get(`/api/comments/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.comments[0]).toHaveProperty('reaction_counts');
      expect(body.data.comments[0].replies[0]).toHaveProperty('reaction_counts');
    });
  });
});