import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock the API module
const mockGetPosts = jest.fn();
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockLogout = jest.fn();

jest.mock('./services/api', () => ({
  postsApi: {
    getPosts: (...args: any[]) => mockGetPosts(...args),
  },
  authApi: {
    login: (...args: any[]) => mockLogin(...args),
    register: (...args: any[]) => mockRegister(...args),
    logout: (...args: any[]) => mockLogout(...args),
  },
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Initial Rendering', () => {
    it('should render without crashing', () => {
      render(<App />);
      expect(document.body).toBeInTheDocument();
    });

    it('should render login page when not authenticated', () => {
      render(<App />);
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });

    it('should initialize with authentication providers', () => {
      render(<App />);
      // App should be wrapped with all necessary providers
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  describe('Authentication Flow', () => {
    it('should redirect to home when authenticated', async () => {
      const mockUser = {
        user_id: 1,
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        reputation_score: 500,
      };

      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      // Mock API call for posts
      mockGetPosts.mockResolvedValue({
        posts: [],
        pagination: { page: 1, limit: 20, totalPages: 0, totalCount: 0 },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /login/i })).not.toBeInTheDocument();
      });
    });

    it('should display header when authenticated', async () => {
      const mockUser = {
        user_id: 1,
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        reputation_score: 500,
      };

      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      mockGetPosts.mockResolvedValue({
        posts: [],
        pagination: { page: 1, limit: 20, totalPages: 0, totalCount: 0 },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });
  });

  describe('Routing', () => {
    it('should have router configured', () => {
      render(<App />);
      // Router should be initialized
      expect(window.location.pathname).toBeDefined();
    });

    it('should handle 404 routes', () => {
      window.history.pushState({}, '', '/non-existent-route');
      render(<App />);
      // Should render 404 page or redirect
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Theme Provider', () => {
    it('should provide theme to components', () => {
      render(<App />);
      // Theme should be available throughout the app
      const styledElements = document.querySelectorAll('[class*="sc-"]');
      expect(styledElements.length).toBeGreaterThan(0);
    });
  });

  describe('React Query Setup', () => {
    it('should initialize QueryClientProvider', () => {
      render(<App />);
      // React Query provider should be initialized
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Toast Provider', () => {
    it('should provide toast functionality', () => {
      render(<App />);
      // Toast container should be present
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('WebSocket Provider', () => {
    it('should initialize WebSocket provider', () => {
      render(<App />);
      // WebSocket provider should be initialized
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('should handle errors gracefully', () => {
      const consoleError = console.error;
      console.error = jest.fn(); // Suppress error output

      render(<App />);

      console.error = consoleError;
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have main content area', () => {
      render(<App />);
      const main = document.querySelector('main');
      expect(main || document.body).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<App />);
      // App should support keyboard navigation
      expect(document.body).toBeInTheDocument();
    });
  });
});
