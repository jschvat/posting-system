/**
 * Authentication routes for the social media platform API
 * Handles user registration, login, logout, password reset, and email verification
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { config } = require('../../../config/app.config');
const {
  authenticate,
  generateToken,
  setTokenCookie,
  clearTokenCookie
} = require('../middleware/auth');

// Import models
const User = require('../models/User');

const router = express.Router();

/**
 * Rate limiting for authentication endpoints
 * Disabled in test environment to avoid interference with tests
 */
const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next() // Skip rate limiting in tests
  : rateLimit({
      windowMs: config.rateLimiting.auth.windowMs,
      max: config.rateLimiting.auth.maxRequests,
      message: {
        success: false,
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          type: 'RATE_LIMIT_ERROR'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * Validation middleware to check for validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register',
  authLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .isAlphanumeric()
      .withMessage('Username must be 3-50 alphanumeric characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('first_name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name is required (1-100 characters)'),
    body('last_name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name is required (1-100 characters)'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: config.features.maxBioLength })
      .withMessage(`Bio cannot exceed ${config.features.maxBioLength} characters`),
    body('avatar_url')
      .optional()
      .isURL()
      .withMessage('Avatar URL must be a valid URL')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { username, email, password, first_name, last_name, bio, avatar_url } = req.body;

      // Check if username already exists
      const usernameExists = await User.usernameExists(username);
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This username is already taken',
            type: 'DUPLICATE_ERROR',
            field: 'username'
          }
        });
      }

      // Check if email already exists
      const emailExists = await User.emailExists(email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This email is already taken',
            type: 'DUPLICATE_ERROR',
            field: 'email'
          }
        });
      }

      // Create the user (password will be hashed by model)
      const user = await User.create({
        username,
        email,
        password,
        first_name,
        last_name,
        bio,
        avatar_url
      });

      // Generate email verification token if feature is enabled
      let verificationToken = null;
      if (config.features.enableEmailVerification) {
        verificationToken = await User.generateEmailVerificationToken(user.id);
      }

      // Generate JWT token
      const token = generateToken(user);

      // Set token as HTTP-only cookie
      setTokenCookie(res, token);

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
          verification_token: verificationToken
        },
        message: 'User registered successfully'
      });

    } catch (error) {
      console.error('Registration error:', error);

      // Handle database constraint errors (PostgreSQL unique violation)
      if (error.code === '23505') {
        if (error.message.includes('username')) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'This username is already taken',
              type: 'DUPLICATE_ERROR',
              field: 'username'
            }
          });
        } else if (error.message.includes('email')) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'This email is already taken',
              type: 'DUPLICATE_ERROR',
              field: 'email'
            }
          });
        }
      }

      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Login with username/email and password
 */
router.post('/login',
  authLimiter,
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Username or email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    body('remember_me')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be a boolean')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { identifier, password, remember_me = false } = req.body;

      // Find user by username or email
      const user = await User.findByIdentifier(identifier);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid username/email or password',
            type: 'AUTHENTICATION_ERROR',
            code: 'INVALID_CREDENTIALS'
          }
        });
      }

      // Check if account is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Account is deactivated',
            type: 'AUTHENTICATION_ERROR',
            code: 'ACCOUNT_DEACTIVATED'
          }
        });
      }

      // Verify password
      const isValidPassword = await User.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid username/email or password',
            type: 'AUTHENTICATION_ERROR',
            code: 'INVALID_CREDENTIALS'
          }
        });
      }

      // Update last login
      await User.updateLastLogin(user.id);

      // Generate JWT token
      const tokenExpiration = remember_me ? '30d' : config.auth.jwt.expiresIn;
      const token = generateToken(User.getPublicData(user), tokenExpiration);

      // Set token as HTTP-only cookie
      const cookieMaxAge = remember_me ? 30 * 24 * 60 * 60 * 1000 : config.auth.session.maxAge; // 30 days or default
      setTokenCookie(res, token, cookieMaxAge);

      res.json({
        success: true,
        data: {
          user: User.getPublicData(user),
          token,
          expires_in: tokenExpiration
        },
        message: 'Login successful'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout',
  authenticate,
  async (req, res, next) => {
    try {
      // Clear token cookie
      clearTokenCookie(res);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me',
  authenticate,
  async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh',
  authenticate,
  async (req, res, next) => {
    try {
      // Generate new token
      const token = generateToken(req.user);

      // Set new token as HTTP-only cookie
      setTokenCookie(res, token);

      res.json({
        success: true,
        data: {
          token,
          user: req.user
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          success: true,
          message: 'If the email exists in our system, you will receive a password reset link'
        });
      }

      // Generate password reset token
      const resetToken = await User.generatePasswordResetToken(user.id);

      // In a real application, you would send this token via email
      // For now, we'll just return it in the response (development only)
      const responseData = {
        success: true,
        message: 'If the email exists in our system, you will receive a password reset link'
      };

      // Only include token in development mode or test mode
      if (config.isDevelopment || process.env.NODE_ENV === 'test') {
        responseData.reset_token = resetToken; // Remove this in production
      }

      res.json(responseData);

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password',
  authLimiter,
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      // Reset password using token
      const success = await User.resetPassword(token, password);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid or expired reset token',
            type: 'VALIDATION_ERROR',
            code: 'INVALID_TOKEN'
          }
        });
      }

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email',
  [
    body('token')
      .notEmpty()
      .withMessage('Verification token is required')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { token } = req.body;

      // Verify email using token
      const success = await User.verifyEmail(token);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid verification token',
            type: 'VALIDATION_ERROR',
            code: 'INVALID_TOKEN'
          }
        });
      }

      res.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password',
  authenticate,
  [
    body('current_password')
      .notEmpty()
      .withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { current_password, new_password } = req.body;

      // Get the full user data with password hash for verification
      const fullUser = await User.findById(req.user.id);
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Verify current password
      const isValidPassword = await User.comparePassword(current_password, fullUser.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Current password is incorrect',
            type: 'AUTHENTICATION_ERROR',
            code: 'INVALID_PASSWORD'
          }
        });
      }

      // Update password
      await User.updatePassword(req.user.id, new_password);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;