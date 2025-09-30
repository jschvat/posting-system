/**
 * Authentication middleware for JWT token validation
 * Provides middleware functions for protecting routes and extracting user information
 */

const jwt = require('jsonwebtoken');
const { config } = require('../../../config/app.config');

/**
 * Middleware to verify JWT token and set req.user
 * Extracts token from Authorization header or cookies
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token = null;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Check cookies as fallback
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          type: 'AUTHENTICATION_ERROR',
          code: 'NO_TOKEN'
        }
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, config.auth.jwt.secret, {
        issuer: config.auth.jwt.issuer,
        audience: config.auth.jwt.audience
      });

      // Get user from database
      const User = require('../models/User');

      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Access denied. User not found.',
            type: 'AUTHENTICATION_ERROR',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Access denied. Account is deactivated.',
            type: 'AUTHENTICATION_ERROR',
            code: 'ACCOUNT_DEACTIVATED'
          }
        });
      }

      // Add user to request object (with public data only)
      req.user = User.getPublicData(user);
      req.token = token;

      next();
    } catch (tokenError) {
      let errorCode = 'INVALID_TOKEN';
      let errorMessage = 'Access denied. Invalid token.';

      if (tokenError.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
        errorMessage = 'Access denied. Token has expired.';
      } else if (tokenError.name === 'JsonWebTokenError') {
        errorCode = 'MALFORMED_TOKEN';
        errorMessage = 'Access denied. Malformed token.';
      }

      return res.status(401).json({
        success: false,
        error: {
          message: errorMessage,
          type: 'AUTHENTICATION_ERROR',
          code: errorCode
        }
      });
    }

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during authentication',
        type: 'SERVER_ERROR'
      }
    });
  }
};

/**
 * Optional authentication middleware
 * Sets req.user if valid token is provided, but doesn't block the request
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(); // No token, continue without authentication
    }

    try {
      const decoded = jwt.verify(token, config.auth.jwt.secret, {
        issuer: config.auth.jwt.issuer,
        audience: config.auth.jwt.audience
      });

      const User = require('../models/User');

      const user = await User.findById(decoded.userId);

      if (user && user.is_active) {
        req.user = User.getPublicData(user);
        req.token = token;
      }
    } catch (tokenError) {
      // Token is invalid, but we continue without authentication
      console.warn('Optional authentication failed:', tokenError.message);
    }

    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    next(); // Continue without authentication on error
  }
};

/**
 * Middleware to require specific roles
 * @param {...string} roles - Required roles
 */
const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Authentication required.',
          type: 'AUTHENTICATION_ERROR',
          code: 'NO_AUTH'
        }
      });
    }

    // For now, we don't have roles in the user model
    // This is a placeholder for future role-based access control
    if (roles.includes('admin') && req.user.id !== 1) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Insufficient permissions.',
          type: 'AUTHORIZATION_ERROR',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource
 * @param {string} paramName - Parameter name containing the user ID
 */
const requireOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Authentication required.',
          type: 'AUTHENTICATION_ERROR',
          code: 'NO_AUTH'
        }
      });
    }

    const resourceUserId = parseInt(req.params[paramName]) || parseInt(req.body.user_id);

    if (!resourceUserId || req.user.id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only access your own resources.',
          type: 'AUTHORIZATION_ERROR',
          code: 'OWNERSHIP_REQUIRED'
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can modify the resource
 * Checks ownership or admin permissions
 * @param {string} paramName - Parameter name containing the user ID
 */
const requireModifyPermission = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Authentication required.',
          type: 'AUTHENTICATION_ERROR',
          code: 'NO_AUTH'
        }
      });
    }

    const resourceUserId = parseInt(req.params[paramName]) || parseInt(req.body.user_id);

    // Allow if user owns the resource or is admin (user ID 1)
    if (resourceUserId && (req.user.id === resourceUserId || req.user.id === 1)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. You can only modify your own resources.',
        type: 'AUTHORIZATION_ERROR',
        code: 'MODIFY_PERMISSION_REQUIRED'
      }
    });
  };
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT token
 */
const generateToken = (user, expiresIn = config.auth.jwt.expiresIn) => {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email
  };

  return jwt.sign(payload, config.auth.jwt.secret, {
    expiresIn,
    issuer: config.auth.jwt.issuer,
    audience: config.auth.jwt.audience
  });
};

/**
 * Set JWT token as HTTP-only cookie
 * @param {Object} res - Express response object
 * @param {string} token - JWT token
 * @param {number} maxAge - Cookie max age in milliseconds
 */
const setTokenCookie = (res, token, maxAge = config.auth.session.maxAge) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.auth.session.sameSite,
    maxAge,
    path: '/'
  });
};

/**
 * Clear token cookie
 * @param {Object} res - Express response object
 */
const clearTokenCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.auth.session.sameSite,
    path: '/'
  });
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRoles,
  requireOwnership,
  requireModifyPermission,
  generateToken,
  setTokenCookie,
  clearTokenCookie
};