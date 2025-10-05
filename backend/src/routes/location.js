/**
 * Location Routes
 * API endpoints for geolocation features
 */

const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const { authenticate } = require('../middleware/auth');
const {
  isValidCoordinates,
  isValidSharingLevel,
  getPrivacyFilteredLocation
} = require('../utils/geolocation');

/**
 * @route   POST /api/location/update
 * @desc    Update user's location
 * @access  Private
 */
router.post('/update', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, city, state, country, accuracy } = req.body;

    // Validate coordinates
    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Get IP and user agent for audit trail
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Update location
    await Location.updateLocation({
      userId: req.user.id,
      latitude,
      longitude,
      city,
      state,
      country,
      accuracy,
      ipAddress,
      userAgent
    });

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

/**
 * @route   GET /api/location/me
 * @desc    Get current user's location
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const location = await Location.getUserLocation(req.user.id);

    res.json({
      success: true,
      location
    });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location'
    });
  }
});

/**
 * @route   GET /api/location/user/:userId
 * @desc    Get another user's location (respects privacy settings)
 * @access  Private
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const location = await Location.getUserLocation(parseInt(userId));

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Filter based on privacy settings
    const filteredLocation = getPrivacyFilteredLocation(location, req.user.id);

    res.json({
      success: true,
      location: filteredLocation
    });
  } catch (error) {
    console.error('Get user location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user location'
    });
  }
});

/**
 * @route   POST /api/location/nearby
 * @desc    Find nearby users
 * @access  Private
 */
router.post('/nearby', authenticate, async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radiusMiles = 25,
      limit = 50,
      offset = 0
    } = req.body;

    // Validate coordinates
    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Validate radius
    if (radiusMiles < 1 || radiusMiles > 500) {
      return res.status(400).json({
        success: false,
        message: 'Radius must be between 1 and 500 miles'
      });
    }

    // Check cache first
    const cached = await Location.getCachedSearch(
      req.user.id,
      latitude,
      longitude,
      radiusMiles
    );

    if (cached && cached.nearby_user_ids) {
      // Return cached results
      const users = await Location.getUsersByIds(cached.nearby_user_ids);

      return res.json({
        success: true,
        users,
        count: cached.result_count,
        cached: true
      });
    }

    // Find nearby users
    const users = await Location.findNearby({
      userId: req.user.id,
      latitude,
      longitude,
      radiusMiles,
      limit,
      offset
    });

    // Cache results
    if (users.length > 0) {
      const userIds = users.map(u => u.user_id);
      await Location.cacheSearchResults({
        userId: req.user.id,
        latitude,
        longitude,
        radiusMiles,
        userIds,
        resultCount: users.length
      });
    }

    res.json({
      success: true,
      users,
      count: users.length,
      cached: false
    });
  } catch (error) {
    console.error('Find nearby error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby users'
    });
  }
});

/**
 * @route   PUT /api/location/preferences
 * @desc    Update location sharing preferences
 * @access  Private
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { sharing, showDistance } = req.body;

    // Validate sharing level
    if (sharing && !isValidSharingLevel(sharing)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sharing level. Must be: exact, city, or off'
      });
    }

    const updated = await Location.updateLocationPreferences(
      req.user.id,
      sharing,
      showDistance !== undefined ? showDistance : null
    );

    res.json({
      success: true,
      preferences: updated
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

/**
 * @route   GET /api/location/history
 * @desc    Get user's location history
 * @access  Private
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const history = await Location.getLocationHistory(req.user.id, parseInt(limit));

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location history'
    });
  }
});

/**
 * @route   POST /api/location/distance
 * @desc    Calculate distance between two points
 * @access  Private
 */
router.post('/distance', authenticate, async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.body;

    // Validate coordinates
    if (!isValidCoordinates(lat1, lon1) || !isValidCoordinates(lat2, lon2)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const distance = await Location.calculateDistance(lat1, lon1, lat2, lon2);

    res.json({
      success: true,
      distance
    });
  } catch (error) {
    console.error('Calculate distance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate distance'
    });
  }
});

/**
 * @route   GET /api/location/stats
 * @desc    Get location statistics (admin only)
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Optional: Add admin check here
    const stats = await Location.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

/**
 * @route   DELETE /api/location/cache/cleanup
 * @desc    Cleanup expired cache entries
 * @access  Private (admin)
 */
router.delete('/cache/cleanup', authenticate, async (req, res) => {
  try {
    const deletedCount = await Location.cleanupCache();

    res.json({
      success: true,
      deletedCount
    });
  } catch (error) {
    console.error('Cleanup cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup cache'
    });
  }
});

module.exports = router;
