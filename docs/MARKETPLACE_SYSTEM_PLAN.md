# Marketplace System - Complete Implementation Plan

**Version:** 1.0
**Date:** October 16, 2025
**System Type:** Major Subsystem (Similar to Groups)
**Status:** Planning Phase - DO NOT IMPLEMENT YET

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Database Schema Design](#database-schema-design)
4. [Geolocation Integration](#geolocation-integration)
5. [Listing Types](#listing-types)
6. [Raffle System](#raffle-system)
7. [Bidding/Auction System](#bidding-auction-system)
8. [Payment Integration](#payment-integration)
9. [Search & Discovery](#search-discovery)
10. [Security & Fraud Prevention](#security-fraud-prevention)
11. [API Endpoints](#api-endpoints)
12. [Frontend Components](#frontend-components)
13. [Implementation Phases](#implementation-phases)
14. [Testing Strategy](#testing-strategy)
15. [Success Metrics](#success-metrics)

---

## Executive Summary

### Vision
Create a comprehensive marketplace subsystem that combines traditional buy/sell functionality (like Facebook Marketplace/Craigslist) with advanced features including raffles and auction-style bidding, all powered by geolocation for local commerce.

### Key Features
- **Standard Listings**: Buy/sell with fixed prices or "make offer" options
- **Raffle System**: Limited-ticket raffles with configurable pricing
- **Auction/Bidding**: Time-based auctions with reserve prices
- **Geolocation**: Distance-based search, local pickup, shipping radius
- **Categories**: Organized product taxonomy with filtering
- **Trust & Safety**: User ratings, verification, fraud detection
- **Messaging**: Built-in buyer-seller communication
- **Analytics**: Seller dashboards, performance metrics

### Integration Points
- **Existing Users System**: Seller profiles, reputation
- **Geolocation System**: Distance calculations, nearby listings
- **Reputation System**: Seller ratings, transaction feedback
- **Messaging System**: Buyer-seller communication (new subsystem)
- **Payment System**: Escrow, raffle tickets, bid deposits (new integration)

---

## System Overview

### Architecture Principles
1. **Modular Design**: Independent subsystem like groups
2. **Geolocation-First**: All listings have location data
3. **Event-Driven**: Raffle draws, auction endings use scheduled jobs
4. **Scalable Search**: Elasticsearch integration for fast searching
5. **Transaction Safety**: ACID compliance for financial operations
6. **Real-time Updates**: WebSocket for bidding, raffle countdowns

### User Roles
- **Buyer**: Browse, purchase, bid, enter raffles
- **Seller**: Create listings, manage inventory, fulfill orders
- **Admin**: Moderate listings, resolve disputes, ban users
- **System**: Automated raffle draws, auction closures

---

## Database Schema Design

### Core Tables (12 Tables)

#### 1. **marketplace_listings**
The central table for all marketplace items.

```sql
CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,

    -- Ownership
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Info
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES marketplace_categories(id),

    -- Listing Type
    listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('sale', 'raffle', 'auction')),

    -- Pricing (varies by type)
    price DECIMAL(10,2), -- For sale items
    original_price DECIMAL(10,2), -- For showing discounts

    -- Sale-specific fields
    quantity INTEGER DEFAULT 1,
    allow_offers BOOLEAN DEFAULT FALSE,
    min_offer_price DECIMAL(10,2),

    -- Condition
    condition VARCHAR(20) CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor', 'for_parts')),

    -- Location (CRITICAL for geolocation)
    location_latitude DECIMAL(10,7) NOT NULL,
    location_longitude DECIMAL(10,7) NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    location_state VARCHAR(100) NOT NULL,
    location_zip VARCHAR(20),
    location_country VARCHAR(100) DEFAULT 'USA',
    pickup_address TEXT, -- Encrypted/hidden until agreement

    -- Shipping
    shipping_available BOOLEAN DEFAULT FALSE,
    shipping_cost DECIMAL(10,2),
    shipping_radius_miles INTEGER, -- NULL = unlimited
    local_pickup_only BOOLEAN DEFAULT TRUE,

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'active', 'sold', 'expired', 'removed', 'suspended'
    )),

    -- Metadata
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0, -- Favorites
    share_count INTEGER DEFAULT 0,

    -- Moderation
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_count INTEGER DEFAULT 0,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Auto-expire old listings
    sold_at TIMESTAMP,

    -- Search optimization
    search_vector TSVECTOR, -- Full-text search

    CONSTRAINT valid_price CHECK (
        (listing_type = 'sale' AND price > 0) OR
        (listing_type != 'sale')
    )
);

-- Indexes
CREATE INDEX idx_marketplace_listings_user ON marketplace_listings(user_id);
CREATE INDEX idx_marketplace_listings_category ON marketplace_listings(category_id);
CREATE INDEX idx_marketplace_listings_type ON marketplace_listings(listing_type);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_location ON marketplace_listings(location_latitude, location_longitude);
CREATE INDEX idx_marketplace_listings_created ON marketplace_listings(created_at DESC);
CREATE INDEX idx_marketplace_listings_price ON marketplace_listings(price) WHERE status = 'active';
CREATE INDEX idx_marketplace_search ON marketplace_listings USING GIN(search_vector);

-- Geospatial index for distance queries
CREATE INDEX idx_marketplace_geo ON marketplace_listings(location_latitude, location_longitude)
    WHERE status = 'active';
```

#### 2. **marketplace_categories**
Hierarchical category system.

```sql
CREATE TABLE marketplace_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES marketplace_categories(id),
    description TEXT,
    icon_url VARCHAR(500),

    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    listing_count INTEGER DEFAULT 0, -- Denormalized

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample categories:
-- Electronics > Phones, Computers, Gaming, etc.
-- Vehicles > Cars, Motorcycles, Boats, etc.
-- Home & Garden > Furniture, Appliances, Tools, etc.
-- Clothing & Accessories > Men's, Women's, Kids, etc.
-- Sports & Outdoors
-- Collectibles & Art
-- Free Stuff
```

#### 3. **marketplace_media**
Images and videos for listings.

```sql
CREATE TABLE marketplace_media (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- image/jpeg, video/mp4
    file_size BIGINT NOT NULL,

    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE, -- Cover image

    -- Image specific
    width INTEGER,
    height INTEGER,
    thumbnail_url VARCHAR(500),

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_media_listing ON marketplace_media(listing_id);
```

#### 4. **marketplace_raffles**
Raffle-specific data.

```sql
CREATE TABLE marketplace_raffles (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

    -- Raffle Configuration
    ticket_price DECIMAL(10,2) NOT NULL CHECK (ticket_price > 0),
    total_tickets INTEGER NOT NULL CHECK (total_tickets > 0 AND total_tickets <= 10000),
    tickets_sold INTEGER DEFAULT 0,
    min_tickets_required INTEGER, -- Minimum to draw, refund if not met

    -- Item Value (for display)
    item_value DECIMAL(10,2),

    -- Timing
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    draw_time TIMESTAMP, -- When drawing will occur (can be after end_time)

    -- Winner
    winner_user_id INTEGER REFERENCES users(id),
    winning_ticket_number INTEGER,
    drawn_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',    -- Not started
        'active',     -- Selling tickets
        'ended',      -- Sales ended, not drawn
        'drawn',      -- Winner selected
        'completed',  -- Winner received item
        'cancelled',  -- Refunded
        'failed'      -- Didn't meet min tickets
    )),

    -- Fairness
    random_seed VARCHAR(255), -- For provably fair drawing
    draw_proof TEXT, -- JSON with all tickets and draw details

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_raffle_timing CHECK (end_time > start_time),
    CONSTRAINT valid_draw_time CHECK (draw_time IS NULL OR draw_time >= end_time)
);

CREATE INDEX idx_marketplace_raffles_listing ON marketplace_raffles(listing_id);
CREATE INDEX idx_marketplace_raffles_status ON marketplace_raffles(status);
CREATE INDEX idx_marketplace_raffles_end_time ON marketplace_raffles(end_time)
    WHERE status IN ('active', 'ended');
```

#### 5. **marketplace_raffle_tickets**
Individual raffle ticket purchases.

```sql
CREATE TABLE marketplace_raffle_tickets (
    id SERIAL PRIMARY KEY,
    raffle_id INTEGER NOT NULL REFERENCES marketplace_raffles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Ticket Info
    ticket_number INTEGER NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,

    -- Payment
    payment_id VARCHAR(255), -- Stripe/payment processor ID
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'completed', 'refunded', 'failed'
    )),

    -- Timestamps
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refunded_at TIMESTAMP,

    UNIQUE(raffle_id, ticket_number),
    UNIQUE(raffle_id, user_id, ticket_number)
);

CREATE INDEX idx_raffle_tickets_raffle ON marketplace_raffle_tickets(raffle_id);
CREATE INDEX idx_raffle_tickets_user ON marketplace_raffle_tickets(user_id);
CREATE INDEX idx_raffle_tickets_number ON marketplace_raffle_tickets(raffle_id, ticket_number);
```

#### 6. **marketplace_auctions**
Auction-specific data.

```sql
CREATE TABLE marketplace_auctions (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

    -- Pricing
    starting_bid DECIMAL(10,2) NOT NULL CHECK (starting_bid > 0),
    reserve_price DECIMAL(10,2), -- Minimum to sell (hidden from buyers)
    buy_now_price DECIMAL(10,2), -- Instant purchase option
    bid_increment DECIMAL(10,2) DEFAULT 1.00,

    -- Current State
    current_bid DECIMAL(10,2) DEFAULT 0,
    bid_count INTEGER DEFAULT 0,
    leading_bidder_id INTEGER REFERENCES users(id),

    -- Timing
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    auto_extend BOOLEAN DEFAULT TRUE, -- Extend if bid in last 5 min
    extension_minutes INTEGER DEFAULT 5,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',    -- Not started
        'active',     -- Accepting bids
        'ended',      -- Time expired
        'sold',       -- Winner paid
        'reserve_not_met', -- Ended but reserve not met
        'cancelled'
    )),

    -- Winner
    winner_user_id INTEGER REFERENCES users(id),
    winning_bid DECIMAL(10,2),
    sold_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_auction_timing CHECK (end_time > start_time),
    CONSTRAINT valid_reserve CHECK (reserve_price IS NULL OR reserve_price >= starting_bid),
    CONSTRAINT valid_buy_now CHECK (buy_now_price IS NULL OR buy_now_price > starting_bid)
);

CREATE INDEX idx_marketplace_auctions_listing ON marketplace_auctions(listing_id);
CREATE INDEX idx_marketplace_auctions_status ON marketplace_auctions(status);
CREATE INDEX idx_marketplace_auctions_end_time ON marketplace_auctions(end_time)
    WHERE status = 'active';
CREATE INDEX idx_marketplace_auctions_leading_bidder ON marketplace_auctions(leading_bidder_id);
```

#### 7. **marketplace_bids**
Individual bid history.

```sql
CREATE TABLE marketplace_bids (
    id SERIAL PRIMARY KEY,
    auction_id INTEGER NOT NULL REFERENCES marketplace_auctions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Bid Info
    bid_amount DECIMAL(10,2) NOT NULL,

    -- Bid Types
    bid_type VARCHAR(20) DEFAULT 'manual' CHECK (bid_type IN (
        'manual',      -- User placed bid
        'auto',        -- Proxy bid system
        'buy_now'      -- Used buy now price
    )),

    -- Proxy Bidding
    max_bid_amount DECIMAL(10,2), -- For auto-bidding up to this amount
    is_winning BOOLEAN DEFAULT FALSE,
    was_outbid BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'outbid', 'winning', 'won', 'lost', 'retracted'
    )),

    -- IP for fraud detection
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_bid_amount CHECK (bid_amount > 0),
    CONSTRAINT valid_max_bid CHECK (max_bid_amount IS NULL OR max_bid_amount >= bid_amount)
);

CREATE INDEX idx_marketplace_bids_auction ON marketplace_bids(auction_id, created_at DESC);
CREATE INDEX idx_marketplace_bids_user ON marketplace_bids(user_id);
CREATE INDEX idx_marketplace_bids_winning ON marketplace_bids(auction_id)
    WHERE is_winning = TRUE;
```

#### 8. **marketplace_offers**
Make-an-offer system for sale listings.

```sql
CREATE TABLE marketplace_offers (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Offer Details
    offer_amount DECIMAL(10,2) NOT NULL CHECK (offer_amount > 0),
    message TEXT, -- Buyer's message to seller

    -- Counter Offer
    counter_amount DECIMAL(10,2),
    counter_message TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',    -- Waiting for seller response
        'accepted',   -- Seller accepted
        'rejected',   -- Seller rejected
        'countered',  -- Seller countered
        'counter_accepted', -- Buyer accepted counter
        'counter_rejected', -- Buyer rejected counter
        'expired',    -- Expired after 48 hours
        'withdrawn'   -- Buyer withdrew
    )),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),

    CONSTRAINT different_users CHECK (buyer_id != seller_id)
);

CREATE INDEX idx_marketplace_offers_listing ON marketplace_offers(listing_id);
CREATE INDEX idx_marketplace_offers_buyer ON marketplace_offers(buyer_id);
CREATE INDEX idx_marketplace_offers_seller ON marketplace_offers(seller_id);
CREATE INDEX idx_marketplace_offers_status ON marketplace_offers(status);
```

#### 9. **marketplace_transactions**
Completed purchases/sales.

```sql
CREATE TABLE marketplace_transactions (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id),

    -- Parties
    seller_id INTEGER NOT NULL REFERENCES users(id),
    buyer_id INTEGER NOT NULL REFERENCES users(id),

    -- Transaction Type
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'direct_sale',  -- Standard purchase
        'raffle_win',   -- Won raffle
        'auction_win',  -- Won auction
        'offer_accepted' -- Accepted offer
    )),

    -- Pricing
    sale_price DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    service_fee DECIMAL(10,2) DEFAULT 0, -- Platform fee
    total_amount DECIMAL(10,2) NOT NULL,

    -- Payment
    payment_method VARCHAR(50),
    payment_id VARCHAR(255), -- External payment processor ID
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'processing', 'completed', 'refunded', 'disputed', 'failed'
    )),

    -- Fulfillment
    fulfillment_method VARCHAR(20) CHECK (fulfillment_method IN (
        'pickup', 'shipping', 'delivery'
    )),
    tracking_number VARCHAR(255),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Payment processing
        'paid',         -- Payment completed
        'shipped',      -- Item shipped
        'delivered',    -- Item delivered
        'completed',    -- Transaction complete
        'disputed',     -- Dispute opened
        'refunded',     -- Money refunded
        'cancelled'
    )),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT different_parties CHECK (seller_id != buyer_id)
);

CREATE INDEX idx_marketplace_transactions_listing ON marketplace_transactions(listing_id);
CREATE INDEX idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX idx_marketplace_transactions_status ON marketplace_transactions(status);
CREATE INDEX idx_marketplace_transactions_created ON marketplace_transactions(created_at DESC);
```

#### 10. **marketplace_saved_listings**
User favorites/watchlist.

```sql
CREATE TABLE marketplace_saved_listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

    -- Organization
    folder VARCHAR(100), -- Custom folders/categories
    notes TEXT, -- Private notes

    -- Alerts
    price_alert_enabled BOOLEAN DEFAULT FALSE,
    price_alert_threshold DECIMAL(10,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_marketplace_saved_user ON marketplace_saved_listings(user_id);
CREATE INDEX idx_marketplace_saved_listing ON marketplace_saved_listings(listing_id);
```

#### 11. **marketplace_reviews**
Buyer-seller ratings after transactions.

```sql
CREATE TABLE marketplace_reviews (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,

    -- Reviewer and Reviewee
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_role VARCHAR(10) CHECK (reviewer_role IN ('buyer', 'seller')),

    -- Rating (1-5 stars)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

    -- Detailed Ratings (optional, for sellers)
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    item_accuracy_rating INTEGER CHECK (item_accuracy_rating BETWEEN 1 AND 5),
    shipping_speed_rating INTEGER CHECK (shipping_speed_rating BETWEEN 1 AND 5),

    -- Review Content
    review_text TEXT,

    -- Response
    seller_response TEXT,
    responded_at TIMESTAMP,

    -- Moderation
    is_flagged BOOLEAN DEFAULT FALSE,
    is_verified_purchase BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT different_users CHECK (reviewer_id != reviewee_id),
    UNIQUE(transaction_id, reviewer_id)
);

CREATE INDEX idx_marketplace_reviews_transaction ON marketplace_reviews(transaction_id);
CREATE INDEX idx_marketplace_reviews_reviewee ON marketplace_reviews(reviewee_id);
CREATE INDEX idx_marketplace_reviews_rating ON marketplace_reviews(rating);
```

#### 12. **marketplace_seller_stats**
Denormalized seller statistics.

```sql
CREATE TABLE marketplace_seller_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Sales Metrics
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    active_listings INTEGER DEFAULT 0,

    -- Ratings
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    rating_distribution JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}',

    -- Response Metrics
    average_response_time INTEGER, -- In minutes
    response_rate DECIMAL(5,2) DEFAULT 0, -- Percentage

    -- Completion Metrics
    completion_rate DECIMAL(5,2) DEFAULT 0,
    cancellation_rate DECIMAL(5,2) DEFAULT 0,
    dispute_rate DECIMAL(5,2) DEFAULT 0,

    -- Badges/Achievements
    badges JSONB DEFAULT '[]', -- ["fast_shipper", "top_seller", etc.]
    seller_level VARCHAR(20) DEFAULT 'new' CHECK (seller_level IN (
        'new', 'bronze', 'silver', 'gold', 'platinum'
    )),

    -- Timestamps
    first_sale_at TIMESTAMP,
    last_sale_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_seller_stats_rating ON marketplace_seller_stats(average_rating DESC);
CREATE INDEX idx_marketplace_seller_stats_level ON marketplace_seller_stats(seller_level);
```

---

## Geolocation Integration

### Location-Based Features

#### 1. **Distance Calculation**
Use existing `calculate_distance_miles()` function:

```sql
-- Find listings within radius
SELECT
    l.*,
    calculate_distance_miles(
        ${userLat},
        ${userLon},
        l.location_latitude,
        l.location_longitude
    ) AS distance_miles
FROM marketplace_listings l
WHERE l.status = 'active'
    AND calculate_distance_miles(
        ${userLat},
        ${userLon},
        l.location_latitude,
        l.location_longitude
    ) <= ${radiusMiles}
ORDER BY distance_miles ASC;
```

#### 2. **Shipping Radius**
Validate if buyer is within seller's shipping radius:

```sql
CREATE OR REPLACE FUNCTION is_within_shipping_radius(
    p_listing_id INTEGER,
    p_buyer_lat DECIMAL,
    p_buyer_lon DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_listing marketplace_listings%ROWTYPE;
    v_distance DECIMAL;
BEGIN
    SELECT * INTO v_listing FROM marketplace_listings WHERE id = p_listing_id;

    -- No radius restriction
    IF v_listing.shipping_radius_miles IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Local pickup only
    IF v_listing.local_pickup_only THEN
        -- Must be within reasonable pickup distance (e.g., 25 miles)
        v_distance := calculate_distance_miles(
            v_listing.location_latitude,
            v_listing.location_longitude,
            p_buyer_lat,
            p_buyer_lon
        );
        RETURN v_distance <= 25;
    END IF;

    -- Check shipping radius
    v_distance := calculate_distance_miles(
        v_listing.location_latitude,
        v_listing.location_longitude,
        p_buyer_lat,
        p_buyer_lon
    );

    RETURN v_distance <= v_listing.shipping_radius_miles;
END;
$$ LANGUAGE plpgsql;
```

#### 3. **Location Privacy**
- Store exact coordinates for search
- Display only city/state to users
- Reveal exact address only after sale agreement
- Option to show "approximate location" (add random offset ±1 mile)

#### 4. **Geofencing for Categories**
```sql
-- Restrict certain categories to local only
CREATE TABLE marketplace_category_rules (
    category_id INTEGER PRIMARY KEY REFERENCES marketplace_categories(id),
    require_local_pickup BOOLEAN DEFAULT FALSE,
    max_shipping_radius INTEGER, -- Max miles for this category
    reasons TEXT -- Why restricted (e.g., "Heavy items", "Perishable")
);
```

#### 5. **Multi-Location Support**
For sellers with multiple locations:

```sql
CREATE TABLE marketplace_seller_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    name VARCHAR(100), -- "Main Warehouse", "Downtown Store"
    address TEXT,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),

    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link listings to specific locations
ALTER TABLE marketplace_listings
    ADD COLUMN seller_location_id INTEGER REFERENCES marketplace_seller_locations(id);
```

---

## Listing Types

### 1. Standard Sale Listings

**Features:**
- Fixed price or "make offer"
- Quantity available
- Immediate purchase
- Optional shipping
- Condition ratings

**User Flow:**
1. Seller creates listing with price, photos, description
2. Buyer browses, filters by distance/price/category
3. Buyer purchases or makes offer
4. Payment processed
5. Seller ships or arranges pickup
6. Both parties leave reviews

### 2. Raffle Listings

**Features:**
- Limited tickets (max 10,000)
- Fixed ticket price
- Minimum tickets to draw
- Provably fair drawing
- Automatic refunds if minimum not met
- Transparent winner selection

**User Flow:**
1. Seller creates raffle (item, ticket price, total tickets, end date)
2. Buyers purchase tickets (limit per user configurable)
3. System counts down to end time
4. If minimum met, automatic drawing occurs
5. Winner notified, item shipped
6. If minimum not met, all tickets refunded

**Drawing Algorithm:**
```javascript
// Provably fair raffle drawing
function drawRaffleWinner(raffleId) {
    const raffle = await getRaffle(raffleId);
    const tickets = await getAllTickets(raffleId);

    // Create deterministic seed
    const seed = crypto
        .createHash('sha256')
        .update(`${raffleId}-${raffle.end_time}-${tickets.length}`)
        .digest('hex');

    // Use seed to generate random number
    const rng = seedrandom(seed);
    const winningIndex = Math.floor(rng() * tickets.length);
    const winningTicket = tickets[winningIndex];

    // Save proof
    const proof = {
        seed,
        totalTickets: tickets.length,
        winningIndex,
        winningTicket: winningTicket.ticket_number,
        allTickets: tickets.map(t => t.ticket_number),
        timestamp: new Date().toISOString()
    };

    await saveDrawProof(raffleId, winningTicket, proof);
    return winningTicket;
}
```

### 3. Auction/Bidding Listings

**Features:**
- Time-based auctions
- Reserve price (hidden minimum)
- Proxy bidding (auto-bid up to max)
- Buy-it-now option
- Auto-extend if bid in last 5 minutes
- Bid history transparency

**User Flow:**
1. Seller creates auction (starting bid, duration, optional reserve/buy-now)
2. Buyers place bids (or set max proxy bid)
3. System auto-extends if activity in final minutes
4. Auction ends, highest bidder wins
5. Winner pays, item ships
6. Reviews exchanged

**Proxy Bidding Logic:**
```sql
-- Function to place bid with proxy support
CREATE OR REPLACE FUNCTION place_bid(
    p_auction_id INTEGER,
    p_user_id INTEGER,
    p_bid_amount DECIMAL,
    p_max_bid DECIMAL DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    current_bid DECIMAL,
    is_winning BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_auction marketplace_auctions%ROWTYPE;
    v_current_leading_bid marketplace_bids%ROWTYPE;
    v_actual_bid DECIMAL;
BEGIN
    -- Get auction
    SELECT * INTO v_auction FROM marketplace_auctions WHERE id = p_auction_id;

    -- Validation
    IF v_auction.status != 'active' THEN
        RETURN QUERY SELECT FALSE, v_auction.current_bid, FALSE, 'Auction not active';
        RETURN;
    END IF;

    IF p_bid_amount <= v_auction.current_bid THEN
        RETURN QUERY SELECT FALSE, v_auction.current_bid, FALSE, 'Bid must exceed current bid';
        RETURN;
    END IF;

    -- Get current leading bid with proxy
    SELECT * INTO v_current_leading_bid
    FROM marketplace_bids
    WHERE auction_id = p_auction_id AND is_winning = TRUE;

    -- Proxy bidding logic
    IF v_current_leading_bid.max_bid_amount IS NOT NULL THEN
        IF p_max_bid IS NULL THEN
            -- New bid vs proxy bid
            IF p_bid_amount <= v_current_leading_bid.max_bid_amount THEN
                -- Proxy outbids automatically
                v_actual_bid := p_bid_amount + v_auction.bid_increment;

                -- Update proxy bid to new amount
                UPDATE marketplace_bids SET is_winning = FALSE WHERE id = v_current_leading_bid.id;

                INSERT INTO marketplace_bids (
                    auction_id, user_id, bid_amount, is_winning, bid_type
                ) VALUES (
                    p_auction_id, v_current_leading_bid.user_id, v_actual_bid, TRUE, 'auto'
                );

                UPDATE marketplace_auctions
                SET current_bid = v_actual_bid, bid_count = bid_count + 1
                WHERE id = p_auction_id;

                RETURN QUERY SELECT FALSE, v_actual_bid, FALSE, 'Outbid by proxy';
                RETURN;
            END IF;
        END IF;
    END IF;

    -- Place new leading bid
    UPDATE marketplace_bids SET is_winning = FALSE WHERE auction_id = p_auction_id;

    INSERT INTO marketplace_bids (
        auction_id, user_id, bid_amount, max_bid_amount, is_winning, bid_type
    ) VALUES (
        p_auction_id, p_user_id, p_bid_amount, p_max_bid, TRUE,
        CASE WHEN p_max_bid IS NOT NULL THEN 'auto' ELSE 'manual' END
    );

    UPDATE marketplace_auctions
    SET
        current_bid = p_bid_amount,
        leading_bidder_id = p_user_id,
        bid_count = bid_count + 1
    WHERE id = p_auction_id;

    RETURN QUERY SELECT TRUE, p_bid_amount, TRUE, 'Bid placed successfully';
END;
$$ LANGUAGE plpgsql;
```

---

## Payment Integration

### Payment Processor Integration
- **Stripe** for credit/debit cards
- **PayPal** for alternative payment
- **Escrow** for high-value items
- **Cryptocurrency** (optional, future)

### Payment Flows

#### 1. Standard Purchase
```
Buyer → Pay → Stripe → Hold Funds → Seller Ships → Buyer Confirms → Release to Seller
```

#### 2. Raffle Tickets
```
Buyer → Pay for Ticket → Funds Held → Drawing → Winner: Ship Item / Losers: Nothing
If Min Not Met → Refund All
```

#### 3. Auction Win
```
Winner → Pay → Escrow → Seller Ships → Buyer Confirms → Release to Seller
If No Pay (48h) → Next Highest Bidder Offered
```

### Escrow System
```sql
CREATE TABLE marketplace_escrow (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES marketplace_transactions(id),

    amount DECIMAL(10,2) NOT NULL,

    status VARCHAR(20) DEFAULT 'held' CHECK (status IN (
        'held',      -- Funds held
        'released',  -- Released to seller
        'refunded',  -- Refunded to buyer
        'disputed'   -- In dispute
    )),

    held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,

    -- Dispute
    dispute_reason TEXT,
    dispute_resolution TEXT,
    resolved_by INTEGER REFERENCES users(id)
);
```

### Service Fees
```sql
-- Platform fee structure
CREATE TABLE marketplace_fee_structure (
    id SERIAL PRIMARY KEY,

    -- Fee Types
    fee_type VARCHAR(20) CHECK (fee_type IN (
        'sale',      -- Standard sale
        'raffle',    -- Raffle listing
        'auction'    -- Auction listing
    )),

    -- Calculation
    percentage DECIMAL(5,2), -- e.g., 5.00 for 5%
    flat_fee DECIMAL(10,2),  -- Fixed fee
    min_fee DECIMAL(10,2),   -- Minimum fee
    max_fee DECIMAL(10,2),   -- Maximum fee (cap)

    -- Tiers
    tier_name VARCHAR(50), -- "Basic", "Premium", "Featured"
    tier_benefits JSONB,

    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE,
    effective_until DATE
);

-- Calculate fee
CREATE OR REPLACE FUNCTION calculate_marketplace_fee(
    p_sale_amount DECIMAL,
    p_listing_type VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
    v_fee_structure marketplace_fee_structure%ROWTYPE;
    v_calculated_fee DECIMAL;
BEGIN
    SELECT * INTO v_fee_structure
    FROM marketplace_fee_structure
    WHERE fee_type = p_listing_type
        AND is_active = TRUE
        AND CURRENT_DATE BETWEEN effective_from AND COALESCE(effective_until, '2099-12-31')
    LIMIT 1;

    -- Calculate percentage + flat fee
    v_calculated_fee := (p_sale_amount * v_fee_structure.percentage / 100) +
                        COALESCE(v_fee_structure.flat_fee, 0);

    -- Apply min/max
    v_calculated_fee := GREATEST(v_calculated_fee, COALESCE(v_fee_structure.min_fee, 0));
    v_calculated_fee := LEAST(v_calculated_fee, COALESCE(v_fee_structure.max_fee, 999999));

    RETURN v_calculated_fee;
END;
$$ LANGUAGE plpgsql;
```

---

## Search & Discovery

### Search Architecture

#### 1. **PostgreSQL Full-Text Search**
For basic text searching:

```sql
-- Update search vector on insert/update
CREATE OR REPLACE FUNCTION update_listing_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.location_city, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.location_state, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_search
BEFORE INSERT OR UPDATE ON marketplace_listings
FOR EACH ROW EXECUTE FUNCTION update_listing_search_vector();
```

#### 2. **Elasticsearch Integration** (Recommended for scale)
Index structure:
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "integer" },
      "title": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": { "type": "text", "analyzer": "english" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "listing_type": { "type": "keyword" },
      "condition": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "city": { "type": "keyword" },
      "state": { "type": "keyword" },
      "created_at": { "type": "date" },
      "status": { "type": "keyword" }
    }
  }
}
```

Search query with filters:
```javascript
const searchListings = async (params) => {
    const {
        query,
        category,
        minPrice,
        maxPrice,
        condition,
        latitude,
        longitude,
        radius, // in miles
        listingType
    } = params;

    const must = [];
    const filter = [{ term: { status: 'active' } }];

    // Text search
    if (query) {
        must.push({
            multi_match: {
                query,
                fields: ['title^3', 'description'],
                fuzziness: 'AUTO'
            }
        });
    }

    // Filters
    if (category) filter.push({ term: { category } });
    if (listingType) filter.push({ term: { listing_type: listingType } });
    if (condition) filter.push({ term: { condition } });
    if (minPrice || maxPrice) {
        filter.push({
            range: {
                price: {
                    gte: minPrice || 0,
                    lte: maxPrice || 999999
                }
            }
        });
    }

    // Geolocation
    if (latitude && longitude && radius) {
        filter.push({
            geo_distance: {
                distance: `${radius}mi`,
                location: { lat: latitude, lon: longitude }
            }
        });
    }

    const result = await esClient.search({
        index: 'marketplace_listings',
        body: {
            query: {
                bool: { must, filter }
            },
            sort: [
                '_score',
                { created_at: 'desc' }
            ]
        }
    });

    return result.hits.hits.map(hit => hit._source);
};
```

### Discovery Features

#### 1. **Browse Categories**
Hierarchical category navigation with counts

#### 2. **Nearby Listings**
Auto-populate based on user's location

#### 3. **Trending/Popular**
Based on views, saves, recent activity:
```sql
SELECT
    l.*,
    (l.view_count * 0.3 + l.save_count * 0.5 + l.share_count * 0.2) AS popularity_score
FROM marketplace_listings l
WHERE l.status = 'active'
    AND l.created_at > NOW() - INTERVAL '7 days'
ORDER BY popularity_score DESC
LIMIT 20;
```

#### 4. **Personalized Recommendations**
Based on:
- Previously viewed categories
- Saved listings
- Location preferences
- Price range patterns

```sql
CREATE TABLE marketplace_user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),

    favorite_categories INTEGER[], -- Array of category IDs
    price_range_min DECIMAL(10,2),
    price_range_max DECIMAL(10,2),
    preferred_radius_miles INTEGER,

    -- ML features (for future)
    view_history JSONB, -- Category view counts
    search_history JSONB, -- Search terms

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Security & Fraud Prevention

### Fraud Detection

#### 1. **Suspicious Activity Monitoring**
```sql
CREATE TABLE marketplace_fraud_signals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    listing_id INTEGER REFERENCES marketplace_listings(id),

    signal_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    details JSONB,
    ip_address INET,

    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,

    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_signals_user ON marketplace_fraud_signals(user_id);
CREATE INDEX idx_fraud_signals_severity ON marketplace_fraud_signals(severity)
    WHERE is_resolved = FALSE;
```

**Signal Types:**
- `rapid_listing_creation` - Too many listings in short time
- `price_manipulation` - Repeatedly changing prices
- `shill_bidding` - Bidding on own auctions
- `multiple_accounts` - Same IP/device
- `fake_reviews` - Suspicious review patterns
- `payment_fraud` - Chargebacks, failed payments
- `location_spoofing` - GPS vs IP mismatch

#### 2. **Automated Checks**
```javascript
// Check for fraud signals before listing goes live
async function validateListing(listing, user) {
    const signals = [];

    // Check listing rate
    const recentListings = await countUserListings(user.id, '1 hour');
    if (recentListings > 10) {
        signals.push({
            type: 'rapid_listing_creation',
            severity: 'high',
            details: { count: recentListings }
        });
    }

    // Check for stolen images (reverse image search)
    for (const image of listing.images) {
        const isDuplicate = await reverseImageSearch(image);
        if (isDuplicate) {
            signals.push({
                type: 'duplicate_image',
                severity: 'medium',
                details: { imageUrl: image }
            });
        }
    }

    // Check price vs category average
    const avgPrice = await getCategoryAveragePrice(listing.category_id);
    if (listing.price < avgPrice * 0.3) {
        signals.push({
            type: 'suspiciously_low_price',
            severity: 'medium',
            details: { avgPrice, listingPrice: listing.price }
        });
    }

    // Check for banned keywords
    const bannedWords = await getBannedKeywords();
    const hasBanned = bannedWords.some(word =>
        listing.title.includes(word) || listing.description.includes(word)
    );
    if (hasBanned) {
        signals.push({
            type: 'banned_keywords',
            severity: 'critical'
        });
    }

    return signals;
}
```

#### 3. **Shill Bidding Detection**
```sql
-- Detect related bidders (same IP, same location, etc.)
CREATE OR REPLACE FUNCTION detect_shill_bidding(p_auction_id INTEGER)
RETURNS TABLE (
    suspicious BOOLEAN,
    reason TEXT,
    related_bidders INTEGER[]
) AS $$
DECLARE
    v_auction marketplace_auctions%ROWTYPE;
    v_seller_id INTEGER;
    v_related_ips TEXT[];
BEGIN
    SELECT a.*, l.user_id INTO v_auction, v_seller_id
    FROM marketplace_auctions a
    JOIN marketplace_listings l ON a.listing_id = l.id
    WHERE a.id = p_auction_id;

    -- Check if seller is bidding (direct)
    IF EXISTS (
        SELECT 1 FROM marketplace_bids
        WHERE auction_id = p_auction_id AND user_id = v_seller_id
    ) THEN
        RETURN QUERY SELECT
            TRUE,
            'Seller bidding on own auction',
            ARRAY[v_seller_id]::INTEGER[];
        RETURN;
    END IF;

    -- Check for bidders with same IP
    SELECT array_agg(DISTINCT ip_address::TEXT) INTO v_related_ips
    FROM marketplace_bids
    WHERE auction_id = p_auction_id
    GROUP BY ip_address
    HAVING COUNT(DISTINCT user_id) > 1;

    IF array_length(v_related_ips, 1) > 0 THEN
        RETURN QUERY SELECT
            TRUE,
            'Multiple bidders from same IP',
            ARRAY(
                SELECT DISTINCT user_id
                FROM marketplace_bids
                WHERE auction_id = p_auction_id
                    AND ip_address::TEXT = ANY(v_related_ips)
            );
        RETURN;
    END IF;

    RETURN QUERY SELECT FALSE, 'No suspicious activity detected', NULL::INTEGER[];
END;
$$ LANGUAGE plpgsql;
```

### Scam Prevention

#### 1. **Verification Badges**
```sql
CREATE TABLE marketplace_verifications (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),

    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verified_at TIMESTAMP,

    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,

    identity_verified BOOLEAN DEFAULT FALSE,
    identity_verified_at TIMESTAMP,
    identity_document_type VARCHAR(50),

    address_verified BOOLEAN DEFAULT FALSE,
    address_verified_at TIMESTAMP,

    business_verified BOOLEAN DEFAULT FALSE,
    business_name VARCHAR(200),
    business_tax_id VARCHAR(100),

    verification_score INTEGER DEFAULT 0, -- 0-100

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **Restricted Items**
```sql
CREATE TABLE marketplace_restricted_items (
    id SERIAL PRIMARY KEY,

    keyword VARCHAR(100) NOT NULL,
    category_id INTEGER REFERENCES marketplace_categories(id),

    restriction_type VARCHAR(20) CHECK (restriction_type IN (
        'banned',      -- Completely prohibited
        'restricted',  -- Requires verification
        'age_gated',   -- Requires age verification
        'local_only'   -- Must be local pickup
    )),

    reason TEXT,
    alternative_suggestion TEXT,

    is_active BOOLEAN DEFAULT TRUE
);

-- Examples:
-- Weapons: banned
-- Alcohol: age_gated + local_only
-- Medications: restricted
-- Adult content: age_gated
```

#### 3. **Content Moderation**
```sql
CREATE TABLE marketplace_reports (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES marketplace_listings(id),
    reporter_id INTEGER REFERENCES users(id),

    report_reason VARCHAR(50) CHECK (report_reason IN (
        'prohibited_item',
        'counterfeit',
        'misleading',
        'inappropriate_content',
        'scam',
        'spam',
        'wrong_category',
        'other'
    )),

    details TEXT,
    evidence_urls TEXT[], -- Screenshot URLs

    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'reviewing', 'action_taken', 'dismissed'
    )),

    -- Moderation
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    action_taken VARCHAR(50), -- removed, warned, banned, etc.
    moderator_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Listing Management

```javascript
// POST /api/marketplace/listings
// Create new listing
{
  title, description, category_id, listing_type,
  price?, quantity?, condition,
  location: { latitude, longitude, city, state },
  shipping: { available, cost, radius, local_pickup_only },
  images: [files],

  // Type-specific
  raffle?: { ticket_price, total_tickets, min_tickets, end_time },
  auction?: { starting_bid, reserve_price?, buy_now_price?, end_time }
}

// GET /api/marketplace/listings
// Search/browse listings
{
  query?, category?, listing_type?,
  minPrice?, maxPrice?, condition?,
  latitude?, longitude?, radius?,
  sortBy: 'recent' | 'price_low' | 'price_high' | 'distance' | 'popular',
  page, limit
}

// GET /api/marketplace/listings/:id
// Get listing details

// PUT /api/marketplace/listings/:id
// Update listing (seller only)

// DELETE /api/marketplace/listings/:id
// Delete listing (seller only)

// POST /api/marketplace/listings/:id/images
// Upload additional images
```

### Raffle Operations

```javascript
// POST /api/marketplace/raffles/:id/tickets
// Purchase raffle tickets
{
  quantity: 1-10,
  payment_method_id
}

// GET /api/marketplace/raffles/:id/tickets
// Get user's tickets for raffle

// GET /api/marketplace/raffles/:id/participants
// Get raffle participants (public)

// POST /api/marketplace/raffles/:id/draw
// Trigger raffle drawing (system/admin)
```

### Auction/Bidding

```javascript
// POST /api/marketplace/auctions/:id/bids
// Place bid
{
  bid_amount,
  max_bid_amount? // For proxy bidding
}

// GET /api/marketplace/auctions/:id/bids
// Get bid history (public, partial)

// GET /api/marketplace/auctions/:id/my-bids
// Get user's bids (private)

// POST /api/marketplace/auctions/:id/buy-now
// Use buy-it-now option
```

### Offers

```javascript
// POST /api/marketplace/listings/:id/offers
// Make an offer
{
  offer_amount,
  message?
}

// GET /api/marketplace/offers/sent
// Get sent offers

// GET /api/marketplace/offers/received
// Get received offers

// PUT /api/marketplace/offers/:id/accept
// Accept offer

// PUT /api/marketplace/offers/:id/reject
// Reject offer

// PUT /api/marketplace/offers/:id/counter
// Counter offer
{
  counter_amount,
  message?
}
```

### Transactions

```javascript
// POST /api/marketplace/listings/:id/purchase
// Direct purchase
{
  payment_method_id,
  shipping_address?,
  fulfillment_method: 'pickup' | 'shipping'
}

// GET /api/marketplace/transactions
// Get user transactions (buyer & seller)

// PUT /api/marketplace/transactions/:id/ship
// Mark as shipped (seller)
{
  tracking_number?,
  carrier?
}

// PUT /api/marketplace/transactions/:id/confirm-delivery
// Confirm delivery (buyer)

// POST /api/marketplace/transactions/:id/dispute
// Open dispute
{
  reason,
  details,
  evidence_urls
}
```

### Reviews

```javascript
// POST /api/marketplace/transactions/:id/review
// Leave review after transaction
{
  rating: 1-5,
  review_text?,
  communication_rating?,
  item_accuracy_rating?,
  shipping_speed_rating?
}

// GET /api/marketplace/users/:id/reviews
// Get seller reviews
```

### Saved/Watchlist

```javascript
// POST /api/marketplace/listings/:id/save
// Save listing

// DELETE /api/marketplace/saved/:id
// Remove saved listing

// GET /api/marketplace/saved
// Get saved listings
{
  folder?,
  sortBy?
}

// PUT /api/marketplace/saved/:id/alert
// Set price alert
{
  enabled: true,
  threshold: 50.00
}
```

### Seller Dashboard

```javascript
// GET /api/marketplace/seller/stats
// Get seller statistics

// GET /api/marketplace/seller/earnings
// Get earnings breakdown
{
  period: 'day' | 'week' | 'month' | 'year'
}

// GET /api/marketplace/seller/performance
// Get performance metrics
```

---

## Frontend Components

### Component Hierarchy

```
MarketplaceApp/
├── Pages/
│   ├── MarketplaceBrowsePage
│   │   ├── CategoryNav
│   │   ├── SearchBar
│   │   ├── FilterSidebar
│   │   └── ListingGrid
│   │       └── ListingCard
│   │
│   ├── ListingDetailPage
│   │   ├── ImageGallery
│   │   ├── ListingInfo
│   │   ├── SellerCard
│   │   ├── LocationMap
│   │   ├── ActionButtons
│   │   │   ├── BuyNowButton
│   │   │   ├── MakeOfferButton
│   │   │   ├── BidButton (auction)
│   │   │   └── BuyTicketButton (raffle)
│   │   └── RelatedListings
│   │
│   ├── CreateListingPage
│   │   ├── ListingTypeSelector
│   │   ├── BasicInfoForm
│   │   ├── ImageUploader
│   │   ├── LocationPicker
│   │   ├── ShippingOptions
│   │   ├── RaffleSettings (if raffle)
│   │   ├── AuctionSettings (if auction)
│   │   └── PreviewCard
│   │
│   ├── RaffleDetailPage
│   │   ├── RaffleInfo
│   │   ├── TicketProgress
│   │   ├── ParticipantsList
│   │   ├── CountdownTimer
│   │   ├── BuyTicketsModal
│   │   └── DrawingAnimation
│   │
│   ├── AuctionDetailPage
│   │   ├── AuctionInfo
│   │   ├── CurrentBid
│   │   ├── BidHistory
│   │   ├── CountdownTimer
│   │   ├── PlaceBidModal
│   │   └── BuyNowButton
│   │
│   ├── SellerDashboardPage
│   │   ├── StatsOverview
│   │   ├── ActiveListings
│   │   ├── PendingOrders
│   │   ├── RevenueChart
│   │   └── PerformanceMetrics
│   │
│   ├── MyPurchasesPage
│   │   ├── OrdersList
│   │   ├── OrderDetails
│   │   └── TrackingInfo
│   │
│   └── SavedListingsPage
│       ├── FolderNav
│       ├── SavedGrid
│       └── PriceAlerts
│
├── Components/
│   ├── Shared/
│   │   ├── PriceDisplay
│   │   ├── DistanceIndicator
│   │   ├── ConditionBadge
│   │   ├── ListingTypeBadge
│   │   ├── VerificationBadge
│   │   └── RatingStars
│   │
│   ├── Search/
│   │   ├── SearchBar
│   │   ├── FilterPanel
│   │   ├── SortDropdown
│   │   └── LocationFilter
│   │
│   ├── Listing/
│   │   ├── ListingCard
│   │   ├── ImageGallery
│   │   ├── ShareButton
│   │   ├── SaveButton
│   │   └── ReportButton
│   │
│   ├── Raffle/
│   │   ├── TicketProgress
│   │   ├── CountdownTimer
│   │   ├── BuyTicketsForm
│   │   ├── MyTickets
│   │   └── WinnerAnnouncement
│   │
│   ├── Auction/
│   │   ├── BidForm
│   │   ├── BidHistory
│   │   ├── ProxyBidToggle
│   │   ├── CurrentBid
│   │   └── AuctionTimer
│   │
│   ├── Transaction/
│   │   ├── CheckoutForm
│   │   ├── PaymentMethod
│   │   ├── ShippingForm
│   │   ├── OrderSummary
│   │   └── TrackingDisplay
│   │
│   └── Messaging/
│       ├── MessageThread
│       ├── MessageComposer
│       └── QuickReplyButtons
│
└── Hooks/
    ├── useListings
    ├── useRaffle
    ├── useAuction
    ├── useGeolocation
    ├── useNearbyListings
    ├── useSellerStats
    └── useRealTimeBids
```

### Key Features to Implement

#### 1. **Real-Time Updates (WebSocket)**
```javascript
// useRealTimeBids hook
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useRealTimeBids(auctionId) {
    const [currentBid, setCurrentBid] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);

    useEffect(() => {
        const socket = io(`${API_URL}/marketplace`);

        socket.emit('join_auction', auctionId);

        socket.on('new_bid', (bid) => {
            setCurrentBid(bid);
            setBidHistory(prev => [bid, ...prev]);
        });

        socket.on('auction_extended', (newEndTime) => {
            // Update countdown
        });

        socket.on('auction_ended', (winner) => {
            // Show winner
        });

        return () => socket.disconnect();
    }, [auctionId]);

    return { currentBid, bidHistory };
}
```

#### 2. **Geolocation Integration**
```javascript
// useNearbyListings hook
export function useNearbyListings(radius = 25) {
    const [location, setLocation] = useState(null);
    const [listings, setListings] = useState([]);

    useEffect(() => {
        // Get user location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            (error) => {
                // Fallback to IP geolocation
                fetch('https://ipapi.co/json/')
                    .then(res => res.json())
                    .then(data => setLocation({
                        lat: data.latitude,
                        lon: data.longitude
                    }));
            }
        );
    }, []);

    useEffect(() => {
        if (location) {
            fetchNearbyListings(location.lat, location.lon, radius)
                .then(setListings);
        }
    }, [location, radius]);

    return { location, listings };
}
```

#### 3. **Interactive Map**
```javascript
// LocationMap component
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';

export function LocationMap({ listing, showExactLocation = false }) {
    const position = showExactLocation
        ? [listing.location_latitude, listing.location_longitude]
        : [listing.approximate_lat, listing.approximate_lon]; // ±1 mile offset

    return (
        <MapContainer center={position} zoom={13}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {showExactLocation ? (
                <Marker position={position} />
            ) : (
                <Circle
                    center={position}
                    radius={1609} // 1 mile in meters
                    fillColor="blue"
                    fillOpacity={0.3}
                />
            )}

            {listing.shipping_radius_miles && (
                <Circle
                    center={position}
                    radius={listing.shipping_radius_miles * 1609}
                    fillColor="green"
                    fillOpacity={0.1}
                />
            )}
        </MapContainer>
    );
}
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Core marketplace with standard listings

**Database:**
- Create core tables (listings, categories, media, transactions)
- Set up geolocation integration
- Create initial indexes

**Backend:**
- Listing CRUD endpoints
- Category management
- Image upload
- Basic search (PostgreSQL full-text)
- Geolocation distance filtering

**Frontend:**
- Browse page with grid
- Listing detail page
- Create listing form
- Basic search and filters
- Category navigation

**Testing:**
- Create 100 sample listings
- Test geolocation search
- Test image uploads

### Phase 2: Offers & Transactions (Weeks 3-4)
**Goal:** Complete buying/selling flow

**Database:**
- marketplace_offers
- marketplace_saved_listings
- marketplace_seller_stats

**Backend:**
- Make offer endpoints
- Accept/reject/counter offers
- Purchase flow
- Payment integration (Stripe)
- Transaction management

**Frontend:**
- Make offer modal
- Offer management page
- Checkout flow
- Payment forms
- Order tracking

**Testing:**
- Complete end-to-end purchase
- Test offer negotiation
- Test payment processing

### Phase 3: Raffle System (Weeks 5-6)
**Goal:** Fully functional raffle system

**Database:**
- marketplace_raffles
- marketplace_raffle_tickets

**Backend:**
- Raffle creation
- Ticket purchase
- Drawing algorithm (provably fair)
- Scheduled jobs for auto-drawing
- Refund logic

**Frontend:**
- Raffle listing page
- Ticket purchase flow
- Countdown timer
- Participant list
- Winner announcement
- My tickets page

**Testing:**
- Create test raffles
- Simulate ticket purchases
- Test drawing algorithm
- Verify refund logic

### Phase 4: Auction System (Weeks 7-8)
**Goal:** Live bidding with proxy support

**Database:**
- marketplace_auctions
- marketplace_bids

**Backend:**
- Auction creation
- Bid placement (with proxy logic)
- Auto-extend logic
- WebSocket for real-time updates
- Auction ending job

**Frontend:**
- Auction detail page
- Bid form with proxy option
- Real-time bid updates
- Bid history
- Auto-extend notifications
- Winner notification

**Testing:**
- Multiple concurrent bidders
- Proxy bidding scenarios
- Auto-extend edge cases
- High-volume bid testing

### Phase 5: Reviews & Ratings (Week 9)
**Goal:** Trust and reputation system

**Database:**
- marketplace_reviews
- Update seller_stats

**Backend:**
- Review submission
- Seller rating aggregation
- Review moderation
- Fraud detection

**Frontend:**
- Review form
- Seller profile with ratings
- Review display
- Rating filters

**Testing:**
- Submit reviews
- Test rating calculations
- Test fraud detection

### Phase 6: Advanced Search (Week 10)
**Goal:** Elasticsearch integration

**Backend:**
- Elasticsearch setup
- Index listings
- Advanced search API
- Faceted filtering

**Frontend:**
- Enhanced filters
- Search suggestions
- Saved searches
- Price alerts

**Testing:**
- Search performance
- Complex filter combinations
- Large dataset testing

### Phase 7: Security & Fraud (Week 11)
**Goal:** Comprehensive safety measures

**Database:**
- marketplace_fraud_signals
- marketplace_verifications
- marketplace_reports

**Backend:**
- Fraud detection algorithms
- Shill bidding detection
- Content moderation tools
- Verification system

**Frontend:**
- Report listing UI
- Verification badges
- Trust indicators
- Safety tips

**Testing:**
- Fraud scenario simulation
- Moderation workflow
- Verification process

### Phase 8: Messaging & Polish (Week 12)
**Goal:** Launch-ready product

**Backend:**
- Messaging system
- Notifications
- Email alerts
- Performance optimization

**Frontend:**
- In-app messaging
- Notification center
- Mobile responsiveness
- Performance optimization
- A/B testing setup

**Testing:**
- Load testing
- Security audit
- User acceptance testing
- Bug fixes

---

## Testing Strategy

### Unit Tests
```javascript
// Example: Raffle drawing test
describe('Raffle Drawing', () => {
    it('should select winner fairly', async () => {
        const raffle = await createTestRaffle({
            totalTickets: 100,
            ticketsSold: 100
        });

        const winner = await drawRaffleWinner(raffle.id);

        expect(winner).toBeDefined();
        expect(winner.ticket_number).toBeGreaterThanOrEqual(1);
        expect(winner.ticket_number).toBeLessThanOrEqual(100);
    });

    it('should refund if minimum not met', async () => {
        const raffle = await createTestRaffle({
            totalTickets: 100,
            minTicketsRequired: 50,
            ticketsSold: 30
        });

        await attemptDraw(raffle.id);

        const status = await getRaffleStatus(raffle.id);
        expect(status).toBe('failed');

        const tickets = await getRaffleTickets(raffle.id);
        tickets.forEach(ticket => {
            expect(ticket.payment_status).toBe('refunded');
        });
    });
});
```

### Integration Tests
- End-to-end purchase flow
- Offer negotiation
- Bid placement and outbidding
- Raffle drawing process
- Payment processing

### Performance Tests
- 10,000 concurrent users browsing
- 1,000 simultaneous bids on same auction
- Geolocation search with 1M listings
- Real-time WebSocket scalability

### Security Tests
- SQL injection attempts
- XSS attacks
- CSRF protection
- Rate limiting
- Payment security

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Business Metrics
- **GMV (Gross Merchandise Value)**: Total value of transactions
- **Take Rate**: Platform fee percentage
- **Active Listings**: Number of active listings
- **Conversion Rate**: Visitors to buyers
- **Average Order Value (AOV)**
- **Repeat Purchase Rate**

#### User Metrics
- **Daily Active Users (DAU)**
- **Monthly Active Users (MAU)**
- **Seller Growth Rate**
- **Buyer Growth Rate**
- **Listing Creation Rate**
- **Average Session Duration**

#### Engagement Metrics
- **Search-to-View Rate**: Searches leading to listing views
- **View-to-Save Rate**: Views leading to saves
- **Save-to-Purchase Rate**: Saves leading to purchases
- **Offer Acceptance Rate**
- **Raffle Participation Rate**
- **Auction Completion Rate**

#### Quality Metrics
- **Average Seller Rating**
- **Transaction Dispute Rate**
- **Fraud Detection Rate**
- **Listing Removal Rate**
- **Customer Support Tickets**

#### Technical Metrics
- **Search Response Time** (< 200ms)
- **Page Load Time** (< 2s)
- **API Uptime** (99.9%)
- **WebSocket Latency** (< 100ms)
- **Payment Success Rate** (> 98%)

---

## Risk Mitigation

### Technical Risks

**Risk:** Geolocation inaccuracy
- **Mitigation:** Multiple location sources (GPS, IP, manual)
- **Fallback:** Allow manual address entry

**Risk:** Payment fraud
- **Mitigation:** Escrow system, fraud detection, verification
- **Fallback:** Manual review for high-value items

**Risk:** Scalability issues
- **Mitigation:** Elasticsearch, caching, CDN
- **Fallback:** Graceful degradation, queue systems

**Risk:** Real-time failures (bidding)
- **Mitigation:** WebSocket with polling fallback
- **Fallback:** Batch updates every 5 seconds

### Business Risks

**Risk:** Low seller adoption
- **Mitigation:** Zero fees for first month, seller support
- **Strategy:** Recruit power sellers from other platforms

**Risk:** Scams and fraud
- **Mitigation:** Verification system, escrow, reviews
- **Strategy:** Strong moderation team

**Risk:** Legal compliance
- **Mitigation:** Terms of service, age verification, restricted items
- **Strategy:** Legal review, local compliance

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
1. **AI-Powered Pricing** - Suggest optimal prices based on market
2. **Smart Contracts** - Blockchain-based escrow for high-value items
3. **AR/VR Preview** - 3D models of items in buyer's space
4. **Bulk Listing Tools** - CSV import, inventory management
5. **Shipping Integration** - Auto-calculate shipping, print labels
6. **Multi-Currency** - International transactions
7. **Subscription Tiers** - Premium seller features
8. **Analytics Dashboard** - Detailed seller insights
9. **Mobile Apps** - Native iOS/Android
10. **Social Integration** - Share to Facebook, Instagram

### Advanced Features
- **Group Buying** - Discounts for multiple buyers
- **Trade-In System** - Exchange items
- **Rental/Leasing** - Temporary item rental
- **Services Marketplace** - Sell services, not just goods
- **NFT Integration** - Digital collectibles
- **Crypto Payments** - Bitcoin, Ethereum acceptance

---

## Conclusion

This marketplace system is designed to be:

✅ **Comprehensive** - Supports sale, raffle, auction models
✅ **Location-Aware** - Geolocation integrated throughout
✅ **Secure** - Multi-layered fraud prevention
✅ **Scalable** - Elasticsearch, caching, WebSockets
✅ **User-Friendly** - Intuitive flows for buyers and sellers
✅ **Profitable** - Clear monetization through fees

### Next Steps

1. **Review this plan** with stakeholders
2. **Finalize requirements** and priorities
3. **Set up development environment**
4. **Begin Phase 1** implementation
5. **Iterate based on feedback**

**Estimated Timeline:** 12 weeks for MVP
**Team Size:** 2-3 developers + 1 designer + 1 QA
**Budget Considerations:** Payment processing fees, Elasticsearch hosting, WebSocket infrastructure

---

**Document Status:** ✅ Complete - Ready for Review
**Last Updated:** October 16, 2025
**Version:** 1.0
