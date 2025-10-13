-- ============================================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Generated from current database state
-- Database: posting_system
-- ============================================================================

-- Drop all existing objects (use with caution!)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO dev_user;
GRANT ALL ON SCHEMA public TO public;

 -- Extension: ltree                        +
 CREATE EXTENSION IF NOT EXISTS "ltree";
 -- Extension: uuid-ossp                    +
 CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- CUSTOM FUNCTIONS
-- ============================================================================


CREATE OR REPLACE FUNCTION public.calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)

 RETURNS numeric

 LANGUAGE plpgsql

 IMMUTABLE

AS $function$

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

$function$

;

CREATE OR REPLACE FUNCTION public.calculate_engagement_score(reply_count integer, reaction_count integer, deep_read_count integer, view_count integer)

 RETURNS double precision

 LANGUAGE plpgsql

AS $function$

BEGIN

  IF view_count = 0 THEN

    RETURN 0;

  END IF;



  -- Engagement score based on interaction ratios

  RETURN (

    (reply_count * 10.0) +

    (reaction_count * 5.0) +

    (deep_read_count * 2.0)

  ) / view_count::FLOAT * 100;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.calculate_interaction_rate(total_interactions integer, created_at timestamp without time zone)

 RETURNS double precision

 LANGUAGE plpgsql

AS $function$

DECLARE

  hours_since_creation FLOAT;

BEGIN

  hours_since_creation := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600;

  IF hours_since_creation <= 0 THEN

    RETURN 0;

  END IF;

  RETURN total_interactions::FLOAT / hours_since_creation;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.calculate_recency_score(comment_created_at timestamp without time zone)

 RETURNS double precision

 LANGUAGE plpgsql

AS $function$

BEGIN

  -- Higher score for newer comments (max 100, decays over 30 days)

  RETURN GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - comment_created_at)) / 86400 / 30 * 100);

END;

$function$

;

CREATE OR REPLACE FUNCTION public.calculate_reputation_score(p_user_id integer)

 RETURNS integer

 LANGUAGE plpgsql

AS $function$

DECLARE

    v_score INTEGER := 0;

    v_avg_rating DECIMAL(3,2);

    v_total_ratings INTEGER;

    v_quality_posts INTEGER;

    v_quality_comments INTEGER;

    v_helpful INTEGER;

    v_verified INTEGER;

    v_reported INTEGER;

    v_level VARCHAR(20);

BEGIN

    -- Get reputation data

    SELECT

        COALESCE(average_rating, 0),

        COALESCE(total_ratings_received, 0),

        COALESCE(verified_ratings_count, 0),

        COALESCE(helpful_count, 0),

        COALESCE(reported_count, 0),

        COALESCE(quality_posts_count, 0),

        COALESCE(quality_comments_count, 0)

    INTO

        v_avg_rating,

        v_total_ratings,

        v_verified,

        v_helpful,

        v_reported,

        v_quality_posts,

        v_quality_comments

    FROM user_reputation

    WHERE user_id = p_user_id;



    -- If no reputation record, return 0

    IF v_avg_rating IS NULL THEN

        RETURN 0;

    END IF;



    -- Base score from average rating (max 500)

    v_score := v_score + (v_avg_rating * 100)::INTEGER;



    -- Volume bonus (max 100)

    v_score := v_score + LEAST(v_total_ratings * 2, 100);



    -- Quality content bonus (max 250)

    v_score := v_score + LEAST(v_quality_posts * 5, 150);

    v_score := v_score + LEAST(v_quality_comments * 3, 100);



    -- Helpful bonus (max 100)

    v_score := v_score + LEAST(v_helpful * 2, 100);



    -- Verified bonus (max 50)

    v_score := v_score + LEAST(v_verified * 3, 50);



    -- Penalties

    v_score := v_score - (v_reported * 10);



    -- Clamp to 0-1000

    v_score := GREATEST(0, LEAST(1000, v_score));



    -- Determine level

    IF v_score >= 850 THEN v_level := 'legend';

    ELSIF v_score >= 700 THEN v_level := 'expert';

    ELSIF v_score >= 500 THEN v_level := 'veteran';

    ELSIF v_score >= 300 THEN v_level := 'contributor';

    ELSIF v_score >= 100 THEN v_level := 'member';

    ELSE v_level := 'newcomer';

    END IF;



    -- Update reputation

    UPDATE user_reputation

    SET

        reputation_score = v_score,

        reputation_level = v_level,

        reputation_peak = GREATEST(COALESCE(reputation_peak, 0), v_score),

        reputation_peak_at = CASE

            WHEN v_score > COALESCE(reputation_peak, 0) THEN CURRENT_TIMESTAMP

            ELSE reputation_peak_at

        END,

        updated_at = CURRENT_TIMESTAMP

    WHERE user_id = p_user_id;



    RETURN v_score;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.cleanup_nearby_search_cache()

 RETURNS integer

 LANGUAGE plpgsql

AS $function$

DECLARE

    deleted_count INTEGER;

BEGIN

    DELETE FROM nearby_search_cache

    WHERE expires_at < CURRENT_TIMESTAMP;



    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.find_nearby_users(p_user_id integer, p_lat numeric, p_lon numeric, p_radius_miles integer DEFAULT 25, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)

 RETURNS TABLE(user_id integer, username character varying, first_name character varying, last_name character varying, avatar_url character varying, distance_miles numeric, location_city character varying, location_state character varying, location_sharing character varying)

 LANGUAGE plpgsql

AS $function$

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

$function$

;

CREATE OR REPLACE FUNCTION public.get_group_user_role(p_user_id integer, p_group_id integer)

 RETURNS character varying

 LANGUAGE plpgsql

AS $function$

DECLARE

    user_role VARCHAR(20);

BEGIN

    SELECT role INTO user_role

    FROM group_memberships

    WHERE user_id = p_user_id

    AND group_id = p_group_id

    AND status = 'active';



    RETURN user_role;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.get_user_location(p_user_id integer)

 RETURNS TABLE(latitude numeric, longitude numeric, address character varying, city character varying, state character varying, zip character varying, country character varying, accuracy integer, updated_at timestamp without time zone, sharing character varying)

 LANGUAGE plpgsql

AS $function$

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

$function$

;

CREATE OR REPLACE FUNCTION public.initialize_user_stats()

 RETURNS void

 LANGUAGE plpgsql

AS $function$

BEGIN

    INSERT INTO user_stats (user_id, post_count, last_post_at)

    SELECT

        u.id,

        COUNT(p.id),

        MAX(p.created_at)

    FROM users u

    LEFT JOIN posts p ON u.id = p.user_id

    WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = u.id)

    GROUP BY u.id;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_user_id integer, p_group_id integer)

 RETURNS boolean

 LANGUAGE plpgsql

AS $function$

BEGIN

    RETURN EXISTS (

        SELECT 1

        FROM group_memberships

        WHERE user_id = p_user_id

        AND group_id = p_group_id

        AND status = 'active'

        AND role = 'admin'

    );

END;

$function$

;

CREATE OR REPLACE FUNCTION public.is_group_member(p_user_id integer, p_group_id integer)

 RETURNS boolean

 LANGUAGE plpgsql

AS $function$

BEGIN

    RETURN EXISTS (

        SELECT 1

        FROM group_memberships

        WHERE user_id = p_user_id

        AND group_id = p_group_id

        AND status = 'active'

    );

END;

$function$

;

CREATE OR REPLACE FUNCTION public.is_group_moderator(p_user_id integer, p_group_id integer)

 RETURNS boolean

 LANGUAGE plpgsql

AS $function$

BEGIN

    RETURN EXISTS (

        SELECT 1

        FROM group_memberships

        WHERE user_id = p_user_id

        AND group_id = p_group_id

        AND status = 'active'

        AND role IN ('moderator', 'admin')

    );

END;

$function$

;

CREATE OR REPLACE FUNCTION public.limit_location_history()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

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

$function$

;

CREATE OR REPLACE FUNCTION public.set_group_comment_path()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

DECLARE

    parent_path LTREE;

BEGIN

    IF NEW.parent_id IS NULL THEN

        -- Top-level comment

        NEW.path := text2ltree(NEW.id::text);

        NEW.depth := 0;

    ELSE

        -- Nested comment

        SELECT path, depth INTO parent_path, NEW.depth

        FROM group_comments

        WHERE id = NEW.parent_id;



        IF parent_path IS NULL THEN

            RAISE EXCEPTION 'Parent comment not found';

        END IF;



        NEW.path := parent_path || text2ltree(NEW.id::text);

        NEW.depth := NEW.depth + 1;

    END IF;



    RETURN NEW;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_comment_metrics()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

BEGIN

  -- Insert metrics record if it doesn't exist

  INSERT INTO comment_metrics (comment_id, first_interaction_at)

  VALUES (NEW.comment_id, NEW.created_at)

  ON CONFLICT (comment_id) DO NOTHING;



  -- Update aggregated counts and scores

  UPDATE comment_metrics SET

    view_count = view_count + CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,

    reply_count = reply_count + CASE WHEN NEW.interaction_type = 'reply' THEN 1 ELSE 0 END,

    reaction_count = reaction_count + CASE WHEN NEW.interaction_type = 'reaction' THEN 1 ELSE 0 END,

    share_count = share_count + CASE WHEN NEW.interaction_type = 'share' THEN 1 ELSE 0 END,

    deep_read_count = deep_read_count + CASE WHEN NEW.interaction_type = 'deep_read' THEN 1 ELSE 0 END,

    total_interaction_count = total_interaction_count + 1,

    last_interaction_at = NEW.created_at,

    last_updated = NOW()

  WHERE comment_id = NEW.comment_id;



  -- Recalculate algorithm scores

  UPDATE comment_metrics cm SET

    recency_score = calculate_recency_score(c.created_at),

    interaction_rate = calculate_interaction_rate(cm.total_interaction_count, c.created_at),

    engagement_score = calculate_engagement_score(cm.reply_count, cm.reaction_count, cm.deep_read_count, cm.view_count),

    combined_algorithm_score = (

      calculate_recency_score(c.created_at) * 0.3 +

      calculate_interaction_rate(cm.total_interaction_count, c.created_at) * 0.4 +

      calculate_engagement_score(cm.reply_count, cm.reaction_count, cm.deep_read_count, cm.view_count) * 0.3

    )

  FROM comments c

  WHERE cm.comment_id = NEW.comment_id AND c.id = NEW.comment_id;



  RETURN NEW;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_follow_counts()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

BEGIN

    IF (TG_OP = 'INSERT') THEN

        -- Increment following count for follower

        INSERT INTO user_stats (user_id, following_count)

        VALUES (NEW.follower_id, 1)

        ON CONFLICT (user_id) DO UPDATE

        SET following_count = user_stats.following_count + 1,

            updated_at = CURRENT_TIMESTAMP;



        -- Increment follower count for following

        INSERT INTO user_stats (user_id, follower_count)

        VALUES (NEW.following_id, 1)

        ON CONFLICT (user_id) DO UPDATE

        SET follower_count = user_stats.follower_count + 1,

            updated_at = CURRENT_TIMESTAMP;



    ELSIF (TG_OP = 'DELETE') THEN

        -- Decrement following count for follower

        UPDATE user_stats

        SET following_count = GREATEST(0, following_count - 1),

            updated_at = CURRENT_TIMESTAMP

        WHERE user_id = OLD.follower_id;



        -- Decrement follower count for following

        UPDATE user_stats

        SET follower_count = GREATEST(0, follower_count - 1),

            updated_at = CURRENT_TIMESTAMP

        WHERE user_id = OLD.following_id;

    END IF;



    RETURN NULL;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_group_comment_votes()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

DECLARE

    upvote_count INTEGER;

    downvote_count INTEGER;

    new_score INTEGER;

    target_comment_id INTEGER;

BEGIN

    -- Get comment_id from NEW or OLD

    target_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);



    -- Skip if this is for a post vote

    IF target_comment_id IS NULL THEN

        RETURN NULL;

    END IF;



    -- Get current vote counts

    SELECT

        COUNT(*) FILTER (WHERE vote_type = 'upvote'),

        COUNT(*) FILTER (WHERE vote_type = 'downvote')

    INTO upvote_count, downvote_count

    FROM group_votes

    WHERE comment_id = target_comment_id;



    -- Calculate score

    new_score := upvote_count - downvote_count;



    -- Update comment

    UPDATE group_comments

    SET

        upvotes = upvote_count,

        downvotes = downvote_count,

        score = new_score,

        updated_at = CURRENT_TIMESTAMP

    WHERE id = target_comment_id;



    RETURN NULL;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_group_member_count()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

BEGIN

    IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN

        UPDATE groups

        SET member_count = member_count + 1,

            updated_at = CURRENT_TIMESTAMP

        WHERE id = NEW.group_id;

    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'active') THEN

        UPDATE groups

        SET member_count = GREATEST(0, member_count - 1),

            updated_at = CURRENT_TIMESTAMP

        WHERE id = OLD.group_id;

    ELSIF (TG_OP = 'UPDATE') THEN

        -- Status changed from active to something else

        IF OLD.status = 'active' AND NEW.status != 'active' THEN

            UPDATE groups

            SET member_count = GREATEST(0, member_count - 1),

                updated_at = CURRENT_TIMESTAMP

            WHERE id = NEW.group_id;

        -- Status changed to active from something else

        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN

            UPDATE groups

            SET member_count = member_count + 1,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = NEW.group_id;

        END IF;

    END IF;



    RETURN NULL;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_group_post_comment_count()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

BEGIN

    IF (TG_OP = 'INSERT' AND NEW.status = 'published') THEN

        UPDATE group_posts

        SET comment_count = comment_count + 1,

            updated_at = CURRENT_TIMESTAMP

        WHERE id = NEW.post_id;

    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'published') THEN

        UPDATE group_posts

        SET comment_count = GREATEST(0, comment_count - 1),

            updated_at = CURRENT_TIMESTAMP

        WHERE id = OLD.post_id;

    ELSIF (TG_OP = 'UPDATE') THEN

        IF OLD.status = 'published' AND NEW.status != 'published' THEN

            UPDATE group_posts

            SET comment_count = GREATEST(0, comment_count - 1),

                updated_at = CURRENT_TIMESTAMP

            WHERE id = NEW.post_id;

        ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN

            UPDATE group_posts

            SET comment_count = comment_count + 1,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = NEW.post_id;

        END IF;

    END IF;



    RETURN NULL;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_group_post_count()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

BEGIN

    IF (TG_OP = 'INSERT' AND NEW.status = 'published') THEN

        UPDATE groups

        SET post_count = post_count + 1,

            updated_at = CURRENT_TIMESTAMP

        WHERE id = NEW.group_id;

    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'published') THEN

        UPDATE groups

        SET post_count = GREATEST(0, post_count - 1),

            updated_at = CURRENT_TIMESTAMP

        WHERE id = OLD.group_id;

    ELSIF (TG_OP = 'UPDATE') THEN

        IF OLD.status = 'published' AND NEW.status != 'published' THEN

            UPDATE groups

            SET post_count = GREATEST(0, post_count - 1),

                updated_at = CURRENT_TIMESTAMP

            WHERE id = NEW.group_id;

        ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN

            UPDATE groups

            SET post_count = post_count + 1,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = NEW.group_id;

        END IF;

    END IF;



    RETURN NULL;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_group_post_votes()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

DECLARE

    upvote_count INTEGER;

    downvote_count INTEGER;

    new_score INTEGER;

    target_post_id INTEGER;

BEGIN

    -- Get post_id from NEW or OLD

    target_post_id := COALESCE(NEW.post_id, OLD.post_id);



    -- Skip if this is for a comment vote

    IF target_post_id IS NULL THEN

        RETURN NULL;

    END IF;



    -- Get current vote counts

    SELECT

        COUNT(*) FILTER (WHERE vote_type = 'upvote'),

        COUNT(*) FILTER (WHERE vote_type = 'downvote')

    INTO upvote_count, downvote_count

    FROM group_votes

    WHERE post_id = target_post_id;



    -- Calculate score

    new_score := upvote_count - downvote_count;



    -- Update post

    UPDATE group_posts

    SET

        upvotes = upvote_count,

        downvotes = downvote_count,

        score = new_score,

        updated_at = CURRENT_TIMESTAMP

    WHERE id = target_post_id;



    RETURN NULL;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_helpful_count()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

DECLARE

    target_user_id INTEGER;

BEGIN

    -- Get the user who created the content

    IF NEW.target_type = 'post' THEN

        SELECT user_id INTO target_user_id FROM posts WHERE id = NEW.target_id;

    ELSIF NEW.target_type = 'comment' THEN

        SELECT user_id INTO target_user_id FROM comments WHERE id = NEW.target_id;

    ELSIF NEW.target_type = 'user' THEN

        target_user_id := NEW.target_id;

    END IF;



    IF target_user_id IS NOT NULL THEN

        -- Increment helpful count

        INSERT INTO user_reputation (user_id, helpful_count)

        VALUES (target_user_id, 1)

        ON CONFLICT (user_id) DO UPDATE

        SET helpful_count = user_reputation.helpful_count + 1,

            updated_at = CURRENT_TIMESTAMP;



        -- Recalculate reputation score

        PERFORM calculate_reputation_score(target_user_id);

    END IF;



    RETURN NEW;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_share_counts()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

DECLARE

    post_owner_id INTEGER;

BEGIN

    -- Get the post owner

    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;



    IF (TG_OP = 'INSERT') THEN

        -- Increment share count for post owner

        UPDATE user_stats

        SET total_shares_received = total_shares_received + 1,

            updated_at = CURRENT_TIMESTAMP

        WHERE user_id = post_owner_id;



    ELSIF (TG_OP = 'DELETE') THEN

        -- Decrement share count for post owner

        UPDATE user_stats

        SET total_shares_received = GREATEST(0, total_shares_received - 1),

            updated_at = CURRENT_TIMESTAMP

        WHERE user_id = post_owner_id;

    END IF;



    RETURN NULL;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$function$

;

CREATE OR REPLACE FUNCTION public.update_user_location(p_user_id integer, p_lat numeric, p_lon numeric, p_address character varying DEFAULT NULL::character varying, p_city character varying DEFAULT NULL::character varying, p_state character varying DEFAULT NULL::character varying, p_zip character varying DEFAULT NULL::character varying, p_country character varying DEFAULT NULL::character varying, p_accuracy integer DEFAULT NULL::integer, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)

 RETURNS boolean

 LANGUAGE plpgsql

AS $function$

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

$function$

;

CREATE OR REPLACE FUNCTION public.update_user_reputation()

 RETURNS trigger

 LANGUAGE plpgsql

AS $function$

DECLARE

    target_user_id INTEGER;

    avg_rating DECIMAL(3,2);

    total_count INTEGER;

    pos_count INTEGER;

    neu_count INTEGER;

    neg_count INTEGER;

    verified_count INTEGER;

    dist JSONB;

    post_avg DECIMAL(3,2);

    comment_avg DECIMAL(3,2);

    interaction_avg DECIMAL(3,2);

    first_rating TIMESTAMP;

BEGIN

    -- Determine which user's reputation to update

    IF (TG_OP = 'DELETE') THEN

        target_user_id := OLD.rated_user_id;

    ELSE

        target_user_id := NEW.rated_user_id;

    END IF;



    -- Calculate aggregated metrics

    SELECT

        COALESCE(AVG(rating_value), 0),

        COUNT(*),

        COUNT(*) FILTER (WHERE rating_value >= 4),

        COUNT(*) FILTER (WHERE rating_value = 3),

        COUNT(*) FILTER (WHERE rating_value <= 2),

        COUNT(*) FILTER (WHERE is_verified = true),

        jsonb_build_object(

            '1', COUNT(*) FILTER (WHERE rating_value = 1),

            '2', COUNT(*) FILTER (WHERE rating_value = 2),

            '3', COUNT(*) FILTER (WHERE rating_value = 3),

            '4', COUNT(*) FILTER (WHERE rating_value = 4),

            '5', COUNT(*) FILTER (WHERE rating_value = 5)

        ),

        MIN(created_at)

    INTO avg_rating, total_count, pos_count, neu_count, neg_count, verified_count, dist, first_rating

    FROM user_ratings

    WHERE rated_user_id = target_user_id;



    -- Calculate category averages

    SELECT COALESCE(AVG(rating_value), 0) INTO post_avg

    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'post';



    SELECT COALESCE(AVG(rating_value), 0) INTO comment_avg

    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'comment';



    SELECT COALESCE(AVG(rating_value), 0) INTO interaction_avg

    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'interaction';



    -- Upsert reputation record

    INSERT INTO user_reputation (

        user_id,

        total_ratings_received,

        average_rating,

        rating_distribution,

        positive_ratings_count,

        neutral_ratings_count,

        negative_ratings_count,

        verified_ratings_count,

        post_rating_avg,

        comment_rating_avg,

        interaction_rating_avg,

        first_rating_at,

        last_rating_at

    ) VALUES (

        target_user_id,

        total_count,

        avg_rating,

        dist,

        pos_count,

        neu_count,

        neg_count,

        verified_count,

        post_avg,

        comment_avg,

        interaction_avg,

        first_rating,

        CURRENT_TIMESTAMP

    )

    ON CONFLICT (user_id) DO UPDATE SET

        total_ratings_received = total_count,

        average_rating = avg_rating,

        rating_distribution = dist,

        positive_ratings_count = pos_count,

        neutral_ratings_count = neu_count,

        negative_ratings_count = neg_count,

        verified_ratings_count = verified_count,

        post_rating_avg = post_avg,

        comment_rating_avg = comment_avg,

        interaction_rating_avg = interaction_avg,

        first_rating_at = COALESCE(user_reputation.first_rating_at, first_rating),

        last_rating_at = CURRENT_TIMESTAMP,

        updated_at = CURRENT_TIMESTAMP;



    RETURN NULL;

END;

$function$

;

-- ============================================================================
-- TABLES
-- ============================================================================


-- ============================================================================
-- INDEXES
-- ============================================================================

 CREATE INDEX idx_comment_interactions_comment_type ON public.comment_interactions USING btree (comment_id, interaction_type);
 CREATE INDEX idx_comment_interactions_created_at ON public.comment_interactions USING btree (created_at);
 CREATE INDEX idx_comment_interactions_session_id ON public.comment_interactions USING btree (session_id);
 CREATE INDEX idx_comment_interactions_user_id ON public.comment_interactions USING btree (user_id);
 CREATE INDEX idx_comment_metrics_algorithm_score ON public.comment_metrics USING btree (combined_algorithm_score DESC);
 CREATE INDEX idx_comment_metrics_interaction_rate ON public.comment_metrics USING btree (interaction_rate DESC);
 CREATE INDEX idx_comment_metrics_last_interaction ON public.comment_metrics USING btree (last_interaction_at DESC);
 CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at);
 CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_id);
 CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);
 CREATE INDEX idx_comments_user_id ON public.comments USING btree (user_id);
 CREATE INDEX idx_follows_composite ON public.follows USING btree (follower_id, following_id, status);
 CREATE INDEX idx_follows_created_at ON public.follows USING btree (created_at);
 CREATE INDEX idx_follows_follower_id ON public.follows USING btree (follower_id);
 CREATE INDEX idx_follows_following_id ON public.follows USING btree (following_id);
 CREATE INDEX idx_follows_status ON public.follows USING btree (status);
 CREATE UNIQUE INDEX unique_follow ON public.follows USING btree (follower_id, following_id);
 CREATE INDEX idx_group_activity_log_action ON public.group_activity_log USING btree (action_type);
 CREATE INDEX idx_group_activity_log_created ON public.group_activity_log USING btree (created_at DESC);
 CREATE INDEX idx_group_activity_log_group ON public.group_activity_log USING btree (group_id);
 CREATE INDEX idx_group_comment_media_comment ON public.group_comment_media USING btree (comment_id);
 CREATE INDEX idx_group_comments_created ON public.group_comments USING btree (created_at DESC);
 CREATE INDEX idx_group_comments_parent ON public.group_comments USING btree (parent_id);
 CREATE INDEX idx_group_comments_path ON public.group_comments USING gist (path);
 CREATE INDEX idx_group_comments_post ON public.group_comments USING btree (post_id);
 CREATE INDEX idx_group_comments_score ON public.group_comments USING btree (post_id, score DESC);
 CREATE INDEX idx_group_comments_user ON public.group_comments USING btree (user_id);
 CREATE UNIQUE INDEX group_invitations_token_key ON public.group_invitations USING btree (token);
 CREATE INDEX idx_group_invitations_group ON public.group_invitations USING btree (group_id);
 CREATE INDEX idx_group_invitations_invitee ON public.group_invitations USING btree (invitee_id);
 CREATE INDEX idx_group_invitations_status ON public.group_invitations USING btree (status);
 CREATE INDEX idx_group_invitations_token ON public.group_invitations USING btree (token);
 CREATE UNIQUE INDEX group_memberships_group_id_user_id_key ON public.group_memberships USING btree (group_id, user_id);
 CREATE INDEX idx_group_memberships_group ON public.group_memberships USING btree (group_id);
 CREATE INDEX idx_group_memberships_role ON public.group_memberships USING btree (group_id, role);
 CREATE INDEX idx_group_memberships_status ON public.group_memberships USING btree (status);
 CREATE INDEX idx_group_memberships_user ON public.group_memberships USING btree (user_id);
 CREATE INDEX idx_group_post_media_post ON public.group_post_media USING btree (post_id);
 CREATE INDEX idx_group_post_media_type ON public.group_post_media USING btree (media_type);
 CREATE INDEX idx_group_posts_created ON public.group_posts USING btree (group_id, created_at DESC);
 CREATE INDEX idx_group_posts_group ON public.group_posts USING btree (group_id);
 CREATE INDEX idx_group_posts_pinned ON public.group_posts USING btree (group_id, is_pinned, created_at DESC);
 CREATE INDEX idx_group_posts_score ON public.group_posts USING btree (group_id, score DESC);
 CREATE INDEX idx_group_posts_status ON public.group_posts USING btree (status);
 CREATE INDEX idx_group_posts_user ON public.group_posts USING btree (user_id);
 CREATE INDEX idx_group_votes_comment ON public.group_votes USING btree (comment_id);
 CREATE INDEX idx_group_votes_post ON public.group_votes USING btree (post_id);
 CREATE INDEX idx_group_votes_user ON public.group_votes USING btree (user_id);
 CREATE UNIQUE INDEX unique_comment_vote ON public.group_votes USING btree (user_id, comment_id);
 CREATE UNIQUE INDEX unique_post_vote ON public.group_votes USING btree (user_id, post_id);
 CREATE UNIQUE INDEX groups_name_key ON public.groups USING btree (name);
 CREATE UNIQUE INDEX groups_slug_key ON public.groups USING btree (slug);
 CREATE INDEX idx_groups_created ON public.groups USING btree (created_at DESC);
 CREATE INDEX idx_groups_creator ON public.groups USING btree (creator_id);
 CREATE INDEX idx_groups_location_coords ON public.groups USING btree (location_latitude, location_longitude) WHERE (location_restricted = true);
 CREATE INDEX idx_groups_location_restricted ON public.groups USING btree (location_restricted) WHERE (location_restricted = true);
 CREATE INDEX idx_groups_name_search ON public.groups USING gin (to_tsvector('english'::regconfig, (((display_name)::text || ' '::text) || COALESCE(description, ''::text))));
 CREATE INDEX idx_groups_slug ON public.groups USING btree (slug);
 CREATE INDEX idx_groups_visibility ON public.groups USING btree (visibility);
 CREATE INDEX idx_helpful_marks_target ON public.helpful_marks USING btree (target_type, target_id);
 CREATE INDEX idx_helpful_marks_user ON public.helpful_marks USING btree (user_id);
 CREATE UNIQUE INDEX unique_helpful_mark ON public.helpful_marks USING btree (user_id, target_type, target_id);
 CREATE INDEX idx_location_history_coords ON public.location_history USING btree (location_latitude, location_longitude);
 CREATE INDEX idx_location_history_created_at ON public.location_history USING btree (created_at DESC);
 CREATE INDEX idx_location_history_user_id ON public.location_history USING btree (user_id);
 CREATE INDEX idx_media_comment_id ON public.media USING btree (comment_id);
 CREATE INDEX idx_media_post_id ON public.media USING btree (post_id);
 CREATE INDEX idx_media_type ON public.media USING btree (media_type);
 CREATE INDEX idx_media_user_id ON public.media USING btree (user_id);
 CREATE INDEX idx_nearby_cache_coords ON public.nearby_search_cache USING btree (search_lat, search_lon);
 CREATE INDEX idx_nearby_cache_expires_at ON public.nearby_search_cache USING btree (expires_at);
 CREATE INDEX idx_nearby_cache_user_id ON public.nearby_search_cache USING btree (user_id);
 CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at);
 CREATE INDEX idx_posts_privacy_level ON public.posts USING btree (privacy_level);
 CREATE INDEX idx_posts_published ON public.posts USING btree (is_published);
 CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);
 CREATE INDEX idx_rating_reports_rating ON public.rating_reports USING btree (rating_id);
 CREATE INDEX idx_rating_reports_reporter ON public.rating_reports USING btree (reporter_id);
 CREATE INDEX idx_rating_reports_status ON public.rating_reports USING btree (status);
 CREATE INDEX idx_reactions_comment_id ON public.reactions USING btree (comment_id);
 CREATE INDEX idx_reactions_emoji_name ON public.reactions USING btree (emoji_name);
 CREATE INDEX idx_reactions_post_id ON public.reactions USING btree (post_id);
 CREATE INDEX idx_reactions_user_id ON public.reactions USING btree (user_id);
 CREATE UNIQUE INDEX unique_user_comment_emoji ON public.reactions USING btree (user_id, comment_id, emoji_name);
 CREATE UNIQUE INDEX unique_user_post_emoji ON public.reactions USING btree (user_id, post_id, emoji_name);
 CREATE INDEX idx_shares_composite ON public.shares USING btree (post_id, created_at DESC);
 CREATE INDEX idx_shares_created_at ON public.shares USING btree (created_at);
 CREATE INDEX idx_shares_post_id ON public.shares USING btree (post_id);
 CREATE INDEX idx_shares_type ON public.shares USING btree (share_type);
 CREATE INDEX idx_shares_user_id ON public.shares USING btree (user_id);
 CREATE UNIQUE INDEX unique_user_share ON public.shares USING btree (user_id, post_id);
 CREATE INDEX idx_timeline_expires_at ON public.timeline_cache USING btree (expires_at);
 CREATE INDEX idx_timeline_post_id ON public.timeline_cache USING btree (post_id);
 CREATE INDEX idx_timeline_reason ON public.timeline_cache USING btree (reason);
 CREATE INDEX idx_timeline_user_created ON public.timeline_cache USING btree (user_id, created_at DESC);
 CREATE INDEX idx_timeline_user_score ON public.timeline_cache USING btree (user_id, score DESC);
 CREATE UNIQUE INDEX unique_user_post_timeline ON public.timeline_cache USING btree (user_id, post_id);
 CREATE INDEX idx_user_ratings_context ON public.user_ratings USING btree (context_type, context_id);
 CREATE INDEX idx_user_ratings_created ON public.user_ratings USING btree (created_at DESC);
 CREATE INDEX idx_user_ratings_rated_user ON public.user_ratings USING btree (rated_user_id);
 CREATE INDEX idx_user_ratings_rater ON public.user_ratings USING btree (rater_id);
 CREATE INDEX idx_user_ratings_type ON public.user_ratings USING btree (rating_type);
 CREATE UNIQUE INDEX unique_rating ON public.user_ratings USING btree (rater_id, rated_user_id, context_type, context_id);
 CREATE INDEX idx_user_reputation_avg_rating ON public.user_reputation USING btree (average_rating DESC);
 CREATE INDEX idx_user_reputation_level ON public.user_reputation USING btree (reputation_level);
 CREATE INDEX idx_user_reputation_score ON public.user_reputation USING btree (reputation_score DESC);
 CREATE INDEX idx_user_stats_engagement_score ON public.user_stats USING btree (engagement_score DESC);
 CREATE INDEX idx_user_stats_follower_count ON public.user_stats USING btree (follower_count DESC);
 CREATE INDEX idx_user_stats_last_post_at ON public.user_stats USING btree (last_post_at DESC);
 CREATE INDEX idx_users_active ON public.users USING btree (is_active);
 CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);
 CREATE INDEX idx_users_email ON public.users USING btree (email);
 CREATE INDEX idx_users_location_coords ON public.users USING btree (location_latitude, location_longitude);
 CREATE INDEX idx_users_location_sharing ON public.users USING btree (location_sharing);
 CREATE INDEX idx_users_location_updated ON public.users USING btree (location_updated_at);
 CREATE INDEX idx_users_username ON public.users USING btree (username);
 CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
 CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


-- ============================================================================
-- TRIGGERS
-- ============================================================================

 CREATE TRIGGER comment_interaction_metrics_trigger AFTER INSERT ON public.comment_interactions FOR EACH ROW EXECUTE FUNCTION update_comment_metrics();
 CREATE TRIGGER trigger_limit_location_history AFTER INSERT ON public.location_history FOR EACH ROW EXECUTE FUNCTION limit_location_history();
 CREATE TRIGGER trigger_set_group_comment_path BEFORE INSERT ON public.group_comments FOR EACH ROW EXECUTE FUNCTION set_group_comment_path();
 CREATE TRIGGER trigger_update_follow_counts AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION update_follow_counts();
 CREATE TRIGGER trigger_update_group_comment_votes AFTER INSERT OR DELETE OR UPDATE ON public.group_votes FOR EACH ROW EXECUTE FUNCTION update_group_comment_votes();
 CREATE TRIGGER trigger_update_group_member_count AFTER INSERT OR DELETE OR UPDATE ON public.group_memberships FOR EACH ROW EXECUTE FUNCTION update_group_member_count();
 CREATE TRIGGER trigger_update_group_post_comment_count AFTER INSERT OR DELETE OR UPDATE ON public.group_comments FOR EACH ROW EXECUTE FUNCTION update_group_post_comment_count();
 CREATE TRIGGER trigger_update_group_post_count AFTER INSERT OR DELETE OR UPDATE ON public.group_posts FOR EACH ROW EXECUTE FUNCTION update_group_post_count();
 CREATE TRIGGER trigger_update_group_post_votes AFTER INSERT OR DELETE OR UPDATE ON public.group_votes FOR EACH ROW EXECUTE FUNCTION update_group_post_votes();
 CREATE TRIGGER trigger_update_helpful_count AFTER INSERT ON public.helpful_marks FOR EACH ROW EXECUTE FUNCTION update_helpful_count();
 CREATE TRIGGER trigger_update_share_counts AFTER INSERT OR DELETE ON public.shares FOR EACH ROW EXECUTE FUNCTION update_share_counts();
 CREATE TRIGGER trigger_update_user_reputation AFTER INSERT OR DELETE OR UPDATE ON public.user_ratings FOR EACH ROW EXECUTE FUNCTION update_user_reputation();
 CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_follows_updated_at BEFORE UPDATE ON public.follows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_group_comments_updated_at BEFORE UPDATE ON public.group_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_group_posts_updated_at BEFORE UPDATE ON public.group_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_group_votes_updated_at BEFORE UPDATE ON public.group_votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_reactions_updated_at BEFORE UPDATE ON public.reactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_user_ratings_updated_at BEFORE UPDATE ON public.user_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON public.user_reputation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

