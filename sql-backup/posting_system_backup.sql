--
-- PostgreSQL database dump
--

\restrict OqXtBn6R79p7ibiqQt58acjz2MgkRkDeAAVfXGyhZhReE4aE63wzzcgj0IFb7tZ

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14 (Debian 15.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: enum_media_media_type; Type: TYPE; Schema: public; Owner: dev_user
--

CREATE TYPE public.enum_media_media_type AS ENUM (
    'image',
    'video',
    'audio',
    'document'
);


ALTER TYPE public.enum_media_media_type OWNER TO dev_user;

--
-- Name: enum_posts_privacy_level; Type: TYPE; Schema: public; Owner: dev_user
--

CREATE TYPE public.enum_posts_privacy_level AS ENUM (
    'public',
    'friends',
    'private'
);


ALTER TYPE public.enum_posts_privacy_level OWNER TO dev_user;

--
-- Name: calculate_distance_miles(numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION public.calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric) OWNER TO dev_user;

--
-- Name: FUNCTION calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric); Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON FUNCTION public.calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric) IS 'Calculate distance between two lat/lon points in miles using Haversine formula';


--
-- Name: calculate_engagement_score(integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.calculate_engagement_score(reply_count integer, reaction_count integer, deep_read_count integer, view_count integer) RETURNS double precision
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calculate_engagement_score(reply_count integer, reaction_count integer, deep_read_count integer, view_count integer) OWNER TO dev_user;

--
-- Name: calculate_interaction_rate(integer, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.calculate_interaction_rate(total_interactions integer, created_at timestamp without time zone) RETURNS double precision
    LANGUAGE plpgsql
    AS $$
DECLARE
  hours_since_creation FLOAT;
BEGIN
  hours_since_creation := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600;
  IF hours_since_creation <= 0 THEN
    RETURN 0;
  END IF;
  RETURN total_interactions::FLOAT / hours_since_creation;
END;
$$;


ALTER FUNCTION public.calculate_interaction_rate(total_interactions integer, created_at timestamp without time zone) OWNER TO dev_user;

--
-- Name: calculate_recency_score(timestamp without time zone); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.calculate_recency_score(comment_created_at timestamp without time zone) RETURNS double precision
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Higher score for newer comments (max 100, decays over 30 days)
  RETURN GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - comment_created_at)) / 86400 / 30 * 100);
END;
$$;


ALTER FUNCTION public.calculate_recency_score(comment_created_at timestamp without time zone) OWNER TO dev_user;

--
-- Name: calculate_reputation_score(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.calculate_reputation_score(p_user_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calculate_reputation_score(p_user_id integer) OWNER TO dev_user;

--
-- Name: cleanup_nearby_search_cache(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.cleanup_nearby_search_cache() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM nearby_search_cache
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_nearby_search_cache() OWNER TO dev_user;

--
-- Name: FUNCTION cleanup_nearby_search_cache(); Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON FUNCTION public.cleanup_nearby_search_cache() IS 'Remove expired cache entries, returns count deleted';


--
-- Name: find_nearby_users(integer, numeric, numeric, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.find_nearby_users(p_user_id integer, p_lat numeric, p_lon numeric, p_radius_miles integer DEFAULT 25, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(user_id integer, username character varying, first_name character varying, last_name character varying, avatar_url character varying, distance_miles numeric, location_city character varying, location_state character varying, location_sharing character varying)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.find_nearby_users(p_user_id integer, p_lat numeric, p_lon numeric, p_radius_miles integer, p_limit integer, p_offset integer) OWNER TO dev_user;

--
-- Name: FUNCTION find_nearby_users(p_user_id integer, p_lat numeric, p_lon numeric, p_radius_miles integer, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON FUNCTION public.find_nearby_users(p_user_id integer, p_lat numeric, p_lon numeric, p_radius_miles integer, p_limit integer, p_offset integer) IS 'Find users within specified radius (miles) sorted by distance';


--
-- Name: get_user_location(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.get_user_location(p_user_id integer) RETURNS TABLE(latitude numeric, longitude numeric, address character varying, city character varying, state character varying, zip character varying, country character varying, accuracy integer, updated_at timestamp without time zone, sharing character varying)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_user_location(p_user_id integer) OWNER TO dev_user;

--
-- Name: FUNCTION get_user_location(p_user_id integer); Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON FUNCTION public.get_user_location(p_user_id integer) IS 'Get user''s current location including address with privacy settings';


--
-- Name: initialize_user_stats(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.initialize_user_stats() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.initialize_user_stats() OWNER TO dev_user;

--
-- Name: limit_location_history(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.limit_location_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.limit_location_history() OWNER TO dev_user;

--
-- Name: update_comment_metrics(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_comment_metrics() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_comment_metrics() OWNER TO dev_user;

--
-- Name: update_follow_counts(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_follow_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_follow_counts() OWNER TO dev_user;

--
-- Name: update_helpful_count(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_helpful_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_helpful_count() OWNER TO dev_user;

--
-- Name: update_share_counts(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_share_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_share_counts() OWNER TO dev_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO dev_user;

--
-- Name: update_user_location(integer, numeric, numeric, character varying, character varying, character varying, character varying, character varying, integer, inet, text); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_user_location(p_user_id integer, p_lat numeric, p_lon numeric, p_address character varying DEFAULT NULL::character varying, p_city character varying DEFAULT NULL::character varying, p_state character varying DEFAULT NULL::character varying, p_zip character varying DEFAULT NULL::character varying, p_country character varying DEFAULT NULL::character varying, p_accuracy integer DEFAULT NULL::integer, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_user_location(p_user_id integer, p_lat numeric, p_lon numeric, p_address character varying, p_city character varying, p_state character varying, p_zip character varying, p_country character varying, p_accuracy integer, p_ip_address inet, p_user_agent text) OWNER TO dev_user;

--
-- Name: FUNCTION update_user_location(p_user_id integer, p_lat numeric, p_lon numeric, p_address character varying, p_city character varying, p_state character varying, p_zip character varying, p_country character varying, p_accuracy integer, p_ip_address inet, p_user_agent text); Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON FUNCTION public.update_user_location(p_user_id integer, p_lat numeric, p_lon numeric, p_address character varying, p_city character varying, p_state character varying, p_zip character varying, p_country character varying, p_accuracy integer, p_ip_address inet, p_user_agent text) IS 'Update user location with address, city, state, zip, country and add entry to history';


--
-- Name: update_user_reputation(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_user_reputation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_user_reputation() OWNER TO dev_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comment_interactions; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.comment_interactions (
    id integer NOT NULL,
    comment_id integer NOT NULL,
    interaction_type character varying(50) NOT NULL,
    user_id integer,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT comment_interactions_interaction_type_check CHECK (((interaction_type)::text = ANY ((ARRAY['view'::character varying, 'reply'::character varying, 'reaction'::character varying, 'share'::character varying, 'deep_read'::character varying, 'quote'::character varying])::text[])))
);


ALTER TABLE public.comment_interactions OWNER TO dev_user;

--
-- Name: comment_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.comment_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.comment_interactions_id_seq OWNER TO dev_user;

--
-- Name: comment_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.comment_interactions_id_seq OWNED BY public.comment_interactions.id;


--
-- Name: comment_metrics; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.comment_metrics (
    comment_id integer NOT NULL,
    view_count integer DEFAULT 0,
    unique_view_count integer DEFAULT 0,
    reply_count integer DEFAULT 0,
    reaction_count integer DEFAULT 0,
    share_count integer DEFAULT 0,
    deep_read_count integer DEFAULT 0,
    total_interaction_count integer DEFAULT 0,
    recency_score double precision DEFAULT 0.0,
    interaction_rate double precision DEFAULT 0.0,
    engagement_score double precision DEFAULT 0.0,
    combined_algorithm_score double precision DEFAULT 0.0,
    first_interaction_at timestamp without time zone,
    last_interaction_at timestamp without time zone,
    peak_interaction_period timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    last_updated timestamp without time zone DEFAULT now()
);


ALTER TABLE public.comment_metrics OWNER TO dev_user;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer NOT NULL,
    parent_id integer,
    content text NOT NULL,
    is_published boolean DEFAULT true,
    depth integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comments OWNER TO dev_user;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.comments_id_seq OWNER TO dev_user;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: follows; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.follows (
    id integer NOT NULL,
    follower_id integer NOT NULL,
    following_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    notifications_enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT follows_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'muted'::character varying, 'blocked'::character varying])::text[]))),
    CONSTRAINT no_self_follow CHECK ((follower_id <> following_id))
);


ALTER TABLE public.follows OWNER TO dev_user;

--
-- Name: TABLE follows; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.follows IS 'User follow relationships with status tracking';


--
-- Name: COLUMN follows.status; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.follows.status IS 'active: normal follow, muted: following but notifications off, blocked: no longer following';


--
-- Name: follows_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.follows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.follows_id_seq OWNER TO dev_user;

--
-- Name: follows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.follows_id_seq OWNED BY public.follows.id;


--
-- Name: helpful_marks; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.helpful_marks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT helpful_marks_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['post'::character varying, 'comment'::character varying, 'user'::character varying])::text[])))
);


ALTER TABLE public.helpful_marks OWNER TO dev_user;

--
-- Name: TABLE helpful_marks; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.helpful_marks IS 'Track when users mark content as helpful';


--
-- Name: helpful_marks_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.helpful_marks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.helpful_marks_id_seq OWNER TO dev_user;

--
-- Name: helpful_marks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.helpful_marks_id_seq OWNED BY public.helpful_marks.id;


--
-- Name: location_history; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.location_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    location_latitude numeric(10,7) NOT NULL,
    location_longitude numeric(10,7) NOT NULL,
    location_city character varying(100),
    location_state character varying(100),
    location_country character varying(100),
    accuracy integer,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.location_history OWNER TO dev_user;

--
-- Name: TABLE location_history; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.location_history IS 'Historical log of user location changes for privacy audit';


--
-- Name: location_history_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.location_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.location_history_id_seq OWNER TO dev_user;

--
-- Name: location_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.location_history_id_seq OWNED BY public.location_history.id;


--
-- Name: media; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.media (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer,
    comment_id integer,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_url character varying(500) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    media_type character varying(20) NOT NULL,
    width integer,
    height integer,
    duration integer,
    alt_text character varying(500),
    is_processed boolean DEFAULT false,
    thumbnail_path character varying(500),
    thumbnail_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT media_belongs_to_post_or_comment CHECK ((((post_id IS NOT NULL) AND (comment_id IS NULL)) OR ((post_id IS NULL) AND (comment_id IS NOT NULL)))),
    CONSTRAINT media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'audio'::character varying, 'document'::character varying])::text[])))
);


ALTER TABLE public.media OWNER TO dev_user;

--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.media_id_seq OWNER TO dev_user;

--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: nearby_search_cache; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.nearby_search_cache (
    id integer NOT NULL,
    user_id integer NOT NULL,
    search_lat numeric(10,7) NOT NULL,
    search_lon numeric(10,7) NOT NULL,
    radius_miles integer NOT NULL,
    nearby_user_ids integer[] NOT NULL,
    result_count integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '00:15:00'::interval)
);


ALTER TABLE public.nearby_search_cache OWNER TO dev_user;

--
-- Name: TABLE nearby_search_cache; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.nearby_search_cache IS 'Cache for nearby user searches to improve performance';


--
-- Name: nearby_search_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.nearby_search_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nearby_search_cache_id_seq OWNER TO dev_user;

--
-- Name: nearby_search_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.nearby_search_cache_id_seq OWNED BY public.nearby_search_cache.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    privacy_level character varying(20) DEFAULT 'public'::character varying,
    is_published boolean DEFAULT true,
    is_archived boolean DEFAULT false,
    views_count integer DEFAULT 0,
    scheduled_for timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT posts_privacy_level_check CHECK (((privacy_level)::text = ANY ((ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying])::text[])))
);


ALTER TABLE public.posts OWNER TO dev_user;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.posts_id_seq OWNER TO dev_user;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: rating_reports; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.rating_reports (
    id integer NOT NULL,
    rating_id integer NOT NULL,
    reporter_id integer NOT NULL,
    report_reason character varying(50) NOT NULL,
    report_details text,
    status character varying(20) DEFAULT 'pending'::character varying,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    resolution_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rating_reports_report_reason_check CHECK (((report_reason)::text = ANY ((ARRAY['spam'::character varying, 'inappropriate'::character varying, 'fake'::character varying, 'harassment'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT rating_reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[])))
);


ALTER TABLE public.rating_reports OWNER TO dev_user;

--
-- Name: TABLE rating_reports; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.rating_reports IS 'Reports for disputed or inappropriate ratings';


--
-- Name: rating_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.rating_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rating_reports_id_seq OWNER TO dev_user;

--
-- Name: rating_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.rating_reports_id_seq OWNED BY public.rating_reports.id;


--
-- Name: reactions; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.reactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer,
    comment_id integer,
    emoji_name character varying(50) NOT NULL,
    emoji_unicode character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reaction_belongs_to_post_or_comment CHECK ((((post_id IS NOT NULL) AND (comment_id IS NULL)) OR ((post_id IS NULL) AND (comment_id IS NOT NULL))))
);


ALTER TABLE public.reactions OWNER TO dev_user;

--
-- Name: reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reactions_id_seq OWNER TO dev_user;

--
-- Name: reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.reactions_id_seq OWNED BY public.reactions.id;


--
-- Name: shares; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.shares (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer NOT NULL,
    share_type character varying(20) DEFAULT 'repost'::character varying,
    share_comment text,
    visibility character varying(20) DEFAULT 'public'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shares_share_type_check CHECK (((share_type)::text = ANY ((ARRAY['repost'::character varying, 'quote'::character varying, 'external'::character varying])::text[]))),
    CONSTRAINT shares_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying])::text[])))
);


ALTER TABLE public.shares OWNER TO dev_user;

--
-- Name: TABLE shares; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.shares IS 'Post shares and reposts by users';


--
-- Name: shares_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shares_id_seq OWNER TO dev_user;

--
-- Name: shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.shares_id_seq OWNED BY public.shares.id;


--
-- Name: timeline_cache; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.timeline_cache (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer NOT NULL,
    score numeric(10,2) DEFAULT 0 NOT NULL,
    reason character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval)
);


ALTER TABLE public.timeline_cache OWNER TO dev_user;

--
-- Name: TABLE timeline_cache; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.timeline_cache IS 'Pre-computed timeline entries with scoring';


--
-- Name: COLUMN timeline_cache.score; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.timeline_cache.score IS 'Calculated score (0-100) based on relevance algorithm';


--
-- Name: COLUMN timeline_cache.reason; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.timeline_cache.reason IS 'Why this post is in timeline: following, popular, shared, suggested';


--
-- Name: COLUMN timeline_cache.expires_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.timeline_cache.expires_at IS 'When this timeline entry should be removed';


--
-- Name: timeline_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.timeline_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.timeline_cache_id_seq OWNER TO dev_user;

--
-- Name: timeline_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.timeline_cache_id_seq OWNED BY public.timeline_cache.id;


--
-- Name: user_ratings; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.user_ratings (
    id integer NOT NULL,
    rater_id integer NOT NULL,
    rated_user_id integer NOT NULL,
    rating_type character varying(50) NOT NULL,
    rating_value integer NOT NULL,
    context_type character varying(50),
    context_id integer,
    review_text text,
    is_anonymous boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_rating CHECK ((rater_id <> rated_user_id)),
    CONSTRAINT user_ratings_rating_type_check CHECK (((rating_type)::text = ANY ((ARRAY['profile'::character varying, 'post'::character varying, 'comment'::character varying, 'interaction'::character varying])::text[]))),
    CONSTRAINT user_ratings_rating_value_check CHECK (((rating_value >= 1) AND (rating_value <= 5)))
);


ALTER TABLE public.user_ratings OWNER TO dev_user;

--
-- Name: TABLE user_ratings; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.user_ratings IS 'User ratings with context and reviews';


--
-- Name: COLUMN user_ratings.rating_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.user_ratings.rating_type IS 'Category: profile, post, comment, interaction';


--
-- Name: COLUMN user_ratings.context_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.user_ratings.context_type IS 'What was rated: post, comment, message, general';


--
-- Name: COLUMN user_ratings.is_verified; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.user_ratings.is_verified IS 'Rating from verified interaction';


--
-- Name: user_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.user_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_ratings_id_seq OWNER TO dev_user;

--
-- Name: user_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.user_ratings_id_seq OWNED BY public.user_ratings.id;


--
-- Name: user_reputation; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.user_reputation (
    user_id integer NOT NULL,
    total_ratings_received integer DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0.00,
    rating_distribution jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
    reputation_score integer DEFAULT 0,
    reputation_level character varying(20) DEFAULT 'newcomer'::character varying,
    post_rating_avg numeric(3,2) DEFAULT 0.00,
    comment_rating_avg numeric(3,2) DEFAULT 0.00,
    interaction_rating_avg numeric(3,2) DEFAULT 0.00,
    verified_ratings_count integer DEFAULT 0,
    positive_ratings_count integer DEFAULT 0,
    neutral_ratings_count integer DEFAULT 0,
    negative_ratings_count integer DEFAULT 0,
    helpful_count integer DEFAULT 0,
    reported_count integer DEFAULT 0,
    quality_posts_count integer DEFAULT 0,
    quality_comments_count integer DEFAULT 0,
    badges jsonb DEFAULT '[]'::jsonb,
    achievements jsonb DEFAULT '[]'::jsonb,
    first_rating_at timestamp without time zone,
    last_rating_at timestamp without time zone,
    reputation_peak integer DEFAULT 0,
    reputation_peak_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_reputation_reputation_level_check CHECK (((reputation_level)::text = ANY ((ARRAY['newcomer'::character varying, 'member'::character varying, 'contributor'::character varying, 'veteran'::character varying, 'expert'::character varying, 'legend'::character varying])::text[])))
);


ALTER TABLE public.user_reputation OWNER TO dev_user;

--
-- Name: TABLE user_reputation; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.user_reputation IS 'Aggregated user reputation scores and metrics';


--
-- Name: COLUMN user_reputation.reputation_score; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.user_reputation.reputation_score IS 'Calculated score 0-1000';


--
-- Name: COLUMN user_reputation.reputation_level; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.user_reputation.reputation_level IS 'Level: newcomer, member, contributor, veteran, expert, legend';


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.user_stats (
    user_id integer NOT NULL,
    follower_count integer DEFAULT 0,
    following_count integer DEFAULT 0,
    post_count integer DEFAULT 0,
    total_reactions_received integer DEFAULT 0,
    total_shares_received integer DEFAULT 0,
    total_comments_received integer DEFAULT 0,
    engagement_score numeric(10,2) DEFAULT 0,
    last_post_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_stats OWNER TO dev_user;

--
-- Name: TABLE user_stats; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.user_stats IS 'Denormalized user statistics for performance';


--
-- Name: users; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    bio text,
    avatar_url character varying(500),
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    password_reset_token character varying(255),
    password_reset_expires timestamp without time zone,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location_city character varying(100),
    location_state character varying(100),
    location_country character varying(100),
    location_updated_at timestamp without time zone,
    location_accuracy integer,
    location_sharing character varying(20) DEFAULT 'off'::character varying,
    show_distance_in_profile boolean DEFAULT false,
    location_latitude numeric(10,7),
    location_longitude numeric(10,7),
    address character varying(255),
    location_zip character varying(20),
    CONSTRAINT users_location_sharing_check CHECK (((location_sharing)::text = ANY ((ARRAY['exact'::character varying, 'city'::character varying, 'off'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO dev_user;

--
-- Name: COLUMN users.location_sharing; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.location_sharing IS 'Privacy setting: exact (show precise location), city (show only city), off (hide location)';


--
-- Name: COLUMN users.show_distance_in_profile; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.show_distance_in_profile IS 'Whether to show distance to this user in search results';


--
-- Name: COLUMN users.location_latitude; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.location_latitude IS 'Latitude coordinate for user location (WGS84)';


--
-- Name: COLUMN users.location_longitude; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.location_longitude IS 'Longitude coordinate for user location (WGS84)';


--
-- Name: COLUMN users.address; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.address IS 'Street address for exact location sharing (e.g., "123 Main St")';


--
-- Name: COLUMN users.location_zip; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.location_zip IS 'ZIP/postal code for location';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO dev_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: comment_interactions id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comment_interactions ALTER COLUMN id SET DEFAULT nextval('public.comment_interactions_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: follows id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.follows ALTER COLUMN id SET DEFAULT nextval('public.follows_id_seq'::regclass);


--
-- Name: helpful_marks id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.helpful_marks ALTER COLUMN id SET DEFAULT nextval('public.helpful_marks_id_seq'::regclass);


--
-- Name: location_history id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.location_history ALTER COLUMN id SET DEFAULT nextval('public.location_history_id_seq'::regclass);


--
-- Name: media id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: nearby_search_cache id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.nearby_search_cache ALTER COLUMN id SET DEFAULT nextval('public.nearby_search_cache_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: rating_reports id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.rating_reports ALTER COLUMN id SET DEFAULT nextval('public.rating_reports_id_seq'::regclass);


--
-- Name: reactions id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.reactions ALTER COLUMN id SET DEFAULT nextval('public.reactions_id_seq'::regclass);


--
-- Name: shares id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.shares ALTER COLUMN id SET DEFAULT nextval('public.shares_id_seq'::regclass);


--
-- Name: timeline_cache id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_cache ALTER COLUMN id SET DEFAULT nextval('public.timeline_cache_id_seq'::regclass);


--
-- Name: user_ratings id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_ratings ALTER COLUMN id SET DEFAULT nextval('public.user_ratings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: comment_interactions; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.comment_interactions (id, comment_id, interaction_type, user_id, session_id, ip_address, user_agent, created_at, metadata) FROM stdin;
\.


--
-- Data for Name: comment_metrics; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.comment_metrics (comment_id, view_count, unique_view_count, reply_count, reaction_count, share_count, deep_read_count, total_interaction_count, recency_score, interaction_rate, engagement_score, combined_algorithm_score, first_interaction_at, last_interaction_at, peak_interaction_period, created_at, last_updated) FROM stdin;
181	0	0	0	0	0	0	0	0	0	0	0	2025-09-29 08:35:57.122	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
182	0	0	0	0	0	0	0	0	0	0	0	2025-09-29 08:35:57.137	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
183	0	0	0	0	0	0	0	0	0	0	0	2025-09-29 08:35:57.139	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
184	0	0	0	0	0	0	0	0	0	0	0	2025-09-29 08:35:57.142	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
185	0	0	0	0	0	0	0	0	0	0	0	2025-09-29 08:35:57.145	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
186	0	0	0	0	0	0	0	0	0	0	0	2025-09-29 08:35:57.148	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
187	0	0	0	0	0	0	0	0	0	0	0	2025-09-29 08:35:57.15	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
188	0	0	0	0	0	0	0	0	0	0	0	2025-09-29 08:35:57.153	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
92	0	0	0	0	0	0	0	0	0	0	0	2025-09-24 23:11:09.52	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
93	0	0	0	0	0	0	0	0	0	0	0	2025-09-22 09:33:54.904	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
94	0	0	0	0	0	0	0	0	0	0	0	2025-09-15 18:30:36.09	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
95	0	0	0	0	0	0	0	0	0	0	0	2025-09-04 20:22:28.454	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
96	0	0	0	0	0	0	0	0	0	0	0	2025-09-25 05:36:14.461	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
97	0	0	0	0	0	0	0	0	0	0	0	2025-09-06 01:53:31.806	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
98	0	0	0	0	0	0	0	0	0	0	0	2025-09-14 05:03:38.364	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
99	0	0	0	0	0	0	0	0	0	0	0	2025-09-11 06:30:26.76	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
100	0	0	0	0	0	0	0	0	0	0	0	2025-09-11 10:21:03.925	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
101	0	0	0	0	0	0	0	0	0	0	0	2025-09-11 14:26:13.649	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
102	0	0	0	0	0	0	0	0	0	0	0	2025-09-21 04:42:43.286	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
103	0	0	0	0	0	0	0	0	0	0	0	2025-09-03 11:25:28.221	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
104	0	0	0	0	0	0	0	0	0	0	0	2025-09-19 23:54:45.153	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
105	0	0	0	0	0	0	0	0	0	0	0	2025-09-10 13:01:17.339	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
106	0	0	0	0	0	0	0	0	0	0	0	2025-08-29 23:12:40.855	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
107	0	0	0	0	0	0	0	0	0	0	0	2025-09-18 21:06:24.161	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
108	0	0	0	0	0	0	0	0	0	0	0	2025-09-28 02:42:23.06	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
109	0	0	0	0	0	0	0	0	0	0	0	2025-09-15 01:00:03.721	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
110	0	0	0	0	0	0	0	0	0	0	0	2025-09-20 19:05:21.974	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
111	0	0	0	0	0	0	0	0	0	0	0	2025-09-02 20:45:23.966	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
112	0	0	0	0	0	0	0	0	0	0	0	2025-09-24 05:48:04.578	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
113	0	0	0	0	0	0	0	0	0	0	0	2025-08-29 21:24:39.291	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
114	0	0	0	0	0	0	0	0	0	0	0	2025-09-05 10:11:22.559	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
115	0	0	0	0	0	0	0	0	0	0	0	2025-09-01 20:47:43.716	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
116	0	0	0	0	0	0	0	0	0	0	0	2025-09-16 11:07:04.278	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
117	0	0	0	0	0	0	0	0	0	0	0	2025-09-04 13:38:41.271	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
118	0	0	0	0	0	0	0	0	0	0	0	2025-08-30 05:11:53.32	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
119	0	0	0	0	0	0	0	0	0	0	0	2025-09-04 08:42:13.716	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
120	0	0	0	0	0	0	0	0	0	0	0	2025-09-16 03:52:42.163	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
121	0	0	0	0	0	0	0	0	0	0	0	2025-09-26 19:53:46.436	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
122	0	0	0	0	0	0	0	0	0	0	0	2025-09-07 08:53:20.22	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
123	0	0	0	0	0	0	0	0	0	0	0	2025-09-19 14:40:17.863	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
124	0	0	0	0	0	0	0	0	0	0	0	2025-09-09 17:34:16.508	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
125	0	0	0	0	0	0	0	0	0	0	0	2025-09-15 19:06:32.013	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
126	0	0	0	0	0	0	0	0	0	0	0	2025-09-28 11:04:21.226	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
127	0	0	0	0	0	0	0	0	0	0	0	2025-09-15 12:11:35.268	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
128	0	0	0	0	0	0	0	0	0	0	0	2025-09-21 07:11:11.713	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
129	0	0	0	0	0	0	0	0	0	0	0	2025-09-06 01:06:30.056	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
130	0	0	0	0	0	0	0	0	0	0	0	2025-09-02 05:08:07.118	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
131	0	0	0	0	0	0	0	0	0	0	0	2025-09-06 02:39:42.141	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
132	0	0	0	0	0	0	0	0	0	0	0	2025-09-25 20:39:15.657	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
133	0	0	0	0	0	0	0	0	0	0	0	2025-09-08 01:18:20.827	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
134	0	0	0	0	0	0	0	0	0	0	0	2025-08-30 04:48:47.616	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
135	0	0	0	0	0	0	0	0	0	0	0	2025-09-21 17:23:23.206	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
136	0	0	0	0	0	0	0	0	0	0	0	2025-09-05 20:38:02.439	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
137	0	0	0	0	0	0	0	0	0	0	0	2025-09-12 00:03:56.406	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
138	0	0	0	0	0	0	0	0	0	0	0	2025-09-10 14:04:55.304	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
139	0	0	0	0	0	0	0	0	0	0	0	2025-09-04 18:14:50.392	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
140	0	0	0	0	0	0	0	0	0	0	0	2025-09-16 21:17:27.85	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
141	0	0	0	0	0	0	0	0	0	0	0	2025-09-18 23:37:17.724	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
142	0	0	0	0	0	0	0	0	0	0	0	2025-09-25 07:47:00.132	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
143	0	0	0	0	0	0	0	0	0	0	0	2025-08-31 11:22:00.407	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
144	0	0	0	0	0	0	0	0	0	0	0	2025-09-09 12:14:54.673	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
145	0	0	0	0	0	0	0	0	0	0	0	2025-08-31 16:32:57.176	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
146	0	0	0	0	0	0	0	0	0	0	0	2025-09-22 20:39:08.018	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
147	0	0	0	0	0	0	0	0	0	0	0	2025-09-04 21:05:58.41	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
148	0	0	0	0	0	0	0	0	0	0	0	2025-09-11 10:24:51.463	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
149	0	0	0	0	0	0	0	0	0	0	0	2025-09-23 01:12:12.298	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
150	0	0	0	0	0	0	0	0	0	0	0	2025-09-11 03:39:24.399	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
151	0	0	0	0	0	0	0	0	0	0	0	2025-09-11 21:19:10.138	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
152	0	0	0	0	0	0	0	0	0	0	0	2025-09-09 15:48:12.66	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
153	0	0	0	0	0	0	0	0	0	0	0	2025-09-09 14:24:56.335	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
154	0	0	0	0	0	0	0	0	0	0	0	2025-09-01 18:16:13.863	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
155	0	0	0	0	0	0	0	0	0	0	0	2025-09-24 17:12:25.581	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
156	0	0	0	0	0	0	0	0	0	0	0	2025-09-03 01:59:10.424	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
157	0	0	0	0	0	0	0	0	0	0	0	2025-09-19 03:34:56.376	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
158	0	0	0	0	0	0	0	0	0	0	0	2025-08-30 15:27:37.726	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
159	0	0	0	0	0	0	0	0	0	0	0	2025-09-02 17:32:41.198	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
160	0	0	0	0	0	0	0	0	0	0	0	2025-09-08 04:13:57.753	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
161	0	0	0	0	0	0	0	0	0	0	0	2025-09-14 04:10:43.346	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
162	0	0	0	0	0	0	0	0	0	0	0	2025-09-01 18:27:08.87	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
163	0	0	0	0	0	0	0	0	0	0	0	2025-09-28 07:55:17.027	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
164	0	0	0	0	0	0	0	0	0	0	0	2025-08-31 23:58:18.137	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
165	0	0	0	0	0	0	0	0	0	0	0	2025-09-13 05:02:38.07	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
166	0	0	0	0	0	0	0	0	0	0	0	2025-09-04 15:10:19.923	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
167	0	0	0	0	0	0	0	0	0	0	0	2025-09-08 08:38:22.126	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
168	0	0	0	0	0	0	0	0	0	0	0	2025-09-16 19:45:49.216	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
169	0	0	0	0	0	0	0	0	0	0	0	2025-09-18 10:45:16.485	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
170	0	0	0	0	0	0	0	0	0	0	0	2025-09-24 02:15:48.899	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
171	0	0	0	0	0	0	0	0	0	0	0	2025-09-04 02:40:36.042	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
172	0	0	0	0	0	0	0	0	0	0	0	2025-09-05 10:22:48.631	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
173	0	0	0	0	0	0	0	0	0	0	0	2025-09-01 06:26:29.603	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
174	0	0	0	0	0	0	0	0	0	0	0	2025-09-19 02:25:01.618	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
175	0	0	0	0	0	0	0	0	0	0	0	2025-09-08 16:25:03.262	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
176	0	0	0	0	0	0	0	0	0	0	0	2025-09-18 05:03:33.932	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
177	0	0	0	0	0	0	0	0	0	0	0	2025-09-27 13:02:17.355	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
178	0	0	0	0	0	0	0	0	0	0	0	2025-08-30 06:23:16.916	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
179	0	0	0	0	0	0	0	0	0	0	0	2025-09-22 03:06:29.069	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
180	0	0	0	0	0	0	0	0	0	0	0	2025-09-08 16:13:49.73	\N	\N	2025-09-30 15:47:51.822345	2025-09-30 15:47:51.822345
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.comments (id, user_id, post_id, parent_id, content, is_published, depth, created_at, updated_at) FROM stdin;
181	13	24	\N	This looks absolutely amazing! Game development is such a fascinating field. What programming language are you using for this?	t	0	2025-09-29 08:35:57.122	2025-09-29 08:35:57.122
182	15	24	\N	Physics engines are incredibly complex. Have you considered using an existing one like Box2D or are you building from scratch?	t	0	2025-09-29 08:35:57.137	2025-09-29 08:35:57.137
183	17	24	\N	The game development community is so supportive! I would love to see some screenshots or a demo when you have something to share.	t	0	2025-09-29 08:35:57.139	2025-09-29 08:35:57.139
184	19	24	\N	I have been thinking about getting into game development myself. Any advice for someone just starting out?	t	0	2025-09-29 08:35:57.142	2025-09-29 08:35:57.142
185	14	24	\N	This is inspiring! I remember trying to make a simple platformer and getting stuck on collision detection. Physics is definitely the hard part.	t	0	2025-09-29 08:35:57.145	2025-09-29 08:35:57.145
186	16	24	\N	Are you planning to release this as open source? The game dev community could really benefit from seeing how you tackle the physics calculations.	t	0	2025-09-29 08:35:57.148	2025-09-29 08:35:57.148
187	18	24	\N	What kind of game are you building? 2D or 3D? The physics requirements are quite different for each.	t	0	2025-09-29 08:35:57.15	2025-09-29 08:35:57.15
188	20	24	\N	Game engines are such a rabbit hole! I started working on one for learning purposes and ended up spending months just on the renderer.	t	0	2025-09-29 08:35:57.153	2025-09-29 08:35:57.153
189	16	24	178	I agree! TechCrunch Disrupt was amazing. Did you attend the AI sessions?	t	0	2025-09-30 20:02:43.545673	2025-09-30 20:02:43.545673
190	17	24	189	Yes! The AI panel was incredible. GPT-4 demos blew my mind!	t	0	2025-09-30 20:02:43.550999	2025-09-30 20:02:43.550999
92	17	17	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-24 23:11:09.52	2025-09-28 19:47:48.264
93	18	17	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-22 09:33:54.904	2025-09-28 19:47:48.268
94	14	17	\N	Clean Code is a classic! Robert Martin's principles are timeless.	t	0	2025-09-15 18:30:36.09	2025-09-28 19:47:48.271
95	20	18	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-04 20:22:28.454	2025-09-28 19:47:48.275
96	20	18	\N	Hackathons are exhausting but so much fun! What tech stack did you use?	t	0	2025-09-25 05:36:14.461	2025-09-28 19:47:48.28
97	20	18	\N	CSS Grid is amazing! I still use flexbox for smaller components though.	t	0	2025-09-06 01:53:31.806	2025-09-28 19:47:48.284
98	19	19	\N	Great work! I love seeing the progress in the React community.	t	0	2025-09-14 05:03:38.364	2025-09-28 19:47:48.288
99	21	19	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-11 06:30:26.76	2025-09-28 19:47:48.292
100	14	19	\N	Machine learning is like modern magic! Python makes it so accessible.	t	0	2025-09-11 10:21:03.925	2025-09-28 19:47:48.296
101	14	20	\N	CSS Grid is amazing! I still use flexbox for smaller components though.	t	0	2025-09-11 14:26:13.649	2025-09-28 19:47:48.3
102	21	21	\N	TypeScript definitely has a learning curve, but it's worth it! Try starting with basic types.	t	0	2025-09-21 04:42:43.286	2025-09-28 19:47:48.305
103	15	21	\N	That sounds like an awesome project! I'd love to contribute.	t	0	2025-09-03 11:25:28.221	2025-09-28 19:47:48.309
104	21	21	\N	Docker orchestration can be tricky. Kubernetes might be your next step!	t	0	2025-09-19 23:54:45.153	2025-09-28 19:47:48.313
105	15	22	\N	WebAssembly is fascinating! The performance gains are incredible.	t	0	2025-09-10 13:01:17.339	2025-09-28 19:47:48.317
106	20	22	\N	Great work! I love seeing the progress in the React community.	t	0	2025-08-29 23:12:40.855	2025-09-28 19:47:48.32
107	14	22	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-18 21:06:24.161	2025-09-28 19:47:48.323
108	12	23	\N	Great work! I love seeing the progress in the React community.	t	0	2025-09-28 02:42:23.06	2025-09-28 19:47:48.326
109	20	23	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-15 01:00:03.721	2025-09-28 19:47:48.329
110	20	23	\N	WebAssembly is fascinating! The performance gains are incredible.	t	0	2025-09-20 19:05:21.974	2025-09-28 19:47:48.332
111	20	24	\N	CSS Grid is amazing! I still use flexbox for smaller components though.	t	0	2025-09-02 20:45:23.966	2025-09-28 19:47:48.336
112	19	24	\N	Legacy code refactoring is both painful and satisfying. You're doing great work!	t	0	2025-09-24 05:48:04.578	2025-09-28 19:47:48.34
113	19	24	\N	Hackathons are exhausting but so much fun! What tech stack did you use?	t	0	2025-08-29 21:24:39.291	2025-09-28 19:47:48.344
114	19	24	\N	Machine learning is like modern magic! Python makes it so accessible.	t	0	2025-09-05 10:11:22.559	2025-09-28 19:47:48.348
115	17	25	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-01 20:47:43.716	2025-09-28 19:47:48.351
116	17	25	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-16 11:07:04.278	2025-09-28 19:47:48.355
117	15	25	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-04 13:38:41.271	2025-09-28 19:47:48.359
118	16	26	\N	Security is so important. What tools do you recommend for penetration testing?	t	0	2025-08-30 05:11:53.32	2025-09-28 19:47:48.364
119	14	26	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-04 08:42:13.716	2025-09-28 19:47:48.369
120	13	26	\N	Security is so important. What tools do you recommend for penetration testing?	t	0	2025-09-16 03:52:42.163	2025-09-28 19:47:48.373
121	15	27	\N	Hackathons are exhausting but so much fun! What tech stack did you use?	t	0	2025-09-26 19:53:46.436	2025-09-28 19:47:48.378
122	19	27	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-07 08:53:20.22	2025-09-28 19:47:48.382
123	12	28	\N	Hackathons are exhausting but so much fun! What tech stack did you use?	t	0	2025-09-19 14:40:17.863	2025-09-28 19:47:48.386
124	19	28	\N	Which conference was this? I'm always looking for good tech events.	t	0	2025-09-09 17:34:16.508	2025-09-28 19:47:48.389
125	21	28	\N	CSS Grid is amazing! I still use flexbox for smaller components though.	t	0	2025-09-15 19:06:32.013	2025-09-28 19:47:48.393
126	18	28	\N	Clean Code is a classic! Robert Martin's principles are timeless.	t	0	2025-09-28 11:04:21.226	2025-09-28 19:47:48.398
127	14	29	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-15 12:11:35.268	2025-09-28 19:47:48.401
128	19	29	\N	Legacy code refactoring is both painful and satisfying. You're doing great work!	t	0	2025-09-21 07:11:11.713	2025-09-28 19:47:48.405
129	12	30	\N	TypeScript definitely has a learning curve, but it's worth it! Try starting with basic types.	t	0	2025-09-06 01:06:30.056	2025-09-28 19:47:48.408
130	20	31	\N	Those late night debugging sessions hit different! Coffee is definitely essential.	t	0	2025-09-02 05:08:07.118	2025-09-28 19:47:48.411
131	16	31	\N	Those late night debugging sessions hit different! Coffee is definitely essential.	t	0	2025-09-06 02:39:42.141	2025-09-28 19:47:48.415
132	12	31	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-25 20:39:15.657	2025-09-28 19:47:48.418
133	12	21	104	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-08 01:18:20.827	2025-09-28 19:47:48.425
134	15	26	118	I'm using Unity for now, but considering building something from scratch.	t	0	2025-08-30 04:48:47.616	2025-09-28 19:47:48.433
135	18	26	118	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-21 17:23:23.206	2025-09-28 19:47:48.438
136	12	17	94	Thanks! React hooks really changed the game for me.	t	0	2025-09-05 20:38:02.439	2025-09-28 19:47:48.445
137	17	29	127	Python's libraries make everything so much easier to get started.	t	0	2025-09-12 00:03:56.406	2025-09-28 19:47:48.452
138	16	29	127	It was TechCrunch Disrupt. Highly recommend it!	t	0	2025-09-10 14:04:55.304	2025-09-28 19:47:48.458
139	13	29	127	Thanks! React hooks really changed the game for me.	t	0	2025-09-04 18:14:50.392	2025-09-28 19:47:48.463
140	20	17	93	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-16 21:17:27.85	2025-09-28 19:47:48.47
141	16	17	93	Python's libraries make everything so much easier to get started.	t	0	2025-09-18 23:37:17.724	2025-09-28 19:47:48.475
142	12	30	129	I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.	t	0	2025-09-25 07:47:00.132	2025-09-28 19:47:48.481
143	17	31	130	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-08-31 11:22:00.407	2025-09-28 19:47:48.488
144	15	31	130	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-09 12:14:54.673	2025-09-28 19:47:48.492
145	13	27	121	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-08-31 16:32:57.176	2025-09-28 19:47:48.497
146	14	28	126	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-09-22 20:39:08.018	2025-09-28 19:47:48.502
147	12	28	126	His naming conventions chapter changed how I think about code.	t	0	2025-09-04 21:05:58.41	2025-09-28 19:47:48.507
148	18	28	126	The integration with existing codebases is surprisingly smooth!	t	0	2025-09-11 10:24:51.463	2025-09-28 19:47:48.514
149	17	23	110	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-23 01:12:12.298	2025-09-28 19:47:48.518
150	12	23	110	Thanks! React hooks really changed the game for me.	t	0	2025-09-11 03:39:24.399	2025-09-28 19:47:48.523
151	18	26	120	Thanks! React hooks really changed the game for me.	t	0	2025-09-11 21:19:10.138	2025-09-28 19:47:48.527
152	12	26	120	We used Node.js, React, and Socket.io. Classic but effective stack!	t	0	2025-09-09 15:48:12.66	2025-09-28 19:47:48.533
153	14	26	120	His naming conventions chapter changed how I think about code.	t	0	2025-09-09 14:24:56.335	2025-09-28 19:47:48.539
154	16	19	99	I'm using Unity for now, but considering building something from scratch.	t	0	2025-09-01 18:16:13.863	2025-09-28 19:47:48.543
155	20	19	99	Python's libraries make everything so much easier to get started.	t	0	2025-09-24 17:12:25.581	2025-09-28 19:47:48.547
156	12	19	99	I'd love to collaborate! GitHub integration would be key.	t	0	2025-09-03 01:59:10.424	2025-09-28 19:47:48.552
157	21	23	108	It was TechCrunch Disrupt. Highly recommend it!	t	0	2025-09-19 03:34:56.376	2025-09-28 19:47:48.558
158	13	23	108	Kubernetes is definitely on my learning list. Any good resources?	t	0	2025-08-30 15:27:37.726	2025-09-28 19:47:48.565
159	20	23	108	Thanks! React hooks really changed the game for me.	t	0	2025-09-02 17:32:41.198	2025-09-28 19:47:48.57
160	16	28	125	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-08 04:13:57.753	2025-09-28 19:47:48.574
161	17	31	132	We used Node.js, React, and Socket.io. Classic but effective stack!	t	0	2025-09-14 04:10:43.346	2025-09-28 19:47:48.579
162	21	29	128	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-01 18:27:08.87	2025-09-28 19:47:48.584
163	18	29	128	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-09-28 07:55:17.027	2025-09-28 19:47:48.588
164	18	24	112	His naming conventions chapter changed how I think about code.	t	0	2025-08-31 23:58:18.137	2025-09-28 19:47:48.593
165	15	24	112	I'd love to collaborate! GitHub integration would be key.	t	0	2025-09-13 05:02:38.07	2025-09-28 19:47:48.597
166	13	24	112	The integration with existing codebases is surprisingly smooth!	t	0	2025-09-04 15:10:19.923	2025-09-28 19:47:48.601
167	15	18	97	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-09-08 08:38:22.126	2025-09-28 19:47:48.606
168	20	18	97	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-16 19:45:49.216	2025-09-28 19:47:48.611
169	19	18	97	Thanks! React hooks really changed the game for me.	t	0	2025-09-18 10:45:16.485	2025-09-28 19:47:48.615
170	19	18	96	Python's libraries make everything so much easier to get started.	t	0	2025-09-24 02:15:48.899	2025-09-28 19:47:48.619
171	16	18	96	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-04 02:40:36.042	2025-09-28 19:47:48.624
172	18	18	96	It was TechCrunch Disrupt. Highly recommend it!	t	0	2025-09-05 10:22:48.631	2025-09-28 19:47:48.628
173	20	20	101	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-01 06:26:29.603	2025-09-28 19:47:48.632
174	16	25	117	I'd love to collaborate! GitHub integration would be key.	t	0	2025-09-19 02:25:01.618	2025-09-28 19:47:48.636
175	21	25	117	We used Node.js, React, and Socket.io. Classic but effective stack!	t	0	2025-09-08 16:25:03.262	2025-09-28 19:47:48.641
176	16	25	117	Kubernetes is definitely on my learning list. Any good resources?	t	0	2025-09-18 05:03:33.932	2025-09-28 19:47:48.647
177	14	24	113	I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.	t	0	2025-09-27 13:02:17.355	2025-09-28 19:47:48.652
178	16	24	113	It was TechCrunch Disrupt. Highly recommend it!	t	0	2025-08-30 06:23:16.916	2025-09-28 19:47:48.657
179	15	28	124	I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.	t	0	2025-09-22 03:06:29.069	2025-09-28 19:47:48.661
180	20	24	114	His naming conventions chapter changed how I think about code.	t	0	2025-09-08 16:13:49.73	2025-09-28 19:47:48.665
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.follows (id, follower_id, following_id, status, notifications_enabled, created_at, updated_at) FROM stdin;
7	22	14	active	t	2025-10-03 15:26:42.81144	2025-10-03 15:26:42.81144
\.


--
-- Data for Name: helpful_marks; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.helpful_marks (id, user_id, target_type, target_id, created_at) FROM stdin;
\.


--
-- Data for Name: location_history; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.location_history (id, user_id, location_latitude, location_longitude, location_city, location_state, location_country, accuracy, ip_address, user_agent, created_at) FROM stdin;
1	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 04:23:38.004876
2	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 05:04:25.902526
3	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 15:43:50.214326
4	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 15:43:53.058703
5	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 15:54:47.277922
6	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 15:56:26.992455
7	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 16:06:24.864385
8	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 16:07:18.351944
9	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 17:14:51.673845
10	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 17:15:44.267543
11	22	34.0522000	-118.2437000	Los Angeles	California	United States	50	127.0.0.1	test	2025-10-07 17:15:47.68027
12	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 17:16:02.003106
13	22	0.0000000	0.0000000	Riverside	CA	United States	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 20:43:42.700973
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.media (id, user_id, post_id, comment_id, filename, original_name, file_path, file_url, mime_type, file_size, media_type, width, height, duration, alt_text, is_processed, thumbnail_path, thumbnail_url, created_at, updated_at) FROM stdin;
1	22	32	\N	sample1.jpg	sample1.jpg	images/sample1.jpg	/uploads/images/sample1.jpg	image/jpeg	20000	image	800	600	\N	Sample Red Image	f	\N	\N	2025-10-02 03:37:29.272883	2025-10-02 03:37:29.272883
2	22	32	\N	sample2.jpg	sample2.jpg	images/sample2.jpg	/uploads/images/sample2.jpg	image/jpeg	20000	image	800	600	\N	Sample Teal Image	f	\N	\N	2025-10-02 03:37:29.276378	2025-10-02 03:37:29.276378
3	22	32	\N	sample3.jpg	sample3.jpg	images/sample3.jpg	/uploads/images/sample3.jpg	image/jpeg	20000	image	800	600	\N	Sample Blue Image	f	\N	\N	2025-10-02 03:37:29.27875	2025-10-02 03:37:29.27875
4	22	32	\N	sample4.jpg	sample4.jpg	images/sample4.jpg	/uploads/images/sample4.jpg	image/jpeg	20000	image	800	600	\N	Sample Orange Image	f	\N	\N	2025-10-02 03:37:29.281222	2025-10-02 03:37:29.281222
5	22	33	\N	d3e26f97-c326-4b27-a545-93afb526f731.jpg	lovebird.jpg	images/d3e26f97-c326-4b27-a545-93afb526f731.jpg	/uploads/images/d3e26f97-c326-4b27-a545-93afb526f731.jpg	image/jpeg	4401263	image	5184	3456	\N	\N	f	\N	\N	2025-10-01 20:39:14.764	2025-10-01 20:39:14.764
6	22	34	\N	a2d8e01f-38df-478a-8771-868fdad9d71a.jpg	lovebird.jpg	images/a2d8e01f-38df-478a-8771-868fdad9d71a.jpg	/uploads/images/a2d8e01f-38df-478a-8771-868fdad9d71a.jpg	image/jpeg	4401263	image	5184	3456	\N	\N	f	\N	\N	2025-10-07 08:41:03.109	2025-10-07 08:41:03.109
\.


--
-- Data for Name: nearby_search_cache; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.nearby_search_cache (id, user_id, search_lat, search_lon, radius_miles, nearby_user_ids, result_count, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.posts (id, user_id, content, privacy_level, is_published, is_archived, views_count, scheduled_for, created_at, updated_at) FROM stdin;
17	18	Just finished building my first React application! 🚀 The component lifecycle still amazes me. Anyone else find useState hooks as elegant as I do?	public	t	f	0	\N	2025-09-08 14:50:54.045	2025-09-28 19:47:48.224
18	20	Been diving deep into TypeScript lately. The type safety is incredible, but the learning curve is steep! Any tips for someone transitioning from vanilla JS?	public	t	f	0	\N	2025-09-03 17:49:10.738	2025-09-28 19:47:48.226
19	12	Working on a new design system for our team. Color theory is more complex than I initially thought! 🎨 What are your favorite design tools?	public	t	f	0	\N	2025-09-22 21:35:21.035	2025-09-28 19:47:48.229
20	12	Just deployed my first microservice architecture. Docker containers everywhere! 🐳 The orchestration is beautiful when it all comes together.	public	t	f	0	\N	2025-09-04 01:23:47.562	2025-09-28 19:47:48.231
21	21	Late night coding session debugging a memory leak. Sometimes the best solutions come at 2 AM with a cup of coffee ☕	friends	t	f	0	\N	2025-08-30 03:56:47.431	2025-09-28 19:47:48.234
22	16	Attended an amazing tech conference today! The keynote on AI ethics really made me think about our responsibility as developers.	public	t	f	0	\N	2025-09-01 12:32:59.119	2025-09-28 19:47:48.236
23	12	Finally mastered CSS Grid after years of flexbox! The layout possibilities are endless. Who else is team Grid over Flexbox?	public	t	f	0	\N	2025-08-30 00:07:21.052	2025-09-28 19:47:48.238
24	14	Working on a game engine in my spare time. Physics calculations are harder than I expected, but so rewarding when they work! 🎮	public	t	f	0	\N	2025-09-18 05:58:18.909	2025-09-28 19:47:48.241
25	15	Penetration testing results came back clean! 🔐 Always satisfying when security measures hold up under scrutiny.	friends	t	f	0	\N	2025-09-07 08:01:29.377	2025-09-28 19:47:48.243
26	13	Experimenting with WebAssembly for performance-critical applications. The speed improvements are incredible! Anyone else exploring WASM?	public	t	f	0	\N	2025-08-31 06:40:13.673	2025-09-28 19:47:48.246
27	20	Teaching myself Machine Learning with Python. Neural networks are like magic, but with math! 🧠✨	public	t	f	0	\N	2025-09-14 17:51:59.381	2025-09-28 19:47:48.249
28	16	Refactored 500 lines of legacy code today. It's like archaeology, but with more semicolons. The satisfaction is real though!	public	t	f	0	\N	2025-09-10 05:23:23.082	2025-09-28 19:47:48.253
29	14	New project idea: A collaborative platform for developers to share code snippets. Think GitHub meets StackOverflow. Thoughts?	public	t	f	0	\N	2025-09-02 01:25:44.952	2025-09-28 19:47:48.255
30	13	Just finished reading 'Clean Code' by Robert Martin. My variable naming will never be the same! 📚	public	t	f	0	\N	2025-09-10 18:01:36.595	2025-09-28 19:47:48.258
31	18	Weekend hackathon was intense! Built a real-time chat app with WebSockets. Sleep is overrated anyway... 😴	public	t	f	0	\N	2025-09-13 04:24:27.106	2025-09-28 19:47:48.261
32	22	Testing multi-media support! 📸 Here are some beautiful sample images to showcase the new media gallery feature.	public	t	f	0	\N	2025-10-02 03:37:29.268388	2025-10-02 03:37:29.268388
33	22	sdfsf	public	t	f	0	\N	2025-10-01 20:39:13.297	2025-10-01 20:39:13.297
34	22	sample psot	public	t	f	0	\N	2025-10-07 08:41:01.506	2025-10-07 08:41:01.506
\.


--
-- Data for Name: rating_reports; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.rating_reports (id, rating_id, reporter_id, report_reason, report_details, status, reviewed_by, reviewed_at, resolution_notes, created_at) FROM stdin;
\.


--
-- Data for Name: reactions; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.reactions (id, user_id, post_id, comment_id, emoji_name, emoji_unicode, created_at, updated_at) FROM stdin;
83	13	18	\N	like	👏	2025-09-09 19:02:11.332	2025-10-08 16:01:22.432663
84	19	19	\N	like	👏	2025-09-03 14:19:29.843	2025-10-08 16:01:22.432663
90	15	20	\N	like	🤔	2025-09-06 08:24:37.918	2025-10-08 16:01:22.432663
110	12	25	\N	like	👏	2025-09-24 06:10:47.896	2025-10-08 16:01:22.432663
111	15	26	\N	like	👍	2025-09-03 22:46:26.971	2025-10-08 16:01:22.432663
115	15	28	\N	like	🤔	2025-09-26 11:34:54.667	2025-10-08 16:01:22.432663
127	20	31	\N	like	👍	2025-09-22 22:05:10.972	2025-10-08 16:01:22.432663
136	22	28	\N	like	👍	2025-10-08 08:41:25.849	2025-10-08 16:01:22.432663
82	19	17	\N	love	❤️	2025-09-17 05:24:37.502	2025-10-08 16:01:22.432663
131	21	31	\N	love	❤️	2025-09-25 19:12:55.528	2025-10-08 16:01:22.432663
79	15	17	\N	laugh	😂	2025-09-13 02:02:49.167	2025-10-08 16:01:22.432663
100	15	22	\N	laugh	😂	2025-09-02 09:18:14.989	2025-10-08 16:01:22.432663
101	15	23	\N	laugh	😂	2025-09-13 06:20:45.293	2025-10-08 16:01:22.432663
104	21	23	\N	laugh	😂	2025-09-11 22:44:28.137	2025-10-08 16:01:22.432663
113	18	27	\N	laugh	😂	2025-09-23 08:36:57.945	2025-10-08 16:01:22.432663
80	14	17	\N	wow	😮	2025-09-14 04:26:48.63	2025-10-08 16:01:22.432663
87	21	19	\N	wow	😮	2025-09-11 03:04:59.283	2025-10-08 16:01:22.432663
88	17	19	\N	wow	😮	2025-09-14 02:58:19.869	2025-10-08 16:01:22.432663
91	19	20	\N	wow	😮	2025-09-17 09:48:31.643	2025-10-08 16:01:22.432663
99	12	22	\N	wow	😮	2025-09-07 05:55:52.029	2025-10-08 16:01:22.432663
77	20	17	\N	thumbs_down	👎	2025-08-30 22:34:13.455	2025-09-28 19:47:48.668
81	17	17	\N	100	💯	2025-09-13 14:49:24.23	2025-09-28 19:47:48.683
85	16	19	\N	tada	🎉	2025-09-25 10:39:08.915	2025-09-28 19:47:48.698
86	15	19	\N	thumbs_down	👎	2025-09-09 15:36:45.603	2025-09-28 19:47:48.702
89	14	19	\N	fire	🔥	2025-09-06 16:30:07.802	2025-09-28 19:47:48.714
92	14	20	\N	fire	🔥	2025-09-20 12:30:06.119	2025-09-28 19:47:48.724
93	13	20	\N	tada	🎉	2025-09-10 06:33:20.206	2025-09-28 19:47:48.727
95	15	21	\N	100	💯	2025-08-30 10:09:20.238	2025-09-28 19:47:48.734
96	13	21	\N	thumbs_down	👎	2025-09-01 08:16:49.749	2025-09-28 19:47:48.738
97	16	21	\N	thumbs_down	👎	2025-09-14 00:09:17.932	2025-09-28 19:47:48.741
103	13	23	\N	fire	🔥	2025-09-16 10:35:49.19	2025-09-28 19:47:48.761
105	18	23	\N	thumbs_down	👎	2025-09-24 08:50:53.518	2025-09-28 19:47:48.769
107	19	24	\N	thumbs_down	👎	2025-09-17 18:19:26.062	2025-09-28 19:47:48.777
109	13	25	\N	100	💯	2025-09-11 10:12:48.773	2025-09-28 19:47:48.784
117	12	28	\N	100	💯	2025-09-04 03:02:38.746	2025-09-28 19:47:48.812
118	17	28	\N	thumbs_down	👎	2025-09-02 19:24:27.255	2025-09-28 19:47:48.816
120	18	28	\N	tada	🎉	2025-09-26 23:49:57.363	2025-09-28 19:47:48.825
121	16	29	\N	tada	🎉	2025-09-17 21:58:52.581	2025-09-28 19:47:48.829
122	12	30	\N	tada	🎉	2025-09-15 18:38:56.305	2025-09-28 19:47:48.832
125	14	30	\N	thumbs_down	👎	2025-08-30 07:59:36.515	2025-09-28 19:47:48.843
126	21	30	\N	fire	🔥	2025-09-11 13:08:28.191	2025-09-28 19:47:48.847
128	13	31	\N	fire	🔥	2025-09-23 01:38:15.802	2025-09-28 19:47:48.854
102	19	23	\N	wow	😮	2025-09-01 23:01:19.508	2025-10-08 16:01:22.432663
106	15	24	\N	wow	😮	2025-09-05 13:46:41.819	2025-10-08 16:01:22.432663
108	18	25	\N	wow	😮	2025-09-02 01:07:34.114	2025-10-08 16:01:22.432663
114	13	27	\N	wow	😮	2025-09-13 03:38:21.885	2025-10-08 16:01:22.432663
124	19	30	\N	wow	😮	2025-09-07 08:45:12.401	2025-10-08 16:01:22.432663
129	14	31	\N	wow	😮	2025-09-16 16:48:31.785	2025-10-08 16:01:22.432663
130	16	31	\N	wow	😮	2025-09-17 00:26:41.194	2025-10-08 16:01:22.432663
94	17	20	\N	sad	😢	2025-09-22 04:12:47.322	2025-10-08 16:01:22.432663
116	19	28	\N	sad	😢	2025-09-17 13:57:50.769	2025-10-08 16:01:22.432663
78	16	17	\N	angry	😡	2025-09-02 21:41:01.092	2025-10-08 16:01:22.432663
98	14	21	\N	angry	😡	2025-09-03 07:12:58.096	2025-10-08 16:01:22.432663
112	12	27	\N	angry	😡	2025-09-10 17:06:46.287	2025-10-08 16:01:22.432663
119	14	28	\N	angry	😡	2025-09-16 21:57:11.091	2025-10-08 16:01:22.432663
123	13	30	\N	angry	😡	2025-09-22 18:33:46.291	2025-10-08 16:01:22.432663
133	22	24	\N	like	👍	2025-10-03 08:27:04.197	2025-10-08 15:40:32.707717
137	22	33	\N	clap	👍	2025-10-08 08:42:15.886	2025-10-08 16:02:22.894683
135	22	19	\N	sad	😢	2025-10-08 08:31:24.328	2025-10-08 16:02:28.747941
142	22	30	\N	thinking	👍	2025-10-08 09:03:52.227	2025-10-08 16:03:58.505276
140	22	32	\N	love	❤️	2025-10-08 08:54:28.838	2025-10-08 16:04:40.97365
141	22	34	\N	sad	😢	2025-10-08 08:58:24.991	2025-10-08 08:58:24.991
\.


--
-- Data for Name: shares; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.shares (id, user_id, post_id, share_type, share_comment, visibility, created_at) FROM stdin;
1	22	24	repost	\N	public	2025-10-03 15:51:32.840047
\.


--
-- Data for Name: timeline_cache; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.timeline_cache (id, user_id, post_id, score, reason, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: user_ratings; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.user_ratings (id, rater_id, rated_user_id, rating_type, rating_value, context_type, context_id, review_text, is_anonymous, is_verified, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_reputation; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.user_reputation (user_id, total_ratings_received, average_rating, rating_distribution, reputation_score, reputation_level, post_rating_avg, comment_rating_avg, interaction_rating_avg, verified_ratings_count, positive_ratings_count, neutral_ratings_count, negative_ratings_count, helpful_count, reported_count, quality_posts_count, quality_comments_count, badges, achievements, first_rating_at, last_rating_at, reputation_peak, reputation_peak_at, created_at, updated_at) FROM stdin;
13	0	0.00	{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}	0	newcomer	0.00	0.00	0.00	0	0	0	0	0	0	0	0	[]	[]	\N	\N	0	\N	2025-10-04 02:25:42.235488	2025-10-04 02:25:42.235488
14	0	0.00	{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}	0	newcomer	0.00	0.00	0.00	0	0	0	0	0	0	0	0	[]	[]	\N	\N	0	\N	2025-10-04 15:04:25.643028	2025-10-04 15:04:25.643028
12	0	0.00	{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}	0	newcomer	0.00	0.00	0.00	0	0	0	0	0	0	0	0	[]	[]	\N	\N	0	\N	2025-10-05 01:06:07.989811	2025-10-05 01:06:07.989811
22	0	0.00	{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}	0	newcomer	0.00	0.00	0.00	0	0	0	0	0	0	0	0	[]	[]	\N	\N	0	\N	2025-10-05 16:59:37.303347	2025-10-05 16:59:37.303347
16	0	0.00	{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}	0	newcomer	0.00	0.00	0.00	0	0	0	0	0	0	0	0	[]	[]	\N	\N	0	\N	2025-10-05 17:06:02.629055	2025-10-05 17:06:02.629055
\.


--
-- Data for Name: user_stats; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.user_stats (user_id, follower_count, following_count, post_count, total_reactions_received, total_shares_received, total_comments_received, engagement_score, last_post_at, updated_at) FROM stdin;
12	0	0	3	0	0	0	0.00	2025-09-22 21:35:21.035	2025-10-02 04:03:09.877982
13	0	0	2	0	0	0	0.00	2025-09-10 18:01:36.595	2025-10-02 04:03:09.877982
15	0	0	1	0	0	0	0.00	2025-09-07 08:01:29.377	2025-10-02 04:03:09.877982
16	0	0	2	0	0	0	0.00	2025-09-10 05:23:23.082	2025-10-02 04:03:09.877982
17	0	0	0	0	0	0	0.00	\N	2025-10-02 04:03:09.877982
18	0	0	2	0	0	0	0.00	2025-09-13 04:24:27.106	2025-10-02 04:03:09.877982
19	0	0	0	0	0	0	0.00	\N	2025-10-02 04:03:09.877982
20	0	0	2	0	0	0	0.00	2025-09-14 17:51:59.381	2025-10-02 04:03:09.877982
21	0	0	1	0	0	0	0.00	2025-08-30 03:56:47.431	2025-10-02 04:03:09.877982
23	0	0	0	0	0	0	0.00	\N	2025-10-03 04:12:47.718418
24	0	0	0	0	0	0	0.00	\N	2025-10-03 04:12:47.718418
22	0	1	2	0	0	0	0.00	2025-10-02 03:37:29.268388	2025-10-03 15:26:42.81144
14	1	0	2	0	1	0	0.00	2025-09-18 05:58:18.909	2025-10-03 15:51:32.840047
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.users (id, username, email, password_hash, first_name, last_name, bio, avatar_url, is_active, email_verified, email_verification_token, password_reset_token, password_reset_expires, last_login, created_at, updated_at, location_city, location_state, location_country, location_updated_at, location_accuracy, location_sharing, show_distance_in_profile, location_latitude, location_longitude, address, location_zip) FROM stdin;
20	ivan_innovator	ivan@example.com	$2a$12$Eg3EhipIGjfp/YLuRR/I7ut3UrggMkfpKkAicy7qDqtNuV/JHRe1G	Ivan	Innovator	Always exploring new technologies and ideas	/uploads/avatars/user_20_cl9wfn5n40i.png	t	f	\N	\N	\N	\N	2025-09-11 03:04:31.256	2025-10-06 14:54:52.120849	Denver	Colorado	United States	2025-10-06 14:54:52.120849	\N	city	f	39.7392000	-104.9903000	\N	\N
21	julia_js	julia@example.com	$2a$12$smVpt2U1Bmpgazn1b7sjLOoqVQpW23oW2RZGLjsUZQf.9UwW644Aq	Julia	JavaScript	JavaScript enthusiast and React lover	/uploads/avatars/user_21_y8iic49xvke.png	t	f	\N	\N	\N	\N	2025-09-04 16:47:39.906	2025-10-06 14:54:52.123937	Miami	Florida	United States	2025-10-06 14:54:52.123937	\N	exact	t	25.7617000	-80.1918000	\N	\N
23	testuser1	testuser1@example.com	$2a$12$.GL6G.CHc3PuGFwfx.zKUeqf4qzfD5rshY8CWsxAaG6.4y7IfSNwC	Test	User1	\N	\N	t	f	\N	\N	\N	\N	2025-10-02 21:08:41.12	2025-10-02 21:08:41.12	\N	\N	\N	\N	\N	off	f	\N	\N	\N	\N
24	testuser2	testuser2@example.com	$2a$12$LGZk8b57oI8zhb1Hb5hGH.96FvqrHYwJ0m2Ml/hulI8YUO5WJMkIK	Test	User2	\N	\N	t	f	\N	\N	\N	\N	2025-10-02 21:08:43.584	2025-10-02 21:08:43.584	\N	\N	\N	\N	\N	off	f	\N	\N	\N	\N
12	alice_wonder	alice@example.com	$2a$12$bnH8x3jGGFkMjfFypDPeFuh951gdo993F0SJNwUjYmQeFLy0ILM2K	Alice	Wonderland	Curious explorer of digital realms	/uploads/avatars/user_12_i1thuejz4h9.png	t	f	\N	\N	\N	\N	2025-09-19 14:21:28.18	2025-10-06 14:54:52.091797	San Francisco	California	United States	2025-10-06 14:54:52.091797	\N	city	f	37.7749295	-122.4194155	\N	\N
13	bob_builder	bob@example.com	$2a$12$p/GnRBxXpl9Wbe42TJpdXOoo503GNYxqKAPGQzWnOL0vhvsETNWem	Bob	Builder	Building amazing things, one line of code at a time	/uploads/avatars/user_13_15zu1l8pjtk.png	t	f	\N	\N	\N	\N	2025-09-26 06:47:42.133	2025-10-06 14:54:52.101315	Austin	Texas	United States	2025-10-06 14:54:52.101315	\N	exact	t	30.2672000	-97.7431000	\N	\N
14	charlie_dev	charlie@example.com	$2a$12$eemdKVoNf/CeKEcJsIBZQeYzHJHPC21OkgTXYwBwW3O6RbNOjSSLW	Charlie	Developer	Full-stack developer passionate about clean code	/uploads/avatars/user_14_njk97iinfuc.png	t	f	\N	\N	\N	\N	2025-09-02 09:42:36.753	2025-10-06 14:54:52.104025	New York	New York	United States	2025-10-06 14:54:52.104025	\N	city	f	40.7128000	-74.0060000	\N	\N
15	diana_designer	diana@example.com	$2a$12$QRlmrBKMFDa.Kwhf5iRLg.K7JugHR7uBPXtXhH/GSNKZqqa7lC2Ii	Diana	Designer	UI/UX designer creating beautiful experiences	/uploads/avatars/user_15_x2w9ugbrqdm.png	t	f	\N	\N	\N	\N	2025-09-15 22:28:17.269	2025-10-06 14:54:52.106728	Los Angeles	California	United States	2025-10-06 14:54:52.106728	\N	exact	t	34.0522000	-118.2437000	\N	\N
16	erik_engineer	erik@example.com	$2a$12$IFJ9VjSu0RqUaycNDId5nOIsJMEcHBEHcfw7ZxtI2tXLsT.ONNPaO	Erik	Engineer	Software engineer solving complex problems	/uploads/avatars/user_16_ttimniddi7.png	t	f	\N	\N	\N	\N	2025-09-03 00:58:07.495	2025-10-06 14:54:52.109556	Seattle	Washington	United States	2025-10-06 14:54:52.109556	\N	city	f	47.6062000	-122.3321000	\N	\N
17	fiona_frontend	fiona@example.com	$2a$12$d.vyETVHD1zSpNU45xdxXuoey0IxyQVyH7IvH7qSLL8.2g2T6SGEm	Fiona	Frontend	Frontend specialist with an eye for detail	/uploads/avatars/user_17_tjj6k7aknfo.png	t	f	\N	\N	\N	\N	2025-09-22 04:00:59.574	2025-10-06 14:54:52.112291	Boston	Massachusetts	United States	2025-10-06 14:54:52.112291	\N	exact	t	42.3601000	-71.0589000	\N	\N
18	george_gamer	george@example.com	$2a$12$4R2m3tY12fFTNxYMuxM1HOWVL0y2qsdx0Gf7MxuwdJRjBQxgCAQBq	George	Gamer	Game developer and tech enthusiast	/uploads/avatars/user_18_ezab3mjwknn.png	t	f	\N	\N	\N	\N	2025-09-01 20:33:07.779	2025-10-06 14:54:52.115042	Chicago	Illinois	United States	2025-10-06 14:54:52.115042	\N	city	f	41.8781000	-87.6298000	\N	\N
19	helen_hacker	helen@example.com	$2a$12$i8NstDKV9FO06elT7aw/k.25AHp6Q1BDZkc5lzjGwz97kJSzpFLG6	Helen	Hacker	Ethical hacker and cybersecurity expert	/uploads/avatars/user_19_2bofnh06pwa.png	t	f	\N	\N	\N	\N	2025-09-25 22:19:07.594	2025-10-06 14:54:52.117807	Portland	Oregon	United States	2025-10-06 14:54:52.117807	\N	exact	t	45.5152000	-122.6784000	\N	\N
25	geocodetest	geocode@test.com	$2a$12$jZ4s4Ih/6zydRqDzbfstbOXuXGc8v/3cMpwLtHsJhXy6ZzQ8g3xO2	Geocode	Test	\N	\N	t	f	\N	\N	\N	2025-10-08 12:44:51.538	2025-10-08 12:29:57.014	2025-10-08 19:45:00.64412	New York	NY	USA	\N	\N	off	f	40.7484421	-73.9856589	350 5th Ave	10118
22	admin	admin@example.com	$2a$12$bWujPhCQowhhN7R4ySOsEeg5G8eLQmOfhrLO6nRTagG2Bxmve0sm6	Admin	User	System Administrator12121	/uploads/avatars/user_22_admin.png	t	t	\N	\N	\N	2025-10-07 21:26:01.324	2025-10-01 15:37:58.300362	2025-10-08 20:43:42.711336	Riverside	CA	United States	2025-10-08 20:43:42.700973	1865	exact	f	0.0000000	0.0000000	9503 Los Coches Ct	92508
\.


--
-- Name: comment_interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.comment_interactions_id_seq', 1, false);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.comments_id_seq', 190, true);


--
-- Name: follows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.follows_id_seq', 7, true);


--
-- Name: helpful_marks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.helpful_marks_id_seq', 1, false);


--
-- Name: location_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.location_history_id_seq', 13, true);


--
-- Name: media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.media_id_seq', 6, true);


--
-- Name: nearby_search_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.nearby_search_cache_id_seq', 1, false);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.posts_id_seq', 34, true);


--
-- Name: rating_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.rating_reports_id_seq', 1, false);


--
-- Name: reactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.reactions_id_seq', 142, true);


--
-- Name: shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.shares_id_seq', 1, true);


--
-- Name: timeline_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.timeline_cache_id_seq', 1, false);


--
-- Name: user_ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.user_ratings_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.users_id_seq', 25, true);


--
-- Name: comment_interactions comment_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comment_interactions
    ADD CONSTRAINT comment_interactions_pkey PRIMARY KEY (id);


--
-- Name: comment_metrics comment_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comment_metrics
    ADD CONSTRAINT comment_metrics_pkey PRIMARY KEY (comment_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: helpful_marks helpful_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.helpful_marks
    ADD CONSTRAINT helpful_marks_pkey PRIMARY KEY (id);


--
-- Name: location_history location_history_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.location_history
    ADD CONSTRAINT location_history_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: nearby_search_cache nearby_search_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.nearby_search_cache
    ADD CONSTRAINT nearby_search_cache_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: rating_reports rating_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.rating_reports
    ADD CONSTRAINT rating_reports_pkey PRIMARY KEY (id);


--
-- Name: reactions reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);


--
-- Name: shares shares_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_pkey PRIMARY KEY (id);


--
-- Name: timeline_cache timeline_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_cache
    ADD CONSTRAINT timeline_cache_pkey PRIMARY KEY (id);


--
-- Name: follows unique_follow; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT unique_follow UNIQUE (follower_id, following_id);


--
-- Name: helpful_marks unique_helpful_mark; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.helpful_marks
    ADD CONSTRAINT unique_helpful_mark UNIQUE (user_id, target_type, target_id);


--
-- Name: user_ratings unique_rating; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT unique_rating UNIQUE (rater_id, rated_user_id, context_type, context_id);


--
-- Name: reactions unique_user_comment_emoji; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT unique_user_comment_emoji UNIQUE (user_id, comment_id, emoji_name);


--
-- Name: reactions unique_user_post_emoji; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT unique_user_post_emoji UNIQUE (user_id, post_id, emoji_name);


--
-- Name: timeline_cache unique_user_post_timeline; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_cache
    ADD CONSTRAINT unique_user_post_timeline UNIQUE (user_id, post_id);


--
-- Name: shares unique_user_share; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT unique_user_share UNIQUE (user_id, post_id);


--
-- Name: user_ratings user_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_pkey PRIMARY KEY (id);


--
-- Name: user_reputation user_reputation_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_reputation
    ADD CONSTRAINT user_reputation_pkey PRIMARY KEY (user_id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_comment_interactions_comment_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comment_interactions_comment_type ON public.comment_interactions USING btree (comment_id, interaction_type);


--
-- Name: idx_comment_interactions_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comment_interactions_created_at ON public.comment_interactions USING btree (created_at);


--
-- Name: idx_comment_interactions_session_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comment_interactions_session_id ON public.comment_interactions USING btree (session_id);


--
-- Name: idx_comment_interactions_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comment_interactions_user_id ON public.comment_interactions USING btree (user_id);


--
-- Name: idx_comment_metrics_algorithm_score; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comment_metrics_algorithm_score ON public.comment_metrics USING btree (combined_algorithm_score DESC);


--
-- Name: idx_comment_metrics_interaction_rate; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comment_metrics_interaction_rate ON public.comment_metrics USING btree (interaction_rate DESC);


--
-- Name: idx_comment_metrics_last_interaction; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comment_metrics_last_interaction ON public.comment_metrics USING btree (last_interaction_at DESC);


--
-- Name: idx_comments_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at);


--
-- Name: idx_comments_parent_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_id);


--
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- Name: idx_comments_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_comments_user_id ON public.comments USING btree (user_id);


--
-- Name: idx_follows_composite; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_follows_composite ON public.follows USING btree (follower_id, following_id, status);


--
-- Name: idx_follows_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_follows_created_at ON public.follows USING btree (created_at);


--
-- Name: idx_follows_follower_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_follows_follower_id ON public.follows USING btree (follower_id);


--
-- Name: idx_follows_following_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_follows_following_id ON public.follows USING btree (following_id);


--
-- Name: idx_follows_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_follows_status ON public.follows USING btree (status);


--
-- Name: idx_helpful_marks_target; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_helpful_marks_target ON public.helpful_marks USING btree (target_type, target_id);


--
-- Name: idx_helpful_marks_user; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_helpful_marks_user ON public.helpful_marks USING btree (user_id);


--
-- Name: idx_location_history_coords; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_location_history_coords ON public.location_history USING btree (location_latitude, location_longitude);


--
-- Name: idx_location_history_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_location_history_created_at ON public.location_history USING btree (created_at DESC);


--
-- Name: idx_location_history_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_location_history_user_id ON public.location_history USING btree (user_id);


--
-- Name: idx_media_comment_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_media_comment_id ON public.media USING btree (comment_id);


--
-- Name: idx_media_post_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_media_post_id ON public.media USING btree (post_id);


--
-- Name: idx_media_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_media_type ON public.media USING btree (media_type);


--
-- Name: idx_media_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_media_user_id ON public.media USING btree (user_id);


--
-- Name: idx_nearby_cache_coords; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_nearby_cache_coords ON public.nearby_search_cache USING btree (search_lat, search_lon);


--
-- Name: idx_nearby_cache_expires_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_nearby_cache_expires_at ON public.nearby_search_cache USING btree (expires_at);


--
-- Name: idx_nearby_cache_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_nearby_cache_user_id ON public.nearby_search_cache USING btree (user_id);


--
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at);


--
-- Name: idx_posts_privacy_level; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_posts_privacy_level ON public.posts USING btree (privacy_level);


--
-- Name: idx_posts_published; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_posts_published ON public.posts USING btree (is_published);


--
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);


--
-- Name: idx_rating_reports_rating; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_rating_reports_rating ON public.rating_reports USING btree (rating_id);


--
-- Name: idx_rating_reports_reporter; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_rating_reports_reporter ON public.rating_reports USING btree (reporter_id);


--
-- Name: idx_rating_reports_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_rating_reports_status ON public.rating_reports USING btree (status);


--
-- Name: idx_reactions_comment_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_reactions_comment_id ON public.reactions USING btree (comment_id);


--
-- Name: idx_reactions_emoji_name; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_reactions_emoji_name ON public.reactions USING btree (emoji_name);


--
-- Name: idx_reactions_post_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_reactions_post_id ON public.reactions USING btree (post_id);


--
-- Name: idx_reactions_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_reactions_user_id ON public.reactions USING btree (user_id);


--
-- Name: idx_shares_composite; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_shares_composite ON public.shares USING btree (post_id, created_at DESC);


--
-- Name: idx_shares_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_shares_created_at ON public.shares USING btree (created_at);


--
-- Name: idx_shares_post_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_shares_post_id ON public.shares USING btree (post_id);


--
-- Name: idx_shares_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_shares_type ON public.shares USING btree (share_type);


--
-- Name: idx_shares_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_shares_user_id ON public.shares USING btree (user_id);


--
-- Name: idx_timeline_expires_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_expires_at ON public.timeline_cache USING btree (expires_at);


--
-- Name: idx_timeline_post_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_post_id ON public.timeline_cache USING btree (post_id);


--
-- Name: idx_timeline_reason; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_reason ON public.timeline_cache USING btree (reason);


--
-- Name: idx_timeline_user_created; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_user_created ON public.timeline_cache USING btree (user_id, created_at DESC);


--
-- Name: idx_timeline_user_score; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_user_score ON public.timeline_cache USING btree (user_id, score DESC);


--
-- Name: idx_user_ratings_context; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_ratings_context ON public.user_ratings USING btree (context_type, context_id);


--
-- Name: idx_user_ratings_created; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_ratings_created ON public.user_ratings USING btree (created_at DESC);


--
-- Name: idx_user_ratings_rated_user; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_ratings_rated_user ON public.user_ratings USING btree (rated_user_id);


--
-- Name: idx_user_ratings_rater; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_ratings_rater ON public.user_ratings USING btree (rater_id);


--
-- Name: idx_user_ratings_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_ratings_type ON public.user_ratings USING btree (rating_type);


--
-- Name: idx_user_reputation_avg_rating; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_reputation_avg_rating ON public.user_reputation USING btree (average_rating DESC);


--
-- Name: idx_user_reputation_level; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_reputation_level ON public.user_reputation USING btree (reputation_level);


--
-- Name: idx_user_reputation_score; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_reputation_score ON public.user_reputation USING btree (reputation_score DESC);


--
-- Name: idx_user_stats_engagement_score; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_stats_engagement_score ON public.user_stats USING btree (engagement_score DESC);


--
-- Name: idx_user_stats_follower_count; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_stats_follower_count ON public.user_stats USING btree (follower_count DESC);


--
-- Name: idx_user_stats_last_post_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_stats_last_post_at ON public.user_stats USING btree (last_post_at DESC);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_location_coords; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_location_coords ON public.users USING btree (location_latitude, location_longitude);


--
-- Name: idx_users_location_sharing; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_location_sharing ON public.users USING btree (location_sharing);


--
-- Name: idx_users_location_updated; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_location_updated ON public.users USING btree (location_updated_at);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: comment_interactions comment_interaction_metrics_trigger; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER comment_interaction_metrics_trigger AFTER INSERT ON public.comment_interactions FOR EACH ROW EXECUTE FUNCTION public.update_comment_metrics();


--
-- Name: location_history trigger_limit_location_history; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_limit_location_history AFTER INSERT ON public.location_history FOR EACH ROW EXECUTE FUNCTION public.limit_location_history();


--
-- Name: follows trigger_update_follow_counts; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_update_follow_counts AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();


--
-- Name: helpful_marks trigger_update_helpful_count; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_update_helpful_count AFTER INSERT ON public.helpful_marks FOR EACH ROW EXECUTE FUNCTION public.update_helpful_count();


--
-- Name: shares trigger_update_share_counts; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_update_share_counts AFTER INSERT OR DELETE ON public.shares FOR EACH ROW EXECUTE FUNCTION public.update_share_counts();


--
-- Name: user_ratings trigger_update_user_reputation; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_update_user_reputation AFTER INSERT OR DELETE OR UPDATE ON public.user_ratings FOR EACH ROW EXECUTE FUNCTION public.update_user_reputation();


--
-- Name: comments update_comments_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: follows update_follows_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_follows_updated_at BEFORE UPDATE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: media update_media_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: posts update_posts_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reactions update_reactions_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_reactions_updated_at BEFORE UPDATE ON public.reactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_ratings update_user_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_user_ratings_updated_at BEFORE UPDATE ON public.user_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_reputation update_user_reputation_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON public.user_reputation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: comment_interactions comment_interactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comment_interactions
    ADD CONSTRAINT comment_interactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_interactions comment_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comment_interactions
    ADD CONSTRAINT comment_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: comment_metrics comment_metrics_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comment_metrics
    ADD CONSTRAINT comment_metrics_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: helpful_marks helpful_marks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.helpful_marks
    ADD CONSTRAINT helpful_marks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: location_history location_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.location_history
    ADD CONSTRAINT location_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: media media_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: media media_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: media media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: nearby_search_cache nearby_search_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.nearby_search_cache
    ADD CONSTRAINT nearby_search_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rating_reports rating_reports_rating_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.rating_reports
    ADD CONSTRAINT rating_reports_rating_id_fkey FOREIGN KEY (rating_id) REFERENCES public.user_ratings(id) ON DELETE CASCADE;


--
-- Name: rating_reports rating_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.rating_reports
    ADD CONSTRAINT rating_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rating_reports rating_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.rating_reports
    ADD CONSTRAINT rating_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reactions reactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shares shares_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: shares shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: timeline_cache timeline_cache_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_cache
    ADD CONSTRAINT timeline_cache_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: timeline_cache timeline_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_cache
    ADD CONSTRAINT timeline_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_ratings user_ratings_rated_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_rated_user_id_fkey FOREIGN KEY (rated_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_ratings user_ratings_rater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_reputation user_reputation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_reputation
    ADD CONSTRAINT user_reputation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict OqXtBn6R79p7ibiqQt58acjz2MgkRkDeAAVfXGyhZhReE4aE63wzzcgj0IFb7tZ

