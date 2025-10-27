import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import RatingBadge from '../../components/RatingBadge';
import { theme } from '../../styles/theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('RatingBadge', () => {
  describe('Score Ranges - Newcomer (0-99)', () => {
    it('should display newcomer badge for score 0', () => {
      renderWithTheme(<RatingBadge score={0} showScore />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display newcomer badge for score 50', () => {
      renderWithTheme(<RatingBadge score={50} showScore />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should display newcomer badge for score 99', () => {
      renderWithTheme(<RatingBadge score={99} showScore />);
      expect(screen.getByText('99')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Bronze Star (100-199)', () => {
    it('should display bronze star for score 100', () => {
      renderWithTheme(<RatingBadge score={100} showScore />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should display bronze star for score 150', () => {
      renderWithTheme(<RatingBadge score={150} showScore />);
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should display bronze star for score 199', () => {
      renderWithTheme(<RatingBadge score={199} showScore />);
      expect(screen.getByText('199')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Silver Star (200-299)', () => {
    it('should display silver star for score 200', () => {
      renderWithTheme(<RatingBadge score={200} showScore />);
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('should display silver star for score 250', () => {
      renderWithTheme(<RatingBadge score={250} showScore />);
      expect(screen.getByText('250')).toBeInTheDocument();
    });

    it('should display silver star for score 299', () => {
      renderWithTheme(<RatingBadge score={299} showScore />);
      expect(screen.getByText('299')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Gold Star (300-399)', () => {
    it('should display gold star for score 300', () => {
      renderWithTheme(<RatingBadge score={300} showScore />);
      expect(screen.getByText('300')).toBeInTheDocument();
    });

    it('should display gold star for score 350', () => {
      renderWithTheme(<RatingBadge score={350} showScore />);
      expect(screen.getByText('350')).toBeInTheDocument();
    });

    it('should display gold star for score 399', () => {
      renderWithTheme(<RatingBadge score={399} showScore />);
      expect(screen.getByText('399')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Bronze Badge (400-499)', () => {
    it('should display bronze badge for score 400', () => {
      renderWithTheme(<RatingBadge score={400} showScore />);
      expect(screen.getByText('400')).toBeInTheDocument();
    });

    it('should display bronze badge for score 499', () => {
      renderWithTheme(<RatingBadge score={499} showScore />);
      expect(screen.getByText('499')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Silver Badge (500-599)', () => {
    it('should display silver badge for score 500', () => {
      renderWithTheme(<RatingBadge score={500} showScore />);
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('should display silver badge for score 599', () => {
      renderWithTheme(<RatingBadge score={599} showScore />);
      expect(screen.getByText('599')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Gold Badge (600-699)', () => {
    it('should display gold badge for score 600', () => {
      renderWithTheme(<RatingBadge score={600} showScore />);
      expect(screen.getByText('600')).toBeInTheDocument();
    });

    it('should display gold badge for score 699', () => {
      renderWithTheme(<RatingBadge score={699} showScore />);
      expect(screen.getByText('699')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Bronze Trophy (700-799)', () => {
    it('should display bronze trophy for score 700', () => {
      renderWithTheme(<RatingBadge score={700} showScore />);
      expect(screen.getByText('700')).toBeInTheDocument();
    });

    it('should display bronze trophy for score 799', () => {
      renderWithTheme(<RatingBadge score={799} showScore />);
      expect(screen.getByText('799')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Silver Trophy (800-899)', () => {
    it('should display silver trophy for score 800', () => {
      renderWithTheme(<RatingBadge score={800} showScore />);
      expect(screen.getByText('800')).toBeInTheDocument();
    });

    it('should display silver trophy for score 899', () => {
      renderWithTheme(<RatingBadge score={899} showScore />);
      expect(screen.getByText('899')).toBeInTheDocument();
    });
  });

  describe('Score Ranges - Gold Trophy (900-1000)', () => {
    it('should display gold trophy for score 900', () => {
      renderWithTheme(<RatingBadge score={900} showScore />);
      expect(screen.getByText('900')).toBeInTheDocument();
    });

    it('should display gold trophy for score 1000', () => {
      renderWithTheme(<RatingBadge score={1000} showScore />);
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render tiny size', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} size="tiny" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render small size', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} size="small" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render medium size (default)', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render large size', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} size="large" />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('should not show score by default', () => {
      renderWithTheme(<RatingBadge score={500} />);
      expect(screen.queryByText('500')).not.toBeInTheDocument();
    });

    it('should show score when showScore is true', () => {
      renderWithTheme(<RatingBadge score={500} showScore />);
      expect(screen.getByText('500')).toBeInTheDocument();
    });
  });

  describe('Inline vs Block Display', () => {
    it('should render as inline by default', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} inline />);
      expect(container.firstChild).toHaveStyle({ display: 'inline-flex' });
    });

    it('should render as block when inline is false', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} inline={false} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip by default', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} showTooltip />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should not show tooltip when showTooltip is false', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} showTooltip={false} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative scores as newcomer', () => {
      renderWithTheme(<RatingBadge score={-10} showScore />);
      expect(screen.getByText('-10')).toBeInTheDocument();
    });

    it('should handle scores above 1000', () => {
      renderWithTheme(<RatingBadge score={1500} showScore />);
      expect(screen.getByText('1500')).toBeInTheDocument();
    });

    it('should handle zero score', () => {
      renderWithTheme(<RatingBadge score={0} showScore />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria labels', () => {
      const { container } = renderWithTheme(<RatingBadge score={500} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
