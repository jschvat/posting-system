import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaArrowUp, FaArrowDown, FaComment, FaThumbtack, FaLock, FaTrash, FaEdit } from 'react-icons/fa6';
import { GroupPost, VoteType } from '../../types/group';
import { formatRelativeTime, formatScore, getVoteState } from '../../services/groupPostsApi';
import RatingBadge from '../RatingBadge';

interface GroupPostCardProps {
  post: GroupPost;
  onVote?: (postId: number, voteType: VoteType) => void;
  onDelete?: (postId: number) => void;
  canModerate?: boolean;
  onPin?: (postId: number) => void;
  onLock?: (postId: number) => void;
  onRemove?: (postId: number) => void;
  showGroupName?: boolean;
  groupSlug?: string;
}

const GroupPostCard: React.FC<GroupPostCardProps> = ({
  post,
  onVote,
  onDelete,
  canModerate = false,
  onPin,
  onLock,
  onRemove,
  showGroupName = false,
  groupSlug
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const voteState = getVoteState(post);

  const handleVote = (voteType: VoteType) => {
    if (onVote) {
      onVote(post.id, voteType);
    }
  };

  const getThumbnail = () => {
    if (post.media && post.media.length > 0) {
      const firstMedia = post.media[0];
      if (firstMedia.media_type.startsWith('image')) {
        return firstMedia.thumbnail_url || firstMedia.file_url;
      } else if (firstMedia.media_type.startsWith('video')) {
        return firstMedia.thumbnail_url;
      }
    }
    return null;
  };

  const thumbnail = getThumbnail();

  return (
    <Card>
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

      <Content>
        <PostHeader>
          <PostMeta>
            {showGroupName && post.group_slug && (
              <>
                <GroupLink to={`/g/${post.group_slug}`}>
                  g/{post.group_name || post.group_slug}
                </GroupLink>
                <Separator>•</Separator>
              </>
            )}
            <AuthorLink to={`/profile/${post.username}`}>
              u/{post.username}
            </AuthorLink>
            <Separator>•</Separator>
            <RatingBadge
              score={post.reputation_score || 0}
              size="tiny"
              inline
              showScore={false}
            />
            <Separator>•</Separator>
            <Timestamp title={new Date(post.created_at).toLocaleString()}>
              {formatRelativeTime(post.created_at)}
            </Timestamp>
            {post.is_pinned && (
              <>
                <Separator>•</Separator>
                <Badge $color="#4CAF50">
                  <FaThumbtack /> Pinned
                </Badge>
              </>
            )}
            {post.is_locked && (
              <>
                <Separator>•</Separator>
                <Badge $color="#FF9800">
                  <FaLock /> Locked
                </Badge>
              </>
            )}
            {post.status === 'pending' && (
              <>
                <Separator>•</Separator>
                <Badge $color="#2196F3">Pending Approval</Badge>
              </>
            )}
            {post.status === 'removed' && (
              <>
                <Separator>•</Separator>
                <Badge $color="#F44336">Removed</Badge>
              </>
            )}
          </PostMeta>
        </PostHeader>

        <PostLink to={`/g/${groupSlug || post.group_slug}/posts/${post.id}`}>
          <PostTitle>{post.title}</PostTitle>

          {post.media && post.media.length > 0 && (
            <MediaGallery>
              {post.media.slice(0, 4).map((media, index) => (
                <MediaItem key={media.id} $count={Math.min(post.media!.length, 4)}>
                  {media.media_type.startsWith('image') ? (
                    <MediaImage src={media.file_url} alt={`Media ${index + 1}`} />
                  ) : media.media_type.startsWith('video') ? (
                    <VideoContainer>
                      <MediaVideo src={media.file_url} controls />
                      <VideoOverlay>▶</VideoOverlay>
                    </VideoContainer>
                  ) : null}
                  {index === 3 && post.media!.length > 4 && (
                    <MoreOverlay>+{post.media!.length - 4} more</MoreOverlay>
                  )}
                </MediaItem>
              ))}
            </MediaGallery>
          )}

          {post.content_type === 'link' && post.link_url && (
            <LinkPreview href={post.link_url} target="_blank" rel="noopener noreferrer">
              {post.link_url}
            </LinkPreview>
          )}

          {post.content && (
            <PostContent $expanded={isExpanded}>
              {post.content}
            </PostContent>
          )}

          {post.content && post.content.length > 300 && (
            <ExpandButton onClick={(e) => {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }}>
              {isExpanded ? 'Show less' : 'Read more'}
            </ExpandButton>
          )}

          {post.status === 'removed' && post.removal_reason && (
            <RemovalNotice>
              <strong>Removed:</strong> {post.removal_reason}
            </RemovalNotice>
          )}
        </PostLink>

        <PostFooter>
          <FooterButton
            as={Link}
            to={`/g/${groupSlug || post.group_slug}/posts/${post.id}`}
          >
            <FaComment />
            {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
          </FooterButton>

          {canModerate && (
            <>
              {onPin && (
                <FooterButton onClick={() => onPin(post.id)}>
                  <FaThumbtack />
                  {post.is_pinned ? 'Unpin' : 'Pin'}
                </FooterButton>
              )}
              {onLock && (
                <FooterButton onClick={() => onLock(post.id)}>
                  <FaLock />
                  {post.is_locked ? 'Unlock' : 'Lock'}
                </FooterButton>
              )}
              {onRemove && post.status !== 'removed' && (
                <FooterButton onClick={() => onRemove(post.id)}>
                  <FaTrash />
                  Remove
                </FooterButton>
              )}
            </>
          )}

          {onDelete && (
            <FooterButton onClick={() => onDelete(post.id)}>
              <FaTrash />
              Delete
            </FooterButton>
          )}
        </PostFooter>
      </Content>
    </Card>
  );
};

const Card = styled.div`
  display: flex;
  gap: 12px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 12px;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const VoteSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
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
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: ${props => props.$type === 'upvote' ? '#FF6B35' : '#4A90E2'};
    transform: scale(1.1);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;

const VoteCount = styled.span<{ $score: number }>`
  font-weight: 700;
  font-size: 14px;
  color: ${props =>
    props.$score > 0
      ? '#FF6B35'
      : props.$score < 0
      ? '#4A90E2'
      : props.theme.colors.text};
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const PostHeader = styled.div`
  margin-bottom: 8px;
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
`;

const GroupLink = styled(Link)`
  color: ${props => props.theme.colors.text};
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const AuthorLink = styled(Link)`
  color: ${props => props.theme.colors.text.secondary};
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

const Badge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  font-size: 11px;
  font-weight: 600;
`;

const PostLink = styled(Link)`
  display: block;
  text-decoration: none;
  color: inherit;
`;

const PostTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  line-height: 1.3;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const Thumbnail = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 8px;
`;

const MediaGallery = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
`;

const MediaItem = styled.div<{ $count: number }>`
  position: relative;
  aspect-ratio: 16 / 9;
  background: ${props => props.theme.colors.background};
  overflow: hidden;

  ${props => props.$count === 1 && `
    grid-column: 1 / -1;
    aspect-ratio: 16 / 9;
  `}

  ${props => props.$count === 3 && `
    &:first-child {
      grid-column: 1 / -1;
    }
  `}
`;

const MediaImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const MediaVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const VideoOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  pointer-events: none;
`;

const MoreOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 600;
`;

const LinkPreview = styled.a`
  display: block;
  padding: 8px 12px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 8px;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
`;

const PostContent = styled.p<{ $expanded: boolean }>`
  margin: 0 0 8px 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.theme.colors.text};
  white-space: pre-wrap;
  word-break: break-word;

  ${props => !props.$expanded && `
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-bottom: 8px;

  &:hover {
    text-decoration: underline;
  }
`;

const RemovalNotice = styled.div`
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  border-radius: 4px;
  color: #f44336;
  font-size: 14px;
  margin-bottom: 8px;
`;

const PostFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
`;

const FooterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  text-decoration: none;

  &:hover {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
  }

  svg {
    font-size: 14px;
  }
`;

export default GroupPostCard;
