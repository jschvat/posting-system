const express = require('express');
const router = express.Router();
const MarketplaceCategory = require('../models/MarketplaceCategory');

/**
 * GET /api/marketplace/categories
 * Get all root categories
 */
router.get('/', async (req, res) => {
  try {
    const categories = await MarketplaceCategory.getRootCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

/**
 * GET /api/marketplace/categories/hierarchy
 * Get full category hierarchy (nested)
 */
router.get('/hierarchy', async (req, res) => {
  try {
    const hierarchy = await MarketplaceCategory.getHierarchy();

    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Error fetching category hierarchy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category hierarchy'
    });
  }
});

/**
 * GET /api/marketplace/categories/popular
 * Get popular categories by listing count
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const categories = await MarketplaceCategory.getPopular(parseInt(limit));

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching popular categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular categories'
    });
  }
});

/**
 * GET /api/marketplace/categories/search
 * Search categories by name
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const categories = await MarketplaceCategory.search(q);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error searching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search categories'
    });
  }
});

/**
 * GET /api/marketplace/categories/:slug
 * Get category by slug with breadcrumb
 */
router.get('/:slug', async (req, res) => {
  try {
    const category = await MarketplaceCategory.findBySlug(req.params.slug);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Get full details with breadcrumb
    const categoryWithBreadcrumb = await MarketplaceCategory.findByIdWithBreadcrumb(category.id);

    // Get subcategories
    const subcategories = await MarketplaceCategory.getSubcategories(category.id);

    res.json({
      success: true,
      data: {
        ...categoryWithBreadcrumb,
        subcategories
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category'
    });
  }
});

/**
 * GET /api/marketplace/categories/:id/subcategories
 * Get subcategories for a specific category
 */
router.get('/:id/subcategories', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const subcategories = await MarketplaceCategory.getSubcategories(categoryId);

    res.json({
      success: true,
      data: subcategories
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subcategories'
    });
  }
});

module.exports = router;
