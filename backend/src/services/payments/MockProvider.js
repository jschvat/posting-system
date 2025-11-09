/**
 * Mock Payment Provider
 * Simulates payment processing for development and testing
 * Can be easily swapped with real providers (Stripe, PayPal, etc.)
 */

class MockProvider {
  constructor(config = {}) {
    this.name = 'mock';
    this.config = {
      simulateDelay: config.simulateDelay !== false, // Default true
      delayMs: config.delayMs || 1000,
      failureRate: config.failureRate || 0, // 0-100, percentage of payments that should fail
      ...config
    };
  }

  /**
   * Simulate network delay
   */
  async _delay() {
    if (this.config.simulateDelay) {
      await new Promise(resolve => setTimeout(resolve, this.config.delayMs));
    }
  }

  /**
   * Simulate random failure based on failure rate
   */
  _shouldFail() {
    if (this.config.failureRate > 0) {
      return Math.random() * 100 < this.config.failureRate;
    }
    return false;
  }

  /**
   * Generate mock transaction ID
   */
  _generateTransactionId() {
    return `mock_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate mock payment method ID
   */
  _generatePaymentMethodId() {
    return `mock_pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate mock payout ID
   */
  _generatePayoutId() {
    return `mock_po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a payment method (tokenize card)
   * In production, this would send card details to Stripe/PayPal and get a token
   */
  async createPaymentMethod(paymentDetails) {
    await this._delay();

    const { type, cardNumber, expMonth, expYear, cvc, holderName } = paymentDetails;

    // Validate basic card format
    if (type === 'card') {
      if (!cardNumber || cardNumber.length < 13) {
        throw new Error('Invalid card number');
      }
      if (!expMonth || expMonth < 1 || expMonth > 12) {
        throw new Error('Invalid expiration month');
      }
      if (!expYear || expYear < new Date().getFullYear()) {
        throw new Error('Card is expired');
      }
      if (!cvc || cvc.length < 3) {
        throw new Error('Invalid CVC');
      }
    }

    // Simulate failure
    if (this._shouldFail()) {
      throw new Error('Payment method creation failed (simulated)');
    }

    // Extract card brand from number
    const brand = this._getCardBrand(cardNumber);
    const last4 = cardNumber.slice(-4);

    return {
      id: this._generatePaymentMethodId(),
      type,
      brand,
      last4,
      expMonth,
      expYear,
      holderName,
      created: Date.now()
    };
  }

  /**
   * Determine card brand from number
   */
  _getCardBrand(cardNumber) {
    const number = cardNumber.replace(/\s/g, '');

    if (/^4/.test(number)) return 'visa';
    if (/^5[1-5]/.test(number)) return 'mastercard';
    if (/^3[47]/.test(number)) return 'amex';
    if (/^6(?:011|5)/.test(number)) return 'discover';

    return 'unknown';
  }

  /**
   * Process a payment charge
   */
  async charge({ amount, currency = 'USD', paymentMethodId, description, metadata = {} }) {
    await this._delay();

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Validate payment method
    if (!paymentMethodId) {
      throw new Error('Payment method is required');
    }

    // Simulate failure
    if (this._shouldFail()) {
      throw new Error('Payment declined (simulated)');
    }

    // Special test card numbers that should fail
    if (paymentMethodId.includes('4000000000000002')) {
      throw new Error('Card declined: insufficient funds');
    }
    if (paymentMethodId.includes('4000000000000127')) {
      throw new Error('Card declined: incorrect CVC');
    }

    const transactionId = this._generateTransactionId();

    return {
      id: transactionId,
      status: 'succeeded',
      amount,
      currency,
      paymentMethodId,
      description,
      metadata,
      created: Date.now(),
      receiptUrl: `https://mock.provider/receipts/${transactionId}`
    };
  }

  /**
   * Process a refund
   */
  async refund({ transactionId, amount, reason = 'requested_by_customer' }) {
    await this._delay();

    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }

    // Simulate failure
    if (this._shouldFail()) {
      throw new Error('Refund failed (simulated)');
    }

    const refundId = `mock_rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: refundId,
      transactionId,
      amount,
      reason,
      status: 'succeeded',
      created: Date.now()
    };
  }

  /**
   * Process a payout to seller
   */
  async payout({ amount, currency = 'USD', destination, description, metadata = {} }) {
    await this._delay();

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid payout amount');
    }

    // Validate destination
    if (!destination) {
      throw new Error('Payout destination is required');
    }

    // Simulate failure
    if (this._shouldFail()) {
      throw new Error('Payout failed (simulated)');
    }

    const payoutId = this._generatePayoutId();

    return {
      id: payoutId,
      status: 'paid',
      amount,
      currency,
      destination,
      description,
      metadata,
      created: Date.now(),
      arrivalDate: Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days
    };
  }

  /**
   * Retrieve transaction status
   */
  async getTransaction(transactionId) {
    await this._delay();

    if (!transactionId || !transactionId.startsWith('mock_txn_')) {
      throw new Error('Transaction not found');
    }

    return {
      id: transactionId,
      status: 'succeeded',
      created: Date.now()
    };
  }

  /**
   * Retrieve payout status
   */
  async getPayout(payoutId) {
    await this._delay();

    if (!payoutId || !payoutId.startsWith('mock_po_')) {
      throw new Error('Payout not found');
    }

    return {
      id: payoutId,
      status: 'paid',
      created: Date.now()
    };
  }

  /**
   * Validate webhook signature (for real providers)
   * Mock provider doesn't use webhooks, but interface is here for compatibility
   */
  validateWebhookSignature(payload, signature, secret) {
    return true; // Mock always validates
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }

  /**
   * Get provider configuration (safe values only)
   */
  getConfig() {
    return {
      name: this.name,
      simulateDelay: this.config.simulateDelay,
      delayMs: this.config.delayMs
    };
  }
}

module.exports = MockProvider;
