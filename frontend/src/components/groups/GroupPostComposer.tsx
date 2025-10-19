import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { ContentType, CreatePostData } from '../../types/group';
import { Media } from '../../types';
import { mediaApi } from '../../services/api';
import { useToast } from '../Toast';

interface GroupPostComposerProps {
  onSubmit: (data: CreatePostData) => Promise<void>;
  allowedTypes: {
    text: boolean;
    link: boolean;
    image: boolean;
    video: boolean;
    poll: boolean;
  };
  requiresApproval?: boolean;
}

const GroupPostComposer: React.FC<GroupPostComposerProps> = ({
  onSubmit,
  allowedTypes,
  requiresApproval = false
}) => {
  const { showError, showSuccess } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contentType, setContentType] = useState<ContentType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const isImage = contentType === 'image';
    const allowedTypes = isImage
      ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/ogg'];

    const invalidFiles = files.filter(f => !allowedTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      showError(`Please select only ${isImage ? 'image' : 'video'} files`);
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      showError('File size must be less than 5MB');
      return;
    }

    setSelectedFiles(files);
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      const response = await mediaApi.uploadFiles({
        files: selectedFiles,
        uploadedBy: 0, // Will be set by backend from auth token
        context: 'post'
      });

      if (response.success && response.data) {
        setUploadedMedia(response.data);
        showSuccess(`${selectedFiles.length} file(s) uploaded successfully`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to upload files';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUploadedMedia = (mediaId: number) => {
    setUploadedMedia(prev => prev.filter(m => m.id !== mediaId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (contentType === 'link' && !linkUrl.trim()) {
      setError('Link URL is required');
      return;
    }

    try {
      setSubmitting(true);
      const postData: CreatePostData = {
        title: title.trim(),
        content_type: contentType
      };

      if (content.trim()) {
        postData.content = content.trim();
      }

      if (contentType === 'link' && linkUrl.trim()) {
        postData.link_url = linkUrl.trim();
      }

      // Add uploaded media IDs
      if (uploadedMedia.length > 0) {
        postData.media_ids = uploadedMedia.map(m => m.id);
      }

      await onSubmit(postData);

      // Reset form
      setTitle('');
      setContent('');
      setLinkUrl('');
      setSelectedFiles([]);
      setUploadedMedia([]);
      setContentType('text');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableTypes = (): ContentType[] => {
    const types: ContentType[] = [];
    if (allowedTypes.text) types.push('text');
    if (allowedTypes.link) types.push('link');
    if (allowedTypes.image) types.push('image');
    if (allowedTypes.video) types.push('video');
    if (allowedTypes.poll) types.push('poll');
    return types;
  };

  const availableTypes = getAvailableTypes();

  // Set default content type to first available
  React.useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(contentType)) {
      setContentType(availableTypes[0]);
    }
  }, [availableTypes]);

  return (
    <ComposerCard>
      <ComposerTitle>Create a Post</ComposerTitle>

      {requiresApproval && (
        <ApprovalNotice>
          Posts in this group require moderator approval before they are visible to others.
        </ApprovalNotice>
      )}

      <Form onSubmit={handleSubmit}>
        {availableTypes.length > 1 && (
          <TypeSelector>
            {availableTypes.map(type => (
              <TypeButton
                key={type}
                type="button"
                $active={contentType === type}
                onClick={() => setContentType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </TypeButton>
            ))}
          </TypeSelector>
        )}

        <FormGroup>
          <Input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required
          />
        </FormGroup>

        {(contentType === 'text' || contentType === 'link') && (
          <FormGroup>
            <TextArea
              placeholder={
                contentType === 'text'
                  ? 'Write something...'
                  : 'Add an optional description...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </FormGroup>
        )}

        {contentType === 'link' && (
          <FormGroup>
            <Input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
            />
          </FormGroup>
        )}

        {(contentType === 'image' || contentType === 'video') && (
          <>
            <FormGroup>
              <input
                ref={fileInputRef}
                type="file"
                accept={contentType === 'image' ? 'image/*' : 'video/*'}
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <UploadArea onClick={() => fileInputRef.current?.click()}>
                <UploadIcon>📁</UploadIcon>
                <UploadText>
                  Click to select {contentType === 'image' ? 'images' : 'videos'}
                </UploadText>
                <UploadHint>
                  Max 5MB per file • {contentType === 'image' ? 'JPG, PNG, GIF, WebP' : 'MP4, WebM, OGG'}
                </UploadHint>
              </UploadArea>
            </FormGroup>

            {selectedFiles.length > 0 && (
              <FormGroup>
                <FileList>
                  {selectedFiles.map((file, index) => (
                    <FileItem key={index}>
                      <FileName>{file.name}</FileName>
                      <FileSize>{(file.size / 1024).toFixed(1)} KB</FileSize>
                      <RemoveFileButton onClick={() => handleRemoveFile(index)}>×</RemoveFileButton>
                    </FileItem>
                  ))}
                </FileList>
                {!uploading && uploadedMedia.length === 0 && (
                  <UploadFilesButton type="button" onClick={handleUploadFiles}>
                    Upload {selectedFiles.length} file(s)
                  </UploadFilesButton>
                )}
                {uploading && <UploadingText>Uploading...</UploadingText>}
              </FormGroup>
            )}

            {uploadedMedia.length > 0 && (
              <FormGroup>
                <UploadedMediaList>
                  {uploadedMedia.map((media) => (
                    <UploadedMediaItem key={media.id}>
                      {media.media_type === 'image' && media.file_url && (
                        <MediaThumbnail src={media.file_url} alt={media.alt_text || 'Uploaded image'} />
                      )}
                      {media.media_type === 'video' && (
                        <MediaThumbnail as="div">🎥 {media.file_name}</MediaThumbnail>
                      )}
                      <RemoveMediaButton onClick={() => handleRemoveUploadedMedia(media.id)}>×</RemoveMediaButton>
                    </UploadedMediaItem>
                  ))}
                </UploadedMediaList>
              </FormGroup>
            )}
          </>
        )}

        {contentType === 'poll' && (
          <FormGroup>
            <UploadNotice>
              Poll functionality coming soon.
            </UploadNotice>
          </FormGroup>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <FormActions>
          <SubmitButton type="submit" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post'}
          </SubmitButton>
        </FormActions>
      </Form>
    </ComposerCard>
  );
};

const ComposerCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
`;

const ComposerTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const ApprovalNotice = styled.div`
  padding: 12px;
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid #2196F3;
  border-radius: 4px;
  color: #2196F3;
  font-size: 14px;
  margin-bottom: 16px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TypeSelector = styled.div`
  display: flex;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const TypeButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${props => props.$active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? 'white' : props.theme.colors.text};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.background};
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const TextArea = styled.textarea`
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const UploadNotice = styled.div`
  padding: 32px;
  background: ${props => props.theme.colors.background};
  border: 2px dashed ${props => props.theme.colors.border};
  border-radius: 8px;
  text-align: center;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  border-radius: 4px;
  color: #f44336;
  font-size: 14px;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const SubmitButton = styled.button`
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UploadArea = styled.div`
  padding: 48px 32px;
  background: ${props => props.theme.colors.background};
  border: 2px dashed ${props => props.theme.colors.border};
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.surface};
  }
`;

const UploadIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const UploadText = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const UploadHint = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
`;

const FileName = styled.div`
  flex: 1;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileSize = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 12px;
`;

const RemoveFileButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: ${props => props.theme.colors.error};
  color: white;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #d32f2f;
  }
`;

const UploadFilesButton = styled.button`
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary};
    opacity: 0.9;
  }
`;

const UploadingText = styled.div`
  text-align: center;
  color: ${props => props.theme.colors.primary};
  font-weight: 600;
  padding: 12px;
`;

const UploadedMediaList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
`;

const UploadedMediaItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
`;

const MediaThumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RemoveMediaButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #d32f2f;
  }
`;

export default GroupPostComposer;
