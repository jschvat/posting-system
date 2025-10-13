#!/bin/bash
# Export complete database schema in proper dependency order

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-posting_system}"
DB_USER="${DB_USER:-dev_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password}"

OUTPUT_DIR="/home/jason/Development/claude/posting-system/backend/src/database"
EXPORT_FILE="$OUTPUT_DIR/complete_schema_export.sql"

echo "Exporting database schema from $DB_NAME..."

export PGPASSWORD="$DB_PASSWORD"

# Create export file with header
cat > "$EXPORT_FILE" << 'EOF'
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

EOF

echo "Exporting extensions..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT '-- Extension: ' || extname || E'\nCREATE EXTENSION IF NOT EXISTS \"' || extname || '\";'
FROM pg_extension
WHERE extname NOT IN ('plpgsql')
ORDER BY extname;
" >> "$EXPORT_FILE"

echo "" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "-- CUSTOM FUNCTIONS" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "" >> "$EXPORT_FILE"

echo "Exporting functions..."
# Export each custom function definition
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT pg_get_functiondef(p.oid) || ';'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_updated_at_column',
    'initialize_user_stats',
    'update_follow_counts',
    'update_share_counts',
    'update_comment_metrics',
    'update_helpful_count',
    'update_user_reputation',
    'calculate_reputation_score',
    'calculate_engagement_score',
    'calculate_recency_score',
    'calculate_interaction_rate',
    'get_group_user_role',
    'is_group_member',
    'is_group_moderator',
    'is_group_admin',
    'update_group_member_count',
    'update_group_post_count',
    'update_group_post_comment_count',
    'update_group_post_votes',
    'update_group_comment_votes',
    'set_group_comment_path',
    'get_user_location',
    'update_user_location',
    'calculate_distance_miles',
    'find_nearby_users',
    'cleanup_nearby_search_cache',
    'limit_location_history'
  )
ORDER BY p.proname;
" | sed 's/^/\n/' >> "$EXPORT_FILE"

echo "" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "-- TABLES" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "" >> "$EXPORT_FILE"

echo "Exporting table schemas..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --section=pre-data \
  --exclude-schema=information_schema \
  --exclude-schema=pg_catalog \
  -t users \
  -t posts \
  -t comments \
  -t media \
  -t reactions \
  -t user_stats \
  -t follows \
  -t shares \
  -t timeline_cache \
  -t comment_interactions \
  -t comment_metrics \
  -t helpful_marks \
  -t user_ratings \
  -t rating_reports \
  -t user_reputation \
  -t location_history \
  -t nearby_search_cache \
  -t groups \
  -t group_memberships \
  -t group_posts \
  -t group_comments \
  -t group_votes \
  -t group_post_media \
  -t group_comment_media \
  -t group_invitations \
  -t group_activity_log \
  | grep -v "^--" | grep -v "^SET" | grep -v "^SELECT pg_catalog" >> "$EXPORT_FILE"

echo "" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "-- INDEXES" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "" >> "$EXPORT_FILE"

echo "Exporting indexes..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT indexdef || ';'
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
" >> "$EXPORT_FILE"

echo "" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "-- TRIGGERS" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "" >> "$EXPORT_FILE"

echo "Exporting triggers..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT pg_get_triggerdef(oid) || ';'
FROM pg_trigger
WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND tgisinternal = false
ORDER BY tgname;
" >> "$EXPORT_FILE"

echo "" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "-- FOREIGN KEY CONSTRAINTS" >> "$EXPORT_FILE"
echo "-- ============================================================================" >> "$EXPORT_FILE"
echo "" >> "$EXPORT_FILE"

echo "Exporting foreign keys..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --section=post-data \
  | grep -E "ALTER TABLE.*ADD CONSTRAINT.*FOREIGN KEY" >> "$EXPORT_FILE"

echo "Schema export complete: $EXPORT_FILE"
echo "File size: $(du -h "$EXPORT_FILE" | cut -f1)"

unset PGPASSWORD
