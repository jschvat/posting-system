/**
 * Marketplace Payment Methods API Routes
 * Handles user payment methods (cards, PayPal, etc.)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const MarketplacePaymentMethod = require('../models/MarketplacePaymentMethod');
const { getPaymentService } = require('../services/payments/PaymentService');

/**
 * POST /api/marketplace/payment-methods
 * Create a new payment method
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      type,
      provider = 'mock',
      cardNumber,
      expMonth,
      expYear,
      cvc,
      holderName,
      isDefault = false
    } = req.body;

    // Validate input
    if (!type) {
      return res.status(400).json({
        success: false,
        error: { message: 'Payment type is required', type: 'VALIDATION_ERROR' }
      });
    }

    if (type === 'card') {
      if (!cardNumber || !expMonth || !expYear || !cvc || !holderName) {
        return res.status(400).json({
          success: false,
          error: { message: 'Card details are incomplete', type: 'VALIDATION_ERROR' }
        });
      }
    }

    // Create payment method using payment service
    const paymentService = getPaymentService();
    const paymentMethod = await paymentService.createPaymentMethod(req.user.id, {
      type,
      provider,
      cardNumber,
      expMonth,
      expYear,
      cvc,
      holderName,
      isDefault
    });

    res.status(201).json({
      success: true,
      data: { paymentMethod }
    });
  } catch (error) {
    console.error('Create payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create payment method', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/payment-methods
 * Get all payment methods for current user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { activeOnly = 'true' } = req.query;
    const paymentMethods = await MarketplacePaymentMethod.getByUser(
      req.user.id,
      activeOnly === 'true'
    );

    res.json({
      success: true,
      data: { paymentMethods }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch payment methods', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/payment-methods/default
 * Get default payment method
 */
router.get('/default', authenticate, async (req, res) => {
  try {
    const paymentMethod = await MarketplacePaymentMethod.getDefault(req.user.id);

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: { message: 'No default payment method found', type: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { paymentMethod }
    });
  } catch (error) {
    console.error('Get default payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch default payment method', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/payment-methods/:id
 * Get payment method by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const paymentMethodId = parseInt(req.params.id);
    const paymentMethod = await MarketplacePaymentMethod.getById(
      paymentMethodId,
      req.user.id
    );

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment method not found', type: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { paymentMethod }
    });
  } catch (error) {
    console.error('Get payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch payment method', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * PUT /api/marketplace/payment-methods/:id/default
 * Set payment method as default
 */
router.put('/:id/default', authenticate, async (req, res) => {
  try {
    const paymentMethodId = parseInt(req.params.id);
    const paymentMethod = await MarketplacePaymentMethod.setDefault(
      paymentMethodId,
      req.user.id
    );

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment method not found', type: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { paymentMethod }
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to set default payment method', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * PUT /api/marketplace/payment-methods/:id
 * Update payment method
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const paymentMethodId = parseInt(req.params.id);
    const { displayName, isDefault, metadata } = req.body;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update', type: 'VALIDATION_ERROR' }
      });
    }

    const paymentMethod = await MarketplacePaymentMethod.update(
      paymentMethodId,
      req.user.id,
      updates
    );

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment method not found', type: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { paymentMethod }
    });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update payment method', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * DELETE /api/marketplace/payment-methods/:id
 * Delete payment method
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const paymentMethodId = parseInt(req.params.id);
    const paymentMethod = await MarketplacePaymentMethod.delete(
      paymentMethodId,
      req.user.id
    );

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment method not found', type: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { message: 'Payment method deleted successfully' }
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete payment method', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * POST /api/marketplace/payment-methods/:id/deactivate
 * Deactivate payment method (soft delete)
 */
router.post('/:id/deactivate', authenticate, async (req, res) => {
  try {
    const paymentMethodId = parseInt(req.params.id);
    const paymentMethod = await MarketplacePaymentMethod.deactivate(
      paymentMethodId,
      req.user.id
    );

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment method not found', type: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { paymentMethod }
    });
  } catch (error) {
    console.error('Deactivate payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to deactivate payment method', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/payment-methods/expired/check
 * Check for expired payment methods
 */
router.get('/expired/check', authenticate, async (req, res) => {
  try {
    const expiredMethods = await MarketplacePaymentMethod.getExpired(req.user.id);

    res.json({
      success: true,
      data: {
        hasExpired: expiredMethods.length > 0,
        count: expiredMethods.length,
        methods: expiredMethods
      }
    });
  } catch (error) {
    console.error('Check expired payment methods error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to check expired payment methods', type: 'SERVER_ERROR' }
    });
  }
});

module.exports = router;
