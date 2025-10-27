import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { ToastProvider, useToast } from '../../components/Toast';
import { theme } from '../../styles/theme';

// Test component that uses toast
const TestComponent = () => {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.showToast('Test message', 'info')}>
        Show Toast
      </button>
      <button onClick={() => toast.showSuccess('Success message')}>
        Show Success
      </button>
      <button onClick={() => toast.showError('Error message')}>
        Show Error
      </button>
      <button onClick={() => toast.showWarning('Warning message')}>
        Show Warning
      </button>
      <button onClick={() => toast.showInfo('Info message')}>
        Show Info
      </button>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>{component}</ToastProvider>
    </ThemeProvider>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Toast Display', () => {
    it('should display toast message', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should display success toast', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should display error toast', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should display warning toast', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('should display info toast', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Info'));

      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  describe('Toast Auto-Dismiss', () => {
    it('should auto-dismiss toast after default duration', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Test message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });
    });

    it('should handle custom duration', async () => {
      const CustomDurationComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.showToast('Custom duration', 'info', 5000)}>
            Show Custom
          </button>
        );
      };

      renderWithProviders(<CustomDurationComponent />);
      fireEvent.click(screen.getByText('Show Custom'));

      expect(screen.getByText('Custom duration')).toBeInTheDocument();

      // Should still be visible after 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText('Custom duration')).toBeInTheDocument();

      // Should dismiss after 5 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
      });
    });
  });

  describe('Toast Dismissal', () => {
    it('should dismiss toast on click', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Toast'));

      const toast = screen.getByText('Test message');
      expect(toast).toBeInTheDocument();

      fireEvent.click(toast.closest('[role="alert"]') || toast);

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Toasts', () => {
    it('should display multiple toasts', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('should dismiss toasts independently', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // Dismiss first toast
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });

      // Second toast should still be visible
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('useToast Hook', () => {
    it('should throw error when used outside ToastProvider', () => {
      const ConsoleError = console.error;
      console.error = jest.fn(); // Suppress error output

      const ComponentWithoutProvider = () => {
        useToast();
        return null;
      };

      expect(() => {
        render(<ComponentWithoutProvider />);
      }).toThrow('useToast must be used within a ToastProvider');

      console.error = ConsoleError;
    });
  });

  describe('Toast Accessibility', () => {
    it('should have role="alert" for screen readers', async () => {
      renderWithProviders(<TestComponent />);
      fireEvent.click(screen.getByText('Show Toast'));

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });
});
