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
  padding: 8px 12px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.875rem;
  font-style: italic;
`;

const TypingText = styled.span`
  margin-right: 8px;
`;

const DotsContainer = styled.span`
  display: inline-flex;
  gap: 2px;
`;

const Dot = styled.span<{ delay: number }>`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.text.secondary};
  animation: ${bounce} 1.4s infinite ease-in-out;
  animation-delay: ${props => props.delay}s;
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
