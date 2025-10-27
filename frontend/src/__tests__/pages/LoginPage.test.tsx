import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../pages/LoginPage';
import { renderWithProviders, mockUser } from '../utils/testUtils';

// Mock the API module
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockLogout = jest.fn();

jest.mock('../../services/api', () => ({
  authApi: {
    login: (...args: any[]) => mockLogin(...args),
    register: (...args: any[]) => mockRegister(...args),
    logout: (...args: any[]) => mockLogout(...args),
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render login form by default', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });

    it('should render username field', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    it('should render password field', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should render login button', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    });

    it('should render link to registration', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/register/i)).toBeInTheDocument();
    });
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      mockLogin.mockResolvedValue({
        user: mockUser,
        token: 'test-token',
      });

      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          username: 'testuser',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should display error message for invalid credentials', async () => {
      mockLogin.mockRejectedValue(
        new Error('Invalid username or password')
      );

      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/username/i), 'wronguser');
      await user.type(screen.getByLabelText(/password/i), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should display error for network issues', async () => {
      mockLogin.mockRejectedValue(
        new Error('Network Error')
      );

      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Registration Tab', () => {
    it('should switch to registration form', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.click(screen.getByText(/register/i));

      expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    });

    it('should render all registration fields', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.click(screen.getByText(/register/i));

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    });

    it('should successfully register new user', async () => {
      mockRegister.mockResolvedValue({
        user: { ...mockUser, username: 'newuser' },
        token: 'new-token',
      });

      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.click(screen.getByText(/register/i));

      await user.type(screen.getByLabelText(/username/i), 'newuser');
      await user.type(screen.getByLabelText(/email/i), 'new@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/display name/i), 'New User');

      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          display_name: 'New User',
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should display error for duplicate username', async () => {
      mockRegister.mockRejectedValue(
        new Error('Username already exists')
      );

      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.click(screen.getByText(/register/i));

      await user.type(screen.getByLabelText(/username/i), 'existinguser');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/display name/i), 'Test User');

      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should not submit login form with empty fields', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /^login$/i }));

      expect(mockedApi.authApi.login).not.toHaveBeenCalled();
    });

    it('should not submit login form with empty username', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      expect(mockedApi.authApi.login).not.toHaveBeenCalled();
    });

    it('should not submit login form with empty password', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      expect(mockedApi.authApi.login).not.toHaveBeenCalled();
    });

    it('should validate email format in registration', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.click(screen.getByText(/register/i));

      await user.type(screen.getByLabelText(/username/i), 'newuser');
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(screen.getByLabelText(/display name/i), 'New User');

      await user.click(screen.getByRole('button', { name: /register/i }));

      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should validate password length in registration', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.click(screen.getByText(/register/i));

      await user.type(screen.getByLabelText(/username/i), 'newuser');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), '123');
      await user.type(screen.getByLabelText(/display name/i), 'New User');

      await user.click(screen.getByRole('button', { name: /register/i }));

      expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should disable login button while submitting', async () => {
      let resolveLogin: any;
      mockLogin.mockReturnValue(
        new Promise(resolve => {
          resolveLogin = resolve;
        })
      );

      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      await user.click(loginButton);

      expect(loginButton).toBeDisabled();

      resolveLogin({ user: mockUser, token: 'test-token' });

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled();
      });
    });

    it('should show loading indicator during login', async () => {
      let resolveLogin: any;
      mockLogin.mockReturnValue(
        new Promise(resolve => {
          resolveLogin = resolve;
        })
      );

      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      expect(screen.getByText(/logging in/i)).toBeInTheDocument();

      resolveLogin({ user: mockUser, token: 'test-token' });

      await waitFor(() => {
        expect(screen.queryByText(/logging in/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Password Field', () => {
    it('should hide password by default', () => {
      renderWithProviders(<LoginPage />);
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should toggle password visibility', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Redirect After Login', () => {
    it('should redirect to home page after successful login', async () => {
      mockLogin.mockResolvedValue({
        user: mockUser,
        token: 'test-token',
      });

      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^login$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should redirect already authenticated users', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      renderWithProviders(<LoginPage />);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<LoginPage />);
      const user = userEvent.setup();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      usernameInput.focus();
      await user.keyboard('testuser');
      await user.tab();

      expect(passwordInput).toHaveFocus();
    });
  });
});
