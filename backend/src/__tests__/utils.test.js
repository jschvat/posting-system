/**
 * Utility functions tests
 * Tests for validation, response, and logger utilities
 */

const {
  validatePassword,
  validateUsername,
  validateEmail,
  sanitizeContent,
  validatePagination,
  cleanText
} = require('../utils/validation');

const {
  createSuccessResponse,
  createErrorResponse
} = require('../utils/response');

describe('Validation Utils', () => {
  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  describe('validateUsername', () => {
    it('should validate good username', () => {
      const result = validateUsername('user123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short username', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username must be at least 3 characters long');
    });

    it('should reject reserved username', () => {
      const result = validateUsername('admin');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This username is reserved and cannot be used');
    });
  });

  describe('validateEmail', () => {
    it('should validate good email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });
  });

  describe('sanitizeContent', () => {
    it('should sanitize HTML content', () => {
      const result = sanitizeContent('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should return empty string for null input', () => {
      const result = sanitizeContent(null);
      expect(result).toBe('');
    });
  });

  describe('validatePagination', () => {
    it('should return valid pagination params', () => {
      const result = validatePagination(2, 20, 100);
      expect(result).toEqual({
        page: 2,
        limit: 20,
        offset: 20
      });
    });

    it('should handle invalid page numbers', () => {
      const result = validatePagination(0, 20, 100);
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });
  });

  describe('cleanText', () => {
    it('should clean text content', () => {
      const result = cleanText('  Hello    World  \n\n  ');
      expect(result).toBe('Hello World');
    });

    it('should limit text length', () => {
      const result = cleanText('This is a long text', 10);
      expect(result).toBe('This is a');
    });
  });
});

describe('Response Utils', () => {
  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const result = createSuccessResponse({ test: 'data' }, 'Success');
      expect(result).toEqual({
        success: true,
        data: { test: 'data' },
        message: 'Success'
      });
    });

    it('should create success response without data', () => {
      const result = createSuccessResponse(null, 'Success');
      expect(result).toEqual({
        success: true,
        message: 'Success'
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response', () => {
      const result = createErrorResponse('Error message', 'ERROR_TYPE');
      expect(result).toEqual({
        success: false,
        error: {
          message: 'Error message',
          type: 'ERROR_TYPE'
        }
      });
    });

    it('should create error response with details', () => {
      const result = createErrorResponse('Error message', 'ERROR_TYPE', { field: 'username' });
      expect(result).toEqual({
        success: false,
        error: {
          message: 'Error message',
          type: 'ERROR_TYPE',
          details: { field: 'username' }
        }
      });
    });
  });
});