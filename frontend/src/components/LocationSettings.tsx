/**
 * LocationSettings Component
 * Manage location sharing privacy settings
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaLock, FaMapPin, FaEye, FaEyeSlash } from 'react-icons/fa6';
import locationApi, { Location } from '../services/locationApi';
import { getTheme } from '../utils/themeHelpers';

const Container = styled.div`
  padding: ${props => getTheme(props).spacing.lg};
  background: ${props => getTheme(props).colors.surface};
  border-radius: ${props => getTheme(props).borderRadius.lg};
  box-shadow: ${props => getTheme(props).shadows.sm};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => getTheme(props).spacing.sm};
  margin-bottom: ${props => getTheme(props).spacing.lg};
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${props => getTheme(props).fontSize.xl};
  font-weight: ${props => getTheme(props).fontWeight.bold};
`;

const SettingGroup = styled.div`
  margin-bottom: ${props => getTheme(props).spacing.lg};
`;

const SettingLabel = styled.label`
  display: block;
  font-weight: ${props => getTheme(props).fontWeight.semibold};
  margin-bottom: ${props => getTheme(props).spacing.sm};
  color: ${props => getTheme(props).colors.text};
`;

const SettingDescription = styled.p`
  margin: ${props => getTheme(props).spacing.xs} 0;
  font-size: ${props => getTheme(props).fontSize.sm};
  color: ${props => getTheme(props).colors.textSecondary};
  line-height: 1.5;
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => getTheme(props).spacing.md};
`;

const RadioOption = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  padding: ${props => getTheme(props).spacing.md};
  border: 2px solid ${props => props.$selected ? getTheme(props).colors.primary : getTheme(props).colors.border};
  border-radius: ${props => getTheme(props).borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$selected ? getTheme(props).colors.primaryLight : 'transparent'};

  &:hover {
    border-color: ${props => getTheme(props).colors.primary};
  }
`;

const RadioInput = styled.input`
  margin-right: ${props => getTheme(props).spacing.sm};
  cursor: pointer;
`;

const RadioContent = styled.div`
  flex: 1;
`;

const RadioTitle = styled.div`
  font-weight: ${props => getTheme(props).fontWeight.semibold};
  margin-bottom: ${props => getTheme(props).spacing.xs};
  display: flex;
  align-items: center;
  gap: ${props => getTheme(props).spacing.xs};
`;

const RadioDescription = styled.div`
  font-size: ${props => getTheme(props).fontSize.sm};
  color: ${props => getTheme(props).colors.textSecondary};
  line-height: 1.5;
`;

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  gap: ${props => getTheme(props).spacing.sm};
  cursor: pointer;
  padding: ${props => getTheme(props).spacing.sm} 0;
`;

const Checkbox = styled.input`
  cursor: pointer;
`;

const SaveButton = styled.button`
  padding: ${props => getTheme(props).spacing.sm} ${props => getTheme(props).spacing.lg};
  background: ${props => getTheme(props).colors.primary};
  color: white;
  border: none;
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-weight: ${props => getTheme(props).fontWeight.medium};
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
  margin-top: ${props => getTheme(props).spacing.md};

  &:hover {
    background: ${props => getTheme(props).colors.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SuccessMessage = styled.div`
  padding: ${props => getTheme(props).spacing.sm};
  background: ${props => getTheme(props).colors.successLight};
  color: ${props => getTheme(props).colors.success};
  border-radius: ${props => getTheme(props).borderRadius.md};
  margin-top: ${props => getTheme(props).spacing.md};
  font-size: ${props => getTheme(props).fontSize.sm};
`;

const ErrorMessage = styled.div`
  padding: ${props => getTheme(props).spacing.sm};
  background: ${props => getTheme(props).colors.errorLight};
  color: ${props => getTheme(props).colors.error};
  border-radius: ${props => getTheme(props).borderRadius.md};
  margin-top: ${props => getTheme(props).spacing.md};
  font-size: ${props => getTheme(props).fontSize.sm};
`;

export const LocationSettings: React.FC = () => {
  const [sharing, setSharing] = useState<'exact' | 'city' | 'off'>('off');
  const [showDistance, setShowDistance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await locationApi.getMyLocation();
      if (response.success && response.data) {
        const location: Location = response.data.location;
        setSharing(location.sharing || 'off');
        // Note: showDistance would need to be added to Location type if it exists
        // setShowDistance(location.show_distance_in_profile || false);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const response = await locationApi.updatePreferences({
        sharing,
        showDistance
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Container>Loading settings...</Container>;
  }

  return (
    <Container>
      <Header>
        <FaLock />
        <Title>Location Privacy Settings</Title>
      </Header>

      <SettingGroup>
        <SettingLabel>Who can see your location?</SettingLabel>
        <SettingDescription>
          Control how much location information other users can see
        </SettingDescription>

        <RadioGroup>
          <RadioOption $selected={sharing === 'exact'}>
            <RadioInput
              type="radio"
              name="sharing"
              value="exact"
              checked={sharing === 'exact'}
              onChange={(e) => setSharing(e.target.value as 'exact')}
            />
            <RadioContent>
              <RadioTitle>
                <FaMapPin /> Exact Location
              </RadioTitle>
              <RadioDescription>
                Show your precise location. Users can see your exact distance and find you in nearby searches.
                Best for meeting new people locally.
              </RadioDescription>
            </RadioContent>
          </RadioOption>

          <RadioOption $selected={sharing === 'city'}>
            <RadioInput
              type="radio"
              name="sharing"
              value="city"
              checked={sharing === 'city'}
              onChange={(e) => setSharing(e.target.value as 'city')}
            />
            <RadioContent>
              <RadioTitle>
                <FaEye /> City Only
              </RadioTitle>
              <RadioDescription>
                Show only your city and state. Your exact location remains private.
                You won't appear in nearby searches but others can see your general area.
              </RadioDescription>
            </RadioContent>
          </RadioOption>

          <RadioOption $selected={sharing === 'off'}>
            <RadioInput
              type="radio"
              name="sharing"
              value="off"
              checked={sharing === 'off'}
              onChange={(e) => setSharing(e.target.value as 'off')}
            />
            <RadioContent>
              <RadioTitle>
                <FaEyeSlash /> Hidden
              </RadioTitle>
              <RadioDescription>
                Hide all location information. You won't appear in nearby searches and your location
                won't be visible to other users.
              </RadioDescription>
            </RadioContent>
          </RadioOption>
        </RadioGroup>
      </SettingGroup>

      <SettingGroup>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            checked={showDistance}
            onChange={(e) => setShowDistance(e.target.checked)}
            disabled={sharing === 'off'}
          />
          <div>
            <SettingLabel style={{ marginBottom: 0 }}>
              Show distance on my profile
            </SettingLabel>
            <SettingDescription style={{ marginTop: 4 }}>
              When enabled, other users can see their distance from you on your profile
            </SettingDescription>
          </div>
        </CheckboxContainer>
      </SettingGroup>

      <SaveButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </SaveButton>

      {success && <SuccessMessage>✓ Settings saved successfully!</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Container>
  );
};

export default LocationSettings;
