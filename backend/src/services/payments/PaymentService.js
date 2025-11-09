/**
 * Payment Service
 * Abstraction layer for payment providers
 * Supports multiple providers: Mock, Stripe, PayPal, etc.
 */

const MockProvider = require('./MockProvider');
const MarketplaceTransaction = require('../../models/MarketplaceTransaction');
const MarketplacePaymentMethod = require('../../models/MarketplacePaymentMethod');
const MarketplacePayout = require('../../models/MarketplacePayout');

class PaymentService {
  constructor() {
    this.providers = new Map();
    this._initializeProviders();
  }

  /**
   * Initialize payment providers
   */
  _initializeProviders() {
    // Initialize Mock provider (always available)
    const mockProvider = new MockProvider({
      simulateDelay: true,
      delayMs: 500,
      failureRate: 0 // Set to 10 to simulate 10% failure rate
    });
    this.providers.set('mock', mockProvider);

    // Future: Initialize Stripe
    // if (process.env.STRIPE_SECRET_KEY) {
    //   const stripeProvider = new StripeProvider({
    //     apiKey: process.env.STRIPE_SECRET_KEY
    //   });
    //   this.providers.set('stripe', stripeProvider);
    // }

    // Future: Initialize PayPal
    // if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    //   const paypalProvider = new PayPalProvider({
    //     clientId: process.env.PAYPAL_CLIENT_ID,
    //     clientSecret: process.env.PAYPAL_CLIENT_SECRET
    //   });
    //   this.providers.set('paypal', paypalProvider);
    // }
  }

  /**
   * Get provider by name
   */
  getProvider(providerName = 'mock') {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Payment provider '${providerName}' is not configured`);
    }
    return provider;
  }

  /**
   * Get default provider
   */
  getDefaultProvider() {
    // In production, you might want to use Stripe as default
    return this.getProvider('mock');
  }

  /**
   * Create a payment method
   */
  async createPaymentMethod(userId, paymentDetails) {
    const providerName = paymentDetails.provider || 'mock';
    const provider = this.getProvider(providerName);

    try {
      // Create payment method with provider
      const providerPaymentMethod = await provider.createPaymentMethod(paymentDetails);

      // Store in database
      const paymentMethod = await MarketplacePaymentMethod.create({
        userId,
        paymentType: paymentDetails.type,
        provider: providerName,
        providerPaymentMethodId: providerPaymentMethod.id,
        displayName: `${providerPaymentMethod.brand} ****${providerPaymentMethod.last4}`,
        brand: providerPaymentMethod.brand,
        last4: providerPaymentMethod.last4,
        expMonth: providerPaymentMethod.expMonth,
        expYear: providerPaymentMethod.expYear,
        isDefault: paymentDetails.isDefault || false,
        metadata: {
          holderName: providerPaymentMethod.holderName
        }
      });

      return paymentMethod;
    } catch (error) {
      throw new Error(`Failed to create payment method: ${error.message}`);
    }
  }

  /**
   * Process a payment for a transaction
   */
  async processPayment(transactionId, paymentMethodId) {
    // Get transaction
    const transaction = await MarketplaceTransaction.getById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.payment_status === 'completed') {
      throw new Error('Transaction already paid');
    }

    // Get payment method
    const paymentMethod = await MarketplacePaymentMethod.getById(
      paymentMethodId,
      transaction.buyer_id
    );
    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    if (!paymentMethod.is_active) {
      throw new Error('Payment method is not active');
    }

    // Check if card is expired
    if (paymentMethod.payment_type === 'card') {
      if (MarketplacePaymentMethod.isCardExpired(
        paymentMethod.exp_month,
        paymentMethod.exp_year
      )) {
        throw new Error('Payment method is expired');
      }
    }

    // Get provider
    const provider = this.getProvider(paymentMethod.provider);

    try {
      // Update transaction to processing
      await MarketplaceTransaction.updatePaymentStatus(transactionId, 'processing');

      // Process charge with provider
      const charge = await provider.charge({
        amount: transaction.total_amount,
        currency: 'USD',
        paymentMethodId: paymentMethod.provider_payment_method_id,
        description: `Purchase: ${transaction.listing_title}`,
        metadata: {
          transactionId: transaction.id,
          listingId: transaction.listing_id,
          buyerId: transaction.buyer_id,
          sellerId: transaction.seller_id
        }
      });

      // Update transaction as paid
      await MarketplaceTransaction.updatePaymentStatus(
        transactionId,
        'completed',
        charge.id
      );

      // Update transaction status to paid
      await MarketplaceTransaction.updateStatus(transactionId, 'paid');

      return {
        success: true,
        transactionId: transaction.id,
        paymentId: charge.id,
        amount: transaction.total_amount,
        status: 'completed'
      };
    } catch (error) {
      // Mark transaction as failed
      await MarketplaceTransaction.updatePaymentStatus(transactionId, 'failed');

      throw new Error(`Payment failed: ${error.message}`);
    }
  }

  /**
   * Process a refund
   */
  async processRefund(transactionId, reason = 'requested_by_customer') {
    // Get transaction
    const transaction = await MarketplaceTransaction.getById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.payment_status !== 'completed') {
      throw new Error('Cannot refund: transaction not completed');
    }

    if (transaction.status === 'refunded') {
      throw new Error('Transaction already refunded');
    }

    if (!transaction.payment_id) {
      throw new Error('No payment ID found for refund');
    }

    // Determine provider from payment_method or default to mock
    const providerName = transaction.payment_method?.includes('mock') ? 'mock' : 'mock';
    const provider = this.getProvider(providerName);

    try {
      // Process refund with provider
      const refund = await provider.refund({
        transactionId: transaction.payment_id,
        amount: transaction.total_amount,
        reason
      });

      // Update transaction as refunded
      await MarketplaceTransaction.refund(transactionId);

      return {
        success: true,
        transactionId: transaction.id,
        refundId: refund.id,
        amount: transaction.total_amount,
        status: 'refunded'
      };
    } catch (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Process a payout to seller
   */
  async processPayout(payoutId) {
    // Get payout
    const payout = await MarketplacePayout.getById(payoutId);
    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new Error(`Cannot process payout with status: ${payout.status}`);
    }

    // Get provider
    const provider = this.getProvider(payout.payout_provider);

    try {
      // Mark as processing
      await MarketplacePayout.markProcessing(payoutId);

      // Process payout with provider
      const payoutResult = await provider.payout({
        amount: payout.net_amount,
        currency: payout.currency,
        destination: payout.bank_account_last4 || 'default',
        description: `Seller payout for user ${payout.seller_id}`,
        metadata: {
          payoutId: payout.id,
          sellerId: payout.seller_id
        }
      });

      // Mark as completed
      await MarketplacePayout.markCompleted(payoutId, payoutResult.id);

      return {
        success: true,
        payoutId: payout.id,
        providerPayoutId: payoutResult.id,
        amount: payout.net_amount,
        status: 'completed'
      };
    } catch (error) {
      // Mark as failed
      await MarketplacePayout.markFailed(payoutId, error.message, true);

      throw new Error(`Payout failed: ${error.message}`);
    }
  }

  /**
   * Request payout for seller
   */
  async requestPayout(sellerId, amount = null) {
    // Check seller balance
    const balance = await MarketplacePayout.getSellerBalance(sellerId);
    const canRequest = await MarketplacePayout.canRequestPayout(sellerId);

    if (!canRequest.canRequest) {
      throw new Error(canRequest.reason);
    }

    // Use specified amount or full available balance
    const payoutAmount = amount || parseFloat(balance.available_balance);

    if (payoutAmount > parseFloat(balance.available_balance)) {
      throw new Error('Insufficient balance for payout');
    }

    if (payoutAmount < MarketplacePayout.getMinimumPayoutAmount()) {
      throw new Error(
        `Minimum payout amount is $${MarketplacePayout.getMinimumPayoutAmount()}`
      );
    }

    // Calculate fee (2% platform fee)
    const feeAmount = (payoutAmount * 0.02).toFixed(2);

    // Create payout request
    const payout = await MarketplacePayout.create({
      sellerId,
      amount: payoutAmount,
      feeAmount,
      payoutMethod: 'bank_transfer',
      payoutProvider: 'mock',
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Schedule for tomorrow
      metadata: {
        requestedAt: new Date().toISOString()
      }
    });

    return payout;
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(providerName) {
    return this.providers.has(providerName);
  }
}

// Singleton instance
let instance = null;

module.exports = {
  PaymentService,
  getPaymentService: () => {
    if (!instance) {
      instance = new PaymentService();
    }
    return instance;
  }
};
