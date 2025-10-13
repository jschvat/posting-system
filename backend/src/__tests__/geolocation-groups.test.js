const request = require('supertest');
const app = require('../src/server');
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Group = require('../src/models/Group');
const GroupMembership = require('../src/models/GroupMembership');

describe('Geolocation-Restricted Groups', () => {
  let authToken;
  let testUser;
  let sfUser;
  let caUser;
  let nyUser;
  let noLocationUser;
  let sfGroup;
  let caGroup;
  let usaGroup;

  beforeAll(async () => {
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    // Create test users with different locations
    // User in San Francisco
    sfUser = await User.create({
      username: 'sf_user_' + Date.now(),
      email: `sf${Date.now()}@test.com`,
      password_hash: 'test123hash',
      first_name: 'San',
      last_name: 'Francisco',
      location_data: JSON.stringify({
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
        state: 'California',
        country: 'US',
        sharing: 'exact'
      })
    });

    // User in Los Angeles (California, but outside SF radius)
    caUser = await User.create({
      username: 'ca_user_' + Date.now(),
      email: `ca${Date.now()}@test.com`,
      password_hash: 'test123hash',
      first_name: 'Los',
      last_name: 'Angeles',
      location_data: JSON.stringify({
        latitude: 34.0522,
        longitude: -118.2437,
        city: 'Los Angeles',
        state: 'California',
        country: 'US',
        sharing: 'exact'
      })
    });

    // User in New York (Different state, same country)
    nyUser = await User.create({
      username: 'ny_user_' + Date.now(),
      email: `ny${Date.now()}@test.com`,
      password_hash: 'test123hash',
      first_name: 'New',
      last_name: 'York',
      location_data: JSON.stringify({
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        state: 'New York',
        country: 'US',
        sharing: 'exact'
      })
    });

    // User with no location data
    noLocationUser = await User.create({
      username: 'no_loc_user_' + Date.now(),
      email: `noloc${Date.now()}@test.com`,
      password_hash: 'test123hash',
      first_name: 'No',
      last_name: 'Location'
    });

    // Create test groups with different location restrictions
    // SF Bay Area Group (50km radius from downtown SF)
    sfGroup = await Group.create({
      name: 'test_sf_' + Date.now(),
      slug: 'test-sf-' + Date.now(),
      display_name: 'Test SF Bay Area',
      description: 'Test group for SF Bay Area',
      creator_id: sfUser.id,
      location_restricted: true,
      location_type: 'radius',
      location_latitude: 37.7749,
      location_longitude: -122.4194,
      location_radius_km: 50,
      location_name: 'San Francisco Bay Area'
    });

    // California State Group
    caGroup = await Group.create({
      name: 'test_ca_' + Date.now(),
      slug: 'test-ca-' + Date.now(),
      display_name: 'Test California',
      description: 'Test group for California',
      creator_id: caUser.id,
      location_restricted: true,
      location_type: 'state',
      location_state: 'California',
      location_name: 'California'
    });

    // USA Country Group
    usaGroup = await Group.create({
      name: 'test_usa_' + Date.now(),
      slug: 'test-usa-' + Date.now(),
      display_name: 'Test USA',
      description: 'Test group for USA',
      creator_id: nyUser.id,
      location_restricted: true,
      location_type: 'country',
      location_country: 'US',
      location_name: 'United States'
    });

    // Set test user to sfUser for default tests
    testUser = sfUser;

    // Login as SF user to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: sfUser.username,
        password: 'test123'
      });

    // For testing purposes, manually create a valid token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      {
        userId: sfUser.id,
        username: sfUser.username,
        email: sfUser.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await GroupMembership.destroy({ where: {} });
      if (sfGroup) await Group.destroy({ where: { id: sfGroup.id } });
      if (caGroup) await Group.destroy({ where: { id: caGroup.id } });
      if (usaGroup) await Group.destroy({ where: { id: usaGroup.id } });
      if (sfUser) await User.destroy({ where: { id: sfUser.id } });
      if (caUser) await User.destroy({ where: { id: caUser.id } });
      if (nyUser) await User.destroy({ where: { id: nyUser.id } });
      if (noLocationUser) await User.destroy({ where: { id: noLocationUser.id } });
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });

  afterAll(async () => {
    // Close database connection
    if (sequelize) {
      await sequelize.close();
    }
  });

  describe('Radius-based Location Restrictions', () => {
    test('Should allow user within radius to join group', async () => {
      const res = await request(app)
        .post(`/api/groups/${sfGroup.slug}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('Should reject user outside radius from joining group', async () => {
      // Create token for CA user (LA is ~550km from SF)
      const jwt = require('jsonwebtoken');
      const caToken = jwt.sign(
        { userId: caUser.id, username: caUser.username, email: caUser.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const res = await request(app)
        .post(`/api/groups/${sfGroup.slug}/join`)
        .set('Authorization', `Bearer ${caToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/within.*km/i);
    });

    test('Should reject user without location data from joining radius-restricted group', async () => {
      const jwt = require('jsonwebtoken');
      const noLocToken = jwt.sign(
        { userId: noLocationUser.id, username: noLocationUser.username, email: noLocationUser.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const res = await request(app)
        .post(`/api/groups/${sfGroup.slug}/join`)
        .set('Authorization', `Bearer ${noLocToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/location.*required/i);
    });
  });

  describe('State-based Location Restrictions', () => {
    test('Should allow user in correct state to join group', async () => {
      const jwt = require('jsonwebtoken');
      const caToken = jwt.sign(
        { userId: caUser.id, username: caUser.username, email: caUser.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const res = await request(app)
        .post(`/api/groups/${caGroup.slug}/join`)
        .set('Authorization', `Bearer ${caToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('Should reject user from different state', async () => {
      const jwt = require('jsonwebtoken');
      const nyToken = jwt.sign(
        { userId: nyUser.id, username: nyUser.username, email: nyUser.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const res = await request(app)
        .post(`/api/groups/${caGroup.slug}/join`)
        .set('Authorization', `Bearer ${nyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/California/i);
    });
  });

  describe('Country-based Location Restrictions', () => {
    test('Should allow user in correct country to join group', async () => {
      const jwt = require('jsonwebtoken');
      const nyToken = jwt.sign(
        { userId: nyUser.id, username: nyUser.username, email: nyUser.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const res = await request(app)
        .post(`/api/groups/${usaGroup.slug}/join`)
        .set('Authorization', `Bearer ${nyToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Location-restricted Posting', () => {
    test('Should allow member within location to create post', async () => {
      // First join the group
      await request(app)
        .post(`/api/groups/${sfGroup.slug}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      // Then create a post
      const res = await request(app)
        .post(`/api/groups/${sfGroup.slug}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post from SF',
          content: 'This is a test post from San Francisco'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('Should reject post from user outside location even if member', async () => {
      const jwt = require('jsonwebtoken');
      const caToken = jwt.sign(
        { userId: caUser.id, username: caUser.username, email: caUser.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Manually add CA user as member (bypassing location check for testing)
      await GroupMembership.create({
        group_id: sfGroup.id,
        user_id: caUser.id,
        role: 'member',
        status: 'active'
      });

      // Try to create a post - should fail location check
      const res = await request(app)
        .post(`/api/groups/${sfGroup.slug}/posts`)
        .set('Authorization', `Bearer ${caToken}`)
        .send({
          title: 'Test Post from LA',
          content: 'This should fail'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/location|within/i);
    });
  });

  describe('Non-location-restricted Groups', () => {
    let publicGroup;

    beforeEach(async () => {
      publicGroup = await Group.create({
        name: 'test_public_' + Date.now(),
        slug: 'test-public-' + Date.now(),
        display_name: 'Test Public Group',
        description: 'No location restrictions',
        creator_id: sfUser.id,
        location_restricted: false
      });
    });

    afterEach(async () => {
      if (publicGroup) {
        await Group.destroy({ where: { id: publicGroup.id } });
      }
    });

    test('Should allow any user to join non-restricted group', async () => {
      const jwt = require('jsonwebtoken');
      const noLocToken = jwt.sign(
        { userId: noLocationUser.id, username: noLocationUser.username, email: noLocationUser.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const res = await request(app)
        .post(`/api/groups/${publicGroup.slug}/join`)
        .set('Authorization', `Bearer ${noLocToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});
