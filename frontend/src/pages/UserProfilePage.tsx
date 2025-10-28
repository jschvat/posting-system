/**
 * User profile page component - displays user information and posts
 */

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { usersApi, getUserAvatarUrl, followsApi } from '../services/api';
import { messagesApi } from '../services/api/messagesApi';
import reputationApi from '../services/reputationApi';
import ratingsApi from '../services/ratingsApi';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import FollowButton from '../components/FollowButton';
import RatingButton from '../components/RatingButton';
import RatingDisplay from '../components/RatingDisplay';
import ReputationBadge from '../components/ReputationBadge';
import { ChatPopup } from '../components/messaging/ChatPopup';

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const Banner = styled.div<{ $imageUrl?: string }>`
  width: 100%;
  height: 200px;
  background: ${({ theme, $imageUrl }) =>
    $imageUrl
      ? `url(${$imageUrl})`
      : `linear-gradient(135deg, ${theme.colors.primary}40 0%, ${theme.colors.secondary}40 100%)`
  };
  background-size: cover;
  background-position: center;
  border-radius: ${({ theme }) => theme.borderRadius.lg} ${({ theme }) => theme.borderRadius.lg} 0 0;
  margin-bottom: -60px;
  position: relative;
`;

const ProfileHeader = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  padding-top: 80px;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ProfileInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const Avatar = styled.div<{ $hasImage?: boolean }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${({ theme, $hasImage }) => $hasImage ? 'transparent' : theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 2rem;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100px;
    height: 100px;
    font-size: 1.5rem;
  }
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.h1`
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 1.75rem;
  font-weight: 700;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 1.5rem;
  }
`;

const Username = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 1.1rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const LocationInfo = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.95rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};

  &::before {
    content: '📍';
  }
`;

const Bio = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: 1rem;
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const StatItem = styled.div<{ $clickable?: boolean }>`
  flex: 1;
  min-width: 100px;
  text-align: center;
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  padding: ${({ theme, $clickable }) => $clickable ? theme.spacing.sm : '0'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme, $clickable }) => $clickable ? theme.colors.background : 'transparent'};
  }
`;

const StatNumber = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    justify-content: center;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme, $variant }) =>
    $variant === 'primary' ? theme.colors.primary : theme.colors.border
  };
  background: ${({ theme, $variant }) =>
    $variant === 'primary' ? theme.colors.primary : theme.colors.surface
  };
  color: ${({ theme, $variant }) =>
    $variant === 'primary' ? 'white' : theme.colors.text.primary
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme, $variant }) =>
      $variant === 'primary' ? theme.colors.primary + 'dd' : theme.colors.background
    };
  }
`;

const PostsSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const TabsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: none;
  border: none;
  border-bottom: 3px solid ${({ theme, $active }) => $active ? theme.colors.primary : 'transparent'};
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text.secondary};
  font-weight: ${({ $active }) => $active ? '600' : '400'};
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -2px;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SectionHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 1.5rem;
`;

const SectionSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.95rem;
`;

const PostsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const EmptyState = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};

  h3 {
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

const ErrorState = styled.div`
  background: ${({ theme }) => theme.colors.error}20;
  border: 1px solid ${({ theme }) => theme.colors.error}40;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.error};

  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

// Modal styles
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
`;

const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  min-width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 10000;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ModalTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 1.5rem;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 4px 8px;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const UserAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme, $hasImage }) => $hasImage ? 'transparent' : theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserDisplayName = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
  font-size: 1rem;
`;

const UserUsername = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
`;

const RetryButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: ${({ theme }) => theme.spacing.md};
  transition: background-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}dd;
  }
`;

// Helper function to format tags
const formatTag = (tag: string): string => {
  return tag
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { state } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'following' | 'followers'>('posts');
  const [showChatPopup, setShowChatPopup] = useState(false);

  const currentUser = state.user;
  const isOwnProfile = currentUser && userId && parseInt(userId) === currentUser.id;

  // Fetch user data
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getUser(parseInt(userId!)),
    enabled: !!userId,
  });

  // Fetch user posts
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts
  } = useQuery({
    queryKey: ['user-posts', userId],
    queryFn: () => usersApi.getUserPosts(parseInt(userId!), { page: 1, limit: 20 }),
    enabled: !!userId,
  });

  // Fetch follow stats
  const {
    data: followStatsData,
    refetch: refetchFollowStats
  } = useQuery({
    queryKey: ['followStats', userId],
    queryFn: () => followsApi.getFollowStats(parseInt(userId!)),
    enabled: !!userId,
  });

  // Fetch reputation data
  const { data: reputationData, refetch: refetchReputation } = useQuery({
    queryKey: ['reputation', userId],
    queryFn: () => reputationApi.getUserReputation(parseInt(userId!)),
    enabled: !!userId,
  });

  // Fetch ratings data
  const { data: ratingsData, refetch: refetchRatings } = useQuery({
    queryKey: ['ratings', userId],
    queryFn: () => ratingsApi.getUserRatings(parseInt(userId!)),
    enabled: !!userId,
  });

  // Note: Location data is now included in the user object from the users API
  // No need for a separate location API call

  // Fetch following list (only when tab is active)
  const { data: followingData, isLoading: followingLoading } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => followsApi.getFollowing(parseInt(userId!)),
    enabled: !!userId && activeTab === 'following',
  });

  // Fetch followers list (only when tab is active)
  const { data: followersData, isLoading: followersLoading } = useQuery({
    queryKey: ['followers', userId],
    queryFn: () => followsApi.getFollowers(parseInt(userId!)),
    enabled: !!userId && activeTab === 'followers',
  });

  if (!userId) {
    return (
      <Container>
        <ErrorState>
          <h3>Invalid User</h3>
          <p>No user ID provided.</p>
        </ErrorState>
      </Container>
    );
  }

  if (userLoading) {
    return (
      <Container>
        <LoadingSpinner size="large" text="Loading profile..." />
      </Container>
    );
  }

  if (userError || !userData) {
    return (
      <Container>
        <ErrorState>
          <h3>User Not Found</h3>
          <p>The user you're looking for doesn't exist or has been removed.</p>
          <RetryButton onClick={() => refetchUser()}>
            Try Again
          </RetryButton>
        </ErrorState>
      </Container>
    );
  }

  const user = userData.data;
  const posts = Array.isArray(postsData?.data?.posts) ? postsData!.data.posts : [];
  const avatarUrl = getUserAvatarUrl(user);
  const hasAvatar = Boolean(user.avatar_url) && user.avatar_url !== avatarUrl;

  // Extract reputation and ratings data
  const reputation = reputationData?.data?.reputation;
  const ratingStats = ratingsData?.data?.stats;
  const averageRating = ratingStats ? parseFloat(ratingStats.average_rating) : 0;
  const totalRatings = ratingStats ? parseInt(ratingStats.total_ratings) : 0;

  // Handle sending a message - open chat popup
  const handleSendMessage = () => {
    setShowChatPopup(true);
  };

  // Extract and format location data from user object
  const formatLocation = () => {
    if (!user.location_sharing || user.location_sharing === 'off') return null;

    if (user.location_sharing === 'city' && user.location_city) {
      // Show city, state format
      const parts = [user.location_city, user.location_state].filter(Boolean);
      return parts.join(', ');
    }

    if (user.location_sharing === 'exact') {
      // Show full address when available
      if (user.address) {
        // Full address format: "123 Main St, City, State ZIP, Country"
        const parts = [
          user.address,
          user.location_city,
          user.location_state && user.location_zip ? `${user.location_state} ${user.location_zip}` : user.location_state,
          user.location_country
        ].filter(Boolean);
        return parts.join(', ');
      }
      // Fallback to city/state/country if no street address
      if (user.location_city || user.location_state) {
        const parts = [
          user.location_city,
          user.location_state && user.location_zip ? `${user.location_state} ${user.location_zip}` : user.location_state,
          user.location_country
        ].filter(Boolean);
        return parts.join(', ');
      }
      // Last resort: show coordinates
      if (user.location_latitude != null && user.location_longitude != null) {
        return `${user.location_latitude.toFixed(4)}, ${user.location_longitude.toFixed(4)}`;
      }
    }

    return null;
  };

  const formattedLocation = formatLocation();

  return (
    <Container>
      {/* Profile Header */}
      <Banner $imageUrl={user.banner_url} />
      <ProfileHeader>
        <ProfileInfo>
          <div>
            <Avatar $hasImage={hasAvatar}>
              {hasAvatar ? (
                <img src={avatarUrl} alt={`${user.first_name} ${user.last_name}`} />
              ) : (
                `${user.first_name[0]}${user.last_name[0]}`
              )}
            </Avatar>

            {/* Reputation and Rating Section - under avatar */}
            {reputation && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                <ReputationBadge
                  level={reputation.reputation_level}
                  score={reputation.reputation_score}
                  size="medium"
                />
                {totalRatings > 0 && (
                  <RatingDisplay
                    rating={averageRating}
                    totalRatings={totalRatings}
                    size="small"
                  />
                )}
              </div>
            )}
          </div>

          <UserDetails>
            <UserName>{user.first_name} {user.last_name}</UserName>
            <Username>@{user.username}</Username>

            {formattedLocation && <LocationInfo>{formattedLocation}</LocationInfo>}

            {user.bio && <Bio>{user.bio}</Bio>}

            {/* Interests & Skills */}
            {(user.hobbies?.length || user.skills?.length || user.favorite_pets?.length || user.expertise?.length) ? (
              <InterestsSection>
                {user.hobbies && user.hobbies.length > 0 && (
                  <InterestGroup>
                    <InterestLabel>Hobbies</InterestLabel>
                    <TagsContainer>
                      {user.hobbies.slice(0, 5).map((hobby) => (
                        <Tag key={hobby}>{formatTag(hobby)}</Tag>
                      ))}
                      {user.hobbies.length > 5 && <Tag>+{user.hobbies.length - 5} more</Tag>}
                    </TagsContainer>
                  </InterestGroup>
                )}
                {user.skills && user.skills.length > 0 && (
                  <InterestGroup>
                    <InterestLabel>Skills</InterestLabel>
                    <TagsContainer>
                      {user.skills.slice(0, 5).map((skill) => (
                        <Tag key={skill}>{formatTag(skill)}</Tag>
                      ))}
                      {user.skills.length > 5 && <Tag>+{user.skills.length - 5} more</Tag>}
                    </TagsContainer>
                  </InterestGroup>
                )}
                {user.favorite_pets && user.favorite_pets.length > 0 && (
                  <InterestGroup>
                    <InterestLabel>Favorite Pets</InterestLabel>
                    <TagsContainer>
                      {user.favorite_pets.slice(0, 5).map((pet) => (
                        <Tag key={pet}>{formatTag(pet)}</Tag>
                      ))}
                      {user.favorite_pets.length > 5 && <Tag>+{user.favorite_pets.length - 5} more</Tag>}
                    </TagsContainer>
                  </InterestGroup>
                )}
                {user.expertise && user.expertise.length > 0 && (
                  <InterestGroup>
                    <InterestLabel>Expertise</InterestLabel>
                    <TagsContainer>
                      {user.expertise.slice(0, 5).map((exp) => (
                        <Tag key={exp}>{formatTag(exp)}</Tag>
                      ))}
                      {user.expertise.length > 5 && <Tag>+{user.expertise.length - 5} more</Tag>}
                    </TagsContainer>
                  </InterestGroup>
                )}
              </InterestsSection>
            ) : null}

            <StatsContainer>
              <StatItem
                $clickable
                onClick={() => setActiveTab('posts')}
                title="Click to see posts"
              >
                <StatNumber>{posts.length}</StatNumber>
                <StatLabel>Posts</StatLabel>
              </StatItem>
              <StatItem
                $clickable
                onClick={() => setActiveTab('following')}
                title="Click to see who they're following"
              >
                <StatNumber>{followStatsData?.data?.counts?.following_count || 0}</StatNumber>
                <StatLabel>Following</StatLabel>
              </StatItem>
              <StatItem
                $clickable
                onClick={() => setActiveTab('followers')}
                title="Click to see their followers"
              >
                <StatNumber>{followStatsData?.data?.counts?.follower_count || 0}</StatNumber>
                <StatLabel>Followers</StatLabel>
              </StatItem>
            </StatsContainer>

            {isOwnProfile ? (
              <ActionButtons>
                <ActionButton onClick={() => navigate('/settings')}>
                  Edit Profile
                </ActionButton>
              </ActionButtons>
            ) : (
              <ActionButtons>
                <FollowButton userId={user.id} size="large" />
                <RatingButton
                  userId={user.id}
                  username={user.username}
                  onRatingSubmitted={() => {
                    refetchReputation();
                    refetchRatings();
                  }}
                  variant="outline"
                  size="medium"
                />
                <ActionButton $variant="secondary" onClick={handleSendMessage}>Message</ActionButton>
              </ActionButtons>
            )}
          </UserDetails>
        </ProfileInfo>
      </ProfileHeader>

      {/* Tabs Section */}
      <PostsSection>
        <TabsContainer>
          <Tab $active={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>
            Posts
          </Tab>
          <Tab $active={activeTab === 'following'} onClick={() => setActiveTab('following')}>
            Following
          </Tab>
          <Tab $active={activeTab === 'followers'} onClick={() => setActiveTab('followers')}>
            Followers
          </Tab>
        </TabsContainer>

        {/* Posts Tab Content */}
        {activeTab === 'posts' && (
          <>
            {postsLoading ? (
              <LoadingSpinner size="medium" text="Loading posts..." />
            ) : postsError ? (
              <ErrorState>
                <h3>Failed to load posts</h3>
                <p>Something went wrong while loading the posts.</p>
                <RetryButton onClick={() => refetchPosts()}>
                  Try Again
                </RetryButton>
              </ErrorState>
            ) : posts.length > 0 ? (
              <PostsContainer>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onUpdate={() => {
                      refetchPosts();
                    }}
                  />
                ))}
              </PostsContainer>
            ) : (
              <EmptyState>
                <h3>No posts yet</h3>
                <p>
                  {isOwnProfile
                    ? "You haven't shared anything yet. Create your first post to get started!"
                    : `${user.first_name} hasn't shared anything yet.`
                  }
                </p>
              </EmptyState>
            )}
          </>
        )}

        {/* Following Tab Content */}
        {activeTab === 'following' && (
          <>
            {followingLoading ? (
              <LoadingSpinner size="medium" text="Loading following..." />
            ) : followingData?.data?.following && followingData.data.following.length > 0 ? (
              <UserList>
                {followingData.data.following.map((follow: any) => (
                  <UserItem
                    key={follow.id}
                    to={`/profile/${follow.id}`}
                  >
                    <UserAvatar $hasImage={!!follow.avatar_url}>
                      {follow.avatar_url ? (
                        <img src={getUserAvatarUrl(follow)} alt={follow.username} />
                      ) : (
                        follow.first_name?.charAt(0) || follow.username?.charAt(0) || '?'
                      )}
                    </UserAvatar>
                    <UserInfo>
                      <UserDisplayName>{follow.first_name} {follow.last_name}</UserDisplayName>
                      <UserUsername>@{follow.username}</UserUsername>
                    </UserInfo>
                  </UserItem>
                ))}
              </UserList>
            ) : (
              <EmptyState>
                <h3>Not following anyone yet</h3>
                <p>
                  {isOwnProfile
                    ? "You're not following anyone yet. Find people to follow!"
                    : `${user.first_name} isn't following anyone yet.`
                  }
                </p>
              </EmptyState>
            )}
          </>
        )}

        {/* Followers Tab Content */}
        {activeTab === 'followers' && (
          <>
            {followersLoading ? (
              <LoadingSpinner size="medium" text="Loading followers..." />
            ) : followersData?.data?.followers && followersData.data.followers.length > 0 ? (
              <UserList>
                {followersData.data.followers.map((follow: any) => (
                  <UserItem
                    key={follow.id}
                    to={`/profile/${follow.id}`}
                  >
                    <UserAvatar $hasImage={!!follow.avatar_url}>
                      {follow.avatar_url ? (
                        <img src={getUserAvatarUrl(follow)} alt={follow.username} />
                      ) : (
                        follow.first_name?.charAt(0) || follow.username?.charAt(0) || '?'
                      )}
                    </UserAvatar>
                    <UserInfo>
                      <UserDisplayName>{follow.first_name} {follow.last_name}</UserDisplayName>
                      <UserUsername>@{follow.username}</UserUsername>
                    </UserInfo>
                  </UserItem>
                ))}
              </UserList>
            ) : (
              <EmptyState>
                <h3>No followers yet</h3>
                <p>
                  {isOwnProfile
                    ? "You don't have any followers yet."
                    : `${user.first_name} doesn't have any followers yet.`
                  }
                </p>
              </EmptyState>
            )}
          </>
        )}
      </PostsSection>

      {showChatPopup && user && (
        <ChatPopup
          userId={user.id}
          username={user.username}
          avatarUrl={avatarUrl}
          onClose={() => setShowChatPopup(false)}
        />
      )}
    </Container>
  );
};

// Interests Section Styled Components
const InterestsSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const InterestGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const InterestLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Tag = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: ${({ theme }) => theme.colors.primary}15;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`;

export default UserProfilePage;