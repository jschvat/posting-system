/**
 * Test database setup and utilities
 * PostgreSQL implementation for testing
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool;
let testDatabaseName;

/**
 * Initialize test database with PostgreSQL
 */
async function initTestDb() {
  try {
    // Check if PostgreSQL connection details are provided
    const hasPostgresConfig = process.env.DB_HOST || process.env.DATABASE_URL;

    if (!hasPostgresConfig) {
      console.log('⚠️  PostgreSQL not configured. Set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME environment variables.');
      console.log('⚠️  Or set DATABASE_URL for full connection string.');
      console.log('⚠️  Skipping database-dependent tests.');

      // Create a mock database object that throws helpful errors
      global.testDb = {
        query: () => {
          throw new Error('PostgreSQL not configured. Tests requiring database cannot run.');
        }
      };
      return;
    }

    // Generate a unique test database name
    testDatabaseName = `test_posting_system_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    console.log('Setup: Initializing test database with PostgreSQL...');

    const dbConfig = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: 'postgres', // Connect to default postgres database first
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
        };

    // First connect to the default postgres database to create our test database
    const setupPool = new Pool(dbConfig);

    try {
      // Test the connection
      await setupPool.query('SELECT 1');

      // Create the test database
      await setupPool.query(`CREATE DATABASE "${testDatabaseName}"`);
      await setupPool.end();

      // Now connect to our test database
      const testDbConfig = process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL.replace(/\/[^\/]*$/, `/${testDatabaseName}`) }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: testDatabaseName,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
          };

      pool = new Pool(testDbConfig);

      // Load and execute the schema
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);

      // Run all migrations (skip 001_initial_schema.sql as schema.sql is already loaded)
      const migrationsDir = path.join(__dirname, '../database/migrations');
      if (fs.existsSync(migrationsDir)) {
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(file => file.endsWith('.sql') && file !== '001_initial_schema.sql')
          .sort(); // Execute in alphabetical order

        for (const file of migrationFiles) {
          const migrationPath = path.join(migrationsDir, file);
          const migration = fs.readFileSync(migrationPath, 'utf8');
          await pool.query(migration);
        }
      }

      // Store pool globally for tests
      global.testDb = pool;
      global.testDatabaseName = testDatabaseName;

      console.log(`✅ Test database initialized with PostgreSQL: ${testDatabaseName}`);

    } catch (connectionError) {
      await setupPool.end().catch(() => {});
      throw new Error(`Failed to connect to PostgreSQL: ${connectionError.message}`);
    }

  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean up test database
 */
async function cleanTestDb() {
  if (global.testDb) {
    try {
      await global.testDb.end();
      global.testDb = null;

      // Connect to postgres database to drop the test database
      const cleanupPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: 'postgres',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      });

      // Drop the test database
      if (global.testDatabaseName) {
        await cleanupPool.query(`DROP DATABASE IF EXISTS "${global.testDatabaseName}"`);
        global.testDatabaseName = null;
      }

      await cleanupPool.end();
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
  }
}

/**
 * Clear all tables (for between tests)
 */
async function clearTables() {
  if (!global.testDb) return;

  const tables = [
    'timeline_cache',
    'shares',
    'follows',
    'reactions',
    'media',
    'comments',
    'posts',
    'user_stats',
    'users'
  ];

  for (const table of tables) {
    await global.testDb.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
  }
}

/**
 * Execute a SQL query on test database
 */
async function query(sql, params = []) {
  if (!global.testDb) {
    throw new Error('Test database not initialized');
  }

  try {
    const result = await global.testDb.query(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount
    };
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Create test user using the User model
 */
async function createTestUser(overrides = {}) {
  // Use the User model for test user creation to get all methods
  const User = require('../models/User');

  const defaultUserData = {
    username: `testuser${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
    email: `test${Date.now()}${Math.random().toString(36).substr(2, 5)}@example.com`,
    password: 'TestPassword123!', // Use plain password, will be hashed by User model
    first_name: 'Test',
    last_name: 'User',
    is_active: true,
    email_verified: false,
    ...overrides
  };

  let user;

  // Handle specific ID requests (like ID=1 for admin tests)
  if (overrides.id) {
    // For specific IDs, we need to create the user with raw SQL to override auto-increment
    const { id, password, ...userData } = defaultUserData;

    // Hash password manually
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 12);

    // Add timestamps
    const now = new Date();
    userData.created_at = now;
    userData.updated_at = now;
    userData.password_hash = password_hash;
    userData.id = overrides.id;

    const fields = Object.keys(userData);
    const values = Object.values(userData);
    const placeholders = fields.map((_, index) => `$${index + 1}`);

    const sql = `
      INSERT INTO users (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;

    const result = await query(sql, values);
    user = result.rows[0];

    // Remove sensitive data for return
    delete user.password_hash;
    delete user.password_reset_token;
    delete user.email_verification_token;
  } else {
    // Create using User model which handles password hashing and returns public data
    user = await User.create(defaultUserData);
  }

  // Add helper methods to the user object for test compatibility
  user.generatePasswordResetToken = async function() {
    return await User.generatePasswordResetToken(this.id);
  };

  user.generateEmailVerificationToken = async function() {
    return await User.generateEmailVerificationToken(this.id);
  };

  user.update = async function(data) {
    // Convert Date objects to ISO strings for PostgreSQL compatibility
    const processedData = { ...data };
    for (const [key, value] of Object.entries(processedData)) {
      if (value instanceof Date) {
        processedData[key] = value.toISOString();
      }
    }
    return await User.update(this.id, processedData);
  };

  user.findByPk = async function(id) {
    return await User.findById(id);
  };

  return user;
}

/**
 * Create test post
 */
async function createTestPost(userId, overrides = {}) {
  const defaultPost = {
    user_id: userId,
    content: 'This is a test post content',
    privacy_level: 'public',
    is_published: true,
    ...overrides
  };

  const fields = Object.keys(defaultPost);
  const values = Object.values(defaultPost);
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

  const sql = `
    INSERT INTO posts (${fields.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Create test comment
 */
async function createTestComment(userId, postId, overrides = {}) {
  const defaultComment = {
    user_id: userId,
    post_id: postId,
    content: 'This is a test comment',
    ...overrides
  };

  const fields = Object.keys(defaultComment);
  const values = Object.values(defaultComment);
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

  const sql = `
    INSERT INTO comments (${fields.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Create test media
 */
async function createTestMedia(userId, postId = null, overrides = {}) {
  const defaultMedia = {
    user_id: userId,
    post_id: postId,
    filename: 'test-image.jpg',
    original_name: 'test-image.jpg',
    file_path: '/uploads/test-image.jpg',
    file_url: 'http://localhost:3002/uploads/test-image.jpg',
    mime_type: 'image/jpeg',
    file_size: 1024000,
    media_type: 'image',
    is_processed: true,
    ...overrides
  };

  const fields = Object.keys(defaultMedia).filter(key => defaultMedia[key] !== null);
  const values = fields.map(key => defaultMedia[key]);
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

  const sql = `
    INSERT INTO media (${fields.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Create test reaction
 */
async function createTestReaction(userId, postId = null, commentId = null, overrides = {}) {
  const defaultReaction = {
    user_id: userId,
    post_id: postId,
    comment_id: commentId,
    emoji_name: 'thumbs_up',
    emoji_unicode: '👍',
    ...overrides
  };

  const fields = Object.keys(defaultReaction).filter(key => defaultReaction[key] !== null);
  const values = fields.map(key => defaultReaction[key]);
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

  const sql = `
    INSERT INTO reactions (${fields.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Get models for compatibility with existing tests
 */
function getModels() {
  const User = require('../models/User');
  const Post = require('../models/Post');
  const Comment = require('../models/Comment');
  const Media = require('../models/Media');
  const Reaction = require('../models/Reaction');

  return {
    User: {
      findByPk: async (id) => {
        return await User.findById(id);
      },
      findOne: (options) => User.findOne(options.where),
      findAll: (options) => User.findAll(options),
      create: (data) => User.create(data),
      update: (data, options) => User.update(options.where.id, data),
      destroy: (options) => User.delete(options.where.id)
    },
    Post: {
      findByPk: async (id) => {
        return await Post.findById(id);
      },
      findOne: (options) => Post.findOne(options.where),
      findAll: (options) => Post.findAll(options),
      create: (data) => Post.create(data),
      update: (data, options) => Post.update(options.where.id, data),
      destroy: (options) => Post.delete(options.where.id)
    },
    Comment: {
      findByPk: async (id) => {
        return await Comment.findById(id);
      },
      findOne: (options) => Comment.findOne(options.where),
      findAll: (options) => Comment.findAll(options),
      create: (data) => Comment.create(data),
      update: (data, options) => Comment.update(options.where.id, data),
      destroy: (options) => Comment.delete(options.where.id)
    },
    Media: {
      findByPk: async (id) => {
        return await Media.findById(id);
      },
      findOne: (options) => Media.findOne(options.where),
      findAll: (options) => Media.findAll(options),
      create: (data) => Media.create(data),
      update: (data, options) => Media.update(options.where.id, data),
      destroy: (options) => Media.delete(options.where.id)
    },
    Reaction: {
      findByPk: async (id) => {
        return await Reaction.findById(id);
      },
      findOne: (options) => Reaction.findOne(options.where),
      findAll: (options) => Reaction.findAll(options),
      create: (data) => Reaction.create(data),
      update: (data, options) => Reaction.update(options.where.id, data),
      destroy: (options) => Reaction.delete(options.where.id)
    }
  };
}

module.exports = {
  initTestDb,
  cleanTestDb,
  clearTables,
  query,
  createTestUser,
  createTestPost,
  createTestComment,
  createTestMedia,
  createTestReaction,
  getModels // For test compatibility
};