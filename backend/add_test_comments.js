/**
 * Script to add more comments for testing the load more functionality
 */

const { initializeDatabase } = require('./src/config/database');
const Comment = require('./src/models/Comment');

const additionalComments = [
  {
    post_id: 24,
    user_id: 13,
    content: 'This looks absolutely amazing! Game development is such a fascinating field. What programming language are you using for this?',
    parent_id: null
  },
  {
    post_id: 24,
    user_id: 15,
    content: 'Physics engines are incredibly complex. Have you considered using an existing one like Box2D or are you building from scratch?',
    parent_id: null
  },
  {
    post_id: 24,
    user_id: 17,
    content: 'The game development community is so supportive! I would love to see some screenshots or a demo when you have something to share.',
    parent_id: null
  },
  {
    post_id: 24,
    user_id: 19,
    content: 'I have been thinking about getting into game development myself. Any advice for someone just starting out?',
    parent_id: null
  },
  {
    post_id: 24,
    user_id: 14,
    content: 'This is inspiring! I remember trying to make a simple platformer and getting stuck on collision detection. Physics is definitely the hard part.',
    parent_id: null
  },
  {
    post_id: 24,
    user_id: 16,
    content: 'Are you planning to release this as open source? The game dev community could really benefit from seeing how you tackle the physics calculations.',
    parent_id: null
  },
  {
    post_id: 24,
    user_id: 18,
    content: 'What kind of game are you building? 2D or 3D? The physics requirements are quite different for each.',
    parent_id: null
  },
  {
    post_id: 24,
    user_id: 20,
    content: 'Game engines are such a rabbit hole! I started working on one for learning purposes and ended up spending months just on the renderer.',
    parent_id: null
  }
];

async function addTestComments() {
  try {
    console.log('🔗 Connecting to database...');
    await initializeDatabase();

    console.log('📝 Adding test comments...');

    for (const commentData of additionalComments) {
      const comment = await Comment.create(commentData);
      console.log(`✅ Added comment by user ${commentData.user_id}: "${commentData.content.substring(0, 50)}..."`);
    }

    console.log(`\n🎉 Successfully added ${additionalComments.length} new comments to post 24!`);
    console.log('💡 This should now demonstrate the "Load more comments" pagination functionality.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test comments:', error);
    process.exit(1);
  }
}

addTestComments();