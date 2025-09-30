/**
 * Response utilities for consistent API responses
 * Provides helper functions for standardized response formats
 */

/**
 * Send successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message (optional)
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccess(res, data = null, message = null, statusCode = 200) {
  const response = {
    success: true
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} type - Error type (optional)
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {*} details - Additional error details (optional)
 */
function sendError(res, message, type = 'ERROR', statusCode = 400, details = null) {
  const response = {
    success: false,
    error: {
      message,
      type
    }
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors array
 * @param {string} message - Error message (optional)
 */
function sendValidationError(res, errors, message = 'Validation failed') {
  return sendError(res, message, 'VALIDATION_ERROR', 400, errors);
}

/**
 * Send not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource that was not found (optional)
 */
function sendNotFound(res, resource = 'Resource') {
  return sendError(res, `${resource} not found`, 'NOT_FOUND', 404);
}

/**
 * Send unauthorized error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 */
function sendUnauthorized(res, message = 'Access denied') {
  return sendError(res, message, 'AUTHENTICATION_ERROR', 401);
}

/**
 * Send forbidden error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 */
function sendForbidden(res, message = 'Insufficient permissions') {
  return sendError(res, message, 'AUTHORIZATION_ERROR', 403);
}

/**
 * Send conflict error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} field - Conflicting field (optional)
 */
function sendConflict(res, message, field = null) {
  const details = field ? { field } : null;
  return sendError(res, message, 'DUPLICATE_ERROR', 409, details);
}

/**
 * Send server error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 */
function sendServerError(res, message = 'Internal server error') {
  return sendError(res, message, 'SERVER_ERROR', 500);
}

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message (optional)
 */
function sendPaginated(res, items, pagination, message = null) {
  const data = {
    items,
    pagination: {
      current_page: pagination.page,
      total_pages: Math.ceil(pagination.total / pagination.limit),
      total_count: pagination.total,
      limit: pagination.limit,
      has_next_page: pagination.page < Math.ceil(pagination.total / pagination.limit),
      has_prev_page: pagination.page > 1
    }
  };

  return sendSuccess(res, data, message);
}

/**
 * Send rate limit error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 */
function sendRateLimitError(res, message = 'Too many requests') {
  return sendError(res, message, 'RATE_LIMIT_ERROR', 429);
}

/**
 * Send file too large error response
 * @param {Object} res - Express response object
 * @param {number} maxSize - Maximum allowed file size
 */
function sendFileTooLarge(res, maxSize) {
  const maxSizeMB = Math.round(maxSize / (1024 * 1024));
  return sendError(
    res,
    `File too large. Maximum size is ${maxSizeMB}MB`,
    'FILE_TOO_LARGE',
    413
  );
}

/**
 * Send unsupported media type error response
 * @param {Object} res - Express response object
 * @param {Array} allowedTypes - Array of allowed MIME types
 */
function sendUnsupportedMediaType(res, allowedTypes = []) {
  const message = allowedTypes.length > 0
    ? `Unsupported file type. Allowed types: ${allowedTypes.join(', ')}`
    : 'Unsupported file type';

  return sendError(res, message, 'UNSUPPORTED_MEDIA_TYPE', 415);
}

/**
 * Create standard error response object (without sending)
 * @param {string} message - Error message
 * @param {string} type - Error type (optional)
 * @param {*} details - Additional error details (optional)
 * @returns {Object} Error response object
 */
function createErrorResponse(message, type = 'ERROR', details = null) {
  const response = {
    success: false,
    error: {
      message,
      type
    }
  };

  if (details) {
    response.error.details = details;
  }

  return response;
}

/**
 * Create standard success response object (without sending)
 * @param {*} data - Response data
 * @param {string} message - Success message (optional)
 * @returns {Object} Success response object
 */
function createSuccessResponse(data = null, message = null) {
  const response = {
    success: true
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return response;
}

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendServerError,
  sendPaginated,
  sendRateLimitError,
  sendFileTooLarge,
  sendUnsupportedMediaType,
  createErrorResponse,
  createSuccessResponse
};