/**
 * Standalone WebSocket Server for Real-time Messaging and Notifications
 * Runs on a separate port from the main API server
 */

const http = require('http');
const cors = require('cors');
const express = require('express');
require('dotenv').config();

// Import centralized configuration
const { config } = require('../../config/app.config');

// Import WebSocket initialization
const { initializeWebSocket } = require('./websocket');

// Import database connection (needed for authentication)
const { initializeDatabase, testConnection, closeConnection } = require('./config/database');

// Create minimal Express app for health checks
const app = express();
const WS_PORT = parseInt(process.env.WS_PORT) || 3002;

// Enable CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'WebSocket Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env
  });
});

/**
 * Start the WebSocket server
 */
async function startWebSocketServer() {
  try {
    // Initialize database connection pool
    initializeDatabase();

    // Test database connection
    await testConnection();
    console.log('✅ Database connection established successfully.');

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize WebSocket server
    const io = initializeWebSocket(httpServer);

    // Start HTTP server
    httpServer.listen(WS_PORT, () => {
      console.log(`🔌 WebSocket Server is running on port ${WS_PORT}`);
      console.log(`🌍 Environment: ${config.env}`);
      console.log(`📊 Health check available at: http://localhost:${WS_PORT}/health`);
      console.log(`🔌 WebSocket endpoint: ws://localhost:${WS_PORT}`);
    });

  } catch (error) {
    console.error('❌ Unable to start WebSocket server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handling
 */
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down WebSocket server gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down WebSocket server gracefully...');
  await closeConnection();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Start the WebSocket server
startWebSocketServer();
