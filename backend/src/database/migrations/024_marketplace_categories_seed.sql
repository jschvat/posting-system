-- Marketplace Categories - Seed Data
-- Migration 024: Initial category structure

-- ============================================================================
-- ROOT CATEGORIES
-- ============================================================================

INSERT INTO marketplace_categories (name, slug, parent_id, description, display_order, is_active)
VALUES
    ('Electronics', 'electronics', NULL, 'Phones, computers, gaming, cameras, and electronic accessories', 1, TRUE),
    ('Vehicles', 'vehicles', NULL, 'Cars, motorcycles, boats, RVs, and vehicle parts', 2, TRUE),
    ('Home & Garden', 'home-garden', NULL, 'Furniture, appliances, tools, and garden equipment', 3, TRUE),
    ('Clothing & Accessories', 'clothing-accessories', NULL, 'Mens, womens, kids clothing, shoes, and accessories', 4, TRUE),
    ('Sports & Outdoors', 'sports-outdoors', NULL, 'Sporting goods, outdoor gear, bikes, and fitness equipment', 5, TRUE),
    ('Collectibles & Art', 'collectibles-art', NULL, 'Antiques, collectibles, art, and vintage items', 6, TRUE),
    ('Toys & Games', 'toys-games', NULL, 'Toys, video games, board games, and hobby items', 7, TRUE),
    ('Books & Media', 'books-media', NULL, 'Books, movies, music, and magazines', 8, TRUE),
    ('Pet Supplies', 'pet-supplies', NULL, 'Pet food, accessories, and pet care items', 9, TRUE),
    ('Baby & Kids', 'baby-kids', NULL, 'Baby gear, kids furniture, and childrens items', 10, TRUE),
    ('Health & Beauty', 'health-beauty', NULL, 'Cosmetics, skincare, health products, and wellness items', 11, TRUE),
    ('Office & Business', 'office-business', NULL, 'Office supplies, business equipment, and commercial items', 12, TRUE),
    ('Musical Instruments', 'musical-instruments', NULL, 'Guitars, pianos, drums, and music equipment', 13, TRUE),
    ('Tools & Equipment', 'tools-equipment', NULL, 'Power tools, hand tools, and construction equipment', 14, TRUE),
    ('Free Stuff', 'free-stuff', NULL, 'Free items, giveaways, and community sharing', 15, TRUE),
    ('Other', 'other', NULL, 'Everything else that doesn''t fit in other categories', 99, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- ELECTRONICS SUBCATEGORIES
-- ============================================================================

INSERT INTO marketplace_categories (name, slug, parent_id, description, display_order, is_active)
SELECT 'Cell Phones', 'cell-phones', id, 'Smartphones, flip phones, and mobile devices', 1, TRUE
FROM marketplace_categories WHERE slug = 'electronics'
UNION ALL
SELECT 'Computers & Laptops', 'computers-laptops', id, 'Desktop computers, laptops, and tablets', 2, TRUE
FROM marketplace_categories WHERE slug = 'electronics'
UNION ALL
SELECT 'Computer Parts', 'computer-parts', id, 'RAM, CPUs, graphics cards, and PC components', 3, TRUE
FROM marketplace_categories WHERE slug = 'electronics'
UNION ALL
SELECT 'Video Gaming', 'video-gaming', id, 'Consoles, games, controllers, and gaming accessories', 4, TRUE
FROM marketplace_categories WHERE slug = 'electronics'
UNION ALL
SELECT 'TVs & Monitors', 'tvs-monitors', id, 'Televisions, computer monitors, and displays', 5, TRUE
FROM marketplace_categories WHERE slug = 'electronics'
UNION ALL
SELECT 'Cameras & Photo', 'cameras-photo', id, 'Digital cameras, DSLRs, lenses, and photography equipment', 6, TRUE
FROM marketplace_categories WHERE slug = 'electronics'
UNION ALL
SELECT 'Audio Equipment', 'audio-equipment', id, 'Speakers, headphones, microphones, and sound systems', 7, TRUE
FROM marketplace_categories WHERE slug = 'electronics'
UNION ALL
SELECT 'Smart Home', 'smart-home', id, 'Smart speakers, home automation, security systems', 8, TRUE
FROM marketplace_categories WHERE slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- VEHICLES SUBCATEGORIES
-- ============================================================================

INSERT INTO marketplace_categories (name, slug, parent_id, description, display_order, is_active)
SELECT 'Cars & Trucks', 'cars-trucks', id, 'Sedans, SUVs, trucks, and passenger vehicles', 1, TRUE
FROM marketplace_categories WHERE slug = 'vehicles'
UNION ALL
SELECT 'Motorcycles', 'motorcycles', id, 'Street bikes, cruisers, dirt bikes, and scooters', 2, TRUE
FROM marketplace_categories WHERE slug = 'vehicles'
UNION ALL
SELECT 'Boats & Watercraft', 'boats-watercraft', id, 'Boats, jet skis, kayaks, and marine equipment', 3, TRUE
FROM marketplace_categories WHERE slug = 'vehicles'
UNION ALL
SELECT 'RVs & Campers', 'rvs-campers', id, 'Motorhomes, travel trailers, and camping vehicles', 4, TRUE
FROM marketplace_categories WHERE slug = 'vehicles'
UNION ALL
SELECT 'Auto Parts', 'auto-parts', id, 'Car parts, accessories, and automotive supplies', 5, TRUE
FROM marketplace_categories WHERE slug = 'vehicles'
UNION ALL
SELECT 'ATVs & UTVs', 'atvs-utvs', id, 'All-terrain vehicles and utility vehicles', 6, TRUE
FROM marketplace_categories WHERE slug = 'vehicles'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- HOME & GARDEN SUBCATEGORIES
-- ============================================================================

INSERT INTO marketplace_categories (name, slug, parent_id, description, display_order, is_active)
SELECT 'Furniture', 'furniture', id, 'Sofas, beds, tables, chairs, and home furniture', 1, TRUE
FROM marketplace_categories WHERE slug = 'home-garden'
UNION ALL
SELECT 'Appliances', 'appliances', id, 'Refrigerators, washers, dryers, and kitchen appliances', 2, TRUE
FROM marketplace_categories WHERE slug = 'home-garden'
UNION ALL
SELECT 'Home Decor', 'home-decor', id, 'Decorations, wall art, rugs, and interior design items', 3, TRUE
FROM marketplace_categories WHERE slug = 'home-garden'
UNION ALL
SELECT 'Kitchen & Dining', 'kitchen-dining', id, 'Cookware, dishes, utensils, and kitchen supplies', 4, TRUE
FROM marketplace_categories WHERE slug = 'home-garden'
UNION ALL
SELECT 'Garden & Outdoor', 'garden-outdoor', id, 'Plants, patio furniture, gardening tools, and outdoor items', 5, TRUE
FROM marketplace_categories WHERE slug = 'home-garden'
UNION ALL
SELECT 'Home Improvement', 'home-improvement', id, 'Building materials, hardware, and renovation supplies', 6, TRUE
FROM marketplace_categories WHERE slug = 'home-garden'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- CLOTHING & ACCESSORIES SUBCATEGORIES
-- ============================================================================

INSERT INTO marketplace_categories (name, slug, parent_id, description, display_order, is_active)
SELECT 'Mens Clothing', 'mens-clothing', id, 'Mens shirts, pants, jackets, and formal wear', 1, TRUE
FROM marketplace_categories WHERE slug = 'clothing-accessories'
UNION ALL
SELECT 'Womens Clothing', 'womens-clothing', id, 'Womens dresses, tops, bottoms, and outerwear', 2, TRUE
FROM marketplace_categories WHERE slug = 'clothing-accessories'
UNION ALL
SELECT 'Shoes', 'shoes', id, 'Mens, womens, and kids footwear', 3, TRUE
FROM marketplace_categories WHERE slug = 'clothing-accessories'
UNION ALL
SELECT 'Bags & Accessories', 'bags-accessories', id, 'Purses, backpacks, wallets, and fashion accessories', 4, TRUE
FROM marketplace_categories WHERE slug = 'clothing-accessories'
UNION ALL
SELECT 'Jewelry & Watches', 'jewelry-watches', id, 'Rings, necklaces, bracelets, and timepieces', 5, TRUE
FROM marketplace_categories WHERE slug = 'clothing-accessories'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SPORTS & OUTDOORS SUBCATEGORIES
-- ============================================================================

INSERT INTO marketplace_categories (name, slug, parent_id, description, display_order, is_active)
SELECT 'Bicycles', 'bicycles', id, 'Road bikes, mountain bikes, and cycling equipment', 1, TRUE
FROM marketplace_categories WHERE slug = 'sports-outdoors'
UNION ALL
SELECT 'Exercise & Fitness', 'exercise-fitness', id, 'Gym equipment, weights, and workout gear', 2, TRUE
FROM marketplace_categories WHERE slug = 'sports-outdoors'
UNION ALL
SELECT 'Camping & Hiking', 'camping-hiking', id, 'Tents, backpacks, sleeping bags, and outdoor gear', 3, TRUE
FROM marketplace_categories WHERE slug = 'sports-outdoors'
UNION ALL
SELECT 'Water Sports', 'water-sports', id, 'Surfboards, paddleboards, diving, and aquatic equipment', 4, TRUE
FROM marketplace_categories WHERE slug = 'sports-outdoors'
UNION ALL
SELECT 'Team Sports', 'team-sports', id, 'Basketball, football, baseball, and team equipment', 5, TRUE
FROM marketplace_categories WHERE slug = 'sports-outdoors'
UNION ALL
SELECT 'Hunting & Fishing', 'hunting-fishing', id, 'Rods, reels, hunting equipment, and outdoor gear', 6, TRUE
FROM marketplace_categories WHERE slug = 'sports-outdoors'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show count of categories created
DO $$
DECLARE
    root_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO root_count FROM marketplace_categories WHERE parent_id IS NULL;
    SELECT COUNT(*) INTO total_count FROM marketplace_categories;

    RAISE NOTICE 'Marketplace categories seed complete:';
    RAISE NOTICE '  Root categories: %', root_count;
    RAISE NOTICE '  Total categories: %', total_count;
END $$;
