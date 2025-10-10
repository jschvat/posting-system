/**
 * Groups routes comprehensive tests
 * Tests all group management endpoints including admin/moderator functionality
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
const groupsRoutes = require('../routes/groups');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/groups', groupsRoutes);

// Mock database models for routes
jest.mock('../config/database', () => ({
  models: {}
}));

describe('Groups Routes', () => {
  let models, testUser1, testUser2, testUser3, token1, token2, token3;
  let testGroup;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();

    // Create test users
    testUser1 = await createTestUser({ username: 'groupadmin', email: 'admin@test.com' });
    testUser2 = await createTestUser({ username: 'groupmod', email: 'mod@test.com' });
    testUser3 = await createTestUser({ username: 'groupmember', email: 'member@test.com' });

    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
    token3 = generateTestToken(testUser3);
  });

  describe('POST /api/groups - Create Group', () => {
    it('should create a new group successfully', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'testgroup',
          display_name: 'Test Group',
          description: 'A test group for testing',
          visibility: 'public',
          allow_multimedia: true
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('testgroup');
      expect(response.body.data.slug).toBe('testgroup');
      expect(response.body.data.display_name).toBe('Test Group');
      expect(response.body.data.creator_id).toBe(testUser1.id);
      expect(response.body.data.member_count).toBe(0);
      expect(response.body.data.post_count).toBe(0);
    });

    it('should auto-generate slug from name', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'my-cool-group',
          display_name: 'My Cool Group',
          description: 'Test',
          visibility: 'public'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.slug).toBe('my-cool-group');
      expect(response.body.data.name).toBe('my-cool-group');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: 'testgroup',
          display_name: 'Test Group'
        });

      expect(response.status).toBe(401);
    });

    it('should require name and display_name', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          description: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should prevent duplicate group names', async () => {
      // Create first group
      await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'testgroup',
          display_name: 'Test Group'
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token2))
        .send({
          name: 'testgroup',
          display_name: 'Test Group 2'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/groups - List Groups', () => {
    beforeEach(async () => {
      // Create test groups
      await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'group1',
          display_name: 'Group 1',
          visibility: 'public'
        });

      await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token2))
        .send({
          name: 'group2',
          display_name: 'Group 2',
          visibility: 'public'
        });
    });

    it('should list all public groups', async () => {
      const response = await request(app)
        .get('/api/groups');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('groups');
      expect(Array.isArray(response.body.data.groups)).toBe(true);
      expect(response.body.data.groups.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/groups?limit=1&offset=0');

      expectSuccessResponse(response);
      expect(response.body.data.groups.length).toBe(1);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('limit', 1);
      expect(response.body.data).toHaveProperty('offset', 0);
    });
  });

  describe('GET /api/groups/:slug - Get Group Details', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'detailgroup',
          display_name: 'Detail Group',
          description: 'Test group for details',
          visibility: 'public'
        });
      testGroup = response.body.data;
    });

    it('should get group details by slug', async () => {
      const response = await request(app)
        .get('/api/groups/detailgroup');

      expectSuccessResponse(response);
      expect(response.body.data.slug).toBe('detailgroup');
      expect(response.body.data.display_name).toBe('Detail Group');
      expect(response.body.data).toHaveProperty('creator_username');
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .get('/api/groups/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/groups/:slug - Update Group (Admin Only)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'updategroup',
          display_name: 'Update Group',
          visibility: 'public'
        });
      testGroup = response.body.data;
    });

    it('should allow admin to update group settings', async () => {
      const response = await request(app)
        .put('/api/groups/updategroup')
        .set('Authorization', authHeader(token1))
        .send({
          display_name: 'Updated Group Name',
          description: 'Updated description',
          post_approval_required: true
        });

      expectSuccessResponse(response);
      expect(response.body.data.display_name).toBe('Updated Group Name');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.post_approval_required).toBe(true);
    });

    it('should prevent non-admin from updating group', async () => {
      const response = await request(app)
        .put('/api/groups/updategroup')
        .set('Authorization', authHeader(token2))
        .send({
          display_name: 'Hacked Name'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('admin');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/groups/updategroup')
        .send({
          display_name: 'Updated'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/groups/:slug - Delete Group (Admin Only)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'deletegroup',
          display_name: 'Delete Group',
          visibility: 'public'
        });
      testGroup = response.body.data;
    });

    it('should allow admin to delete group', async () => {
      const response = await request(app)
        .delete('/api/groups/deletegroup')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);

      // Verify group is deleted
      const getResponse = await request(app)
        .get('/api/groups/deletegroup');
      expect(getResponse.status).toBe(404);
    });

    it('should prevent non-admin from deleting group', async () => {
      const response = await request(app)
        .delete('/api/groups/deletegroup')
        .set('Authorization', authHeader(token2));

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/groups/:slug/join - Join Group', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'joingroup',
          display_name: 'Join Group',
          visibility: 'public',
          require_approval: false
        });
      testGroup = response.body.data;
    });

    it('should allow user to join public group', async () => {
      const response = await request(app)
        .post('/api/groups/joingroup/join')
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('group_id', testGroup.id);
      expect(response.body.data).toHaveProperty('user_id', testUser2.id);
      expect(response.body.data).toHaveProperty('role', 'member');
      expect(response.body.data).toHaveProperty('status', 'active');
    });

    it('should prevent duplicate joins', async () => {
      // First join
      await request(app)
        .post('/api/groups/joingroup/join')
        .set('Authorization', authHeader(token2));

      // Second join attempt
      const response = await request(app)
        .post('/api/groups/joingroup/join')
        .set('Authorization', authHeader(token2));

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already/i);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/groups/joingroup/join');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/groups/:slug/leave - Leave Group', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'leavegroup',
          display_name: 'Leave Group',
          visibility: 'public'
        });
      testGroup = response.body.data;

      // User 2 joins
      await request(app)
        .post('/api/groups/leavegroup/join')
        .set('Authorization', authHeader(token2));
    });

    it('should allow member to leave group', async () => {
      const response = await request(app)
        .post('/api/groups/leavegroup/leave')
        .set('Authorization', authHeader(token2));

      expectSuccessResponse(response);
    });

    it('should prevent creator from leaving', async () => {
      const response = await request(app)
        .post('/api/groups/leavegroup/leave')
        .set('Authorization', authHeader(token1));

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('creator');
    });

    it('should prevent non-member from leaving', async () => {
      const response = await request(app)
        .post('/api/groups/leavegroup/leave')
        .set('Authorization', authHeader(token3));

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not a member');
    });
  });

  describe('POST /api/groups/:slug/members/:userId/role - Change Member Role (Admin Only)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'rolegroup',
          display_name: 'Role Group',
          visibility: 'public'
        });
      testGroup = response.body.data;

      // User 2 joins
      await request(app)
        .post('/api/groups/rolegroup/join')
        .set('Authorization', authHeader(token2));
    });

    it('should allow admin to promote member to moderator', async () => {
      const response = await request(app)
        .post(`/api/groups/rolegroup/members/${testUser2.id}/role`)
        .set('Authorization', authHeader(token1))
        .send({ role: 'moderator' });

      expectSuccessResponse(response);
      expect(response.body.data.role).toBe('moderator');
    });

    it('should allow admin to promote member to admin', async () => {
      const response = await request(app)
        .post(`/api/groups/rolegroup/members/${testUser2.id}/role`)
        .set('Authorization', authHeader(token1))
        .send({ role: 'admin' });

      expectSuccessResponse(response);
      expect(response.body.data.role).toBe('admin');
    });

    it('should prevent non-admin from changing roles', async () => {
      const response = await request(app)
        .post(`/api/groups/rolegroup/members/${testUser2.id}/role`)
        .set('Authorization', authHeader(token3))
        .send({ role: 'moderator' });

      expect(response.status).toBe(403);
    });

    it('should validate role value', async () => {
      const response = await request(app)
        .post(`/api/groups/rolegroup/members/${testUser2.id}/role`)
        .set('Authorization', authHeader(token1))
        .send({ role: 'superadmin' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/groups/:slug/members/:userId/ban - Ban Member (Moderator/Admin)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'bangroup',
          display_name: 'Ban Group',
          visibility: 'public'
        });
      testGroup = response.body.data;

      // User 2 joins
      await request(app)
        .post('/api/groups/bangroup/join')
        .set('Authorization', authHeader(token2));

      // User 3 joins
      await request(app)
        .post('/api/groups/bangroup/join')
        .set('Authorization', authHeader(token3));
    });

    it('should allow admin to ban member', async () => {
      const response = await request(app)
        .post(`/api/groups/bangroup/members/${testUser3.id}/ban`)
        .set('Authorization', authHeader(token1))
        .send({ banned_reason: 'Spam' });

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('banned');
      expect(response.body.data.banned_reason).toBe('Spam');
      expect(response.body.data.banned_by).toBe(testUser1.id);
    });

    it('should allow moderator to ban member', async () => {
      // Promote user 2 to moderator
      await request(app)
        .post(`/api/groups/bangroup/members/${testUser2.id}/role`)
        .set('Authorization', authHeader(token1))
        .send({ role: 'moderator' });

      // User 2 (moderator) bans user 3
      const response = await request(app)
        .post(`/api/groups/bangroup/members/${testUser3.id}/ban`)
        .set('Authorization', authHeader(token2))
        .send({ banned_reason: 'Spam' });

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('banned');
    });

    it('should prevent regular member from banning', async () => {
      const response = await request(app)
        .post(`/api/groups/bangroup/members/${testUser2.id}/ban`)
        .set('Authorization', authHeader(token3))
        .send({ banned_reason: 'Test' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/groups/:slug/members/:userId/unban - Unban Member (Moderator/Admin)', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'unbangroup',
          display_name: 'Unban Group',
          visibility: 'public'
        });
      testGroup = response.body.data;

      // User 2 joins and gets banned
      await request(app)
        .post('/api/groups/unbangroup/join')
        .set('Authorization', authHeader(token2));

      await request(app)
        .post(`/api/groups/unbangroup/members/${testUser2.id}/ban`)
        .set('Authorization', authHeader(token1))
        .send({ banned_reason: 'Test ban' });
    });

    it('should allow admin to unban member', async () => {
      const response = await request(app)
        .post(`/api/groups/unbangroup/members/${testUser2.id}/unban`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('active');
    });

    it('should prevent non-moderator from unbanning', async () => {
      const response = await request(app)
        .post(`/api/groups/unbangroup/members/${testUser2.id}/unban`)
        .set('Authorization', authHeader(token3));

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/groups/:slug/members - List Group Members', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'membersgroup',
          display_name: 'Members Group',
          visibility: 'public'
        });
      testGroup = response.body.data;

      // Add members
      await request(app)
        .post('/api/groups/membersgroup/join')
        .set('Authorization', authHeader(token2));

      await request(app)
        .post('/api/groups/membersgroup/join')
        .set('Authorization', authHeader(token3));
    });

    it('should list all group members', async () => {
      const response = await request(app)
        .get('/api/groups/membersgroup/members');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('members');
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.members.length).toBeGreaterThanOrEqual(3); // admin + 2 members
    });

    it('should filter by role', async () => {
      const response = await request(app)
        .get('/api/groups/membersgroup/members?role=admin');

      expectSuccessResponse(response);
      expect(response.body.data.members.length).toBe(1);
      expect(response.body.data.members[0].role).toBe('admin');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/groups/membersgroup/members?status=active');

      expectSuccessResponse(response);
      response.body.data.members.forEach(member => {
        expect(member.status).toBe('active');
      });
    });
  });

  describe('GET /api/groups/search - Search Groups', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token1))
        .send({
          name: 'javascript',
          display_name: 'JavaScript Developers',
          description: 'A group for JS developers',
          visibility: 'public'
        });

      await request(app)
        .post('/api/groups')
        .set('Authorization', authHeader(token2))
        .send({
          name: 'python',
          display_name: 'Python Programmers',
          description: 'Python coding community',
          visibility: 'public'
        });
    });

    it('should search groups by query', async () => {
      const response = await request(app)
        .get('/api/groups/search?q=javascript');

      expectSuccessResponse(response);
      expect(response.body.data.groups.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.groups[0].name).toContain('javascript');
    });

    it('should return empty results for no match', async () => {
      const response = await request(app)
        .get('/api/groups/search?q=nonexistent');

      expectSuccessResponse(response);
      expect(response.body.data.groups.length).toBe(0);
    });
  });
});
