# Upload Service Centralization Plan

**Version:** 1.0
**Date:** November 6, 2025
**Status:** Planning Phase - DO NOT IMPLEMENT YET
**Estimated Effort:** 2-3 days
**Risk Level:** Medium (requires careful migration and testing)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Problems with Current Architecture](#problems-with-current-architecture)
4. [Proposed Architecture](#proposed-architecture)
5. [Centralized Upload Service Design](#centralized-upload-service-design)
6. [Migration Strategy](#migration-strategy)
7. [Implementation Phases](#implementation-phases)
8. [API Changes](#api-changes)
9. [File Structure Changes](#file-structure-changes)
10. [Testing Strategy](#testing-strategy)
11. [Rollback Plan](#rollback-plan)
12. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Problem
The current upload system is fragmented across 7+ route files, each implementing its own multer configuration, validation, and file processing logic. This leads to code duplication, inconsistent behavior, and makes CDN migration extremely difficult.

### Solution
Create a centralized `UploadService` that provides:
- Reusable upload middleware configurations
- Standardized file processing (optimization, thumbnails, validation)
- Consistent error handling
- Single point of change for CDN migration
- Type-specific upload handlers (avatar, media, marketplace, etc.)

### Benefits
- ✅ **80% reduction in upload-related code duplication**
- ✅ **Single file to update** for CDN migration
- ✅ **Consistent file handling** across all features
- ✅ **Easier maintenance and debugging**
- ✅ **Better error messages** with standardized handling
- ✅ **Improved testability** with isolated service logic

### Risks
- ⚠️ **Breaking changes** if not carefully migrated
- ⚠️ **Regression risk** during migration
- ⚠️ **Learning curve** for team members

---

## Current State Analysis

### Upload Implementations Inventory

#### 1. `/api/media/upload` (routes/media.js)
**Purpose:** Main media uploads for posts and comments
**Location:** `uploads/images/`, `uploads/media/`
**Features:**
- Multer disk storage with UUID filenames
- Image optimization using Sharp (quality: 80%)
- Thumbnail generation (300x300)
- File type filtering (images, videos, audio, documents)
- Max file size: 50MB (from config)
- Max files: 10 (from config)
- Stores in `media` table

**Code Lines:** ~260 lines
**Dependencies:** multer, sharp, uuid, fs/promises

#### 2. `/api/users/:id/avatar` (routes/users.js)
**Purpose:** User avatar uploads
**Location:** `uploads/users/avatars/`
**Features:**
- Separate multer config
- 5MB file size limit
- Image types only (jpeg, png, gif, webp)
- No optimization or thumbnails
- Updates `users.avatar_url` field

**Code Lines:** ~80 lines
**Dependencies:** multer, sharp, uuid, fs/promises

#### 3. `/api/groups/:slug/avatar` (routes/groups.js)
**Purpose:** Group avatar uploads
**Location:** `uploads/groups/avatars/`
**Features:**
- Separate multer config
- 5MB file size limit
- Image types only
- Square crop (800x800) using Sharp
- Updates `groups.avatar_url` field

**Code Lines:** ~90 lines
**Dependencies:** multer, sharp, uuid, fs/promises

#### 4. `/api/groups/:slug/banner` (routes/groups.js)
**Purpose:** Group banner uploads
**Location:** `uploads/groups/banners/`
**Features:**
- Separate multer config (bannerStorage)
- 10MB file size limit
- Image types only
- Resize to 1200x400 using Sharp
- Updates `groups.banner_url` field

**Code Lines:** ~90 lines
**Dependencies:** multer, sharp, uuid, fs/promises

#### 5. `/api/group-media/upload` (routes/groupMedia.js)
**Purpose:** Group post/comment media
**Location:** `uploads/group-media/`
**Features:**
- Similar to main media route
- Separate multer config
- Image optimization
- Thumbnail generation
- Stores in `group_post_media` or `group_comment_media` tables

**Code Lines:** ~250 lines
**Dependencies:** multer, sharp, uuid, fs/promises

#### 6. `/api/message-attachments/upload` (routes/messageAttachments.js)
**Purpose:** Direct message attachments
**Location:** `uploads/message-attachments/`
**Features:**
- Separate multer config
- 20MB file size limit (larger for documents)
- All file types allowed
- No optimization (preserves originals)
- Stores in `message_attachments` table

**Code Lines:** ~150 lines
**Dependencies:** multer, uuid, fs/promises

#### 7. `/api/marketplace/listings` (routes/marketplaceListings.js)
**Purpose:** Marketplace listing images
**Location:** `uploads/marketplace/`
**Features:**
- Separate multer config
- Image optimization
- Watermarking capability
- Stores in `marketplace_media` table
- Multiple images per listing

**Code Lines:** ~200 lines
**Dependencies:** multer, sharp, uuid, fs/promises

### Summary Statistics

| Metric | Count |
|--------|-------|
| Total Upload Implementations | 7 |
| Total Lines of Duplicated Code | ~1,120 |
| Multer Configurations | 8+ (some routes have multiple) |
| Upload Directories | 7+ |
| Database Tables Affected | 6 |
| Dependencies Repeated | multer (7x), sharp (6x), uuid (7x) |

---

## Problems with Current Architecture

### 1. Code Duplication (Critical)
**Problem:** Nearly identical multer configuration repeated in 7+ files
**Impact:**
- Maintenance burden (changes must be made 7+ times)
- Bug fixes require updates in multiple files
- Inconsistent implementations due to copy-paste errors
- Harder to onboard new developers

**Example:**
```javascript
// This pattern is repeated 7+ times with slight variations
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/[type]');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
```

### 2. Inconsistent File Validation
**Problem:** Different routes have different validation rules

| Route | Max Size | Allowed Types | Validation Logic |
|-------|----------|---------------|------------------|
| media.js | 50MB | images, videos, audio, docs | Uses config |
| users.js | 5MB | images only | Hardcoded array |
| groups.js (avatar) | 5MB | images only | Hardcoded array |
| groups.js (banner) | 10MB | images only | Hardcoded array |
| groupMedia.js | 50MB | images, videos | Uses config |
| messageAttachments.js | 20MB | all types | Different config |
| marketplaceListings.js | 10MB | images only | Hardcoded array |

**Impact:**
- Confusing user experience (inconsistent error messages)
- Hard to enforce platform-wide policies
- Security vulnerabilities if one route is less strict

### 3. Inconsistent Image Processing
**Problem:** Different Sharp configurations across routes

| Route | Optimization | Thumbnails | Resizing | Watermark |
|-------|--------------|------------|----------|-----------|
| media.js | ✅ (quality: 80) | ✅ (300x300) | ❌ | ❌ |
| users.js | ❌ | ❌ | ❌ | ❌ |
| groups.js (avatar) | ❌ | ❌ | ✅ (800x800 crop) | ❌ |
| groups.js (banner) | ❌ | ❌ | ✅ (1200x400) | ❌ |
| groupMedia.js | ✅ | ✅ | ❌ | ❌ |
| messageAttachments.js | ❌ | ❌ | ❌ | ❌ |
| marketplaceListings.js | ✅ | ✅ | ❌ | ⚠️ (planned) |

**Impact:**
- Inconsistent file sizes (some optimized, some not)
- Storage inefficiency
- Slow page loads for unoptimized images
- No standard thumbnail strategy

### 4. Inconsistent Error Handling
**Problem:** Different error messages and handling strategies

**Examples:**
```javascript
// media.js - Detailed error handling
if (!req.files || req.files.length === 0) {
  return res.status(400).json({
    success: false,
    error: {
      message: 'No files were uploaded',
      type: 'NO_FILES'
    }
  });
}

// users.js - Generic error
fileFilter: (req, file, cb) => {
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
}

// groups.js - Throws error directly
cb(new Error('File too large'));
```

**Impact:**
- Inconsistent API responses
- Harder to debug for frontend developers
- Poor user experience

### 5. Directory Structure Inconsistency
**Problem:** No standardized upload directory structure

**Current Structure:**
```
uploads/
├── images/           # From media.js
├── media/            # From media.js
├── users/
│   └── avatars/      # From users.js
├── groups/
│   ├── avatars/      # From groups.js
│   └── banners/      # From groups.js
├── group-media/      # From groupMedia.js
├── message-attachments/ # From messageAttachments.js
└── marketplace/      # From marketplaceListings.js
```

**Issues:**
- Inconsistent naming (kebab-case vs camelCase)
- No clear organization
- Hard to implement CDN migration
- Difficult to manage permissions

### 6. CDN Migration Nightmare
**Problem:** Switching to CDN (S3, Cloudinary, etc.) requires changes in 7+ files

**Current Barriers:**
- Each route hardcodes local file paths
- No abstraction layer for storage backend
- File URL generation scattered across routes
- Thumbnail generation tied to local filesystem

**Estimated Effort for CDN Migration (Current State):**
- **Without centralization:** 3-5 days + high risk of bugs
- **With centralization:** 4-8 hours + low risk

### 7. Testing Difficulties
**Problem:** Hard to test upload functionality

**Issues:**
- No isolated service to mock
- Must test entire route handlers
- File cleanup scattered across routes
- Hard to test error scenarios

### 8. Configuration Management
**Problem:** Mix of hardcoded values and config usage

**Examples:**
```javascript
// Some routes use centralized config
limits: {
  fileSize: config.upload.maxFileSize,
  files: config.upload.maxFiles
}

// Others hardcode values
limits: {
  fileSize: 5 * 1024 * 1024 // Hardcoded 5MB
}
```

**Impact:**
- Can't change limits platform-wide
- Hard to adjust for different environments
- No runtime configuration

---

## Proposed Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                         API Routes                           │
│  (media, users, groups, marketplace, messages, etc.)        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Uses middleware & helper functions
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                   UploadService (NEW)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Multer Middleware Factory                            │  │
│  │  - createImageUploader(type, options)                 │  │
│  │  - createFileUploader(type, options)                  │  │
│  │  - createAvatarUploader(options)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  File Processing                                      │  │
│  │  - optimizeImage(file, options)                       │  │
│  │  - generateThumbnail(file, size)                      │  │
│  │  - resizeImage(file, dimensions)                      │  │
│  │  - addWatermark(file, text)                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Storage Abstraction Layer                            │  │
│  │  - saveFile(file, type) → local/CDN                   │  │
│  │  - deleteFile(url) → local/CDN                        │  │
│  │  - getFileUrl(path) → local/CDN URL                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Validation                                           │  │
│  │  - validateFileType(file, allowedTypes)               │  │
│  │  - validateFileSize(file, maxSize)                    │  │
│  │  - validateImageDimensions(file, minMax)              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Error Handling                                       │  │
│  │  - handleUploadError(error) → standardized response   │  │
│  │  - cleanupFailedUploads(files)                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                   │
                   │ Delegates to
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              Storage Provider (Pluggable)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ LocalStorage │  │  S3Storage   │  │ Cloudinary   │      │
│  │   Provider   │  │   Provider   │  │   Provider   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Single Responsibility:** Each function has one clear purpose
2. **DRY (Don't Repeat Yourself):** Shared logic in reusable functions
3. **Open/Closed:** Open for extension (new upload types), closed for modification
4. **Dependency Injection:** Storage provider is pluggable
5. **Fail Fast:** Validate early, fail with clear errors
6. **Clean Up:** Always clean up files on error

---

## Centralized Upload Service Design

### File Structure

```
backend/src/
├── services/
│   ├── upload/
│   │   ├── index.js                    # Main export
│   │   ├── UploadService.js            # Core service class
│   │   ├── middlewares/
│   │   │   ├── imageUpload.js          # Image-specific middleware
│   │   │   ├── fileUpload.js           # General file middleware
│   │   │   ├── avatarUpload.js         # Avatar-specific middleware
│   │   │   └── marketplaceUpload.js    # Marketplace-specific middleware
│   │   ├── processors/
│   │   │   ├── imageProcessor.js       # Sharp processing utilities
│   │   │   ├── thumbnailGenerator.js   # Thumbnail generation
│   │   │   └── watermarkProcessor.js   # Watermarking
│   │   ├── validators/
│   │   │   ├── fileValidator.js        # File type/size validation
│   │   │   └── imageValidator.js       # Image-specific validation
│   │   ├── storage/
│   │   │   ├── StorageProvider.js      # Abstract base class
│   │   │   ├── LocalStorageProvider.js # Local filesystem storage
│   │   │   ├── S3StorageProvider.js    # AWS S3 storage (future)
│   │   │   └── CloudinaryProvider.js   # Cloudinary storage (future)
│   │   ├── errors/
│   │   │   └── UploadError.js          # Custom error class
│   │   └── config/
│   │       └── uploadTypes.js          # Upload type configurations
```

### Core Service Class: UploadService.js

```javascript
/**
 * Centralized Upload Service
 * Provides reusable upload middleware and file processing utilities
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const { config } = require('../../../config/app.config');
const imageProcessor = require('./processors/imageProcessor');
const fileValidator = require('./validators/fileValidator');
const UploadError = require('./errors/UploadError');

class UploadService {
  constructor(storageProvider) {
    this.storageProvider = storageProvider;
  }

  /**
   * Create a multer upload middleware for specific upload type
   * @param {Object} options - Upload configuration
   * @param {string} options.uploadType - Type of upload (avatar, media, marketplace, etc.)
   * @param {string[]} options.allowedTypes - Allowed MIME types
   * @param {number} options.maxFileSize - Max file size in bytes
   * @param {number} options.maxFiles - Max number of files
   * @param {boolean} options.optimize - Whether to optimize images
   * @param {boolean} options.generateThumbnail - Whether to generate thumbnails
   * @returns {multer.Multer} Configured multer instance
   */
  createUploader(options = {}) {
    const {
      uploadType = 'general',
      allowedTypes = config.upload.allowedImageTypes,
      maxFileSize = config.upload.maxFileSize,
      maxFiles = config.upload.maxFiles,
      optimize = true,
      generateThumbnail = false,
      resize = null,
      watermark = null
    } = options;

    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = this.getUploadDirectory(uploadType);
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(new UploadError('Failed to create upload directory', 'DIRECTORY_ERROR', error));
        }
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uploadType}-${uuidv4()}${ext}`;
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (fileValidator.isValidType(file, allowedTypes)) {
        cb(null, true);
      } else {
        cb(new UploadError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          'INVALID_FILE_TYPE'
        ), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxFileSize,
        files: maxFiles
      }
    });
  }

  /**
   * Process uploaded files (optimization, thumbnails, etc.)
   * @param {Array} files - Uploaded files from multer
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Processed file metadata
   */
  async processFiles(files, options = {}) {
    const {
      optimize = true,
      generateThumbnail = false,
      resize = null,
      watermark = null,
      quality = config.upload.imageQuality || 80
    } = options;

    const processedFiles = [];

    for (const file of files) {
      try {
        let processedFile = { ...file };

        // Only process images
        if (file.mimetype.startsWith('image/')) {
          // Optimize image
          if (optimize) {
            processedFile = await imageProcessor.optimize(file, { quality });
          }

          // Resize image
          if (resize) {
            processedFile = await imageProcessor.resize(processedFile, resize);
          }

          // Add watermark
          if (watermark) {
            processedFile = await imageProcessor.addWatermark(processedFile, watermark);
          }

          // Generate thumbnail
          if (generateThumbnail) {
            processedFile.thumbnail = await imageProcessor.generateThumbnail(
              processedFile,
              config.upload.thumbnailSize || 300
            );
          }

          // Extract metadata
          processedFile.metadata = await imageProcessor.getMetadata(processedFile);
        }

        // Generate file URL
        processedFile.fileUrl = this.storageProvider.getFileUrl(processedFile.path);

        processedFiles.push(processedFile);

      } catch (error) {
        // Clean up on error
        await this.cleanupFile(file.path);
        throw new UploadError(
          `Failed to process file: ${file.originalname}`,
          'PROCESSING_ERROR',
          error
        );
      }
    }

    return processedFiles;
  }

  /**
   * Clean up uploaded files (on error or deletion)
   * @param {string|Array} filePaths - File path(s) to delete
   */
  async cleanupFiles(filePaths) {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

    for (const filePath of paths) {
      try {
        await this.storageProvider.deleteFile(filePath);
      } catch (error) {
        console.error(`Failed to cleanup file: ${filePath}`, error);
      }
    }
  }

  /**
   * Get upload directory for specific type
   * @param {string} uploadType - Type of upload
   * @returns {string} Full directory path
   */
  getUploadDirectory(uploadType) {
    const baseDir = path.join(__dirname, '../../../uploads');

    const dirMap = {
      'avatar': path.join(baseDir, 'users', 'avatars'),
      'group-avatar': path.join(baseDir, 'groups', 'avatars'),
      'group-banner': path.join(baseDir, 'groups', 'banners'),
      'post-media': path.join(baseDir, 'posts', 'media'),
      'comment-media': path.join(baseDir, 'comments', 'media'),
      'group-post-media': path.join(baseDir, 'groups', 'posts', 'media'),
      'group-comment-media': path.join(baseDir, 'groups', 'comments', 'media'),
      'message-attachment': path.join(baseDir, 'messages', 'attachments'),
      'marketplace-image': path.join(baseDir, 'marketplace', 'images'),
      'general': path.join(baseDir, 'general')
    };

    return dirMap[uploadType] || dirMap['general'];
  }

  /**
   * Create avatar upload middleware
   * @param {Object} options - Additional options
   * @returns {multer.Multer} Configured multer for avatars
   */
  createAvatarUploader(options = {}) {
    return this.createUploader({
      uploadType: 'avatar',
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 1,
      optimize: true,
      generateThumbnail: false,
      resize: { width: 800, height: 800, fit: 'cover' },
      ...options
    });
  }

  /**
   * Create media upload middleware for posts/comments
   * @param {Object} options - Additional options
   * @returns {multer.Multer} Configured multer for media
   */
  createMediaUploader(options = {}) {
    return this.createUploader({
      uploadType: 'post-media',
      allowedTypes: [
        ...config.upload.allowedImageTypes,
        ...config.upload.allowedVideoTypes
      ],
      maxFileSize: config.upload.maxFileSize,
      maxFiles: config.upload.maxFiles,
      optimize: true,
      generateThumbnail: true,
      ...options
    });
  }

  /**
   * Create marketplace upload middleware
   * @param {Object} options - Additional options
   * @returns {multer.Multer} Configured multer for marketplace
   */
  createMarketplaceUploader(options = {}) {
    return this.createUploader({
      uploadType: 'marketplace-image',
      allowedTypes: config.upload.allowedImageTypes,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      optimize: true,
      generateThumbnail: true,
      watermark: options.watermark || null,
      ...options
    });
  }

  /**
   * Create message attachment uploader
   * @param {Object} options - Additional options
   * @returns {multer.Multer} Configured multer for message attachments
   */
  createMessageAttachmentUploader(options = {}) {
    return this.createUploader({
      uploadType: 'message-attachment',
      allowedTypes: [
        ...config.upload.allowedImageTypes,
        ...config.upload.allowedVideoTypes,
        ...config.upload.allowedAudioTypes,
        ...config.upload.allowedDocumentTypes
      ],
      maxFileSize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
      optimize: false, // Don't optimize attachments
      generateThumbnail: false,
      ...options
    });
  }
}

module.exports = UploadService;
```

### Image Processor: processors/imageProcessor.js

```javascript
/**
 * Image Processing Utilities
 * Handles optimization, resizing, thumbnails, and watermarks using Sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessor {
  /**
   * Optimize image file
   * @param {Object} file - File object from multer
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Updated file object
   */
  async optimize(file, options = {}) {
    const { quality = 80 } = options;

    try {
      const optimizedPath = file.path.replace(
        path.extname(file.path),
        '_optimized' + path.extname(file.path)
      );

      await sharp(file.path)
        .jpeg({ quality, mozjpeg: true })
        .png({ quality, compressionLevel: 9 })
        .webp({ quality })
        .toFile(optimizedPath);

      // Get size reduction
      const originalStats = await fs.stat(file.path);
      const optimizedStats = await fs.stat(optimizedPath);

      // Only use optimized if it's smaller
      if (optimizedStats.size < originalStats.size) {
        await fs.unlink(file.path);
        await fs.rename(optimizedPath, file.path);
        file.size = optimizedStats.size;
      } else {
        await fs.unlink(optimizedPath);
      }

      return file;
    } catch (error) {
      console.error('Image optimization failed:', error);
      // Return original file if optimization fails
      return file;
    }
  }

  /**
   * Resize image to specific dimensions
   * @param {Object} file - File object
   * @param {Object} dimensions - { width, height, fit }
   * @returns {Promise<Object>} Updated file object
   */
  async resize(file, dimensions) {
    const { width, height, fit = 'inside' } = dimensions;

    const resizedPath = file.path.replace(
      path.extname(file.path),
      '_resized' + path.extname(file.path)
    );

    await sharp(file.path)
      .resize(width, height, { fit, withoutEnlargement: true })
      .toFile(resizedPath);

    // Replace original
    await fs.unlink(file.path);
    await fs.rename(resizedPath, file.path);

    return file;
  }

  /**
   * Generate thumbnail for image
   * @param {Object} file - File object
   * @param {number} size - Thumbnail size (square)
   * @returns {Promise<string>} Thumbnail file path
   */
  async generateThumbnail(file, size = 300) {
    const thumbnailPath = file.path.replace(
      path.extname(file.path),
      '_thumb' + path.extname(file.path)
    );

    await sharp(file.path)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbnailPath);

    return thumbnailPath;
  }

  /**
   * Add watermark to image
   * @param {Object} file - File object
   * @param {Object} watermark - Watermark config { text, position, opacity }
   * @returns {Promise<Object>} Updated file object
   */
  async addWatermark(file, watermark) {
    const { text, position = 'southeast', opacity = 0.5 } = watermark;

    // Create SVG text watermark
    const svgText = Buffer.from(`
      <svg width="200" height="50">
        <text x="10" y="30" font-size="20" fill="white" opacity="${opacity}">
          ${text}
        </text>
      </svg>
    `);

    const watermarkedPath = file.path.replace(
      path.extname(file.path),
      '_watermarked' + path.extname(file.path)
    );

    await sharp(file.path)
      .composite([{
        input: svgText,
        gravity: position
      }])
      .toFile(watermarkedPath);

    // Replace original
    await fs.unlink(file.path);
    await fs.rename(watermarkedPath, file.path);

    return file;
  }

  /**
   * Get image metadata
   * @param {Object} file - File object
   * @returns {Promise<Object>} Image metadata
   */
  async getMetadata(file) {
    try {
      const metadata = await sharp(file.path).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha
      };
    } catch (error) {
      console.error('Failed to get image metadata:', error);
      return null;
    }
  }
}

module.exports = new ImageProcessor();
```

### Storage Provider Abstraction: storage/StorageProvider.js

```javascript
/**
 * Abstract Storage Provider Base Class
 * Defines interface for storage backends (local, S3, Cloudinary, etc.)
 */

class StorageProvider {
  /**
   * Save file to storage
   * @param {Object} file - File object
   * @param {string} type - Upload type
   * @returns {Promise<string>} File URL
   */
  async saveFile(file, type) {
    throw new Error('saveFile() must be implemented by subclass');
  }

  /**
   * Delete file from storage
   * @param {string} fileUrl - File URL or path
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileUrl) {
    throw new Error('deleteFile() must be implemented by subclass');
  }

  /**
   * Get public URL for file
   * @param {string} filePath - Internal file path
   * @returns {string} Public URL
   */
  getFileUrl(filePath) {
    throw new Error('getFileUrl() must be implemented by subclass');
  }

  /**
   * Check if file exists
   * @param {string} fileUrl - File URL
   * @returns {Promise<boolean>} Exists status
   */
  async fileExists(fileUrl) {
    throw new Error('fileExists() must be implemented by subclass');
  }
}

module.exports = StorageProvider;
```

### Local Storage Provider: storage/LocalStorageProvider.js

```javascript
/**
 * Local Filesystem Storage Provider
 * Stores files on local disk (current implementation)
 */

const StorageProvider = require('./StorageProvider');
const fs = require('fs').promises;
const path = require('path');

class LocalStorageProvider extends StorageProvider {
  constructor(baseUrl = 'http://localhost:3001') {
    super();
    this.baseUrl = baseUrl;
    this.uploadDir = path.join(__dirname, '../../../../uploads');
  }

  async saveFile(file, type) {
    // File is already saved by multer
    // Just return the file path
    return file.path;
  }

  async deleteFile(fileUrl) {
    try {
      // Convert URL to local path
      const filePath = this.urlToPath(fileUrl);
      await fs.unlink(filePath);

      // Also try to delete thumbnail if exists
      const ext = path.extname(filePath);
      const thumbPath = filePath.replace(ext, '_thumb' + ext);
      try {
        await fs.unlink(thumbPath);
      } catch (error) {
        // Ignore if thumbnail doesn't exist
      }

      return true;
    } catch (error) {
      console.error('Failed to delete file:', fileUrl, error);
      return false;
    }
  }

  getFileUrl(filePath) {
    // Convert absolute path to relative URL
    const relativePath = path.relative(this.uploadDir, filePath);
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  async fileExists(fileUrl) {
    try {
      const filePath = this.urlToPath(fileUrl);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  urlToPath(fileUrl) {
    // Convert URL like /uploads/images/file.jpg to absolute path
    const relativePath = fileUrl.replace('/uploads/', '');
    return path.join(this.uploadDir, relativePath);
  }
}

module.exports = LocalStorageProvider;
```

### S3 Storage Provider: storage/S3StorageProvider.js (Future)

```javascript
/**
 * AWS S3 Storage Provider
 * Stores files on Amazon S3 (future implementation)
 */

const StorageProvider = require('./StorageProvider');
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');

class S3StorageProvider extends StorageProvider {
  constructor(config) {
    super();
    this.s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
    this.bucket = config.bucket;
    this.cdnUrl = config.cdnUrl;
  }

  async saveFile(file, type) {
    const fileContent = await fs.readFile(file.path);
    const key = `${type}/${path.basename(file.path)}`;

    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    await this.s3.upload(params).promise();

    // Delete local file after upload
    await fs.unlink(file.path);

    return this.getFileUrl(key);
  }

  async deleteFile(fileUrl) {
    try {
      const key = this.urlToKey(fileUrl);
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      console.error('Failed to delete S3 file:', fileUrl, error);
      return false;
    }
  }

  getFileUrl(key) {
    return this.cdnUrl
      ? `${this.cdnUrl}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async fileExists(fileUrl) {
    try {
      const key = this.urlToKey(fileUrl);
      await this.s3.headObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  urlToKey(fileUrl) {
    // Extract S3 key from URL
    const url = new URL(fileUrl);
    return url.pathname.substring(1);
  }
}

module.exports = S3StorageProvider;
```

### Upload Error Class: errors/UploadError.js

```javascript
/**
 * Custom Upload Error Class
 * Provides standardized error handling for uploads
 */

class UploadError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.originalError = originalError;
    this.statusCode = this.getStatusCode(code);
  }

  getStatusCode(code) {
    const statusMap = {
      'INVALID_FILE_TYPE': 400,
      'FILE_TOO_LARGE': 413,
      'TOO_MANY_FILES': 400,
      'DIRECTORY_ERROR': 500,
      'PROCESSING_ERROR': 500,
      'STORAGE_ERROR': 500,
      'VALIDATION_ERROR': 400,
      'NO_FILES': 400
    };
    return statusMap[code] || 500;
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        type: this.code,
        ...(this.originalError && process.env.NODE_ENV === 'development' && {
          details: this.originalError.message
        })
      }
    };
  }
}

module.exports = UploadError;
```

### File Validator: validators/fileValidator.js

```javascript
/**
 * File Validation Utilities
 * Validates file types, sizes, and other constraints
 */

const path = require('path');

class FileValidator {
  /**
   * Check if file type is valid
   * @param {Object} file - File object
   * @param {string[]} allowedTypes - Allowed MIME types
   * @returns {boolean} Valid status
   */
  isValidType(file, allowedTypes) {
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Check if file size is within limit
   * @param {Object} file - File object
   * @param {number} maxSize - Max size in bytes
   * @returns {boolean} Valid status
   */
  isValidSize(file, maxSize) {
    return file.size <= maxSize;
  }

  /**
   * Check if file extension matches MIME type
   * @param {Object} file - File object
   * @returns {boolean} Valid status
   */
  isExtensionValid(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeToExt = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    };

    const expectedExts = mimeToExt[file.mimetype];
    return expectedExts ? expectedExts.includes(ext) : true;
  }

  /**
   * Sanitize filename
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }
}

module.exports = new FileValidator();
```

### Main Export: index.js

```javascript
/**
 * Upload Service Main Export
 * Provides centralized upload functionality
 */

const UploadService = require('./UploadService');
const LocalStorageProvider = require('./storage/LocalStorageProvider');
const S3StorageProvider = require('./storage/S3StorageProvider');
const UploadError = require('./errors/UploadError');
const imageProcessor = require('./processors/imageProcessor');
const fileValidator = require('./validators/fileValidator');

// Initialize with local storage by default
const storageProvider = process.env.STORAGE_PROVIDER === 's3'
  ? new S3StorageProvider({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET,
      cdnUrl: process.env.AWS_CDN_URL
    })
  : new LocalStorageProvider(process.env.BASE_URL || 'http://localhost:3001');

const uploadService = new UploadService(storageProvider);

// Export service instance and utilities
module.exports = {
  uploadService,
  UploadError,
  imageProcessor,
  fileValidator,

  // Export storage providers for direct use if needed
  LocalStorageProvider,
  S3StorageProvider
};
```

---

## Migration Strategy

### Phase 1: Preparation (Day 1)

#### 1.1 Create Upload Service Structure
- Create `backend/src/services/upload/` directory
- Implement all service files listed above
- Write unit tests for each module
- Document API for internal use

#### 1.2 Add Configuration
Update `config/app.config.js`:
```javascript
upload: {
  // Existing config...
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET,
    cdnUrl: process.env.AWS_CDN_URL
  }
}
```

#### 1.3 Create Migration Branch
```bash
git checkout -b feature/centralize-upload-service
git push -u origin feature/centralize-upload-service
```

### Phase 2: Migrate Routes One by One (Days 2-3)

**Migration Order (from simplest to most complex):**

1. ✅ **users.js** (avatar upload) - Simplest
2. ✅ **groups.js** (avatar & banner) - Similar to users
3. ✅ **messageAttachments.js** - No processing
4. ✅ **media.js** - Core media service
5. ✅ **groupMedia.js** - Similar to media
6. ✅ **marketplaceListings.js** - Most complex (watermarks)

**Migration Template for Each Route:**

```javascript
// BEFORE (in routes/users.js):
const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, USER_AVATAR_PATH);
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `user-avatar-${uniqueId}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'));
    }
  }
});

// AFTER (in routes/users.js):
const { uploadService } = require('../services/upload');

const avatarUpload = uploadService.createAvatarUploader();

// In route handler:
router.post('/:id/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  async (req, res, next) => {
    try {
      // Process uploaded file
      const [processedFile] = await uploadService.processFiles([req.file], {
        resize: { width: 800, height: 800, fit: 'cover' },
        optimize: true
      });

      // Update user avatar URL
      await User.update(req.params.id, {
        avatar_url: processedFile.fileUrl
      });

      res.json({ success: true, data: { avatar_url: processedFile.fileUrl } });
    } catch (error) {
      next(error);
    }
  }
);
```

### Phase 3: Testing (Day 3)

#### 3.1 Unit Tests
Test each service component:
- UploadService methods
- ImageProcessor functions
- FileValidator logic
- StorageProvider implementations

#### 3.2 Integration Tests
Test each migrated route:
- Upload success scenarios
- Error scenarios (invalid type, too large, etc.)
- File processing (optimization, thumbnails)
- Cleanup on error

#### 3.3 Manual Testing Checklist
- [ ] Upload user avatar
- [ ] Upload group avatar
- [ ] Upload group banner
- [ ] Upload post images
- [ ] Upload comment images
- [ ] Upload message attachments
- [ ] Upload marketplace images
- [ ] Test file size limits
- [ ] Test invalid file types
- [ ] Test multiple file uploads
- [ ] Verify thumbnails generated
- [ ] Verify image optimization
- [ ] Verify file cleanup on error

### Phase 4: Deployment (Day 3)

#### 4.1 Code Review
- Peer review of upload service code
- Security review (file validation, path traversal)
- Performance review

#### 4.2 Staging Deployment
- Deploy to staging environment
- Run full test suite
- Performance testing (concurrent uploads)

#### 4.3 Production Deployment
- Merge to main branch
- Deploy to production
- Monitor error logs
- Monitor upload metrics

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Create upload service infrastructure

**Tasks:**
- [ ] Create upload service directory structure
- [ ] Implement UploadService class
- [ ] Implement ImageProcessor
- [ ] Implement FileValidator
- [ ] Implement LocalStorageProvider
- [ ] Implement UploadError
- [ ] Write unit tests (80%+ coverage)
- [ ] Update app.config.js with new settings

**Deliverables:**
- Fully tested upload service ready for integration
- Documentation for developers

### Phase 2: Migration (Week 2)
**Goal:** Migrate all routes to use centralized service

**Day 1: Simple Routes**
- [ ] Migrate routes/users.js (avatar)
- [ ] Migrate routes/groups.js (avatar & banner)
- [ ] Test migrations

**Day 2: Complex Routes**
- [ ] Migrate routes/media.js
- [ ] Migrate routes/groupMedia.js
- [ ] Migrate routes/messageAttachments.js
- [ ] Test migrations

**Day 3: Marketplace & Testing**
- [ ] Migrate routes/marketplaceListings.js
- [ ] Run full integration test suite
- [ ] Fix any bugs found

**Deliverables:**
- All routes migrated
- All tests passing
- No regressions

### Phase 3: Enhancement (Week 3)
**Goal:** Add advanced features and optimize

**Tasks:**
- [ ] Implement S3StorageProvider
- [ ] Add Cloudinary support
- [ ] Implement watermarking for marketplace
- [ ] Add upload progress tracking
- [ ] Implement file chunking for large files
- [ ] Add image format conversion
- [ ] Performance optimization

**Deliverables:**
- Enhanced upload capabilities
- CDN-ready architecture

---

## API Changes

### Breaking Changes
**None** - The migration is designed to be backward-compatible. All existing API endpoints remain the same.

### New Capabilities (Optional)

#### 1. Unified Upload Endpoint (Future)
```javascript
// POST /api/upload
// Single endpoint for all upload types
{
  "type": "avatar" | "media" | "marketplace" | "attachment",
  "options": {
    "optimize": true,
    "generateThumbnail": true,
    "resize": { "width": 800, "height": 800 },
    "watermark": { "text": "© Company" }
  }
}
```

#### 2. Upload Progress (Future with Chunking)
```javascript
// WebSocket or Server-Sent Events
{
  "uploadId": "uuid",
  "progress": 65,
  "bytesUploaded": 6500000,
  "totalBytes": 10000000,
  "speed": 1250000 // bytes per second
}
```

#### 3. Batch Upload API (Future)
```javascript
// POST /api/upload/batch
{
  "files": [
    { "type": "media", "file": File },
    { "type": "media", "file": File }
  ],
  "options": { ... }
}
```

---

## File Structure Changes

### Before Migration
```
backend/src/routes/
├── users.js (has upload code)
├── groups.js (has upload code)
├── media.js (has upload code)
├── groupMedia.js (has upload code)
├── messageAttachments.js (has upload code)
└── marketplaceListings.js (has upload code)
```

### After Migration
```
backend/src/
├── services/
│   └── upload/
│       ├── index.js
│       ├── UploadService.js
│       ├── middlewares/
│       │   ├── imageUpload.js
│       │   ├── fileUpload.js
│       │   ├── avatarUpload.js
│       │   └── marketplaceUpload.js
│       ├── processors/
│       │   ├── imageProcessor.js
│       │   ├── thumbnailGenerator.js
│       │   └── watermarkProcessor.js
│       ├── validators/
│       │   ├── fileValidator.js
│       │   └── imageValidator.js
│       ├── storage/
│       │   ├── StorageProvider.js
│       │   ├── LocalStorageProvider.js
│       │   ├── S3StorageProvider.js
│       │   └── CloudinaryProvider.js
│       ├── errors/
│       │   └── UploadError.js
│       └── config/
│           └── uploadTypes.js
└── routes/
    ├── users.js (imports uploadService)
    ├── groups.js (imports uploadService)
    ├── media.js (imports uploadService)
    ├── groupMedia.js (imports uploadService)
    ├── messageAttachments.js (imports uploadService)
    └── marketplaceListings.js (imports uploadService)
```

### Upload Directory Structure

**Before (Inconsistent):**
```
uploads/
├── images/
├── media/
├── users/avatars/
├── groups/avatars/
├── groups/banners/
├── group-media/
├── message-attachments/
└── marketplace/
```

**After (Standardized):**
```
uploads/
├── users/
│   └── avatars/
├── groups/
│   ├── avatars/
│   ├── banners/
│   └── posts/
│       └── media/
├── posts/
│   └── media/
├── comments/
│   └── media/
├── messages/
│   └── attachments/
└── marketplace/
    └── images/
```

---

## Testing Strategy

### Unit Tests

#### 1. UploadService Tests
```javascript
describe('UploadService', () => {
  describe('createUploader', () => {
    it('should create multer instance with correct config', () => {
      const uploader = uploadService.createUploader({
        uploadType: 'avatar',
        maxFileSize: 5 * 1024 * 1024
      });
      expect(uploader).toBeDefined();
    });

    it('should reject invalid file types', async () => {
      const uploader = uploadService.createUploader({
        allowedTypes: ['image/jpeg']
      });
      // Test with invalid type
    });

    it('should reject files exceeding size limit', async () => {
      // Test file size validation
    });
  });

  describe('processFiles', () => {
    it('should optimize images', async () => {
      const file = createMockFile({ mimetype: 'image/jpeg', size: 2000000 });
      const [processed] = await uploadService.processFiles([file], { optimize: true });
      expect(processed.size).toBeLessThan(file.size);
    });

    it('should generate thumbnails', async () => {
      const file = createMockFile({ mimetype: 'image/jpeg' });
      const [processed] = await uploadService.processFiles([file], { generateThumbnail: true });
      expect(processed.thumbnail).toBeDefined();
    });

    it('should resize images', async () => {
      const file = createMockFile({ mimetype: 'image/jpeg' });
      const [processed] = await uploadService.processFiles([file], {
        resize: { width: 800, height: 800 }
      });
      expect(processed.metadata.width).toBeLessThanOrEqual(800);
    });

    it('should cleanup files on error', async () => {
      const file = createMockFile();
      try {
        await uploadService.processFiles([file], { invalidOption: true });
      } catch (error) {
        // Verify file was cleaned up
      }
    });
  });

  describe('cleanupFiles', () => {
    it('should delete files from storage', async () => {
      const filePath = '/uploads/test/file.jpg';
      await uploadService.cleanupFiles([filePath]);
      const exists = await storageProvider.fileExists(filePath);
      expect(exists).toBe(false);
    });
  });
});
```

#### 2. ImageProcessor Tests
```javascript
describe('ImageProcessor', () => {
  it('should optimize JPEG images', async () => {
    const file = createMockImageFile('jpeg');
    const optimized = await imageProcessor.optimize(file, { quality: 80 });
    expect(optimized.size).toBeLessThan(file.size);
  });

  it('should resize images while maintaining aspect ratio', async () => {
    const file = createMockImageFile('jpeg', { width: 2000, height: 1500 });
    const resized = await imageProcessor.resize(file, { width: 800, fit: 'inside' });
    const metadata = await imageProcessor.getMetadata(resized);
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(600);
  });

  it('should generate square thumbnails', async () => {
    const file = createMockImageFile('jpeg');
    const thumbPath = await imageProcessor.generateThumbnail(file, 300);
    expect(thumbPath).toMatch(/_thumb\./);
  });

  it('should add watermark to images', async () => {
    const file = createMockImageFile('jpeg');
    const watermarked = await imageProcessor.addWatermark(file, {
      text: 'Test Watermark',
      position: 'southeast'
    });
    expect(watermarked.path).toBeDefined();
  });
});
```

#### 3. FileValidator Tests
```javascript
describe('FileValidator', () => {
  it('should validate file types', () => {
    const file = { mimetype: 'image/jpeg' };
    const valid = fileValidator.isValidType(file, ['image/jpeg', 'image/png']);
    expect(valid).toBe(true);
  });

  it('should reject invalid file types', () => {
    const file = { mimetype: 'application/exe' };
    const valid = fileValidator.isValidType(file, ['image/jpeg']);
    expect(valid).toBe(false);
  });

  it('should validate file size', () => {
    const file = { size: 3000000 }; // 3MB
    const valid = fileValidator.isValidSize(file, 5 * 1024 * 1024);
    expect(valid).toBe(true);
  });

  it('should sanitize filenames', () => {
    const filename = 'Test File Name!@#$.jpg';
    const sanitized = fileValidator.sanitizeFilename(filename);
    expect(sanitized).toBe('test_file_name_.jpg');
  });
});
```

#### 4. StorageProvider Tests
```javascript
describe('LocalStorageProvider', () => {
  it('should save files locally', async () => {
    const file = createMockFile();
    const path = await storageProvider.saveFile(file, 'test');
    expect(path).toBeDefined();
  });

  it('should delete files', async () => {
    const file = createMockFile();
    const path = await storageProvider.saveFile(file, 'test');
    const deleted = await storageProvider.deleteFile(path);
    expect(deleted).toBe(true);
  });

  it('should generate correct file URLs', () => {
    const filePath = '/path/to/file.jpg';
    const url = storageProvider.getFileUrl(filePath);
    expect(url).toMatch(/^\/uploads\//);
  });

  it('should check if file exists', async () => {
    const file = createMockFile();
    const path = await storageProvider.saveFile(file, 'test');
    const exists = await storageProvider.fileExists(path);
    expect(exists).toBe(true);
  });
});
```

### Integration Tests

#### 1. Route Migration Tests
```javascript
describe('POST /api/users/:id/avatar (migrated)', () => {
  it('should upload avatar successfully', async () => {
    const user = await createTestUser();
    const avatar = createMockImageFile('jpeg');

    const response = await request(app)
      .post(`/api/users/${user.id}/avatar`)
      .attach('avatar', avatar)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.avatar_url).toMatch(/^\/uploads\/users\/avatars\//);
  });

  it('should reject invalid file types', async () => {
    const user = await createTestUser();
    const invalidFile = createMockFile({ mimetype: 'application/exe' });

    const response = await request(app)
      .post(`/api/users/${user.id}/avatar`)
      .attach('avatar', invalidFile)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.type).toBe('INVALID_FILE_TYPE');
  });

  it('should reject files exceeding size limit', async () => {
    const user = await createTestUser();
    const largeFile = createMockFile({ size: 10 * 1024 * 1024 }); // 10MB

    const response = await request(app)
      .post(`/api/users/${user.id}/avatar`)
      .attach('avatar', largeFile)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(413);
  });
});
```

#### 2. File Processing Tests
```javascript
describe('File Processing Integration', () => {
  it('should optimize and resize uploaded image', async () => {
    const user = await createTestUser();
    const image = createLargeImageFile(); // 5MB, 3000x2000

    const response = await request(app)
      .post(`/api/users/${user.id}/avatar`)
      .attach('avatar', image)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(200);

    // Verify file was optimized (smaller size)
    const savedFile = await getFileStats(response.body.data.avatar_url);
    expect(savedFile.size).toBeLessThan(image.size);

    // Verify file was resized
    const metadata = await getImageMetadata(response.body.data.avatar_url);
    expect(metadata.width).toBeLessThanOrEqual(800);
    expect(metadata.height).toBeLessThanOrEqual(800);
  });
});
```

### Performance Tests

```javascript
describe('Upload Performance', () => {
  it('should handle 100 concurrent uploads', async () => {
    const users = await createTestUsers(100);
    const uploads = users.map(user =>
      request(app)
        .post(`/api/users/${user.id}/avatar`)
        .attach('avatar', createMockImageFile())
        .set('Authorization', `Bearer ${user.token}`)
    );

    const startTime = Date.now();
    const responses = await Promise.all(uploads);
    const duration = Date.now() - startTime;

    expect(responses.every(r => r.status === 200)).toBe(true);
    expect(duration).toBeLessThan(10000); // Should complete within 10s
  });

  it('should optimize images efficiently', async () => {
    const largeImage = createLargeImageFile(); // 10MB

    const startTime = Date.now();
    await imageProcessor.optimize(largeImage, { quality: 80 });
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(2000); // Should complete within 2s
  });
});
```

### Security Tests

```javascript
describe('Upload Security', () => {
  it('should reject path traversal attempts', async () => {
    const user = await createTestUser();
    const maliciousFile = createMockFile({
      originalname: '../../../etc/passwd'
    });

    const response = await request(app)
      .post('/api/media/upload')
      .attach('files', maliciousFile)
      .set('Authorization', `Bearer ${user.token}`)
      .field('post_id', 1);

    expect(response.status).toBe(400);
  });

  it('should reject executable files', async () => {
    const user = await createTestUser();
    const execFile = createMockFile({
      mimetype: 'application/x-executable',
      originalname: 'malware.exe'
    });

    const response = await request(app)
      .post('/api/media/upload')
      .attach('files', execFile)
      .set('Authorization', `Bearer ${user.token}`)
      .field('post_id', 1);

    expect(response.status).toBe(400);
    expect(response.body.error.type).toBe('INVALID_FILE_TYPE');
  });

  it('should validate file extension matches MIME type', async () => {
    const user = await createTestUser();
    const spoofedFile = createMockFile({
      mimetype: 'image/jpeg',
      originalname: 'malware.exe' // Extension doesn't match MIME
    });

    const response = await request(app)
      .post('/api/media/upload')
      .attach('files', spoofedFile)
      .set('Authorization', `Bearer ${user.token}`)
      .field('post_id', 1);

    expect(response.status).toBe(400);
  });
});
```

---

## Rollback Plan

### Indicators for Rollback

Trigger rollback if:
- ❌ More than 5% upload failure rate
- ❌ Critical bug affecting all uploads
- ❌ Performance degradation >30%
- ❌ Security vulnerability discovered
- ❌ Data loss or corruption

### Rollback Steps

#### 1. Immediate Rollback (< 5 minutes)
```bash
# Revert to previous deployment
git revert <commit-hash>
git push origin main

# Deploy previous version
npm run deploy:production

# Monitor metrics
npm run monitor:uploads
```

#### 2. Partial Rollback (Route-by-Route)
If only specific routes are affected:
```bash
# Revert specific route to old implementation
git checkout <previous-commit> -- backend/src/routes/users.js
git commit -m "Rollback users.js to previous upload implementation"
git push origin main
```

#### 3. Data Integrity Check
```sql
-- Verify all uploaded files have database records
SELECT COUNT(*) FROM media WHERE file_url IS NULL;
SELECT COUNT(*) FROM marketplace_media WHERE file_url IS NULL;

-- Verify no orphaned files
-- (Run cleanup script to identify files without DB records)
```

#### 4. Communication
- [ ] Notify team of rollback
- [ ] Document root cause
- [ ] Create incident report
- [ ] Schedule post-mortem

### Preventing Need for Rollback

- ✅ Thorough testing in staging
- ✅ Gradual rollout (start with 10% traffic)
- ✅ Feature flags for new upload service
- ✅ Comprehensive monitoring and alerting
- ✅ Automated tests run on every commit

---

## Future Enhancements

### Phase 4: Advanced Features (After Initial Migration)

#### 1. CDN Integration
**Goal:** Switch from local storage to CDN for better performance

**Providers to Support:**
- AWS S3 + CloudFront
- Cloudinary
- Google Cloud Storage
- Azure Blob Storage

**Benefits:**
- Faster global delivery
- Reduced server load
- Automatic image optimization
- Better scalability

**Implementation:**
```javascript
// Switch storage provider via environment variable
// No code changes needed in routes!
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=my-bucket
AWS_CDN_URL=https://cdn.example.com
```

#### 2. Image Transformations API
**Goal:** On-demand image transformations

**Features:**
```javascript
// Request specific size/format via URL parameters
GET /uploads/images/file.jpg?width=300&height=300&format=webp&quality=85
GET /uploads/images/file.jpg?blur=5&brightness=1.2
GET /uploads/images/file.jpg?crop=face&width=200&height=200
```

**Benefits:**
- Responsive images (serve different sizes for different devices)
- Format optimization (serve WebP to supported browsers)
- Bandwidth savings

#### 3. Upload Progress Tracking
**Goal:** Show real-time upload progress to users

**Implementation:**
- WebSocket or Server-Sent Events
- Chunked uploads for large files
- Resume capability for interrupted uploads

**User Experience:**
```javascript
// Frontend receives real-time updates
uploadService.on('progress', (data) => {
  console.log(`${data.progress}% uploaded`);
  console.log(`Speed: ${data.speed / 1024} KB/s`);
  console.log(`ETA: ${data.eta} seconds`);
});
```

#### 4. Virus Scanning
**Goal:** Scan uploaded files for malware

**Integration:**
- ClamAV for open-source solution
- AWS S3 + Macie for cloud solution
- VirusTotal API

**Flow:**
```
Upload → Scan → Quarantine if infected → Notify user/admin
```

#### 5. Automated Image Moderation
**Goal:** Detect inappropriate content

**Integration:**
- AWS Rekognition
- Google Cloud Vision API
- Microsoft Azure Content Moderator

**Use Cases:**
- Detect nudity/violence
- OCR for text extraction
- Face detection for auto-cropping

#### 6. Video Processing
**Goal:** Handle video uploads efficiently

**Features:**
- Video transcoding (convert to web-friendly formats)
- Thumbnail extraction from videos
- Video compression
- Streaming support (HLS/DASH)

**Tools:**
- FFmpeg for processing
- AWS MediaConvert for cloud processing

#### 7. Direct Upload to CDN
**Goal:** Upload directly from browser to CDN

**Benefits:**
- Reduce server load
- Faster uploads (no intermediate hop)
- Better scalability

**Flow:**
```
1. Frontend requests signed upload URL from backend
2. Backend generates presigned S3 URL
3. Frontend uploads directly to S3
4. S3 triggers webhook to backend on completion
5. Backend creates database record
```

#### 8. Smart Compression
**Goal:** Intelligently compress images based on content

**Features:**
- Face detection → higher quality for faces
- Text detection → lossless compression for screenshots
- Nature photos → aggressive compression
- Product photos → medium compression

#### 9. Upload Analytics
**Goal:** Track upload metrics and performance

**Metrics:**
- Upload success/failure rates
- Average upload time
- File size distribution
- Most common file types
- Storage usage by type
- Bandwidth consumption

**Dashboard:**
```javascript
{
  "today": {
    "total_uploads": 15234,
    "success_rate": 99.2,
    "avg_upload_time_ms": 342,
    "total_storage_mb": 45678,
    "bandwidth_gb": 123.4
  },
  "by_type": {
    "avatar": { "count": 234, "total_mb": 45 },
    "media": { "count": 12345, "total_mb": 34567 },
    "marketplace": { "count": 2655, "total_mb": 11066 }
  }
}
```

#### 10. Backup & Disaster Recovery
**Goal:** Protect against data loss

**Strategy:**
- Automatic backups to secondary storage
- Geo-redundant storage
- Point-in-time recovery
- Automated integrity checks

---

## Success Metrics

### Code Quality Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Lines of upload code | ~1,120 | ~400 | 60% reduction |
| Duplicate code blocks | 7 | 0 | 0 |
| Test coverage | ~30% | ~85% | >80% |
| Cyclomatic complexity | High | Low | <10 per function |

### Performance Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Upload success rate | >99% | Monitor error logs |
| Image optimization time | <2s for 10MB | Performance tests |
| Concurrent upload support | 100+ | Load testing |
| Memory usage | <500MB | Server monitoring |

### Developer Experience Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to add new upload type | <30 min | Developer survey |
| CDN migration time | <8 hours | Time tracking |
| Bug fix time | -50% | Issue tracker |
| Onboarding time for new devs | <2 hours | Training feedback |

### Business Metrics

| Metric | Impact | Measurement |
|--------|--------|-------------|
| Storage costs | Optimize with compression | Monthly billing |
| Bandwidth costs | Reduce with CDN | Monthly billing |
| User upload failures | <1% failure rate | Analytics |
| Support tickets | -30% upload issues | Support system |

---

## Risk Assessment

### High Risks

#### 1. Data Loss During Migration
**Probability:** Low
**Impact:** Critical
**Mitigation:**
- Full database backup before migration
- Test migration in staging first
- Keep old code in place until verified
- Gradual rollout with monitoring

#### 2. Breaking Existing Uploads
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Comprehensive integration tests
- Manual testing of all upload types
- Feature flag to toggle between old/new
- Quick rollback plan

#### 3. Performance Regression
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Performance benchmarks before/after
- Load testing with realistic scenarios
- Monitor server metrics during rollout

### Medium Risks

#### 4. CDN Migration Complications
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Start with read-only CDN testing
- Implement storage abstraction from day 1
- Test with small subset of files first

#### 5. Third-Party Dependencies
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Lock dependency versions
- Regular security updates
- Fallback to local storage if CDN fails

### Low Risks

#### 6. Developer Learning Curve
**Probability:** High
**Impact:** Low
**Mitigation:**
- Comprehensive documentation
- Code examples for common scenarios
- Developer training sessions

---

## Conclusion

### Summary

This centralized upload service will:

1. ✅ **Reduce code duplication** by 80%+
2. ✅ **Standardize file handling** across all features
3. ✅ **Enable CDN migration** with single config change
4. ✅ **Improve maintainability** with isolated service logic
5. ✅ **Enhance security** with centralized validation
6. ✅ **Boost performance** with optimized processing
7. ✅ **Simplify testing** with mockable service layer

### Next Steps

1. **Review this plan** with team and stakeholders
2. **Get approval** to proceed with implementation
3. **Create migration branch** and set up project structure
4. **Implement Phase 1** (upload service foundation)
5. **Begin gradual migration** of routes (Phase 2)
6. **Test thoroughly** and monitor metrics
7. **Document learnings** and update plan as needed

### Estimated Timeline

- **Phase 1 (Foundation):** 3-4 days
- **Phase 2 (Migration):** 3-4 days
- **Phase 3 (Testing & Polish):** 2-3 days
- **Total:** **8-11 days**

### Required Resources

- **Developers:** 1-2 developers
- **QA:** 1 QA engineer for testing
- **DevOps:** Support for deployment
- **Budget:** No additional costs (uses existing infrastructure)

---

**Document Version:** 1.0
**Last Updated:** November 6, 2025
**Status:** ✅ Planning Complete - Awaiting Approval
**Next Review:** After stakeholder feedback
