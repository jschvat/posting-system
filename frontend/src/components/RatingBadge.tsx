/**
 * RatingBadge Component
 * Displays user's rating with Trophy > Badge > Star hierarchy
 * Trophy (Gold): 900-1000
 * Trophy (Silver): 800-899
 * Trophy (Bronze): 700-799
 * Badge (Gold): 600-699
 * Badge (Silver): 500-599
 * Badge (Bronze): 400-499
 * Star (Gold): 300-399
 * Star (Silver): 200-299
 * Star (Bronze): 100-199
 * No Badge: 0-99
 */

import React from 'react';
import styled from 'styled-components';
import { FaTrophy, FaMedal, FaStar } from 'react-icons/fa';

interface RatingBadgeProps {
  score: number;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  showScore?: boolean;
  showTooltip?: boolean;
  inline?: boolean;
}

interface BadgeConfig {
  icon: React.ComponentType;
  color: string;
  label: string;
  minScore: number;
  maxScore: number;
  glow?: string;
}

const getBadgeConfig = (score: number): BadgeConfig => {
  // Trophy levels (700-1000)
  if (score >= 900) {
    return {
      icon: FaTrophy,
      color: '#FFD700', // Gold
      label: 'Gold Trophy',
      minScore: 900,
      maxScore: 1000,
      glow: 'rgba(255, 215, 0, 0.4)'
    };
  }
  if (score >= 800) {
    return {
      icon: FaTrophy,
      color: '#C0C0C0', // Silver
      label: 'Silver Trophy',
      minScore: 800,
      maxScore: 899,
      glow: 'rgba(192, 192, 192, 0.4)'
    };
  }
  if (score >= 700) {
    return {
      icon: FaTrophy,
      color: '#CD7F32', // Bronze
      label: 'Bronze Trophy',
      minScore: 700,
      maxScore: 799,
      glow: 'rgba(205, 127, 50, 0.4)'
    };
  }

  // Badge levels (400-699)
  if (score >= 600) {
    return {
      icon: FaMedal,
      color: '#FFD700', // Gold Badge
      label: 'Gold Badge',
      minScore: 600,
      maxScore: 699,
      glow: 'rgba(255, 215, 0, 0.3)'
    };
  }
  if (score >= 500) {
    return {
      icon: FaMedal,
      color: '#C0C0C0', // Silver Badge
      label: 'Silver Badge',
      minScore: 500,
      maxScore: 599,
      glow: 'rgba(192, 192, 192, 0.3)'
    };
  }
  if (score >= 400) {
    return {
      icon: FaMedal,
      color: '#CD7F32', // Bronze Badge
      label: 'Bronze Badge',
      minScore: 400,
      maxScore: 499,
      glow: 'rgba(205, 127, 50, 0.3)'
    };
  }

  // Star levels (100-399)
  if (score >= 300) {
    return {
      icon: FaStar,
      color: '#FFD700', // Gold Star
      label: 'Gold Star',
      minScore: 300,
      maxScore: 399,
      glow: 'rgba(255, 215, 0, 0.2)'
    };
  }
  if (score >= 200) {
    return {
      icon: FaStar,
      color: '#C0C0C0', // Silver Star
      label: 'Silver Star',
      minScore: 200,
      maxScore: 299,
      glow: 'rgba(192, 192, 192, 0.2)'
    };
  }
  if (score >= 100) {
    return {
      icon: FaStar,
      color: '#CD7F32', // Bronze Star
      label: 'Bronze Star',
      minScore: 100,
      maxScore: 199,
      glow: 'rgba(205, 127, 50, 0.2)'
    };
  }

  // No badge (0-99)
  return {
    icon: FaStar,
    color: '#95a5a6', // Gray
    label: 'Newcomer',
    minScore: 0,
    maxScore: 99
  };
};

const RatingBadge: React.FC<RatingBadgeProps> = ({
  score,
  size = 'small',
  showScore = false,
  showTooltip = true,
  inline = false
}) => {
  const config = getBadgeConfig(score);
  const Icon = config.icon;

  const tooltipText = showTooltip
    ? `${config.label} - ${score}/1000 Reputation`
    : undefined;

  if (inline) {
    return (
      <InlineBadge
        $color={config.color}
        $size={size}
        $glow={config.glow}
        title={tooltipText}
      >
        <Icon />
        {showScore && <ScoreText $size={size}>{score}</ScoreText>}
      </InlineBadge>
    );
  }

  return (
    <Container $size={size}>
      <BadgeIcon
        $color={config.color}
        $size={size}
        $glow={config.glow}
        title={tooltipText}
      >
        <Icon />
      </BadgeIcon>
      {showScore && (
        <ScoreLabel $size={size}>{score}</ScoreLabel>
      )}
    </Container>
  );
};

// Standalone container for non-inline badges
const Container = styled.div<{ $size: string }>`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ $size }) => {
    switch ($size) {
      case 'tiny': return '2px';
      case 'small': return '3px';
      case 'large': return '6px';
      default: return '4px';
    }
  }};
`;

// Inline badge (icon + score side by side)
const InlineBadge = styled.div<{ $color: string; $size: string; $glow?: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => {
    switch ($size) {
      case 'tiny': return '3px';
      case 'small': return '4px';
      case 'large': return '6px';
      default: return '5px';
    }
  }};
  color: ${({ $color }) => $color};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'tiny': return '10px';
      case 'small': return '12px';
      case 'large': return '18px';
      default: return '14px';
    }
  }};
  ${({ $glow }) => $glow && `
    filter: drop-shadow(0 0 3px ${$glow});
  `}
  cursor: help;

  &:hover {
    transform: scale(1.05);
    transition: transform 0.2s ease;
  }
`;

// Icon-only badge
const BadgeIcon = styled.div<{ $color: string; $size: string; $glow?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'tiny': return '10px';
      case 'small': return '14px';
      case 'large': return '24px';
      default: return '16px';
    }
  }};
  ${({ $glow }) => $glow && `
    filter: drop-shadow(0 0 4px ${$glow});
  `}
  cursor: help;

  &:hover {
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }
`;

const ScoreText = styled.span<{ $size: string }>`
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'tiny': return '9px';
      case 'small': return '11px';
      case 'large': return '14px';
      default: return '12px';
    }
  }};
  font-weight: 600;
  white-space: nowrap;
`;

const ScoreLabel = styled.span<{ $size: string }>`
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'tiny': return '8px';
      case 'small': return '10px';
      case 'large': return '12px';
      default: return '11px';
    }
  }};
  font-weight: 600;
  color: ${props => props.theme.colors.text.secondary};
  white-space: nowrap;
`;

export default RatingBadge;
