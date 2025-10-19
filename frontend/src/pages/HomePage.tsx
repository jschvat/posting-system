/**
 * Home page component - displays the main post feed
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const LoadingMore = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.95rem;
`;

const EndOfFeed = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.9rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const HomePage: React.FC = () => {
  const { state } = useAuth();
  const user = state.user;

  // State for pagination
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Ref for infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch posts using React Query
  const {
    data: postsResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['posts', 'feed', page],
    queryFn: () => postsApi.getPosts({
      page,
      limit: 10,
      sort: 'newest'
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update posts when new data arrives
  useEffect(() => {
    if (postsResponse?.data?.posts) {
      const newPosts = Array.isArray(postsResponse.data.posts) ? postsResponse.data.posts as Post[] : [];

      if (page === 1) {
        // First page - replace all posts
        setAllPosts(newPosts);
      } else {
        // Subsequent pages - append new posts, avoiding duplicates
        setAllPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNewPosts];
        });
      }

      // Check if there are more posts based on pagination info
      const pagination = postsResponse.data.pagination;
      if (pagination) {
        setHasMore(pagination.has_next_page || false);
      } else {
        // Fallback: if we got fewer posts than limit, assume no more
        setHasMore(newPosts.length >= 10);
      }

      setIsLoadingMore(false);
    }
  }, [postsResponse, page]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setIsLoadingMore(true);
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, isLoadingMore]);

  // Refresh function that resets to page 1
  const handleRefresh = useCallback(() => {
    setPage(1);
    setAllPosts([]);
    setHasMore(true);
    refetch();
  }, [refetch]);

  if (isLoading && page === 1) {
    return (
      <Container>
        <LoadingSpinner size="large" />
      </Container>
    );
  }

  if (error && page === 1) {
    return (
      <Container>
        <ErrorState>
          <h3>Unable to load posts</h3>
          <p>Something went wrong while loading the feed. Please try again.</p>
          <LoadMoreButton onClick={handleRefresh} style={{ marginTop: '16px' }}>
            Retry
          </LoadMoreButton>
        </ErrorState>
      </Container>
    );
  }

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
          {allPosts.length > 0
            ? `${allPosts.length} post${allPosts.length === 1 ? '' : 's'} in your feed`
            : 'No posts yet'
          }
        </FeedSubtitle>
      </FeedHeader>

      {/* Posts Feed */}
      {allPosts.length > 0 ? (
        <>
          <PostsContainer>
            {allPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={handleRefresh}
              />
            ))}
          </PostsContainer>

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} style={{ height: '20px' }} />

          {/* Loading indicator */}
          {isLoadingMore && (
            <LoadingMore>
              <LoadingSpinner size="small" />
              <div style={{ marginTop: '8px' }}>Loading more posts...</div>
            </LoadingMore>
          )}

          {/* End of feed indicator */}
          {!hasMore && allPosts.length > 0 && (
            <EndOfFeed>
              You've reached the end of your feed
            </EndOfFeed>
          )}
        </>
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