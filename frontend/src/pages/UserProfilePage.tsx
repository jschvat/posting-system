/**
 * User profile page component - displays user information and posts
 */

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { usersApi, getUserAvatarUrl, followsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import FollowButton from '../components/FollowButton';

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const ProfileHeader = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
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

const Bio = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: 1rem;
`;

const StatsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const StatItem = styled.div<{ $clickable?: boolean }>`
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

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme, variant }) =>
    variant === 'primary' ? theme.colors.primary : theme.colors.border
  };
  background: ${({ theme, variant }) =>
    variant === 'primary' ? theme.colors.primary : theme.colors.surface
  };
  color: ${({ theme, variant }) =>
    variant === 'primary' ? 'white' : theme.colors.text.primary
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme, variant }) =>
      variant === 'primary' ? theme.colors.primary + 'dd' : theme.colors.background
    };
  }
`;

const PostsSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
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

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { state } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'media'>('posts');
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

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

  // Fetch following list (only when modal is open)
  const { data: followingData } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => followsApi.getFollowing(parseInt(userId!)),
    enabled: !!userId && showFollowingModal,
  });

  // Fetch followers list (only when modal is open)
  const { data: followersData } = useQuery({
    queryKey: ['followers', userId],
    queryFn: () => followsApi.getFollowers(parseInt(userId!)),
    enabled: !!userId && showFollowersModal,
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

  return (
    <Container>
      {/* Profile Header */}
      <ProfileHeader>
        <ProfileInfo>
          <Avatar $hasImage={hasAvatar}>
            {hasAvatar ? (
              <img src={avatarUrl} alt={`${user.first_name} ${user.last_name}`} />
            ) : (
              `${user.first_name[0]}${user.last_name[0]}`
            )}
          </Avatar>

          <UserDetails>
            <UserName>{user.first_name} {user.last_name}</UserName>
            <Username>@{user.username}</Username>

            {user.bio && <Bio>{user.bio}</Bio>}

            <StatsContainer>
              <StatItem>
                <StatNumber>{posts.length}</StatNumber>
                <StatLabel>Posts</StatLabel>
              </StatItem>
              <StatItem
                $clickable
                onClick={() => setShowFollowingModal(true)}
                title="Click to see who they're following"
              >
                <StatNumber>{followStatsData?.data?.counts?.following_count || 0}</StatNumber>
                <StatLabel>Following</StatLabel>
              </StatItem>
              <StatItem
                $clickable
                onClick={() => setShowFollowersModal(true)}
                title="Click to see their followers"
              >
                <StatNumber>{followStatsData?.data?.counts?.follower_count || 0}</StatNumber>
                <StatLabel>Followers</StatLabel>
              </StatItem>
            </StatsContainer>

            {isOwnProfile ? (
              <ActionButtons>
                <ActionButton onClick={() => setShowEditProfile(true)}>
                  Edit Profile
                </ActionButton>
              </ActionButtons>
            ) : (
              <ActionButtons>
                <FollowButton userId={user.id} size="large" />
                <ActionButton variant="secondary">Message</ActionButton>
              </ActionButtons>
            )}
          </UserDetails>
        </ProfileInfo>
      </ProfileHeader>

      {/* Posts Section */}
      <PostsSection>
        <SectionHeader>
          <SectionTitle>
            {isOwnProfile ? 'Your Posts' : `${user.first_name}'s Posts`}
          </SectionTitle>
          <SectionSubtitle>
            {posts.length > 0
              ? `${posts.length} post${posts.length === 1 ? '' : 's'}`
              : 'No posts yet'
            }
          </SectionSubtitle>
        </SectionHeader>

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
      </PostsSection>

      {/* Following Modal */}
      {showFollowingModal && createPortal(
        <>
          <Overlay onClick={() => setShowFollowingModal(false)} />
          <Modal>
            <ModalHeader>
              <ModalTitle>Following</ModalTitle>
              <CloseButton onClick={() => setShowFollowingModal(false)}>×</CloseButton>
            </ModalHeader>
            {followingData?.data?.following && followingData.data.following.length > 0 ? (
              <UserList>
                {followingData.data.following.map((follow: any) => (
                  <UserItem
                    key={follow.id}
                    to={`/profile/${follow.id}`}
                    onClick={() => setShowFollowingModal(false)}
                  >
                    <UserAvatar $hasImage={!!follow.avatar_url}>
                      {follow.avatar_url ? (
                        <img src={getUserAvatarUrl(follow.avatar_url)} alt={follow.username} />
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
              <p style={{ textAlign: 'center', color: '#666' }}>Not following anyone yet</p>
            )}
          </Modal>
        </>,
        document.body
      )}

      {/* Followers Modal */}
      {showFollowersModal && createPortal(
        <>
          <Overlay onClick={() => setShowFollowersModal(false)} />
          <Modal>
            <ModalHeader>
              <ModalTitle>Followers</ModalTitle>
              <CloseButton onClick={() => setShowFollowersModal(false)}>×</CloseButton>
            </ModalHeader>
            {followersData?.data?.followers && followersData.data.followers.length > 0 ? (
              <UserList>
                {followersData.data.followers.map((follow: any) => (
                  <UserItem
                    key={follow.id}
                    to={`/profile/${follow.id}`}
                    onClick={() => setShowFollowersModal(false)}
                  >
                    <UserAvatar $hasImage={!!follow.avatar_url}>
                      {follow.avatar_url ? (
                        <img src={getUserAvatarUrl(follow.avatar_url)} alt={follow.username} />
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
              <p style={{ textAlign: 'center', color: '#666' }}>No followers yet</p>
            )}
          </Modal>
        </>,
        document.body
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && createPortal(
        <>
          <Overlay onClick={() => setShowEditProfile(false)} />
          <Modal>
            <ModalHeader>
              <ModalTitle>Edit Profile</ModalTitle>
              <CloseButton onClick={() => setShowEditProfile(false)}>×</CloseButton>
            </ModalHeader>
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              Profile editing coming soon...
            </p>
          </Modal>
        </>,
        document.body
      )}
    </Container>
  );
};

export default UserProfilePage;