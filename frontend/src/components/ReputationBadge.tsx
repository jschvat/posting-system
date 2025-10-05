/**
 * ReputationBadge Component
 * Displays user's reputation level with badge
 */

import React from 'react';
import styled from 'styled-components';
import { getTheme } from '../utils/themeHelpers';
import {
  FaSeedling,
  FaUser,
  FaUserPlus,
  FaUserShield,
  FaUserGraduate,
  FaTrophy
} from 'react-icons/fa';

interface ReputationBadgeProps {
  level: 'newcomer' | 'member' | 'contributor' | 'veteran' | 'expert' | 'legend';
  score: number;
  size?: 'small' | 'medium' | 'large';
  showScore?: boolean;
  showLabel?: boolean;
}

const LEVEL_CONFIG = {
  newcomer: {
    icon: FaSeedling,
    color: '#95a5a6',
    label: 'Newcomer',
    minScore: 0,
    maxScore: 99,
  },
  member: {
    icon: FaUser,
    color: '#3498db',
    label: 'Member',
    minScore: 100,
    maxScore: 299,
  },
  contributor: {
    icon: FaUserPlus,
    color: '#9b59b6',
    label: 'Contributor',
    minScore: 300,
    maxScore: 499,
  },
  veteran: {
    icon: FaUserShield,
    color: '#e67e22',
    label: 'Veteran',
    minScore: 500,
    maxScore: 699,
  },
  expert: {
    icon: FaUserGraduate,
    color: '#e74c3c',
    label: 'Expert',
    minScore: 700,
    maxScore: 849,
  },
  legend: {
    icon: FaTrophy,
    color: '#f39c12',
    label: 'Legend',
    minScore: 850,
    maxScore: 1000,
  },
};

const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  level,
  score,
  size = 'medium',
  showScore = true,
  showLabel = true,
}) => {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  // Calculate progress percentage to next level
  const progress = ((score - config.minScore) / (config.maxScore - config.minScore)) * 100;

  return (
    <Container>
      <BadgeWrapper $size={size}>
        <Badge $color={config.color} $size={size} title={`${config.label} (${score}/1000)`}>
          <Icon />
        </Badge>
        {size !== 'small' && (
          <ProgressBar>
            <ProgressFill $progress={Math.min(progress, 100)} $color={config.color} />
          </ProgressBar>
        )}
      </BadgeWrapper>

      {showLabel && (
        <LabelContainer>
          <LevelLabel $size={size} $color={config.color}>
            {config.label}
          </LevelLabel>
          {showScore && (
            <ScoreLabel $size={size}>
              {score}/1000
            </ScoreLabel>
          )}
        </LabelContainer>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => getTheme(props).spacing.sm};
`;

const BadgeWrapper = styled.div<{ $size: 'small' | 'medium' | 'large' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ $size }) => $size === 'small' ? '2px' : '4px'};
`;

const Badge = styled.div<{ $color: string; $size: 'small' | 'medium' | 'large' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color};
  color: white;
  border-radius: 50%;
  width: ${({ $size }) => {
    switch ($size) {
      case 'small': return '24px';
      case 'large': return '48px';
      default: return '32px';
    }
  }};
  height: ${({ $size }) => {
    switch ($size) {
      case 'small': return '24px';
      case 'large': return '48px';
      default: return '32px';
    }
  }};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'small': return '12px';
      case 'large': return '24px';
      default: return '16px';
    }
  }};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const ProgressBar = styled.div`
  width: 40px;
  height: 4px;
  background: ${(props) => getTheme(props).colors.border};
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number; $color: string }>`
  width: ${({ $progress }) => $progress}%;
  height: 100%;
  background: ${({ $color }) => $color};
  transition: width 0.3s ease;
`;

const LabelContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const LevelLabel = styled.span<{ $size: 'small' | 'medium' | 'large'; $color: string }>`
  font-weight: ${(props) => getTheme(props).fontWeight.semibold};
  color: ${({ $color }) => $color};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'small': return '12px';
      case 'large': return '16px';
      default: return '14px';
    }
  }};
`;

const ScoreLabel = styled.span<{ $size: 'small' | 'medium' | 'large' }>`
  color: ${(props) => getTheme(props).colors.textLight};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'small': return '10px';
      case 'large': return '12px';
      default: return '11px';
    }
  }};
`;

export default ReputationBadge;
