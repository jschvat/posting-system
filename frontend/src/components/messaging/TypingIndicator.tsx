import React from 'react';
import styled, { keyframes } from 'styled-components';

interface TypingIndicatorProps {
  usernames: string[];
}

const bounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
`;

const TypingContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 4px 12px;
  background: #E5E5EA;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  max-width: fit-content;
  gap: 8px;
`;

const TypingText = styled.span`
  color: #8E8E93;
  font-size: 0.813rem;
  font-weight: 500;
`;

const DotsContainer = styled.span`
  display: inline-flex;
  gap: 3px;
  align-items: center;
  height: 16px;
`;

const Dot = styled.span<{ delay: number }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #8E8E93;
  animation: ${bounce} 1.4s infinite ease-in-out;
  animation-delay: ${props => props.delay}s;
  will-change: transform;
`;

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ usernames }) => {
  if (usernames.length === 0) return null;

  const formatUsernames = () => {
    if (usernames.length === 1) {
      return `${usernames[0]} is typing`;
    } else if (usernames.length === 2) {
      return `${usernames[0]} and ${usernames[1]} are typing`;
    } else {
      return `${usernames.length} people are typing`;
    }
  };

  return (
    <TypingContainer>
      <TypingText>{formatUsernames()}</TypingText>
      <DotsContainer>
        <Dot delay={0} />
        <Dot delay={0.2} />
        <Dot delay={0.4} />
      </DotsContainer>
    </TypingContainer>
  );
};

export default TypingIndicator;
