/**
 * Centralized Configuration for Social Media Posting Platform
 * This file contains all configuration settings used by both frontend and backend
 *
 * Environment Variables:
 * - NODE_ENV: 'development' | 'test' | 'production'
 * - APP_ENV: Override for specific app environment
 */

// Determine current environment
const environment = process.env.APP_ENV || process.env.NODE_ENV || 'development';

// Base configuration object
const config = {
  // Environment information
  env: environment,
  isDevelopment: environment === 'development',
  isProduction: environment === 'production',
  isTest: environment === 'test',

  // Server Configuration
  server: {
    // Backend API server
    api: {
      port: parseInt(process.env.API_PORT) || 3002,
      host: process.env.API_HOST || 'localhost',
      protocol: process.env.API_PROTOCOL || 'http'
    },

    // Frontend development server
    frontend: {
      port: parseInt(process.env.FRONTEND_PORT) || 3000,
      host: process.env.FRONTEND_HOST || 'localhost',
      protocol: process.env.FRONTEND_PROTOCOL || 'http'
    }
  },

  // Database Configuration
  database: {
    // PostgreSQL settings
    postgres: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'posting_system',
      username: process.env.DB_USER || 'dev_user',
      password: process.env.DB_PASSWORD || 'dev_password',
      ssl: process.env.DB_SSL === 'true',

      // Connection pool settings
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        min: parseInt(process.env.DB_POOL_MIN) || 0,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
        idle: parseInt(process.env.DB_POOL_IDLE) || 10000
      }
    }
  },

  // Authentication & Security
  auth: {
    // JWT configuration
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: process.env.JWT_ISSUER || 'social-media-platform',
      audience: process.env.JWT_AUDIENCE || 'social-media-users'
    },

    // Password hashing
    bcrypt: {
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
    },

    // Session configuration (if using sessions)
    session: {
      secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
      secure: environment === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
  },

  // File Upload Configuration
  upload: {
    // File size limits (in bytes)
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    maxFiles: parseInt(process.env.MAX_FILES) || 5,

    // Upload paths
    uploadDir: process.env.UPLOAD_DIR || '../uploads',

    // Allowed file types
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
    allowedVideoTypes: (process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm,video/ogg').split(','),
    allowedAudioTypes: (process.env.ALLOWED_AUDIO_TYPES || 'audio/mp3,audio/wav,audio/ogg').split(','),
    allowedDocumentTypes: (process.env.ALLOWED_DOC_TYPES || 'application/pdf,text/plain').split(','),

    // Image processing
    imageQuality: parseInt(process.env.IMAGE_QUALITY) || 80,
    thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE) || 300,
    avatarSize: parseInt(process.env.AVATAR_SIZE) || 150
  },

  // Rate Limiting
  rateLimiting: {
    // General API rate limiting
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

    // Specific endpoint limits
    upload: {
      windowMs: parseInt(process.env.UPLOAD_RATE_WINDOW_MS) || 3600000, // 1 hour
      maxRequests: parseInt(process.env.UPLOAD_RATE_MAX_REQUESTS) || 20
    },

    auth: {
      windowMs: parseInt(process.env.AUTH_RATE_WINDOW_MS) || 900000, // 15 minutes
      maxRequests: parseInt(process.env.AUTH_RATE_MAX_REQUESTS) || 5
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3004'],
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
    methods: (process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS').split(','),
    allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With').split(','),
    maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400 // 24 hours
  },

  // Application Features
  features: {
    // Feature flags
    enableFileUpload: process.env.ENABLE_FILE_UPLOAD !== 'false',
    enableVideoUpload: process.env.ENABLE_VIDEO_UPLOAD !== 'false',
    enableEmojiReactions: process.env.ENABLE_EMOJI_REACTIONS !== 'false',
    enableNestedComments: process.env.ENABLE_NESTED_COMMENTS !== 'false',
    enableUserProfiles: process.env.ENABLE_USER_PROFILES !== 'false',
    enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
    enableRealTime: process.env.ENABLE_REAL_TIME === 'true',

    // Limits
    maxCommentDepth: parseInt(process.env.MAX_COMMENT_DEPTH) || 5,
    maxPostLength: parseInt(process.env.MAX_POST_LENGTH) || 10000,
    maxCommentLength: parseInt(process.env.MAX_COMMENT_LENGTH) || 2000,
    maxBioLength: parseInt(process.env.MAX_BIO_LENGTH) || 500
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (environment === 'development' ? 'debug' : 'info'),
    file: process.env.LOG_FILE || null,
    console: process.env.LOG_CONSOLE !== 'false',
    includeStack: environment === 'development',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m'
  },

  // Cache Configuration (if using Redis)
  cache: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: parseInt(process.env.REDIS_DB) || 0,
      ttl: parseInt(process.env.CACHE_TTL) || 3600 // 1 hour
    }
  },

  // Email Configuration (for future features)
  email: {
    smtp: {
      host: process.env.SMTP_HOST || null,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || null,
      password: process.env.SMTP_PASSWORD || null
    },
    from: process.env.EMAIL_FROM || 'noreply@localhost',
    templates: {
      welcome: process.env.EMAIL_TEMPLATE_WELCOME || 'welcome',
      resetPassword: process.env.EMAIL_TEMPLATE_RESET || 'reset-password'
    }
  },

  // Social/External APIs (for future integrations)
  external: {
    // Social media integrations
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || null,
      appSecret: process.env.FACEBOOK_APP_SECRET || null
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || null
    },

    // Media processing
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
      apiKey: process.env.CLOUDINARY_API_KEY || null,
      apiSecret: process.env.CLOUDINARY_API_SECRET || null
    }
  },

  // Performance & Monitoring
  monitoring: {
    // Application performance monitoring
    enableAPM: process.env.ENABLE_APM === 'true',
    apmServiceName: process.env.APM_SERVICE_NAME || 'social-media-api',

    // Health checks
    healthCheck: {
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
    }
  }
};

// Environment-specific overrides
const environmentConfigs = {
  development: {
    logging: {
      level: 'debug',
      console: true,
      includeStack: true
    },
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3004', 'http://localhost:3001'],
      credentials: true
    }
  },

  test: {
    database: {
      postgres: {
        database: 'posting_system_test',
        logging: false
      }
    },
    logging: {
      level: 'error',
      console: false
    }
  },

  production: {
    server: {
      api: {
        protocol: 'https'
      },
      frontend: {
        protocol: 'https'
      }
    },
    auth: {
      session: {
        secure: true,
        sameSite: 'strict'
      }
    },
    logging: {
      level: 'info',
      console: false,
      includeStack: false
    },
    database: {
      postgres: {
        ssl: true
      }
    }
  }
};

// Merge environment-specific config
if (environmentConfigs[environment]) {
  Object.assign(config, mergeDeep(config, environmentConfigs[environment]));
}

/**
 * Deep merge utility function
 */
function mergeDeep(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Get configuration value by dot notation path
 * Example: getConfig('database.postgres.host')
 */
function getConfig(path) {
  return path.split('.').reduce((obj, key) => obj && obj[key], config);
}

/**
 * Validate required configuration values
 */
function validateConfig() {
  const required = [
    'server.api.port',
    'database.postgres.host',
    'database.postgres.database'
  ];

  const missing = required.filter(path => !getConfig(path));

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  return true;
}

/**
 * Get database URL for connections
 */
function getDatabaseUrl() {
  const db = config.database.postgres;
  const protocol = db.ssl ? 'postgresql' : 'postgres';
  return `${protocol}://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}`;
}

/**
 * Get API base URL
 */
function getApiBaseUrl() {
  const api = config.server.api;
  return `${api.protocol}://${api.host}:${api.port}`;
}

/**
 * Get frontend base URL
 */
function getFrontendBaseUrl() {
  const frontend = config.server.frontend;
  return `${frontend.protocol}://${frontend.host}:${frontend.port}`;
}

// Export configuration and utilities
module.exports = {
  config,
  getConfig,
  validateConfig,
  getDatabaseUrl,
  getApiBaseUrl,
  getFrontendBaseUrl,

  // Export commonly used configs directly
  env: config.env,
  isDevelopment: config.isDevelopment,
  isProduction: config.isProduction,
  isTest: config.isTest
};

// Validate configuration on load
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  if (config.env === 'production') {
    process.exit(1);
  }
}