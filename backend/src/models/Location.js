/**
 * Location Model
 * Handles geolocation operations for users
 */

const { query } = require('../config/database');

class Location {
  /**
   * Update user's location
   * @param {Object} data - Location data
   * @returns {Promise<boolean>}
   */
  static async updateLocation({
    userId,
    latitude,
    longitude,
    address = null,
    city = null,
    state = null,
    zip = null,
    country = null,
    accuracy = null,
    ipAddress = null,
    userAgent = null
  }) {
    const result = await query(
      'SELECT update_user_location($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [userId, latitude, longitude, address, city, state, zip, country, accuracy, ipAddress, userAgent]
    );
    return result.rows[0].update_user_location;
  }

  /**
   * Get user's current location
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Location data
   */
  static async getUserLocation(userId) {
    const result = await query(
      'SELECT * FROM get_user_location($1)',
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Find nearby users
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Array of nearby users
   */
  static async findNearby({
    userId,
    latitude,
    longitude,
    radiusMiles = 25,
    limit = 50,
    offset = 0
  }) {
    const result = await query(
      'SELECT * FROM find_nearby_users($1, $2, $3, $4, $5, $6)',
      [userId, latitude, longitude, radiusMiles, limit, offset]
    );
    return result.rows;
  }

  /**
   * Calculate distance between two points
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {Promise<number>} Distance in miles
   */
  static async calculateDistance(lat1, lon1, lat2, lon2) {
    const result = await query(
      'SELECT calculate_distance_miles($1, $2, $3, $4) as distance',
      [lat1, lon1, lat2, lon2]
    );
    return result.rows[0].distance;
  }

  /**
   * Update user's location sharing preferences
   * @param {number} userId - User ID
   * @param {string} sharing - Sharing level ('exact', 'city', 'off')
   * @param {boolean} showDistance - Show distance in profile
   * @returns {Promise<Object>} Updated user data
   */
  static async updateLocationPreferences(userId, sharing, showDistance) {
    const result = await query(
      `UPDATE users
       SET location_sharing = $2,
           show_distance_in_profile = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, location_sharing, show_distance_in_profile`,
      [userId, sharing, showDistance]
    );
    return result.rows[0];
  }

  /**
   * Get location history for a user
   * @param {number} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Location history
   */
  static async getLocationHistory(userId, limit = 20) {
    const result = await query(
      `SELECT
        id,
        location_latitude as latitude,
        location_longitude as longitude,
        location_city as city,
        location_state as state,
        location_country as country,
        accuracy,
        created_at
      FROM location_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Check if location is cached and valid
   * @param {number} userId - User ID
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radius - Radius in miles
   * @returns {Promise<Object|null>} Cached results or null
   */
  static async getCachedSearch(userId, lat, lon, radius) {
    const result = await query(
      `SELECT nearby_user_ids, result_count, created_at
       FROM nearby_search_cache
       WHERE user_id = $1
         AND search_lat = $2
         AND search_lon = $3
         AND radius_miles = $4
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, lat, lon, radius]
    );
    return result.rows[0] || null;
  }

  /**
   * Cache nearby search results
   * @param {Object} data - Cache data
   * @returns {Promise<Object>} Cache record
   */
  static async cacheSearchResults({
    userId,
    latitude,
    longitude,
    radiusMiles,
    userIds,
    resultCount
  }) {
    const result = await query(
      `INSERT INTO nearby_search_cache
       (user_id, search_lat, search_lon, radius_miles, nearby_user_ids, result_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, latitude, longitude, radiusMiles, userIds, resultCount]
    );
    return result.rows[0];
  }

  /**
   * Cleanup expired cache entries
   * @returns {Promise<number>} Number of deleted entries
   */
  static async cleanupCache() {
    const result = await query('SELECT cleanup_nearby_search_cache()');
    return result.rows[0].cleanup_nearby_search_cache;
  }

  /**
   * Get users by IDs with their locations
   * @param {Array<number>} userIds - Array of user IDs
   * @returns {Promise<Array>} Users with location data
   */
  static async getUsersByIds(userIds) {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const result = await query(
      `SELECT
        id,
        username,
        first_name,
        last_name,
        avatar_url,
        location_latitude as latitude,
        location_longitude as longitude,
        location_city as city,
        location_state as state,
        location_sharing
      FROM users
      WHERE id = ANY($1)
        AND location_sharing != 'off'
        AND is_active = TRUE`,
      [userIds]
    );
    return result.rows;
  }

  /**
   * Get location statistics
   * @returns {Promise<Object>} Statistics
   */
  static async getStats() {
    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE location_latitude IS NOT NULL) as users_with_location,
        COUNT(*) FILTER (WHERE location_sharing = 'exact') as sharing_exact,
        COUNT(*) FILTER (WHERE location_sharing = 'city') as sharing_city,
        COUNT(*) FILTER (WHERE location_sharing = 'off') as sharing_off,
        COUNT(DISTINCT location_city) as unique_cities,
        COUNT(DISTINCT location_state) as unique_states,
        COUNT(DISTINCT location_country) as unique_countries
      FROM users
      WHERE is_active = TRUE`
    );
    return result.rows[0];
  }
}

module.exports = Location;
