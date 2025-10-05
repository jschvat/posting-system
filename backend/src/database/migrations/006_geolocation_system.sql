-- Migration: 006 - Geolocation System
-- Description: Add geolocation support for finding nearby users
-- Date: 2025-10-04
-- Note: Uses Haversine formula for distance calculations (pure PostgreSQL, no PostGIS required)

-- ============================================================================
-- ADD LOCATION FIELDS TO USERS TABLE
-- ============================================================================

-- Add location fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(10, 7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_country VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_accuracy INTEGER; -- in meters
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_sharing VARCHAR(20) DEFAULT 'off'
  CHECK (location_sharing IN ('exact', 'city', 'off'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_distance_in_profile BOOLEAN DEFAULT FALSE;

-- Add indexes for efficient location queries
CREATE INDEX IF NOT EXISTS idx_users_location_coords ON users(location_latitude, location_longitude);
CREATE INDEX IF NOT EXISTS idx_users_location_sharing ON users(location_sharing);
CREATE INDEX IF NOT EXISTS idx_users_location_updated ON users(location_updated_at);

-- ============================================================================
-- LOCATION HISTORY TABLE
-- ============================================================================
-- Track location changes for privacy and debugging
CREATE TABLE IF NOT EXISTS location_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_latitude DECIMAL(10, 7) NOT NULL,
    location_longitude DECIMAL(10, 7) NOT NULL,
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),
    accuracy INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for location_history
CREATE INDEX IF NOT EXISTS idx_location_history_user_id ON location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_created_at ON location_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_coords ON location_history(location_latitude, location_longitude);

-- ============================================================================
-- NEARBY SEARCH CACHE TABLE
-- ============================================================================
-- Cache nearby user searches for performance
CREATE TABLE IF NOT EXISTS nearby_search_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_lat DECIMAL(10, 7) NOT NULL,
    search_lon DECIMAL(10, 7) NOT NULL,
    radius_miles INTEGER NOT NULL,
    nearby_user_ids INTEGER[] NOT NULL,
    result_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes')
);

-- Indexes for nearby_search_cache
CREATE INDEX IF NOT EXISTS idx_nearby_cache_user_id ON nearby_search_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_nearby_cache_expires_at ON nearby_search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_nearby_cache_coords ON nearby_search_cache(search_lat, search_lon);

-- ============================================================================
-- HELPER FUNCTIONS FOR GEOLOCATION
-- ============================================================================

-- Function to calculate distance between two points in miles using Haversine formula
-- This is accurate for distances up to a few hundred miles
CREATE OR REPLACE FUNCTION calculate_distance_miles(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    R DECIMAL := 3959; -- Earth's radius in miles
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    -- Convert degrees to radians
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);

    -- Haversine formula
    a := SIN(dLat / 2) * SIN(dLat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLon / 2) * SIN(dLon / 2);
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));

    RETURN (R * c)::DECIMAL(10, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find users within radius (in miles)
CREATE OR REPLACE FUNCTION find_nearby_users(
    p_user_id INTEGER,
    p_lat DECIMAL(10, 7),
    p_lon DECIMAL(10, 7),
    p_radius_miles INTEGER DEFAULT 25,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    avatar_url VARCHAR,
    distance_miles DECIMAL(10, 2),
    location_city VARCHAR,
    location_state VARCHAR,
    location_sharing VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        calculate_distance_miles(p_lat, p_lon, u.location_latitude, u.location_longitude) as distance_miles,
        u.location_city,
        u.location_state,
        u.location_sharing
    FROM users u
    WHERE
        u.id != p_user_id -- Exclude the searching user
        AND u.location_latitude IS NOT NULL
        AND u.location_longitude IS NOT NULL
        AND u.location_sharing != 'off'
        AND u.is_active = TRUE
        -- Rough bounding box filter for performance (before calculating exact distance)
        -- 1 degree latitude ≈ 69 miles, 1 degree longitude varies but ~69 miles at equator
        AND u.location_latitude BETWEEN p_lat - (p_radius_miles / 69.0) AND p_lat + (p_radius_miles / 69.0)
        AND u.location_longitude BETWEEN p_lon - (p_radius_miles / 69.0) AND p_lon + (p_radius_miles / 69.0)
        AND calculate_distance_miles(p_lat, p_lon, u.location_latitude, u.location_longitude) <= p_radius_miles
    ORDER BY distance_miles
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to update user location
CREATE OR REPLACE FUNCTION update_user_location(
    p_user_id INTEGER,
    p_lat DECIMAL(10, 7),
    p_lon DECIMAL(10, 7),
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL,
    p_accuracy INTEGER DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update users table
    UPDATE users
    SET
        location_latitude = p_lat,
        location_longitude = p_lon,
        location_city = COALESCE(p_city, location_city),
        location_state = COALESCE(p_state, location_state),
        location_country = COALESCE(p_country, location_country),
        location_accuracy = COALESCE(p_accuracy, location_accuracy),
        location_updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Add to location history
    INSERT INTO location_history (
        user_id,
        location_latitude,
        location_longitude,
        location_city,
        location_state,
        location_country,
        accuracy,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_lat,
        p_lon,
        p_city,
        p_state,
        p_country,
        p_accuracy,
        p_ip_address,
        p_user_agent
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_nearby_search_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM nearby_search_cache
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current location
CREATE OR REPLACE FUNCTION get_user_location(p_user_id INTEGER)
RETURNS TABLE (
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    city VARCHAR,
    state VARCHAR,
    country VARCHAR,
    accuracy INTEGER,
    updated_at TIMESTAMP,
    sharing VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.location_latitude,
        u.location_longitude,
        u.location_city,
        u.location_state,
        u.location_country,
        u.location_accuracy,
        u.location_updated_at,
        u.location_sharing
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRIVACY AND CLEANUP
-- ============================================================================

-- Trigger to limit location history to last 100 entries per user
CREATE OR REPLACE FUNCTION limit_location_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete old entries beyond 100 for this user
    DELETE FROM location_history
    WHERE id IN (
        SELECT id
        FROM location_history
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        OFFSET 100
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_limit_location_history ON location_history;
CREATE TRIGGER trigger_limit_location_history
AFTER INSERT ON location_history
FOR EACH ROW EXECUTE FUNCTION limit_location_history();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN users.location_latitude IS 'Latitude coordinate for user location (WGS84)';
COMMENT ON COLUMN users.location_longitude IS 'Longitude coordinate for user location (WGS84)';
COMMENT ON COLUMN users.location_sharing IS 'Privacy setting: exact (show precise location), city (show only city), off (hide location)';
COMMENT ON COLUMN users.show_distance_in_profile IS 'Whether to show distance to this user in search results';
COMMENT ON TABLE location_history IS 'Historical log of user location changes for privacy audit';
COMMENT ON TABLE nearby_search_cache IS 'Cache for nearby user searches to improve performance';

COMMENT ON FUNCTION calculate_distance_miles IS 'Calculate distance between two lat/lon points in miles using Haversine formula';
COMMENT ON FUNCTION find_nearby_users IS 'Find users within specified radius (miles) sorted by distance';
COMMENT ON FUNCTION update_user_location IS 'Update user location and add entry to history';
COMMENT ON FUNCTION get_user_location IS 'Get user''s current location with privacy settings';
COMMENT ON FUNCTION cleanup_nearby_search_cache IS 'Remove expired cache entries, returns count deleted';
