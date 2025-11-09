/**
 * Marketplace Transactions API Routes
 * Handles purchase transactions, payments, and refunds
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const MarketplaceTransaction = require('../models/MarketplaceTransaction');
const MarketplaceListing = require('../models/MarketplaceListing');
const { getPaymentService } = require('../services/payments/PaymentService');

/**
 * POST /api/marketplace/transactions
 * Create a new transaction (initiate purchase)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      listingId,
      transactionType = 'direct_sale',
      fulfillmentMethod = 'shipping'
    } = req.body;

    // Get listing
    const listing = await MarketplaceListing.getById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Listing not found', type: 'NOT_FOUND' }
      });
    }

    // Check if listing is available
    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { message: 'Listing is not available for purchase', type: 'INVALID_STATUS' }
      });
    }

    // Prevent self-purchase
    if (listing.seller_id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot purchase your own listing', type: 'SELF_PURCHASE' }
      });
    }

    // Calculate costs
    const salePrice = listing.price;
    const shippingCost = fulfillmentMethod === 'shipping' ? 5.00 : 0; // Flat $5 shipping
    const serviceFee = (salePrice * 0.05).toFixed(2); // 5% service fee

    // Create transaction
    const transaction = await MarketplaceTransaction.create({
      listingId,
      sellerId: listing.seller_id,
      buyerId: req.user.id,
      transactionType,
      salePrice,
      shippingCost,
      serviceFee,
      fulfillmentMethod
    });

    // Update listing status to pending
    await MarketplaceListing.updateStatus(listingId, 'pending');

    res.status(201).json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create transaction', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * POST /api/marketplace/transactions/:id/pay
 * Process payment for a transaction
 */
router.post('/:id/pay', authenticate, async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Payment method is required', type: 'VALIDATION_ERROR' }
      });
    }

    // Get transaction
    const transaction = await MarketplaceTransaction.getById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transaction not found', type: 'NOT_FOUND' }
      });
    }

    // Verify buyer
    if (transaction.buyer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized', type: 'FORBIDDEN' }
      });
    }

    // Process payment
    const paymentService = getPaymentService();
    const result = await paymentService.processPayment(transactionId, paymentMethodId);

    res.json({
      success: true,
      data: { payment: result }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Payment failed', type: 'PAYMENT_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/transactions
 * Get all transactions for current user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { type = 'purchases', limit = 50, offset = 0 } = req.query;

    let transactions;
    if (type === 'purchases') {
      transactions = await MarketplaceTransaction.getByBuyer(req.user.id, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } else if (type === 'sales') {
      transactions = await MarketplaceTransaction.getBySeller(req.user.id, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid transaction type', type: 'VALIDATION_ERROR' }
      });
    }

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch transactions', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/transactions/:id
 * Get transaction details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const transaction = await MarketplaceTransaction.getById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transaction not found', type: 'NOT_FOUND' }
      });
    }

    // Verify access (buyer or seller)
    if (transaction.buyer_id !== req.user.id && transaction.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized', type: 'FORBIDDEN' }
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch transaction', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * PUT /api/marketplace/transactions/:id/ship
 * Mark transaction as shipped (seller only)
 */
router.put('/:id/ship', authenticate, async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const { trackingNumber } = req.body;

    // Get transaction
    const transaction = await MarketplaceTransaction.getById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transaction not found', type: 'NOT_FOUND' }
      });
    }

    // Verify seller
    if (transaction.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized', type: 'FORBIDDEN' }
      });
    }

    // Check status
    if (transaction.status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: { message: 'Transaction must be paid before shipping', type: 'INVALID_STATUS' }
      });
    }

    // Update shipping
    const updated = await MarketplaceTransaction.updateShipping(transactionId, trackingNumber);

    res.json({
      success: true,
      data: { transaction: updated }
    });
  } catch (error) {
    console.error('Update shipping error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update shipping', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * PUT /api/marketplace/transactions/:id/deliver
 * Mark transaction as delivered (buyer confirms)
 */
router.put('/:id/deliver', authenticate, async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);

    // Get transaction
    const transaction = await MarketplaceTransaction.getById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transaction not found', type: 'NOT_FOUND' }
      });
    }

    // Verify buyer
    if (transaction.buyer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized', type: 'FORBIDDEN' }
      });
    }

    // Check status
    if (transaction.status !== 'shipped') {
      return res.status(400).json({
        success: false,
        error: { message: 'Transaction must be shipped before delivery', type: 'INVALID_STATUS' }
      });
    }

    // Mark as delivered
    const updated = await MarketplaceTransaction.markDelivered(transactionId);

    res.json({
      success: true,
      data: { transaction: updated }
    });
  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to mark as delivered', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * PUT /api/marketplace/transactions/:id/complete
 * Mark transaction as completed
 */
router.put('/:id/complete', authenticate, async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);

    // Get transaction
    const transaction = await MarketplaceTransaction.getById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transaction not found', type: 'NOT_FOUND' }
      });
    }

    // Verify buyer or seller
    if (transaction.buyer_id !== req.user.id && transaction.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized', type: 'FORBIDDEN' }
      });
    }

    // Mark as completed
    const updated = await MarketplaceTransaction.markCompleted(transactionId);

    // Update listing status to sold
    await MarketplaceListing.updateStatus(transaction.listing_id, 'sold');

    res.json({
      success: true,
      data: { transaction: updated }
    });
  } catch (error) {
    console.error('Complete transaction error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to complete transaction', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * POST /api/marketplace/transactions/:id/refund
 * Request refund for a transaction
 */
router.post('/:id/refund', authenticate, async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const { reason = 'requested_by_customer' } = req.body;

    // Get transaction
    const transaction = await MarketplaceTransaction.getById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transaction not found', type: 'NOT_FOUND' }
      });
    }

    // Verify buyer
    if (transaction.buyer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized', type: 'FORBIDDEN' }
      });
    }

    // Process refund
    const paymentService = getPaymentService();
    const result = await paymentService.processRefund(transactionId, reason);

    // Update listing back to active
    await MarketplaceListing.updateStatus(transaction.listing_id, 'active');

    res.json({
      success: true,
      data: { refund: result }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Refund failed', type: 'REFUND_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/transactions/stats/seller
 * Get seller statistics
 */
router.get('/stats/seller', authenticate, async (req, res) => {
  try {
    const stats = await MarketplaceTransaction.getSellerStats(req.user.id);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get seller stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch statistics', type: 'SERVER_ERROR' }
    });
  }
});

module.exports = router;
