/**
 * Marketplace Payouts API Routes
 * Handles seller payout requests and history
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const MarketplacePayout = require('../models/MarketplacePayout');
const { getPaymentService } = require('../services/payments/PaymentService');

/**
 * POST /api/marketplace/payouts
 * Request a payout
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;

    const paymentService = getPaymentService();
    const payout = await paymentService.requestPayout(req.user.id, amount);

    res.status(201).json({
      success: true,
      data: { payout }
    });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to request payout', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/payouts
 * Get all payouts for current user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const payouts = await MarketplacePayout.getBySeller(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: { payouts }
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch payouts', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/payouts/balance
 * Get seller balance
 */
router.get('/balance', authenticate, async (req, res) => {
  try {
    const balance = await MarketplacePayout.getSellerBalance(req.user.id);
    const canRequest = await MarketplacePayout.canRequestPayout(req.user.id);

    res.json({
      success: true,
      data: {
        balance,
        canRequest: canRequest.canRequest,
        minimumRequired: canRequest.minimumRequired,
        reason: canRequest.reason
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch balance', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/payouts/stats
 * Get payout statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await MarketplacePayout.getSellerStats(req.user.id);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get payout stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch statistics', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * GET /api/marketplace/payouts/:id
 * Get payout details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const payoutId = parseInt(req.params.id);
    const payout = await MarketplacePayout.getById(payoutId, req.user.id);

    if (!payout) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payout not found', type: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: { payout }
    });
  } catch (error) {
    console.error('Get payout error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch payout', type: 'SERVER_ERROR' }
    });
  }
});

/**
 * POST /api/marketplace/payouts/:id/retry
 * Retry a failed payout
 */
router.post('/:id/retry', authenticate, async (req, res) => {
  try {
    const payoutId = parseInt(req.params.id);

    // Get payout to verify ownership
    const payout = await MarketplacePayout.getById(payoutId, req.user.id);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payout not found', type: 'NOT_FOUND' }
      });
    }

    if (payout.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: { message: 'Can only retry failed payouts', type: 'INVALID_STATUS' }
      });
    }

    const retried = await MarketplacePayout.retry(payoutId);
    if (!retried) {
      return res.status(400).json({
        success: false,
        error: { message: 'Maximum retry attempts reached', type: 'MAX_RETRIES' }
      });
    }

    res.json({
      success: true,
      data: { payout: retried }
    });
  } catch (error) {
    console.error('Retry payout error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retry payout', type: 'SERVER_ERROR' }
    });
  }
});

module.exports = router;
