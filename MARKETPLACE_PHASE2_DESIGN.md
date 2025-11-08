# Marketplace Phase 2: Transactions & Payments Design

**Date:** November 8, 2025
**Status:** Implementation Started
**Payment System:** Mock (easily replaceable with Stripe/PayPal)

---

## Overview

Phase 2 adds a complete transaction and payment system to the marketplace. The payment processing uses a **mock provider** that simulates real payment gateways, making it easy to swap in Stripe, PayPal, or other providers later.

---

## Database Schema

### 1. marketplace_transactions

```sql
CREATE TABLE marketplace_transactions (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  transaction_type VARCHAR(20) NOT NULL, -- 'sale', 'auction', 'raffle'

  -- Payment details
  payment_method VARCHAR(50) NOT NULL, -- 'mock_card', 'mock_paypal', 'stripe', 'paypal', etc.
  payment_provider VARCHAR(50) NOT NULL DEFAULT 'mock', -- 'mock', 'stripe', 'paypal'
  payment_provider_transaction_id VARCHAR(255), -- External transaction ID

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'

  -- Escrow (for future use)
  escrow_status VARCHAR(20), -- 'held', 'released', 'refunded'
  escrow_release_date TIMESTAMP,

  -- Metadata
  metadata JSONB, -- Store additional provider-specific data
  error_message TEXT, -- If transaction failed

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'))
);

CREATE INDEX idx_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX idx_transactions_listing ON marketplace_transactions(listing_id);
CREATE INDEX idx_transactions_status ON marketplace_transactions(status);
```

### 2. marketplace_payment_methods

```sql
CREATE TABLE marketplace_payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payment method details
  payment_type VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'bank_account'
  provider VARCHAR(50) NOT NULL, -- 'mock', 'stripe', 'paypal'
  provider_payment_method_id VARCHAR(255), -- External ID from provider

  -- Display info (last 4 digits, etc.)
  display_name VARCHAR(100), -- e.g., "Visa ****1234"
  is_default BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB, -- Provider-specific data

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, provider_payment_method_id)
);

CREATE INDEX idx_payment_methods_user ON marketplace_payment_methods(user_id);
```

### 3. marketplace_payouts

```sql
CREATE TABLE marketplace_payouts (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payout details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Payment details
  payout_method VARCHAR(50), -- 'bank_transfer', 'paypal', etc.
  payout_provider VARCHAR(50) DEFAULT 'mock',
  payout_provider_transaction_id VARCHAR(255),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'

  -- Metadata
  metadata JSONB,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  CONSTRAINT valid_payout_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_payouts_seller ON marketplace_payouts(seller_id);
CREATE INDEX idx_payouts_status ON marketplace_payouts(status);
```

---

## Mock Payment Provider

### Architecture

```
┌─────────────────┐
│  Frontend UI    │
│  (Checkout)     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Transaction    │
│  API Routes     │
└────────┬────────┘
         │
         v
┌─────────────────┐      ┌──────────────────┐
│  Payment        │─────>│  Mock Provider   │
│  Service        │      │  (Simulates API) │
└────────┬────────┘      └──────────────────┘
         │
         v                Real Provider (Future)
┌─────────────────┐      ┌──────────────────┐
│  Transaction    │      │  Stripe / PayPal │
│  Model          │      │  (Drop-in)       │
└─────────────────┘      └──────────────────┘
```

### Mock Provider Features

**Simulates:**
- ✅ Card payments (always succeed in dev mode)
- ✅ PayPal payments
- ✅ Payment processing delays (realistic timing)
- ✅ Success/failure responses
- ✅ Transaction IDs
- ✅ Webhooks (optional)

**Easy Migration:**
All payment logic is abstracted behind a provider interface. To switch to real providers:

1. Change `PAYMENT_PROVIDER=stripe` in env
2. Add API keys
3. Payment service automatically uses real provider

---

## API Endpoints

### Transaction Endpoints

```
POST   /api/marketplace/transactions          - Create transaction (checkout)
GET    /api/marketplace/transactions          - Get user's transactions
GET    /api/marketplace/transactions/:id      - Get transaction details
PUT    /api/marketplace/transactions/:id/cancel - Cancel pending transaction
POST   /api/marketplace/transactions/:id/refund - Request refund (seller)

GET    /api/marketplace/transactions/sales     - Seller's sales
GET    /api/marketplace/transactions/purchases - Buyer's purchases
```

### Payment Method Endpoints

```
POST   /api/marketplace/payment-methods        - Add payment method
GET    /api/marketplace/payment-methods        - Get user's payment methods
DELETE /api/marketplace/payment-methods/:id    - Remove payment method
PUT    /api/marketplace/payment-methods/:id/default - Set as default
```

### Payout Endpoints

```
POST   /api/marketplace/payouts                - Request payout
GET    /api/marketplace/payouts                - Get payout history
GET    /api/marketplace/payouts/:id            - Get payout details
```

---

## Frontend Components

### New Pages

1. **CheckoutPage** - Complete purchase flow
2. **TransactionHistoryPage** - View all transactions
3. **PaymentMethodsPage** - Manage payment methods
4. **PayoutDashboard** - Seller earnings & payouts

### New Components

1. **CheckoutModal** - Payment form
2. **PaymentMethodSelector** - Choose/add payment method
3. **TransactionCard** - Display transaction details
4. **PayoutRequestForm** - Request withdrawal
5. **EarningsWidget** - Show seller balance

---

## Transaction Flow

### Purchase Flow (Sale Listing)

```
1. Buyer clicks "Buy Now"
2. CheckoutModal opens
   - Shows listing details
   - Total amount
   - Payment method selector
3. Buyer selects/adds payment method
4. Buyer confirms purchase
5. Frontend: POST /api/marketplace/transactions
6. Backend:
   - Validate listing availability
   - Create transaction (status: pending)
   - Call PaymentService.processPayment()
   - Mock provider simulates processing
   - Update transaction status to 'completed'
   - Mark listing as sold
   - Create notification for seller
7. Frontend: Show success message
8. Redirect to transaction details
```

### Auction Win Flow

```
1. Auction ends
2. Backend determines winner (highest bidder)
3. Create pending transaction for winner
4. Send notification: "You won! Complete payment"
5. Winner has 48 hours to pay
6. Winner clicks notification → goes to checkout
7. Same flow as purchase
```

### Raffle Win Flow

```
1. Raffle ends
2. Backend randomly selects winner
3. Winner already paid for tickets
4. Create completed transaction
5. Notify winner: "You won!"
6. Notify seller: "Release item to winner"
```

---

## Mock Provider Implementation

### Service Structure

```javascript
// backend/src/services/PaymentService.js

class PaymentService {
  constructor() {
    this.provider = this.getProvider();
  }

  getProvider() {
    const providerType = process.env.PAYMENT_PROVIDER || 'mock';

    switch(providerType) {
      case 'stripe':
        return new StripeProvider();
      case 'paypal':
        return new PayPalProvider();
      case 'mock':
      default:
        return new MockProvider();
    }
  }

  async processPayment(data) {
    return await this.provider.processPayment(data);
  }

  async refundPayment(transactionId) {
    return await this.provider.refundPayment(transactionId);
  }
}

// Mock Provider
class MockProvider {
  async processPayment({ amount, paymentMethod, metadata }) {
    // Simulate API delay
    await this.delay(1000);

    // In dev, always succeed
    // In test, can simulate failures
    const shouldFail = Math.random() < 0.05; // 5% failure rate in test

    if (shouldFail && process.env.NODE_ENV === 'test') {
      throw new Error('Mock payment declined');
    }

    return {
      success: true,
      transactionId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      metadata: {
        provider: 'mock',
        processedAt: new Date().toISOString()
      }
    };
  }

  async refundPayment(transactionId) {
    await this.delay(500);

    return {
      success: true,
      refundId: `refund_${Date.now()}`,
      status: 'refunded'
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Migration to Real Providers

### Stripe Migration

```javascript
class StripeProvider {
  constructor() {
    this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }

  async processPayment({ amount, paymentMethod, metadata }) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethod.provider_payment_method_id,
      confirm: true,
      metadata
    });

    return {
      success: paymentIntent.status === 'succeeded',
      transactionId: paymentIntent.id,
      status: paymentIntent.status,
      metadata: paymentIntent
    };
  }

  async refundPayment(transactionId) {
    const refund = await this.stripe.refunds.create({
      payment_intent: transactionId
    });

    return {
      success: refund.status === 'succeeded',
      refundId: refund.id,
      status: refund.status
    };
  }
}
```

**Migration Steps:**
1. Install: `npm install stripe`
2. Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
3. Set `PAYMENT_PROVIDER=stripe`
4. Update frontend to use Stripe Elements (drop-in replacement)
5. All existing transactions remain compatible

---

## Security Considerations

### Mock Provider
- ✅ Never store real card numbers (even in mock)
- ✅ Use tokenization pattern (like real providers)
- ✅ Log all transactions for audit
- ✅ Clear distinction between test/prod modes

### Real Provider Migration
- ✅ PCI compliance handled by Stripe/PayPal
- ✅ No card data touches our servers
- ✅ Use webhooks for async updates
- ✅ Implement idempotency keys

---

## Testing Strategy

### Mock Provider Tests
```javascript
describe('MockProvider', () => {
  it('processes payment successfully', async () => {
    const result = await mockProvider.processPayment({
      amount: 99.99,
      paymentMethod: { type: 'card' }
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^mock_/);
  });

  it('handles refunds', async () => {
    const result = await mockProvider.refundPayment('mock_123');
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests
- Test complete checkout flow
- Test transaction status updates
- Test notification triggers
- Test listing status changes

---

## Benefits of Mock Provider Approach

1. **Development Speed**
   - No API keys needed initially
   - Instant testing
   - No external dependencies

2. **Flexibility**
   - Easy to simulate edge cases
   - Control success/failure rates
   - Test timeout scenarios

3. **Cost Effective**
   - No transaction fees during development
   - Unlimited testing

4. **Production Ready**
   - Same interface as real providers
   - Drop-in replacement
   - Database schema supports all providers

5. **Risk Free**
   - Can't accidentally charge real cards
   - Safe for demos and testing
   - Clear mock vs production separation

---

## Implementation Checklist

- [ ] Create database migrations
- [ ] Implement Transaction model
- [ ] Implement PaymentMethod model
- [ ] Implement Payout model
- [ ] Create MockProvider service
- [ ] Create PaymentService wrapper
- [ ] Build transaction API routes
- [ ] Build payment method routes
- [ ] Build payout routes
- [ ] Create CheckoutPage component
- [ ] Create CheckoutModal component
- [ ] Create PaymentMethodSelector component
- [ ] Create TransactionHistory page
- [ ] Create PayoutDashboard page
- [ ] Add transaction notifications
- [ ] Test complete flow
- [ ] Document migration to Stripe/PayPal

---

*Ready for implementation!*
