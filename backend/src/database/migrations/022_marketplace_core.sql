-- Marketplace System - Core Tables
-- Migration 022: marketplace_categories, marketplace_listings, marketplace_media, marketplace_transactions

-- ============================================================================
-- 1. MARKETPLACE CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES marketplace_categories(id) ON DELETE CASCADE,
    description TEXT,
    icon_url VARCHAR(500),

    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    listing_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_categories_parent ON marketplace_categories(parent_id);
CREATE INDEX idx_marketplace_categories_slug ON marketplace_categories(slug);
CREATE INDEX idx_marketplace_categories_active ON marketplace_categories(is_active);

-- ============================================================================
-- 2. MARKETPLACE LISTINGS (Main table for all marketplace items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_listings (
    id SERIAL PRIMARY KEY,

    -- Ownership
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Info
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES marketplace_categories(id) ON DELETE SET NULL,

    -- Listing Type
    listing_type VARCHAR(20) NOT NULL DEFAULT 'sale' CHECK (listing_type IN ('sale', 'raffle', 'auction')),

    -- Pricing (varies by type)
    price DECIMAL(10,2),
    original_price DECIMAL(10,2),

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
    pickup_address TEXT,

    -- Shipping
    shipping_available BOOLEAN DEFAULT FALSE,
    shipping_cost DECIMAL(10,2),
    shipping_radius_miles INTEGER,
    local_pickup_only BOOLEAN DEFAULT TRUE,

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'active', 'sold', 'expired', 'removed', 'suspended'
    )),

    -- Metadata
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Moderation
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_count INTEGER DEFAULT 0,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    sold_at TIMESTAMP,

    -- Search optimization
    search_vector TSVECTOR,

    CONSTRAINT valid_sale_price CHECK (
        (listing_type = 'sale' AND price > 0) OR
        (listing_type != 'sale')
    )
);

-- Indexes for marketplace_listings
CREATE INDEX idx_marketplace_listings_user ON marketplace_listings(user_id);
CREATE INDEX idx_marketplace_listings_category ON marketplace_listings(category_id);
CREATE INDEX idx_marketplace_listings_type ON marketplace_listings(listing_type);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_location ON marketplace_listings(location_latitude, location_longitude);
CREATE INDEX idx_marketplace_listings_created ON marketplace_listings(created_at DESC);
CREATE INDEX idx_marketplace_listings_price ON marketplace_listings(price) WHERE status = 'active';
CREATE INDEX idx_marketplace_search ON marketplace_listings USING GIN(search_vector);
CREATE INDEX idx_marketplace_geo ON marketplace_listings(location_latitude, location_longitude) WHERE status = 'active';

-- Trigger to update search vector
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

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_listing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_timestamp
BEFORE UPDATE ON marketplace_listings
FOR EACH ROW EXECUTE FUNCTION update_marketplace_listing_timestamp();

-- ============================================================================
-- 3. MARKETPLACE MEDIA (Images and videos for listings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_media (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,

    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,

    -- Image specific
    width INTEGER,
    height INTEGER,
    thumbnail_url VARCHAR(500),

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_media_listing ON marketplace_media(listing_id);
CREATE INDEX idx_marketplace_media_primary ON marketplace_media(listing_id, is_primary);

-- ============================================================================
-- 4. MARKETPLACE TRANSACTIONS (Completed purchases/sales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_transactions (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id),

    -- Parties
    seller_id INTEGER NOT NULL REFERENCES users(id),
    buyer_id INTEGER NOT NULL REFERENCES users(id),

    -- Transaction Type
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'direct_sale', 'raffle_win', 'auction_win', 'offer_accepted'
    )),

    -- Pricing
    sale_price DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    service_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Payment
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),
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
        'pending', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled'
    )),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT different_parties CHECK (seller_id != buyer_id)
);

CREATE INDEX idx_marketplace_transactions_listing ON marketplace_transactions(listing_id);
CREATE INDEX idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX idx_marketplace_transactions_status ON marketplace_transactions(status);
CREATE INDEX idx_marketplace_transactions_created ON marketplace_transactions(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE TRIGGER trigger_update_transaction_timestamp
BEFORE UPDATE ON marketplace_transactions
FOR EACH ROW EXECUTE FUNCTION update_marketplace_listing_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE marketplace_categories IS 'Hierarchical category system for marketplace listings';
COMMENT ON TABLE marketplace_listings IS 'Main table for all marketplace items (sale, raffle, auction)';
COMMENT ON TABLE marketplace_media IS 'Images and videos for marketplace listings';
COMMENT ON TABLE marketplace_transactions IS 'Completed purchases and sales';

COMMENT ON COLUMN marketplace_listings.listing_type IS 'Type of listing: sale (standard), raffle, or auction';
COMMENT ON COLUMN marketplace_listings.search_vector IS 'Auto-generated full-text search vector';
COMMENT ON COLUMN marketplace_listings.location_latitude IS 'Exact latitude for distance calculations';
COMMENT ON COLUMN marketplace_listings.location_longitude IS 'Exact longitude for distance calculations';
