/**
 * Single post page component - displays a post with comments
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, commentsApi } from '../services/api';
import PostCard from '../components/PostCard';
import CommentForm from '../components/CommentForm';
import { Post, Comment } from '../types';

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const LoadingContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorContainer = styled(LoadingContainer)`
  color: ${({ theme }) => theme.colors.error};
`;

const CommentsSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const CommentsSectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CommentFormWrapper = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const CommentsListTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: ${({ theme }) => theme.spacing.lg} 0 ${({ theme }) => theme.spacing.md} 0;
`;

const NoComments = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
`;

const BackButton = styled.button`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  font-size: 14px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  transition: background-color 0.2s;

  &:hover {
    background: #f7f8fa;
  }

  &:before {
    content: '←';
    font-size: 16px;
  }
`;

const CommentItem = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const CommentHeader = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CommentAuthor = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CommentContent = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  line-height: 1.4;
`;

const PostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch post data
  const {
    data: postData,
    isLoading: isLoadingPost,
    error: postError
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const response = await postsApi.getPost(parseInt(postId!));
      return response.data;
    },
    enabled: !!postId
  });

  // Fetch comments
  const {
    data: commentsData,
    isLoading: isLoadingComments
  } = useQuery({
    queryKey: ['comments', 'post', postId],
    queryFn: async () => {
      const response = await commentsApi.getPostComments(parseInt(postId!), { sort: 'newest' });
      return response.data;
    },
    enabled: !!postId
  });

  const handleCommentSuccess = () => {
    // Invalidate queries to refresh comments
    queryClient.invalidateQueries({ queryKey: ['comments', 'post', postId] });
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoadingPost) {
    return (
      <Container>
        <LoadingContainer>
          <p>Loading post...</p>
        </LoadingContainer>
      </Container>
    );
  }

  if (postError || !postData) {
    return (
      <Container>
        <BackButton onClick={handleBack}>Back</BackButton>
        <ErrorContainer>
          <h3>Post Not Found</h3>
          <p>The post you're looking for doesn't exist or has been removed.</p>
        </ErrorContainer>
      </Container>
    );
  }

  const comments = commentsData?.comments || [];
  const commentCount = commentsData?.total_count || 0;

  return (
    <Container>
      <BackButton onClick={handleBack}>Back</BackButton>

      {/* Display the post */}
      <PostCard post={postData} />

      {/* Comments section */}
      <CommentsSection>
        <CommentsSectionTitle>
          Comments {commentCount > 0 && `(${commentCount})`}
        </CommentsSectionTitle>

        {/* Comment form */}
        <CommentFormWrapper>
          <CommentForm
            postId={parseInt(postId!)}
            onSuccess={handleCommentSuccess}
            placeholder="Write a comment..."
          />
        </CommentFormWrapper>

        {/* Comments list */}
        {isLoadingComments ? (
          <LoadingContainer>
            <p>Loading comments...</p>
          </LoadingContainer>
        ) : comments.length === 0 ? (
          <NoComments>
            No comments yet. Be the first to comment!
          </NoComments>
        ) : (
          <>
            <CommentsListTitle>
              {commentCount === 1 ? '1 Comment' : `${commentCount} Comments`}
            </CommentsListTitle>
            {comments.map((comment: Comment) => (
              <CommentItem key={comment.id}>
                <CommentHeader>
                  <CommentAuthor>
                    @{comment.author?.username || 'Unknown'}
                  </CommentAuthor>
                  <span>•</span>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                </CommentHeader>
                <CommentContent>{comment.content}</CommentContent>
              </CommentItem>
            ))}
          </>
        )}
      </CommentsSection>
    </Container>
  );
};

export default PostPage;
