const db = require('../config/database');

class MarketplaceCategory {
  /**
   * Get all root categories (no parent)
   */
  static async getRootCategories() {
    const result = await db.query(
      `SELECT
        id, name, slug, description, icon_url,
        display_order, listing_count, is_active
      FROM marketplace_categories
      WHERE parent_id IS NULL AND is_active = TRUE
      ORDER BY display_order, name`,
      []
    );

    return result.rows;
  }

  /**
   * Get subcategories for a parent category
   */
  static async getSubcategories(parentId) {
    const result = await db.query(
      `SELECT
        id, name, slug, description, icon_url,
        display_order, listing_count, is_active
      FROM marketplace_categories
      WHERE parent_id = $1 AND is_active = TRUE
      ORDER BY display_order, name`,
      [parentId]
    );

    return result.rows;
  }

  /**
   * Get full category hierarchy
   */
  static async getHierarchy() {
    const result = await db.query(
      `WITH RECURSIVE category_tree AS (
        -- Root categories
        SELECT
          id, name, slug, description, icon_url,
          parent_id, display_order, listing_count, is_active,
          0 as level,
          ARRAY[id] as path
        FROM marketplace_categories
        WHERE parent_id IS NULL AND is_active = TRUE

        UNION ALL

        -- Child categories
        SELECT
          c.id, c.name, c.slug, c.description, c.icon_url,
          c.parent_id, c.display_order, c.listing_count, c.is_active,
          ct.level + 1,
          ct.path || c.id
        FROM marketplace_categories c
        JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.is_active = TRUE
      )
      SELECT * FROM category_tree
      ORDER BY level, display_order, name`,
      []
    );

    // Build nested structure
    const categoryMap = new Map();
    const rootCategories = [];

    result.rows.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    result.rows.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (cat.parent_id === null) {
        rootCategories.push(category);
      } else {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(category);
        }
      }
    });

    return rootCategories;
  }

  /**
   * Get category by slug
   */
  static async findBySlug(slug) {
    const result = await db.query(
      `SELECT
        id, name, slug, description, icon_url,
        parent_id, display_order, listing_count, is_active
      FROM marketplace_categories
      WHERE slug = $1 AND is_active = TRUE`,
      [slug]
    );

    return result.rows[0] || null;
  }

  /**
   * Get category by ID with breadcrumb
   */
  static async findByIdWithBreadcrumb(categoryId) {
    const result = await db.query(
      `WITH RECURSIVE category_path AS (
        SELECT
          id, name, slug, parent_id, description, icon_url,
          listing_count, is_active,
          0 as level
        FROM marketplace_categories
        WHERE id = $1

        UNION ALL

        SELECT
          c.id, c.name, c.slug, c.parent_id, c.description, c.icon_url,
          c.listing_count, c.is_active,
          cp.level + 1
        FROM marketplace_categories c
        JOIN category_path cp ON c.id = cp.parent_id
      )
      SELECT * FROM category_path
      ORDER BY level DESC`,
      [categoryId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const category = result.rows[0];
    category.breadcrumb = result.rows.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug
    }));

    return category;
  }

  /**
   * Get popular categories (by listing count)
   */
  static async getPopular(limit = 10) {
    const result = await db.query(
      `SELECT
        id, name, slug, description, icon_url,
        listing_count, parent_id
      FROM marketplace_categories
      WHERE is_active = TRUE AND listing_count > 0
      ORDER BY listing_count DESC
      LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Search categories by name
   */
  static async search(searchTerm) {
    const result = await db.query(
      `SELECT
        id, name, slug, description, icon_url,
        parent_id, listing_count
      FROM marketplace_categories
      WHERE is_active = TRUE
        AND (
          name ILIKE $1 OR
          description ILIKE $1
        )
      ORDER BY listing_count DESC, name
      LIMIT 20`,
      [`%${searchTerm}%`]
    );

    return result.rows;
  }
}

module.exports = MarketplaceCategory;
