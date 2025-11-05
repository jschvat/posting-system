const db = require('../config/database');

class MarketplaceListing {
  /**
   * Create a new marketplace listing
   */
  static async create(listingData) {
    const {
      user_id, title, description, category_id, listing_type,
      price, original_price, quantity, allow_offers, min_offer_price,
      condition, location_latitude, location_longitude, location_city,
      location_state, location_zip, location_country, pickup_address,
      shipping_available, shipping_cost, shipping_radius_miles,
      local_pickup_only, status
    } = listingData;

    const result = await db.query(
      `INSERT INTO marketplace_listings (
        user_id, title, description, category_id, listing_type,
        price, original_price, quantity, allow_offers, min_offer_price,
        condition, location_latitude, location_longitude, location_city,
        location_state, location_zip, location_country, pickup_address,
        shipping_available, shipping_cost, shipping_radius_miles,
        local_pickup_only, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        user_id, title, description, category_id, listing_type,
        price, original_price, quantity, allow_offers, min_offer_price,
        condition, location_latitude, location_longitude, location_city,
        location_state, location_zip, location_country || 'USA', pickup_address,
        shipping_available, shipping_cost, shipping_radius_miles,
        local_pickup_only, status || 'draft'
      ]
    );

    return result.rows[0];
  }

  /**
   * Get listing by ID with seller info and media
   */
  static async findById(listingId, requestingUserId = null) {
    const result = await db.query(
      `SELECT
        l.*,
        u.username as seller_username,
        u.username as seller_name,
        NULL as seller_image,
        c.name as category_name,
        c.slug as category_slug,
        NULL::numeric as seller_rating,
        NULL::integer as seller_review_count,
        NULL as seller_level,
        (SELECT json_agg(
          json_build_object(
            'id', m.id,
            'file_url', m.file_url,
            'file_type', m.file_type,
            'is_primary', m.is_primary,
            'thumbnail_url', m.thumbnail_url,
            'display_order', m.display_order
          ) ORDER BY m.display_order, m.id
        ) FROM marketplace_media m WHERE m.listing_id = l.id) as media,
        CASE WHEN $2::INTEGER IS NOT NULL THEN
          EXISTS(SELECT 1 FROM marketplace_saved_listings WHERE user_id = $2 AND listing_id = l.id)
        ELSE FALSE END as is_saved,
        (SELECT row_to_json(a.*) FROM (
          SELECT
            a.id, a.starting_bid, a.reserve_price, a.current_bid, a.bid_increment,
            a.start_time, a.end_time, a.total_bids, a.status,
            (SELECT json_agg(
              json_build_object(
                'id', b.id,
                'user_id', b.user_id,
                'username', bu.username,
                'bid_amount', b.bid_amount,
                'is_winning', b.is_winning,
                'created_at', b.created_at
              ) ORDER BY b.created_at DESC
            ) FROM marketplace_auction_bids b
            JOIN users bu ON b.user_id = bu.id
            WHERE b.auction_id = a.id) as bids
          FROM marketplace_auctions a
          WHERE a.listing_id = l.id
        ) a) as auction,
        (SELECT row_to_json(r.*) FROM (
          SELECT
            r.id, r.ticket_price, r.total_tickets, r.tickets_sold,
            r.min_tickets_to_draw, r.max_tickets_per_user,
            r.start_time, r.end_time, r.status,
            (SELECT COUNT(*) FROM marketplace_raffle_tickets rt
             WHERE rt.raffle_id = r.id AND rt.user_id = $2) as user_ticket_count
          FROM marketplace_raffles r
          WHERE r.listing_id = l.id
        ) r) as raffle
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN marketplace_categories c ON l.category_id = c.id
      WHERE l.id = $1`,
      [listingId, requestingUserId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Increment view count asynchronously
    db.query(
      'UPDATE marketplace_listings SET view_count = view_count + 1 WHERE id = $1',
      [listingId]
    ).catch(err => console.error('Error updating view count:', err));

    return result.rows[0];
  }

  /**
   * Search listings with filters (FIXED VERSION)
   */
  static async search({
    query,
    category_id,
    listing_type,
    min_price,
    max_price,
    condition,
    latitude,
    longitude,
    radius = 25,
    status = 'active',
    sort_by = 'created_at',
    sort_order = 'DESC',
    limit = 20,
    offset = 0
  }) {
    // Helper class to manage parameters
    class ParamManager {
      constructor() {
        this.params = [];
      }

      add(value) {
        this.params.push(value);
        return `$${this.params.length}`;
      }

      get() {
        return this.params;
      }
    }

    const pm = new ParamManager();
    const conditions = [];

    // Build SELECT clause
    let selectClause = `
      SELECT
        l.*,
        u.username as seller_username,
        c.name as category_name,
        c.slug as category_slug,
        ss.average_rating as seller_rating,
        (SELECT file_url FROM marketplace_media WHERE listing_id = l.id AND is_primary = TRUE LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM marketplace_media WHERE listing_id = l.id) as media_count
    `;

    // Add distance calculation if location provided
    if (latitude !== undefined && longitude !== undefined) {
      const latParam = pm.add(latitude);
      const lonParam = pm.add(longitude);
      selectClause += `, calculate_distance_miles(${latParam}, ${lonParam}, l.location_latitude, l.location_longitude) as distance_miles`;
    }

    // FROM clause
    let fromClause = `
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN marketplace_categories c ON l.category_id = c.id
      LEFT JOIN marketplace_seller_stats ss ON l.user_id = ss.user_id
    `;

    // Build WHERE conditions
    conditions.push(`l.status = ${pm.add(status)}`);

    if (query) {
      conditions.push(`l.search_vector @@ plainto_tsquery('english', ${pm.add(query)})`);
    }

    if (category_id !== undefined) {
      conditions.push(`l.category_id = ${pm.add(category_id)}`);
    }

    if (listing_type) {
      conditions.push(`l.listing_type = ${pm.add(listing_type)}`);
    }

    if (min_price !== undefined) {
      conditions.push(`l.price >= ${pm.add(min_price)}`);
    }

    if (max_price !== undefined) {
      conditions.push(`l.price <= ${pm.add(max_price)}`);
    }

    if (condition) {
      conditions.push(`l.condition = ${pm.add(condition)}`);
    }

    // Distance filter (reuse lat/lon params if already added)
    if (latitude !== undefined && longitude !== undefined && radius !== undefined) {
      conditions.push(`calculate_distance_miles($1, $2, l.location_latitude, l.location_longitude) <= ${pm.add(radius)}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    const sortColumns = {
      created_at: 'l.created_at',
      price: 'l.price',
      distance: 'distance_miles',
      popular: '(l.view_count * 0.3 + l.save_count * 0.5 + l.share_count * 0.2)'
    };

    const sortColumn = sortColumns[sort_by] || 'l.created_at';
    const orderClause = `ORDER BY ${sortColumn} ${sort_order}`;

    // Pagination
    const limitClause = `LIMIT ${pm.add(limit)} OFFSET ${pm.add(offset)}`;

    // Build final query
    const queryText = `${selectClause} ${fromClause} ${whereClause} ${orderClause} ${limitClause}`;

    // Execute query
    const result = await db.query(queryText, pm.get());

    // Count query for pagination
    const countPm = new ParamManager();
    const countConditions = [];

    countConditions.push(`l.status = ${countPm.add(status)}`);

    if (query) {
      countConditions.push(`l.search_vector @@ plainto_tsquery('english', ${countPm.add(query)})`);
    }

    if (category_id !== undefined) {
      countConditions.push(`l.category_id = ${countPm.add(category_id)}`);
    }

    if (listing_type) {
      countConditions.push(`l.listing_type = ${countPm.add(listing_type)}`);
    }

    if (min_price !== undefined) {
      countConditions.push(`l.price >= ${countPm.add(min_price)}`);
    }

    if (max_price !== undefined) {
      countConditions.push(`l.price <= ${countPm.add(max_price)}`);
    }

    if (condition) {
      countConditions.push(`l.condition = ${countPm.add(condition)}`);
    }

    if (latitude !== undefined && longitude !== undefined && radius !== undefined) {
      const latParam = countPm.add(latitude);
      const lonParam = countPm.add(longitude);
      const radiusParam = countPm.add(radius);
      countConditions.push(`calculate_distance_miles(${latParam}, ${lonParam}, l.location_latitude, l.location_longitude) <= ${radiusParam}`);
    }

    const countWhereClause = countConditions.length > 0 ? `WHERE ${countConditions.join(' AND ')}` : '';
    const countQuery = `SELECT COUNT(*) as total FROM marketplace_listings l ${countWhereClause}`;

    const countResult = await db.query(countQuery, countPm.get());
    const total = parseInt(countResult.rows[0].total);

    return {
      listings: result.rows,
      total,
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(total / limit),
      hasMore: offset + result.rows.length < total
    };
  }

  /**
   * Update listing
   */
  static async update(listingId, userId, updateData) {
    const allowedFields = [
      'title', 'description', 'category_id', 'price', 'original_price',
      'quantity', 'allow_offers', 'min_offer_price', 'condition',
      'shipping_available', 'shipping_cost', 'shipping_radius_miles',
      'local_pickup_only', 'status'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(updateData[key]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(listingId, userId);

    const result = await db.query(
      `UPDATE marketplace_listings
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete listing (soft delete by setting status)
   */
  static async delete(listingId, userId) {
    const result = await db.query(
      `UPDATE marketplace_listings
       SET status = 'removed'
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [listingId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get user's listings
   */
  static async findByUser(userId, { status, limit = 20, offset = 0 }) {
    let query = `
      SELECT
        l.*,
        c.name as category_name,
        (SELECT file_url FROM marketplace_media WHERE listing_id = l.id AND is_primary = TRUE LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM marketplace_media WHERE listing_id = l.id) as media_count
      FROM marketplace_listings l
      LEFT JOIN marketplace_categories c ON l.category_id = c.id
      WHERE l.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND l.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get nearby listings
   */
  static async findNearby(latitude, longitude, radius = 25, limit = 20) {
    const result = await db.query(
      `SELECT
        l.*,
        u.username as seller_username,
        c.name as category_name,
        calculate_distance_miles($1, $2, l.location_latitude, l.location_longitude) as distance_miles,
        (SELECT file_url FROM marketplace_media WHERE listing_id = l.id AND is_primary = TRUE LIMIT 1) as primary_image
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN marketplace_categories c ON l.category_id = c.id
      WHERE l.status = 'active'
        AND calculate_distance_miles($1, $2, l.location_latitude, l.location_longitude) <= $3
      ORDER BY distance_miles ASC
      LIMIT $4`,
      [latitude, longitude, radius, limit]
    );

    return result.rows;
  }
}

module.exports = MarketplaceListing;
