/**
 * Authorization tests for media and reputation endpoints
 * Tests proper permission checks for admin and owner-based access
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
  expectErrorResponse,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const mediaRoutes = require('../routes/media');
const reputationRoutes = require('../routes/reputation');
const GroupMembership = require('../models/GroupMembership');
const Group = require('../models/Group');
const Media = require('../models/Media');

// Mock sharp and file system for media tests
jest.mock('sharp', () => {
  return () => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue({ width: 300, height: 300 }),
    metadata: jest.fn().mockResolvedValue({ width: 1024, height: 768 })
  });
});

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../config/app.config', () => ({
  config: {
    upload: {
      uploadDir: '../uploads',
      maxFileSize: 10485760,
      maxFiles: 5,
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
      imageQuality: 80,
      thumbnailSize: 300
    }
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/media', mediaRoutes);
app.use('/api/reputation', reputationRoutes);

describe('Authorization Tests', () => {
  let testUser1, testUser2, adminUser, testGroup, testPost, testMedia;
  let testUser1Token, testUser2Token, adminToken;

  beforeAll(async () => {
    await clearTables(['media', 'posts', 'group_memberships', 'groups', 'users']);

    // Create test users
    testUser1 = await createTestUser({ username: 'user1', email: 'user1@test.com' });
    testUser2 = await createTestUser({ username: 'user2', email: 'user2@test.com' });
    adminUser = await createTestUser({ username: 'admin', email: 'admin@test.com' });

    testUser1Token = generateTestToken(testUser1);
    testUser2Token = generateTestToken(testUser2);
    adminToken = generateTestToken(adminUser);

    // Create a test group and make adminUser an admin
    testGroup = await Group.create({
      name: 'testgroup',
      slug: 'testgroup',
      display_name: 'Test Group',
      description: 'A test group',
      creator_id: adminUser.id,
      privacy: 'public'
    });

    await GroupMembership.create({
      group_id: testGroup.id,
      user_id: adminUser.id,
      role: 'admin',
      status: 'active'
    });

    // Create a test post for media attachment
    testPost = await createTestPost({ user_id: testUser1.id });

    // Create test media owned by testUser1
    testMedia = await Media.create({
      user_id: testUser1.id,
      post_id: testPost.id,
      filename: 'test.jpg',
      original_name: 'test.jpg',
      file_path: 'test/test.jpg',
      file_url: 'http://localhost:3001/uploads/test/test.jpg',
      mime_type: 'image/jpeg',
      file_size: 12345,
      media_type: 'image',
      width: 1024,
      height: 768
    });
  });

  afterAll(async () => {
    await clearTables(['media', 'group_memberships', 'groups', 'users']);
  });

  describe('Media Authorization', () => {
    describe('PUT /api/media/:id - Update Media', () => {
      it('should allow owner to update their own media', async () => {
        const res = await request(app)
          .put(`/api/media/${testMedia.id}`)
          .set(authHeader(testUser1Token))
          .send({ alt_text: 'Updated alt text' });

        expectSuccessResponse(res);
        expect(res.body.data.alt_text).toBe('Updated alt text');
      });

      it('should deny non-owner from updating media', async () => {
        const res = await request(app)
          .put(`/api/media/${testMedia.id}`)
          .set(authHeader(testUser2Token))
          .send({ alt_text: 'Should not work' });

        expectErrorResponse(res, 403);
        expect(res.body.error.type).toBe('permission_error');
        expect(res.body.error.message).toContain('permission');
      });

      it('should require authentication', async () => {
        const res = await request(app)
          .put(`/api/media/${testMedia.id}`)
          .send({ alt_text: 'Should not work' });

        expectErrorResponse(res, 401);
      });

      it('should return 404 for non-existent media', async () => {
        const res = await request(app)
          .put('/api/media/999999')
          .set(authHeader(testUser1Token))
          .send({ alt_text: 'Does not exist' });

        expectErrorResponse(res, 404);
        expect(res.body.error.message).toContain('not found');
      });
    });

    describe('DELETE /api/media/:id - Delete Media', () => {
      let mediaToDelete;

      beforeEach(async () => {
        // Create fresh media for each test
        mediaToDelete = await Media.create({
          user_id: testUser1.id,
          post_id: testPost.id,
          filename: 'delete-test.jpg',
          original_name: 'delete-test.jpg',
          file_path: 'test/delete-test.jpg',
          file_url: 'http://localhost:3001/uploads/test/delete-test.jpg',
          mime_type: 'image/jpeg',
          file_size: 12345,
          media_type: 'image'
        });
      });

      it('should allow owner to delete their own media', async () => {
        const res = await request(app)
          .delete(`/api/media/${mediaToDelete.id}`)
          .set(authHeader(testUser1Token));

        expectSuccessResponse(res);
        expect(res.body.message).toContain('deleted');
      });

      it('should deny non-owner from deleting media', async () => {
        const res = await request(app)
          .delete(`/api/media/${mediaToDelete.id}`)
          .set(authHeader(testUser2Token));

        expectErrorResponse(res, 403);
        expect(res.body.error.type).toBe('permission_error');
        expect(res.body.error.message).toContain('permission');
      });

      it('should require authentication', async () => {
        const res = await request(app)
          .delete(`/api/media/${mediaToDelete.id}`);

        expectErrorResponse(res, 401);
      });

      it('should return 404 for non-existent media', async () => {
        const res = await request(app)
          .delete('/api/media/999999')
          .set(authHeader(testUser1Token));

        expectErrorResponse(res, 404);
        expect(res.body.error.message).toContain('not found');
      });
    });
  });

  describe('Reputation Authorization', () => {
    describe('POST /api/reputation/recalculate-all - Admin Only', () => {
      it('should allow admin to recalculate all reputation', async () => {
        const res = await request(app)
          .post('/api/reputation/recalculate-all')
          .set(authHeader(adminToken));

        expectSuccessResponse(res);
        expect(res.body.data).toHaveProperty('users_updated');
        expect(res.body.message).toContain('Recalculated reputation');
      });

      it('should deny non-admin from recalculating all reputation', async () => {
        const res = await request(app)
          .post('/api/reputation/recalculate-all')
          .set(authHeader(testUser1Token));

        expectErrorResponse(res, 403);
        expect(res.body.error.type).toBe('permission_error');
        expect(res.body.error.message).toContain('admin');
      });

      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/reputation/recalculate-all');

        expectErrorResponse(res, 401);
      });
    });

    describe('POST /api/reputation/recalculate - User Own Reputation', () => {
      it('should allow any authenticated user to recalculate their own reputation', async () => {
        const res = await request(app)
          .post('/api/reputation/recalculate')
          .set(authHeader(testUser1Token));

        expectSuccessResponse(res);
        expect(res.body.data).toHaveProperty('reputation_score');
      });

      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/reputation/recalculate');

        expectErrorResponse(res, 401);
      });
    });
  });
});

describe('Admin Check Middleware', () => {
  let regularUser, adminUser, regularToken, adminToken, testGroup;

  beforeAll(async () => {
    await clearTables(['group_memberships', 'groups', 'users']);

    // Create users
    regularUser = await createTestUser({ username: 'regular', email: 'regular@test.com' });
    adminUser = await createTestUser({ username: 'groupadmin', email: 'groupadmin@test.com' });

    regularToken = generateTestToken(regularUser);
    adminToken = generateTestToken(adminUser);

    // Create group with admin
    testGroup = await Group.create({
      name: 'admingroup',
      slug: 'admingroup',
      display_name: 'Admin Group',
      description: 'Test group for admin',
      creator_id: adminUser.id,
      privacy: 'public'
    });

    await GroupMembership.create({
      group_id: testGroup.id,
      user_id: adminUser.id,
      role: 'admin',
      status: 'active'
    });

    // Regular user is not an admin in any group
  });

  afterAll(async () => {
    await clearTables(['group_memberships', 'groups', 'users']);
  });

  it('should allow users who are admins in at least one group', async () => {
    const res = await request(app)
      .post('/api/reputation/recalculate-all')
      .set(authHeader(adminToken));

    expectSuccessResponse(res);
  });

  it('should deny users who are not admins in any group', async () => {
    const res = await request(app)
      .post('/api/reputation/recalculate-all')
      .set(authHeader(regularToken));

    expectErrorResponse(res, 403);
    expect(res.body.error.message).toContain('admin');
  });
});
