const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const MarketplaceOffer = require('../models/MarketplaceOffer');
const MarketplaceListing = require('../models/MarketplaceListing');

/**
 * POST /api/marketplace/offers
 * Make an offer on a listing
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { listing_id, offer_amount, message } = req.body;

    if (!listing_id || !offer_amount) {
      return res.status(400).json({
        success: false,
        error: 'Listing ID and offer amount are required'
      });
    }

    // Get listing to verify it exists and allows offers
    const listing = await MarketplaceListing.findById(listing_id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listing.user_id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot make an offer on your own listing'
      });
    }

    if (!listing.allow_offers) {
      return res.status(400).json({
        success: false,
        error: 'This listing does not accept offers'
      });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'This listing is not active'
      });
    }

    if (listing.min_offer_price && offer_amount < listing.min_offer_price) {
      return res.status(400).json({
        success: false,
        error: `Offer must be at least $${listing.min_offer_price}`
      });
    }

    const offer = await MarketplaceOffer.create({
      listing_id,
      buyer_id: req.user.id,
      seller_id: listing.user_id,
      offer_amount,
      message
    });

    res.status(201).json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create offer'
    });
  }
});

/**
 * GET /api/marketplace/offers/received
 * Get offers received by seller
 */
router.get('/received', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const offers = await MarketplaceOffer.findReceivedOffers(req.user.id, {
      status,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: offers
    });
  } catch (error) {
    console.error('Error fetching received offers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offers'
    });
  }
});

/**
 * GET /api/marketplace/offers/sent
 * Get offers sent by buyer
 */
router.get('/sent', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const offers = await MarketplaceOffer.findSentOffers(req.user.id, {
      status,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: offers
    });
  } catch (error) {
    console.error('Error fetching sent offers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offers'
    });
  }
});

/**
 * GET /api/marketplace/offers/:id
 * Get offer details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const offer = await MarketplaceOffer.findById(parseInt(req.params.id));

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    // Verify user is buyer or seller
    if (offer.buyer_id !== req.user.id && offer.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this offer'
      });
    }

    res.json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offer'
    });
  }
});

/**
 * PUT /api/marketplace/offers/:id/accept
 * Accept an offer (seller only)
 */
router.put('/:id/accept', authenticate, async (req, res) => {
  try {
    const offer = await MarketplaceOffer.accept(
      parseInt(req.params.id),
      req.user.id
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found or cannot be accepted'
      });
    }

    res.json({
      success: true,
      data: offer,
      message: 'Offer accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept offer'
    });
  }
});

/**
 * PUT /api/marketplace/offers/:id/reject
 * Reject an offer (seller only)
 */
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const offer = await MarketplaceOffer.reject(
      parseInt(req.params.id),
      req.user.id
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found or cannot be rejected'
      });
    }

    res.json({
      success: true,
      data: offer,
      message: 'Offer rejected'
    });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject offer'
    });
  }
});

/**
 * PUT /api/marketplace/offers/:id/counter
 * Counter an offer (seller only)
 */
router.put('/:id/counter', authenticate, async (req, res) => {
  try {
    const { counter_amount, counter_message } = req.body;

    if (!counter_amount) {
      return res.status(400).json({
        success: false,
        error: 'Counter amount is required'
      });
    }

    const offer = await MarketplaceOffer.counter(
      parseInt(req.params.id),
      req.user.id,
      counter_amount,
      counter_message
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found or cannot be countered'
      });
    }

    res.json({
      success: true,
      data: offer,
      message: 'Counter offer sent'
    });
  } catch (error) {
    console.error('Error countering offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to counter offer'
    });
  }
});

/**
 * PUT /api/marketplace/offers/:id/accept-counter
 * Accept counter offer (buyer only)
 */
router.put('/:id/accept-counter', authenticate, async (req, res) => {
  try {
    const offer = await MarketplaceOffer.acceptCounter(
      parseInt(req.params.id),
      req.user.id
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found or cannot accept counter'
      });
    }

    res.json({
      success: true,
      data: offer,
      message: 'Counter offer accepted'
    });
  } catch (error) {
    console.error('Error accepting counter offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept counter offer'
    });
  }
});

/**
 * PUT /api/marketplace/offers/:id/reject-counter
 * Reject counter offer (buyer only)
 */
router.put('/:id/reject-counter', authenticate, async (req, res) => {
  try {
    const offer = await MarketplaceOffer.rejectCounter(
      parseInt(req.params.id),
      req.user.id
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found or cannot reject counter'
      });
    }

    res.json({
      success: true,
      data: offer,
      message: 'Counter offer rejected'
    });
  } catch (error) {
    console.error('Error rejecting counter offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject counter offer'
    });
  }
});

/**
 * PUT /api/marketplace/offers/:id/withdraw
 * Withdraw an offer (buyer only)
 */
router.put('/:id/withdraw', authenticate, async (req, res) => {
  try {
    const offer = await MarketplaceOffer.withdraw(
      parseInt(req.params.id),
      req.user.id
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found or cannot be withdrawn'
      });
    }

    res.json({
      success: true,
      data: offer,
      message: 'Offer withdrawn'
    });
  } catch (error) {
    console.error('Error withdrawing offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw offer'
    });
  }
});

module.exports = router;
