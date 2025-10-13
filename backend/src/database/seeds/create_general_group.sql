-- Create a General group that allows public posting
-- This group is accessible to all users without membership requirement

-- First, check if the group already exists and delete it if it does
DELETE FROM groups WHERE slug = 'general';

-- Insert the General group
DO $$
DECLARE
    admin_user_id INTEGER;
    general_group_id INTEGER;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin_alice' LIMIT 1;

    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users LIMIT 1;
    END IF;

    -- Insert the General group
    INSERT INTO groups (
        name,
        slug,
        display_name,
        description,
        visibility,
        require_approval,
        allow_posts,
        post_approval_required,
        allow_multimedia,
        allow_public_posting,
        creator_id,
        created_at,
        updated_at
    ) VALUES (
        'general',
        'general',
        'General',
        'A public space for everyone! Post anything you want - no membership required. This is a general discussion board open to all users.',
        'public',
        FALSE,
        TRUE,
        FALSE,
        TRUE,
        TRUE,  -- This is the key setting that allows public posting
        admin_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO general_group_id;

    -- Make the admin user the admin of this group
    IF admin_user_id IS NOT NULL AND general_group_id IS NOT NULL THEN
        INSERT INTO group_memberships (
            group_id,
            user_id,
            role,
            status,
            joined_at
        ) VALUES (
            general_group_id,
            admin_user_id,
            'admin',
            'active',
            CURRENT_TIMESTAMP
        );
    END IF;
END $$;

SELECT 'General group created successfully!' AS result;
