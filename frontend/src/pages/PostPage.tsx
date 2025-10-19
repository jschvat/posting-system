/**
 * Single post page component - displays a post with comments
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, commentsApi, getUserAvatarUrl } from '../services/api';
import PostCard from '../components/PostCard';
import CommentForm from '../components/CommentForm';
import RatingBadge from '../components/RatingBadge';
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

const CommentItem = styled.div<{ $depth?: number }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-left: ${({ $depth }) => $depth ? `${$depth * 32}px` : '0'};

  &:last-child {
    border-bottom: none;
  }
`;

const CommentAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme, $hasImage }) => $hasImage ? 'transparent' : theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.85rem;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CommentBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  flex-wrap: wrap;
`;

const CommentAuthor = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
`;

const CommentTime = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CommentContent = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  line-height: 1.4;
  font-size: 14px;
  word-break: break-word;
`;

const ReplyIndicator = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

// Utility function for formatting time
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

// Recursive comment renderer
const CommentRenderer: React.FC<{ comment: Comment; depth?: number; maxDepth?: number }> = ({
  comment,
  depth = 0,
  maxDepth = 5
}) => {
  const avatarUrl = comment.author ? getUserAvatarUrl(comment.author) : '';
  const actualDepth = Math.min(depth, maxDepth);

  return (
    <>
      <CommentItem $depth={actualDepth}>
        <CommentAvatar $hasImage={Boolean(avatarUrl)}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${comment.author?.first_name} ${comment.author?.last_name}`}
            />
          ) : (
            comment.author
              ? `${comment.author.first_name[0]}${comment.author.last_name[0]}`
              : 'U'
          )}
        </CommentAvatar>
        <CommentBody>
          <CommentHeader>
            <CommentAuthor>
              {comment.author
                ? `${comment.author.first_name} ${comment.author.last_name}`
                : 'Unknown User'}
            </CommentAuthor>
            {comment.author && (
              <RatingBadge
                score={comment.author.reputation_score || 0}
                size="tiny"
                inline
                showScore={false}
              />
            )}
            <span style={{ color: '#8e8e93' }}>•</span>
            <CommentTime>{formatTimeAgo(comment.created_at)}</CommentTime>
          </CommentHeader>
          {depth > 0 && (
            <ReplyIndicator>↳ Reply to comment</ReplyIndicator>
          )}
          <CommentContent>{comment.content}</CommentContent>
        </CommentBody>
      </CommentItem>

      {/* Recursively render nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <>
          {comment.replies.map((reply) => (
            <CommentRenderer
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </>
      )}
    </>
  );
};

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
              <CommentRenderer key={comment.id} comment={comment} depth={0} />
            ))}
          </>
        )}
      </CommentsSection>
    </Container>
  );
};

export default PostPage;
