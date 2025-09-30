/**
 * Logging utilities
 * Provides structured logging functionality for the application
 */

const { config } = require('../../../config/app.config');

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Get current log level based on config
 */
function getCurrentLogLevel() {
  const level = config.logging.level.toUpperCase();
  return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.INFO;
}

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata (optional)
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const env = config.env;

  let logObject = {
    timestamp,
    level: level.toUpperCase(),
    message,
    environment: env
  };

  // Add metadata if provided
  if (Object.keys(meta).length > 0) {
    logObject = { ...logObject, ...meta };
  }

  return JSON.stringify(logObject);
}

/**
 * Check if a log level should be logged
 * @param {string} level - Log level to check
 * @returns {boolean} Whether to log this level
 */
function shouldLog(level) {
  const currentLevel = getCurrentLogLevel();
  const messageLevel = LOG_LEVELS[level.toUpperCase()];
  return messageLevel !== undefined && messageLevel <= currentLevel;
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Object|Error} meta - Additional metadata or error object
 */
function logError(message, meta = {}) {
  if (!shouldLog('ERROR')) return;

  let logMeta = { ...meta };

  // Handle Error objects
  if (meta instanceof Error) {
    logMeta = {
      error_name: meta.name,
      error_message: meta.message,
      stack: config.logging.includeStack ? meta.stack : undefined
    };
  }

  const logMessage = formatLogMessage('ERROR', message, logMeta);

  if (config.logging.console) {
    console.error(logMessage);
  }

  // TODO: Add file logging if configured
  // if (config.logging.file) {
  //   writeToFile(logMessage);
  // }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
function logWarning(message, meta = {}) {
  if (!shouldLog('WARN')) return;

  const logMessage = formatLogMessage('WARN', message, meta);

  if (config.logging.console) {
    console.warn(logMessage);
  }
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
function logInfo(message, meta = {}) {
  if (!shouldLog('INFO')) return;

  const logMessage = formatLogMessage('INFO', message, meta);

  if (config.logging.console) {
    console.log(logMessage);
  }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
function logDebug(message, meta = {}) {
  if (!shouldLog('DEBUG')) return;

  const logMessage = formatLogMessage('DEBUG', message, meta);

  if (config.logging.console) {
    console.debug(logMessage);
  }
}

/**
 * Log HTTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in milliseconds
 */
function logRequest(req, res, responseTime) {
  if (!shouldLog('INFO')) return;

  const meta = {
    method: req.method,
    url: req.url,
    user_agent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    status_code: res.statusCode,
    response_time_ms: responseTime
  };

  // Add user ID if authenticated
  if (req.user) {
    meta.user_id = req.user.id;
  }

  logInfo(`${req.method} ${req.url} - ${res.statusCode}`, meta);
}

/**
 * Log authentication events
 * @param {string} event - Authentication event (login, logout, register, etc.)
 * @param {Object} user - User object
 * @param {Object} req - Express request object
 * @param {string} result - Result of the authentication (success, failure)
 * @param {string} reason - Reason for failure (optional)
 */
function logAuth(event, user, req, result, reason = null) {
  const meta = {
    event,
    result,
    user_id: user ? user.id : null,
    username: user ? user.username : null,
    ip: req.ip || req.connection.remoteAddress,
    user_agent: req.get('User-Agent')
  };

  if (reason) {
    meta.reason = reason;
  }

  const message = `Authentication ${event}: ${result}`;

  if (result === 'success') {
    logInfo(message, meta);
  } else {
    logWarning(message, meta);
  }
}

/**
 * Log database operations
 * @param {string} operation - Database operation (create, update, delete, etc.)
 * @param {string} model - Model name
 * @param {number|string} id - Record ID
 * @param {Object} user - User performing the operation
 * @param {Object} meta - Additional metadata
 */
function logDatabase(operation, model, id, user = null, meta = {}) {
  if (!shouldLog('DEBUG')) return;

  const logMeta = {
    operation,
    model,
    record_id: id,
    user_id: user ? user.id : null,
    ...meta
  };

  logDebug(`Database ${operation} on ${model}:${id}`, logMeta);
}

/**
 * Log security events
 * @param {string} event - Security event
 * @param {Object} req - Express request object
 * @param {Object} meta - Additional metadata
 */
function logSecurity(event, req, meta = {}) {
  const logMeta = {
    event,
    ip: req.ip || req.connection.remoteAddress,
    user_agent: req.get('User-Agent'),
    url: req.url,
    method: req.method,
    ...meta
  };

  logWarning(`Security event: ${event}`, logMeta);
}

/**
 * Log file upload events
 * @param {string} event - Upload event
 * @param {Object} file - File object
 * @param {Object} user - User uploading the file
 * @param {Object} meta - Additional metadata
 */
function logUpload(event, file, user, meta = {}) {
  if (!shouldLog('INFO')) return;

  const logMeta = {
    event,
    filename: file.filename,
    original_name: file.originalname,
    mime_type: file.mimetype,
    size: file.size,
    user_id: user ? user.id : null,
    ...meta
  };

  logInfo(`File upload ${event}: ${file.filename}`, logMeta);
}

module.exports = {
  logError,
  logWarning,
  logInfo,
  logDebug,
  logRequest,
  logAuth,
  logDatabase,
  logSecurity,
  logUpload,
  LOG_LEVELS
};