import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import groupsApi from '../services/groupsApi';
import { Group } from '../types/group';

const getErrorMessage = (err: any): string => {
  const error = err.response?.data?.error;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return err.message || 'An error occurred';
};

const GroupSettingsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { state } = useAuth();
  const user = state.user;
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'invite_only'>('public');
  const [postApprovalRequired, setPostApprovalRequired] = useState(false);
  const [rules, setRules] = useState('');

  // Post type settings
  const [allowTextPosts, setAllowTextPosts] = useState(true);
  const [allowLinkPosts, setAllowLinkPosts] = useState(true);
  const [allowImagePosts, setAllowImagePosts] = useState(true);
  const [allowVideoPosts, setAllowVideoPosts] = useState(true);
  const [allowPollPosts, setAllowPollPosts] = useState(true);

  // Moderator permission settings
  const [moderatorCanRemovePosts, setModeratorCanRemovePosts] = useState(true);
  const [moderatorCanRemoveComments, setModeratorCanRemoveComments] = useState(true);
  const [moderatorCanBanMembers, setModeratorCanBanMembers] = useState(true);
  const [moderatorCanApprovePosts, setModeratorCanApprovePosts] = useState(true);
  const [moderatorCanApproveMembers, setModeratorCanApproveMembers] = useState(true);
  const [moderatorCanPinPosts, setModeratorCanPinPosts] = useState(true);
  const [moderatorCanLockPosts, setModeratorCanLockPosts] = useState(true);

  // Group chat settings
  const [chatEnabled, setChatEnabled] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadGroup();
  }, [slug, user]);

  const loadGroup = async () => {
    if (!slug || !user) return;

    try {
      setLoading(true);
      setError(null);

      const groupRes = await groupsApi.getGroup(slug);
      if (groupRes.success && groupRes.data) {
        const g = (groupRes.data as any).group || groupRes.data;
        setGroup(g);
        setDisplayName(g.display_name);
        setDescription(g.description || '');
        setVisibility(g.visibility);
        setPostApprovalRequired(g.post_approval_required);
        setRules(g.rules || '');

        // Post type settings
        setAllowTextPosts(g.allow_text_posts ?? true);
        setAllowLinkPosts(g.allow_link_posts ?? true);
        setAllowImagePosts(g.allow_image_posts ?? true);
        setAllowVideoPosts(g.allow_video_posts ?? true);
        setAllowPollPosts(g.allow_poll_posts ?? true);

        // Moderator permissions
        setModeratorCanRemovePosts(g.moderator_can_remove_posts ?? true);
        setModeratorCanRemoveComments(g.moderator_can_remove_comments ?? true);
        setModeratorCanBanMembers(g.moderator_can_ban_members ?? true);
        setModeratorCanApprovePosts(g.moderator_can_approve_posts ?? true);
        setModeratorCanApproveMembers(g.moderator_can_approve_members ?? true);
        setModeratorCanPinPosts(g.moderator_can_pin_posts ?? true);
        setModeratorCanLockPosts(g.moderator_can_lock_posts ?? true);

        // Chat settings
        setChatEnabled(g.settings?.chat_enabled ?? false);

        // Check if user is admin
        const membershipRes = await groupsApi.checkMembership(slug);
        if (membershipRes.success && membershipRes.data) {
          const { is_member, membership } = membershipRes.data;
          if (!is_member || !membership || membership.role !== 'admin') {
            setError('You must be an admin to access this page');
            navigate(`/g/${slug}`);
            return;
          }
        } else {
          setError('Failed to verify membership');
          navigate(`/g/${slug}`);
          return;
        }
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Update group chat setting if changed
      const currentChatEnabled = group?.settings?.chat_enabled ?? false;
      if (chatEnabled !== currentChatEnabled) {
        const chatResponse = await groupsApi.toggleGroupChat(slug, chatEnabled);
        if (!chatResponse.success) {
          throw new Error('Failed to update group chat settings');
        }
      }

      // Update other group settings
      const response = await groupsApi.updateGroup(slug, {
        display_name: displayName,
        description,
        visibility,
        post_approval_required: postApprovalRequired,
        rules,
        allow_text_posts: allowTextPosts,
        allow_link_posts: allowLinkPosts,
        allow_image_posts: allowImagePosts,
        allow_video_posts: allowVideoPosts,
        allow_poll_posts: allowPollPosts,
        moderator_can_remove_posts: moderatorCanRemovePosts,
        moderator_can_remove_comments: moderatorCanRemoveComments,
        moderator_can_ban_members: moderatorCanBanMembers,
        moderator_can_approve_posts: moderatorCanApprovePosts,
        moderator_can_approve_members: moderatorCanApproveMembers,
        moderator_can_pin_posts: moderatorCanPinPosts,
        moderator_can_lock_posts: moderatorCanLockPosts
      });

      if (response.success) {
        setSuccess('Group settings updated successfully!');
        setTimeout(() => {
          navigate(`/g/${slug}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Failed to update group settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingMessage>Loading group settings...</LoadingMessage>
      </Container>
    );
  }

  if (!group) {
    return (
      <Container>
        <ErrorMessage>Group not found</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Group Settings</Title>
        <Subtitle>g/{group.name}</Subtitle>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <Form onSubmit={handleSubmit}>
        <FormSection>
          <SectionTitle>Basic Information</SectionTitle>

          <FormGroup>
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={100}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Describe what your group is about..."
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Privacy & Permissions</SectionTitle>

          <FormGroup>
            <Label htmlFor="visibility">Visibility *</Label>
            <Select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
            >
              <option value="public">Public - Anyone can see and join</option>
              <option value="private">Private - Only members can see content</option>
              <option value="invite_only">Invite Only - Requires invitation to join</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={postApprovalRequired}
                onChange={(e) => setPostApprovalRequired(e.target.checked)}
              />
              Require post approval before publishing
            </CheckboxLabel>
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Group Chat</SectionTitle>
          <Help>Enable a real-time group chat for all members. Members will be automatically added when they join the group.</Help>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={chatEnabled}
                onChange={(e) => setChatEnabled(e.target.checked)}
              />
              <strong>Enable Group Chat</strong> - Add a chat tab where members can message each other in real-time
            </CheckboxLabel>
          </FormGroup>

          {chatEnabled && (
            <InfoBox>
              When enabled, all current and future members will have access to the group chat.
              The chat will appear as a tab on the group page. Members are automatically added
              when they join the group and removed when they leave.
            </InfoBox>
          )}
        </FormSection>

        <FormSection>
          <SectionTitle>Allowed Post Types</SectionTitle>
          <Help>Control what types of content members can post in your group</Help>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={allowTextPosts}
                onChange={(e) => setAllowTextPosts(e.target.checked)}
              />
              <strong>Text Posts</strong> - Allow members to post text-only content
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={allowLinkPosts}
                onChange={(e) => setAllowLinkPosts(e.target.checked)}
              />
              <strong>Link Posts</strong> - Allow members to share URLs and links
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={allowImagePosts}
                onChange={(e) => setAllowImagePosts(e.target.checked)}
              />
              <strong>Image Posts</strong> - Allow members to upload images (JPG, PNG, GIF, WebP)
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={allowVideoPosts}
                onChange={(e) => setAllowVideoPosts(e.target.checked)}
              />
              <strong>Video Posts</strong> - Allow members to upload videos (MP4, WebM, OGG)
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={allowPollPosts}
                onChange={(e) => setAllowPollPosts(e.target.checked)}
              />
              <strong>Poll Posts</strong> - Allow members to create polls (coming soon)
            </CheckboxLabel>
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Moderator Permissions</SectionTitle>
          <Help>Control what actions moderators can perform (admins can always perform all actions)</Help>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={moderatorCanRemovePosts}
                onChange={(e) => setModeratorCanRemovePosts(e.target.checked)}
              />
              <strong>Remove Posts</strong> - Allow moderators to remove posts with a reason
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={moderatorCanRemoveComments}
                onChange={(e) => setModeratorCanRemoveComments(e.target.checked)}
              />
              <strong>Remove Comments</strong> - Allow moderators to remove comments with a reason
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={moderatorCanBanMembers}
                onChange={(e) => setModeratorCanBanMembers(e.target.checked)}
              />
              <strong>Ban Members</strong> - Allow moderators to ban and unban members
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={moderatorCanApprovePosts}
                onChange={(e) => setModeratorCanApprovePosts(e.target.checked)}
              />
              <strong>Approve Posts</strong> - Allow moderators to approve pending posts
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={moderatorCanApproveMembers}
                onChange={(e) => setModeratorCanApproveMembers(e.target.checked)}
              />
              <strong>Approve Members</strong> - Allow moderators to approve membership requests
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={moderatorCanPinPosts}
                onChange={(e) => setModeratorCanPinPosts(e.target.checked)}
              />
              <strong>Pin Posts</strong> - Allow moderators to pin/unpin posts
            </CheckboxLabel>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={moderatorCanLockPosts}
                onChange={(e) => setModeratorCanLockPosts(e.target.checked)}
              />
              <strong>Lock Posts</strong> - Allow moderators to lock/unlock posts (prevents comments)
            </CheckboxLabel>
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Rules & Guidelines</SectionTitle>

          <FormGroup>
            <Label htmlFor="rules">Group Rules</Label>
            <Textarea
              id="rules"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={8}
              maxLength={2000}
              placeholder="Enter group rules and guidelines..."
            />
          </FormGroup>
        </FormSection>

        <ButtonGroup>
          <CancelButton type="button" onClick={() => navigate(`/g/${slug}`)}>
            Cancel
          </CancelButton>
          <SaveButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </SaveButton>
        </ButtonGroup>
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

const Subtitle = styled.div`
  font-size: 16px;
  color: ${props => props.theme.colors.text.secondary};
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 18px;
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  border-radius: 8px;
  color: #f44336;
  margin-bottom: 24px;
`;

const SuccessMessage = styled.div`
  padding: 16px;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid #4CAF50;
  border-radius: 8px;
  color: #4CAF50;
  margin-bottom: 24px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const FormSection = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 24px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h2`
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
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
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
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

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const Help = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  margin-bottom: 16px;
`;

const InfoBox = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: ${props => props.theme.colors.primary}15;
  border: 1px solid ${props => props.theme.colors.primary}40;
  border-radius: 6px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.5;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

const SaveButton = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default GroupSettingsPage;
