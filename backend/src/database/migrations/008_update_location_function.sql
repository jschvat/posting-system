-- Migration: 008 - Update Location Functions for Address Support
-- Description: Update update_user_location function to include address and zip
-- Date: 2025-10-07

-- Drop and recreate the function with new parameters
DROP FUNCTION IF EXISTS update_user_location(INTEGER, DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, INTEGER, INET, TEXT);

CREATE OR REPLACE FUNCTION update_user_location(
    p_user_id INTEGER,
    p_lat DECIMAL(10, 7),
    p_lon DECIMAL(10, 7),
    p_address VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_zip VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL,
    p_accuracy INTEGER DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update users table with all location fields
    UPDATE users
    SET
        location_latitude = p_lat,
        location_longitude = p_lon,
        address = COALESCE(p_address, address),
        location_city = COALESCE(p_city, location_city),
        location_state = COALESCE(p_state, location_state),
        location_zip = COALESCE(p_zip, location_zip),
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

COMMENT ON FUNCTION update_user_location IS 'Update user location with address, city, state, zip, country and add entry to history';
