/**
 * UserStats Component
 * Displays follower/following counts and engagement stats
 */

import React from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { followsApi } from '../services/api';

interface UserStatsProps {
  userId: number;
  variant?: 'compact' | 'detailed';
  showEngagement?: boolean;
}

const StatsContainer = styled.div<{ $variant: string }>`
  display: flex;
  gap: ${({ theme, $variant }) => $variant === 'compact' ? theme.spacing.md : theme.spacing.lg};
  align-items: center;
`;

const StatItem = styled.div<{ $clickable?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  transition: opacity 0.2s ease;

  &:hover {
    opacity: ${({ $clickable }) => $clickable ? 0.7 : 1};
  }
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 2px;
`;

const CompactStat = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 ${({ theme }) => theme.spacing.sm};
`;

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const UserStats: React.FC<UserStatsProps> = ({
  userId,
  variant = 'detailed',
  showEngagement = false
}) => {
  // Get follow stats
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['followStats', userId],
    queryFn: () => followsApi.getFollowStats(userId),
  });

  if (isLoading) {
    return <StatsContainer $variant={variant}>Loading...</StatsContainer>;
  }

  const stats = statsData?.data?.stats || {};
  const followerCount = stats.follower_count || 0;
  const followingCount = stats.following_count || 0;
  const postCount = stats.post_count || 0;
  const engagementScore = stats.engagement_score || 0;

  if (variant === 'compact') {
    return (
      <StatsContainer $variant="compact">
        <CompactStat>
          <strong>{formatNumber(followerCount)}</strong> followers
        </CompactStat>
        <Separator>·</Separator>
        <CompactStat>
          <strong>{formatNumber(followingCount)}</strong> following
        </CompactStat>
      </StatsContainer>
    );
  }

  return (
    <StatsContainer $variant="detailed">
      <StatItem $clickable>
        <StatValue>{formatNumber(postCount)}</StatValue>
        <StatLabel>Posts</StatLabel>
      </StatItem>

      <StatItem $clickable>
        <StatValue>{formatNumber(followerCount)}</StatValue>
        <StatLabel>Followers</StatLabel>
      </StatItem>

      <StatItem $clickable>
        <StatValue>{formatNumber(followingCount)}</StatValue>
        <StatLabel>Following</StatLabel>
      </StatItem>

      {showEngagement && engagementScore > 0 && (
        <StatItem>
          <StatValue>{engagementScore.toFixed(1)}</StatValue>
          <StatLabel>Engagement</StatLabel>
        </StatItem>
      )}
    </StatsContainer>
  );
};

export default UserStats;
