# CDN/Object Storage Migration Plan

**Date Created:** 2025-11-06
**Status:** Planning Phase - Not Yet Implemented

---

## Executive Summary

This document outlines a comprehensive plan to migrate all file uploads (images, media, attachments) from local disk storage to CDN/object storage (AWS S3, Cloudflare R2, or similar). This migration will improve scalability, performance, and deployment flexibility.

## Current Upload Architecture Analysis

### Upload Locations Identified:

**1. Post/Comment Media** ([media.js:47-91](backend/src/routes/media.js#L47-L91))
- **Path:** `/uploads/images/` or `/uploads/media/`
- **Storage:** Multer diskStorage
- **Processing:** Sharp for optimization and thumbnails
- **Database:** `media` table with `file_path` and `file_url` columns

**2. User Avatars** ([users.js:24-57](backend/src/routes/users.js#L24-L57))
- **Path:** `/uploads/users/avatars/`
- **Storage:** Multer diskStorage
- **Processing:** Sharp for resizing
- **Database:** `users.avatar_url` column

**3. Message Attachments** ([messageAttachments.js:10-63](backend/src/routes/messageAttachments.js#L10-L63))
- **Path:** `/uploads/messages/`
- **Max Size:** 10MB
- **Types:** Documents, images, audio, video
- **Database:** `messages` table with `attachment_url` column

**4. Group Media** ([groupMedia.js:23-70](backend/src/routes/groupMedia.js#L23-L70))
- **Path:** `/public/media/groups/{slug}/`
- **Storage:** Multer diskStorage
- **Database:** `group_post_media` and `group_comment_media` tables

**5. Marketplace Listings** (Migration 022)
- **Path:** `/uploads/marketplace/images/` and `/uploads/marketplace/thumbs/`
- **Database:** `marketplace_media` table with `file_url` and `thumbnail_url`

**6. Group Avatars**
- **Path:** `/uploads/groups/`
- **Database:** `groups.avatar_url` column

### Database Tables with File URLs:

```
users.avatar_url
groups.avatar_url
media.file_url, media.file_path
messages.attachment_url
marketplace_media.file_url, marketplace_media.thumbnail_url
group_post_media.file_url
group_comment_media.file_url
```

---

## Migration Plan

### Phase 1: Infrastructure Setup

#### 1.1 Choose Object Storage Provider

**Options:**
- **AWS S3** - Industry standard, mature ecosystem
- **Cloudflare R2** - S3-compatible, zero egress fees
- **DigitalOcean Spaces** - Simple, S3-compatible
- **Backblaze B2** - Cost-effective
- **Wasabi** - Fast, affordable

**Recommendation:** Cloudflare R2 or AWS S3
- R2: Better pricing for high-traffic apps (no egress)
- S3: More mature tooling and integrations

#### 1.2 Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
npm install multer-s3  # Optional: Direct S3 upload
```

#### 1.3 Environment Variables

Add to `.env`:
```env
# Object Storage Configuration
STORAGE_PROVIDER=s3  # or 'r2', 'spaces', etc.
STORAGE_BUCKET=your-bucket-name
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=your-access-key
STORAGE_SECRET_ACCESS_KEY=your-secret-key
STORAGE_ENDPOINT=https://account-id.r2.cloudflarestorage.com  # For R2/Spaces
STORAGE_PUBLIC_URL=https://cdn.yoursite.com  # CDN domain
STORAGE_USE_CDN=true
```

### Phase 2: Code Changes

#### 2.1 Create Storage Service Layer

**New File:** `backend/src/services/storageService.js`

```javascript
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class StorageService {
  constructor() {
    this.client = new S3Client({
      region: process.env.STORAGE_REGION,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY
      },
      endpoint: process.env.STORAGE_ENDPOINT || undefined
    });
    this.bucket = process.env.STORAGE_BUCKET;
    this.cdnUrl = process.env.STORAGE_PUBLIC_URL;
    this.useCdn = process.env.STORAGE_USE_CDN === 'true';
  }

  /**
   * Upload file to object storage
   * @param {Buffer} buffer - File buffer
   * @param {string} folder - Folder path (e.g., 'marketplace/images')
   * @param {string} filename - Filename
   * @param {string} contentType - MIME type
   * @returns {Promise<string>} - CDN URL
   */
  async uploadFile(buffer, folder, filename, contentType) {
    const key = `${folder}/${filename}`;

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read'  // Or use bucket policy
      }
    });

    await upload.done();

    return this.getPublicUrl(key);
  }

  /**
   * Upload image with automatic optimization and thumbnail
   * @returns {Promise<{url: string, thumbnailUrl: string, width: number, height: number}>}
   */
  async uploadImage(buffer, folder, options = {}) {
    const {
      quality = 80,
      createThumbnail = true,
      thumbnailSize = 300,
      format = 'jpeg'
    } = options;

    const filename = `${uuidv4()}.${format}`;

    // Get metadata
    const metadata = await sharp(buffer).metadata();

    // Optimize main image
    const optimizedBuffer = await sharp(buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      [format]({ quality })
      .toBuffer();

    // Upload main image
    const url = await this.uploadFile(
      optimizedBuffer,
      folder,
      filename,
      `image/${format}`
    );

    let thumbnailUrl = null;

    // Create and upload thumbnail
    if (createThumbnail) {
      const thumbBuffer = await sharp(buffer)
        .resize(thumbnailSize, thumbnailSize, { fit: 'inside' })
        [format]({ quality })
        .toBuffer();

      thumbnailUrl = await this.uploadFile(
        thumbBuffer,
        `${folder}/thumbs`,
        filename,
        `image/${format}`
      );
    }

    return {
      url,
      thumbnailUrl,
      width: metadata.width,
      height: metadata.height
    };
  }

  /**
   * Delete file from object storage
   */
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    await this.client.send(command);
  }

  /**
   * Get public URL for a key
   */
  getPublicUrl(key) {
    if (this.useCdn && this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }

    // Fallback to direct S3 URL
    if (process.env.STORAGE_ENDPOINT) {
      return `${process.env.STORAGE_ENDPOINT}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${process.env.STORAGE_REGION}.amazonaws.com/${key}`;
  }

  /**
   * Extract key from full URL (for deletion)
   */
  extractKeyFromUrl(url) {
    // Handle CDN URLs
    if (url.startsWith(this.cdnUrl)) {
      return url.replace(`${this.cdnUrl}/`, '');
    }

    // Handle direct S3 URLs
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1);  // Remove leading slash
  }
}

module.exports = new StorageService();
```

#### 2.2 Update Configuration

**File:** `config/app.config.js`

Add storage configuration section:
```javascript
storage: {
  provider: process.env.STORAGE_PROVIDER || 'local',  // 'local', 's3', 'r2'
  bucket: process.env.STORAGE_BUCKET || null,
  region: process.env.STORAGE_REGION || 'us-east-1',
  endpoint: process.env.STORAGE_ENDPOINT || null,
  publicUrl: process.env.STORAGE_PUBLIC_URL || null,
  useCdn: process.env.STORAGE_USE_CDN === 'true',

  // Backwards compatibility
  local: {
    uploadDir: process.env.UPLOAD_DIR || '../uploads'
  }
}
```

#### 2.3 Modify Upload Routes

**Changes Required in Each Route:**

**Example: [media.js](backend/src/routes/media.js)**

```javascript
// BEFORE (lines 47-91):
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, config.upload.uploadDir);
    // ... local disk logic
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// AFTER:
const storageService = require('../services/storageService');

// Use memory storage for multer (temporary)
const storage = multer.memoryStorage();

// In upload handler (lines 176-241):
for (const file of req.files) {
  // Process and upload to S3/CDN
  const result = await storageService.uploadImage(
    file.buffer,
    'media/images',
    {
      quality: config.upload.imageQuality,
      createThumbnail: true,
      thumbnailSize: config.upload.thumbnailSize
    }
  );

  // Save CDN URLs to database
  const media = await Media.create({
    post_id: post_id || null,
    comment_id: comment_id || null,
    user_id: parseInt(user_id),
    filename: path.basename(result.url),
    original_name: file.originalname,
    file_path: null,  // No longer needed
    file_url: result.url,  // Full CDN URL
    thumbnail_url: result.thumbnailUrl,  // New column
    file_size: file.size,
    mime_type: file.mimetype,
    alt_text: alt_text || null,
    width: result.width,
    height: result.height
  });
}
```

**Same pattern applies to:**
- `messageAttachments.js` (lines 10-97)
- `users.js` - Avatar uploads (lines 24-57)
- `groupMedia.js` (lines 28-70)
- Marketplace listing uploads (needs new route)

#### 2.4 Update Delete Handlers

**Example: [media.js:526-543](backend/src/routes/media.js#L526-L543)**

```javascript
// BEFORE:
const filePath = path.join(__dirname, '../../../uploads', media.file_path);
await fs.unlink(filePath);

// AFTER:
const storageService = require('../services/storageService');
const key = storageService.extractKeyFromUrl(media.file_url);
await storageService.deleteFile(key);

// Also delete thumbnail
if (media.thumbnail_url) {
  const thumbKey = storageService.extractKeyFromUrl(media.thumbnail_url);
  await storageService.deleteFile(thumbKey);
}
```

#### 2.5 Remove Static File Serving

**File:** `backend/src/server.js` (lines 106-109)

```javascript
// REMOVE these lines (no longer needed):
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/media', express.static(path.join(__dirname, '../public/media')));

// All files now served from CDN
```

### Phase 3: Database Schema Updates

#### 3.1 Add Thumbnail URL Columns

**New Migration:** `backend/src/database/migrations/024_add_cdn_support.sql`

```sql
-- Add thumbnail_url to media table (if not exists)
ALTER TABLE media ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add thumbnail_url to marketplace_media (already exists)
-- No change needed

-- Add thumbnail to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_thumbnail_url TEXT;

-- Optional: Track storage provider
ALTER TABLE media ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'local';
ALTER TABLE marketplace_media ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'local';

-- Create index on file URLs for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_file_url ON media(file_url);
CREATE INDEX IF NOT EXISTS idx_marketplace_media_file_url ON marketplace_media(file_url);
```

#### 3.2 Update Existing URL Pattern (Optional)

If you want to migrate existing local URLs:
```sql
-- Example: Update relative paths to full CDN URLs
-- This would be done AFTER migrating files
UPDATE media
SET file_url = CONCAT('https://cdn.yoursite.com/', file_path)
WHERE file_url LIKE '/uploads/%';
```

### Phase 4: Frontend Changes

#### 4.1 API Service Updates

**File:** `frontend/src/services/marketplaceApi.ts`

```typescript
// REMOVE URL transformation (no longer needed)
// DELETE these functions:
const toFullUrl = (path: string | undefined): string | undefined => {
  // ... DELETE THIS
};

const transformListing = (listing: any): MarketplaceListing => {
  // ... DELETE THIS
};

// In getListings() and getListing():
// BEFORE:
if (data.success && data.data) {
  data.data = data.data.map(transformListing);
}

// AFTER:
// Just use URLs directly from API - they're already full CDN URLs
return data;
```

**Same changes in:**
- `frontend/src/services/api.ts`
- All API service files that handle media URLs

### Phase 5: Migration Script

#### 5.1 Migrate Existing Files

**New File:** `backend/src/scripts/migrate_to_cdn.js`

```javascript
const fs = require('fs').promises;
const path = require('path');
const db = require('../database/db');
const storageService = require('../services/storageService');

async function migrateFiles() {
  console.log('Starting CDN migration...');
  console.log('Storage Provider:', process.env.STORAGE_PROVIDER);
  console.log('Bucket:', process.env.STORAGE_BUCKET);

  let migrated = 0;
  let failed = 0;

  // 1. Migrate media files
  console.log('\n=== Migrating Post/Comment Media ===');
  const mediaFiles = await db.query(`
    SELECT id, file_path, file_url, mime_type
    FROM media
    WHERE file_url LIKE '/uploads/%'
    ORDER BY id
  `);

  for (const media of mediaFiles.rows) {
    try {
      const localPath = path.join(__dirname, '../../../uploads', media.file_path);
      const buffer = await fs.readFile(localPath);

      const result = await storageService.uploadImage(buffer, 'media/images', {
        quality: 80,
        createThumbnail: true
      });

      await db.query(
        `UPDATE media
         SET file_url = $1, thumbnail_url = $2, storage_provider = 'cdn'
         WHERE id = $3`,
        [result.url, result.thumbnailUrl, media.id]
      );

      migrated++;
      console.log(`✓ Migrated media ${media.id} (${migrated}/${mediaFiles.rows.length})`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed to migrate media ${media.id}:`, error.message);
    }
  }

  // 2. Migrate user avatars
  console.log('\n=== Migrating User Avatars ===');
  const avatars = await db.query(`
    SELECT id, avatar_url
    FROM users
    WHERE avatar_url LIKE '/uploads/%'
  `);

  for (const user of avatars.rows) {
    try {
      const localPath = path.join(__dirname, '../../../', user.avatar_url);
      const buffer = await fs.readFile(localPath);

      const result = await storageService.uploadImage(buffer, 'avatars', {
        quality: 90,
        createThumbnail: false
      });

      await db.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [result.url, user.id]
      );

      migrated++;
      console.log(`✓ Migrated avatar for user ${user.id}`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed to migrate avatar for user ${user.id}:`, error.message);
    }
  }

  // 3. Migrate marketplace images
  console.log('\n=== Migrating Marketplace Images ===');
  const marketplaceMedia = await db.query(`
    SELECT id, listing_id, file_url
    FROM marketplace_media
    WHERE file_url LIKE '/uploads/%'
  `);

  for (const media of marketplaceMedia.rows) {
    try {
      const localPath = path.join(__dirname, '../../../', media.file_url);
      const buffer = await fs.readFile(localPath);

      const result = await storageService.uploadImage(buffer, 'marketplace/images', {
        quality: 80,
        createThumbnail: true
      });

      await db.query(
        `UPDATE marketplace_media
         SET file_url = $1, thumbnail_url = $2, storage_provider = 'cdn'
         WHERE id = $3`,
        [result.url, result.thumbnailUrl, media.id]
      );

      migrated++;
      console.log(`✓ Migrated marketplace media ${media.id}`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed to migrate marketplace media ${media.id}:`, error.message);
    }
  }

  // 4. Migrate message attachments
  console.log('\n=== Migrating Message Attachments ===');
  const attachments = await db.query(`
    SELECT id, attachment_url, attachment_type
    FROM messages
    WHERE attachment_url LIKE '/uploads/%'
  `);

  for (const message of attachments.rows) {
    try {
      const localPath = path.join(__dirname, '../../../', message.attachment_url);
      const buffer = await fs.readFile(localPath);

      // Images get thumbnails, other files don't
      const isImage = message.attachment_type?.startsWith('image/');

      if (isImage) {
        const result = await storageService.uploadImage(buffer, 'messages', {
          quality: 80,
          createThumbnail: true
        });

        await db.query(
          `UPDATE messages
           SET attachment_url = $1, attachment_thumbnail_url = $2
           WHERE id = $3`,
          [result.url, result.thumbnailUrl, message.id]
        );
      } else {
        const filename = path.basename(message.attachment_url);
        const url = await storageService.uploadFile(
          buffer,
          'messages',
          filename,
          message.attachment_type
        );

        await db.query(
          'UPDATE messages SET attachment_url = $1 WHERE id = $2',
          [url, message.id]
        );
      }

      migrated++;
      console.log(`✓ Migrated message attachment ${message.id}`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed to migrate message ${message.id}:`, error.message);
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`✓ Successfully migrated: ${migrated} files`);
  console.log(`✗ Failed: ${failed} files`);
  console.log('\nNote: Local files have NOT been deleted. Back them up and delete manually.');
}

// Run migration
migrateFiles()
  .then(() => {
    console.log('\nMigration script finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
```

### Phase 6: Testing & Rollout

#### 6.1 Testing Checklist

- [ ] Upload new media via all endpoints
  - [ ] Post/comment media uploads
  - [ ] User avatar uploads
  - [ ] Message attachments
  - [ ] Group media uploads
  - [ ] Marketplace listing images
- [ ] Verify CDN URLs in database
- [ ] Verify images display in frontend
  - [ ] User feeds
  - [ ] Marketplace listings
  - [ ] Messages
  - [ ] User profiles
- [ ] Test image optimization/thumbnails
- [ ] Test file deletion
  - [ ] Delete post with media
  - [ ] Delete user (avatar cleanup)
  - [ ] Delete marketplace listing
- [ ] Test with large files
- [ ] Test concurrent uploads
- [ ] Performance testing (CDN response times)
- [ ] Verify old local files still work (if using gradual migration)

#### 6.2 Rollout Strategy

**Option A: Big Bang (Recommended for smaller systems)**
1. Schedule maintenance window
2. Run migration script
3. Deploy updated code
4. Test all upload/display functionality
5. Keep local files as backup for 30 days
6. Monitor for issues

**Option B: Gradual Migration**
1. Deploy code with dual support (local + CDN)
2. Configure storage service to check provider
3. Migrate files in batches (e.g., 1000 files/day)
4. Gradually move users to CDN URLs
5. Remove local file support after full migration

---

## Files That Need Changes

### Backend Files (15 files):

1. **NEW:** `backend/src/services/storageService.js` - Storage abstraction layer
2. **MODIFY:** `backend/src/routes/media.js` - Post/comment media uploads
3. **MODIFY:** `backend/src/routes/users.js` - Avatar uploads
4. **MODIFY:** `backend/src/routes/messageAttachments.js` - Message attachments
5. **MODIFY:** `backend/src/routes/groupMedia.js` - Group media
6. **MODIFY:** `backend/src/routes/groups.js` - Group avatars
7. **NEW:** `backend/src/routes/marketplaceMedia.js` - Marketplace uploads (if doesn't exist)
8. **MODIFY:** `backend/src/server.js` - Remove static file serving
9. **MODIFY:** `config/app.config.js` - Add storage config
10. **NEW:** `backend/src/scripts/migrate_to_cdn.js` - Migration script
11. **MODIFY:** `.env` - Add storage credentials
12. **MODIFY:** `package.json` - Add AWS SDK dependencies
13. **NEW:** `backend/src/database/migrations/024_add_cdn_support.sql` - Schema updates
14. **MODIFY:** All model files that reference file_path
15. **MODIFY:** Any delete/cleanup scripts

### Frontend Files (3-5 files):

1. **MODIFY:** `frontend/src/services/marketplaceApi.ts` - Remove URL transformation
2. **MODIFY:** `frontend/src/services/api.ts` - Remove URL helpers (if exists)
3. **MODIFY:** Any other API services that transform URLs
4. **REVIEW:** All components that display images (should work without changes)
5. **REVIEW:** Upload components (should work without changes)

### Database Changes:

1. Add `thumbnail_url` to tables without it
2. Add `storage_provider` column to track source
3. Create indexes on file_url columns
4. Optional: Migrate existing `/uploads/` URLs to CDN URLs

---

## Cost Estimation

### Storage Costs (Cloudflare R2):

- **Storage:** $0.015/GB/month
- **Class A Operations (writes):** $4.50 per million
- **Class B Operations (reads):** $0.36 per million
- **Egress:** **FREE** (R2's main advantage)

**Example for Medium Site:**
- 100GB storage: $1.50/month
- 1M file uploads/month: $4.50
- 10M CDN requests: $3.60
- **Total:** ~$10/month

**Example for Large Site:**
- 500GB storage: $7.50/month
- 5M file uploads/month: $22.50
- 100M CDN requests: $36.00
- **Total:** ~$66/month

### Storage Costs (AWS S3 + CloudFront):

- **S3 Storage:** $0.023/GB/month
- **S3 GET requests:** $0.40 per million
- **S3 PUT requests:** $5.00 per million
- **CloudFront data transfer:** $0.085/GB (first 10TB)
- **CloudFront requests:** $0.0075 per 10,000 requests

**Example for Medium Site:**
- 100GB storage: $2.30/month
- 1M uploads: $5.00
- 10M reads: $4.00
- 500GB CloudFront transfer: $42.50
- 10M CloudFront requests: $7.50
- **Total:** ~$61/month

**Example for Large Site:**
- 500GB storage: $11.50/month
- 5M uploads: $25.00
- 100M reads: $40.00
- 5TB CloudFront transfer: $425.00
- 100M CloudFront requests: $75.00
- **Total:** ~$576/month

### Recommendation:

**Use Cloudflare R2** - Massive savings on egress costs, especially for high-traffic applications. R2 is S3-compatible so migration is easy if needed later.

---

## Implementation Timeline

### Week 1: Setup & Development
- **Day 1-2:** Set up object storage account (R2/S3)
- **Day 2-3:** Implement StorageService class
- **Day 3-4:** Update upload routes
- **Day 4-5:** Update delete handlers
- **Day 5:** Update frontend API services

### Week 2: Testing & Migration
- **Day 1-2:** Test new uploads on dev environment
- **Day 3:** Create and test migration script
- **Day 4:** Run migration on staging environment
- **Day 5:** QA testing

### Week 3: Production Deployment
- **Day 1:** Final staging tests
- **Day 2:** Deploy to production (low-traffic time)
- **Day 3-5:** Monitor, fix issues, verify all functionality

---

## Rollback Plan

In case of issues during migration:

1. **Immediate Rollback:**
   - Revert code deployment
   - Re-enable static file serving
   - Local files still available as fallback

2. **Database Rollback:**
   ```sql
   -- Revert URLs to local paths
   UPDATE media SET file_url = CONCAT('/uploads/', file_path) WHERE storage_provider = 'cdn';
   UPDATE marketplace_media SET file_url = CONCAT('/uploads/', file_path) WHERE storage_provider = 'cdn';
   ```

3. **Keep Local Files:**
   - Don't delete local files for 30 days minimum
   - Create backup before migration
   - Document which files were migrated

---

## Summary

### Total Implementation Effort:

- **Code Changes:** 15-20 files
- **Testing:** 2-3 days
- **Migration:** 1-2 hours (depends on file count)
- **Total Time:** 2-3 weeks (with thorough testing)

### Benefits:

✅ **Scalability** - No server disk limits
✅ **Performance** - CDN edge caching globally
✅ **Reliability** - Geographic redundancy
✅ **Cost** - Cheaper than server storage at scale
✅ **Simplicity** - No server file management
✅ **Deployment** - Stateless servers (Docker/Kubernetes friendly)
✅ **Bandwidth** - Offload traffic from application servers
✅ **Security** - Separate domain for user content

### Risks & Mitigations:

⚠️ **Vendor lock-in**
   → Use S3-compatible API (easy to switch providers)

⚠️ **Migration downtime**
   → Use gradual migration strategy
   → Schedule during low-traffic period

⚠️ **Cost overruns**
   → Set budget alerts
   → Use R2 to eliminate egress costs
   → Monitor usage regularly

⚠️ **Data loss during migration**
   → Keep local files as backup
   → Test migration script thoroughly
   → Migrate in batches with verification

---

## Next Steps

1. **Decision:** Choose storage provider (R2 recommended)
2. **Setup:** Create account and bucket
3. **Development:** Implement StorageService
4. **Testing:** Thorough testing on dev/staging
5. **Migration:** Run migration script
6. **Deployment:** Deploy to production
7. **Monitoring:** Watch for issues, verify functionality
8. **Cleanup:** After 30 days, delete local files

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Status:** Ready for implementation
