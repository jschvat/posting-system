/**
 * Users routes comprehensive tests
 * Tests all user endpoints and functionality
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
  expectValidationError,
  expectAuthError,
  expectNotFoundError,
  expectPaginatedResponse,
  expectUserStructure,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const usersRoutes = require('../routes/users');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Users Routes', () => {
  let models, testUser1, testUser2, token1, token2;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();

    testUser1 = await createTestUser();
    testUser2 = await createTestUser();

    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
  });

  describe('GET /api/users', () => {
    it('should return paginated list of users', async () => {
      // Create additional users
      await createTestUser();
      await createTestUser();

      const response = await request(app)
        .get('/api/users');

      const data = expectPaginatedResponse(response);
      expect(data.users).toHaveLength(4);

      // Verify user structure
      data.users.forEach(user => {
        expectUserStructure(user);
      });
    });

    it('should support pagination', async () => {
      // Create more users
      for (let i = 0; i < 25; i++) {
        await createTestUser();
      }

      const response = await request(app)
        .get('/api/users?page=2&limit=10');

      const data = expectPaginatedResponse(response);
      expect(data.users).toHaveLength(10);
      expect(data.pagination.current_page).toBe(2);
      expect(data.pagination.total_count).toBe(27); // 2 initial + 25 created
    });

    it('should support search functionality', async () => {
      // Create user with specific username
      await createTestUser({
        username: 'searchableuser',
        first_name: 'John',
        last_name: 'Searchable'
      });

      // Search by username
      const usernameResponse = await request(app)
        .get('/api/users?search=searchable');

      const usernameData = expectPaginatedResponse(usernameResponse);
      expect(usernameData.users).toHaveLength(1);
      expect(usernameData.users[0].username).toBe('searchableuser');

      // Search by first name
      const firstNameResponse = await request(app)
        .get('/api/users?search=john');

      const firstNameData = expectPaginatedResponse(firstNameResponse);
      expect(firstNameData.users).toHaveLength(1);
      expect(firstNameData.users[0].first_name).toBe('John');
    });

    it('should filter by active status', async () => {
      // Create inactive user
      await createTestUser({ is_active: false });

      // Filter active users only
      const activeResponse = await request(app)
        .get('/api/users?active=true');

      const activeData = expectPaginatedResponse(activeResponse);
      expect(activeData.users.every(user => user.is_active)).toBe(true);

      // Filter inactive users only
      const inactiveResponse = await request(app)
        .get('/api/users?active=false');

      const inactiveData = expectPaginatedResponse(inactiveResponse);
      expect(inactiveData.users.every(user => !user.is_active)).toBe(true);
      expect(inactiveData.users).toHaveLength(1);
    });

    it('should include post counts', async () => {
      // Create posts for test user
      await createTestPost(testUser1.id);
      await createTestPost(testUser1.id);

      const response = await request(app)
        .get('/api/users');

      const data = expectPaginatedResponse(response);
      const userWithPosts = data.users.find(u => u.id === testUser1.id);
      expect(userWithPosts).toHaveProperty('post_count');
      expect(parseInt(userWithPosts.post_count)).toBe(2);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/users?page=0&limit=51&search=a&active=invalid');

      expectValidationError(response);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user profile with posts', async () => {
      // Create posts for the user
      await createTestPost(testUser1.id, { content: 'Post 1' });
      await createTestPost(testUser1.id, { content: 'Post 2' });

      const response = await request(app)
        .get(`/api/users/${testUser1.id}`);

      const body = expectSuccessResponse(response);
      const user = expectUserStructure(body.data);

      expect(user.id).toBe(testUser1.id);
      expect(user).toHaveProperty('posts');
      expect(user.posts).toHaveLength(2);
      expect(user).toHaveProperty('stats');
      expect(user.stats.total_posts).toBe(2);
    });

    it('should limit posts to 10 recent ones', async () => {
      // Create 15 posts
      for (let i = 1; i <= 15; i++) {
        await createTestPost(testUser1.id, { content: `Post ${i}` });
      }

      const response = await request(app)
        .get(`/api/users/${testUser1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.posts).toHaveLength(10);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/99999');

      expectNotFoundError(response);
    });

    it('should validate user ID parameter', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id');

      expectValidationError(response);
    });

    it('should include user statistics', async () => {
      // Create posts and comments
      const post = await createTestPost(testUser2.id);
      await createTestPost(testUser1.id);

      const response = await request(app)
        .get(`/api/users/${testUser1.id}`);

      const body = expectSuccessResponse(response);
      expect(body.data.stats).toHaveProperty('total_posts');
      expect(body.data.stats).toHaveProperty('total_comments');
      expect(body.data.stats.total_posts).toBe(1);
    });
  });

  describe('POST /api/users', () => {
    it('should redirect to auth/register', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'testuser',
          email: 'test@example.com'
        });

      const error = expectErrorResponse(response, 410, 'ENDPOINT_MOVED');
      expect(error.message).toContain('/api/auth/register');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user profile by owner', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(token1))
        .send(updateData);

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('User updated successfully');
      expect(body.data.first_name).toBe(updateData.first_name);
      expect(body.data.last_name).toBe(updateData.last_name);
      expect(body.data.bio).toBe(updateData.bio);

      // Verify in database
      const dbUser = await models.User.findByPk(testUser1.id);
      expect(dbUser.first_name).toBe(updateData.first_name);
    });

    it('should allow partial updates', async () => {
      const originalName = testUser1.first_name;
      const updateData = {
        bio: 'Only bio updated'
      };

      const response = await request(app)
        .put(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(token1))
        .send(updateData);

      const body = expectSuccessResponse(response);
      expect(body.data.bio).toBe(updateData.bio);
      expect(body.data.first_name).toBe(originalName); // Unchanged
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser1.id}`)
        .send({ first_name: 'Hacker' });

      expectAuthError(response);
    });

    it('should reject update by different user', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(token2))
        .send({ first_name: 'Unauthorized' });

      expectErrorResponse(response, 403, 'AUTHORIZATION_ERROR');
    });

    it('should allow admin to update any user', async () => {
      // Create admin user (ID = 1)
      const adminUser = await createTestUser({ id: 1 });
      const adminToken = generateTestToken(adminUser);

      const response = await request(app)
        .put(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(adminToken))
        .send({ first_name: 'Admin Update' });

      const body = expectSuccessResponse(response);
      expect(body.data.first_name).toBe('Admin Update');
    });

    it('should validate update data', async () => {
      const invalidData = {
        username: 'ab', // Too short
        email: 'invalid-email',
        bio: 'a'.repeat(501), // Too long
        avatar_url: 'not-a-url'
      };

      const response = await request(app)
        .put(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(token1))
        .send(invalidData);

      expectValidationError(response);
    });

    it('should prevent duplicate username/email', async () => {
      // Try to update to existing username
      const response = await request(app)
        .put(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(token1))
        .send({ username: testUser2.username });

      const error = expectErrorResponse(response, 400, 'DUPLICATE_ERROR');
      expect(error.field).toBe('username');
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(token1))
        .send({ email: 'NEW@EMAIL.COM' });

      const body = expectSuccessResponse(response);
      expect(body.data.email).toBe('new@email.com');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/99999')
        .set('Authorization', authHeader(token1))
        .send({ first_name: 'Test' });

      expectNotFoundError(response);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should soft delete user by owner', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(token1));

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('User deactivated successfully');

      // Verify user was deactivated, not deleted
      const dbUser = await models.User.findByPk(testUser1.id);
      expect(dbUser).not.toBeNull();
      expect(dbUser.is_active).toBe(false);
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUser1.id}`);

      expectAuthError(response);
    });

    it('should reject delete by different user', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(token2));

      expectErrorResponse(response, 403, 'AUTHORIZATION_ERROR');
    });

    it('should allow admin to delete any user', async () => {
      // Create admin user (ID = 1)
      const adminUser = await createTestUser({ id: 1 });
      const adminToken = generateTestToken(adminUser);

      const response = await request(app)
        .delete(`/api/users/${testUser1.id}`)
        .set('Authorization', authHeader(adminToken));

      const body = expectSuccessResponse(response);
      expect(body.message).toBe('User deactivated successfully');

      const dbUser = await models.User.findByPk(testUser1.id);
      expect(dbUser.is_active).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/99999')
        .set('Authorization', authHeader(token1));

      expectNotFoundError(response);
    });
  });

  describe('GET /api/users/:id/posts', () => {
    it('should return user posts with pagination', async () => {
      // Create posts for the user
      await createTestPost(testUser1.id, { content: 'Post 1' });
      await createTestPost(testUser1.id, { content: 'Post 2' });
      await createTestPost(testUser1.id, { content: 'Post 3' });

      const response = await request(app)
        .get(`/api/users/${testUser1.id}/posts?limit=2`);

      const body = expectSuccessResponse(response);
      expect(body.data).toHaveProperty('user');
      expect(body.data).toHaveProperty('posts');
      expect(body.data).toHaveProperty('pagination');

      expect(body.data.posts).toHaveLength(2);
      expect(body.data.pagination.total_count).toBe(3);
    });

    it('should return user info with posts', async () => {
      await createTestPost(testUser1.id);

      const response = await request(app)
        .get(`/api/users/${testUser1.id}/posts`);

      const body = expectSuccessResponse(response);
      expect(body.data.user.id).toBe(testUser1.id);
      expect(body.data.user).not.toHaveProperty('password_hash');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/99999/posts');

      expectNotFoundError(response);
    });

    it('should support pagination parameters', async () => {
      // Create multiple posts
      for (let i = 1; i <= 15; i++) {
        await createTestPost(testUser1.id, { content: `Post ${i}` });
      }

      const response = await request(app)
        .get(`/api/users/${testUser1.id}/posts?page=2&limit=5`);

      const body = expectSuccessResponse(response);
      expect(body.data.posts).toHaveLength(5);
      expect(body.data.pagination.current_page).toBe(2);
      expect(body.data.pagination.has_next_page).toBe(true);
      expect(body.data.pagination.has_prev_page).toBe(true);
    });

    it('should only show published posts', async () => {
      await createTestPost(testUser1.id, { content: 'Published', is_published: true });
      await createTestPost(testUser1.id, { content: 'Unpublished', is_published: false });

      const response = await request(app)
        .get(`/api/users/${testUser1.id}/posts`);

      const body = expectSuccessResponse(response);
      expect(body.data.posts).toHaveLength(1);
      expect(body.data.posts[0].content).toBe('Published');
    });

    it('should include reaction counts in posts', async () => {
      const post = await createTestPost(testUser1.id);
      // This would require setting up reactions, but the structure should be there

      const response = await request(app)
        .get(`/api/users/${testUser1.id}/posts`);

      const body = expectSuccessResponse(response);
      expect(body.data.posts[0]).toHaveProperty('reaction_counts');
    });

    it('should validate parameters', async () => {
      const response = await request(app)
        .get(`/api/users/invalid-id/posts?page=0&limit=51`);

      expectValidationError(response);
    });
  });
});