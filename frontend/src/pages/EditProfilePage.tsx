/**
 * Edit Profile Page - Allow users to update their profile information
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { usersApi, mediaApi } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

interface ProfileData {
  first_name: string;
  last_name: string;
  bio: string;
  website: string;
  twitter_handle: string;
  linkedin_url: string;
  github_username: string;
  job_title: string;
  company: string;
  tagline: string;
  location_city: string;
  location_state: string;
  location_country: string;
}

const EditProfilePage: React.FC = () => {
  const { state, dispatch } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    bio: '',
    website: '',
    twitter_handle: '',
    linkedin_url: '',
    github_username: '',
    job_title: '',
    company: '',
    tagline: '',
    location_city: '',
    location_state: '',
    location_country: ''
  });

  useEffect(() => {
    if (!state.user) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [state.user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getUserById(state.user!.id);
      if (response.success && response.data) {
        const user = response.data;
        setFormData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          bio: user.bio || '',
          website: user.website || '',
          twitter_handle: user.twitter_handle || '',
          linkedin_url: user.linkedin_url || '',
          github_username: user.github_username || '',
          job_title: user.job_title || '',
          company: user.company || '',
          tagline: user.tagline || '',
          location_city: user.location_city || '',
          location_state: user.location_state || '',
          location_country: user.location_country || ''
        });
        setAvatarPreview(user.avatar_url || '');
        setBannerPreview(user.banner_url || '');
      }
    } catch (err: any) {
      showError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Image must be less than 10MB');
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      // Upload avatar if changed
      let avatarUrl = avatarPreview;
      if (avatarFile) {
        const response = await mediaApi.uploadFiles({ files: [avatarFile] });
        if (response.success && response.data && response.data[0]) {
          avatarUrl = response.data[0].file_url;
        }
      }

      // Upload banner if changed
      let bannerUrl = bannerPreview;
      if (bannerFile) {
        const response = await mediaApi.uploadFiles({ files: [bannerFile] });
        if (response.success && response.data && response.data[0]) {
          bannerUrl = response.data[0].file_url;
        }
      }

      // Update profile
      const updateData = {
        ...formData,
        avatar_url: avatarUrl,
        banner_url: bannerUrl
      };

      const response = await usersApi.updateUser(state.user!.id, updateData);

      if (response.success) {
        showSuccess('Profile updated successfully');
        // Update auth state with new user data
        if (response.data) {
          dispatch({ type: 'UPDATE_USER', payload: response.data });
        }
        navigate(`/user/${state.user!.id}`);
      }
    } catch (err: any) {
      showError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Edit Profile</Title>
        <Subtitle>Customize your profile information</Subtitle>
      </Header>

      <Form onSubmit={handleSubmit}>
        {/* Banner Upload */}
        <Section>
          <SectionTitle>Banner Image</SectionTitle>
          <BannerUploadArea onClick={() => bannerInputRef.current?.click()}>
            {bannerPreview ? (
              <BannerPreview src={bannerPreview} alt="Banner" />
            ) : (
              <UploadPlaceholder>
                <UploadIcon>🖼️</UploadIcon>
                <UploadText>Click to upload banner image</UploadText>
                <UploadHint>Recommended size: 1500x500px</UploadHint>
              </UploadPlaceholder>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerSelect}
              style={{ display: 'none' }}
            />
          </BannerUploadArea>
        </Section>

        {/* Avatar Upload */}
        <Section>
          <SectionTitle>Profile Picture</SectionTitle>
          <AvatarUploadArea onClick={() => avatarInputRef.current?.click()}>
            {avatarPreview ? (
              <AvatarPreview src={avatarPreview} alt="Avatar" />
            ) : (
              <AvatarPlaceholder>
                {state.user?.first_name[0]}{state.user?.last_name[0]}
              </AvatarPlaceholder>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              style={{ display: 'none' }}
            />
            <AvatarOverlay>
              <span>📷</span>
              <span>Change</span>
            </AvatarOverlay>
          </AvatarUploadArea>
        </Section>

        {/* Basic Info */}
        <Section>
          <SectionTitle>Basic Information</SectionTitle>
          <Row>
            <FormGroup>
              <Label>First Name</Label>
              <Input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Last Name</Label>
              <Input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                required
              />
            </FormGroup>
          </Row>

          <FormGroup>
            <Label>Tagline</Label>
            <Input
              type="text"
              placeholder="A short headline about you..."
              value={formData.tagline}
              onChange={(e) => handleInputChange('tagline', e.target.value)}
              maxLength={200}
            />
          </FormGroup>

          <FormGroup>
            <Label>Bio</Label>
            <TextArea
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              rows={4}
            />
          </FormGroup>
        </Section>

        {/* Work Info */}
        <Section>
          <SectionTitle>Work</SectionTitle>
          <Row>
            <FormGroup>
              <Label>Job Title</Label>
              <Input
                type="text"
                placeholder="e.g. Software Engineer"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label>Company</Label>
              <Input
                type="text"
                placeholder="e.g. Acme Corp"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
              />
            </FormGroup>
          </Row>
        </Section>

        {/* Location */}
        <Section>
          <SectionTitle>Location</SectionTitle>
          <Row>
            <FormGroup>
              <Label>City</Label>
              <Input
                type="text"
                value={formData.location_city}
                onChange={(e) => handleInputChange('location_city', e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label>State/Province</Label>
              <Input
                type="text"
                value={formData.location_state}
                onChange={(e) => handleInputChange('location_state', e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label>Country</Label>
              <Input
                type="text"
                value={formData.location_country}
                onChange={(e) => handleInputChange('location_country', e.target.value)}
              />
            </FormGroup>
          </Row>
        </Section>

        {/* Links */}
        <Section>
          <SectionTitle>Links</SectionTitle>
          <FormGroup>
            <Label>Website</Label>
            <Input
              type="url"
              placeholder="https://yourwebsite.com"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>Twitter Handle</Label>
            <InputWithPrefix>
              <Prefix>@</Prefix>
              <InputNoPadding
                type="text"
                placeholder="username"
                value={formData.twitter_handle}
                onChange={(e) => handleInputChange('twitter_handle', e.target.value)}
              />
            </InputWithPrefix>
          </FormGroup>

          <FormGroup>
            <Label>GitHub Username</Label>
            <InputWithPrefix>
              <Prefix>github.com/</Prefix>
              <InputNoPadding
                type="text"
                placeholder="username"
                value={formData.github_username}
                onChange={(e) => handleInputChange('github_username', e.target.value)}
              />
            </InputWithPrefix>
          </FormGroup>

          <FormGroup>
            <Label>LinkedIn Profile</Label>
            <Input
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedin_url}
              onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
            />
          </FormGroup>
        </Section>

        <Actions>
          <CancelButton type="button" onClick={() => navigate(`/user/${state.user!.id}`)}>
            Cancel
          </CancelButton>
          <SaveButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </SaveButton>
        </Actions>
      </Form>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xl};
`;

const Header = styled.div`
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xl};
`;

const Section = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const BannerUploadArea = styled.div`
  width: 100%;
  height: 200px;
  border: 2px dashed ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const BannerPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const UploadPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.colors.background};
`;

const UploadIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const UploadText = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const UploadHint = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const AvatarUploadArea = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  border: 3px solid ${props => props.theme.colors.border};
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const AvatarPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 3rem;
  font-weight: bold;
`;

const AvatarOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: ${props => props.theme.spacing.sm};
  text-align: center;
  font-size: 0.875rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  ${AvatarUploadArea}:hover & {
    opacity: 1;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const Input = styled.input`
  padding: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1rem;
  color: ${props => props.theme.colors.text.primary};
  background: ${props => props.theme.colors.background};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const TextArea = styled.textarea`
  padding: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1rem;
  font-family: inherit;
  color: ${props => props.theme.colors.text.primary};
  background: ${props => props.theme.colors.background};
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const InputWithPrefix = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Prefix = styled.span`
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.secondary};
  font-size: 1rem;
  border-right: 1px solid ${props => props.theme.colors.border};
`;

const InputNoPadding = styled.input`
  flex: 1;
  padding: ${props => props.theme.spacing.md};
  border: none;
  font-size: 1rem;
  color: ${props => props.theme.colors.text.primary};
  background: ${props => props.theme.colors.background};

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  justify-content: flex-end;
  padding-top: ${props => props.theme.spacing.lg};
`;

const CancelButton = styled.button`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background: transparent;
  color: ${props => props.theme.colors.text.primary};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.background};
  }
`;

const SaveButton = styled.button`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  background: ${props => props.theme.colors.primary};
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default EditProfilePage;
