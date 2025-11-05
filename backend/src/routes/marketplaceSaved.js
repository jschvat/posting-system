const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const MarketplaceSaved = require('../models/MarketplaceSaved');

/**
 * GET /api/marketplace/saved
 * Get user's saved listings
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { folder, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const savedListings = await MarketplaceSaved.findByUser(req.user.id, {
      folder: folder === 'null' ? null : folder,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: savedListings
    });
  } catch (error) {
    console.error('Error fetching saved listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved listings'
    });
  }
});

/**
 * GET /api/marketplace/saved/folders
 * Get user's folder list
 */
router.get('/folders', authenticate, async (req, res) => {
  try {
    const folders = await MarketplaceSaved.getFolders(req.user.id);

    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch folders'
    });
  }
});

/**
 * PUT /api/marketplace/saved/:listingId/folder
 * Update folder for saved listing
 */
router.put('/:listingId/folder', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    const { folder } = req.body;

    const updated = await MarketplaceSaved.updateFolder(
      req.user.id,
      listingId,
      folder
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Saved listing not found'
      });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update folder'
    });
  }
});

/**
 * PUT /api/marketplace/saved/:listingId/notes
 * Update notes for saved listing
 */
router.put('/:listingId/notes', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    const { notes } = req.body;

    const updated = await MarketplaceSaved.updateNotes(
      req.user.id,
      listingId,
      notes
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Saved listing not found'
      });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notes'
    });
  }
});

/**
 * PUT /api/marketplace/saved/:listingId/price-alert
 * Set price alert for saved listing
 */
router.put('/:listingId/price-alert', authenticate, async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId);
    const { enabled, threshold } = req.body;

    if (enabled && !threshold) {
      return res.status(400).json({
        success: false,
        error: 'Threshold is required when enabling price alert'
      });
    }

    const updated = await MarketplaceSaved.setPriceAlert(
      req.user.id,
      listingId,
      enabled,
      threshold
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Saved listing not found'
      });
    }

    res.json({
      success: true,
      data: updated,
      message: enabled ? 'Price alert enabled' : 'Price alert disabled'
    });
  } catch (error) {
    console.error('Error setting price alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set price alert'
    });
  }
});

module.exports = router;
