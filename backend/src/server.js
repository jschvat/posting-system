/**
 * Main server file for the social media posting platform API
 * Sets up Express server with middleware, routes, and database connection
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Import centralized configuration
const { config } = require('../../config/app.config');

// Import database connection
const { initializeDatabase, testConnection, closeConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const usersRoutes = require('./routes/users');
const commentsRoutes = require('./routes/comments');
const mediaRoutes = require('./routes/media');
const reactionsRoutes = require('./routes/reactions');
const followsRoutes = require('./routes/follows');
const sharesRoutes = require('./routes/shares');
const timelineRoutes = require('./routes/timeline');
const ratingsRoutes = require('./routes/ratings');
const reputationRoutes = require('./routes/reputation');
const locationRoutes = require('./routes/location');
const groupsRoutes = require('./routes/groups');
const groupPostsRoutes = require('./routes/groupPosts');
const groupCommentsRoutes = require('./routes/groupComments');
const groupMediaRoutes = require('./routes/groupMedia');
const pollsRoutes = require('./routes/polls');
const conversationsRoutes = require('./routes/conversations');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const deviceTokensRoutes = require('./routes/deviceTokens');
const messageAttachmentsRoutes = require('./routes/messageAttachments');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Initialize Express app
const app = express();
const PORT = config.server.api.port;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - limit each IP based on config
const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for OPTIONS requests (CORS preflight) and localhost in development
  skip: (req) => {
    // Always skip OPTIONS requests
    if (req.method === 'OPTIONS') return true;
    // Skip localhost in development
    if (config.isDevelopment && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1')) return true;
    return false;
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders
}));

// Body parsing middleware
const maxFileSize = `${Math.round(config.upload.maxFileSize / 1048576)}mb`;
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: maxFileSize }));

// Cookie parsing middleware
app.use(cookieParser());

// Logging middleware
if (config.database.logging) {
  const format = config.isDevelopment ? 'dev' : 'combined';
  app.use(morgan(format));
}

// Static file serving for uploaded media
// Note: Files are uploaded to src/uploads by the media routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/media', express.static(path.join(__dirname, '../public/media')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Social Media API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/reactions', reactionsRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/shares', sharesRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/groups', groupPostsRoutes);
app.use('/api/groups', groupCommentsRoutes);
app.use('/api/groups', groupMediaRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/device-tokens', deviceTokensRoutes);
app.use('/api/message-attachments', messageAttachmentsRoutes);

// Catch-all route for undefined endpoints
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

/**
 * Start the server and connect to database
 */
async function startServer() {
  try {
    // Initialize database connection pool
    initializeDatabase();

    // Test database connection
    await testConnection();
    console.log('✅ Database connection established successfully.');

    // Start HTTP server (no WebSocket - runs on separate server)
    app.listen(PORT, () => {
      console.log(`🚀 API Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${config.env}`);
      console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
      console.log(`📡 API endpoints available at: http://localhost:${PORT}/api`);
      console.log(`💡 WebSocket server should be started separately on port 3002`);
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handling
 */
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();