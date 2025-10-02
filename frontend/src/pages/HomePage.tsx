/**
 * Home page component - displays the main post feed
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { postsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const WelcomeSection = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const WelcomeTitle = styled.h1`
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 1.75rem;
`;

const WelcomeText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 1.1rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FeedHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FeedTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 1.5rem;
`;

const FeedSubtitle = styled.p`
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

const LoadMoreButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin: ${({ theme }) => theme.spacing.xl} auto 0;
  display: block;
  transition: background-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}dd;
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }
`;

const HomePage: React.FC = () => {
  const { state } = useAuth();
  const user = state.user;

  // Fetch posts using React Query
  const {
    data: postsResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['posts', 'feed'],
    queryFn: () => postsApi.getPosts({
      page: 1,
      limit: 20,
      sort: 'newest'
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Container>
        <LoadingSpinner size="large" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>
          <h3>Unable to load posts</h3>
          <p>Something went wrong while loading the feed. Please try again.</p>
          <LoadMoreButton onClick={() => refetch()} style={{ marginTop: '16px' }}>
            Retry
          </LoadMoreButton>
        </ErrorState>
      </Container>
    );
  }

  const posts: Post[] = Array.isArray(postsResponse?.data?.posts) ? postsResponse!.data.posts as Post[] : [];

  return (
    <Container>
      {/* Welcome Section */}
      <WelcomeSection>
        <WelcomeTitle>Welcome back, {user?.first_name}!</WelcomeTitle>
        <WelcomeText>
          Stay connected with your friends and discover what's happening in your network.
        </WelcomeText>
      </WelcomeSection>

      {/* Feed Header */}
      <FeedHeader>
        <FeedTitle>Latest Posts</FeedTitle>
        <FeedSubtitle>
          {posts.length > 0
            ? `${posts.length} post${posts.length === 1 ? '' : 's'} in your feed`
            : 'No posts yet'
          }
        </FeedSubtitle>
      </FeedHeader>

      {/* Posts Feed */}
      {posts.length > 0 ? (
        <PostsContainer>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onUpdate={() => refetch()}
            />
          ))}
        </PostsContainer>
      ) : (
        <EmptyState>
          <h3>No posts to show</h3>
          <p>Be the first to share something! Create a post to get started.</p>
        </EmptyState>
      )}
    </Container>
  );
};

export default HomePage;