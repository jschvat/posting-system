/**
 * Migration: Marketplace Transactions & Payments System
 * Creates tables for transactions, payment methods, and payouts
 * Supports mock payment provider (easily swappable with Stripe/PayPal)
 */

-- marketplace_transactions table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  transaction_type VARCHAR(20) NOT NULL,
    -- 'sale', 'auction', 'raffle'

  -- Payment details
  payment_method VARCHAR(50) NOT NULL,
    -- 'mock_card', 'mock_paypal', 'stripe_card', 'paypal', etc.
  payment_provider VARCHAR(50) NOT NULL DEFAULT 'mock',
    -- 'mock', 'stripe', 'paypal'
  payment_provider_transaction_id VARCHAR(255),
    -- External transaction ID from payment provider

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending': Created, awaiting payment
    -- 'processing': Payment is being processed
    -- 'completed': Payment successful, transaction complete
    -- 'failed': Payment failed
    -- 'refunded': Transaction was refunded
    -- 'cancelled': Transaction was cancelled

  -- Escrow support (for future use)
  escrow_status VARCHAR(20),
    -- 'held', 'released', 'refunded'
  escrow_release_date TIMESTAMP,

  -- Additional data
  metadata JSONB,
    -- Store provider-specific data, shipping info, etc.
  error_message TEXT,
    -- Error details if transaction failed

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
    -- When transaction was completed

  -- Constraints
  CONSTRAINT valid_transaction_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('sale', 'auction', 'raffle')),
  CONSTRAINT valid_escrow_status CHECK (escrow_status IS NULL OR escrow_status IN ('held', 'released', 'refunded'))
);

-- Indexes for performance
CREATE INDEX idx_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX idx_transactions_listing ON marketplace_transactions(listing_id);
CREATE INDEX idx_transactions_status ON marketplace_transactions(status);
CREATE INDEX idx_transactions_created ON marketplace_transactions(created_at DESC);
CREATE INDEX idx_transactions_provider_id ON marketplace_transactions(payment_provider_transaction_id);

-- Comment on table
COMMENT ON TABLE marketplace_transactions IS 'Stores all marketplace purchase transactions';

---

-- marketplace_payment_methods table
CREATE TABLE IF NOT EXISTS marketplace_payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payment method details
  payment_type VARCHAR(50) NOT NULL,
    -- 'card', 'paypal', 'bank_account'
  provider VARCHAR(50) NOT NULL,
    -- 'mock', 'stripe', 'paypal'
  provider_payment_method_id VARCHAR(255),
    -- External ID from payment provider (e.g., Stripe payment method ID)

  -- Display information (safe to store)
  display_name VARCHAR(100),
    -- e.g., "Visa ****1234", "PayPal (john@email.com)"
  brand VARCHAR(50),
    -- Card brand: 'visa', 'mastercard', 'amex', etc.
  last4 VARCHAR(4),
    -- Last 4 digits of card
  exp_month INTEGER,
    -- Card expiration month
  exp_year INTEGER,
    -- Card expiration year

  -- Settings
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB,
    -- Provider-specific data

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, provider_payment_method_id),
  CONSTRAINT valid_payment_type CHECK (payment_type IN ('card', 'paypal', 'bank_account'))
);

-- Indexes
CREATE INDEX idx_payment_methods_user ON marketplace_payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON marketplace_payment_methods(user_id, is_default) WHERE is_default = true;

-- Comment on table
COMMENT ON TABLE marketplace_payment_methods IS 'Stores user payment methods (tokenized, no sensitive data)';

---

-- marketplace_payouts table
CREATE TABLE IF NOT EXISTS marketplace_payouts (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payout details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  fee_amount DECIMAL(10, 2) DEFAULT 0,
    -- Platform fee deducted
  net_amount DECIMAL(10, 2) GENERATED ALWAYS AS (amount - COALESCE(fee_amount, 0)) STORED,
    -- Amount seller actually receives

  -- Payout method
  payout_method VARCHAR(50),
    -- 'bank_transfer', 'paypal', etc.
  payout_provider VARCHAR(50) DEFAULT 'mock',
    -- 'mock', 'stripe', 'paypal'
  payout_provider_transaction_id VARCHAR(255),
    -- External payout ID

  -- Bank details (encrypted in production)
  bank_account_last4 VARCHAR(4),
  routing_number_last4 VARCHAR(4),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
    -- When payout was completed
  scheduled_for TIMESTAMP,
    -- When payout should be processed

  -- Constraints
  CONSTRAINT valid_payout_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_payouts_seller ON marketplace_payouts(seller_id);
CREATE INDEX idx_payouts_status ON marketplace_payouts(status);
CREATE INDEX idx_payouts_scheduled ON marketplace_payouts(scheduled_for) WHERE status = 'pending';

-- Comment on table
COMMENT ON TABLE marketplace_payouts IS 'Stores seller payout requests and history';

---

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_marketplace_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_marketplace_transactions_timestamp
  BEFORE UPDATE ON marketplace_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_transaction_timestamp();

CREATE TRIGGER trigger_update_marketplace_payment_methods_timestamp
  BEFORE UPDATE ON marketplace_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_transaction_timestamp();

CREATE TRIGGER trigger_update_marketplace_payouts_timestamp
  BEFORE UPDATE ON marketplace_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_transaction_timestamp();

---

-- Function to get seller balance (pending earnings)
CREATE OR REPLACE FUNCTION get_seller_balance(seller_user_id INTEGER)
RETURNS TABLE (
  total_sales DECIMAL(10, 2),
  completed_sales DECIMAL(10, 2),
  pending_sales DECIMAL(10, 2),
  total_payouts DECIMAL(10, 2),
  available_balance DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN t.status IN ('completed', 'processing') THEN t.amount ELSE 0 END), 0) as total_sales,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) as completed_sales,
    COALESCE(SUM(CASE WHEN t.status = 'processing' THEN t.amount ELSE 0 END), 0) as pending_sales,
    COALESCE((SELECT SUM(net_amount) FROM marketplace_payouts WHERE seller_id = seller_user_id AND status = 'completed'), 0) as total_payouts,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) -
    COALESCE((SELECT SUM(net_amount) FROM marketplace_payouts WHERE seller_id = seller_user_id AND status = 'completed'), 0) as available_balance
  FROM marketplace_transactions t
  WHERE t.seller_id = seller_user_id;
END;
$$ LANGUAGE plpgsql;

-- Comment on function
COMMENT ON FUNCTION get_seller_balance IS 'Calculate seller balance and available funds for payout';

---

-- Grant permissions (if using specific database users)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_transactions TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_payment_methods TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_payouts TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE marketplace_transactions_id_seq TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE marketplace_payment_methods_id_seq TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE marketplace_payouts_id_seq TO app_user;
