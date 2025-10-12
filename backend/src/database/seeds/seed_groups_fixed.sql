/**
 * Comprehensive seed data for Groups System Testing - Fixed for actual schema
 * Creates users, groups, memberships, posts, and comments with various permission levels
 */



-- ============================================================================
-- STEP 1: Create Test Users with Profiles and Geolocation
-- ============================================================================

-- Admin user for Group 1
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_state, location_country)
VALUES (
  'admin_alice',
  'alice@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Alice',
  'Anderson',
  'Community organizer and tech enthusiast. Love connecting people! 🚀',
  'https://i.pravatar.cc/300?img=1',
  40.7128,
  -74.0060,
  'New York',
  'NY',
  'United States'
) ON CONFLICT (email) DO NOTHING;

-- Moderator for Group 1
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_state, location_country)
VALUES (
  'mod_bob',
  'bob@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Bob',
  'Builder',
  'Keeping communities safe and friendly. Coffee lover ☕',
  'https://i.pravatar.cc/300?img=12',
  34.0522,
  -118.2437,
  'Los Angeles',
  'CA',
  'United States'
) ON CONFLICT (email) DO NOTHING;

-- Regular member 1
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_country)
VALUES (
  'charlie_coder',
  'charlie.coder@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Charlie',
  'Chen',
  'Full-stack developer. Building cool stuff with React and Node 💻',
  'https://i.pravatar.cc/300?img=13',
  37.7749,
  -122.4194,
  'San Francisco',
  'United States'
) ON CONFLICT (email) DO NOTHING;

-- Regular member 2
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_country)
VALUES (
  'diana_design',
  'diana@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Diana',
  'Davis',
  'UX/UI Designer. Making the web beautiful one pixel at a time ✨',
  'https://i.pravatar.cc/300?img=5',
  51.5074,
  -0.1278,
  'London',
  'United Kingdom'
) ON CONFLICT (email) DO NOTHING;

-- Regular member 3
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_country)
VALUES (
  'evan_photo',
  'evan@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Evan',
  'Evans',
  'Photographer and visual storyteller 📸 Capturing moments',
  'https://i.pravatar.cc/300?img=15',
  48.8566,
  2.3522,
  'Paris',
  'France'
) ON CONFLICT (email) DO NOTHING;

-- Admin user for Group 2
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_country)
VALUES (
  'frank_foodie',
  'frank@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Frank',
  'Foster',
  'Food blogger and recipe creator. Sharing delicious adventures 🍕',
  'https://i.pravatar.cc/300?img=11',
  35.6762,
  139.6503,
  'Tokyo',
  'Japan'
) ON CONFLICT (email) DO NOTHING;

-- Member for Group 2
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_country)
VALUES (
  'grace_chef',
  'grace@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Grace',
  'Garcia',
  'Professional chef. Teaching people to cook with love 👩‍🍳',
  'https://i.pravatar.cc/300?img=9',
  41.9028,
  12.4964,
  'Rome',
  'Italy'
) ON CONFLICT (email) DO NOTHING;

-- Admin user for Group 3
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_country)
VALUES (
  'henry_gamer',
  'henry@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Henry',
  'Harris',
  'Esports enthusiast and streamer 🎮 Come watch my streams!',
  'https://i.pravatar.cc/300?img=17',
  -33.8688,
  151.2093,
  'Sydney',
  'Australia'
) ON CONFLICT (email) DO NOTHING;

-- Member for Group 3
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_country)
VALUES (
  'iris_rpg',
  'iris@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Iris',
  'Irwin',
  'RPG lover and dungeon master. Rolling dice since 2005 🎲',
  'https://i.pravatar.cc/300?img=16',
  49.2827,
  -123.1207,
  'Vancouver',
  'Canada'
) ON CONFLICT (email) DO NOTHING;

-- Cross-group member
INSERT INTO users (username, email, password_hash, first_name, last_name, bio, avatar_url, location_latitude, location_longitude, location_city, location_country)
VALUES (
  'jack_social',
  'jack@groups.test',
  '$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.',
  'Jack',
  'Jackson',
  'Community connector. Member of many groups! 🌐',
  'https://i.pravatar.cc/300?img=18',
  52.5200,
  13.4050,
  'Berlin',
  'Germany'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- STEP 2: Create Three Test Groups
-- ============================================================================

-- Group 1: Tech Community (Public)
INSERT INTO groups (name, slug, display_name, description, visibility, avatar_url, banner_url, creator_id, require_approval, allow_posts, post_approval_required, allow_multimedia, allowed_media_types, max_file_size_mb)
VALUES (
  'techcommunity',
  'techcommunity',
  'Tech Community',
  'A vibrant community for developers, designers, and tech enthusiasts to share knowledge, ask questions, and collaborate on projects. All skill levels welcome!',
  'public',
  'https://picsum.photos/seed/tech/200/200',
  'https://picsum.photos/seed/tech-banner/1200/300',
  (SELECT id FROM users WHERE username = 'admin_alice'),
  false,
  true,
  false,
  true,
  ARRAY['image', 'video', 'pdf', 'link']::varchar[],
  25
) ON CONFLICT (name) DO NOTHING;

-- Group 2: Foodie Heaven (Public)
INSERT INTO groups (name, slug, display_name, description, visibility, avatar_url, banner_url, creator_id, require_approval, allow_posts, post_approval_required, allow_multimedia, allowed_media_types, max_file_size_mb)
VALUES (
  'foodieheaven',
  'foodieheaven',
  'Foodie Heaven',
  'Share your favorite recipes, restaurant recommendations, and cooking tips. A delicious community for food lovers around the world! 🍽️',
  'public',
  'https://picsum.photos/seed/food/200/200',
  'https://picsum.photos/seed/food-banner/1200/300',
  (SELECT id FROM users WHERE username = 'frank_foodie'),
  false,
  true,
  false,
  true,
  ARRAY['image', 'video', 'link']::varchar[],
  50
) ON CONFLICT (name) DO NOTHING;

-- Group 3: Gaming Hub (Private - Requires Approval)
INSERT INTO groups (name, slug, display_name, description, visibility, avatar_url, banner_url, creator_id, require_approval, allow_posts, post_approval_required, allow_multimedia, allowed_media_types, max_file_size_mb)
VALUES (
  'gaminghub',
  'gaminghub',
  'Gaming Hub',
  'Private gaming community for serious gamers. Share strategies, organize tournaments, and find teammates. Apply to join!',
  'private',
  'https://picsum.photos/seed/gaming/200/200',
  'https://picsum.photos/seed/gaming-banner/1200/300',
  (SELECT id FROM users WHERE username = 'henry_gamer'),
  true,
  true,
  false,
  true,
  ARRAY['image', 'video', 'link']::varchar[],
  100
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 3: Create Group Memberships with Different Roles
-- ============================================================================

-- Tech Community Memberships
INSERT INTO group_memberships (group_id, user_id, role, status)
VALUES
  ((SELECT id FROM groups WHERE slug = 'techcommunity'), (SELECT id FROM users WHERE username = 'admin_alice'), 'admin', 'active'),
  ((SELECT id FROM groups WHERE slug = 'techcommunity'), (SELECT id FROM users WHERE username = 'mod_bob'), 'moderator', 'active'),
  ((SELECT id FROM groups WHERE slug = 'techcommunity'), (SELECT id FROM users WHERE username = 'charlie_coder'), 'member', 'active'),
  ((SELECT id FROM groups WHERE slug = 'techcommunity'), (SELECT id FROM users WHERE username = 'diana_design'), 'member', 'active'),
  ((SELECT id FROM groups WHERE slug = 'techcommunity'), (SELECT id FROM users WHERE username = 'jack_social'), 'member', 'active')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Foodie Heaven Memberships
INSERT INTO group_memberships (group_id, user_id, role, status)
VALUES
  ((SELECT id FROM groups WHERE slug = 'foodieheaven'), (SELECT id FROM users WHERE username = 'frank_foodie'), 'admin', 'active'),
  ((SELECT id FROM groups WHERE slug = 'foodieheaven'), (SELECT id FROM users WHERE username = 'grace_chef'), 'member', 'active'),
  ((SELECT id FROM groups WHERE slug = 'foodieheaven'), (SELECT id FROM users WHERE username = 'evan_photo'), 'member', 'active'),
  ((SELECT id FROM groups WHERE slug = 'foodieheaven'), (SELECT id FROM users WHERE username = 'jack_social'), 'member', 'active')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Gaming Hub Memberships
INSERT INTO group_memberships (group_id, user_id, role, status)
VALUES
  ((SELECT id FROM groups WHERE slug = 'gaminghub'), (SELECT id FROM users WHERE username = 'henry_gamer'), 'admin', 'active'),
  ((SELECT id FROM groups WHERE slug = 'gaminghub'), (SELECT id FROM users WHERE username = 'iris_rpg'), 'member', 'active'),
  ((SELECT id FROM groups WHERE slug = 'gaminghub'), (SELECT id FROM users WHERE username = 'charlie_coder'), 'member', 'active'),
  ((SELECT id FROM groups WHERE slug = 'gaminghub'), (SELECT id FROM users WHERE username = 'jack_social'), 'member', 'active')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ============================================================================
-- STEP 4: Create Posts in Each Group
-- ============================================================================

-- Tech Community Posts
INSERT INTO group_posts (group_id, user_id, title, content, post_type, is_pinned)
VALUES (
  (SELECT id FROM groups WHERE slug = 'techcommunity'),
  (SELECT id FROM users WHERE username = 'admin_alice'),
  'Welcome to Tech Community! 👋',
  'Welcome everyone! This is a space where we can share knowledge, ask questions, and grow together. Please be respectful and help each other out. Looking forward to great discussions!

Rules:
1. Be kind and respectful
2. No spam or self-promotion without permission
3. Search before asking questions
4. Share your knowledge freely',
  'text',
  true
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'techcommunity'),
  (SELECT id FROM users WHERE username = 'charlie_coder'),
  'Just built my first full-stack app with React and Node!',
  'After months of learning, I finally deployed my first complete application. It''s a task management tool with real-time updates using WebSockets.

Tech stack:
- Frontend: React 18, TypeScript, styled-components
- Backend: Node.js, Express, PostgreSQL
- Real-time: Socket.io
- Deployment: Docker + AWS

Happy to answer any questions about the journey! The hardest part was definitely getting WebSocket authentication right.',
  'text'
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'techcommunity'),
  (SELECT id FROM users WHERE username = 'diana_design'),
  'Tips for designing better forms - A UX perspective',
  'As a designer, I see poorly designed forms everywhere. Here are my top tips for creating forms that users actually want to fill out:

1. **Only ask for what you need** - Every field is friction
2. **Clear labels and placeholders** - Users should never guess
3. **Inline validation** - Show errors as users type, not on submit
4. **Logical grouping** - Related fields should be together
5. **Smart defaults** - Pre-fill when possible
6. **Mobile-first** - Test on actual devices

Would love to hear what frustrates you most about forms!',
  'text'
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'techcommunity'),
  (SELECT id FROM users WHERE username = 'mod_bob'),
  'Weekly challenge: Build a REST API in your favorite language',
  'Let''s have some fun! This week''s challenge:

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

Share your solution in the comments. Can''t wait to see what you build!',
  'text'
);

-- Foodie Heaven Posts
INSERT INTO group_posts (group_id, user_id, title, content, post_type, is_pinned)
VALUES (
  (SELECT id FROM groups WHERE slug = 'foodieheaven'),
  (SELECT id FROM users WHERE username = 'frank_foodie'),
  'Welcome to Foodie Heaven! 🍕🍣🍰',
  'Hey food lovers! This is your space to share recipes, restaurant finds, and cooking adventures.

Share:
✨ Your favorite recipes
📸 Beautiful food photos
🏪 Restaurant recommendations
💡 Cooking tips and tricks
❓ Questions about ingredients or techniques

Let''s make this a delicious community!',
  'text',
  true
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'foodieheaven'),
  (SELECT id FROM users WHERE username = 'grace_chef'),
  'My grandmother''s authentic Italian carbonara recipe',
  'After many requests, here''s my nonna''s carbonara recipe that''s been passed down for generations:

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

The secret is the pasta water - it creates the silky sauce! 🇮🇹',
  'text'
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'foodieheaven'),
  (SELECT id FROM users WHERE username = 'evan_photo'),
  'Best food photography tips for smartphone users 📸',
  'You don''t need fancy equipment to take drool-worthy food photos! Here are my tips:

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

Happy shooting! 📷',
  'text'
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'foodieheaven'),
  (SELECT id FROM users WHERE username = 'jack_social'),
  'Found an amazing ramen place in Berlin!',
  'Just tried Takumi in Berlin and WOW! 🍜

The tonkotsu broth was rich and creamy, perfectly seasoned. The chashu pork melted in my mouth. Even got the soft-boiled egg just right - that jammy yolk!

Price: €12-15 per bowl
Wait time: 20-30 mins during peak hours
Worth it? ABSOLUTELY!

If you''re in Berlin, you must try it. Best ramen outside of Japan I''ve had.',
  'text'
);

-- Gaming Hub Posts
INSERT INTO group_posts (group_id, user_id, title, content, post_type, is_pinned)
VALUES (
  (SELECT id FROM groups WHERE slug = 'gaminghub'),
  (SELECT id FROM users WHERE username = 'henry_gamer'),
  'Gaming Hub Rules & Guidelines 🎮',
  'Welcome to Gaming Hub!

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

Let''s build a positive gaming community!',
  'text',
  true
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'gaminghub'),
  (SELECT id FROM users WHERE username = 'iris_rpg'),
  'Looking for players for a D&D 5e campaign!',
  'Starting a new Dungeons & Dragons campaign and looking for 3-4 players!

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

If interested, drop a comment with your experience level and what kind of character you''d like to play. Session 0 is next Saturday! 🎲',
  'text'
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'gaminghub'),
  (SELECT id FROM users WHERE username = 'charlie_coder'),
  'Speedrunning tips for beginners',
  'Been speedrunning for 2 years now. Here''s what I wish I knew when starting:

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

What games are you interested in speedrunning? 🏃‍♂️',
  'text'
);

INSERT INTO group_posts (group_id, user_id, title, content, post_type)
VALUES (
  (SELECT id FROM groups WHERE slug = 'gaminghub'),
  (SELECT id FROM users WHERE username = 'henry_gamer'),
  'Tournament announcement: Spring Championship 🏆',
  'Gaming Hub is hosting our first tournament!

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
3. Looking for team? Y/N',
  'text'
);

-- ============================================================================
-- STEP 5: Create Comments and Nested Replies
-- ============================================================================

-- Comments on Charlie's React app post (Tech Community)
DO $$
DECLARE
  charlie_post_id INT;
  alice_id INT := (SELECT id FROM users WHERE username = 'admin_alice');
  diana_id INT := (SELECT id FROM users WHERE username = 'diana_design');
  bob_id INT := (SELECT id FROM users WHERE username = 'mod_bob');
  charlie_id INT := (SELECT id FROM users WHERE username = 'charlie_coder');
  comment1_id INT;
  comment2_id INT;
BEGIN
  -- Get Charlie's post
  SELECT id INTO charlie_post_id FROM group_posts gp
  JOIN users u ON gp.user_id = u.id
  JOIN groups g ON gp.group_id = g.id
  WHERE g.slug = 'techcommunity'
  AND u.username = 'charlie_coder'
  AND gp.title LIKE '%full-stack app%';

  IF charlie_post_id IS NOT NULL THEN
    -- Alice's comment
    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (charlie_post_id, alice_id, 'This is amazing! Congrats on shipping your first app. How did you handle WebSocket reconnection logic?')
    RETURNING id INTO comment1_id;

    -- Charlie's reply to Alice
    INSERT INTO group_comments (post_id, user_id, parent_id, content)
    VALUES (charlie_post_id, charlie_id, comment1_id, 'Thanks! I used socket.io''s built-in reconnection with exponential backoff. Also implemented a heartbeat to detect stale connections. Took a while to get right but works great now!');

    -- Diana's comment
    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (charlie_post_id, diana_id, 'Love seeing the tech stack! Did you design the UI yourself or use a component library?')
    RETURNING id INTO comment2_id;

    -- Charlie's reply to Diana
    INSERT INTO group_comments (post_id, user_id, parent_id, content)
    VALUES (charlie_post_id, charlie_id, comment2_id, 'I used styled-components for custom components. Wanted to learn it properly instead of relying on Material-UI. It was challenging but learned so much!');

    -- Diana's follow-up reply
    INSERT INTO group_comments (post_id, user_id, parent_id, content)
    VALUES (charlie_post_id, diana_id, comment2_id, 'Good choice! styled-components is powerful once you get the hang of it. Would love to see screenshots if you''re comfortable sharing!');

    -- Bob's comment
    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (charlie_post_id, bob_id, 'Impressive work! Any plans to open source it?');
  END IF;
END $$;

-- Comments on Diana's form design post
DO $$
DECLARE
  diana_post_id INT;
  charlie_id INT := (SELECT id FROM users WHERE username = 'charlie_coder');
  bob_id INT := (SELECT id FROM users WHERE username = 'mod_bob');
  diana_id INT := (SELECT id FROM users WHERE username = 'diana_design');
  jack_id INT := (SELECT id FROM users WHERE username = 'jack_social');
  comment1_id INT;
BEGIN
  SELECT id INTO diana_post_id FROM group_posts gp
  JOIN users u ON gp.user_id = u.id
  JOIN groups g ON gp.group_id = g.id
  WHERE g.slug = 'techcommunity'
  AND u.username = 'diana_design'
  AND gp.title LIKE '%form%';

  IF diana_post_id IS NOT NULL THEN
    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (diana_post_id, charlie_id, 'Great tips! I always struggle with inline validation. Do you validate on every keystroke or on blur?')
    RETURNING id INTO comment1_id;

    INSERT INTO group_comments (post_id, user_id, parent_id, content)
    VALUES (diana_post_id, diana_id, comment1_id, 'Good question! I usually do it on blur first, then on every keystroke once they''ve touched the field. This way you don''t show errors while they''re still typing.');

    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (diana_post_id, bob_id, 'The "mobile-first" point is so important. I''ve seen too many forms that are impossible to use on phones. Nice writeup!');

    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (diana_post_id, jack_id, 'As someone who fills out a lot of forms, THANK YOU for spreading this knowledge! 😄');
  END IF;
END $$;

-- Comments on Grace's carbonara recipe
DO $$
DECLARE
  grace_post_id INT;
  frank_id INT := (SELECT id FROM users WHERE username = 'frank_foodie');
  evan_id INT := (SELECT id FROM users WHERE username = 'evan_photo');
  jack_id INT := (SELECT id FROM users WHERE username = 'jack_social');
  grace_id INT := (SELECT id FROM users WHERE username = 'grace_chef');
  comment1_id INT;
  comment2_id INT;
BEGIN
  SELECT id INTO grace_post_id FROM group_posts gp
  JOIN users u ON gp.user_id = u.id
  JOIN groups g ON gp.group_id = g.id
  WHERE g.slug = 'foodieheaven'
  AND u.username = 'grace_chef'
  AND gp.title LIKE '%carbonara%';

  IF grace_post_id IS NOT NULL THEN
    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (grace_post_id, frank_id, 'This recipe is GOLD! Made it last night and it was incredible. The pasta water trick really does make all the difference.')
    RETURNING id INTO comment1_id;

    INSERT INTO group_comments (post_id, user_id, parent_id, content)
    VALUES (grace_post_id, grace_id, comment1_id, 'So happy you loved it! My nonna would be proud 🥰');

    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (grace_post_id, evan_id, 'Quick question: can I substitute guanciale with pancetta if I can''t find it?')
    RETURNING id INTO comment2_id;

    INSERT INTO group_comments (post_id, user_id, parent_id, content)
    VALUES (grace_post_id, grace_id, comment2_id, 'You can, but the flavor won''t be quite the same. Guanciale is fattier and has more depth. If you must substitute, pancetta is better than bacon at least!');

    INSERT INTO group_comments (post_id, user_id, parent_id, content)
    VALUES (grace_post_id, jack_id, comment2_id, 'I found guanciale at an Italian deli in my city. Worth searching for specialty stores!');

    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (grace_post_id, jack_id, 'Trying this tonight! Been craving authentic carbonara forever.');
  END IF;
END $$;

-- Comments on Iris's D&D post
DO $$
DECLARE
  iris_post_id INT;
  henry_id INT := (SELECT id FROM users WHERE username = 'henry_gamer');
  charlie_id INT := (SELECT id FROM users WHERE username = 'charlie_coder');
  jack_id INT := (SELECT id FROM users WHERE username = 'jack_social');
  iris_id INT := (SELECT id FROM users WHERE username = 'iris_rpg');
  comment1_id INT;
BEGIN
  SELECT id INTO iris_post_id FROM group_posts gp
  JOIN users u ON gp.user_id = u.id
  JOIN groups g ON gp.group_id = g.id
  WHERE g.slug = 'gaminghub'
  AND u.username = 'iris_rpg'
  AND gp.title LIKE '%D&D%';

  IF iris_post_id IS NOT NULL THEN
    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (iris_post_id, henry_id, 'I''m interested! Played a few sessions before. Would love to play a dwarf cleric. Are you okay with new-ish players?')
    RETURNING id INTO comment1_id;

    INSERT INTO group_comments (post_id, user_id, parent_id, content)
    VALUES (iris_post_id, iris_id, comment1_id, 'Absolutely! New players are very welcome. Dwarf cleric sounds great - we could use a healer. I''ll DM you the Discord link!');

    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (iris_post_id, charlie_id, 'Never played but always wanted to try! Is it cool if I join as a complete beginner?');

    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (iris_post_id, jack_id, 'Saturdays work for me! I''d like to play a rogue if that''s open. Been playing for 3 years.');
  END IF;
END $$;

-- Comments on Henry's tournament post
DO $$
DECLARE
  tournament_post_id INT;
  henry_id INT := (SELECT id FROM users WHERE username = 'henry_gamer');
  charlie_id INT := (SELECT id FROM users WHERE username = 'charlie_coder');
  iris_id INT := (SELECT id FROM users WHERE username = 'iris_rpg');
  jack_id INT := (SELECT id FROM users WHERE username = 'jack_social');
BEGIN
  SELECT id INTO tournament_post_id FROM group_posts gp
  JOIN users u ON gp.user_id = u.id
  JOIN groups g ON gp.group_id = g.id
  WHERE g.slug = 'gaminghub'
  AND u.username = 'henry_gamer'
  AND gp.title LIKE '%Tournament%';

  IF tournament_post_id IS NOT NULL THEN
    INSERT INTO group_comments (post_id, user_id, content)
    VALUES
      (tournament_post_id, charlie_id, '1. Valorant\n2. Gold 2\n3. Y - need a team!'),
      (tournament_post_id, iris_id, '1. League of Legends\n2. Platinum 3\n3. N - already have a team'),
      (tournament_post_id, jack_id, '1. CS2\n2. DMG\n3. Y - can flex any role');

    INSERT INTO group_comments (post_id, user_id, content)
    VALUES (tournament_post_id, henry_id, 'Great responses! Looking like Valorant is winning. I''ll set up a team formation thread soon for those looking for teammates.');
  END IF;
END $$;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT '=== SEED DATA SUMMARY ===' as info;

SELECT
  'Users created' as metric,
  COUNT(*)::text as count
FROM users
WHERE email LIKE '%@groups.test'

UNION ALL

SELECT
  'Groups created' as metric,
  COUNT(*)::text as count
FROM groups
WHERE slug IN ('techcommunity', 'foodieheaven', 'gaminghub')

UNION ALL

SELECT
  'Memberships created' as metric,
  COUNT(*)::text as count
FROM group_memberships gm
JOIN groups g ON g.id = gm.group_id
WHERE g.slug IN ('techcommunity', 'foodieheaven', 'gaminghub')

UNION ALL

SELECT
  'Posts created' as metric,
  COUNT(*)::text as count
FROM group_posts gp
JOIN groups g ON g.id = gp.group_id
WHERE g.slug IN ('techcommunity', 'foodieheaven', 'gaminghub')

UNION ALL

SELECT
  'Comments created' as metric,
  COUNT(*)::text as count
FROM group_comments gc
JOIN group_posts gp ON gp.id = gc.post_id
JOIN groups g ON g.id = gp.group_id
WHERE g.slug IN ('techcommunity', 'foodieheaven', 'gaminghub');

-- Show groups with member counts
SELECT '=== GROUPS OVERVIEW ===' as info;

SELECT
  display_name,
  slug,
  visibility,
  member_count,
  post_count
FROM groups
WHERE slug IN ('techcommunity', 'foodieheaven', 'gaminghub')
ORDER BY created_at;
