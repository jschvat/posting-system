const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { config } = require('../../../config/app.config');
const MarketplaceListing = require('../models/MarketplaceListing');
const MarketplaceSaved = require('../models/MarketplaceSaved');
const db = require('../config/database');

// Multer configuration for marketplace image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/marketplace');
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

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // Max 10 images per listing
  }
});

/**
 * POST /api/marketplace/listings/:id/images
 * Upload images for a marketplace listing
 */
router.post('/:id/images', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);

    // Verify listing exists and user owns it
    const listingResult = await db.query(
      'SELECT * FROM marketplace_listings WHERE id = $1 AND user_id = $2',
      [listingId, req.user.id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found or you do not have permission'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images were uploaded'
      });
    }

    // Get current image count for this listing
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM marketplace_media WHERE listing_id = $1',
      [listingId]
    );
    let displayOrder = parseInt(countResult.rows[0].count);

    // Process uploaded images
    const uploadedImages = [];

    for (const file of req.files) {
      try {
        // Get image metadata
        const metadata = await sharp(file.path).metadata();

        // Generate thumbnail
        const thumbnailFilename = `thumb_${path.basename(file.path)}`;
        const thumbnailPath = path.join(path.dirname(file.path), thumbnailFilename);

        await sharp(file.path)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);

        // Store relative paths
        const fileUrl = `/uploads/marketplace/${path.basename(file.path)}`;
        const thumbnailUrl = `/uploads/marketplace/${thumbnailFilename}`;

        // Check if this should be the primary image (first image uploaded)
        const isPrimary = displayOrder === 0;

        // Insert into database
        const result = await db.query(
          `INSERT INTO marketplace_media
           (listing_id, file_url, file_type, file_size, display_order, is_primary, width, height, thumbnail_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            listingId,
            fileUrl,
            file.mimetype,
            file.size,
            displayOrder,
            isPrimary,
            metadata.width,
            metadata.height,
            thumbnailUrl
          ]
        );

        uploadedImages.push(result.rows[0]);
        displayOrder++;

      } catch (error) {
        console.error('Error processing image:', error);
        // Clean up file on error
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Failed to clean up file:', file.path, unlinkError);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: uploadedImages,
      message: `${uploadedImages.length} image(s) uploaded successfully`
    });

  } catch (error) {
    console.error('Error uploading images:', error);
    // Clean up any uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Failed to clean up file:', file.path, unlinkError);
        }
      }
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload images'
    });
  }
});

/**
 * DELETE /api/marketplace/listings/:listingId/images/:imageId
 * Delete a specific image from a listing
 */
router.delete('/:listingId/images/:imageId', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    const imageId = parseInt(req.params.imageId);

    // Verify listing exists and user owns it
    const listingResult = await db.query(
      'SELECT * FROM marketplace_listings WHERE id = $1 AND user_id = $2',
      [listingId, req.user.id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found or you do not have permission'
      });
    }

    // Get the image record
    const imageResult = await db.query(
      'SELECT * FROM marketplace_media WHERE id = $1 AND listing_id = $2',
      [imageId, listingId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    const image = imageResult.rows[0];

    // Delete physical files
    const filePath = path.join(__dirname, '../../..', image.file_url);
    const thumbnailPath = path.join(__dirname, '../../..', image.thumbnail_url);

    try {
      await fs.unlink(filePath);
      await fs.unlink(thumbnailPath);
    } catch (fileError) {
      console.error('Failed to delete files:', fileError);
    }

    // Delete from database
    await db.query('DELETE FROM marketplace_media WHERE id = $1', [imageId]);

    // If this was the primary image, make another image primary
    if (image.is_primary) {
      await db.query(
        `UPDATE marketplace_media
         SET is_primary = TRUE
         WHERE listing_id = $1
         AND id = (SELECT id FROM marketplace_media WHERE listing_id = $1 ORDER BY display_order LIMIT 1)`,
        [listingId]
      );
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image'
    });
  }
});

/**
 * PUT /api/marketplace/listings/:listingId/images/:imageId/primary
 * Set an image as the primary image
 */
router.put('/:listingId/images/:imageId/primary', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    const imageId = parseInt(req.params.imageId);

    // Verify listing exists and user owns it
    const listingResult = await db.query(
      'SELECT * FROM marketplace_listings WHERE id = $1 AND user_id = $2',
      [listingId, req.user.id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found or you do not have permission'
      });
    }

    // Verify image exists for this listing
    const imageResult = await db.query(
      'SELECT * FROM marketplace_media WHERE id = $1 AND listing_id = $2',
      [imageId, listingId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Clear all primary flags for this listing
    await db.query(
      'UPDATE marketplace_media SET is_primary = FALSE WHERE listing_id = $1',
      [listingId]
    );

    // Set this image as primary
    await db.query(
      'UPDATE marketplace_media SET is_primary = TRUE WHERE id = $1',
      [imageId]
    );

    res.json({
      success: true,
      message: 'Primary image updated successfully'
    });

  } catch (error) {
    console.error('Error setting primary image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set primary image'
    });
  }
});

/**
 * PUT /api/marketplace/listings/:listingId/images/reorder
 * Reorder images for a listing
 */
router.put('/:listingId/images/reorder', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    const { imageOrder } = req.body; // Array of image IDs in desired order

    if (!Array.isArray(imageOrder)) {
      return res.status(400).json({
        success: false,
        error: 'imageOrder must be an array'
      });
    }

    // Verify listing exists and user owns it
    const listingResult = await db.query(
      'SELECT * FROM marketplace_listings WHERE id = $1 AND user_id = $2',
      [listingId, req.user.id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found or you do not have permission'
      });
    }

    // Update display_order for each image
    for (let i = 0; i < imageOrder.length; i++) {
      await db.query(
        'UPDATE marketplace_media SET display_order = $1 WHERE id = $2 AND listing_id = $3',
        [i, imageOrder[i], listingId]
      );
    }

    res.json({
      success: true,
      message: 'Image order updated successfully'
    });

  } catch (error) {
    console.error('Error reordering images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder images'
    });
  }
});

/**
 * POST /api/marketplace/listings
 * Create a new listing
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title, description, category_id, listing_type = 'sale',
      price, original_price, quantity = 1, allow_offers = false,
      min_offer_price, condition, location_latitude, location_longitude,
      location_city, location_state, location_zip, location_country,
      pickup_address, shipping_available = false, shipping_cost,
      shipping_radius_miles, local_pickup_only = true, status = 'draft'
    } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    if (!location_latitude || !location_longitude || !location_city || !location_state) {
      return res.status(400).json({
        success: false,
        error: 'Location information is required'
      });
    }

    if (listing_type === 'sale' && !price) {
      return res.status(400).json({
        success: false,
        error: 'Price is required for sale listings'
      });
    }

    const listing = await MarketplaceListing.create({
      user_id: req.user.id,
      title,
      description,
      category_id,
      listing_type,
      price,
      original_price,
      quantity,
      allow_offers,
      min_offer_price,
      condition,
      location_latitude,
      location_longitude,
      location_city,
      location_state,
      location_zip,
      location_country,
      pickup_address,
      shipping_available,
      shipping_cost,
      shipping_radius_miles,
      local_pickup_only,
      status
    });

    res.status(201).json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create listing'
    });
  }
});

/**
 * GET /api/marketplace/listings
 * Search/browse listings with filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      query,
      category_id,
      listing_type,
      min_price,
      max_price,
      condition,
      latitude,
      longitude,
      radius,
      status = 'active',
      sort_by = 'created_at',
      sort_order = 'DESC',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await MarketplaceListing.search({
      query,
      category_id: category_id ? parseInt(category_id) : undefined,
      listing_type,
      min_price: min_price ? parseFloat(min_price) : undefined,
      max_price: max_price ? parseFloat(max_price) : undefined,
      condition,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radius: radius ? parseInt(radius) : undefined,
      status,
      sort_by,
      sort_order,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: result.listings,
      pagination: {
        page: result.page,
        pages: result.pages,
        total: result.total,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('Error searching listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search listings'
    });
  }
});

/**
 * GET /api/marketplace/listings/nearby
 * Get nearby listings based on location
 */
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 25, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const listings = await MarketplaceListing.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    console.error('Error finding nearby listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearby listings'
    });
  }
});

/**
 * GET /api/marketplace/listings/my-listings
 * Get current user's listings
 */
router.get('/my-listings', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const listings = await MarketplaceListing.findByUser(req.user.id, {
      status,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings'
    });
  }
});

/**
 * GET /api/marketplace/listings/:id
 * Get listing by ID with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const requestingUserId = req.user ? req.user.id : null;
    const listing = await MarketplaceListing.findById(
      parseInt(req.params.id),
      requestingUserId
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listing'
    });
  }
});

/**
 * PUT /api/marketplace/listings/:id
 * Update listing (owner only)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const updateData = req.body;

    const listing = await MarketplaceListing.update(
      listingId,
      req.user.id,
      updateData
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found or you do not have permission to update it'
      });
    }

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update listing'
    });
  }
});

/**
 * DELETE /api/marketplace/listings/:id
 * Delete listing (owner only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const deleted = await MarketplaceListing.delete(listingId, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found or you do not have permission to delete it'
      });
    }

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete listing'
    });
  }
});

/**
 * POST /api/marketplace/listings/:id/save
 * Save/favorite a listing
 */
router.post('/:id/save', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const { folder, notes } = req.body;

    const saved = await MarketplaceSaved.save(
      req.user.id,
      listingId,
      folder,
      notes
    );

    res.json({
      success: true,
      data: saved
    });
  } catch (error) {
    console.error('Error saving listing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save listing'
    });
  }
});

/**
 * DELETE /api/marketplace/listings/:id/save
 * Unsave a listing
 */
router.delete('/:id/save', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const unsaved = await MarketplaceSaved.unsave(req.user.id, listingId);

    if (!unsaved) {
      return res.status(404).json({
        success: false,
        error: 'Saved listing not found'
      });
    }

    res.json({
      success: true,
      message: 'Listing unsaved successfully'
    });
  } catch (error) {
    console.error('Error unsaving listing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsave listing'
    });
  }
});

module.exports = router;
