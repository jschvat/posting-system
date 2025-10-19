import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Group } from '../../types/group';
import { getApiBaseUrl } from '../../config/app.config';

interface GroupCardProps {
  group: Group;
  showJoinButton?: boolean;
  onJoin?: (groupSlug: string) => void;
  onLeave?: (groupSlug: string) => void;
  isMember?: boolean; // Deprecated: use group.user_membership instead
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  showJoinButton = true,
  onJoin,
  onLeave,
  isMember = false
}) => {
  // Use group.user_membership if available, otherwise fall back to isMember prop
  const isActiveMember = group.user_membership?.status === 'active' || isMember;
  const userRole = group.user_membership?.role;

  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActiveMember && onLeave) {
      onLeave(group.slug);
    } else if (!isActiveMember && onJoin) {
      onJoin(group.slug);
    }
  };

  const formatMemberCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Helper function to get full image URL
  const getFullImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    // If URL is already absolute (starts with http:// or https://), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Otherwise, prepend API base URL
    return `${getApiBaseUrl()}${url}`;
  };

  return (
    <Card to={`/g/${group.slug}`}>
      <CardHeader>
        {group.avatar_url && <GroupIcon src={getFullImageUrl(group.avatar_url)} alt={group.display_name} />}
        {!group.avatar_url && <DefaultIcon>{group.name.charAt(0).toUpperCase()}</DefaultIcon>}
        <GroupInfo>
          <GroupNameRow>
            <GroupName>{group.display_name}</GroupName>
            {userRole && (
              <RoleBadge $role={userRole}>
                {userRole === 'admin' ? '👑 Admin' : '🛡️ Mod'}
              </RoleBadge>
            )}
          </GroupNameRow>
          <GroupSlug>g/{group.name}</GroupSlug>
        </GroupInfo>
        {showJoinButton && (onJoin || onLeave) && !isActiveMember && (
          <JoinButton
            onClick={handleJoinClick}
            $isMember={isActiveMember}
          >
            Join
          </JoinButton>
        )}
      </CardHeader>

      {group.description && (
        <GroupDescription>{group.description}</GroupDescription>
      )}

      <CardFooter>
        <Stat>
          <StatValue>{formatMemberCount(group.member_count)}</StatValue>
          <StatLabel>{group.member_count === 1 ? 'member' : 'members'}</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{formatMemberCount(group.post_count)}</StatValue>
          <StatLabel>{group.post_count === 1 ? 'post' : 'posts'}</StatLabel>
        </Stat>
        {group.visibility !== 'public' && (
          <Badge $visibility={group.visibility}>
            {group.visibility === 'private' ? 'Private' : 'Invite Only'}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
};

const Card = styled(Link)`
  display: block;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const GroupIcon = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
`;

const DefaultIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
`;

const GroupInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const GroupNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GroupName = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RoleBadge = styled.span<{ $role: 'admin' | 'moderator' | 'member' }>`
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  display: ${props => props.$role === 'member' ? 'none' : 'inline-block'};
  background: ${props => props.$role === 'admin'
    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
    : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)'};
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const GroupSlug = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
`;

const JoinButton = styled.button<{ $isMember: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${props => props.$isMember ? props.theme.colors.border : props.theme.colors.primary};
  background: ${props => props.$isMember ? 'transparent' : props.theme.colors.primary};
  color: ${props => props.$isMember ? props.theme.colors.text : 'white'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$isMember ? props.theme.colors.error : props.theme.colors.primary};
    border-color: ${props => props.$isMember ? props.theme.colors.error : props.theme.colors.primary};
    color: ${props => props.$isMember ? props.theme.colors.error : 'white'};
  }
`;

const GroupDescription = styled.p`
  margin: 0 0 12px 0;
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const Stat = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
`;

const Badge = styled.span<{ $visibility: string }>`
  margin-left: auto;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => props.$visibility === 'private'
    ? 'rgba(255, 152, 0, 0.1)'
    : 'rgba(156, 39, 176, 0.1)'};
  color: ${props => props.$visibility === 'private'
    ? '#FF9800'
    : '#9C27B0'};
`;

export default GroupCard;
