/**
 * Group Post Detail Page - displays a single post with comments
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import groupPostsApi from '../services/groupPostsApi';
import groupCommentsApi from '../services/groupCommentsApi';
import { GroupPost, GroupComment, VoteType } from '../types/group';
import { FaArrowUp, FaArrowDown, FaComment, FaArrowLeft } from 'react-icons/fa6';
import GroupCommentThread from '../components/groups/GroupCommentThread';

const getErrorMessage = (err: any): string => {
  const error = err.response?.data?.error;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return err.message || 'An error occurred';
};

const GroupPostPage: React.FC = () => {
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const { state } = useAuth();
  const user = state.user;
  const navigate = useNavigate();
  const { showError } = useToast();

  const [post, setPost] = useState<GroupPost | null>(null);
  const [comments, setComments] = useState<GroupComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (slug && postId) {
      loadPostAndComments();
    }
  }, [slug, postId]);

  const loadPostAndComments = async () => {
    if (!slug || !postId) return;

    try {
      setLoading(true);
      setError(null);

      const [postResponse, commentsResponse] = await Promise.all([
        groupPostsApi.getPost(slug, parseInt(postId)),
        groupCommentsApi.getComments(slug, parseInt(postId))
      ]);

      if (postResponse.success && postResponse.data) {
        const data = postResponse.data as any;
        setPost(data.post || data);
      }

      if (commentsResponse.success && commentsResponse.data) {
        const data = commentsResponse.data as any;
        const commentsList = data.comments || [];
        const tree = groupCommentsApi.buildCommentTree(commentsList);
        setComments(tree);
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (voteType: VoteType) => {
    if (!user || !slug || !post) {
      navigate('/login');
      return;
    }

    try {
      const response = await groupPostsApi.toggleVote(slug, post.id, voteType, post.user_vote);
      if (response.success && response.data) {
        const counts = response.data.counts;
        setPost({
          ...post,
          upvotes: counts.upvotes,
          downvotes: counts.downvotes,
          score: counts.score,
          user_vote: counts.user_vote
        });
      }
    } catch (err: any) {
      console.error('Failed to vote:', err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !slug || !post || !newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await groupCommentsApi.createComment(slug, post.id, {
        content: newComment.trim()
      });

      if (response.success) {
        setNewComment('');
        await loadPostAndComments();
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.toLowerCase().includes('member')) {
        showError('You must be a member of this group to comment on posts. Please join the group first.');
      } else {
        showError(errorMsg || 'Failed to post comment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentVote = async (commentId: number, voteType: VoteType) => {
    if (!user || !slug || !post) {
      navigate('/login');
      return;
    }

    try {
      await groupCommentsApi.voteOnComment(slug!, commentId, voteType);
      await loadPostAndComments();
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.toLowerCase().includes('member')) {
        showError('You must be a member of this group to vote on comments. Please join the group first.');
      } else {
        showError(errorMsg || 'Failed to vote on comment');
      }
    }
  };

  const handleCommentReply = async (parentId: number, content: string) => {
    if (!user || !slug || !post) return;

    try {
      const response = await groupCommentsApi.createComment(slug, post.id, {
        content,
        parent_id: parentId
      });

      if (response.success) {
        await loadPostAndComments();
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.toLowerCase().includes('member')) {
        throw new Error('You must be a member of this group to reply to comments. Please join the group first.');
      } else {
        throw new Error(errorMsg || 'Failed to post reply');
      }
    }
  };

  const handleCommentEdit = async (commentId: number, content: string) => {
    if (!user || !slug || !post) return;

    try {
      const response = await groupCommentsApi.updateComment(slug!, commentId, {
        content
      });

      if (response.success) {
        await loadPostAndComments();
      }
    } catch (err: any) {
      throw new Error(getErrorMessage(err) || 'Failed to edit comment');
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    if (!user || !slug || !post) return;

    try {
      const response = await groupCommentsApi.deleteComment(slug!, commentId);
      if (response.success) {
        await loadPostAndComments();
      }
    } catch (err: any) {
      showError(getErrorMessage(err) || 'Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingMessage>Loading post...</LoadingMessage>
      </Container>
    );
  }

  if (error || !post) {
    return (
      <Container>
        <ErrorMessage>{error || 'Post not found'}</ErrorMessage>
        <BackLink to={slug ? `/g/${slug}` : '/groups'}>
          <FaArrowLeft /> Back to {slug || 'groups'}
        </BackLink>
      </Container>
    );
  }

  return (
    <Container>
      <BackLink to={`/g/${slug}`}>
        <FaArrowLeft /> Back to r/{slug}
      </BackLink>

      <PostCard>
        <VoteSection>
          <VoteButton
            onClick={() => handleVote('upvote')}
            $active={post.user_vote === 'upvote'}
            disabled={!user}
          >
            <FaArrowUp />
          </VoteButton>
          <VoteCount $score={post.score}>{post.score}</VoteCount>
          <VoteButton
            onClick={() => handleVote('downvote')}
            $active={post.user_vote === 'downvote'}
            disabled={!user}
          >
            <FaArrowDown />
          </VoteButton>
        </VoteSection>

        <PostContent>
          <PostHeader>
            <AuthorInfo>
              {post.avatar_url && <Avatar src={post.avatar_url} alt={post.username} />}
              <div>
                <Author>u/{post.username}</Author>
                <Timestamp>{new Date(post.created_at).toLocaleString()}</Timestamp>
              </div>
            </AuthorInfo>
            {post.is_pinned && <PinnedBadge>Pinned</PinnedBadge>}
          </PostHeader>

          {post.title && <PostTitle>{post.title}</PostTitle>}
          {post.content && <PostBody>{post.content}</PostBody>}

          <PostFooter>
            <FooterItem>
              <FaComment /> {post.comment_count} comments
            </FooterItem>
          </PostFooter>
        </PostContent>
      </PostCard>

      <CommentsSection>
        <CommentsSectionHeader>
          <h3>Comments ({post.comment_count})</h3>
        </CommentsSectionHeader>

        {user ? (
          <CommentForm onSubmit={handleCommentSubmit}>
            <CommentTextarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="What are your thoughts?"
              rows={4}
              disabled={submitting}
            />
            <CommentButton type="submit" disabled={!newComment.trim() || submitting}>
              {submitting ? 'Posting...' : 'Comment'}
            </CommentButton>
          </CommentForm>
        ) : (
          <LoginPrompt>
            <Link to="/login">Log in</Link> to comment
          </LoginPrompt>
        )}

        {comments.length === 0 ? (
          <EmptyComments>No comments yet. Be the first to comment!</EmptyComments>
        ) : (
          <CommentsList>
            {comments.map(comment => (
              <GroupCommentThread
                key={comment.id}
                comments={[comment]}
                onVote={handleCommentVote}
                onReply={handleCommentReply}
                onEdit={handleCommentEdit}
                onDelete={handleCommentDelete}
                currentUserId={user?.id}
                canModerate={false}
                isLocked={false}
              />
            ))}
          </CommentsList>
        )}
      </CommentsSection>
    </Container>
  );
};

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.theme.colors.text.secondary};
  text-decoration: none;
  margin-bottom: 16px;
  font-size: 14px;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }

  svg {
    font-size: 12px;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  border-radius: 8px;
  color: #f44336;
  margin-bottom: 16px;
`;

const PostCard = styled.div`
  display: flex;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
`;

const VoteSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${props => props.theme.colors.background};
  padding: 12px 8px;
  min-width: 48px;
`;

const VoteButton = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.text.secondary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  svg {
    font-size: 20px;
  }
`;

const VoteCount = styled.div<{ $score: number }>`
  font-weight: 700;
  font-size: 14px;
  margin: 8px 0;
  color: ${props =>
    props.$score > 0
      ? props.theme.colors.success
      : props.$score < 0
      ? props.theme.colors.error
      : props.theme.colors.text};
`;

const PostContent = styled.div`
  flex: 1;
  padding: 16px;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
`;

const Author = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${props => props.theme.colors.text};
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
`;

const PinnedBadge = styled.span`
  background: ${props => props.theme.colors.success};
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
`;

const PostTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: ${props => props.theme.colors.text};
`;

const PostBody = styled.div`
  color: ${props => props.theme.colors.text};
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 16px;
`;

const PostFooter = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const FooterItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;

  svg {
    font-size: 16px;
  }
`;

const CommentsSection = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 20px;
`;

const CommentsSectionHeader = styled.div`
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 18px;
    color: ${props => props.theme.colors.text};
  }
`;

const CommentForm = styled.form`
  margin-bottom: 24px;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 8px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CommentButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoginPrompt = styled.div`
  text-align: center;
  padding: 16px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 24px;

  a {
    color: ${props => props.theme.colors.primary};
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const EmptyComments = styled.div`
  text-align: center;
  padding: 32px;
  color: ${props => props.theme.colors.text.secondary};
`;

const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export default GroupPostPage;
