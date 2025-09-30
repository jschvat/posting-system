/**
 * Create post page component - form for creating new posts
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { postsApi, mediaApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 1.75rem;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 1rem;
`;

const FormCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Label = styled.label`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.95rem;
`;

const TextArea = styled.textarea<{ hasError?: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Select = styled.select<{ hasError?: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-family: inherit;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
  }
`;

const MediaSection = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &.dragover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}10;
  }
`;

const MediaUploadButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}dd;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const MediaPreview = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const MediaItem = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const RemoveMediaButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: ${({ theme }) => theme.colors.error};
  color: white;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.error}dd;
  }
`;

const CharacterCount = styled.div<{ isOverLimit?: boolean }>`
  font-size: 0.85rem;
  color: ${({ theme, isOverLimit }) => isOverLimit ? theme.colors.error : theme.colors.text.muted};
  text-align: right;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  border: 1px solid ${({ theme, variant }) =>
    variant === 'primary' ? theme.colors.primary : theme.colors.border
  };
  background: ${({ theme, variant }) =>
    variant === 'primary' ? theme.colors.primary : theme.colors.surface
  };
  color: ${({ theme, variant }) =>
    variant === 'primary' ? 'white' : theme.colors.text.primary
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme, variant }) =>
      variant === 'primary' ? theme.colors.primary + 'dd' : theme.colors.background
    };
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.text.muted};
    border-color: ${({ theme }) => theme.colors.text.muted};
    color: white;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: ${({ theme }) => theme.colors.error}20;
  color: ${({ theme }) => theme.colors.error};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.9rem;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

interface FormData {
  content: string;
  privacy_level: 'public' | 'friends' | 'private';
}

const MAX_CONTENT_LENGTH = 10000;
const MAX_FILES = 5;

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    content: '',
    privacy_level: 'public'
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: postsApi.createPost,
    onSuccess: (response) => {
      // Invalidate posts cache to refresh feed
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      navigate('/');
    },
    onError: (error: any) => {
      setError(error.response?.data?.error?.message || 'Failed to create post');
    }
  });

  // Upload media mutation
  const uploadMediaMutation = useMutation({
    mutationFn: mediaApi.uploadFiles,
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`You can only upload up to ${MAX_FILES} files`);
      return;
    }
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    // Validate form
    if (!formData.content.trim()) {
      setError('Please enter some content for your post');
      return;
    }

    if (formData.content.length > MAX_CONTENT_LENGTH) {
      setError(`Content must be ${MAX_CONTENT_LENGTH} characters or less`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the post first
      const postResponse = await createPostMutation.mutateAsync(formData);
      const newPost = postResponse.data;

      // Upload media files if any
      if (selectedFiles.length > 0) {
        await uploadMediaMutation.mutateAsync({
          files: selectedFiles,
          post_id: newPost.id
        });
      }

      // Navigation happens in the mutation success callback
    } catch (err) {
      // Error handling is done in mutation onError
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const isContentOverLimit = formData.content.length > MAX_CONTENT_LENGTH;
  const canSubmit = formData.content.trim() && !isContentOverLimit && !isSubmitting;

  return (
    <Container>
      <PageHeader>
        <Title>Create New Post</Title>
        <Subtitle>Share your thoughts, photos, and updates with your network</Subtitle>
      </PageHeader>

      <FormCard>
        <Form onSubmit={handleSubmit}>
          {/* Content Input */}
          <FormGroup>
            <Label htmlFor="content">What's on your mind?</Label>
            <TextArea
              id="content"
              placeholder="Share your thoughts..."
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              hasError={isContentOverLimit}
            />
            <CharacterCount isOverLimit={isContentOverLimit}>
              {formData.content.length} / {MAX_CONTENT_LENGTH}
            </CharacterCount>
          </FormGroup>

          {/* Privacy Level */}
          <FormGroup>
            <Label htmlFor="privacy">Who can see this post?</Label>
            <Select
              id="privacy"
              value={formData.privacy_level}
              onChange={(e) => handleInputChange('privacy_level', e.target.value as FormData['privacy_level'])}
            >
              <option value="public">Public - Anyone can see this post</option>
              <option value="friends">Friends - Only your friends can see this</option>
              <option value="private">Private - Only you can see this</option>
            </Select>
          </FormGroup>

          {/* Media Upload */}
          <FormGroup>
            <Label>Add Photos or Videos</Label>
            <MediaSection>
              <div>
                <p style={{ marginBottom: '16px', color: '#65676b' }}>
                  Upload up to {MAX_FILES} files (images, videos, documents)
                </p>
                <MediaUploadButton type="button" onClick={handleFileSelect}>
                  Choose Files
                </MediaUploadButton>
                <HiddenInput
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.txt"
                  onChange={handleFileChange}
                />
              </div>

              {selectedFiles.length > 0 && (
                <MediaPreview>
                  {selectedFiles.map((file, index) => (
                    <MediaItem key={index}>
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="Preview" />
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          fontSize: '0.8rem',
                          padding: '8px',
                          textAlign: 'center',
                          background: '#f0f2f5'
                        }}>
                          {file.name}
                        </div>
                      )}
                      <RemoveMediaButton
                        type="button"
                        onClick={() => handleFileRemove(index)}
                        title="Remove file"
                      >
                        ×
                      </RemoveMediaButton>
                    </MediaItem>
                  ))}
                </MediaPreview>
              )}
            </MediaSection>
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          {/* Action Buttons */}
          <ButtonGroup>
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {isSubmitting ? <LoadingSpinner size="small" /> : 'Publish Post'}
            </Button>
          </ButtonGroup>
        </Form>
      </FormCard>
    </Container>
  );
};

export default CreatePostPage;