/**
 * PostCard Component - displays individual posts in the feed
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Post, Comment } from '../types';
import { reactionsApi, commentsApi, getUserAvatarUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ReactionPicker from './ReactionPicker';
import ReactionsPopup from './ReactionsPopup';
import CommentForm from './CommentForm';

// Utility function for formatting time ago
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

const Card = styled.article`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const PostHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const AuthorAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme, $hasImage }) => $hasImage ? 'transparent' : theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AuthorInfo = styled.div`
  flex: 1;
`;

const AuthorName = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  display: block;
  margin-bottom: 2px;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
  }
`;

const PostMeta = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PostContent = styled.div`
  padding: 0 ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.md};
`;

const PostText = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  white-space: pre-wrap;
  word-break: break-word;
`;

const PostActions = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: none;
  border: none;
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text.secondary};
  font-size: 0.9rem;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.primary};
  }

  .emoji {
    font-size: 1.1em;
  }
`;

const CommentsSection = styled.div<{ $isOpen: boolean }>`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  max-height: 300px;
  overflow-y: auto;
`;

const CommentsList = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
`;

const CommentItem = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};

  &:last-child {
    margin-bottom: 0;
  }
`;

const CommentAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme, $hasImage }) => $hasImage ? 'transparent' : theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.7rem;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  flex-shrink: 0;
`;

const CommentContent = styled.div`
  flex: 1;
`;

const CommentAuthor = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.85rem;
`;

const CommentText = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.85rem;
  margin: 2px 0;
  line-height: 1.4;
`;

const CommentTime = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ReplyItem = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
  margin-left: ${({ theme }) => theme.spacing.lg};
  padding-left: ${({ theme }) => theme.spacing.md};
  border-left: 2px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    margin-bottom: 0;
  }
`;

const ReplyAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme, $hasImage }) => $hasImage ? 'transparent' : theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.6rem;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  flex-shrink: 0;
`;

const ReplyContent = styled.div`
  flex: 1;
`;

const ReplyAuthor = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.8rem;
`;

const ReplyText = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.8rem;
  margin: 2px 0;
  line-height: 1.4;
`;

const ReplyTime = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const LoadMoreComments = styled.button<{ disabled?: boolean }>`
  color: ${({ theme, disabled }) => disabled ? theme.colors.text.muted : theme.colors.primary};
  background: none;
  border: none;
  font-size: 0.85rem;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

interface PostCardProps {
  post: Post;
  onUpdate?: () => void;
}

// Recursive comment rendering component
const CommentRenderer: React.FC<{ comment: Comment; depth?: number }> = ({ comment, depth = 0 }) => {
  const commentAvatarUrl = comment.author ? getUserAvatarUrl(comment.author) : '';
  const hasCommentAvatar = Boolean(comment.author?.avatar_url);
  const isReply = depth > 0;
  const maxDepth = 5; // Maximum nesting depth for visual indentation

  const Avatar = isReply ? ReplyAvatar : CommentAvatar;
  const Content = isReply ? ReplyContent : CommentContent;
  const Author = isReply ? ReplyAuthor : CommentAuthor;
  const Text = isReply ? ReplyText : CommentText;
  const Time = isReply ? ReplyTime : CommentTime;
  const Item = isReply ? ReplyItem : CommentItem;

  const indentLevel = Math.min(depth, maxDepth);
  const marginLeft = indentLevel * 20; // 20px per level of nesting

  return (
    <div style={{ marginLeft: `${marginLeft}px` }}>
      <Item>
        <Avatar $hasImage={hasCommentAvatar}>
          {hasCommentAvatar && comment.author ? (
            <img src={commentAvatarUrl} alt={`${comment.author.first_name} ${comment.author.last_name}`} />
          ) : (
            comment.author ? `${comment.author.first_name[0]}${comment.author.last_name[0]}` : 'U'
          )}
        </Avatar>
        <Content>
          <div>
            <Author>
              {comment.author ? `${comment.author.first_name} ${comment.author.last_name}` : 'Unknown User'}
            </Author>
          </div>
          <Text>{comment.content}</Text>
          <Time>{formatTimeAgo(comment.created_at)}</Time>
        </Content>
      </Item>

      {/* Recursively render all nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentRenderer key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate }) => {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Scroll position tracking
  const commentsListRef = useRef<HTMLDivElement>(null);
  const [scrollAnchorElement, setScrollAnchorElement] = useState<HTMLElement | null>(null);

  // Get author avatar
  const authorAvatarUrl = post.author ? getUserAvatarUrl(post.author) : '';
  const hasAuthorAvatar = Boolean(post.author?.avatar_url);

  // Fetch post reactions with user details
  const { data: reactionsData } = useQuery({
    queryKey: ['reactions', 'post', post.id],
    queryFn: () => reactionsApi.getPostReactions(post.id, { include_users: true }),
  });

  // Fetch initial comments when shown
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', 'post', post.id, 'page', currentPage],
    queryFn: () => commentsApi.getPostComments(post.id, { limit: 5, page: currentPage }),
    enabled: showComments,
  });

  // Update comments when data changes
  React.useEffect(() => {
    if (commentsData?.data) {
      if (currentPage === 1) {
        setAllComments(commentsData.data.comments);
      } else {
        setAllComments(prev => [...prev, ...commentsData.data.comments]);
      }
      setHasMoreComments(commentsData.data.pagination.has_next_page);
      setIsLoadingMore(false);
    }
  }, [commentsData, currentPage]);

  // Restore scroll position after loading more comments
  useEffect(() => {
    if (currentPage > 1 && !isLoadingMore && scrollAnchorElement && showComments) {
      // Use setTimeout to ensure DOM is fully updated after new comments are rendered
      setTimeout(() => {
        scrollAnchorElement.scrollIntoView({
          behavior: 'auto',
          block: 'center'
        });
        setScrollAnchorElement(null); // Reset after restoration
      }, 100);
    }
  }, [isLoadingMore, currentPage, scrollAnchorElement, showComments]);

  // Load more comments function
  const loadMoreComments = () => {
    if (!hasMoreComments || isLoadingMore) return;

    // Use the last comment as scroll anchor
    if (commentsListRef.current && commentsListRef.current.children.length > 0) {
      const lastComment = commentsListRef.current.children[commentsListRef.current.children.length - 1] as HTMLElement;
      setScrollAnchorElement(lastComment);
    }

    setIsLoadingMore(true);
    setCurrentPage(prev => prev + 1);
  };

  // Reset comments when toggling view
  const toggleCommentsView = () => {
    if (!showComments) {
      setCurrentPage(1);
      setHasMoreComments(false);
    }
    setShowComments(!showComments);
  };

  // React to post mutation
  const reactMutation = useMutation({
    mutationFn: (emojiName: string) => reactionsApi.togglePostReaction(post.id, { emoji_name: emojiName }),
    onMutate: async (emojiName: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['reactions', 'post', post.id] });

      // Snapshot the previous value
      const previousReactions = queryClient.getQueryData(['reactions', 'post', post.id]);

      // Optimistically update to the new value
      queryClient.setQueryData(['reactions', 'post', post.id], (old: any) => {
        if (!old || !state.user) return old;

        const data = old.data;
        const reactionCounts = [...(data.reaction_counts || [])];
        const detailedReactions = [...(data.detailed_reactions || [])];

        // Find existing user reaction
        const existingReactionIndex = detailedReactions.findIndex(r => r.user_id === state.user?.id);

        if (existingReactionIndex >= 0) {
          const existingReaction = detailedReactions[existingReactionIndex];

          // If same emoji, remove reaction
          if (existingReaction.emoji_name === emojiName) {
            detailedReactions.splice(existingReactionIndex, 1);
            // Decrease count
            const countIndex = reactionCounts.findIndex(rc => rc.emoji_name === emojiName);
            if (countIndex >= 0) {
              if (reactionCounts[countIndex].count > 1) {
                reactionCounts[countIndex] = { ...reactionCounts[countIndex], count: reactionCounts[countIndex].count - 1 };
              } else {
                reactionCounts.splice(countIndex, 1);
              }
            }
          } else {
            // Different emoji, replace reaction
            // Decrease old emoji count
            const oldCountIndex = reactionCounts.findIndex(rc => rc.emoji_name === existingReaction.emoji_name);
            if (oldCountIndex >= 0) {
              if (reactionCounts[oldCountIndex].count > 1) {
                reactionCounts[oldCountIndex] = { ...reactionCounts[oldCountIndex], count: reactionCounts[oldCountIndex].count - 1 };
              } else {
                reactionCounts.splice(oldCountIndex, 1);
              }
            }

            // Update detailed reaction
            detailedReactions[existingReactionIndex] = { ...existingReaction, emoji_name: emojiName };

            // Increase new emoji count
            const newCountIndex = reactionCounts.findIndex(rc => rc.emoji_name === emojiName);
            if (newCountIndex >= 0) {
              reactionCounts[newCountIndex] = { ...reactionCounts[newCountIndex], count: reactionCounts[newCountIndex].count + 1 };
            } else {
              reactionCounts.push({ emoji_name: emojiName, count: 1 });
            }
          }
        } else {
          // No existing reaction, add new one
          detailedReactions.push({
            id: Date.now(), // temporary ID
            user_id: state.user.id,
            post_id: post.id,
            emoji_name: emojiName,
            created_at: new Date().toISOString(),
          });

          // Increase count
          const countIndex = reactionCounts.findIndex(rc => rc.emoji_name === emojiName);
          if (countIndex >= 0) {
            reactionCounts[countIndex] = { ...reactionCounts[countIndex], count: reactionCounts[countIndex].count + 1 };
          } else {
            reactionCounts.push({ emoji_name: emojiName, count: 1 });
          }
        }

        return {
          ...old,
          data: {
            ...data,
            reaction_counts: reactionCounts,
            detailed_reactions: detailedReactions,
            total_reactions: reactionCounts.reduce((sum, rc) => sum + rc.count, 0)
          }
        };
      });

      // Return a context object with the snapshotted value
      return { previousReactions };
    },
    onError: (err, newReaction, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['reactions', 'post', post.id], context?.previousReactions);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['reactions', 'post', post.id] });
      onUpdate?.();
    },
  });

  const reactions = reactionsData?.data?.reaction_counts || [];
  const detailedReactions = reactionsData?.data?.detailed_reactions || [];
  const comments = allComments;
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  // Find current user's reaction
  const currentUserReaction = state.user ?
    detailedReactions.find(reaction => reaction.user_id === state.user?.id) : null;

  const handleReaction = (emojiName: string) => {
    if (state.isAuthenticated) {
      reactMutation.mutate(emojiName);
    }
  };

  const handleRemoveReaction = () => {
    if (state.isAuthenticated && currentUserReaction) {
      reactMutation.mutate(currentUserReaction.emoji_name);
    }
  };

  const toggleComments = () => {
    toggleCommentsView();
  };


  return (
    <Card>
      {/* Post Header */}
      <PostHeader>
        <AuthorAvatar $hasImage={hasAuthorAvatar}>
          {hasAuthorAvatar && post.author ? (
            <img src={authorAvatarUrl} alt={`${post.author.first_name} ${post.author.last_name}`} />
          ) : (
            post.author ? `${post.author.first_name[0]}${post.author.last_name[0]}` : 'U'
          )}
        </AuthorAvatar>

        <AuthorInfo>
          <AuthorName to={`/user/${post.author?.id || post.user_id}`}>
            {post.author ? `${post.author.first_name} ${post.author.last_name}` : 'Unknown User'}
          </AuthorName>
          <PostMeta>
            <span>@{post.author?.username || 'unknown'}</span>
            <span>•</span>
            <span>{formatTimeAgo(post.created_at)}</span>
            {post.privacy_level !== 'public' && (
              <>
                <span>•</span>
                <span>{post.privacy_level}</span>
              </>
            )}
          </PostMeta>
        </AuthorInfo>
      </PostHeader>

      {/* Post Content */}
      <PostContent>
        <PostText>{post.content}</PostText>
      </PostContent>

      {/* Post Actions */}
      <PostActions>
        <ReactionPicker
          currentReaction={currentUserReaction?.emoji_name || null}
          totalReactions={totalReactions}
          reactionCounts={reactions}
          onReactionSelect={handleReaction}
          onReactionRemove={handleRemoveReaction}
        />

        <ActionButton onClick={toggleComments}>
          <span>💬</span>
          <span>{post.comment_count || 0} Comment{(post.comment_count || 0) === 1 ? '' : 's'}</span>
        </ActionButton>

        {totalReactions > 0 && (
          <ReactionsPopup
            reactionCounts={reactions}
            totalReactions={totalReactions}
          >
            <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#65676b' }}>
              {totalReactions} reaction{totalReactions === 1 ? '' : 's'}
            </div>
          </ReactionsPopup>
        )}
      </PostActions>

      {/* Comments Section */}
      <CommentsSection $isOpen={showComments}>
        {commentsLoading ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#65676b' }}>
            Loading comments...
          </div>
        ) : (
          <CommentsList ref={commentsListRef}>
            {comments.map((comment) => (
              <CommentRenderer key={comment.id} comment={comment} depth={0} />
            ))}

            {comments.length === 0 && (
              <div style={{ textAlign: 'center', color: '#65676b', padding: '16px' }}>
                No comments yet. Be the first to comment!
              </div>
            )}

            {hasMoreComments && (
              <LoadMoreComments
                onClick={loadMoreComments}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load more comments'}
              </LoadMoreComments>
            )}
          </CommentsList>
        )}

        {/* Comment Form */}
        <CommentForm
          postId={post.id}
          onSuccess={() => {
            // Refresh comments after successful creation
            queryClient.invalidateQueries({ queryKey: ['comments', 'post', post.id] });
            // Also invalidate posts cache to update comment counts in feed
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            // Call the parent onUpdate callback if provided
            onUpdate?.();
          }}
        />
      </CommentsSection>
    </Card>
  );
};

export default PostCard;