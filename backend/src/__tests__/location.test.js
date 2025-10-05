/**
 * Location routes comprehensive tests
 * Tests all geolocation endpoints and location system functionality
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
  expectAuthError,
  authHeader,
  generateTestToken
} = require('./testHelpers');

// Import routes
const locationRoutes = require('../routes/location');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/location', locationRoutes);

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

describe('Location Routes', () => {
  let models, testUser1, testUser2, testUser3, token1, token2, token3;

  beforeAll(() => {
    models = getModels();
    require('../config/database').models = models;
  });

  beforeEach(async () => {
    await clearTables();

    // Create test users
    testUser1 = await createTestUser({
      username: 'user1',
      email: 'user1@test.com',
      first_name: 'User',
      last_name: 'One'
    });
    testUser2 = await createTestUser({
      username: 'user2',
      email: 'user2@test.com',
      first_name: 'User',
      last_name: 'Two'
    });
    testUser3 = await createTestUser({
      username: 'user3',
      email: 'user3@test.com',
      first_name: 'User',
      last_name: 'Three'
    });

    // Generate tokens
    token1 = generateTestToken(testUser1);
    token2 = generateTestToken(testUser2);
    token3 = generateTestToken(testUser3);
  });

  afterAll(async () => {
    await clearTables();
  });

  describe('POST /api/location/update - Update location', () => {
    it('should allow authenticated user to update their location', async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        state: 'NY',
        country: 'USA',
        accuracy: 10
      };

      const response = await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token1))
        .send(locationData);

      expectSuccessResponse(response, 200);
      expect(response.body.message).toContain('Location updated successfully');
    });

    it('should reject invalid coordinates', async () => {
      const invalidData = {
        latitude: 200, // Invalid latitude
        longitude: -74.0060
      };

      const response = await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token1))
        .send(invalidData);

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('Invalid coordinates');
    });

    it('should reject missing latitude', async () => {
      const invalidData = {
        longitude: -74.0060
      };

      const response = await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token1))
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should require authentication', async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      const response = await request(app)
        .post('/api/location/update')
        .send(locationData);

      expectAuthError(response);
    });
  });

  describe('GET /api/location/me - Get my location', () => {
    it('should return user\'s current location', async () => {
      // First update location
      await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token1))
        .send({
          latitude: 40.7128,
          longitude: -74.0060,
          city: 'New York',
          state: 'NY'
        });

      // Then get it
      const response = await request(app)
        .get('/api/location/me')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response, 200);
      expect(response.body.location).toBeDefined();
      expect(response.body.location.latitude).toBe('40.7128000');
      expect(response.body.location.longitude).toBe('-74.0060000');
      expect(response.body.location.city).toBe('New York');
      expect(response.body.location.state).toBe('NY');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/location/me');

      expectAuthError(response);
    });
  });

  describe('GET /api/location/user/:userId - Get user location', () => {
    beforeEach(async () => {
      // Set up user2 with exact location sharing
      await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token2))
        .send({
          latitude: 34.0522,
          longitude: -118.2437,
          city: 'Los Angeles',
          state: 'CA'
        });

      await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token2))
        .send({ sharing: 'exact' });
    });

    it('should return user location when sharing is exact', async () => {
      const response = await request(app)
        .get(`/api/location/user/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response, 200);
      expect(response.body.location).toBeDefined();
      expect(response.body.location.sharing).toBe('exact');
      expect(response.body.location.latitude).toBeDefined();
      expect(response.body.location.longitude).toBeDefined();
    });

    it('should hide coordinates when sharing is city', async () => {
      // Change to city sharing
      await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token2))
        .send({ sharing: 'city' });

      const response = await request(app)
        .get(`/api/location/user/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response, 200);
      expect(response.body.location.sharing).toBe('city');
      expect(response.body.location.latitude).toBeNull();
      expect(response.body.location.longitude).toBeNull();
      expect(response.body.location.city).toBe('Los Angeles');
    });

    it('should hide all location when sharing is off', async () => {
      // Change to off
      await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token2))
        .send({ sharing: 'off' });

      const response = await request(app)
        .get(`/api/location/user/${testUser2.id}`)
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response, 200);
      expect(response.body.location.sharing).toBe('off');
      expect(response.body.location.latitude).toBeNull();
      expect(response.body.location.city).toBeNull();
    });
  });

  describe('POST /api/location/nearby - Find nearby users', () => {
    beforeEach(async () => {
      // Set up multiple users with locations
      // User1 in NYC
      await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token1))
        .send({ latitude: 40.7128, longitude: -74.0060, city: 'New York', state: 'NY' });

      await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token1))
        .send({ sharing: 'exact' });

      // User2 in Brooklyn (about 5 miles from Manhattan)
      await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token2))
        .send({ latitude: 40.6782, longitude: -73.9442, city: 'Brooklyn', state: 'NY' });

      await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token2))
        .send({ sharing: 'exact' });

      // User3 in Boston (about 200 miles from NYC)
      await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token3))
        .send({ latitude: 42.3601, longitude: -71.0589, city: 'Boston', state: 'MA' });

      await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token3))
        .send({ sharing: 'exact' });
    });

    it('should find users within specified radius', async () => {
      const response = await request(app)
        .post('/api/location/nearby')
        .set('Authorization', authHeader(token1))
        .send({
          latitude: 40.7128,
          longitude: -74.0060,
          radiusMiles: 25
        });

      expectSuccessResponse(response, 200);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);

      // Should find user2 (Brooklyn) but not user3 (Boston)
      const userIds = response.body.users.map(u => u.user_id);
      expect(userIds).toContain(testUser2.id);
      expect(userIds).not.toContain(testUser3.id);
      expect(userIds).not.toContain(testUser1.id); // Should not include searching user
    });

    it('should validate radius range', async () => {
      const response = await request(app)
        .post('/api/location/nearby')
        .set('Authorization', authHeader(token1))
        .send({
          latitude: 40.7128,
          longitude: -74.0060,
          radiusMiles: 1000 // Too large
        });

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('Radius must be between 1 and 500 miles');
    });

    it('should validate coordinates', async () => {
      const response = await request(app)
        .post('/api/location/nearby')
        .set('Authorization', authHeader(token1))
        .send({
          latitude: 200, // Invalid
          longitude: -74.0060,
          radiusMiles: 25
        });

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('Invalid coordinates');
    });

    it('should include distance in results', async () => {
      const response = await request(app)
        .post('/api/location/nearby')
        .set('Authorization', authHeader(token1))
        .send({
          latitude: 40.7128,
          longitude: -74.0060,
          radiusMiles: 25
        });

      expectSuccessResponse(response, 200);
      if (response.body.users.length > 0) {
        expect(response.body.users[0]).toHaveProperty('distance_miles');
        expect(typeof response.body.users[0].distance_miles).toBe('string');
      }
    });
  });

  describe('PUT /api/location/preferences - Update preferences', () => {
    it('should update location sharing preference', async () => {
      const response = await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token1))
        .send({ sharing: 'city' });

      expectSuccessResponse(response, 200);
      expect(response.body.preferences).toBeDefined();
      expect(response.body.preferences.location_sharing).toBe('city');
    });

    it('should validate sharing level', async () => {
      const response = await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token1))
        .send({ sharing: 'invalid' });

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('Invalid sharing level');
    });

    it('should accept valid sharing levels', async () => {
      const levels = ['exact', 'city', 'off'];

      for (const level of levels) {
        const response = await request(app)
          .put('/api/location/preferences')
          .set('Authorization', authHeader(token1))
          .send({ sharing: level });

        expectSuccessResponse(response, 200);
        expect(response.body.preferences.location_sharing).toBe(level);
      }
    });
  });

  describe('GET /api/location/history - Get location history', () => {
    it('should return location history for user', async () => {
      // Update location multiple times
      const locations = [
        { latitude: 40.7128, longitude: -74.0060, city: 'New York' },
        { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles' },
        { latitude: 41.8781, longitude: -87.6298, city: 'Chicago' }
      ];

      for (const loc of locations) {
        await request(app)
          .post('/api/location/update')
          .set('Authorization', authHeader(token1))
          .send(loc);
      }

      const response = await request(app)
        .get('/api/location/history')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response, 200);
      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.history.length).toBe(3);

      // Should be in reverse chronological order (newest first)
      expect(response.body.history[0].city).toBe('Chicago');
    });

    it('should limit history results', async () => {
      const response = await request(app)
        .get('/api/location/history?limit=2')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response, 200);
      expect(response.body.history.length).toBeLessThanOrEqual(2);
    });
  });

  describe('POST /api/location/distance - Calculate distance', () => {
    it('should calculate distance between two points', async () => {
      const response = await request(app)
        .post('/api/location/distance')
        .set('Authorization', authHeader(token1))
        .send({
          lat1: 40.7128,
          lon1: -74.0060,
          lat2: 34.0522,
          lon2: -118.2437
        });

      expectSuccessResponse(response, 200);
      expect(response.body.distance).toBeDefined();
      expect(typeof response.body.distance).toBe('string');

      // Distance NYC to LA is approximately 2450 miles
      const distance = parseFloat(response.body.distance);
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should validate all coordinates', async () => {
      const response = await request(app)
        .post('/api/location/distance')
        .set('Authorization', authHeader(token1))
        .send({
          lat1: 200, // Invalid
          lon1: -74.0060,
          lat2: 34.0522,
          lon2: -118.2437
        });

      expectErrorResponse(response, 400);
      expect(response.body.error.message).toContain('Invalid coordinates');
    });
  });

  describe('GET /api/location/stats - Get statistics', () => {
    it('should return location statistics', async () => {
      // Set up some users with locations
      await request(app)
        .post('/api/location/update')
        .set('Authorization', authHeader(token1))
        .send({ latitude: 40.7128, longitude: -74.0060, city: 'New York', state: 'NY' });

      await request(app)
        .put('/api/location/preferences')
        .set('Authorization', authHeader(token1))
        .send({ sharing: 'exact' });

      const response = await request(app)
        .get('/api/location/stats')
        .set('Authorization', authHeader(token1));

      expectSuccessResponse(response, 200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats).toHaveProperty('users_with_location');
      expect(response.body.stats).toHaveProperty('sharing_exact');
      expect(response.body.stats).toHaveProperty('sharing_city');
      expect(response.body.stats).toHaveProperty('sharing_off');
      expect(response.body.stats).toHaveProperty('unique_cities');
      expect(response.body.stats).toHaveProperty('unique_states');
    });
  });
});
