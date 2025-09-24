/**
 * Global error handling middleware for the Express application
 * Handles different types of errors and returns appropriate responses
 */

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(error => error.message).join(', ');
    error = {
      statusCode: 400,
      message: `Validation Error: ${message}`,
      type: 'VALIDATION_ERROR'
    };
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    error = {
      statusCode: 400,
      message: `Duplicate value for ${field}. Please use a different value.`,
      type: 'DUPLICATE_ERROR'
    };
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = {
      statusCode: 400,
      message: 'Invalid reference to related resource',
      type: 'FOREIGN_KEY_ERROR'
    };
  }

  // Sequelize database connection error
  if (err.name === 'SequelizeConnectionError') {
    error = {
      statusCode: 500,
      message: 'Database connection error',
      type: 'DATABASE_ERROR'
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      message: 'Invalid token',
      type: 'AUTH_ERROR'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      message: 'Token expired',
      type: 'AUTH_ERROR'
    };
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      statusCode: 413,
      message: 'File too large',
      type: 'FILE_ERROR'
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = {
      statusCode: 413,
      message: 'Too many files',
      type: 'FILE_ERROR'
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      statusCode: 400,
      message: 'Unexpected file field',
      type: 'FILE_ERROR'
    };
  }

  // Cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    error = {
      statusCode: 400,
      message: 'Resource not found',
      type: 'CAST_ERROR'
    };
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const type = error.type || 'SERVER_ERROR';

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message,
      type,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: error
      })
    }
  };

  // Don't include stack trace in production
  if (process.env.NODE_ENV === 'production') {
    delete errorResponse.error.stack;
    delete errorResponse.error.details;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;