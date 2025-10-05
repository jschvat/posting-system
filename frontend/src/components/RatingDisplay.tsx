/**
 * RatingDisplay Component
 * Shows average rating with stars visualization
 */

import React from 'react';
import styled from 'styled-components';
import { getTheme } from '../utils/themeHelpers';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

interface RatingDisplayProps {
  rating: number; // 0-5
  totalRatings?: number;
  size?: 'small' | 'medium' | 'large';
  showNumber?: boolean;
  showCount?: boolean;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  totalRatings = 0,
  size = 'medium',
  showNumber = true,
  showCount = true,
}) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} $size={size}><FaStar /></Star>);
    }

    // Half star
    if (hasHalfStar) {
      stars.push(<Star key="half" $size={size}><FaStarHalfAlt /></Star>);
    }

    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<EmptyStar key={`empty-${i}`} $size={size}><FaRegStar /></EmptyStar>);
    }

    return stars;
  };

  return (
    <Container>
      <StarsContainer>
        {renderStars()}
      </StarsContainer>
      {showNumber && (
        <RatingNumber $size={size}>
          {rating.toFixed(1)}
        </RatingNumber>
      )}
      {showCount && totalRatings > 0 && (
        <RatingCount $size={size}>
          ({totalRatings})
        </RatingCount>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const StarsContainer = styled.div`
  display: flex;
  gap: 2px;
`;

const Star = styled.span<{ $size: 'small' | 'medium' | 'large' }>`
  color: ${(props) => getTheme(props).colors.warning};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'small': return '12px';
      case 'large': return '20px';
      default: return '16px';
    }
  }};
  display: flex;
  align-items: center;
`;

const EmptyStar = styled(Star)`
  color: ${(props) => getTheme(props).colors.textLight};
`;

const RatingNumber = styled.span<{ $size: 'small' | 'medium' | 'large' }>`
  font-weight: ${(props) => getTheme(props).fontWeight.semibold};
  color: ${(props) => getTheme(props).colors.text.primary};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'small': return '12px';
      case 'large': return '18px';
      default: return '14px';
    }
  }};
`;

const RatingCount = styled.span<{ $size: 'small' | 'medium' | 'large' }>`
  color: ${(props) => getTheme(props).colors.textLight};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'small': return '11px';
      case 'large': return '14px';
      default: return '12px';
    }
  }};
`;

export default RatingDisplay;
