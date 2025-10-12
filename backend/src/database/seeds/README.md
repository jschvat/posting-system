# Groups System Seed Data

Comprehensive test data for the Reddit-style group system with users, groups, posts, comments, and various permission levels.

## Seed Data Overview

### 📊 Statistics
- **10 test users** with complete profiles, avatars, and geolocation
- **3 groups** (1 public tech community, 1 public food community, 1 private gaming community)
- **13 group memberships** with different roles (admin, moderator, member)
- **12 posts** across all groups with realistic content
- **24 comments** including nested replies

### 🔐 Test User Credentials

All test users have the same password: **`test123`**

| Username | Email | Role | Location | Groups |
|----------|-------|------|----------|--------|
| admin_alice | alice@groups.test | Group Admin | New York, USA | Tech Community (admin) |
| mod_bob | bob@groups.test | Moderator | Los Angeles, USA | Tech Community (moderator) |
| charlie_coder | charlie.coder@groups.test | Member | San Francisco, USA | Tech Community, Gaming Hub |
| diana_design | diana@groups.test | Member | London, UK | Tech Community |
| evan_photo | evan@groups.test | Member | Paris, France | Foodie Heaven |
| frank_foodie | frank@groups.test | Group Admin | Tokyo, Japan | Foodie Heaven (admin) |
| grace_chef | grace@groups.test | Member | Rome, Italy | Foodie Heaven |
| henry_gamer | henry@groups.test | Group Admin | Sydney, Australia | Gaming Hub (admin) |
| iris_rpg | iris@groups.test | Member | Vancouver, Canada | Gaming Hub |
| jack_social | jack@groups.test | Cross-group Member | Berlin, Germany | All 3 groups |

### 🏢 Groups

#### 1. Tech Community (`/g/techcommunity`)
- **Type**: Public
- **Members**: 5 (1 admin, 1 moderator, 3 members)
- **Posts**: 4
  - Welcome post (pinned) by admin_alice
  - "Just built my first full-stack app" by charlie_coder (6 comments)
  - "Tips for designing better forms" by diana_design (4 comments)
  - "Weekly challenge: Build a REST API" by mod_bob
- **Focus**: Web development, programming, tech discussions

#### 2. Foodie Heaven (`/g/foodieheaven`)
- **Type**: Public
- **Members**: 4 (1 admin, 3 members)
- **Posts**: 4
  - Welcome post (pinned) by frank_foodie
  - "Italian carbonara recipe" by grace_chef (6 comments)
  - "Food photography tips" by evan_photo
  - "Amazing ramen place in Berlin" by jack_social
- **Focus**: Recipes, restaurant recommendations, cooking tips

#### 3. Gaming Hub (`/g/gaminghub`)
- **Type**: Private (requires approval)
- **Members**: 4 (1 admin, 3 members)
- **Posts**: 4
  - Rules & Guidelines (pinned) by henry_gamer
  - "D&D 5e campaign recruitment" by iris_rpg (4 comments)
  - "Speedrunning tips for beginners" by charlie_coder
  - "Tournament announcement" by henry_gamer (4 comments)
- **Focus**: Gaming strategies, tournaments, team recruitment

### 💬 Comment Examples

Comments include nested replies demonstrating:
- Technical discussions (WebSocket implementation, form validation)
- Recipe questions and ingredient substitutions
- Game recruitment and team formation
- Community engagement and helpful responses

### 📍 Geolocation Data

All users have complete location data including:
- Latitude/longitude coordinates
- City names
- Country names
- Diverse global distribution (USA, UK, France, Italy, Japan, Australia, Canada, Germany)

## Running the Seed Script

```bash
# From the backend directory
PGPASSWORD=dev_password psql -h localhost -U dev_user -d posting_system -f src/database/seeds/seed_groups_fixed.sql
```

## API Testing

### Test Login
```bash
# Login as admin_alice
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@groups.test",
    "password": "test123"
  }'
```

### Test Groups Endpoint
```bash
# Get all groups
curl http://localhost:3001/api/groups?page=1&limit=20

# Get specific group
curl http://localhost:3001/api/groups/techcommunity
```

### Test Posts
```bash
# Get posts from Tech Community
curl http://localhost:3001/api/groups/techcommunity/posts?page=1&limit=20
```

## Permission Levels

The seed data includes users with different permission levels to test:

1. **Group Admin** (admin_alice, frank_foodie, henry_gamer)
   - Can edit group settings
   - Can manage members and roles
   - Can pin/unpin posts
   - Can remove posts and comments

2. **Moderator** (mod_bob)
   - Can remove posts and comments
   - Can manage member content
   - Cannot edit group settings

3. **Regular Members** (all others)
   - Can create posts
   - Can comment
   - Can vote
   - Can join/leave groups

## Verification Queries

```sql
-- Check all groups with stats
SELECT
  g.display_name,
  g.member_count,
  g.post_count,
  (SELECT COUNT(*) FROM group_comments gc
   JOIN group_posts gp ON gc.post_id = gp.id
   WHERE gp.group_id = g.id) as comment_count
FROM groups g
WHERE g.slug IN ('techcommunity', 'foodieheaven', 'gaminghub')
ORDER BY g.created_at;

-- Check user memberships and roles
SELECT
  u.username,
  g.slug as group_slug,
  gm.role,
  gm.status
FROM group_memberships gm
JOIN users u ON gm.user_id = u.id
JOIN groups g ON gm.group_id = g.id
WHERE g.slug IN ('techcommunity', 'foodieheaven', 'gaminghub')
ORDER BY g.slug, gm.role DESC, u.username;

-- Check posts with comment counts
SELECT
  g.slug as group_slug,
  u.username as author,
  gp.title,
  gp.comment_count,
  gp.is_pinned,
  gp.created_at
FROM group_posts gp
JOIN groups g ON gp.group_id = g.id
JOIN users u ON gp.user_id = u.id
WHERE g.slug IN ('techcommunity', 'foodieheaven', 'gaminghub')
ORDER BY g.slug, gp.is_pinned DESC, gp.created_at DESC;
```

## Frontend Testing

Navigate to these URLs in the browser:

- Groups list: http://localhost:3000/groups
- Tech Community: http://localhost:3000/g/techcommunity
- Foodie Heaven: http://localhost:3000/g/foodieheaven
- Gaming Hub: http://localhost:3000/g/gaminghub
- Create group: http://localhost:3000/groups/create (requires login)

Login with any test user to see member-specific features like join/leave buttons, post creation, and commenting.

## Notes

- All users have realistic profiles with bios, avatars (via pravatar.cc and picsum.photos), and locations
- Posts contain realistic content relevant to each group's theme
- Comments demonstrate conversations with nested replies
- The private Gaming Hub group demonstrates approval-required membership
- jack_social is a member of all three groups, useful for testing cross-group scenarios
