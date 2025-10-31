-- ============================================================================
-- SEED SCRIPT: User posts and associated data
-- ============================================================================
-- Generated: 2025-10-31T15:47:39.454Z
--
-- Tables included:
--   - posts
--   - media
--   - reactions
--   - shares
--   - comments
--   - comment_interactions
--   - comment_metrics
--   - poll_options
--   - poll_votes
--
-- Usage:
--   psql -U <user> -d <database> -f 03_posts.sql
--
-- Note: Run these scripts in numerical order (01, 02, 03, etc.)
-- ============================================================================

BEGIN;

-- Temporarily disable triggers for faster bulk insert
SET session_replication_role = 'replica';

-- Insert data into posts (18 rows)
INSERT INTO posts (id, user_id, content, privacy_level, is_published, is_archived, views_count, scheduled_for, created_at, updated_at, deleted_at, deleted_by, deletion_reason)
VALUES
  (17, 18, 'Just finished building my first React application! 🚀 The component lifecycle still amazes me. Anyone else find useState hooks as elegant as I do?', 'public', TRUE, FALSE, 0, NULL, '"2025-09-08T21:50:54.045Z"', '"2025-09-29T02:47:48.224Z"', NULL, NULL, NULL),
  (18, 20, 'Been diving deep into TypeScript lately. The type safety is incredible, but the learning curve is steep! Any tips for someone transitioning from vanilla JS?', 'public', TRUE, FALSE, 0, NULL, '"2025-09-04T00:49:10.738Z"', '"2025-09-29T02:47:48.226Z"', NULL, NULL, NULL),
  (19, 12, 'Working on a new design system for our team. Color theory is more complex than I initially thought! 🎨 What are your favorite design tools?', 'public', TRUE, FALSE, 0, NULL, '"2025-09-23T04:35:21.035Z"', '"2025-09-29T02:47:48.229Z"', NULL, NULL, NULL),
  (20, 12, 'Just deployed my first microservice architecture. Docker containers everywhere! 🐳 The orchestration is beautiful when it all comes together.', 'public', TRUE, FALSE, 0, NULL, '"2025-09-04T08:23:47.562Z"', '"2025-09-29T02:47:48.231Z"', NULL, NULL, NULL),
  (21, 21, 'Late night coding session debugging a memory leak. Sometimes the best solutions come at 2 AM with a cup of coffee ☕', 'friends', TRUE, FALSE, 0, NULL, '"2025-08-30T10:56:47.431Z"', '"2025-09-29T02:47:48.234Z"', NULL, NULL, NULL),
  (22, 16, 'Attended an amazing tech conference today! The keynote on AI ethics really made me think about our responsibility as developers.', 'public', TRUE, FALSE, 0, NULL, '"2025-09-01T19:32:59.119Z"', '"2025-09-29T02:47:48.236Z"', NULL, NULL, NULL),
  (23, 12, 'Finally mastered CSS Grid after years of flexbox! The layout possibilities are endless. Who else is team Grid over Flexbox?', 'public', TRUE, FALSE, 0, NULL, '"2025-08-30T07:07:21.052Z"', '"2025-09-29T02:47:48.238Z"', NULL, NULL, NULL),
  (24, 14, 'Working on a game engine in my spare time. Physics calculations are harder than I expected, but so rewarding when they work! 🎮', 'public', TRUE, FALSE, 0, NULL, '"2025-09-18T12:58:18.909Z"', '"2025-09-29T02:47:48.241Z"', NULL, NULL, NULL),
  (25, 15, 'Penetration testing results came back clean! 🔐 Always satisfying when security measures hold up under scrutiny.', 'friends', TRUE, FALSE, 0, NULL, '"2025-09-07T15:01:29.377Z"', '"2025-09-29T02:47:48.243Z"', NULL, NULL, NULL),
  (26, 13, 'Experimenting with WebAssembly for performance-critical applications. The speed improvements are incredible! Anyone else exploring WASM?', 'public', TRUE, FALSE, 0, NULL, '"2025-08-31T13:40:13.673Z"', '"2025-09-29T02:47:48.246Z"', NULL, NULL, NULL),
  (27, 20, 'Teaching myself Machine Learning with Python. Neural networks are like magic, but with math! 🧠✨', 'public', TRUE, FALSE, 0, NULL, '"2025-09-15T00:51:59.381Z"', '"2025-09-29T02:47:48.249Z"', NULL, NULL, NULL),
  (28, 16, 'Refactored 500 lines of legacy code today. It''s like archaeology, but with more semicolons. The satisfaction is real though!', 'public', TRUE, FALSE, 0, NULL, '"2025-09-10T12:23:23.082Z"', '"2025-09-29T02:47:48.253Z"', NULL, NULL, NULL),
  (29, 14, 'New project idea: A collaborative platform for developers to share code snippets. Think GitHub meets StackOverflow. Thoughts?', 'public', TRUE, FALSE, 0, NULL, '"2025-09-02T08:25:44.952Z"', '"2025-09-29T02:47:48.255Z"', NULL, NULL, NULL),
  (30, 13, 'Just finished reading ''Clean Code'' by Robert Martin. My variable naming will never be the same! 📚', 'public', TRUE, FALSE, 0, NULL, '"2025-09-11T01:01:36.595Z"', '"2025-09-29T02:47:48.258Z"', NULL, NULL, NULL),
  (31, 18, 'Weekend hackathon was intense! Built a real-time chat app with WebSockets. Sleep is overrated anyway... 😴', 'public', TRUE, FALSE, 0, NULL, '"2025-09-13T11:24:27.106Z"', '"2025-09-29T02:47:48.261Z"', NULL, NULL, NULL),
  (32, 22, 'Testing multi-media support! 📸 Here are some beautiful sample images to showcase the new media gallery feature.', 'public', TRUE, FALSE, 0, NULL, '"2025-10-02T10:37:29.268Z"', '"2025-10-02T10:37:29.268Z"', NULL, NULL, NULL),
  (33, 22, 'sdfsf', 'public', TRUE, FALSE, 0, NULL, '"2025-10-02T03:39:13.297Z"', '"2025-10-02T03:39:13.297Z"', NULL, NULL, NULL),
  (34, 22, 'sample psot', 'public', TRUE, FALSE, 0, NULL, '"2025-10-07T15:41:01.506Z"', '"2025-10-07T15:41:01.506Z"', NULL, NULL, NULL);
SELECT setval('posts_id_seq', 34, true);

-- Insert data into media (6 rows)
INSERT INTO media (id, user_id, post_id, comment_id, filename, original_name, file_path, file_url, mime_type, file_size, media_type, width, height, duration, alt_text, is_processed, thumbnail_path, thumbnail_url, created_at, updated_at)
VALUES
  (1, 22, 32, NULL, 'sample1.jpg', 'sample1.jpg', 'images/sample1.jpg', '/uploads/images/sample1.jpg', 'image/jpeg', 20000, 'image', 800, 600, NULL, 'Sample Red Image', FALSE, NULL, NULL, '"2025-10-02T10:37:29.272Z"', '"2025-10-02T10:37:29.272Z"'),
  (2, 22, 32, NULL, 'sample2.jpg', 'sample2.jpg', 'images/sample2.jpg', '/uploads/images/sample2.jpg', 'image/jpeg', 20000, 'image', 800, 600, NULL, 'Sample Teal Image', FALSE, NULL, NULL, '"2025-10-02T10:37:29.276Z"', '"2025-10-02T10:37:29.276Z"'),
  (3, 22, 32, NULL, 'sample3.jpg', 'sample3.jpg', 'images/sample3.jpg', '/uploads/images/sample3.jpg', 'image/jpeg', 20000, 'image', 800, 600, NULL, 'Sample Blue Image', FALSE, NULL, NULL, '"2025-10-02T10:37:29.278Z"', '"2025-10-02T10:37:29.278Z"'),
  (4, 22, 32, NULL, 'sample4.jpg', 'sample4.jpg', 'images/sample4.jpg', '/uploads/images/sample4.jpg', 'image/jpeg', 20000, 'image', 800, 600, NULL, 'Sample Orange Image', FALSE, NULL, NULL, '"2025-10-02T10:37:29.281Z"', '"2025-10-02T10:37:29.281Z"'),
  (5, 22, 33, NULL, 'd3e26f97-c326-4b27-a545-93afb526f731.jpg', 'lovebird.jpg', 'images/d3e26f97-c326-4b27-a545-93afb526f731.jpg', '/uploads/images/d3e26f97-c326-4b27-a545-93afb526f731.jpg', 'image/jpeg', 4401263, 'image', 5184, 3456, NULL, NULL, FALSE, NULL, NULL, '"2025-10-02T03:39:14.764Z"', '"2025-10-02T03:39:14.764Z"'),
  (6, 22, 34, NULL, 'a2d8e01f-38df-478a-8771-868fdad9d71a.jpg', 'lovebird.jpg', 'images/a2d8e01f-38df-478a-8771-868fdad9d71a.jpg', '/uploads/images/a2d8e01f-38df-478a-8771-868fdad9d71a.jpg', 'image/jpeg', 4401263, 'image', 5184, 3456, NULL, NULL, FALSE, NULL, NULL, '"2025-10-07T15:41:03.109Z"', '"2025-10-07T15:41:03.109Z"');
SELECT setval('media_id_seq', 6, true);

-- Insert data into reactions (62 rows)
INSERT INTO reactions (id, user_id, post_id, comment_id, emoji_name, emoji_unicode, created_at, updated_at)
VALUES
  (77, 20, 17, NULL, 'thumbs_down', '👎', '"2025-08-31T05:34:13.455Z"', '"2025-09-29T02:47:48.668Z"'),
  (78, 16, 17, NULL, 'angry', '😡', '"2025-09-03T04:41:01.092Z"', '"2025-10-08T23:01:22.432Z"'),
  (79, 15, 17, NULL, 'laugh', '😂', '"2025-09-13T09:02:49.167Z"', '"2025-10-08T23:01:22.432Z"'),
  (80, 14, 17, NULL, 'wow', '😮', '"2025-09-14T11:26:48.630Z"', '"2025-10-08T23:01:22.432Z"'),
  (81, 17, 17, NULL, '100', '💯', '"2025-09-13T21:49:24.230Z"', '"2025-09-29T02:47:48.683Z"'),
  (82, 19, 17, NULL, 'love', '❤️', '"2025-09-17T12:24:37.502Z"', '"2025-10-08T23:01:22.432Z"'),
  (83, 13, 18, NULL, 'like', '👏', '"2025-09-10T02:02:11.332Z"', '"2025-10-08T23:01:22.432Z"'),
  (84, 19, 19, NULL, 'like', '👏', '"2025-09-03T21:19:29.843Z"', '"2025-10-08T23:01:22.432Z"'),
  (85, 16, 19, NULL, 'tada', '🎉', '"2025-09-25T17:39:08.915Z"', '"2025-09-29T02:47:48.698Z"'),
  (86, 15, 19, NULL, 'thumbs_down', '👎', '"2025-09-09T22:36:45.603Z"', '"2025-09-29T02:47:48.702Z"'),
  (87, 21, 19, NULL, 'wow', '😮', '"2025-09-11T10:04:59.283Z"', '"2025-10-08T23:01:22.432Z"'),
  (88, 17, 19, NULL, 'wow', '😮', '"2025-09-14T09:58:19.869Z"', '"2025-10-08T23:01:22.432Z"'),
  (89, 14, 19, NULL, 'fire', '🔥', '"2025-09-06T23:30:07.802Z"', '"2025-09-29T02:47:48.714Z"'),
  (90, 15, 20, NULL, 'like', '🤔', '"2025-09-06T15:24:37.918Z"', '"2025-10-08T23:01:22.432Z"'),
  (91, 19, 20, NULL, 'wow', '😮', '"2025-09-17T16:48:31.643Z"', '"2025-10-08T23:01:22.432Z"'),
  (92, 14, 20, NULL, 'fire', '🔥', '"2025-09-20T19:30:06.119Z"', '"2025-09-29T02:47:48.724Z"'),
  (93, 13, 20, NULL, 'tada', '🎉', '"2025-09-10T13:33:20.206Z"', '"2025-09-29T02:47:48.727Z"'),
  (94, 17, 20, NULL, 'sad', '😢', '"2025-09-22T11:12:47.322Z"', '"2025-10-08T23:01:22.432Z"'),
  (95, 15, 21, NULL, '100', '💯', '"2025-08-30T17:09:20.238Z"', '"2025-09-29T02:47:48.734Z"'),
  (96, 13, 21, NULL, 'thumbs_down', '👎', '"2025-09-01T15:16:49.749Z"', '"2025-09-29T02:47:48.738Z"'),
  (97, 16, 21, NULL, 'thumbs_down', '👎', '"2025-09-14T07:09:17.932Z"', '"2025-09-29T02:47:48.741Z"'),
  (98, 14, 21, NULL, 'angry', '😡', '"2025-09-03T14:12:58.096Z"', '"2025-10-08T23:01:22.432Z"'),
  (99, 12, 22, NULL, 'wow', '😮', '"2025-09-07T12:55:52.029Z"', '"2025-10-08T23:01:22.432Z"'),
  (100, 15, 22, NULL, 'laugh', '😂', '"2025-09-02T16:18:14.989Z"', '"2025-10-08T23:01:22.432Z"'),
  (101, 15, 23, NULL, 'laugh', '😂', '"2025-09-13T13:20:45.293Z"', '"2025-10-08T23:01:22.432Z"'),
  (102, 19, 23, NULL, 'wow', '😮', '"2025-09-02T06:01:19.508Z"', '"2025-10-08T23:01:22.432Z"'),
  (103, 13, 23, NULL, 'fire', '🔥', '"2025-09-16T17:35:49.190Z"', '"2025-09-29T02:47:48.761Z"'),
  (104, 21, 23, NULL, 'laugh', '😂', '"2025-09-12T05:44:28.137Z"', '"2025-10-08T23:01:22.432Z"'),
  (105, 18, 23, NULL, 'thumbs_down', '👎', '"2025-09-24T15:50:53.518Z"', '"2025-09-29T02:47:48.769Z"'),
  (106, 15, 24, NULL, 'wow', '😮', '"2025-09-05T20:46:41.819Z"', '"2025-10-08T23:01:22.432Z"'),
  (107, 19, 24, NULL, 'thumbs_down', '👎', '"2025-09-18T01:19:26.062Z"', '"2025-09-29T02:47:48.777Z"'),
  (108, 18, 25, NULL, 'wow', '😮', '"2025-09-02T08:07:34.114Z"', '"2025-10-08T23:01:22.432Z"'),
  (109, 13, 25, NULL, '100', '💯', '"2025-09-11T17:12:48.773Z"', '"2025-09-29T02:47:48.784Z"'),
  (110, 12, 25, NULL, 'like', '👏', '"2025-09-24T13:10:47.896Z"', '"2025-10-08T23:01:22.432Z"'),
  (111, 15, 26, NULL, 'like', '👍', '"2025-09-04T05:46:26.971Z"', '"2025-10-08T23:01:22.432Z"'),
  (112, 12, 27, NULL, 'angry', '😡', '"2025-09-11T00:06:46.287Z"', '"2025-10-08T23:01:22.432Z"'),
  (113, 18, 27, NULL, 'laugh', '😂', '"2025-09-23T15:36:57.945Z"', '"2025-10-08T23:01:22.432Z"'),
  (114, 13, 27, NULL, 'wow', '😮', '"2025-09-13T10:38:21.885Z"', '"2025-10-08T23:01:22.432Z"'),
  (115, 15, 28, NULL, 'like', '🤔', '"2025-09-26T18:34:54.667Z"', '"2025-10-08T23:01:22.432Z"'),
  (116, 19, 28, NULL, 'sad', '😢', '"2025-09-17T20:57:50.769Z"', '"2025-10-08T23:01:22.432Z"'),
  (117, 12, 28, NULL, '100', '💯', '"2025-09-04T10:02:38.746Z"', '"2025-09-29T02:47:48.812Z"'),
  (118, 17, 28, NULL, 'thumbs_down', '👎', '"2025-09-03T02:24:27.255Z"', '"2025-09-29T02:47:48.816Z"'),
  (119, 14, 28, NULL, 'angry', '😡', '"2025-09-17T04:57:11.091Z"', '"2025-10-08T23:01:22.432Z"'),
  (120, 18, 28, NULL, 'tada', '🎉', '"2025-09-27T06:49:57.363Z"', '"2025-09-29T02:47:48.825Z"'),
  (121, 16, 29, NULL, 'tada', '🎉', '"2025-09-18T04:58:52.581Z"', '"2025-09-29T02:47:48.829Z"'),
  (122, 12, 30, NULL, 'tada', '🎉', '"2025-09-16T01:38:56.305Z"', '"2025-09-29T02:47:48.832Z"'),
  (123, 13, 30, NULL, 'angry', '😡', '"2025-09-23T01:33:46.291Z"', '"2025-10-08T23:01:22.432Z"'),
  (124, 19, 30, NULL, 'wow', '😮', '"2025-09-07T15:45:12.401Z"', '"2025-10-08T23:01:22.432Z"'),
  (125, 14, 30, NULL, 'thumbs_down', '👎', '"2025-08-30T14:59:36.515Z"', '"2025-09-29T02:47:48.843Z"'),
  (126, 21, 30, NULL, 'fire', '🔥', '"2025-09-11T20:08:28.191Z"', '"2025-09-29T02:47:48.847Z"'),
  (127, 20, 31, NULL, 'like', '👍', '"2025-09-23T05:05:10.972Z"', '"2025-10-08T23:01:22.432Z"'),
  (128, 13, 31, NULL, 'fire', '🔥', '"2025-09-23T08:38:15.802Z"', '"2025-09-29T02:47:48.854Z"'),
  (129, 14, 31, NULL, 'wow', '😮', '"2025-09-16T23:48:31.785Z"', '"2025-10-08T23:01:22.432Z"'),
  (130, 16, 31, NULL, 'wow', '😮', '"2025-09-17T07:26:41.194Z"', '"2025-10-08T23:01:22.432Z"'),
  (131, 21, 31, NULL, 'love', '❤️', '"2025-09-26T02:12:55.528Z"', '"2025-10-08T23:01:22.432Z"'),
  (133, 22, 24, NULL, 'like', '👍', '"2025-10-03T15:27:04.197Z"', '"2025-10-08T22:40:32.707Z"'),
  (135, 22, 19, NULL, 'sad', '😢', '"2025-10-08T15:31:24.328Z"', '"2025-10-08T23:02:28.747Z"'),
  (136, 22, 28, NULL, 'like', '👍', '"2025-10-08T15:41:25.849Z"', '"2025-10-08T23:01:22.432Z"'),
  (137, 22, 33, NULL, 'clap', '👍', '"2025-10-08T15:42:15.886Z"', '"2025-10-08T23:02:22.894Z"'),
  (140, 22, 32, NULL, 'love', '❤️', '"2025-10-08T15:54:28.838Z"', '"2025-10-08T23:04:40.973Z"'),
  (141, 22, 34, NULL, 'angry', '😠', '"2025-10-08T15:58:24.991Z"', '"2025-10-13T21:55:46.929Z"'),
  (142, 22, 30, NULL, 'thinking', '👍', '"2025-10-08T16:03:52.227Z"', '"2025-10-08T23:03:58.505Z"');
SELECT setval('reactions_id_seq', 142, true);

-- Insert data into shares (1 rows)
INSERT INTO shares (id, user_id, post_id, share_type, share_comment, visibility, created_at)
VALUES
  (1, 22, 24, 'repost', NULL, 'public', '"2025-10-03T22:51:32.840Z"');
SELECT setval('shares_id_seq', 1, true);

-- Insert data into comments (99 rows)
INSERT INTO comments (id, user_id, post_id, parent_id, content, is_published, depth, created_at, updated_at)
VALUES
  (92, 17, 17, NULL, 'Design systems are crucial for consistency. Have you looked into Figma tokens?', TRUE, 0, '"2025-09-25T06:11:09.520Z"', '"2025-09-29T02:47:48.264Z"'),
  (93, 18, 17, NULL, 'Game development is so rewarding! Are you using any specific frameworks?', TRUE, 0, '"2025-09-22T16:33:54.904Z"', '"2025-09-29T02:47:48.268Z"'),
  (94, 14, 17, NULL, 'Clean Code is a classic! Robert Martin''s principles are timeless.', TRUE, 0, '"2025-09-16T01:30:36.090Z"', '"2025-09-29T02:47:48.271Z"'),
  (95, 20, 18, NULL, 'Design systems are crucial for consistency. Have you looked into Figma tokens?', TRUE, 0, '"2025-09-05T03:22:28.454Z"', '"2025-09-29T02:47:48.275Z"'),
  (96, 20, 18, NULL, 'Hackathons are exhausting but so much fun! What tech stack did you use?', TRUE, 0, '"2025-09-25T12:36:14.461Z"', '"2025-09-29T02:47:48.280Z"'),
  (97, 20, 18, NULL, 'CSS Grid is amazing! I still use flexbox for smaller components though.', TRUE, 0, '"2025-09-06T08:53:31.806Z"', '"2025-09-29T02:47:48.284Z"'),
  (98, 19, 19, NULL, 'Great work! I love seeing the progress in the React community.', TRUE, 0, '"2025-09-14T12:03:38.364Z"', '"2025-09-29T02:47:48.288Z"'),
  (99, 21, 19, NULL, 'Design systems are crucial for consistency. Have you looked into Figma tokens?', TRUE, 0, '"2025-09-11T13:30:26.760Z"', '"2025-09-29T02:47:48.292Z"'),
  (100, 14, 19, NULL, 'Machine learning is like modern magic! Python makes it so accessible.', TRUE, 0, '"2025-09-11T17:21:03.925Z"', '"2025-09-29T02:47:48.296Z"'),
  (101, 14, 20, NULL, 'CSS Grid is amazing! I still use flexbox for smaller components though.', TRUE, 0, '"2025-09-11T21:26:13.649Z"', '"2025-09-29T02:47:48.300Z"'),
  (102, 21, 21, NULL, 'TypeScript definitely has a learning curve, but it''s worth it! Try starting with basic types.', TRUE, 0, '"2025-09-21T11:42:43.286Z"', '"2025-09-29T02:47:48.305Z"'),
  (103, 15, 21, NULL, 'That sounds like an awesome project! I''d love to contribute.', TRUE, 0, '"2025-09-03T18:25:28.221Z"', '"2025-09-29T02:47:48.309Z"'),
  (104, 21, 21, NULL, 'Docker orchestration can be tricky. Kubernetes might be your next step!', TRUE, 0, '"2025-09-20T06:54:45.153Z"', '"2025-09-29T02:47:48.313Z"'),
  (105, 15, 22, NULL, 'WebAssembly is fascinating! The performance gains are incredible.', TRUE, 0, '"2025-09-10T20:01:17.339Z"', '"2025-09-29T02:47:48.317Z"'),
  (106, 20, 22, NULL, 'Great work! I love seeing the progress in the React community.', TRUE, 0, '"2025-08-30T06:12:40.855Z"', '"2025-09-29T02:47:48.320Z"'),
  (107, 14, 22, NULL, 'Game development is so rewarding! Are you using any specific frameworks?', TRUE, 0, '"2025-09-19T04:06:24.161Z"', '"2025-09-29T02:47:48.323Z"'),
  (108, 12, 23, NULL, 'Great work! I love seeing the progress in the React community.', TRUE, 0, '"2025-09-28T09:42:23.060Z"', '"2025-09-29T02:47:48.326Z"'),
  (109, 20, 23, NULL, 'Design systems are crucial for consistency. Have you looked into Figma tokens?', TRUE, 0, '"2025-09-15T08:00:03.721Z"', '"2025-09-29T02:47:48.329Z"'),
  (110, 20, 23, NULL, 'WebAssembly is fascinating! The performance gains are incredible.', TRUE, 0, '"2025-09-21T02:05:21.974Z"', '"2025-09-29T02:47:48.332Z"'),
  (111, 20, 24, NULL, 'CSS Grid is amazing! I still use flexbox for smaller components though.', TRUE, 0, '"2025-09-03T03:45:23.966Z"', '"2025-09-29T02:47:48.336Z"'),
  (112, 19, 24, NULL, 'Legacy code refactoring is both painful and satisfying. You''re doing great work!', TRUE, 0, '"2025-09-24T12:48:04.578Z"', '"2025-09-29T02:47:48.340Z"'),
  (113, 19, 24, NULL, 'Hackathons are exhausting but so much fun! What tech stack did you use?', TRUE, 0, '"2025-08-30T04:24:39.291Z"', '"2025-09-29T02:47:48.344Z"'),
  (114, 19, 24, NULL, 'Machine learning is like modern magic! Python makes it so accessible.', TRUE, 0, '"2025-09-05T17:11:22.559Z"', '"2025-09-29T02:47:48.348Z"'),
  (115, 17, 25, NULL, 'Design systems are crucial for consistency. Have you looked into Figma tokens?', TRUE, 0, '"2025-09-02T03:47:43.716Z"', '"2025-09-29T02:47:48.351Z"'),
  (116, 17, 25, NULL, 'Design systems are crucial for consistency. Have you looked into Figma tokens?', TRUE, 0, '"2025-09-16T18:07:04.278Z"', '"2025-09-29T02:47:48.355Z"'),
  (117, 15, 25, NULL, 'Game development is so rewarding! Are you using any specific frameworks?', TRUE, 0, '"2025-09-04T20:38:41.271Z"', '"2025-09-29T02:47:48.359Z"'),
  (118, 16, 26, NULL, 'Security is so important. What tools do you recommend for penetration testing?', TRUE, 0, '"2025-08-30T12:11:53.320Z"', '"2025-09-29T02:47:48.364Z"'),
  (119, 14, 26, NULL, 'Design systems are crucial for consistency. Have you looked into Figma tokens?', TRUE, 0, '"2025-09-04T15:42:13.716Z"', '"2025-09-29T02:47:48.369Z"'),
  (120, 13, 26, NULL, 'Security is so important. What tools do you recommend for penetration testing?', TRUE, 0, '"2025-09-16T10:52:42.163Z"', '"2025-09-29T02:47:48.373Z"'),
  (121, 15, 27, NULL, 'Hackathons are exhausting but so much fun! What tech stack did you use?', TRUE, 0, '"2025-09-27T02:53:46.436Z"', '"2025-09-29T02:47:48.378Z"'),
  (122, 19, 27, NULL, 'Game development is so rewarding! Are you using any specific frameworks?', TRUE, 0, '"2025-09-07T15:53:20.220Z"', '"2025-09-29T02:47:48.382Z"'),
  (123, 12, 28, NULL, 'Hackathons are exhausting but so much fun! What tech stack did you use?', TRUE, 0, '"2025-09-19T21:40:17.863Z"', '"2025-09-29T02:47:48.386Z"'),
  (124, 19, 28, NULL, 'Which conference was this? I''m always looking for good tech events.', TRUE, 0, '"2025-09-10T00:34:16.508Z"', '"2025-09-29T02:47:48.389Z"'),
  (125, 21, 28, NULL, 'CSS Grid is amazing! I still use flexbox for smaller components though.', TRUE, 0, '"2025-09-16T02:06:32.013Z"', '"2025-09-29T02:47:48.393Z"'),
  (126, 18, 28, NULL, 'Clean Code is a classic! Robert Martin''s principles are timeless.', TRUE, 0, '"2025-09-28T18:04:21.226Z"', '"2025-09-29T02:47:48.398Z"'),
  (127, 14, 29, NULL, 'Design systems are crucial for consistency. Have you looked into Figma tokens?', TRUE, 0, '"2025-09-15T19:11:35.268Z"', '"2025-09-29T02:47:48.401Z"'),
  (128, 19, 29, NULL, 'Legacy code refactoring is both painful and satisfying. You''re doing great work!', TRUE, 0, '"2025-09-21T14:11:11.713Z"', '"2025-09-29T02:47:48.405Z"'),
  (129, 12, 30, NULL, 'TypeScript definitely has a learning curve, but it''s worth it! Try starting with basic types.', TRUE, 0, '"2025-09-06T08:06:30.056Z"', '"2025-09-29T02:47:48.408Z"'),
  (130, 20, 31, NULL, 'Those late night debugging sessions hit different! Coffee is definitely essential.', TRUE, 0, '"2025-09-02T12:08:07.118Z"', '"2025-09-29T02:47:48.411Z"'),
  (131, 16, 31, NULL, 'Those late night debugging sessions hit different! Coffee is definitely essential.', TRUE, 0, '"2025-09-06T09:39:42.141Z"', '"2025-09-29T02:47:48.415Z"'),
  (132, 12, 31, NULL, 'Game development is so rewarding! Are you using any specific frameworks?', TRUE, 0, '"2025-09-26T03:39:15.657Z"', '"2025-09-29T02:47:48.418Z"'),
  (133, 12, 21, 104, 'The archaeological analogy is perfect! Old code tells stories.', TRUE, 0, '"2025-09-08T08:18:20.827Z"', '"2025-09-29T02:47:48.425Z"'),
  (134, 15, 26, 118, 'I''m using Unity for now, but considering building something from scratch.', TRUE, 0, '"2025-08-30T11:48:47.616Z"', '"2025-09-29T02:47:48.433Z"'),
  (135, 18, 26, 118, 'I''ll definitely check out Figma tokens. Thanks for the suggestion!', TRUE, 0, '"2025-09-22T00:23:23.206Z"', '"2025-09-29T02:47:48.438Z"'),
  (136, 12, 17, 94, 'Thanks! React hooks really changed the game for me.', TRUE, 0, '"2025-09-06T03:38:02.439Z"', '"2025-09-29T02:47:48.445Z"'),
  (137, 17, 29, 127, 'Python''s libraries make everything so much easier to get started.', TRUE, 0, '"2025-09-12T07:03:56.406Z"', '"2025-09-29T02:47:48.452Z"'),
  (138, 16, 29, 127, 'It was TechCrunch Disrupt. Highly recommend it!', TRUE, 0, '"2025-09-10T21:04:55.304Z"', '"2025-09-29T02:47:48.458Z"'),
  (139, 13, 29, 127, 'Thanks! React hooks really changed the game for me.', TRUE, 0, '"2025-09-05T01:14:50.392Z"', '"2025-09-29T02:47:48.463Z"'),
  (140, 20, 17, 93, 'I''ll definitely check out Figma tokens. Thanks for the suggestion!', TRUE, 0, '"2025-09-17T04:17:27.850Z"', '"2025-09-29T02:47:48.470Z"'),
  (141, 16, 17, 93, 'Python''s libraries make everything so much easier to get started.', TRUE, 0, '"2025-09-19T06:37:17.724Z"', '"2025-09-29T02:47:48.475Z"'),
  (142, 12, 30, 129, 'I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.', TRUE, 0, '"2025-09-25T14:47:00.132Z"', '"2025-09-29T02:47:48.481Z"'),
  (143, 17, 31, 130, 'The coffee to code ratio is crucial for late night sessions 😄', TRUE, 0, '"2025-08-31T18:22:00.407Z"', '"2025-09-29T02:47:48.488Z"'),
  (144, 15, 31, 130, 'The archaeological analogy is perfect! Old code tells stories.', TRUE, 0, '"2025-09-09T19:14:54.673Z"', '"2025-09-29T02:47:48.492Z"'),
  (145, 13, 27, 121, 'The coffee to code ratio is crucial for late night sessions 😄', TRUE, 0, '"2025-08-31T23:32:57.176Z"', '"2025-09-29T02:47:48.497Z"'),
  (146, 14, 28, 126, 'The coffee to code ratio is crucial for late night sessions 😄', TRUE, 0, '"2025-09-23T03:39:08.018Z"', '"2025-09-29T02:47:48.502Z"'),
  (147, 12, 28, 126, 'His naming conventions chapter changed how I think about code.', TRUE, 0, '"2025-09-05T04:05:58.410Z"', '"2025-09-29T02:47:48.507Z"'),
  (148, 18, 28, 126, 'The integration with existing codebases is surprisingly smooth!', TRUE, 0, '"2025-09-11T17:24:51.463Z"', '"2025-09-29T02:47:48.514Z"'),
  (149, 17, 23, 110, 'The archaeological analogy is perfect! Old code tells stories.', TRUE, 0, '"2025-09-23T08:12:12.298Z"', '"2025-09-29T02:47:48.518Z"'),
  (150, 12, 23, 110, 'Thanks! React hooks really changed the game for me.', TRUE, 0, '"2025-09-11T10:39:24.399Z"', '"2025-09-29T02:47:48.523Z"'),
  (151, 18, 26, 120, 'Thanks! React hooks really changed the game for me.', TRUE, 0, '"2025-09-12T04:19:10.138Z"', '"2025-09-29T02:47:48.527Z"'),
  (152, 12, 26, 120, 'We used Node.js, React, and Socket.io. Classic but effective stack!', TRUE, 0, '"2025-09-09T22:48:12.660Z"', '"2025-09-29T02:47:48.533Z"'),
  (153, 14, 26, 120, 'His naming conventions chapter changed how I think about code.', TRUE, 0, '"2025-09-09T21:24:56.335Z"', '"2025-09-29T02:47:48.539Z"'),
  (154, 16, 19, 99, 'I''m using Unity for now, but considering building something from scratch.', TRUE, 0, '"2025-09-02T01:16:13.863Z"', '"2025-09-29T02:47:48.543Z"'),
  (155, 20, 19, 99, 'Python''s libraries make everything so much easier to get started.', TRUE, 0, '"2025-09-25T00:12:25.581Z"', '"2025-09-29T02:47:48.547Z"'),
  (156, 12, 19, 99, 'I''d love to collaborate! GitHub integration would be key.', TRUE, 0, '"2025-09-03T08:59:10.424Z"', '"2025-09-29T02:47:48.552Z"'),
  (157, 21, 23, 108, 'It was TechCrunch Disrupt. Highly recommend it!', TRUE, 0, '"2025-09-19T10:34:56.376Z"', '"2025-09-29T02:47:48.558Z"'),
  (158, 13, 23, 108, 'Kubernetes is definitely on my learning list. Any good resources?', TRUE, 0, '"2025-08-30T22:27:37.726Z"', '"2025-09-29T02:47:48.565Z"'),
  (159, 20, 23, 108, 'Thanks! React hooks really changed the game for me.', TRUE, 0, '"2025-09-03T00:32:41.198Z"', '"2025-09-29T02:47:48.570Z"'),
  (160, 16, 28, 125, 'The archaeological analogy is perfect! Old code tells stories.', TRUE, 0, '"2025-09-08T11:13:57.753Z"', '"2025-09-29T02:47:48.574Z"'),
  (161, 17, 31, 132, 'We used Node.js, React, and Socket.io. Classic but effective stack!', TRUE, 0, '"2025-09-14T11:10:43.346Z"', '"2025-09-29T02:47:48.579Z"'),
  (162, 21, 29, 128, 'I''ll definitely check out Figma tokens. Thanks for the suggestion!', TRUE, 0, '"2025-09-02T01:27:08.870Z"', '"2025-09-29T02:47:48.584Z"'),
  (163, 18, 29, 128, 'The coffee to code ratio is crucial for late night sessions 😄', TRUE, 0, '"2025-09-28T14:55:17.027Z"', '"2025-09-29T02:47:48.588Z"'),
  (164, 18, 24, 112, 'His naming conventions chapter changed how I think about code.', TRUE, 0, '"2025-09-01T06:58:18.137Z"', '"2025-09-29T02:47:48.593Z"'),
  (165, 15, 24, 112, 'I''d love to collaborate! GitHub integration would be key.', TRUE, 0, '"2025-09-13T12:02:38.070Z"', '"2025-09-29T02:47:48.597Z"'),
  (166, 13, 24, 112, 'The integration with existing codebases is surprisingly smooth!', TRUE, 0, '"2025-09-04T22:10:19.923Z"', '"2025-09-29T02:47:48.601Z"'),
  (167, 15, 18, 97, 'The coffee to code ratio is crucial for late night sessions 😄', TRUE, 0, '"2025-09-08T15:38:22.126Z"', '"2025-09-29T02:47:48.606Z"'),
  (168, 20, 18, 97, 'I''ll definitely check out Figma tokens. Thanks for the suggestion!', TRUE, 0, '"2025-09-17T02:45:49.216Z"', '"2025-09-29T02:47:48.611Z"'),
  (169, 19, 18, 97, 'Thanks! React hooks really changed the game for me.', TRUE, 0, '"2025-09-18T17:45:16.485Z"', '"2025-09-29T02:47:48.615Z"'),
  (170, 19, 18, 96, 'Python''s libraries make everything so much easier to get started.', TRUE, 0, '"2025-09-24T09:15:48.899Z"', '"2025-09-29T02:47:48.619Z"'),
  (171, 16, 18, 96, 'I''ll definitely check out Figma tokens. Thanks for the suggestion!', TRUE, 0, '"2025-09-04T09:40:36.042Z"', '"2025-09-29T02:47:48.624Z"'),
  (172, 18, 18, 96, 'It was TechCrunch Disrupt. Highly recommend it!', TRUE, 0, '"2025-09-05T17:22:48.631Z"', '"2025-09-29T02:47:48.628Z"'),
  (173, 20, 20, 101, 'The archaeological analogy is perfect! Old code tells stories.', TRUE, 0, '"2025-09-01T13:26:29.603Z"', '"2025-09-29T02:47:48.632Z"'),
  (174, 16, 25, 117, 'I''d love to collaborate! GitHub integration would be key.', TRUE, 0, '"2025-09-19T09:25:01.618Z"', '"2025-09-29T02:47:48.636Z"'),
  (175, 21, 25, 117, 'We used Node.js, React, and Socket.io. Classic but effective stack!', TRUE, 0, '"2025-09-08T23:25:03.262Z"', '"2025-09-29T02:47:48.641Z"'),
  (176, 16, 25, 117, 'Kubernetes is definitely on my learning list. Any good resources?', TRUE, 0, '"2025-09-18T12:03:33.932Z"', '"2025-09-29T02:47:48.647Z"'),
  (177, 14, 24, 113, 'I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.', TRUE, 0, '"2025-09-27T20:02:17.355Z"', '"2025-09-29T02:47:48.652Z"'),
  (178, 16, 24, 113, 'It was TechCrunch Disrupt. Highly recommend it!', TRUE, 0, '"2025-08-30T13:23:16.916Z"', '"2025-09-29T02:47:48.657Z"'),
  (179, 15, 28, 124, 'I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.', TRUE, 0, '"2025-09-22T10:06:29.069Z"', '"2025-09-29T02:47:48.661Z"'),
  (180, 20, 24, 114, 'His naming conventions chapter changed how I think about code.', TRUE, 0, '"2025-09-08T23:13:49.730Z"', '"2025-09-29T02:47:48.665Z"'),
  (181, 13, 24, NULL, 'This looks absolutely amazing! Game development is such a fascinating field. What programming language are you using for this?', TRUE, 0, '"2025-09-29T15:35:57.122Z"', '"2025-09-29T15:35:57.122Z"'),
  (182, 15, 24, NULL, 'Physics engines are incredibly complex. Have you considered using an existing one like Box2D or are you building from scratch?', TRUE, 0, '"2025-09-29T15:35:57.137Z"', '"2025-09-29T15:35:57.137Z"'),
  (183, 17, 24, NULL, 'The game development community is so supportive! I would love to see some screenshots or a demo when you have something to share.', TRUE, 0, '"2025-09-29T15:35:57.139Z"', '"2025-09-29T15:35:57.139Z"'),
  (184, 19, 24, NULL, 'I have been thinking about getting into game development myself. Any advice for someone just starting out?', TRUE, 0, '"2025-09-29T15:35:57.142Z"', '"2025-09-29T15:35:57.142Z"'),
  (185, 14, 24, NULL, 'This is inspiring! I remember trying to make a simple platformer and getting stuck on collision detection. Physics is definitely the hard part.', TRUE, 0, '"2025-09-29T15:35:57.145Z"', '"2025-09-29T15:35:57.145Z"'),
  (186, 16, 24, NULL, 'Are you planning to release this as open source? The game dev community could really benefit from seeing how you tackle the physics calculations.', TRUE, 0, '"2025-09-29T15:35:57.148Z"', '"2025-09-29T15:35:57.148Z"'),
  (187, 18, 24, NULL, 'What kind of game are you building? 2D or 3D? The physics requirements are quite different for each.', TRUE, 0, '"2025-09-29T15:35:57.150Z"', '"2025-09-29T15:35:57.150Z"'),
  (188, 20, 24, NULL, 'Game engines are such a rabbit hole! I started working on one for learning purposes and ended up spending months just on the renderer.', TRUE, 0, '"2025-09-29T15:35:57.153Z"', '"2025-09-29T15:35:57.153Z"'),
  (189, 16, 24, 178, 'I agree! TechCrunch Disrupt was amazing. Did you attend the AI sessions?', TRUE, 0, '"2025-10-01T03:02:43.545Z"', '"2025-10-01T03:02:43.545Z"'),
  (190, 17, 24, 189, 'Yes! The AI panel was incredible. GPT-4 demos blew my mind!', TRUE, 0, '"2025-10-01T03:02:43.550Z"', '"2025-10-01T03:02:43.550Z"');
SELECT setval('comments_id_seq', 190, true);

-- No data for comment_interactions
-- No data for comment_metrics
-- No data for poll_options
-- No data for poll_votes
-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Analyze tables for query optimization
ANALYZE posts;
ANALYZE media;
ANALYZE reactions;
ANALYZE shares;
ANALYZE comments;
ANALYZE comment_interactions;
ANALYZE comment_metrics;
ANALYZE poll_options;
ANALYZE poll_votes;
