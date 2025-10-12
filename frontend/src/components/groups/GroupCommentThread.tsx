import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FaArrowUp, FaArrowDown, FaReply, FaTrash } from 'react-icons/fa6';
import { GroupComment, VoteType } from '../../types/group';
import { formatRelativeTime, formatScore, getVoteState } from '../../services/groupCommentsApi';

interface GroupCommentThreadProps {
  comments: GroupComment[];
  onVote?: (commentId: number, voteType: VoteType) => void;
  onReply?: (parentId: number, content: string) => Promise<void>;
  onEdit?: (commentId: number, content: string) => Promise<void>;
  onDelete?: (commentId: number) => void;
  canModerate?: boolean;
  isLocked?: boolean;
  currentUserId?: number;
  maxDepth?: number;
}

const GroupCommentThread: React.FC<GroupCommentThreadProps> = ({
  comments,
  onVote,
  onReply,
  onEdit,
  onDelete,
  canModerate = false,
  isLocked = false,
  currentUserId,
  maxDepth = 10
}) => {
  return (
    <ThreadContainer>
      {comments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onVote={onVote}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          canModerate={canModerate}
          isLocked={isLocked}
          currentUserId={currentUserId}
          maxDepth={maxDepth}
        />
      ))}
    </ThreadContainer>
  );
};

interface CommentItemProps {
  comment: GroupComment;
  onVote?: (commentId: number, voteType: VoteType) => void;
  onReply?: (parentId: number, content: string) => Promise<void>;
  onEdit?: (commentId: number, content: string) => Promise<void>;
  onDelete?: (commentId: number) => void;
  canModerate?: boolean;
  isLocked?: boolean;
  currentUserId?: number;
  maxDepth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onVote,
  onReply,
  onEdit,
  onDelete,
  canModerate,
  isLocked,
  currentUserId,
  maxDepth
}) => {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [collapsed, setCollapsed] = useState(false);

  const voteState = getVoteState(comment);
  const isAuthor = currentUserId === comment.user_id;
  const canEdit = isAuthor && !comment.is_removed;
  const canDelete = isAuthor || canModerate;
  const canReply = !isLocked && onReply && comment.depth < maxDepth!;

  const handleVote = (voteType: VoteType) => {
    if (onVote) {
      onVote(comment.id, voteType);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !onReply) return;

    try {
      setReplying(true);
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setShowReplyBox(false);
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setReplying(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || !onEdit) return;

    try {
      await onEdit(comment.id, editContent.trim());
      setEditing(false);
    } catch (err) {
      console.error('Failed to edit:', err);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    onDelete(comment.id);
  };

  return (
    <CommentContainer $depth={comment.depth}>
      <CommentLine onClick={() => setCollapsed(!collapsed)} />
      <CommentContent>
        <CommentHeader>
          <AuthorLink to={`/profile/${comment.username}`}>
            {comment.username}
          </AuthorLink>
          <Separator>•</Separator>
          <Timestamp title={new Date(comment.created_at).toLocaleString()}>
            {formatRelativeTime(comment.created_at)}
          </Timestamp>
          {comment.is_removed && (
            <>
              <Separator>•</Separator>
              <RemovedBadge>Removed</RemovedBadge>
            </>
          )}
          <CollapseButton onClick={() => setCollapsed(!collapsed)}>
            [{collapsed ? '+' : '−'}]
          </CollapseButton>
        </CommentHeader>

        {!collapsed && (
          <>
            {editing ? (
              <EditBox>
                <EditTextArea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                />
                <EditActions>
                  <EditButton onClick={handleEdit}>Save</EditButton>
                  <CancelButton onClick={() => {
                    setEditing(false);
                    setEditContent(comment.content);
                  }}>
                    Cancel
                  </CancelButton>
                </EditActions>
              </EditBox>
            ) : (
              <CommentText $isRemoved={comment.is_removed}>
                {comment.is_removed
                  ? `[removed] ${comment.removal_reason || 'No reason given'}`
                  : comment.content}
              </CommentText>
            )}

            <CommentFooter>
              <VoteSection>
                <VoteButton
                  onClick={() => handleVote('upvote')}
                  $active={voteState.upvoted}
                  $type="upvote"
                  disabled={!onVote}
                >
                  <FaArrowUp />
                </VoteButton>
                <VoteCount $score={voteState.score}>
                  {formatScore(voteState.score)}
                </VoteCount>
                <VoteButton
                  onClick={() => handleVote('downvote')}
                  $active={voteState.downvoted}
                  $type="downvote"
                  disabled={!onVote}
                >
                  <FaArrowDown />
                </VoteButton>
              </VoteSection>

              {canReply && (
                <ActionButton onClick={() => setShowReplyBox(!showReplyBox)}>
                  <FaReply /> Reply
                </ActionButton>
              )}

              {canEdit && !editing && (
                <ActionButton onClick={() => setEditing(true)}>
                  Edit
                </ActionButton>
              )}

              {canDelete && (
                <ActionButton onClick={handleDelete}>
                  <FaTrash /> Delete
                </ActionButton>
              )}
            </CommentFooter>

            {showReplyBox && (
              <ReplyBox>
                <ReplyTextArea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <ReplyActions>
                  <ReplyButton onClick={handleReply} disabled={replying || !replyContent.trim()}>
                    {replying ? 'Posting...' : 'Reply'}
                  </ReplyButton>
                  <CancelButton onClick={() => {
                    setShowReplyBox(false);
                    setReplyContent('');
                  }}>
                    Cancel
                  </CancelButton>
                </ReplyActions>
              </ReplyBox>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <Replies>
                {comment.replies.map(reply => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    onVote={onVote}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    canModerate={canModerate}
                    isLocked={isLocked}
                    currentUserId={currentUserId}
                    maxDepth={maxDepth}
                  />
                ))}
              </Replies>
            )}
          </>
        )}
      </CommentContent>
    </CommentContainer>
  );
};

const ThreadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CommentContainer = styled.div<{ $depth: number }>`
  display: flex;
  gap: 8px;
  margin-left: ${props => Math.min(props.$depth * 20, 200)}px;
  position: relative;

  @media (max-width: 768px) {
    margin-left: ${props => Math.min(props.$depth * 12, 100)}px;
  }
`;

const CommentLine = styled.div`
  width: 2px;
  background: ${props => props.theme.colors.border};
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
    background: ${props => props.theme.colors.primary};
  }
`;

const CommentContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
`;

const AuthorLink = styled(Link)`
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Separator = styled.span`
  color: ${props => props.theme.colors.text.secondary};
`;

const Timestamp = styled.span`
  color: ${props => props.theme.colors.text.secondary};
`;

const RemovedBadge = styled.span`
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  font-size: 11px;
  font-weight: 600;
`;

const CollapseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  padding: 0 4px;
  margin-left: auto;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const CommentText = styled.p<{ $isRemoved?: boolean }>`
  margin: 0 0 8px 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.$isRemoved ? props.theme.colors.text.secondary : props.theme.colors.text};
  white-space: pre-wrap;
  word-break: break-word;
  font-style: ${props => props.$isRemoved ? 'italic' : 'normal'};
`;

const CommentFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const VoteSection = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const VoteButton = styled.button<{ $active: boolean; $type: 'upvote' | 'downvote' }>`
  background: none;
  border: none;
  color: ${props =>
    props.$active
      ? props.$type === 'upvote'
        ? '#FF6B35'
        : '#4A90E2'
      : props.theme.colors.text.secondary};
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: ${props => props.$type === 'upvote' ? '#FF6B35' : '#4A90E2'};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;

const VoteCount = styled.span<{ $score: number }>`
  font-weight: 600;
  font-size: 12px;
  color: ${props =>
    props.$score > 0
      ? '#FF6B35'
      : props.$score < 0
      ? '#4A90E2'
      : props.theme.colors.text.secondary};
  min-width: 30px;
  text-align: center;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
  }

  svg {
    font-size: 11px;
  }
`;

const ReplyBox = styled.div`
  margin: 8px 0 12px 0;
  padding: 12px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
`;

const ReplyTextArea = styled.textarea`
  width: 100%;
  padding: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 8px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ReplyActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ReplyButton = styled.button`
  padding: 6px 16px;
  border-radius: 4px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.background};
  }
`;

const EditBox = styled.div`
  margin: 0 0 12px 0;
`;

const EditTextArea = styled.textarea`
  width: 100%;
  padding: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  margin-bottom: 8px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: 8px;
`;

const EditButton = styled.button`
  padding: 6px 16px;
  border-radius: 4px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary};
  }
`;

const Replies = styled.div`
  margin-top: 8px;
`;

export default GroupCommentThread;
