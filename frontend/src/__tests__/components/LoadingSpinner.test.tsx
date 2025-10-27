import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import LoadingSpinner from '../../components/LoadingSpinner';
import { theme } from '../../styles/theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderWithTheme(<LoadingSpinner />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render spinner element', () => {
      const { container } = renderWithTheme(<LoadingSpinner />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small size', () => {
      const { container } = renderWithTheme(<LoadingSpinner size="small" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render medium size', () => {
      const { container } = renderWithTheme(<LoadingSpinner size="medium" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render large size', () => {
      const { container } = renderWithTheme(<LoadingSpinner size="large" />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Loading Text', () => {
    it('should render without text by default', () => {
      renderWithTheme(<LoadingSpinner />);
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    it('should render with custom loading text', () => {
      renderWithTheme(<LoadingSpinner text="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should render with standard loading text', () => {
      renderWithTheme(<LoadingSpinner text="Loading" />);
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('should accept and apply custom className', () => {
      const { container } = renderWithTheme(<LoadingSpinner className="custom-spinner" />);
      expect(container.querySelector('.custom-spinner')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render for screen readers', () => {
      const { container } = renderWithTheme(<LoadingSpinner />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should be accessible with text', () => {
      renderWithTheme(<LoadingSpinner text="Loading content" />);
      const loadingText = screen.getByText('Loading content');
      expect(loadingText).toBeInTheDocument();
    });
  });
});
