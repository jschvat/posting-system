/**
 * 404 Not Found middleware for handling undefined routes
 * This middleware catches all requests that don't match any defined routes
 */

/**
 * Not found middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const notFound = (req, res, next) => {
  // Log the attempted route for debugging
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);

  // Create error response
  const error = new Error(`Route not found - ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.type = 'NOT_FOUND';

  // Pass error to error handler
  next(error);
};

module.exports = notFound;