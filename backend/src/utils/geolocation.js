/**
 * Geolocation Utility Functions
 * Helper functions for working with geographic data
 */

/**
 * Haversine distance calculation (JavaScript implementation for client-side use)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number}
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate latitude value
 * @param {number} lat - Latitude
 * @returns {boolean}
 */
function isValidLatitude(lat) {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude value
 * @param {number} lon - Longitude
 * @returns {boolean}
 */
function isValidLongitude(lon) {
  return typeof lon === 'number' && lon >= -180 && lon <= 180;
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean}
 */
function isValidCoordinates(lat, lon) {
  return isValidLatitude(lat) && isValidLongitude(lon);
}

/**
 * Format distance for display
 * @param {number} miles - Distance in miles
 * @param {number} decimals - Number of decimal places
 * @returns {string}
 */
function formatDistance(miles, decimals = 1) {
  if (miles === null || miles === undefined) {
    return 'Unknown';
  }

  if (miles < 0.1) {
    return 'Nearby';
  }

  if (miles < 1) {
    return `${miles.toFixed(2)} mi`;
  }

  if (miles < 100) {
    return `${miles.toFixed(decimals)} mi`;
  }

  return `${Math.round(miles)} mi`;
}

/**
 * Get location display based on privacy settings
 * @param {Object} location - Location object
 * @returns {string}
 */
function getLocationDisplay(location) {
  if (!location || location.sharing === 'off') {
    return '';
  }

  if (location.sharing === 'city') {
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    return parts.join(', ');
  }

  // exact location
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }

  return location.city || location.state || location.country || '';
}

/**
 * Calculate bounding box for a given point and radius
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radiusMiles - Radius in miles
 * @returns {Object} Bounding box {minLat, maxLat, minLon, maxLon}
 */
function getBoundingBox(lat, lon, radiusMiles) {
  // Rough approximation: 1 degree latitude ≈ 69 miles
  const latDelta = radiusMiles / 69;
  // Longitude varies with latitude
  const lonDelta = radiusMiles / (69 * Math.cos(toRadians(lat)));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta
  };
}

/**
 * Check if coordinates are within bounding box
 * @param {number} lat - Latitude to check
 * @param {number} lon - Longitude to check
 * @param {Object} box - Bounding box
 * @returns {boolean}
 */
function isInBoundingBox(lat, lon, box) {
  return lat >= box.minLat &&
         lat <= box.maxLat &&
         lon >= box.minLon &&
         lon <= box.maxLon;
}

/**
 * Reverse geocode coordinates to city/state using OpenStreetMap Nominatim
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Location details
 */
async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'PostingSystem/1.0' // Required by Nominatim usage policy
        }
      }
    );

    if (!response.ok) {
      console.error('Reverse geocoding failed:', response.status);
      return { city: null, state: null, country: null };
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      city: address.city || address.town || address.village || null,
      state: address.state || null,
      country: address.country || null,
      address: data.display_name || null
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return { city: null, state: null, country: null };
  }
}

/**
 * Geocode an address to coordinates using OpenStreetMap Nominatim
 * @param {Object} addressParts - Address components
 * @param {string} addressParts.address - Street address
 * @param {string} addressParts.city - City
 * @param {string} addressParts.state - State
 * @param {string} addressParts.zip - ZIP code
 * @param {string} addressParts.country - Country
 * @returns {Promise<Object>} Coordinates and location details
 */
async function geocodeAddress(addressParts) {
  try {
    // Build search query from address parts
    const queryParts = [];
    if (addressParts.address) queryParts.push(addressParts.address);
    if (addressParts.city) queryParts.push(addressParts.city);
    if (addressParts.state) queryParts.push(addressParts.state);
    if (addressParts.zip) queryParts.push(addressParts.zip);
    if (addressParts.country) queryParts.push(addressParts.country);

    if (queryParts.length === 0) {
      return {
        success: false,
        error: 'No address components provided'
      };
    }

    const query = encodeURIComponent(queryParts.join(', '));
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'PostingSystem/1.0' // Required by Nominatim usage policy
        }
      }
    );

    if (!response.ok) {
      console.error('Geocoding failed:', response.status);
      return {
        success: false,
        error: `Geocoding API returned status ${response.status}`
      };
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Address not found'
      };
    }

    const result = data[0];
    const address = result.address || {};

    return {
      success: true,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city: address.city || address.town || address.village || addressParts.city,
      state: address.state || addressParts.state,
      country: address.country || addressParts.country,
      displayAddress: result.display_name,
      boundingBox: result.boundingbox
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate location sharing setting
 * @param {string} sharing - Sharing level
 * @returns {boolean}
 */
function isValidSharingLevel(sharing) {
  return ['exact', 'city', 'off'].includes(sharing);
}

/**
 * Get privacy-filtered coordinates
 * @param {Object} location - Location object
 * @param {string} requesterId - ID of user requesting location
 * @returns {Object} Filtered location data
 */
function getPrivacyFilteredLocation(location, requesterId) {
  if (!location || location.sharing === 'off') {
    return {
      sharing: 'off',
      city: null,
      state: null,
      country: null,
      latitude: null,
      longitude: null
    };
  }

  if (location.sharing === 'city') {
    return {
      sharing: 'city',
      city: location.city,
      state: location.state,
      country: location.country,
      latitude: null, // Don't expose exact coordinates
      longitude: null
    };
  }

  // exact sharing
  return {
    sharing: 'exact',
    city: location.city,
    state: location.state,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude
  };
}

/**
 * Calculate recommended search radius based on user density
 * @param {number} userCount - Number of users in area
 * @returns {number} Recommended radius in miles
 */
function getRecommendedRadius(userCount) {
  if (userCount < 10) return 100;
  if (userCount < 50) return 50;
  if (userCount < 100) return 25;
  return 10;
}

module.exports = {
  calculateDistance,
  toRadians,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  formatDistance,
  getLocationDisplay,
  getBoundingBox,
  isInBoundingBox,
  reverseGeocode,
  geocodeAddress,
  isValidSharingLevel,
  getPrivacyFilteredLocation,
  getRecommendedRadius
};
