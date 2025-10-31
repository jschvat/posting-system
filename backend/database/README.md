# Database Migration and Seeding System

Complete database setup and data management system for the posting-system application.

## Overview

This directory contains:
- **Unified Migration Script** - Single SQL file to create entire database from scratch
- **Modular Seed Scripts** - Separate, loadable sections for test data
- **Generator Scripts** - Tools to regenerate migrations and seeds from source
- **Comparison Tool** - Verify database structure consistency

## Files

### Migration Files

- **`unified_migration.sql`** (182 KB) - Complete database schema
  - All 37 tables with proper dependency ordering
  - All indexes and constraints
  - All 131 functions and stored procedures
  - All triggers
  - Extensions (uuid-ossp, ltree)
  - Enum types (hobbies, skills, pets, expertise - 2500+ values)

- **`create_unified_migration.js`** - Generator script
  - Combines 23 individual migration files
  - Maintains proper dependency order
  - Preserves all DDL statements

### Seed Data Files

- **`seed_all.sql`** - Master seed script (loads all sections)

- **`seeds/01_users.sql`** - User accounts, stats, reputation, location history
- **`seeds/02_follows.sql`** - Follow relationships
- **`seeds/03_posts.sql`** - Posts, media, reactions, comments, polls
- **`seeds/04_groups.sql`** - Groups, memberships, group content
- **`seeds/05_messaging.sql`** - Conversations and messages
- **`seeds/06_notifications.sql`** - Notifications and preferences
- **`seeds/07_ratings.sql`** - User ratings and reports

- **`create_seed_scripts.js`** - Seed generator
  - Exports current database data
  - Creates modular, loadable SQL files
  - Handles complex data types (arrays, JSONB, ltree)

### Utility Scripts

- **`compare_databases.js`** - Database comparison tool
  - Compares tables, columns, indexes, functions
  - Verifies structural consistency
  - Shows data count comparisons

## Quick Start

### Using the Convenience Script (Recommended)

```bash
# Create database with schema and all seed data
./create_database.sh --seed my_new_database

# Create database with schema only
./create_database.sh my_new_database

# Create database with only specific data sections
./create_database.sh --users --posts my_new_database

# See all options
./create_database.sh --help
```

### Manual Method

```bash
# 1. Create empty database
createdb -U dev_user my_new_database

# 2. Run unified migration
psql -U dev_user -d my_new_database -f unified_migration.sql

# 3. (Optional) Load seed data
psql -U dev_user -d my_new_database -f seed_all.sql
```

### Load Specific Seed Sections

```bash
# Load only users
psql -U dev_user -d my_database -f seeds/01_users.sql

# Load users and posts
psql -U dev_user -d my_database -f seeds/01_users.sql
psql -U dev_user -d my_database -f seeds/03_posts.sql

# Note: Load in numerical order to respect dependencies
```

## Database Schema

### Core Tables (37 total)

**User System**
- `users` - User accounts with profile data
- `user_stats` - Denormalized engagement metrics
- `user_reputation` - Rating aggregations (0-1000 score)
- `location_history` - Location tracking with privacy controls

**Content System**
- `posts` - User-generated posts (soft delete support)
- `comments` - Nested comments with depth tracking
- `media` - File attachments (images, videos, documents)
- `reactions` - Emoji reactions to posts/comments
- `shares` - Post sharing/reposting

**Social Features**
- `follows` - User follow relationships (active/muted/blocked)
- `user_ratings` - Peer ratings (1-5 stars)
- `rating_reports` - Report inappropriate ratings
- `helpful_marks` - Mark content as helpful

**Group System** (Reddit-style)
- `groups` - Community groups with settings
- `group_memberships` - User roles (admin/moderator/member)
- `group_posts` - Posts within groups (with approval workflow)
- `group_comments` - Nested comments using ltree
- `group_votes` - Upvote/downvote system
- `group_invitations` - Group invite system
- `group_activity_log` - Moderation audit trail
- `poll_options` + `poll_votes` - Polling system

**Messaging System**
- `conversations` - Chat threads (direct/group)
- `conversation_participants` - Conversation membership
- `messages` - Individual messages (soft delete)
- `message_reads` - Read receipts
- `message_reactions` - Message reactions
- `typing_indicators` - Real-time typing status

**Notifications**
- `notifications` - User notifications with priority
- `notification_preferences` - Per-type settings
- `notification_batches` - Grouped notifications

**Performance**
- `timeline_cache` - Pre-computed feeds
- `nearby_search_cache` - Geolocation caching
- `comment_metrics` - Aggregated engagement scores

### Key Features

- **Soft Deletes**: Posts and messages
- **Geolocation**: Haversine-based distance calculations (no PostGIS required)
- **Nested Comments**: ltree for efficient hierarchical queries
- **Real-time**: WebSocket-ready with typing indicators
- **Privacy Controls**: Location sharing (exact/city/off), profile visibility
- **Moderation**: Comprehensive permissions and audit logging
- **Scalability**: Denormalized counters, caching tables

## Regenerating Scripts

### Update Unified Migration

After making changes to individual migration files:

```bash
node create_unified_migration.js
```

### Update Seed Data

Export current database data:

```bash
node create_seed_scripts.js
```

This will:
1. Connect to `posting_system` database
2. Export all table data
3. Create modular seed files in `seeds/` directory
4. Generate master `seed_all.sql` script

## Testing & Validation

### Compare Databases

Verify that unified migration creates identical structure:

```bash
# Create test database
createdb -U dev_user posting_system_test

# Run migration
psql -U dev_user -d posting_system_test -f unified_migration.sql

# Compare structures
node compare_databases.js
```

Expected output:
```
✅ DATABASE STRUCTURES MATCH PERFECTLY!
  ✓ Both databases have 37 tables
  ✓ All table columns match
  ✓ All indexes match
  ✓ Both databases have 131 functions
```

## Environment Variables

All scripts support these environment variables:

```bash
DB_HOST=localhost      # Database host
DB_PORT=5432          # Database port
DB_USER=dev_user      # Database user
DB_PASSWORD=dev_password  # Database password
DB_NAME=posting_system    # Database name (for seed scripts)
```

## Database Size

**Schema Only** (unified_migration.sql): 182 KB
- Includes all DDL statements
- 2500+ enum values
- 131 functions and triggers

**Seed Data** (all sections): 78 KB
- 25 users with complete profiles
- 18 posts with comments and reactions
- 8 groups with posts and memberships
- Sample conversations and messages

## Migration History

The unified script combines 23 individual migrations:

1. `001_initial_schema.sql` - Core tables (users, posts, comments, media, reactions)
2. `002_follow_share_system.sql` - Social features and caching
3. `003_comment_tracking_system.sql` - Engagement metrics
4. `004_rating_reputation_system.sql` - Rating system
5. `005_comment_metrics_helpers.sql` - Metric functions
6. `006_geolocation_system.sql` - Location tracking
7. `007_add_address_fields.sql` - Address fields
8. `008_update_location_function.sql` - Location privacy
9. `009_group_system.sql` - Reddit-style groups
10. `010_allow_public_posting.sql` - Public posting flag
11. `010_post_soft_delete.sql` - Soft delete for posts
12. `011_group_geolocation_restrictions.sql` - Location-based groups
13. `012_moderator_permissions.sql` - Moderation controls
14. `013_post_type_controls.sql` - Post type restrictions
15. `014_profile_enhancements.sql` - Extended profile fields
16. `015_interests_and_skills.sql` - Hobbies and skills enums
17. `016_expand_interests_enums.sql` - Expanded enums (2500+ values)
18. `017_add_polls.sql` - Polling system
19. `018_messaging_system.sql` - Complete messaging
20. `019_notifications_system.sql` - Notification system
21. `020_message_reactions.sql` - Message reactions
22. `020_group_chat_integration.sql` - Group chats
23. `add_file_url_to_media.sql` - Media file URLs

## Troubleshooting

### Migration Fails

```bash
# Check PostgreSQL version (requires 12+)
psql --version

# Verify extensions are available
psql -U dev_user -d postgres -c "SELECT * FROM pg_available_extensions WHERE name IN ('uuid-ossp', 'ltree');"

# Run with verbose output
psql -U dev_user -d my_database -f unified_migration.sql -v ON_ERROR_STOP=1
```

### Seed Data Fails

```bash
# Ensure migration ran first
psql -U dev_user -d my_database -c "\dt"

# Load seeds in order (dependencies matter)
for f in seeds/0*.sql; do
  echo "Loading $f..."
  psql -U dev_user -d my_database -f "$f"
done
```

### Permission Issues

```bash
# Grant necessary permissions
psql -U postgres -d my_database -c "GRANT ALL PRIVILEGES ON DATABASE my_database TO dev_user;"
psql -U postgres -d my_database -c "GRANT ALL ON SCHEMA public TO dev_user;"
```

## Best Practices

1. **Always backup before migrating**
   ```bash
   pg_dump -U dev_user -d posting_system > backup_$(date +%Y%m%d).sql
   ```

2. **Test migrations on separate database first**
   ```bash
   createdb posting_system_staging
   psql -U dev_user -d posting_system_staging -f unified_migration.sql
   ```

3. **Load seed sections incrementally**
   - Start with `01_users.sql`
   - Add sections as needed for testing
   - Full dataset with `seed_all.sql`

4. **Verify after migration**
   ```bash
   node compare_databases.js
   ```

5. **Keep migrations under version control**
   - Commit `unified_migration.sql` after changes
   - Tag releases with migration versions

## Support

For issues or questions:
1. Check migration output for specific error messages
2. Verify PostgreSQL version compatibility (12+)
3. Ensure all extensions are installed
4. Compare with working production database

## License

Part of the posting-system application.
