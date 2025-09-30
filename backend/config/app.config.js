/**
 * Application configuration for all environments
 */

require('dotenv').config();

const config = {
  // Environment
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3002,
  isProduction: process.env.NODE_ENV === 'production',

  // Authentication & JWT
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: process.env.JWT_ISSUER || 'posting-system',
      audience: process.env.JWT_AUDIENCE || 'posting-system-users'
    },
    session: {
      maxAge: process.env.SESSION_MAX_AGE || 86400000, // 24 hours
      sameSite: process.env.SESSION_SAME_SITE || 'lax'
    }
  },

  // Rate Limiting
  rateLimiting: {
    auth: {
      windowMs: process.env.AUTH_RATE_WINDOW_MS || 900000, // 15 minutes
      maxRequests: process.env.AUTH_RATE_MAX_REQUESTS || (process.env.NODE_ENV === 'test' ? 1000 : 10)
    },
    general: {
      windowMs: process.env.GENERAL_RATE_WINDOW_MS || 900000, // 15 minutes
      maxRequests: process.env.GENERAL_RATE_MAX_REQUESTS || 100
    }
  },

  // File Upload
  upload: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: process.env.MAX_FILE_SIZE || 10485760, // 10MB
    maxFiles: process.env.MAX_FILES || 5,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/avi'],
    allowedAudioTypes: ['audio/mp3', 'audio/wav', 'audio/ogg'],
    allowedDocumentTypes: ['application/pdf', 'text/plain'],
    imageQuality: process.env.IMAGE_QUALITY || 80,
    thumbnailSize: process.env.THUMBNAIL_SIZE || 300
  },

  // Email (for password reset, verification, etc.)
  email: {
    from: process.env.EMAIL_FROM || 'noreply@postingsystem.com',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
    logging: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test',
    postgres: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'posting_system',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'password',
      ssl: process.env.DB_SSL === 'true',
      pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10'),
        min: parseInt(process.env.DB_POOL_MIN || '0'),
        acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
        idle: parseInt(process.env.DB_POOL_IDLE || '10000')
      }
    }
  },

  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  logging: {
    console: process.env.CONSOLE_LOGGING !== 'false'
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },

  // Features
  features: {
    maxBioLength: 500,
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
    enablePasswordReset: process.env.ENABLE_PASSWORD_RESET !== 'false',
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  }
};

module.exports = { config };