-- Migration 023: Marketplace Auction and Raffle Tables
-- Adds support for auction bidding and raffle ticket purchases

-- Marketplace Auctions Table
CREATE TABLE IF NOT EXISTS marketplace_auctions (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  starting_bid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  reserve_price DECIMAL(12, 2), -- Minimum price to sell (optional)
  current_bid DECIMAL(12, 2) DEFAULT 0.00,
  bid_increment DECIMAL(12, 2) DEFAULT 1.00,
  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NOT NULL,
  auto_extend BOOLEAN DEFAULT TRUE, -- Extend if bid in last 5 minutes
  extension_minutes INTEGER DEFAULT 5,
  total_bids INTEGER DEFAULT 0,
  winner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled', 'sold')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auction Bids Table
CREATE TABLE IF NOT EXISTS marketplace_auction_bids (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER NOT NULL REFERENCES marketplace_auctions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bid_amount DECIMAL(12, 2) NOT NULL,
  max_bid_amount DECIMAL(12, 2), -- For proxy/auto bidding
  is_winning BOOLEAN DEFAULT FALSE,
  is_outbid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_bid_amount CHECK (bid_amount > 0)
);

-- Marketplace Raffles Table
CREATE TABLE IF NOT EXISTS marketplace_raffles (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  ticket_price DECIMAL(12, 2) NOT NULL DEFAULT 1.00,
  total_tickets INTEGER NOT NULL,
  tickets_sold INTEGER DEFAULT 0,
  min_tickets_to_draw INTEGER, -- Minimum tickets to sell before drawing
  max_tickets_per_user INTEGER DEFAULT NULL, -- Limit per user (NULL = unlimited)
  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NOT NULL,
  draw_time TIMESTAMP, -- Actual drawing time (can be after end_time)
  winner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  winner_ticket_number INTEGER,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'drawn', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_ticket_count CHECK (total_tickets > 0),
  CONSTRAINT valid_tickets_sold CHECK (tickets_sold >= 0 AND tickets_sold <= total_tickets)
);

-- Raffle Ticket Purchases Table
CREATE TABLE IF NOT EXISTS marketplace_raffle_tickets (
  id SERIAL PRIMARY KEY,
  raffle_id INTEGER NOT NULL REFERENCES marketplace_raffles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,
  purchase_amount DECIMAL(12, 2) NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_ticket_number UNIQUE (raffle_id, ticket_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auctions_listing_id ON marketplace_auctions(listing_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON marketplace_auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON marketplace_auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON marketplace_auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_user_id ON marketplace_auction_bids(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_is_winning ON marketplace_auction_bids(is_winning);

CREATE INDEX IF NOT EXISTS idx_raffles_listing_id ON marketplace_raffles(listing_id);
CREATE INDEX IF NOT EXISTS idx_raffles_status ON marketplace_raffles(status);
CREATE INDEX IF NOT EXISTS idx_raffles_end_time ON marketplace_raffles(end_time);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_raffle_id ON marketplace_raffle_tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_user_id ON marketplace_raffle_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_is_winner ON marketplace_raffle_tickets(is_winner);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_marketplace_auctions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_marketplace_auctions_updated_at
  BEFORE UPDATE ON marketplace_auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_auctions_updated_at();

CREATE OR REPLACE FUNCTION update_marketplace_raffles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_marketplace_raffles_updated_at
  BEFORE UPDATE ON marketplace_raffles
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_raffles_updated_at();
