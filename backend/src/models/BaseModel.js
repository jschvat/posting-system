/**
 * Base model class for raw SQL operations
 * Provides common functionality for all models
 */

let dbModule;

// Get database functions dynamically
function getDB() {
  if (!dbModule) {
    dbModule = require('../config/database');
  }
  return dbModule;
}

function query(sql, params = []) {
  const db = getDB();

  // In test environment, use the test database query function
  if (process.env.NODE_ENV === 'test' && global.testDb && global.testDb.query) {
    return global.testDb.query(sql, params);
  }

  // Use the main database query function
  return db.query(sql, params);
}

function transaction(callback) {
  const db = getDB();
  return db.transaction(callback);
}

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   * @param {number} id - Record ID
   * @returns {Object|null} Record or null if not found
   */
  async findById(id) {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all records
   * @param {Object} options - Query options
   * @returns {Array} Array of records
   */
  async findAll(options = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];
    let paramIndex = 1;

    // Add WHERE clause if provided
    if (options.where) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(options.where)) {
        whereConditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }

    // Add ORDER BY clause if provided
    if (options.order) {
      sql += ` ORDER BY ${options.order}`;
    }

    // Add LIMIT clause if provided
    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    // Add OFFSET clause if provided
    if (options.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Find one record by conditions
   * @param {Object} conditions - Where conditions
   * @returns {Object|null} Record or null if not found
   */
  async findOne(conditions = {}) {
    const records = await this.findAll({
      where: conditions,
      limit: 1
    });
    return records[0] || null;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Object} Created record
   */
  async create(data) {
    // Add timestamps if not provided
    const now = new Date();
    if (!data.created_at) data.created_at = now;
    if (!data.updated_at) data.updated_at = now;

    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`);

    const sql = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Object|null} Updated record or null if not found
   */
  async update(id, data) {
    // Add updated timestamp
    data.updated_at = new Date();

    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`);

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   * @param {number} id - Record ID
   * @returns {boolean} True if deleted, false if not found
   */
  async delete(id) {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Count records
   * @param {Object} conditions - Where conditions
   * @returns {number} Count of records
   */
  async count(conditions = {}) {
    let sql = `SELECT COUNT(*) FROM ${this.tableName}`;
    const params = [];

    if (Object.keys(conditions).length > 0) {
      const whereConditions = [];
      let paramIndex = 1;
      for (const [key, value] of Object.entries(conditions)) {
        whereConditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Execute a raw SQL query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object} Query result
   */
  async raw(sql, params = []) {
    return await query(sql, params);
  }

  /**
   * Execute operations within a transaction
   * @param {Function} callback - Function that receives client and executes queries
   * @returns {*} Result of the callback
   */
  async transaction(callback) {
    return await transaction(callback);
  }
}

module.exports = BaseModel;