/**
 * TypeScript Configuration for Frontend
 * This mirrors the main config but provides TypeScript types and browser compatibility
 */

// Configuration interface
export interface AppConfig {
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  server: {
    api: {
      port: number;
      host: string;
      protocol: string;
    };
    frontend: {
      port: number;
      host: string;
      protocol: string;
    };
  };
  upload: {
    maxFileSize: number;
    maxFiles: number;
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
    allowedAudioTypes: string[];
    allowedDocumentTypes: string[];
    imageQuality: number;
    thumbnailSize: number;
    avatarSize: number;
  };
  features: {
    enableFileUpload: boolean;
    enableVideoUpload: boolean;
    enableEmojiReactions: boolean;
    enableNestedComments: boolean;
    enableUserProfiles: boolean;
    enableNotifications: boolean;
    enableRealTime: boolean;
    maxCommentDepth: number;
    maxPostLength: number;
    maxCommentLength: number;
    maxBioLength: number;
  };
  cors: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
}

// Get environment - works in both Node.js and browser
const getEnv = (key: string, defaultValue?: string): string => {
  // Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue || '';
  }

  // Browser environment - React environment variables must start with REACT_APP_
  if (typeof window !== 'undefined') {
    const reactKey = key.startsWith('REACT_APP_') ? key : `REACT_APP_${key}`;
    return (window as any).env?.[reactKey] || defaultValue || '';
  }

  return defaultValue || '';
};

// Determine current environment
const environment = getEnv('APP_ENV') || getEnv('NODE_ENV') || 'development';

// Base configuration
export const config: AppConfig = {
  // Environment information
  env: environment,
  isDevelopment: environment === 'development',
  isProduction: environment === 'production',
  isTest: environment === 'test',

  // Server Configuration
  server: {
    api: {
      port: parseInt(getEnv('API_PORT', '3002')),
      host: getEnv('API_HOST', 'localhost'),
      protocol: getEnv('API_PROTOCOL', 'http')
    },
    frontend: {
      port: parseInt(getEnv('FRONTEND_PORT', '3000')),
      host: getEnv('FRONTEND_HOST', 'localhost'),
      protocol: getEnv('FRONTEND_PROTOCOL', 'http')
    }
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(getEnv('MAX_FILE_SIZE', '10485760')), // 10MB
    maxFiles: parseInt(getEnv('MAX_FILES', '5')),
    allowedImageTypes: getEnv('ALLOWED_IMAGE_TYPES', 'image/jpeg,image/png,image/gif,image/webp').split(','),
    allowedVideoTypes: getEnv('ALLOWED_VIDEO_TYPES', 'video/mp4,video/webm,video/ogg').split(','),
    allowedAudioTypes: getEnv('ALLOWED_AUDIO_TYPES', 'audio/mp3,audio/wav,audio/ogg').split(','),
    allowedDocumentTypes: getEnv('ALLOWED_DOC_TYPES', 'application/pdf,text/plain').split(','),
    imageQuality: parseInt(getEnv('IMAGE_QUALITY', '80')),
    thumbnailSize: parseInt(getEnv('THUMBNAIL_SIZE', '300')),
    avatarSize: parseInt(getEnv('AVATAR_SIZE', '150'))
  },

  // Application Features
  features: {
    enableFileUpload: getEnv('ENABLE_FILE_UPLOAD') !== 'false',
    enableVideoUpload: getEnv('ENABLE_VIDEO_UPLOAD') !== 'false',
    enableEmojiReactions: getEnv('ENABLE_EMOJI_REACTIONS') !== 'false',
    enableNestedComments: getEnv('ENABLE_NESTED_COMMENTS') !== 'false',
    enableUserProfiles: getEnv('ENABLE_USER_PROFILES') !== 'false',
    enableNotifications: getEnv('ENABLE_NOTIFICATIONS') === 'true',
    enableRealTime: getEnv('ENABLE_REAL_TIME') === 'true',
    maxCommentDepth: parseInt(getEnv('MAX_COMMENT_DEPTH', '5')),
    maxPostLength: parseInt(getEnv('MAX_POST_LENGTH', '10000')),
    maxCommentLength: parseInt(getEnv('MAX_COMMENT_LENGTH', '2000')),
    maxBioLength: parseInt(getEnv('MAX_BIO_LENGTH', '500'))
  },

  // CORS Configuration
  cors: {
    origin: getEnv('CORS_ORIGIN', 'http://localhost:3000,http://localhost:3004').split(','),
    credentials: getEnv('CORS_CREDENTIALS') !== 'false',
    methods: getEnv('CORS_METHODS', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS').split(','),
    allowedHeaders: getEnv('CORS_ALLOWED_HEADERS', 'Content-Type,Authorization,X-Requested-With').split(',')
  }
};

/**
 * Get API base URL for frontend requests
 */
export const getApiBaseUrl = (): string => {
  const api = config.server.api;
  return `${api.protocol}://${api.host}:${api.port}`;
};

/**
 * Get frontend base URL
 */
export const getFrontendBaseUrl = (): string => {
  const frontend = config.server.frontend;
  return `${frontend.protocol}://${frontend.host}:${frontend.port}`;
};

/**
 * Get configuration value by dot notation path
 */
export const getConfig = (path: string): any => {
  return path.split('.').reduce((obj, key) => obj && (obj as any)[key], config);
};

/**
 * File validation utilities
 */
export const fileValidation = {
  isValidImageType: (mimeType: string): boolean => {
    return config.upload.allowedImageTypes.includes(mimeType);
  },

  isValidVideoType: (mimeType: string): boolean => {
    return config.upload.allowedVideoTypes.includes(mimeType);
  },

  isValidAudioType: (mimeType: string): boolean => {
    return config.upload.allowedAudioTypes.includes(mimeType);
  },

  isValidDocumentType: (mimeType: string): boolean => {
    return config.upload.allowedDocumentTypes.includes(mimeType);
  },

  isValidFileSize: (size: number): boolean => {
    return size <= config.upload.maxFileSize;
  },

  isValidFileCount: (count: number): boolean => {
    return count <= config.upload.maxFiles;
  }
};

/**
 * Content validation utilities
 */
export const contentValidation = {
  isValidPostLength: (content: string): boolean => {
    return content.length <= config.features.maxPostLength;
  },

  isValidCommentLength: (content: string): boolean => {
    return content.length <= config.features.maxCommentLength;
  },

  isValidBioLength: (bio: string): boolean => {
    return bio.length <= config.features.maxBioLength;
  }
};

// Export individual config sections for convenience
export const serverConfig = config.server;
export const uploadConfig = config.upload;
export const featureConfig = config.features;
export const corsConfig = config.cors;

// Export environment flags
export const { env, isDevelopment, isProduction, isTest } = config;

// Default export
export default config;