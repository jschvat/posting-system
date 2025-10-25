import React, { useState } from 'react';
import styled from 'styled-components';

interface Reaction {
  emoji: string;
  count: number;
  users: Array<{ user_id: number; username: string }>;
}

interface MessageReactionsProps {
  messageId: number;
  reactions: Reaction[];
  currentUserId: number;
  onReactionToggle: (messageId: number, emoji: string) => void;
  isOwnMessage: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ReactionsContainer = styled.div<{ isOwn: boolean }>`
  position: absolute;
  ${props => props.isOwn ? 'left: 4px' : 'right: 4px'};
  bottom: -8px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 10;
`;

const ReactionBubble = styled.button<{ isCurrentUser: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border-radius: 14px;
  border: 2px solid ${props => props.isCurrentUser ? '#007AFF' : '#E5E5EA'};
  background: #FFFFFF;
  cursor: pointer;
  font-size: 1.125rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: scale(1.15);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Count = styled.span`
  font-size: 0.688rem;
  color: #000000;
  font-weight: 600;
  margin-left: 2px;
`;

const AddReactionButton = styled.button<{ hasReaction: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  border: 2px solid #E5E5EA;
  background: #FFFFFF;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 300;
  color: #8E8E93;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  /* Hide by default unless there's already a reaction */
  opacity: ${props => props.hasReaction ? 1 : 0};
  pointer-events: ${props => props.hasReaction ? 'auto' : 'none'};

  &:hover {
    transform: scale(1.15);
    border-color: #007AFF;
    color: #007AFF;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const EmojiPicker = styled.div<{ isOwn: boolean }>`
  position: absolute;
  bottom: calc(100% + 8px);
  ${props => props.isOwn ? 'left: 0' : 'right: 0'};
  display: flex;
  gap: 6px;
  padding: 10px;
  background: #FFFFFF;
  border: 1px solid #E5E5EA;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  white-space: nowrap;
`;

const EmojiOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.5rem;
  border-radius: 10px;
  transition: all 0.15s ease;

  &:hover {
    background: #F2F2F7;
    transform: scale(1.25);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const ReactionWrapper = styled.div`
  position: relative;
`;

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserId,
  onReactionToggle,
  isOwnMessage
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // Get the current user's reaction (only one allowed)
  const currentUserReaction = reactions.find(r =>
    r.users.some(user => user.user_id === currentUserId)
  );

  const handleReactionClick = (emoji: string) => {
    // If clicking the same emoji, remove it; otherwise replace with new one
    onReactionToggle(messageId, emoji);
    setShowPicker(false);
  };

  return (
    <ReactionsContainer isOwn={isOwnMessage} className="message-reactions">
      {currentUserReaction && (
        <ReactionBubble
          isCurrentUser={true}
          onClick={() => handleReactionClick(currentUserReaction.emoji)}
          title="Tap to remove"
        >
          {currentUserReaction.emoji}
          {currentUserReaction.count > 1 && <Count>{currentUserReaction.count}</Count>}
        </ReactionBubble>
      )}

      <ReactionWrapper>
        <AddReactionButton
          hasReaction={!!currentUserReaction}
          className="add-reaction-btn"
          onClick={() => setShowPicker(!showPicker)}
          title="Add reaction"
        >
          +
        </AddReactionButton>
        {showPicker && (
          <EmojiPicker isOwn={isOwnMessage}>
            {QUICK_REACTIONS.map((emoji) => (
              <EmojiOption
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
              >
                {emoji}
              </EmojiOption>
            ))}
          </EmojiPicker>
        )}
      </ReactionWrapper>
    </ReactionsContainer>
  );
};

export default MessageReactions;
