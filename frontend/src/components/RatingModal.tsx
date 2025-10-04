/**
 * RatingModal Component
 * Modal for submitting/editing a user rating
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { FaStar, FaTimes } from 'react-icons/fa';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ratingsApi from '../services/ratingsApi';
import { useAuth } from '../contexts/AuthContext';

interface RatingModalProps {
  userId: number;
  username: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({
  userId,
  username,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState('');

  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user can rate
  const { data: canRateData } = useQuery({
    queryKey: ['canRate', userId],
    queryFn: () => ratingsApi.canRate(userId),
    enabled: !!user,
  });

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: (data: any) => ratingsApi.rateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings', userId] });
      queryClient.invalidateQueries({ queryKey: ['reputation', userId] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error?.message || 'Failed to submit rating');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    submitRatingMutation.mutate({
      rating_type: 'profile',
      rating_value: rating,
      context_type: 'general',
      review_text: reviewText || undefined,
      is_anonymous: isAnonymous,
    });
  };

  const canRate = canRateData?.data?.can_rate;

  return createPortal(
    <>
      <Overlay onClick={onClose} />
      <Modal>
        <Header>
          <Title>Rate {username}</Title>
          <CloseButton onClick={onClose}>
            <FaTimes />
          </CloseButton>
        </Header>

        <Content>
          {canRate === false ? (
            <ErrorMessage>
              You must have interactions with this user (follow, comment, etc.) before you can rate them.
            </ErrorMessage>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Section>
                <Label>Your Rating</Label>
                <StarsContainer>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarButton
                      key={star}
                      type="button"
                      $filled={star <= (hoverRating || rating)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <FaStar />
                    </StarButton>
                  ))}
                </StarsContainer>
                {rating > 0 && (
                  <RatingLabel>
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </RatingLabel>
                )}
              </Section>

              <Section>
                <Label>Review (Optional)</Label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience with this user..."
                  rows={4}
                  maxLength={500}
                />
                <CharCount>{reviewText.length}/500</CharCount>
              </Section>

              <Section>
                <CheckboxLabel>
                  <Checkbox
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <span>Post anonymously</span>
                </CheckboxLabel>
              </Section>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <Actions>
                <CancelButton type="button" onClick={onClose}>
                  Cancel
                </CancelButton>
                <SubmitButton
                  type="submit"
                  disabled={rating === 0 || submitRatingMutation.isPending}
                >
                  {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
                </SubmitButton>
              </Actions>
            </Form>
          )}
        </Content>
      </Modal>
    </>,
    document.body
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9999;
`;

const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 10000;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textLight};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Label = styled.label`
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
`;

const StarsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const StarButton = styled.button<{ $filled: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 32px;
  color: ${({ $filled, theme }) => ($filled ? '#ffc107' : theme.colors.border)};
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    transform: scale(1.1);
  }
`;

const RatingLabel = styled.span`
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: inherit;
  font-size: 14px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const CharCount = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
  align-self: flex-end;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 14px;
`;

const Checkbox = styled.input`
  cursor: pointer;
  width: 18px;
  height: 18px;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: 14px;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.errorLight || 'rgba(244, 67, 54, 0.1)'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.hover};
  }
`;

const SubmitButton = styled(Button)`
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  color: white;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryDark || theme.colors.primary};
  }
`;

export default RatingModal;
