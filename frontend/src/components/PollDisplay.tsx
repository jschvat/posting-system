/**
 * Poll Display component for showing poll results and voting interface
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getApiBaseUrl } from '../config/app.config';

interface PollOption {
  id: number;
  option_text: string;
  vote_count: number;
  percentage: number;
}

interface PollDisplayProps {
  postId: number;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVote: number | null;
  hasEnded: boolean;
  endsAt: string | null;
  allowMultiple: boolean;
  onVoteUpdate?: () => void;
}

const Container = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const Question = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const OptionButton = styled.button<{ $isSelected: boolean; $hasVoted: boolean }>`
  position: relative;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $isSelected }) =>
    $isSelected ? 'white' : theme.colors.text.primary};
  border: 1px solid ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 14px;
  font-weight: ${({ $isSelected }) => ($isSelected ? '600' : '400')};
  text-align: left;
  cursor: ${({ $hasVoted }) => ($hasVoted ? 'default' : 'pointer')};
  transition: all 0.2s;
  overflow: hidden;

  &:hover {
    ${({ $hasVoted, theme }) =>
      !$hasVoted &&
      `
      background: ${theme.colors.surface};
      border-color: ${theme.colors.primary};
    `}
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const ProgressBar = styled.div<{ $percentage: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  background: ${({ theme }) => theme.colors.primary}20;
  transition: width 0.3s ease;
  z-index: 0;
`;

const OptionContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const OptionText = styled.span`
  flex: 1;
`;

const OptionStats = styled.span`
  font-size: 13px;
  font-weight: 600;
  margin-left: ${({ theme }) => theme.spacing.sm};
`;

const PollInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const VoteCount = styled.span`
  font-weight: 500;
`;

const EndDate = styled.span`
  font-style: italic;
`;

const EndedBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: ${({ theme }) => theme.colors.error};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 12px;
  font-weight: 600;
  margin-left: ${({ theme }) => theme.spacing.xs};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.error}10;
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme }) => theme.colors.error};
  font-size: 13px;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const PollDisplay: React.FC<PollDisplayProps> = ({
  postId,
  question,
  options,
  totalVotes,
  userVote,
  hasEnded,
  endsAt,
  allowMultiple,
  onVoteUpdate
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(userVote);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (optionId: number) => {
    if (hasEnded) {
      setError('This poll has ended');
      return;
    }

    if (isVoting) return;

    try {
      setIsVoting(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to vote');
        return;
      }

      await axios.post(
        `${getApiBaseUrl()}/polls/${postId}/vote`,
        { option_id: optionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedOption(optionId);

      // Trigger update callback to refresh poll data
      if (onVoteUpdate) {
        onVoteUpdate();
      }
    } catch (err: any) {
      console.error('Error voting:', err);
      setError(err.response?.data?.error || 'Failed to vote on poll');
    } finally {
      setIsVoting(false);
    }
  };

  const formatEndDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 0) {
      return 'Ended';
    } else if (diffInHours < 24) {
      return `Ends in ${Math.round(diffInHours)} hours`;
    } else {
      return `Ends ${date.toLocaleDateString()}`;
    }
  };

  const hasUserVoted = selectedOption !== null;

  return (
    <Container>
      <Question>{question}</Question>

      <OptionsList>
        {options.map((option) => {
          const isSelected = option.id === selectedOption;
          const showResults = hasUserVoted || hasEnded;

          return (
            <OptionButton
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isVoting || hasEnded}
              $isSelected={isSelected}
              $hasVoted={hasUserVoted}
            >
              {showResults && <ProgressBar $percentage={option.percentage} />}
              <OptionContent>
                <OptionText>{option.option_text}</OptionText>
                {showResults && (
                  <OptionStats>
                    {option.percentage.toFixed(1)}% ({option.vote_count})
                  </OptionStats>
                )}
              </OptionContent>
            </OptionButton>
          );
        })}
      </OptionsList>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <PollInfo>
        <VoteCount>
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          {allowMultiple && ' • Multiple votes allowed'}
        </VoteCount>
        {endsAt && (
          <EndDate>
            {formatEndDate(endsAt)}
            {hasEnded && <EndedBadge>ENDED</EndedBadge>}
          </EndDate>
        )}
      </PollInfo>
    </Container>
  );
};

export default PollDisplay;
