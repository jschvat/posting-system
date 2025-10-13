-- Create location-restricted example groups
-- Demonstrates different types of geolocation restrictions

-- Get admin user ID for creating groups
DO $$
DECLARE
    admin_user_id INTEGER;
    sf_group_id INTEGER;
    ca_group_id INTEGER;
    usa_group_id INTEGER;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin_alice' LIMIT 1;

    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users LIMIT 1;
    END IF;

    -- 1. San Francisco Bay Area Group (Radius-based: 50km from downtown SF)
    INSERT INTO groups (
        name,
        slug,
        display_name,
        description,
        visibility,
        require_approval,
        allow_posts,
        allow_public_posting,
        location_restricted,
        location_type,
        location_latitude,
        location_longitude,
        location_radius_km,
        location_name,
        creator_id,
        created_at,
        updated_at
    ) VALUES (
        'sf-bay-area',
        'sf-bay-area',
        'SF Bay Area',
        'A group for people in the San Francisco Bay Area. Share local events, news, and connect with neighbors! Location restricted to within 50km of downtown San Francisco.',
        'public',
        FALSE,
        TRUE,
        FALSE,
        TRUE,  -- Location restricted
        'radius',  -- Radius-based restriction
        37.7749,  -- SF latitude
        -122.4194,  -- SF longitude
        50,  -- 50km radius
        'San Francisco Bay Area',
        admin_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO sf_group_id;

    -- Add admin as group admin
    INSERT INTO group_memberships (
        group_id,
        user_id,
        role,
        status,
        joined_at
    ) VALUES (
        sf_group_id,
        admin_user_id,
        'admin',
        'active',
        CURRENT_TIMESTAMP
    );

    -- 2. California Group (State-based restriction)
    INSERT INTO groups (
        name,
        slug,
        display_name,
        description,
        visibility,
        require_approval,
        allow_posts,
        allow_public_posting,
        location_restricted,
        location_type,
        location_state,
        location_name,
        creator_id,
        created_at,
        updated_at
    ) VALUES (
        'california',
        'california',
        'California',
        'For Californians only! Discuss state politics, events, and lifestyle. Must be located in California to join.',
        'public',
        FALSE,
        TRUE,
        FALSE,
        TRUE,  -- Location restricted
        'state',  -- State-based restriction
        'California',
        'California',
        admin_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO ca_group_id;

    -- Add admin as group admin
    INSERT INTO group_memberships (
        group_id,
        user_id,
        role,
        status,
        joined_at
    ) VALUES (
        ca_group_id,
        admin_user_id,
        'admin',
        'active',
        CURRENT_TIMESTAMP
    );

    -- 3. USA Group (Country-based restriction)
    INSERT INTO groups (
        name,
        slug,
        display_name,
        description,
        visibility,
        require_approval,
        allow_posts,
        allow_public_posting,
        location_restricted,
        location_type,
        location_country,
        location_name,
        creator_id,
        created_at,
        updated_at
    ) VALUES (
        'usa',
        'usa',
        'United States',
        'A community for people in the United States. Discuss national news, politics, and culture. US location required.',
        'public',
        FALSE,
        TRUE,
        FALSE,
        TRUE,  -- Location restricted
        'country',  -- Country-based restriction
        'US',
        'United States',
        admin_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO usa_group_id;

    -- Add admin as group admin
    INSERT INTO group_memberships (
        group_id,
        user_id,
        role,
        status,
        joined_at
    ) VALUES (
        usa_group_id,
        admin_user_id,
        'admin',
        'active',
        CURRENT_TIMESTAMP
    );

END $$;

SELECT 'Location-restricted groups created successfully!' AS result;
SELECT name, slug, location_type, location_restricted FROM groups WHERE location_restricted = TRUE;
