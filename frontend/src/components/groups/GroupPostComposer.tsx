import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { CreatePostData } from '../../types/group';
import { Media } from '../../types';
import { mediaApi } from '../../services/api';
import { useToast } from '../Toast';
import PollCreator from '../PollCreator';

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

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollData, setPollData] = useState<{
    question: string;
    options: string[];
    endsAt: string | null;
    allowMultiple: boolean;
  } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file size (100MB max for all file types)
    const maxSize = 100 * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      showError('File size must be less than 100MB');
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);
    setShowAttachMenu(false);
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      const response = await mediaApi.uploadFiles({
        files: selectedFiles
      });

      if (response.success && response.data) {
        setUploadedMedia(prev => [...prev, ...response.data]);
        showSuccess(`${selectedFiles.length} file(s) uploaded successfully`);
        setSelectedFiles([]); // Clear selected files after upload
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024;
      const oversizedFiles = imageFiles.filter(f => f.size > maxSize);
      if (oversizedFiles.length > 0) {
        showError('Pasted image is too large (max 50MB)');
        return;
      }

      setSelectedFiles(prev => [...prev, ...imageFiles]);
      showSuccess(`${imageFiles.length} image(s) pasted`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() && !content.trim() && !showPollCreator) {
      setError('Please provide a title or content');
      return;
    }

    if (showLinkInput && !linkUrl.trim()) {
      setError('Please provide a link URL or remove the link');
      return;
    }

    if (showPollCreator && pollData) {
      if (!pollData.question.trim()) {
        setError('Please provide a poll question');
        return;
      }

      if (pollData.options.length < 2) {
        setError('Please provide at least 2 poll options');
        return;
      }
    }

    try {
      setSubmitting(true);

      // Use title if provided, otherwise use content preview, poll question, or default
      const postTitle = title.trim() ||
                       (content.trim().substring(0, 100)) ||
                       (showPollCreator && pollData ? pollData.question.substring(0, 100) : null) ||
                       'Untitled Post';

      const postData: CreatePostData = {
        title: postTitle,
        content_type: showPollCreator ? 'poll' : 'text'
      };

      if (content.trim()) {
        postData.content = content.trim();
      }

      if (linkUrl.trim()) {
        postData.link_url = linkUrl.trim();
      }

      // Add uploaded media IDs
      if (uploadedMedia.length > 0) {
        postData.media_ids = uploadedMedia.map(m => m.id);
      }

      // Add poll data if creating a poll
      if (showPollCreator && pollData) {
        postData.poll_question = pollData.question;
        postData.poll_options = pollData.options;
        postData.poll_ends_at = pollData.endsAt;
        postData.poll_allow_multiple = pollData.allowMultiple;
      }

      await onSubmit(postData);

      // Reset form
      setTitle('');
      setContent('');
      setLinkUrl('');
      setSelectedFiles([]);
      setUploadedMedia([]);
      setShowLinkInput(false);
      setShowPollCreator(false);
      setPollData(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-upload files when selected
  React.useEffect(() => {
    if (selectedFiles.length > 0 && !uploading) {
      handleUploadFiles();
    }
  }, [selectedFiles.length]);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAttachMenu && !(event.target as Element).closest('[data-attach-menu]')) {
        setShowAttachMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  return (
    <ComposerCard>
      <ComposerTitle>Create a Post</ComposerTitle>

      {requiresApproval && (
        <ApprovalNotice>
          Posts in this group require moderator approval before they are visible to others.
        </ApprovalNotice>
      )}

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
          />
        </FormGroup>

        <FormGroup>
          <TextArea
            placeholder="What's on your mind? (You can paste images here)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            rows={4}
          />
        </FormGroup>

        {showLinkInput && (
          <FormGroup>
            <LinkInputContainer>
              <Input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <RemoveLinkButton type="button" onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}>
                ×
              </RemoveLinkButton>
            </LinkInputContainer>
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
                    <VideoThumbnail>
                      <VideoIcon>🎥</VideoIcon>
                      <VideoName>{media.filename}</VideoName>
                    </VideoThumbnail>
                  )}
                  <RemoveMediaButton onClick={() => handleRemoveUploadedMedia(media.id)}>×</RemoveMediaButton>
                </UploadedMediaItem>
              ))}
            </UploadedMediaList>
          </FormGroup>
        )}

        {selectedFiles.length > 0 && uploading && (
          <FormGroup>
            <UploadingText>Uploading {selectedFiles.length} file(s)...</UploadingText>
          </FormGroup>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <FormActions>
          <AttachmentSection>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <AttachMenuContainer data-attach-menu>
              <AttachButton
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                title="Add attachment"
              >
                <PlusIcon>+</PlusIcon>
              </AttachButton>

              {showAttachMenu && (
                <AttachMenu>
                  {allowedTypes.image && (
                    <>
                      <MenuItem onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'image/*';
                          fileInputRef.current.click();
                        }
                      }}>
                        <MenuIcon>📷</MenuIcon>
                        <MenuText>Photo</MenuText>
                      </MenuItem>
                      <MenuItem onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'video/*';
                          fileInputRef.current.click();
                        }
                      }}>
                        <MenuIcon>🎥</MenuIcon>
                        <MenuText>Video</MenuText>
                      </MenuItem>
                    </>
                  )}
                  {allowedTypes.link && (
                    <MenuItem onClick={() => {
                      setShowLinkInput(true);
                      setShowAttachMenu(false);
                    }}>
                      <MenuIcon>🔗</MenuIcon>
                      <MenuText>Link</MenuText>
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.pdf';
                      fileInputRef.current.click();
                    }
                  }}>
                    <MenuIcon>📄</MenuIcon>
                    <MenuText>PDF</MenuText>
                  </MenuItem>
                  <MenuItem onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.doc,.docx,.xls,.xlsx,.ppt,.pptx';
                      fileInputRef.current.click();
                    }
                  }}>
                    <MenuIcon>📊</MenuIcon>
                    <MenuText>Office Document</MenuText>
                  </MenuItem>
                  <MenuItem onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.skp,.dae,.3ds,.obj,.fbx,.stl';
                      fileInputRef.current.click();
                    }
                  }}>
                    <MenuIcon>🏗️</MenuIcon>
                    <MenuText>3D Model</MenuText>
                  </MenuItem>
                  <MenuItem onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.zip,.rar,.7z,.tar,.gz';
                      fileInputRef.current.click();
                    }
                  }}>
                    <MenuIcon>📦</MenuIcon>
                    <MenuText>Archive</MenuText>
                  </MenuItem>
                  {allowedTypes.poll && (
                    <MenuItem onClick={() => {
                      setShowPollCreator(!showPollCreator);
                      setShowAttachMenu(false);
                    }}>
                      <MenuIcon>📊</MenuIcon>
                      <MenuText>Poll</MenuText>
                    </MenuItem>
                  )}
                </AttachMenu>
              )}
            </AttachMenuContainer>
          </AttachmentSection>

          <SubmitButton type="submit" disabled={submitting || uploading}>
            {submitting ? 'Posting...' : 'Post'}
          </SubmitButton>
        </FormActions>

        {/* Poll Creator */}
        {showPollCreator && (
          <PollCreator onChange={(data) => setPollData(data)} />
        )}
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
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const LinkInputContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const RemoveLinkButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: ${props => props.theme.colors.error};
  color: white;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: #d32f2f;
  }
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
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const AttachmentSection = styled.div`
  flex: 1;
`;

const AttachMenuContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const AttachButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid ${props => props.theme.colors.primary};
  background: ${props => props.theme.colors.primary};
  color: white;
  font-size: 24px;
  font-weight: 300;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: rotate(90deg) scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: rotate(90deg) scale(0.95);
  }
`;

const PlusIcon = styled.span`
  line-height: 1;
  margin-top: -2px;
`;

const AttachMenu = styled.div`
  position: absolute;
  bottom: 48px;
  left: 0;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  padding: 8px;
  z-index: 1000;
  animation: slideUp 0.2s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const MenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.text};
  font-size: 15px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${props => props.theme.colors.background};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const MenuIcon = styled.span`
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
`;

const MenuText = styled.span`
  flex: 1;
  font-weight: 500;
`;

const SubmitButton = styled.button`
  padding: 10px 32px;
  border-radius: 8px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UploadingText = styled.div`
  text-align: center;
  color: ${props => props.theme.colors.primary};
  font-weight: 600;
  padding: 12px;
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
`;

const UploadedMediaList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
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

const VideoThumbnail = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.colors.background};
  padding: 8px;
`;

const VideoIcon = styled.div`
  font-size: 32px;
  margin-bottom: 4px;
`;

const VideoName = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text.secondary};
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
`;

const RemoveMediaButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(244, 67, 54, 0.9);
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

export default GroupPostComposer;
