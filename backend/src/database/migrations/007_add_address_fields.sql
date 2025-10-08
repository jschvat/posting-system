-- Migration: 007 - Add Address Fields
-- Description: Add physical address and ZIP code fields to users table
-- Date: 2025-10-07
-- Note: These fields complement location coordinates for full address support

-- ============================================================================
-- ADD ADDRESS FIELDS TO USERS TABLE
-- ============================================================================

-- Add address and ZIP code columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_zip VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN users.address IS 'Street address for exact location sharing (e.g., "123 Main St")';
COMMENT ON COLUMN users.location_zip IS 'ZIP/postal code for location';

-- ============================================================================
-- UPDATE LOCATION SHARING LOGIC
-- ============================================================================

-- When location_sharing is 'exact', users should see the full address including:
-- - address (street address)
-- - location_city
-- - location_state
-- - location_zip
-- - location_country
--
-- When location_sharing is 'city', users should only see:
-- - location_city
-- - location_state
-- - location_country
--
-- When location_sharing is 'off', no location information is visible

-- Update get_user_location function to include address fields
DROP FUNCTION IF EXISTS get_user_location(INTEGER);
CREATE FUNCTION get_user_location(p_user_id INTEGER)
RETURNS TABLE (
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    address VARCHAR,
    city VARCHAR,
    state VARCHAR,
    zip VARCHAR,
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
        u.address,
        u.location_city,
        u.location_state,
        u.location_zip,
        u.location_country,
        u.location_accuracy,
        u.location_updated_at,
        u.location_sharing
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_location IS 'Get user''s current location including address with privacy settings';
