import React from 'react';
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
  min-width: 22px;
  height: 22px;
  padding: 0 4px;
  border-radius: 11px;
  border: 1.5px solid ${props => props.isCurrentUser ? '#007AFF' : '#E5E5EA'};
  background: #FFFFFF;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: scale(1.15);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Count = styled.span`
  font-size: 0.625rem;
  color: #000000;
  font-weight: 600;
  margin-left: 2px;
`;

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  isOwnMessage
}) => {
  // Get the current user's reaction (only one allowed)
  const currentUserReaction = reactions.find(r =>
    r.users.some(user => user.user_id === currentUserId)
  );

  // Only render if there's a reaction to show
  if (!currentUserReaction) {
    return null;
  }

  return (
    <ReactionsContainer isOwn={isOwnMessage} className="message-reactions">
      <ReactionBubble isCurrentUser={true} title="Your reaction">
        {currentUserReaction.emoji}
        {currentUserReaction.count > 1 && <Count>{currentUserReaction.count}</Count>}
      </ReactionBubble>
    </ReactionsContainer>
  );
};

export default MessageReactions;
