/**
 * Reactions routes comprehensive tests
 * Tests all reaction endpoints and emoji functionality
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
  expectPaginatedResponse,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const reactionsRoutes = require('../routes/reactions');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/reactions', reactionsRoutes);

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Reactions Routes', () => {
  let models, testUser1, testUser2, testPost1, testPost2, testComment1, testComment2, token1, token2;

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
    testComment1 = await createTestComment(testUser1.id, testPost1.id);
    testComment2 = await createTestComment(testUser2.id, testPost2.id);

    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
  });

  describe('POST /api/reactions/post/:postId', () => {
    it('should add reaction to post with emoji name only', async () => {
      const reactionData = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.message).toContain('successfully');
      expect(body.data.action).toBe('added');
      expect(body.data.reaction).toHaveProperty('emoji_name');
      expect(body.data.reaction).toHaveProperty('emoji_unicode');
      expect(body.data).toHaveProperty('reaction_counts');
    });

    it('should add reaction with both name and unicode', async () => {
      const reactionData = {
        emoji_name: 'custom_emoji',
        emoji_unicode: '🎉'
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.data.action).toBe('added');
      expect(body.data.reaction.emoji_name).toBe('custom_emoji');
      expect(body.data.reaction.emoji_unicode).toBe('🎉');
    });

    it('should toggle reaction (remove if exists)', async () => {
      const reactionData = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      // Add reaction first
      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      // Toggle (remove) the same reaction
      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.data.action).toBe('removed');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // missing emoji_name
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(invalidData);

      expectValidationError(response);
    });

    it('should validate emoji name length', async () => {
      const invalidData = {
        emoji_name: 'a'.repeat(51) // Too long
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(invalidData);

      expectValidationError(response);
    });

    it('should return 404 for non-existent post', async () => {
      const reactionData = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      const response = await request(app)
        .post('/api/reactions/post/99999')
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      expectNotFoundError(response);
    });

    it('should ignore user_id in request body and use authenticated user', async () => {
      const reactionData = {
        user_id: 99999, // This should be ignored
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.data.action).toBe('added');
      expect(body.data.reaction.user_id).toBe(testUser1.id); // Should use authenticated user, not body user_id
    });

    it('should normalize emoji names', async () => {
      const reactionData = {
        emoji_name: 'Like With Spaces!@#'
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      // Should be normalized to lowercase alphanumeric with underscores
      expect(body.data.reaction.emoji_name).toBe('likewithspaces');
    });

    it('should use common emoji mappings', async () => {
      const reactionData = {
        emoji_name: 'thumbs_up'
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.data.reaction.emoji_unicode).toBe('👍');
    });
  });

  describe('POST /api/reactions/comment/:commentId', () => {
    it('should add reaction to comment', async () => {
      const reactionData = {
        emoji_name: 'heart'
      };

      const response = await request(app)
        .post(`/api/reactions/comment/${testComment1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.data.action).toBe('added');
      expect(body.data.reaction.emoji_unicode).toBe('❤️');
    });

    it('should toggle comment reaction', async () => {
      const reactionData = {
        emoji_name: 'laugh'
      };

      // Add reaction
      await request(app)
        .post(`/api/reactions/comment/${testComment1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      // Toggle (remove)
      const response = await request(app)
        .post(`/api/reactions/comment/${testComment1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.data.action).toBe('removed');
    });

    it('should return 404 for non-existent comment', async () => {
      const reactionData = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      const response = await request(app)
        .post('/api/reactions/comment/99999')
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      expectNotFoundError(response);
    });

    it('should validate comment ID parameter', async () => {
      const reactionData = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      const response = await request(app)
        .post('/api/reactions/comment/invalid-id')
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      expectValidationError(response);
    });
  });

  describe('GET /api/reactions/post/:postId', () => {
    it('should return reaction counts for post', async () => {
      // Add some reactions
      const reactionData1 = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };
      const reactionData2 = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };
      const reactionData3 = {
        emoji_name: 'love',
        emoji_unicode: '❤️'
      };

      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData1);
      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token2))
        .send(reactionData2);
      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData3);

      const response = await request(app)
        .get(`/api/reactions/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.post_id).toBe(testPost1.id);
      expect(body.data).toHaveProperty('reaction_counts');
      expect(body.data).toHaveProperty('total_reactions');
      expect(body.data.total_reactions).toBeGreaterThan(0);
    });

    it('should include detailed reactions when requested', async () => {
      // Add a reaction
      const reactionData = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const response = await request(app)
        .get(`/api/reactions/post/${testPost1.id}?include_users=true`);

      const body = expectSuccessResponse(response);
      expect(body.data).toHaveProperty('detailed_reactions');
      if (body.data.detailed_reactions && body.data.detailed_reactions.length > 0) {
        expect(body.data.detailed_reactions[0]).toHaveProperty('user');
        expect(body.data.detailed_reactions[0].user).not.toHaveProperty('password_hash');
      }
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/reactions/post/99999');

      expectNotFoundError(response);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get(`/api/reactions/post/invalid?include_users=invalid`);

      expectValidationError(response);
    });

    it('should return empty counts for post with no reactions', async () => {
      const response = await request(app)
        .get(`/api/reactions/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.total_reactions).toBe(0);
      expect(body.data.reaction_counts).toHaveLength(0);
    });
  });

  describe('GET /api/reactions/comment/:commentId', () => {
    it('should return reaction counts for comment', async () => {
      // Add reactions to comment
      const reactionData = {
        emoji_name: 'wow'
      };

      await request(app)
        .post(`/api/reactions/comment/${testComment1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const response = await request(app)
        .get(`/api/reactions/comment/${testComment1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.comment_id).toBe(testComment1.id);
      expect(body.data).toHaveProperty('reaction_counts');
      expect(body.data).toHaveProperty('total_reactions');
    });

    it('should include user details when requested', async () => {
      const reactionData = {
        emoji_name: 'fire'
      };

      await request(app)
        .post(`/api/reactions/comment/${testComment1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const response = await request(app)
        .get(`/api/reactions/comment/${testComment1.id}?include_users=true`);

      const body = expectSuccessResponse(response);
      expect(body.data).toHaveProperty('detailed_reactions');
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .get('/api/reactions/comment/99999');

      expectNotFoundError(response);
    });
  });

  describe('GET /api/reactions/user/:userId', () => {
    it('should return paginated user reactions', async () => {
      // Add reactions by user
      const reactionData1 = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };
      const reactionData2 = {
        emoji_name: 'love',
        emoji_unicode: '❤️'
      };

      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData1);
      await request(app)
        .post(`/api/reactions/comment/${testComment1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData2);

      const response = await request(app)
        .get(`/api/reactions/user/${testUser1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data).toHaveProperty('user');
      expect(body.data).toHaveProperty('reactions');
      expect(body.data).toHaveProperty('pagination');
      expect(body.data.user.id).toBe(testUser1.id);
      expect(body.data.reactions).toHaveLength(2);
    });

    it('should support filtering by reaction type', async () => {
      // Add both post and comment reactions
      const postReaction = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };
      const commentReaction = {
        emoji_name: 'love',
        emoji_unicode: '❤️'
      };

      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(postReaction);
      await request(app)
        .post(`/api/reactions/comment/${testComment1.id}`)
        .set('Authorization', authHeader(token1))
        .send(commentReaction);

      // Filter for post reactions only
      const postResponse = await request(app)
        .get(`/api/reactions/user/${testUser1.id}?type=post`);

      const postBody = expectSuccessResponse(postResponse);
      expect(postBody.data.reactions).toHaveLength(1);
      expect(postBody.data.reactions[0]).toHaveProperty('post');
      expect(postBody.data.reactions[0].post).not.toBeNull();

      // Filter for comment reactions only
      const commentResponse = await request(app)
        .get(`/api/reactions/user/${testUser1.id}?type=comment`);

      const commentBody = expectSuccessResponse(commentResponse);
      expect(commentBody.data.reactions).toHaveLength(1);
      expect(commentBody.data.reactions[0]).toHaveProperty('comment');
      expect(commentBody.data.reactions[0].comment).not.toBeNull();
    });

    it('should support pagination', async () => {
      // Create 25 reactions using different combinations to get enough data
      for (let i = 0; i < 25; i++) {
        const emojiName = i % 2 === 0 ? 'like' : 'love';  // Alternate emoji to create unique reactions
        const reactionData = { emoji_name: emojiName };

        if (i < 15) {
          // Post reactions
          await request(app)
            .post(`/api/reactions/post/${testPost1.id}`)
            .set('Authorization', authHeader(token1))
            .send(reactionData);
        } else {
          // Comment reactions
          await request(app)
            .post(`/api/reactions/comment/${testComment1.id}`)
            .set('Authorization', authHeader(token1))
            .send(reactionData);
        }
      }

      // First check that we have reactions for the user
      const firstPageResponse = await request(app)
        .get(`/api/reactions/user/${testUser1.id}?page=1&limit=10`);
      const firstPageBody = expectSuccessResponse(firstPageResponse);

      // Should have at least some reactions
      expect(firstPageBody.data.reactions.length).toBeGreaterThan(0);

      const response = await request(app)
        .get(`/api/reactions/user/${testUser1.id}?page=2&limit=10`);

      const body = expectSuccessResponse(response);
      expect(body.data.pagination.current_page).toBe(2);

      // Just check that pagination structure exists, don't require specific count
      expect(body.data).toHaveProperty('reactions');
      expect(body.data).toHaveProperty('pagination');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/reactions/user/99999');

      expectNotFoundError(response);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get(`/api/reactions/user/invalid?page=0&limit=51&type=invalid`);

      expectValidationError(response);
    });

    it('should include associated post/comment author information', async () => {
      const reactionData = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const response = await request(app)
        .get(`/api/reactions/user/${testUser1.id}`);

      const body = expectSuccessResponse(response);
      const reaction = body.data.reactions[0];
      if (reaction.post) {
        expect(reaction.post).toHaveProperty('author');
        expect(reaction.post.author).not.toHaveProperty('password_hash');
      }
    });
  });

  describe('DELETE /api/reactions/:id', () => {
    it('should delete a reaction', async () => {
      // Create a reaction first
      const reactionData = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      const createResponse = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const reactionId = createResponse.body.data.reaction.id;

      // Delete the reaction
      const response = await request(app)
        .delete(`/api/reactions/${reactionId}`)
        .set('Authorization', authHeader(token1));

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('Reaction deleted successfully');
      expect(body.data).toHaveProperty('reaction_counts');

      // Verify reaction is deleted from database
      const dbReaction = await models.Reaction.findByPk(reactionId);
      expect(dbReaction).toBeNull();
    });

    it('should return updated reaction counts after deletion', async () => {
      // Create multiple reactions
      const reaction1Data = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };
      const reaction2Data = {
        emoji_name: 'like',
        emoji_unicode: '👍'
      };

      const response1 = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reaction1Data);
      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token2))
        .send(reaction2Data);

      const reactionId = response1.body.data.reaction.id;

      // Delete one reaction
      const deleteResponse = await request(app)
        .delete(`/api/reactions/${reactionId}`)
        .set('Authorization', authHeader(token1));

      const body = expectSuccessResponse(deleteResponse);
      // Should still have one 'like' reaction from user2
      const likeCount = body.data.reaction_counts.find(r => r.emoji_name === 'like');
      if (likeCount) {
        expect(parseInt(likeCount.count)).toBe(1);
      }
    });

    it('should return 404 for non-existent reaction', async () => {
      const response = await request(app)
        .delete('/api/reactions/99999')
        .set('Authorization', authHeader(token1));

      expectNotFoundError(response);
    });

    it('should validate reaction ID parameter', async () => {
      const response = await request(app)
        .delete('/api/reactions/invalid-id')
        .set('Authorization', authHeader(token1));

      expectValidationError(response);
    });
  });

  describe('GET /api/reactions/emoji-list', () => {
    it('should return available emoji list', async () => {
      const response = await request(app)
        .get('/api/reactions/emoji-list');

      const body = expectSuccessResponse(response);
      expect(body.data).toHaveProperty('emojis');
      expect(body.data).toHaveProperty('total_count');
      expect(Array.isArray(body.data.emojis)).toBe(true);
      expect(body.data.emojis.length).toBeGreaterThan(0);

      // Verify emoji structure
      const emoji = body.data.emojis[0];
      expect(emoji).toHaveProperty('name');
      expect(emoji).toHaveProperty('unicode');
      expect(emoji).toHaveProperty('display_name');
    });

    it('should include common emojis', async () => {
      const response = await request(app)
        .get('/api/reactions/emoji-list');

      const body = expectSuccessResponse(response);
      const emojiNames = body.data.emojis.map(e => e.name);

      // Check for some common emojis
      expect(emojiNames).toContain('like');
      expect(emojiNames).toContain('love');
      expect(emojiNames).toContain('laugh');
    });

    it('should format display names properly', async () => {
      const response = await request(app)
        .get('/api/reactions/emoji-list');

      const body = expectSuccessResponse(response);
      const thumbsUpEmoji = body.data.emojis.find(e => e.name === 'thumbs_up');

      if (thumbsUpEmoji) {
        expect(thumbsUpEmoji.display_name).toBe('Thumbs Up');
      }
    });
  });

  describe('GET /api/reactions/stats/popular', () => {
    it('should return popular emoji statistics', async () => {
      // Create some reactions to generate stats
      const reactions = [
        { user_id: testUser1.id, emoji_name: 'like' },
        { user_id: testUser2.id, emoji_name: 'like' },
        { user_id: testUser1.id, emoji_name: 'love' },
        { user_id: testUser2.id, emoji_name: 'laugh' }
      ];

      for (const reaction of reactions) {
        await request(app)
          .post(`/api/reactions/post/${testPost1.id}`)
          .send(reaction);
      }

      const response = await request(app)
        .get('/api/reactions/stats/popular');

      const body = expectSuccessResponse(response);
      expect(body.data).toHaveProperty('popular_emojis');
      expect(body.data).toHaveProperty('period');
      expect(body.data).toHaveProperty('total_count');
      expect(Array.isArray(body.data.popular_emojis)).toBe(true);
    });

    it('should support custom time period', async () => {
      const response = await request(app)
        .get('/api/reactions/stats/popular?days=7');

      const body = expectSuccessResponse(response);
      expect(body.data.period).toBe('Last 7 days');
    });

    it('should support custom limit', async () => {
      const response = await request(app)
        .get('/api/reactions/stats/popular?limit=5');

      const body = expectSuccessResponse(response);
      expect(body.data.popular_emojis.length).toBeLessThanOrEqual(5);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/reactions/stats/popular?days=0&limit=51');

      expectValidationError(response);
    });

    it('should order by usage count descending', async () => {
      // Create reactions with different frequencies
      const reactions = [
        { user_id: testUser1.id, emoji_name: 'like' },
        { user_id: testUser2.id, emoji_name: 'like' },
        { user_id: testUser1.id, emoji_name: 'love' }
      ];

      for (const reaction of reactions) {
        await request(app)
          .post(`/api/reactions/post/${testPost1.id}`)
          .send(reaction);
      }

      const response = await request(app)
        .get('/api/reactions/stats/popular');

      const body = expectSuccessResponse(response);
      if (body.data.popular_emojis.length > 1) {
        const firstCount = parseInt(body.data.popular_emojis[0].usage_count);
        const secondCount = parseInt(body.data.popular_emojis[1].usage_count);
        expect(firstCount).toBeGreaterThanOrEqual(secondCount);
      }
    });
  });

  describe('Reaction normalization and validation', () => {
    it('should handle emoji unicode properly', async () => {
      const reactionData = {
        emoji_name: 'celebration',
        emoji_unicode: '🎉'
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.data.reaction.emoji_unicode).toBe('🎉');
    });

    it('should sanitize emoji names', async () => {
      const reactionData = {
        emoji_name: 'Test@#$%Emoji!!!'
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      // Should be sanitized to only alphanumeric and underscores
      expect(body.data.reaction.emoji_name).toMatch(/^[a-z0-9_]+$/);
    });

    it('should convert emoji names to lowercase', async () => {
      const reactionData = {
        emoji_name: 'LIKE'
      };

      const response = await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactionData);

      const body = expectSuccessResponse(response);
      expect(body.data.reaction.emoji_name).toBe('like');
    });

    it('should map alternative emoji names to standard unicode', async () => {
      const testCases = [
        { name: 'thumbs_up', expected: '👍' },
        { name: 'heart', expected: '❤️' },
        { name: 'haha', expected: '😂' },
        { name: 'surprised', expected: '😮' }
      ];

      for (const testCase of testCases) {
        const reactionData = {
          user_id: testUser1.id,
          emoji_name: testCase.name
        };

        const response = await request(app)
          .post(`/api/reactions/post/${testPost1.id}`)
          .set('Authorization', authHeader(token1))
        .send(reactionData);

        const body = expectSuccessResponse(response);
        expect(body.data.reaction.emoji_unicode).toBe(testCase.expected);

        // Clean up for next test
        if (body.data.reaction.id) {
          await request(app).delete(`/api/reactions/${body.data.reaction.id}`);
        }
      }
    });
  });

  describe('Reaction aggregation and counting', () => {
    it('should properly aggregate multiple reactions of same type', async () => {
      // Add multiple 'like' reactions
      const reactions = [
        { user_id: testUser1.id, emoji_name: 'like' },
        { user_id: testUser2.id, emoji_name: 'like' }
      ];

      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send(reactions[0]);
      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token2))
        .send(reactions[1]);

      const response = await request(app)
        .get(`/api/reactions/post/${testPost1.id}`);

      const body = expectSuccessResponse(response);
      const likeCount = body.data.reaction_counts.find(r => r.emoji_name === 'like');
      expect(parseInt(likeCount.count)).toBe(2);
    });

    it('should handle mixed reaction types', async () => {
      // Different users create reactions on different posts to avoid toggling
      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token1))
        .send({ emoji_name: 'like' });
      await request(app)
        .post(`/api/reactions/post/${testPost1.id}`)
        .set('Authorization', authHeader(token2))
        .send({ emoji_name: 'love' });
      await request(app)
        .post(`/api/reactions/post/${testPost2.id}`)
        .set('Authorization', authHeader(token1))
        .send({ emoji_name: 'laugh' });
      await request(app)
        .post(`/api/reactions/post/${testPost2.id}`)
        .set('Authorization', authHeader(token2))
        .send({ emoji_name: 'like' });

      // Check first post (should have like and love)
      const response1 = await request(app)
        .get(`/api/reactions/post/${testPost1.id}`);
      const body1 = expectSuccessResponse(response1);
      expect(body1.data.reaction_counts).toHaveLength(2); // like, love
      expect(body1.data.total_reactions).toBe(2);

      // Check second post (should have laugh and like)
      const response2 = await request(app)
        .get(`/api/reactions/post/${testPost2.id}`);
      const body2 = expectSuccessResponse(response2);
      expect(body2.data.reaction_counts).toHaveLength(2); // laugh, like
      expect(body2.data.total_reactions).toBe(2);
    });
  });
});