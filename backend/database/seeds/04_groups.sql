-- ============================================================================
-- SEED SCRIPT: Groups, memberships, and group content
-- ============================================================================
-- Generated: 2025-10-31T15:47:39.468Z
--
-- Tables included:
--   - groups
--   - group_memberships
--   - group_invitations
--   - group_posts
--   - group_post_media
--   - group_comments
--   - group_comment_media
--   - group_votes
--   - group_activity_log
--
-- Usage:
--   psql -U <user> -d <database> -f 04_groups.sql
--
-- Note: Run these scripts in numerical order (01, 02, 03, etc.)
-- ============================================================================

BEGIN;

-- Temporarily disable triggers for faster bulk insert
SET session_replication_role = 'replica';

-- Insert data into groups (8 rows)
INSERT INTO groups (id, name, slug, display_name, description, avatar_url, banner_url, visibility, require_approval, allow_posts, post_approval_required, allow_multimedia, allowed_media_types, max_file_size_mb, creator_id, member_count, post_count, created_at, updated_at, settings, allow_public_posting, location_restricted, location_type, location_latitude, location_longitude, location_radius_km, location_country, location_state, location_city, location_polygon, location_name, moderator_can_remove_posts, moderator_can_remove_comments, moderator_can_ban_members, moderator_can_approve_posts, moderator_can_approve_members, moderator_can_pin_posts, moderator_can_lock_posts, allow_text_posts, allow_link_posts, allow_image_posts, allow_video_posts, allow_poll_posts, rules, conversation_id)
VALUES
  (2, 'testgroup', 'testgroup', 'Test Group', 'A test group for testing the group system', '/uploads/groups/avatars/group-avatar-testgroup.jpg', NULL, 'public', FALSE, TRUE, FALSE, TRUE, '["image","video","pdf","model","link"]', 50, 26, 1, 1, '"2025-10-10T07:12:11.665Z"', '"2025-10-14T11:03:43.674Z"', '{}', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NULL, NULL),
  (6, 'techcommunity', 'techcommunity', 'Tech Community', 'A vibrant community for developers, designers, and tech enthusiasts to share knowledge, ask questions, and collaborate on projects. All skill levels welcome!', '/uploads/groups/avatars/group-avatar-techcommunity.jpg', 'https://picsum.photos/seed/tech-banner/1200/300', 'public', FALSE, TRUE, FALSE, TRUE, '["image","video","pdf","link"]', 25, 30, 5, 4, '"2025-10-11T20:50:24.219Z"', '"2025-10-30T09:55:07.503Z"', '{"chat_enabled":true}', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, '', 4),
  (7, 'foodieheaven', 'foodieheaven', 'Foodie Heaven', 'Share your favorite recipes, restaurant recommendations, and cooking tips. A delicious community for food lovers around the world! 🍽️', '/uploads/groups/avatars/group-avatar-foodieheaven.jpg', 'https://picsum.photos/seed/food-banner/1200/300', 'public', FALSE, TRUE, FALSE, TRUE, '["image","video","link"]', 50, 35, 4, 4, '"2025-10-11T20:50:24.225Z"', '"2025-10-14T11:03:43.730Z"', '{}', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NULL, NULL),
  (8, 'gaminghub', 'gaminghub', 'Gaming Hub', 'Private gaming community for serious gamers. Share strategies, organize tournaments, and find teammates. Apply to join!', '/uploads/groups/avatars/group-avatar-gaminghub.jpg', 'https://picsum.photos/seed/gaming-banner/1200/300', 'private', TRUE, TRUE, FALSE, TRUE, '["image","video","link"]', 100, 37, 4, 4, '"2025-10-11T20:50:24.228Z"', '"2025-10-14T11:03:43.753Z"', '{}', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NULL, NULL),
  (9, 'general', 'general', 'General', 'A public space for everyone! Post anything you want - no membership required. This is a general discussion board open to all users.', '/uploads/groups/avatars/group-avatar-general.jpg', NULL, 'public', FALSE, TRUE, FALSE, TRUE, '["image","video","pdf","model","link"]', 50, 30, 1, 0, '"2025-10-12T22:42:03.866Z"', '"2025-10-14T11:03:43.775Z"', '{}', TRUE, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NULL, NULL),
  (10, 'sf-bay-area', 'sf-bay-area', 'SF Bay Area', 'A group for people in the San Francisco Bay Area. Share local events, news, and connect with neighbors! Location restricted to within 50km of downtown San Francisco.', '/uploads/groups/avatars/group-avatar-sf-bay-area.jpg', NULL, 'public', FALSE, TRUE, FALSE, TRUE, '["image","video","pdf","model","link"]', 50, 30, 1, 0, '"2025-10-13T09:38:28.213Z"', '"2025-10-14T11:03:43.801Z"', '{}', FALSE, TRUE, 'radius', '37.77490000', '-122.41940000', '50.00', NULL, NULL, NULL, NULL, 'San Francisco Bay Area', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NULL, NULL),
  (11, 'california', 'california', 'California', 'For Californians only! Discuss state politics, events, and lifestyle. Must be located in California to join.', '/uploads/groups/avatars/group-avatar-california.jpg', NULL, 'public', FALSE, TRUE, FALSE, TRUE, '["image","video","pdf","model","link"]', 50, 30, 2, 0, '"2025-10-13T09:38:28.213Z"', '"2025-10-14T11:03:43.829Z"', '{}', FALSE, TRUE, 'state', NULL, NULL, NULL, NULL, 'California', NULL, NULL, 'California', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NULL, NULL),
  (12, 'usa', 'usa', 'United States', 'A community for people in the United States. Discuss national news, politics, and culture. US location required.', '/uploads/groups/avatars/group-avatar-usa.jpg', NULL, 'public', FALSE, TRUE, FALSE, TRUE, '["image","video","pdf","model","link"]', 50, 30, 1, 0, '"2025-10-13T09:38:28.213Z"', '"2025-10-14T11:03:43.869Z"', '{}', FALSE, TRUE, 'country', NULL, NULL, NULL, 'US', NULL, NULL, NULL, 'United States', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NULL, NULL);
SELECT setval('groups_id_seq', 12, true);

-- Insert data into group_memberships (19 rows)
INSERT INTO group_memberships (id, group_id, user_id, role, status, joined_at, invited_by, banned_by, banned_reason, banned_at)
VALUES
  (1, 2, 26, 'admin', 'active', '"2025-10-10T07:12:11.675Z"', NULL, NULL, NULL, NULL),
  (7, 6, 30, 'admin', 'active', '"2025-10-11T20:50:24.230Z"', NULL, NULL, NULL, NULL),
  (8, 6, 31, 'moderator', 'active', '"2025-10-11T20:50:24.230Z"', NULL, NULL, NULL, NULL),
  (9, 6, 32, 'member', 'active', '"2025-10-11T20:50:24.230Z"', NULL, NULL, NULL, NULL),
  (10, 6, 33, 'member', 'active', '"2025-10-11T20:50:24.230Z"', NULL, NULL, NULL, NULL),
  (11, 6, 39, 'member', 'active', '"2025-10-11T20:50:24.230Z"', NULL, NULL, NULL, NULL),
  (12, 7, 35, 'admin', 'active', '"2025-10-11T20:50:24.235Z"', NULL, NULL, NULL, NULL),
  (13, 7, 36, 'member', 'active', '"2025-10-11T20:50:24.235Z"', NULL, NULL, NULL, NULL),
  (14, 7, 34, 'member', 'active', '"2025-10-11T20:50:24.235Z"', NULL, NULL, NULL, NULL),
  (15, 7, 39, 'member', 'active', '"2025-10-11T20:50:24.235Z"', NULL, NULL, NULL, NULL),
  (16, 8, 37, 'admin', 'active', '"2025-10-11T20:50:24.237Z"', NULL, NULL, NULL, NULL),
  (17, 8, 38, 'member', 'active', '"2025-10-11T20:50:24.237Z"', NULL, NULL, NULL, NULL),
  (18, 8, 32, 'member', 'active', '"2025-10-11T20:50:24.237Z"', NULL, NULL, NULL, NULL),
  (19, 8, 39, 'member', 'active', '"2025-10-11T20:50:24.237Z"', NULL, NULL, NULL, NULL),
  (21, 9, 30, 'admin', 'active', '"2025-10-12T22:42:03.866Z"', NULL, NULL, NULL, NULL),
  (22, 10, 30, 'admin', 'active', '"2025-10-13T09:38:28.213Z"', NULL, NULL, NULL, NULL),
  (23, 11, 30, 'admin', 'active', '"2025-10-13T09:38:28.213Z"', NULL, NULL, NULL, NULL),
  (24, 12, 30, 'admin', 'active', '"2025-10-13T09:38:28.213Z"', NULL, NULL, NULL, NULL),
  (25, 11, 22, 'member', 'active', '"2025-10-14T00:00:17.802Z"', NULL, NULL, NULL, NULL);
SELECT setval('group_memberships_id_seq', 25, true);

-- No data for group_invitations
-- Insert data into group_posts (13 rows)
INSERT INTO group_posts (id, group_id, user_id, title, content, post_type, link_url, link_title, link_description, link_thumbnail, status, approved_by, approved_at, removed_by, removed_at, removal_reason, upvotes, downvotes, score, comment_count, is_pinned, is_locked, is_nsfw, is_spoiler, created_at, updated_at, edited_at, poll_question, poll_ends_at, poll_allow_multiple, poll_total_votes)
VALUES
  (1, 2, 26, 'First Test Post', 'This is my first post in the test group', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 1, 0, 1, 1, FALSE, FALSE, FALSE, FALSE, '"2025-10-10T07:12:25.435Z"', '"2025-10-11T20:47:17.009Z"', NULL, NULL, NULL, FALSE, 0),
  (2, 6, 30, 'Welcome to Tech Community! 👋', 'Welcome everyone! This is a space where we can share knowledge, ask questions, and grow together. Please be respectful and help each other out. Looking forward to great discussions!

Rules:
1. Be kind and respectful
2. No spam or self-promotion without permission
3. Search before asking questions
4. Share your knowledge freely', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, TRUE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.240Z"', '"2025-10-11T20:50:24.240Z"', NULL, NULL, NULL, FALSE, 0),
  (3, 6, 32, 'Just built my first full-stack app with React and Node!', 'After months of learning, I finally deployed my first complete application. It''s a task management tool with real-time updates using WebSockets.

Tech stack:
- Frontend: React 18, TypeScript, styled-components
- Backend: Node.js, Express, PostgreSQL
- Real-time: Socket.io
- Deployment: Docker + AWS

Happy to answer any questions about the journey! The hardest part was definitely getting WebSocket authentication right.', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 6, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.243Z"', '"2025-10-11T20:53:16.975Z"', NULL, NULL, NULL, FALSE, 0),
  (4, 6, 33, 'Tips for designing better forms - A UX perspective', 'As a designer, I see poorly designed forms everywhere. Here are my top tips for creating forms that users actually want to fill out:

1. **Only ask for what you need** - Every field is friction
2. **Clear labels and placeholders** - Users should never guess
3. **Inline validation** - Show errors as users type, not on submit
4. **Logical grouping** - Related fields should be together
5. **Smart defaults** - Pre-fill when possible
6. **Mobile-first** - Test on actual devices

Would love to hear what frustrates you most about forms!', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 4, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.245Z"', '"2025-10-11T20:53:16.983Z"', NULL, NULL, NULL, FALSE, 0),
  (5, 6, 31, 'Weekly challenge: Build a REST API in your favorite language', 'Let''s have some fun! This week''s challenge:

**Challenge**: Build a simple blog API with these endpoints:
- GET /posts - List all posts
- GET /posts/:id - Get single post
- POST /posts - Create post
- PUT /posts/:id - Update post
- DELETE /posts/:id - Delete post

**Requirements**:
- Use any language/framework
- Include basic validation
- Bonus: Add authentication
- Bonus: Write tests

Share your solution in the comments. Can''t wait to see what you build!', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.247Z"', '"2025-10-11T20:50:24.247Z"', NULL, NULL, NULL, FALSE, 0),
  (6, 7, 35, 'Welcome to Foodie Heaven! 🍕🍣🍰', 'Hey food lovers! This is your space to share recipes, restaurant finds, and cooking adventures.

Share:
✨ Your favorite recipes
📸 Beautiful food photos
🏪 Restaurant recommendations
💡 Cooking tips and tricks
❓ Questions about ingredients or techniques

Let''s make this a delicious community!', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, TRUE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.250Z"', '"2025-10-11T20:50:24.250Z"', NULL, NULL, NULL, FALSE, 0),
  (7, 7, 36, 'My grandmother''s authentic Italian carbonara recipe', 'After many requests, here''s my nonna''s carbonara recipe that''s been passed down for generations:

**Ingredients** (serves 4):
- 400g spaghetti
- 200g guanciale (not pancetta!)
- 4 large egg yolks + 1 whole egg
- 100g Pecorino Romano (freshly grated)
- Black pepper (lots of it!)
- Pasta water

**Instructions**:
1. Cook pasta in salted water until al dente
2. While pasta cooks, dice and render guanciale until crispy
3. Mix eggs and cheese in a bowl (no cream!)
4. Drain pasta, save 1 cup pasta water
5. Off heat, mix pasta with guanciale
6. Add egg mixture, toss quickly (no scrambled eggs!)
7. Add pasta water bit by bit until creamy
8. Serve immediately with more pecorino and pepper

The secret is the pasta water - it creates the silky sauce! 🇮🇹', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 6, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.252Z"', '"2025-10-11T20:53:16.987Z"', NULL, NULL, NULL, FALSE, 0),
  (8, 7, 34, 'Best food photography tips for smartphone users 📸', 'You don''t need fancy equipment to take drool-worthy food photos! Here are my tips:

**Lighting**:
- Natural light is your best friend
- Avoid overhead lights (they create harsh shadows)
- Side lighting works best

**Composition**:
- Rule of thirds - don''t center everything
- Get close - show texture and details
- Try different angles (45° and overhead work great)

**Styling**:
- Use odd numbers (3 cookies, not 4)
- Add height and layers
- Keep background simple
- Show the process, not just the final dish

**Editing**:
- Slight brightness and contrast boost
- Don''t oversaturate colors
- Keep it natural

Happy shooting! 📷', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.255Z"', '"2025-10-11T20:50:24.255Z"', NULL, NULL, NULL, FALSE, 0),
  (9, 7, 39, 'Found an amazing ramen place in Berlin!', 'Just tried Takumi in Berlin and WOW! 🍜

The tonkotsu broth was rich and creamy, perfectly seasoned. The chashu pork melted in my mouth. Even got the soft-boiled egg just right - that jammy yolk!

Price: €12-15 per bowl
Wait time: 20-30 mins during peak hours
Worth it? ABSOLUTELY!

If you''re in Berlin, you must try it. Best ramen outside of Japan I''ve had.', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.257Z"', '"2025-10-11T20:50:24.257Z"', NULL, NULL, NULL, FALSE, 0),
  (10, 8, 37, 'Gaming Hub Rules & Guidelines 🎮', 'Welcome to Gaming Hub!

**Rules**:
1. No cheating/hacking discussions
2. Be respectful - no toxicity
3. Tag spoilers appropriately
4. No account selling/trading
5. Keep self-promotion minimal

**What to share**:
- Game strategies and tips
- Team recruitment
- Tournament announcements
- Gaming news
- Your epic wins (and fails!)

Let''s build a positive gaming community!', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, TRUE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.260Z"', '"2025-10-11T20:50:24.260Z"', NULL, NULL, NULL, FALSE, 0),
  (11, 8, 38, 'Looking for players for a D&D 5e campaign!', 'Starting a new Dungeons & Dragons campaign and looking for 3-4 players!

**Campaign Details**:
- System: D&D 5e
- Setting: Homebrew fantasy world
- Tone: 70% RP, 30% combat
- Schedule: Saturdays, 7PM GMT
- Platform: Roll20 + Discord
- Level: Starting at level 3

**What I''m looking for**:
- Players who enjoy roleplay
- Reliable attendance
- Respectful and collaborative
- New players welcome!

If interested, drop a comment with your experience level and what kind of character you''d like to play. Session 0 is next Saturday! 🎲', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 4, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.262Z"', '"2025-10-11T20:53:16.990Z"', NULL, NULL, NULL, FALSE, 0),
  (12, 8, 32, 'Speedrunning tips for beginners', 'Been speedrunning for 2 years now. Here''s what I wish I knew when starting:

**Getting Started**:
1. Pick a game you LOVE - you''ll play it hundreds of times
2. Watch current world record runs
3. Join the game''s speedrun Discord
4. Start with Any% category (easiest)

**Practice**:
- Focus on one segment at a time
- Use save states to practice hard parts
- Record your runs to review mistakes
- Don''t compare to WR holders (yet)

**Tools**:
- LiveSplit for timing
- OBS for recording
- Practice ROM hacks when available

**Mindset**:
- Every run teaches you something
- Consistency > risky strats
- Have fun! It''s a hobby, not a job

What games are you interested in speedrunning? 🏃‍♂️', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.265Z"', '"2025-10-11T20:50:24.265Z"', NULL, NULL, NULL, FALSE, 0),
  (13, 8, 37, 'Tournament announcement: Spring Championship 🏆', 'Gaming Hub is hosting our first tournament!

**Game**: TBD (Vote in comments: League, CS2, or Valorant?)
**Date**: March 15-17
**Format**: Double elimination
**Prize Pool**: $500
**Entry Fee**: Free!

**Rules**:
- Teams of 5
- Must be Gaming Hub member for 1+ month
- No pro players
- Fair play enforced

More details coming soon. Start forming your teams!

Comment below with:
1. Your game preference
2. Your current rank
3. Looking for team? Y/N', 'text', NULL, NULL, NULL, NULL, 'published', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 4, FALSE, FALSE, FALSE, FALSE, '"2025-10-11T20:50:24.267Z"', '"2025-10-11T20:53:16.993Z"', NULL, NULL, NULL, FALSE, 0);
SELECT setval('group_posts_id_seq', 13, true);

-- No data for group_post_media
-- Insert data into group_comments (25 rows)
INSERT INTO group_comments (id, post_id, parent_id, user_id, content, status, removed_by, removed_at, removal_reason, upvotes, downvotes, score, depth, path, created_at, updated_at, edited_at)
VALUES
  (1, 1, NULL, 26, 'Great first post', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '1', '"2025-10-10T07:12:37.727Z"', '"2025-10-10T07:12:37.727Z"', NULL),
  (2, 3, NULL, 30, 'This is amazing! Congrats on shipping your first app. How did you handle WebSocket reconnection logic?', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '2', '"2025-10-11T20:53:16.975Z"', '"2025-10-11T20:53:16.975Z"', NULL),
  (3, 3, 2, 32, 'Thanks! I used socket.io''s built-in reconnection with exponential backoff. Also implemented a heartbeat to detect stale connections. Took a while to get right but works great now!', 'published', NULL, NULL, NULL, 0, 0, 0, 1, '2.3', '"2025-10-11T20:53:16.975Z"', '"2025-10-11T20:53:16.975Z"', NULL),
  (4, 3, NULL, 33, 'Love seeing the tech stack! Did you design the UI yourself or use a component library?', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '4', '"2025-10-11T20:53:16.975Z"', '"2025-10-11T20:53:16.975Z"', NULL),
  (5, 3, 4, 32, 'I used styled-components for custom components. Wanted to learn it properly instead of relying on Material-UI. It was challenging but learned so much!', 'published', NULL, NULL, NULL, 0, 0, 0, 1, '4.5', '"2025-10-11T20:53:16.975Z"', '"2025-10-11T20:53:16.975Z"', NULL),
  (6, 3, 4, 33, 'Good choice! styled-components is powerful once you get the hang of it. Would love to see screenshots if you''re comfortable sharing!', 'published', NULL, NULL, NULL, 0, 0, 0, 1, '4.6', '"2025-10-11T20:53:16.975Z"', '"2025-10-11T20:53:16.975Z"', NULL),
  (7, 3, NULL, 31, 'Impressive work! Any plans to open source it?', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '7', '"2025-10-11T20:53:16.975Z"', '"2025-10-11T20:53:16.975Z"', NULL),
  (8, 4, NULL, 32, 'Great tips! I always struggle with inline validation. Do you validate on every keystroke or on blur?', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '8', '"2025-10-11T20:53:16.983Z"', '"2025-10-11T20:53:16.983Z"', NULL),
  (9, 4, 8, 33, 'Good question! I usually do it on blur first, then on every keystroke once they''ve touched the field. This way you don''t show errors while they''re still typing.', 'published', NULL, NULL, NULL, 0, 0, 0, 1, '8.9', '"2025-10-11T20:53:16.983Z"', '"2025-10-11T20:53:16.983Z"', NULL),
  (10, 4, NULL, 31, 'The "mobile-first" point is so important. I''ve seen too many forms that are impossible to use on phones. Nice writeup!', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '10', '"2025-10-11T20:53:16.983Z"', '"2025-10-11T20:53:16.983Z"', NULL),
  (11, 4, NULL, 39, 'As someone who fills out a lot of forms, THANK YOU for spreading this knowledge! 😄', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '11', '"2025-10-11T20:53:16.983Z"', '"2025-10-11T20:53:16.983Z"', NULL),
  (12, 7, NULL, 35, 'This recipe is GOLD! Made it last night and it was incredible. The pasta water trick really does make all the difference.', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '12', '"2025-10-11T20:53:16.987Z"', '"2025-10-11T20:53:16.987Z"', NULL),
  (13, 7, 12, 36, 'So happy you loved it! My nonna would be proud 🥰', 'published', NULL, NULL, NULL, 0, 0, 0, 1, '12.13', '"2025-10-11T20:53:16.987Z"', '"2025-10-11T20:53:16.987Z"', NULL),
  (14, 7, NULL, 34, 'Quick question: can I substitute guanciale with pancetta if I can''t find it?', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '14', '"2025-10-11T20:53:16.987Z"', '"2025-10-11T20:53:16.987Z"', NULL),
  (15, 7, 14, 36, 'You can, but the flavor won''t be quite the same. Guanciale is fattier and has more depth. If you must substitute, pancetta is better than bacon at least!', 'published', NULL, NULL, NULL, 0, 0, 0, 1, '14.15', '"2025-10-11T20:53:16.987Z"', '"2025-10-11T20:53:16.987Z"', NULL),
  (16, 7, 14, 39, 'I found guanciale at an Italian deli in my city. Worth searching for specialty stores!', 'published', NULL, NULL, NULL, 0, 0, 0, 1, '14.16', '"2025-10-11T20:53:16.987Z"', '"2025-10-11T20:53:16.987Z"', NULL),
  (17, 7, NULL, 39, 'Trying this tonight! Been craving authentic carbonara forever.', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '17', '"2025-10-11T20:53:16.987Z"', '"2025-10-11T20:53:16.987Z"', NULL),
  (18, 11, NULL, 37, 'I''m interested! Played a few sessions before. Would love to play a dwarf cleric. Are you okay with new-ish players?', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '18', '"2025-10-11T20:53:16.990Z"', '"2025-10-11T20:53:16.990Z"', NULL),
  (19, 11, 18, 38, 'Absolutely! New players are very welcome. Dwarf cleric sounds great - we could use a healer. I''ll DM you the Discord link!', 'published', NULL, NULL, NULL, 0, 0, 0, 1, '18.19', '"2025-10-11T20:53:16.990Z"', '"2025-10-11T20:53:16.990Z"', NULL),
  (20, 11, NULL, 32, 'Never played but always wanted to try! Is it cool if I join as a complete beginner?', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '20', '"2025-10-11T20:53:16.990Z"', '"2025-10-11T20:53:16.990Z"', NULL),
  (21, 11, NULL, 39, 'Saturdays work for me! I''d like to play a rogue if that''s open. Been playing for 3 years.', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '21', '"2025-10-11T20:53:16.990Z"', '"2025-10-11T20:53:16.990Z"', NULL),
  (22, 13, NULL, 32, '1. Valorant\n2. Gold 2\n3. Y - need a team!', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '22', '"2025-10-11T20:53:16.993Z"', '"2025-10-11T20:53:16.993Z"', NULL),
  (23, 13, NULL, 38, '1. League of Legends\n2. Platinum 3\n3. N - already have a team', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '23', '"2025-10-11T20:53:16.993Z"', '"2025-10-11T20:53:16.993Z"', NULL),
  (24, 13, NULL, 39, '1. CS2\n2. DMG\n3. Y - can flex any role', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '24', '"2025-10-11T20:53:16.993Z"', '"2025-10-11T20:53:16.993Z"', NULL),
  (25, 13, NULL, 37, 'Great responses! Looking like Valorant is winning. I''ll set up a team formation thread soon for those looking for teammates.', 'published', NULL, NULL, NULL, 0, 0, 0, 0, '25', '"2025-10-11T20:53:16.993Z"', '"2025-10-11T20:53:16.993Z"', NULL);
SELECT setval('group_comments_id_seq', 25, true);

-- No data for group_comment_media
-- Insert data into group_votes (1 rows)
INSERT INTO group_votes (id, user_id, post_id, comment_id, vote_type, created_at, updated_at)
VALUES
  (1, 26, 1, NULL, 'upvote', '"2025-10-10T07:12:31.501Z"', '"2025-10-10T07:12:31.501Z"');
SELECT setval('group_votes_id_seq', 1, true);

-- No data for group_activity_log
-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Analyze tables for query optimization
ANALYZE groups;
ANALYZE group_memberships;
ANALYZE group_invitations;
ANALYZE group_posts;
ANALYZE group_post_media;
ANALYZE group_comments;
ANALYZE group_comment_media;
ANALYZE group_votes;
ANALYZE group_activity_log;
