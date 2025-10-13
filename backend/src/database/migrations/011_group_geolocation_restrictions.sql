-- Migration: 011 - Group Geolocation Restrictions
-- Description: Add geolocation-based restrictions for groups
-- Date: 2025-10-12

-- Add geolocation restriction fields to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS location_restricted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) CHECK (location_type IN ('radius', 'country', 'state', 'city', 'polygon')),
ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_radius_km DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS location_country VARCHAR(2),
ADD COLUMN IF NOT EXISTS location_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_polygon JSONB,
ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);

-- Add comments explaining the fields
COMMENT ON COLUMN groups.location_restricted IS 'If true, users must be in the specified location to join/post';
COMMENT ON COLUMN groups.location_type IS 'Type of location restriction: radius (circle), country, state, city, or polygon (custom area)';
COMMENT ON COLUMN groups.location_latitude IS 'Center latitude for radius-based restrictions';
COMMENT ON COLUMN groups.location_longitude IS 'Center longitude for radius-based restrictions';
COMMENT ON COLUMN groups.location_radius_km IS 'Radius in kilometers for radius-based restrictions';
COMMENT ON COLUMN groups.location_country IS 'ISO 3166-1 alpha-2 country code (e.g., US, CA, GB)';
COMMENT ON COLUMN groups.location_state IS 'State/province/region name';
COMMENT ON COLUMN groups.location_city IS 'City name';
COMMENT ON COLUMN groups.location_polygon IS 'GeoJSON polygon for custom area restrictions';
COMMENT ON COLUMN groups.location_name IS 'Display name for the location (e.g., "San Francisco Bay Area")';

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_groups_location_restricted ON groups(location_restricted) WHERE location_restricted = TRUE;
CREATE INDEX IF NOT EXISTS idx_groups_location_coords ON groups(location_latitude, location_longitude) WHERE location_restricted = TRUE;

-- Example usage:
-- Radius-based: Groups restricted to users within X km of a point
-- Country: Groups restricted to users in a specific country
-- State: Groups restricted to users in a specific state/province
-- City: Groups restricted to users in a specific city
-- Polygon: Groups restricted to users within a custom geographic boundary
