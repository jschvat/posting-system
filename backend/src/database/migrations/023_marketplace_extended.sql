-- Marketplace System - Extended Tables
-- Migration 023: saved_listings, seller_stats, offers, reviews

-- ============================================================================
-- 1. MARKETPLACE SAVED LISTINGS (User favorites/watchlist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_saved_listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

    -- Organization
    folder VARCHAR(100),
    notes TEXT,

    -- Alerts
    price_alert_enabled BOOLEAN DEFAULT FALSE,
    price_alert_threshold DECIMAL(10,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_marketplace_saved_user ON marketplace_saved_listings(user_id);
CREATE INDEX idx_marketplace_saved_listing ON marketplace_saved_listings(listing_id);
CREATE INDEX idx_marketplace_saved_alerts ON marketplace_saved_listings(user_id)
    WHERE price_alert_enabled = TRUE;

-- ============================================================================
-- 2. MARKETPLACE SELLER STATS (Denormalized seller statistics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_seller_stats (
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
    average_response_time INTEGER,
    response_rate DECIMAL(5,2) DEFAULT 0,

    -- Completion Metrics
    completion_rate DECIMAL(5,2) DEFAULT 0,
    cancellation_rate DECIMAL(5,2) DEFAULT 0,
    dispute_rate DECIMAL(5,2) DEFAULT 0,

    -- Badges/Achievements
    badges JSONB DEFAULT '[]',
    seller_level VARCHAR(20) DEFAULT 'new' CHECK (seller_level IN (
        'new', 'bronze', 'silver', 'gold', 'platinum'
    )),

    -- Timestamps
    first_sale_at TIMESTAMP,
    last_sale_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_seller_stats_rating ON marketplace_seller_stats(average_rating DESC);
CREATE INDEX idx_marketplace_seller_stats_level ON marketplace_seller_stats(seller_level);
CREATE INDEX idx_marketplace_seller_stats_sales ON marketplace_seller_stats(total_sales DESC);

-- ============================================================================
-- 3. MARKETPLACE OFFERS (Make-an-offer system for sale listings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_offers (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Offer Details
    offer_amount DECIMAL(10,2) NOT NULL CHECK (offer_amount > 0),
    message TEXT,

    -- Counter Offer
    counter_amount DECIMAL(10,2),
    counter_message TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'countered',
        'counter_accepted', 'counter_rejected', 'expired', 'withdrawn'
    )),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT different_users CHECK (buyer_id != seller_id)
);

CREATE INDEX idx_marketplace_offers_listing ON marketplace_offers(listing_id);
CREATE INDEX idx_marketplace_offers_buyer ON marketplace_offers(buyer_id);
CREATE INDEX idx_marketplace_offers_seller ON marketplace_offers(seller_id);
CREATE INDEX idx_marketplace_offers_status ON marketplace_offers(status);
CREATE INDEX idx_marketplace_offers_expires ON marketplace_offers(expires_at)
    WHERE status = 'pending';

-- ============================================================================
-- 4. MARKETPLACE REVIEWS (Buyer-seller ratings after transactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_reviews (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT different_users CHECK (reviewer_id != reviewee_id),
    UNIQUE(transaction_id, reviewer_id)
);

CREATE INDEX idx_marketplace_reviews_transaction ON marketplace_reviews(transaction_id);
CREATE INDEX idx_marketplace_reviews_reviewee ON marketplace_reviews(reviewee_id);
CREATE INDEX idx_marketplace_reviews_reviewer ON marketplace_reviews(reviewer_id);
CREATE INDEX idx_marketplace_reviews_rating ON marketplace_reviews(rating);
CREATE INDEX idx_marketplace_reviews_created ON marketplace_reviews(created_at DESC);

-- ============================================================================
-- 5. MARKETPLACE REPORTS (Content moderation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_reports (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    report_reason VARCHAR(50) CHECK (report_reason IN (
        'prohibited_item', 'counterfeit', 'misleading', 'inappropriate_content',
        'scam', 'spam', 'wrong_category', 'other'
    )),

    details TEXT,
    evidence_urls TEXT[],

    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'reviewing', 'action_taken', 'dismissed'
    )),

    -- Moderation
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    action_taken VARCHAR(50),
    moderator_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_reports_listing ON marketplace_reports(listing_id);
CREATE INDEX idx_marketplace_reports_reporter ON marketplace_reports(reporter_id);
CREATE INDEX idx_marketplace_reports_status ON marketplace_reports(status);
CREATE INDEX idx_marketplace_reports_pending ON marketplace_reports(created_at DESC)
    WHERE status = 'pending';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update save_count on marketplace_listings when items are saved
CREATE OR REPLACE FUNCTION update_listing_save_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE marketplace_listings
        SET save_count = save_count + 1
        WHERE id = NEW.listing_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE marketplace_listings
        SET save_count = save_count - 1
        WHERE id = OLD.listing_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_save_count
AFTER INSERT OR DELETE ON marketplace_saved_listings
FOR EACH ROW EXECUTE FUNCTION update_listing_save_count();

-- Trigger to update category listing_count
CREATE OR REPLACE FUNCTION update_category_listing_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE marketplace_categories
        SET listing_count = listing_count + 1
        WHERE id = NEW.category_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE marketplace_categories
            SET listing_count = listing_count + 1
            WHERE id = NEW.category_id;
        ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE marketplace_categories
            SET listing_count = listing_count - 1
            WHERE id = OLD.category_id;
        END IF;
        -- Handle category change
        IF OLD.category_id != NEW.category_id AND NEW.status = 'active' THEN
            UPDATE marketplace_categories
            SET listing_count = listing_count - 1
            WHERE id = OLD.category_id;
            UPDATE marketplace_categories
            SET listing_count = listing_count + 1
            WHERE id = NEW.category_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE marketplace_categories
        SET listing_count = listing_count - 1
        WHERE id = OLD.category_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_count
AFTER INSERT OR UPDATE OR DELETE ON marketplace_listings
FOR EACH ROW EXECUTE FUNCTION update_category_listing_count();

-- Trigger to update seller active_listings count
CREATE OR REPLACE FUNCTION update_seller_active_listings()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        INSERT INTO marketplace_seller_stats (user_id, active_listings)
        VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET active_listings = marketplace_seller_stats.active_listings + 1;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE marketplace_seller_stats
            SET active_listings = active_listings + 1
            WHERE user_id = NEW.user_id;
        ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE marketplace_seller_stats
            SET active_listings = active_listings - 1
            WHERE user_id = NEW.user_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE marketplace_seller_stats
        SET active_listings = active_listings - 1
        WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_active_listings
AFTER INSERT OR UPDATE OR DELETE ON marketplace_listings
FOR EACH ROW EXECUTE FUNCTION update_seller_active_listings();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE marketplace_saved_listings IS 'User favorites and watchlist with price alerts';
COMMENT ON TABLE marketplace_seller_stats IS 'Denormalized seller performance metrics and ratings';
COMMENT ON TABLE marketplace_offers IS 'Make-an-offer negotiation system for listings';
COMMENT ON TABLE marketplace_reviews IS 'Transaction reviews and ratings for buyers and sellers';
COMMENT ON TABLE marketplace_reports IS 'User-reported content for moderation';
