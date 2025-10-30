import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import { useWebSocket } from '../../contexts/WebSocketContext';

const FaPaperPlane = (FaIcons as any).FaPaperPlane;
const FaTimes = (FaIcons as any).FaTimes;
const FaPaperclip = (FaIcons as any).FaPaperclip;
const FaImage = (FaIcons as any).FaImage;

interface ReplyingTo {
  messageId: number;
  content: string;
  senderName: string;
}

interface MessageComposerProps {
  conversationId: number;
  onSendMessage: (content: string, replyToId?: number, mediaFile?: { file: File; type: 'image' | 'video'; dataUrl: string }) => void;
  replyingTo?: ReplyingTo;
  onClearReply?: () => void;
  disabled?: boolean;
}

const ComposerContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.colors.background};
  border-top: 1px solid ${props => props.theme.colors.border};
  padding: 16px;
`;

const ReplyBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: ${props => props.theme.colors.surface};
  border-left: 3px solid ${props => props.theme.colors.primary};
  border-radius: 4px;
  margin-bottom: 12px;
`;

const ReplyContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ReplySender = styled.span`
  font-size: 0.813rem;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
`;

const ReplyText = styled.span`
  font-size: 0.813rem;
  color: ${props => props.theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClearReplyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.text.secondary};
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const InputContainer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
`;

const TextAreaWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 44px;
  max-height: 150px;
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 22px;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  font-size: 0.938rem;
  font-family: inherit;
  resize: none;
  overflow-y: auto;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const AttachButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.primary};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const MediaPreviewContainer = styled.div`
  position: relative;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  max-width: 300px;
`;

const MediaPreviewImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 200px;
  border-radius: 12px;
`;

const MediaPreviewVideo = styled.video`
  display: block;
  max-width: 100%;
  max-height: 200px;
  border-radius: 12px;
`;

const RemoveMediaButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }
`;

const SendButton = styled.button<{ $canSend: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: ${props => props.$canSend ? props.theme.colors.primary : props.theme.colors.surface};
  color: ${props => props.$canSend ? '#ffffff' : props.theme.colors.text.secondary};
  cursor: ${props => props.$canSend ? 'pointer' : 'not-allowed'};
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    transform: ${props => props.$canSend ? 'scale(1.05)' : 'none'};
  }

  &:active {
    transform: ${props => props.$canSend ? 'scale(0.95)' : 'none'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  onSendMessage,
  replyingTo,
  onClearReply,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; type: 'image' | 'video'; dataUrl: string } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { socket } = useWebSocket();

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = '44px';
      const scrollHeight = textAreaRef.current.scrollHeight;
      textAreaRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [message]);

  // Send typing indicator
  const handleTypingStart = () => {
    if (!isTyping && socket) {
      socket.emit('user:typing:start', { conversationId });
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.emit('user:typing:stop', { conversationId });
        setIsTyping(false);
      }
    }, 3000);
  };

  // Stop typing indicator
  const handleTypingStop = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping && socket) {
      socket.emit('user:typing:stop', { conversationId });
      setIsTyping(false);
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image or video
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }

    // Create data URL for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedMedia({
        file,
        type: isImage ? 'image' : 'video',
        dataUrl
      });
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle remove media
  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  // Handle attachment button click
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // Handle send message
  const handleSend = () => {
    const trimmedMessage = message.trim();
    if ((trimmedMessage || selectedMedia) && !disabled) {
      onSendMessage(trimmedMessage, replyingTo?.messageId, selectedMedia || undefined);
      setMessage('');
      setSelectedMedia(null);
      handleTypingStop();

      // Reset textarea height
      if (textAreaRef.current) {
        textAreaRef.current.style.height = '44px';
      }
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      handleTypingStop();
    };
  }, []);

  const canSend = (message.trim().length > 0 || selectedMedia !== null) && !disabled;

  return (
    <ComposerContainer>
      {replyingTo && (
        <ReplyBar>
          <ReplyContent>
            <ReplySender>Replying to {replyingTo.senderName}</ReplySender>
            <ReplyText>{replyingTo.content}</ReplyText>
          </ReplyContent>
          {onClearReply && (
            <ClearReplyButton onClick={onClearReply}>
              <FaTimes style={{ width: '14px', height: '14px' }} />
            </ClearReplyButton>
          )}
        </ReplyBar>
      )}

      {selectedMedia && (
        <MediaPreviewContainer>
          {selectedMedia.type === 'image' ? (
            <MediaPreviewImage src={selectedMedia.dataUrl} alt="Preview" />
          ) : (
            <MediaPreviewVideo src={selectedMedia.dataUrl} controls />
          )}
          <RemoveMediaButton onClick={handleRemoveMedia}>
            <FaTimes style={{ width: '14px', height: '14px' }} />
          </RemoveMediaButton>
        </MediaPreviewContainer>
      )}

      <InputContainer>
        <HiddenFileInput
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
        />
        <AttachButton onClick={handleAttachClick} title="Attach photo or video">
          <FaImage style={{ width: '18px', height: '18px' }} />
        </AttachButton>
        <TextAreaWrapper>
          <TextArea
            ref={textAreaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            onBlur={handleTypingStop}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
          />
        </TextAreaWrapper>
        <SendButton
          onClick={handleSend}
          disabled={!canSend}
          $canSend={canSend}
          title="Send message"
        >
          <FaPaperPlane style={{ width: '16px', height: '16px' }} />
        </SendButton>
      </InputContainer>
    </ComposerContainer>
  );
};

export default MessageComposer;
