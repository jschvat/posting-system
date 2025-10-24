import React, { useState } from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { ReadReceipt } from './ReadReceipt';
import { useAuth } from '../../contexts/AuthContext';

const FaEdit = (FaIcons as any).FaEdit;
const FaTrash = (FaIcons as any).FaTrash;
const FaReply = (FaIcons as any).FaReply;

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  attachment_url?: string;
  attachment_type?: string;
  created_at: string;
  edited_at?: string;
  deleted_at?: string;
  reply_to_id?: number;
  reply_to_content?: string;
  reply_to_sender?: string;
  read_by?: Array<{ userId: number; username: string; readAt: string }>;
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onEdit?: (messageId: number, content: string) => void;
  onDelete?: (messageId: number) => void;
  onReply?: (message: Message) => void;
}

const BubbleContainer = styled.div<{ isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  margin-bottom: 12px;
  padding: 0 12px;
  width: 100%;
`;

const SenderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
  padding: 0 12px;
`;

const SenderAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 8px 4px 0;
  flex-shrink: 0;
`;

const SenderName = styled.span`
  font-size: 0.688rem;
  color: ${props => props.theme.colors.text.secondary};
  font-weight: 500;
  margin-bottom: 2px;
  padding-left: 4px;
`;

const BubbleWrapper = styled.div<{ isOwn: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  background: ${props => props.isOwn ? '#007AFF' : '#E5E5EA'};
  color: ${props => props.isOwn ? '#ffffff' : '#000000'};
  border-radius: 18px;
  ${props => props.isOwn ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}
  padding: 8px 12px;
  max-width: 65%;
  word-wrap: break-word;
  word-break: break-word;
  box-shadow: none;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    ${props => props.isOwn ? `
      right: -8px;
      width: 20px;
      height: 20px;
      background: #007AFF;
      border-bottom-left-radius: 16px;
    ` : `
      left: -8px;
      width: 20px;
      height: 20px;
      background: #E5E5EA;
      border-bottom-right-radius: 16px;
    `}
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    ${props => props.isOwn ? `
      right: -10px;
      width: 10px;
      height: 20px;
      background: white;
      border-bottom-left-radius: 10px;
    ` : `
      left: -10px;
      width: 10px;
      height: 20px;
      background: white;
      border-bottom-right-radius: 10px;
    `}
  }

  &:hover {
    .message-actions {
      opacity: 1;
    }
  }
`;

const ReplyPreview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  margin-bottom: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-left: 3px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  font-size: 0.813rem;
`;

const ReplyAuthor = styled.span`
  font-weight: 600;
  opacity: 0.9;
`;

const ReplyText = styled.span`
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MessageContent = styled.div`
  line-height: 1.4;
  font-size: 0.938rem;
`;

const MediaContainer = styled.div`
  margin: 4px 0;
  border-radius: 12px;
  overflow: hidden;
  max-width: 100%;
`;

const MessageImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 400px;
  width: auto;
  height: auto;
  border-radius: 12px;
  cursor: pointer;

  &:hover {
    opacity: 0.95;
  }
`;

const MessageVideo = styled.video`
  display: block;
  max-width: 100%;
  max-height: 400px;
  width: auto;
  height: auto;
  border-radius: 12px;
`;

const ImageModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  cursor: zoom-out;
`;

const FullSizeImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
`;

const MessageMeta = styled.div<{ isOwn: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 0.65rem;
  color: ${props => props.isOwn ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.45)'};
`;

const Timestamp = styled.span`
  font-weight: 400;
`;

const EditedLabel = styled.span`
  font-style: italic;
  opacity: 0.8;
`;

const MessageActions = styled.div<{ isOwn: boolean }>`
  position: absolute;
  top: 0;
  ${props => props.isOwn ? 'left: -80px' : 'right: -80px'};
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: ${props => props.theme.colors.background};
  padding: 4px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.text.secondary};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const DeletedMessage = styled.div`
  font-style: italic;
  opacity: 0.6;
`;

const EditInput = styled.input`
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: inherit;
  font-size: 0.938rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const EditButton = styled.button<{ primary?: boolean }>`
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.813rem;
  cursor: pointer;
  background: ${props => props.primary ? 'rgba(255, 255, 255, 0.9)' : 'transparent'};
  color: ${props => props.primary ? props.theme.colors.primary : 'inherit'};

  &:hover {
    background: ${props => props.primary ? '#ffffff' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onEdit,
  onDelete,
  onReply
}) => {
  const { state } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showFullImage, setShowFullImage] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMedia = () => {
    if (!message.attachment_url) return null;

    switch (message.message_type) {
      case 'image':
        return (
          <MediaContainer>
            <MessageImage
              src={message.attachment_url}
              alt="Shared image"
              loading="lazy"
              onClick={() => setShowFullImage(true)}
            />
          </MediaContainer>
        );
      case 'video':
        return (
          <MediaContainer>
            <MessageVideo
              src={message.attachment_url}
              controls
              preload="metadata"
            />
          </MediaContainer>
        );
      default:
        return null;
    }
  };

  const handleEdit = () => {
    if (onEdit && editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent);
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  if (message.deleted_at) {
    return (
      <BubbleContainer isOwn={isOwnMessage}>
        {!isOwnMessage && (
          <SenderName>{message.sender_username}</SenderName>
        )}
        <BubbleWrapper isOwn={isOwnMessage}>
          <DeletedMessage>This message has been deleted</DeletedMessage>
          {message.created_at && (
            <MessageMeta isOwn={isOwnMessage}>
              <Timestamp>{formatTime(message.created_at)}</Timestamp>
            </MessageMeta>
          )}
        </BubbleWrapper>
      </BubbleContainer>
    );
  }

  const getReadStatus = (): 'sent' | 'delivered' | 'read' => {
    if (message.read_by && message.read_by.length > 0) return 'read';
    // TODO: Implement delivered status based on actual delivery confirmation
    return 'sent';
  };

  return (
    <>
    <BubbleContainer isOwn={isOwnMessage}>
      {!isOwnMessage && (
        <SenderName>{message.sender_username}</SenderName>
      )}

      <BubbleWrapper isOwn={isOwnMessage}>
        {message.reply_to_id && message.reply_to_content && message.reply_to_sender && (
          <ReplyPreview>
            <ReplyAuthor>{message.reply_to_sender}</ReplyAuthor>
            <ReplyText>{message.reply_to_content}</ReplyText>
          </ReplyPreview>
        )}

        {isEditing ? (
          <>
            <EditInput
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyPress}
              autoFocus
            />
            <EditActions>
              <EditButton primary onClick={handleEdit}>Save</EditButton>
              <EditButton onClick={() => {
                setIsEditing(false);
                setEditContent(message.content);
              }}>Cancel</EditButton>
            </EditActions>
          </>
        ) : (
          <>
            {renderMedia()}
            {message.content && <MessageContent>{message.content}</MessageContent>}
          </>
        )}

        {(message.created_at || message.edited_at) && (
          <MessageMeta isOwn={isOwnMessage}>
            {message.created_at && <Timestamp>{formatTime(message.created_at)}</Timestamp>}
            {message.edited_at && <EditedLabel>(edited)</EditedLabel>}
          </MessageMeta>
        )}
      </BubbleWrapper>
    </BubbleContainer>
    {showFullImage && message.attachment_url && message.message_type === 'image' && (
      <ImageModal onClick={() => setShowFullImage(false)}>
        <FullSizeImage src={message.attachment_url} alt="Full size" />
      </ImageModal>
    )}
  </>
  );
};

export default MessageBubble;
