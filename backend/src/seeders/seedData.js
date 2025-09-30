/**
 * Comprehensive seed data generator for the posting system
 * Creates users, posts, comments, replies, and reactions
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const { initializeDatabase, getPool } = require('../config/database');

const SALT_ROUNDS = 10;

// Sample users data
const USERS_DATA = [
  { username: 'alice_wonder', email: 'alice@example.com', first_name: 'Alice', last_name: 'Wonderland', bio: 'Curious explorer of digital realms' },
  { username: 'bob_builder', email: 'bob@example.com', first_name: 'Bob', last_name: 'Builder', bio: 'Building amazing things, one line of code at a time' },
  { username: 'charlie_dev', email: 'charlie@example.com', first_name: 'Charlie', last_name: 'Developer', bio: 'Full-stack developer passionate about clean code' },
  { username: 'diana_designer', email: 'diana@example.com', first_name: 'Diana', last_name: 'Designer', bio: 'UI/UX designer creating beautiful experiences' },
  { username: 'erik_engineer', email: 'erik@example.com', first_name: 'Erik', last_name: 'Engineer', bio: 'Software engineer solving complex problems' },
  { username: 'fiona_frontend', email: 'fiona@example.com', first_name: 'Fiona', last_name: 'Frontend', bio: 'Frontend specialist with an eye for detail' },
  { username: 'george_gamer', email: 'george@example.com', first_name: 'George', last_name: 'Gamer', bio: 'Game developer and tech enthusiast' },
  { username: 'helen_hacker', email: 'helen@example.com', first_name: 'Helen', last_name: 'Hacker', bio: 'Ethical hacker and cybersecurity expert' },
  { username: 'ivan_innovator', email: 'ivan@example.com', first_name: 'Ivan', last_name: 'Innovator', bio: 'Always exploring new technologies and ideas' },
  { username: 'julia_js', email: 'julia@example.com', first_name: 'Julia', last_name: 'JavaScript', bio: 'JavaScript enthusiast and React lover' }
];

// Sample posts data
const POSTS_DATA = [
  {
    content: "Just finished building my first React application! 🚀 The component lifecycle still amazes me. Anyone else find useState hooks as elegant as I do?",
    privacy_level: 'public'
  },
  {
    content: "Been diving deep into TypeScript lately. The type safety is incredible, but the learning curve is steep! Any tips for someone transitioning from vanilla JS?",
    privacy_level: 'public'
  },
  {
    content: "Working on a new design system for our team. Color theory is more complex than I initially thought! 🎨 What are your favorite design tools?",
    privacy_level: 'public'
  },
  {
    content: "Just deployed my first microservice architecture. Docker containers everywhere! 🐳 The orchestration is beautiful when it all comes together.",
    privacy_level: 'public'
  },
  {
    content: "Late night coding session debugging a memory leak. Sometimes the best solutions come at 2 AM with a cup of coffee ☕",
    privacy_level: 'friends'
  },
  {
    content: "Attended an amazing tech conference today! The keynote on AI ethics really made me think about our responsibility as developers.",
    privacy_level: 'public'
  },
  {
    content: "Finally mastered CSS Grid after years of flexbox! The layout possibilities are endless. Who else is team Grid over Flexbox?",
    privacy_level: 'public'
  },
  {
    content: "Working on a game engine in my spare time. Physics calculations are harder than I expected, but so rewarding when they work! 🎮",
    privacy_level: 'public'
  },
  {
    content: "Penetration testing results came back clean! 🔐 Always satisfying when security measures hold up under scrutiny.",
    privacy_level: 'friends'
  },
  {
    content: "Experimenting with WebAssembly for performance-critical applications. The speed improvements are incredible! Anyone else exploring WASM?",
    privacy_level: 'public'
  },
  {
    content: "Teaching myself Machine Learning with Python. Neural networks are like magic, but with math! 🧠✨",
    privacy_level: 'public'
  },
  {
    content: "Refactored 500 lines of legacy code today. It's like archaeology, but with more semicolons. The satisfaction is real though!",
    privacy_level: 'public'
  },
  {
    content: "New project idea: A collaborative platform for developers to share code snippets. Think GitHub meets StackOverflow. Thoughts?",
    privacy_level: 'public'
  },
  {
    content: "Just finished reading 'Clean Code' by Robert Martin. My variable naming will never be the same! 📚",
    privacy_level: 'public'
  },
  {
    content: "Weekend hackathon was intense! Built a real-time chat app with WebSockets. Sleep is overrated anyway... 😴",
    privacy_level: 'public'
  }
];

// Sample comments data
const COMMENTS_DATA = [
  "Great work! I love seeing the progress in the React community.",
  "TypeScript definitely has a learning curve, but it's worth it! Try starting with basic types.",
  "Design systems are crucial for consistency. Have you looked into Figma tokens?",
  "Docker orchestration can be tricky. Kubernetes might be your next step!",
  "Those late night debugging sessions hit different! Coffee is definitely essential.",
  "Which conference was this? I'm always looking for good tech events.",
  "CSS Grid is amazing! I still use flexbox for smaller components though.",
  "Game development is so rewarding! Are you using any specific frameworks?",
  "Security is so important. What tools do you recommend for penetration testing?",
  "WebAssembly is fascinating! The performance gains are incredible.",
  "Machine learning is like modern magic! Python makes it so accessible.",
  "Legacy code refactoring is both painful and satisfying. You're doing great work!",
  "That sounds like an awesome project! I'd love to contribute.",
  "Clean Code is a classic! Robert Martin's principles are timeless.",
  "Hackathons are exhausting but so much fun! What tech stack did you use?"
];

// Sample reply comments
const REPLIES_DATA = [
  "Thanks! React hooks really changed the game for me.",
  "I'll definitely check out Figma tokens. Thanks for the suggestion!",
  "Kubernetes is definitely on my learning list. Any good resources?",
  "The coffee to code ratio is crucial for late night sessions 😄",
  "It was TechCrunch Disrupt. Highly recommend it!",
  "I'm using Unity for now, but considering building something from scratch.",
  "I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.",
  "The integration with existing codebases is surprisingly smooth!",
  "Python's libraries make everything so much easier to get started.",
  "The archaeological analogy is perfect! Old code tells stories.",
  "I'd love to collaborate! GitHub integration would be key.",
  "His naming conventions chapter changed how I think about code.",
  "We used Node.js, React, and Socket.io. Classic but effective stack!"
];

// Reaction types mapping with emoji unicode
const REACTION_TYPES = [
  { name: 'heart', unicode: '❤️' },
  { name: 'thumbs_up', unicode: '👍' },
  { name: 'thumbs_down', unicode: '👎' },
  { name: 'joy', unicode: '😂' },
  { name: 'astonished', unicode: '😮' },
  { name: 'cry', unicode: '😢' },
  { name: 'rage', unicode: '😡' },
  { name: 'thinking', unicode: '🤔' },
  { name: 'tada', unicode: '🎉' },
  { name: 'clap', unicode: '👏' },
  { name: 'fire', unicode: '🔥' },
  { name: '100', unicode: '💯' }
];

/**
 * Get a random element from an array
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random elements from an array
 */
function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate a random date within the last 30 days
 */
function getRandomRecentDate() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
}

/**
 * Create users with hashed passwords
 */
async function createUsers() {
  console.log('🧑‍💻 Creating users...');
  const users = [];

  for (const userData of USERS_DATA) {
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);

    const user = await User.create({
      ...userData,
      password: hashedPassword,
      created_at: getRandomRecentDate()
    });

    users.push(user);
    console.log(`   ✅ Created user: ${user.username}`);
  }

  return users;
}

/**
 * Create posts from random users
 */
async function createPosts(users) {
  console.log('📝 Creating posts...');
  const posts = [];

  for (const postData of POSTS_DATA) {
    const randomUser = getRandomElement(users);

    const post = await Post.create({
      ...postData,
      user_id: randomUser.id,
      created_at: getRandomRecentDate()
    });

    posts.push(post);
    console.log(`   ✅ Created post by ${randomUser.username}`);
  }

  return posts;
}

/**
 * Create comments on posts
 */
async function createComments(users, posts) {
  console.log('💬 Creating comments...');
  const comments = [];

  // Create top-level comments
  for (const post of posts) {
    const numComments = Math.floor(Math.random() * 5) + 1; // 1-5 comments per post

    for (let i = 0; i < numComments; i++) {
      const randomUser = getRandomElement(users);
      const randomComment = getRandomElement(COMMENTS_DATA);

      const comment = await Comment.create({
        content: randomComment,
        user_id: randomUser.id,
        post_id: post.id,
        parent_id: null,
        created_at: getRandomRecentDate()
      });

      comments.push(comment);
      console.log(`   ✅ Created comment by ${randomUser.username}`);
    }
  }

  return comments;
}

/**
 * Create replies to comments
 */
async function createReplies(users, comments) {
  console.log('↩️ Creating replies...');
  const replies = [];

  // Create replies for some comments
  const commentsToReplyTo = getRandomElements(comments, Math.floor(comments.length * 0.6));

  for (const parentComment of commentsToReplyTo) {
    const numReplies = Math.floor(Math.random() * 3) + 1; // 1-3 replies per comment

    for (let i = 0; i < numReplies; i++) {
      const randomUser = getRandomElement(users);
      const randomReply = getRandomElement(REPLIES_DATA);

      const reply = await Comment.create({
        content: randomReply,
        user_id: randomUser.id,
        post_id: parentComment.post_id,
        parent_id: parentComment.id,
        created_at: getRandomRecentDate()
      });

      replies.push(reply);
      console.log(`   ✅ Created reply by ${randomUser.username}`);
    }
  }

  return replies;
}

/**
 * Create reactions on posts
 */
async function createReactions(users, posts) {
  console.log('❤️ Creating reactions...');
  const reactions = [];

  for (const post of posts) {
    // Random number of users react to each post
    const reactingUsers = getRandomElements(users, Math.floor(Math.random() * 7) + 1);

    for (const user of reactingUsers) {
      const randomReaction = getRandomElement(REACTION_TYPES);

      try {
        const reaction = await Reaction.create({
          user_id: user.id,
          post_id: post.id,
          emoji_name: randomReaction.name,
          emoji_unicode: randomReaction.unicode,
          created_at: getRandomRecentDate()
        });

        reactions.push(reaction);
        console.log(`   ✅ ${user.username} reacted with ${randomReaction.unicode}`);
      } catch (error) {
        // Skip if user already reacted to this post (unique constraint)
        console.log(`   ⚠️ ${user.username} already reacted to this post`);
      }
    }
  }

  return reactions;
}

/**
 * Clear existing data
 */
async function clearExistingData() {
  console.log('🧹 Clearing existing data...');
  const { query } = require('../config/database');

  // Clear in order to respect foreign key constraints
  await query('DELETE FROM reactions');
  await query('DELETE FROM comments');
  await query('DELETE FROM posts');
  await query('DELETE FROM users');

  console.log('   ✅ Cleared all existing data\n');
}

/**
 * Main seeder function
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Initialize database connection
    await initializeDatabase();

    // Clear existing data
    await clearExistingData();

    // Create data
    const users = await createUsers();
    console.log(`   📊 Created ${users.length} users\n`);

    const posts = await createPosts(users);
    console.log(`   📊 Created ${posts.length} posts\n`);

    const comments = await createComments(users, posts);
    console.log(`   📊 Created ${comments.length} comments\n`);

    const replies = await createReplies(users, comments);
    console.log(`   📊 Created ${replies.length} replies\n`);

    const reactions = await createReactions(users, posts);
    console.log(`   📊 Created ${reactions.length} reactions\n`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📝 Posts: ${posts.length}`);
    console.log(`   💬 Comments: ${comments.length}`);
    console.log(`   ↩️ Replies: ${replies.length}`);
    console.log(`   ❤️ Reactions: ${reactions.length}`);
    console.log('\n🔐 All users have password: password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

module.exports = {
  seedDatabase,
  USERS_DATA,
  POSTS_DATA,
  COMMENTS_DATA,
  REPLIES_DATA,
  REACTION_TYPES
};