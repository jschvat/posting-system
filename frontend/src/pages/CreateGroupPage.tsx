import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import groupsApi from '../services/groupsApi';
import { CreateGroupData, GroupVisibility } from '../types/group';

const getErrorMessage = (err: any): string => {
  const error = err.response?.data?.error;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return err.message || 'An error occurred';
};

const CreateGroupPage: React.FC = () => {
  const { state } = useAuth();
  const user = state.user;
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [formData, setFormData] = useState<CreateGroupData>({
    name: '',
    display_name: '',
    description: '',
    visibility: 'public',
    post_approval_required: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    allow_video_posts: true,
    allow_poll_posts: false,
    rules: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (!/^[a-zA-Z0-9_-]{3,100}$/.test(formData.name)) {
      newErrors.name = 'Group name must be 3-100 characters and contain only letters, numbers, dashes, and underscores';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    } else if (formData.display_name.length > 255) {
      newErrors.display_name = 'Display name must be less than 255 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showError('Only JPEG, PNG, GIF, and WebP images are allowed');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showError('Only JPEG, PNG, GIF, and WebP images are allowed');
        return;
      }
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await groupsApi.createGroup(formData);

      if (response.success && response.data) {
        const groupSlug = response.data.group.slug;

        // Upload avatar if selected
        if (avatarFile) {
          try {
            await groupsApi.uploadGroupAvatar(groupSlug, avatarFile);
          } catch (avatarErr) {
            console.error('Failed to upload avatar:', avatarErr);
            // Continue anyway, group was created
          }
        }

        // Upload banner if selected
        if (bannerFile) {
          try {
            await groupsApi.uploadGroupBanner(groupSlug, bannerFile);
          } catch (bannerErr) {
            console.error('Failed to upload banner:', bannerErr);
            // Continue anyway, group was created
          }
        }

        navigate(`/g/${groupSlug}`);
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err) || 'Failed to create group';
      if (errorMessage.includes('already exists')) {
        setErrors({ name: 'A group with this name already exists' });
      } else {
        showError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Create a Group</Title>
        <Subtitle>Build a community around your interests</Subtitle>
      </Header>

      <Form onSubmit={handleSubmit}>
        <Section>
          <SectionTitle>Basic Information</SectionTitle>

          <FormGroup>
            <Label htmlFor="name">
              Group Name *
              <HelpText>This will be used in the URL (e.g., /g/groupname)</HelpText>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="my-awesome-group"
              $hasError={!!errors.name}
            />
            {errors.name && <ErrorText>{errors.name}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="display_name">
              Display Name *
              <HelpText>The friendly name shown to users</HelpText>
            </Label>
            <Input
              id="display_name"
              name="display_name"
              type="text"
              value={formData.display_name}
              onChange={handleInputChange}
              placeholder="My Awesome Group"
              $hasError={!!errors.display_name}
            />
            {errors.display_name && <ErrorText>{errors.display_name}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="avatar">
              Group Avatar
              <HelpText>Upload an image for your group (max 5MB)</HelpText>
            </Label>
            {avatarPreview && (
              <AvatarPreview src={avatarPreview} alt="Avatar preview" />
            )}
            <Input
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="banner">
              Group Banner
              <HelpText>Upload a banner image for your group (1200x400px recommended, max 10MB)</HelpText>
            </Label>
            {bannerPreview && (
              <BannerPreview src={bannerPreview} alt="Banner preview" />
            )}
            <Input
              id="banner"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleBannerChange}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">
              Description
              <HelpText>Tell people what this group is about</HelpText>
            </Label>
            <TextArea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="A community for..."
              rows={4}
              $hasError={!!errors.description}
            />
            {errors.description && <ErrorText>{errors.description}</ErrorText>}
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>Privacy Settings</SectionTitle>

          <FormGroup>
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
            >
              <option value="public">Public - Anyone can view and join</option>
              <option value="private">Private - Anyone can view, but must request to join</option>
              <option value="invite_only">Invite Only - Only visible to members</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                name="post_approval_required"
                checked={formData.post_approval_required}
                onChange={handleInputChange}
              />
              Require moderator approval for posts
            </CheckboxLabel>
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>Allowed Content Types</SectionTitle>

          <CheckboxGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                name="allow_text_posts"
                checked={formData.allow_text_posts}
                onChange={handleInputChange}
              />
              Text Posts
            </CheckboxLabel>

            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                name="allow_link_posts"
                checked={formData.allow_link_posts}
                onChange={handleInputChange}
              />
              Link Posts
            </CheckboxLabel>

            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                name="allow_image_posts"
                checked={formData.allow_image_posts}
                onChange={handleInputChange}
              />
              Image Posts
            </CheckboxLabel>

            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                name="allow_video_posts"
                checked={formData.allow_video_posts}
                onChange={handleInputChange}
              />
              Video Posts
            </CheckboxLabel>

            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                name="allow_poll_posts"
                checked={formData.allow_poll_posts}
                onChange={handleInputChange}
              />
              Poll Posts
            </CheckboxLabel>
          </CheckboxGroup>
        </Section>

        <Section>
          <SectionTitle>Community Rules (Optional)</SectionTitle>

          <FormGroup>
            <Label htmlFor="rules">
              <HelpText>List the rules members should follow</HelpText>
            </Label>
            <TextArea
              id="rules"
              name="rules"
              value={formData.rules}
              onChange={handleInputChange}
              placeholder="1. Be respectful&#10;2. No spam&#10;3. ..."
              rows={6}
            />
          </FormGroup>
        </Section>

        <FormActions>
          <CancelButton type="button" onClick={() => navigate(-1)}>
            Cancel
          </CancelButton>
          <SubmitButton type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Group'}
          </SubmitButton>
        </FormActions>
      </Form>
    </Container>
  );
};

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 16px;
  color: ${props => props.theme.colors.text.secondary};
`;

const Form = styled.form`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 24px;
`;

const Section = styled.div`
  margin-bottom: 32px;

  &:last-of-type {
    margin-bottom: 24px;
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const HelpText = styled.span`
  display: block;
  font-size: 13px;
  font-weight: 400;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 4px;
`;

const Input = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
  }
`;

const TextArea = styled.textarea<{ $hasError?: boolean }>`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.primary};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const ErrorText = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: ${props => props.theme.colors.error};
`;

const AvatarPreview = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 8px;
  object-fit: cover;
  margin: 12px 0;
  border: 2px solid ${props => props.theme.colors.border};
`;

const BannerPreview = styled.img`
  width: 100%;
  max-width: 600px;
  height: 200px;
  border-radius: 8px;
  object-fit: cover;
  margin: 12px 0;
  border: 2px solid ${props => props.theme.colors.border};
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.surface};
  }
`;

const SubmitButton = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
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

export default CreateGroupPage;
