/**
 * Database configuration and connection setup using Sequelize
 * Handles PostgreSQL connection with environment-based configuration
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection parameters from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'posting_system',
  username: process.env.DB_USER || 'dev_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  // Connection pool configuration
  pool: {
    max: 20,        // Maximum number of connections in pool
    min: 0,         // Minimum number of connections in pool
    acquire: 60000, // Maximum time to get connection (ms)
    idle: 10000,    // Maximum time connection can be idle (ms)
  },

  // SSL configuration (for production)
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },

  // Timezone configuration
  timezone: '+00:00',

  // Model definitions
  define: {
    // Use snake_case for database columns
    underscored: true,
    // Add createdAt and updatedAt timestamps
    timestamps: true,
    // Use singular table names
    freezeTableName: true,
    // Add paranoid (soft delete) support
    paranoid: false,
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
}

/**
 * Initialize database models and associations
 */
async function initializeDatabase() {
  try {
    // Import all models
    const User = require('../models/User');
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const Media = require('../models/Media');
    const Reaction = require('../models/Reaction');

    // Initialize models with sequelize instance
    User.initModel(sequelize);
    Post.initModel(sequelize);
    Comment.initModel(sequelize);
    Media.initModel(sequelize);
    Reaction.initModel(sequelize);

    // Setup model associations
    setupAssociations();

    console.log('✅ Database models initialized successfully.');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database models:', error);
    throw error;
  }
}

/**
 * Setup model associations/relationships
 */
function setupAssociations() {
  const { User, Post, Comment, Media, Reaction } = sequelize.models;

  // User associations
  User.hasMany(Post, {
    foreignKey: 'user_id',
    as: 'posts',
    onDelete: 'CASCADE'
  });
  User.hasMany(Comment, {
    foreignKey: 'user_id',
    as: 'comments',
    onDelete: 'CASCADE'
  });
  User.hasMany(Media, {
    foreignKey: 'user_id',
    as: 'media',
    onDelete: 'CASCADE'
  });
  User.hasMany(Reaction, {
    foreignKey: 'user_id',
    as: 'reactions',
    onDelete: 'CASCADE'
  });

  // Post associations
  Post.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'author'
  });
  Post.hasMany(Comment, {
    foreignKey: 'post_id',
    as: 'comments',
    onDelete: 'CASCADE'
  });
  Post.hasMany(Media, {
    foreignKey: 'post_id',
    as: 'media',
    onDelete: 'CASCADE'
  });
  Post.hasMany(Reaction, {
    foreignKey: 'post_id',
    as: 'reactions',
    onDelete: 'CASCADE'
  });

  // Comment associations
  Comment.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'author'
  });
  Comment.belongsTo(Post, {
    foreignKey: 'post_id',
    as: 'post'
  });
  Comment.belongsTo(Comment, {
    foreignKey: 'parent_id',
    as: 'parent'
  });
  Comment.hasMany(Comment, {
    foreignKey: 'parent_id',
    as: 'replies',
    onDelete: 'CASCADE'
  });
  Comment.hasMany(Media, {
    foreignKey: 'comment_id',
    as: 'media',
    onDelete: 'CASCADE'
  });
  Comment.hasMany(Reaction, {
    foreignKey: 'comment_id',
    as: 'reactions',
    onDelete: 'CASCADE'
  });

  // Media associations
  Media.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'uploader'
  });
  Media.belongsTo(Post, {
    foreignKey: 'post_id',
    as: 'post'
  });
  Media.belongsTo(Comment, {
    foreignKey: 'comment_id',
    as: 'comment'
  });

  // Reaction associations
  Reaction.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  Reaction.belongsTo(Post, {
    foreignKey: 'post_id',
    as: 'post'
  });
  Reaction.belongsTo(Comment, {
    foreignKey: 'comment_id',
    as: 'comment'
  });
}

/**
 * Close database connection
 */
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// Export sequelize instance and utility functions
module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.initializeDatabase = initializeDatabase;
module.exports.closeConnection = closeConnection;