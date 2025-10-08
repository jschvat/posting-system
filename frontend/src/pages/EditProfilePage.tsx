/**
 * EditProfilePage Component
 * Comprehensive user profile editing with location features
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { usersApi, authApi, getUserAvatarUrl } from '../services/api';
import locationApi from '../services/locationApi';
import { FaUser, FaLock } from 'react-icons/fa6';
import { FaSave, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import LocationPermission from '../components/LocationPermission';

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.95rem;
`;

const Section = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  grid-column: ${({ $fullWidth }) => ($fullWidth ? '1 / -1' : 'auto')};
`;

const Label = styled.label`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.surface};
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background};
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const LocationOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const LocationToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? 'white' : theme.colors.text.primary)};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme, $active }) => ($active ? theme.colors.primary + 'dd' : theme.colors.background)};
  }
`;

const GpsButton = styled.button`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primary}dd;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LocationInfo = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PrivacyOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const RadioOption = styled.label`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const RadioInput = styled.input`
  margin-top: 4px;
`;

const RadioContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const RadioTitle = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RadioDescription = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  border: 1px solid ${({ theme, $variant }) =>
    $variant === 'primary' ? theme.colors.primary : theme.colors.border
  };
  background: ${({ theme, $variant }) =>
    $variant === 'primary' ? theme.colors.primary : theme.colors.surface
  };
  color: ${({ theme, $variant }) =>
    $variant === 'primary' ? 'white' : theme.colors.text.primary
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $variant }) =>
      $variant === 'primary' ? theme.colors.primary + 'dd' : theme.colors.background
    };
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.9rem;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const SuccessMessage = styled.div`
  color: ${({ theme }) => theme.colors.success};
  font-size: 0.9rem;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const HelpText = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface ProfileData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar_url?: string;
}

interface LocationData {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  accuracy?: number;
}

const EditProfilePage: React.FC = () => {
  const { state } = useAuth();
  const user = state.user;

  const [profileData, setProfileData] = useState<ProfileData>({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
    address: user?.address || '',
    location_city: user?.location_city || '',
    location_state: user?.location_state || '',
    location_zip: user?.location_zip || '',
    location_country: user?.location_country || '',
  } as any);

  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual'>('gps');
  const [locationData, setLocationData] = useState<LocationData>({});
  const [locationSharing, setLocationSharing] = useState<'exact' | 'city' | 'off'>('off');
  const [showDistanceInProfile, setShowDistanceInProfile] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load current user location settings
  useEffect(() => {
    const loadUserLocation = async () => {
      if (!user?.id) return;

      try {
        const response = await locationApi.getUserLocation(user.id);
        console.log('Loaded user location:', response);
        if (response.success && response.data?.location) {
          const loc = response.data.location;
          setLocationData({
            latitude: loc.latitude ?? undefined,
            longitude: loc.longitude ?? undefined,
            city: loc.city ?? undefined,
            state: loc.state ?? undefined,
            country: loc.country ?? undefined,
            accuracy: loc.accuracy ?? undefined,
          });
          setLocationSharing(loc.sharing || 'off');
        }
      } catch (err) {
        console.error('Error loading user location:', err);
      }
    };

    loadUserLocation();
  }, [user?.id]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationData({
      ...locationData,
      [e.target.name]: e.target.value,
    });
  };

  const captureGpsLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setGpsLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);

        // Try to get address information using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();

          if (data && data.address) {
            setLocationData({
              latitude,
              longitude,
              accuracy,
              city: data.address.city || data.address.town || data.address.village || '',
              state: data.address.state || '',
              country: data.address.country || '',
            });
          } else {
            // If reverse geocoding fails, just set coordinates
            setLocationData({
              latitude,
              longitude,
              accuracy,
              city: locationData.city || '',
              state: locationData.state || '',
              country: locationData.country || '',
            });
          }

          setSuccess('Location captured successfully!');
          setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          // On error, still save the coordinates
          setLocationData({
            latitude,
            longitude,
            accuracy,
            city: locationData.city || '',
            state: locationData.state || '',
            country: locationData.country || '',
          });
          setSuccess('Location coordinates captured!');
          setTimeout(() => setSuccess(''), 3000);
        }

        setGpsLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to capture location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setError(errorMessage);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare update data, removing empty strings for optional URL fields
      const updateData = {
        ...profileData,
        avatar_url: profileData.avatar_url || undefined, // Don't send empty string
      };

      console.log('Sending update data:', updateData);

      // Update profile using users API
      const response = await usersApi.updateUser(user!.id, updateData);

      if (response.success) {
        // Update localStorage
        localStorage.setItem('userData', JSON.stringify({ ...user, ...profileData }));

        setSuccess('Profile updated successfully! Please refresh to see changes.');
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to update profile';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    console.log('handleSaveLocation called');
    console.log('Location data:', locationData);
    console.log('Location sharing:', locationSharing);
    console.log('Show distance:', showDistanceInProfile);

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update location if we have coordinates OR city/state/country
      if (locationData.latitude && locationData.longitude) {
        console.log('Updating location with coordinates...');
        const locationResult = await locationApi.updateLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address || undefined,
          city: locationData.city || undefined,
          state: locationData.state || undefined,
          zip: locationData.zip || undefined,
          country: locationData.country || undefined,
          accuracy: locationData.accuracy || undefined,
        });
        console.log('Location update result:', locationResult);
      } else if (locationData.city || locationData.state || locationData.country || locationData.address) {
        // For manual entry without GPS, we'll need to geocode or set coordinates to 0,0
        console.log('Updating location without coordinates (manual entry)...');
        // Use 0,0 as placeholder coordinates when only city/state/country provided
        const locationResult = await locationApi.updateLocation({
          latitude: 0,
          longitude: 0,
          address: locationData.address || undefined,
          city: locationData.city || undefined,
          state: locationData.state || undefined,
          zip: locationData.zip || undefined,
          country: locationData.country || undefined,
          accuracy: undefined,
        });
        console.log('Location update result:', locationResult);
      }

      // Update privacy settings
      console.log('Updating location preferences...');
      const prefsResult = await locationApi.updatePreferences({
        sharing: locationSharing,
        showDistance: showDistanceInProfile,
      });
      console.log('Preferences update result:', prefsResult);

      // Reload user data to update profile with new location
      if (user?.id) {
        const updatedUserResponse = await usersApi.getUser(user.id);
        if (updatedUserResponse.success && updatedUserResponse.data) {
          localStorage.setItem('userData', JSON.stringify(updatedUserResponse.data));
          console.log('User data updated in localStorage');
        }
      }

      setSuccess('Location settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Location save error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to update location';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await authApi.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });

      setSuccess('Password changed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Container><ErrorMessage>Please log in to edit your profile</ErrorMessage></Container>;
  }

  return (
    <Container>
      <Header>
        <Title>Edit Profile</Title>
        <Subtitle>Update your personal information and preferences</Subtitle>
      </Header>

      {/* Profile Information */}
      <Section>
        <SectionTitle>
          <FaUser />
          Profile Information
        </SectionTitle>

        <FormGrid>
          <FormGroup>
            <Label>Username</Label>
            <Input
              type="text"
              name="username"
              value={profileData.username}
              onChange={handleProfileChange}
            />
            <HelpText>Your unique username</HelpText>
          </FormGroup>

          <FormGroup>
            <Label>Email</Label>
            <Input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleProfileChange}
            />
          </FormGroup>

          <FormGroup>
            <Label>First Name</Label>
            <Input
              type="text"
              name="first_name"
              value={profileData.first_name}
              onChange={handleProfileChange}
            />
          </FormGroup>

          <FormGroup>
            <Label>Last Name</Label>
            <Input
              type="text"
              name="last_name"
              value={profileData.last_name}
              onChange={handleProfileChange}
            />
          </FormGroup>

          <FormGroup $fullWidth>
            <Label>Avatar</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // TODO: Handle file upload
                  console.log('Avatar file selected:', file);
                }
              }}
            />
            <HelpText>Upload a profile picture (JPG, PNG, GIF)</HelpText>
            {user && profileData.avatar_url && (
              <div style={{ marginTop: '8px' }}>
                <img src={getUserAvatarUrl(user)} alt="Current avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            )}
          </FormGroup>

          <FormGroup $fullWidth>
            <Label>Bio</Label>
            <TextArea
              name="bio"
              value={profileData.bio}
              onChange={handleProfileChange}
              placeholder="Tell us about yourself..."
            />
          </FormGroup>

          <FormGroup $fullWidth>
            <Label>Address</Label>
            <Input
              type="text"
              name="address"
              value={(profileData as any).address || ''}
              onChange={handleProfileChange}
              placeholder="123 Main St"
            />
          </FormGroup>

          <FormGroup>
            <Label>City</Label>
            <Input
              type="text"
              name="location_city"
              value={(profileData as any).location_city || ''}
              onChange={handleProfileChange}
              placeholder="San Francisco"
            />
          </FormGroup>

          <FormGroup>
            <Label>State / Province</Label>
            <Input
              type="text"
              name="location_state"
              value={(profileData as any).location_state || ''}
              onChange={handleProfileChange}
              placeholder="California"
            />
          </FormGroup>

          <FormGroup>
            <Label>ZIP / Postal Code</Label>
            <Input
              type="text"
              name="location_zip"
              value={(profileData as any).location_zip || ''}
              onChange={handleProfileChange}
              placeholder="94102"
            />
          </FormGroup>

          <FormGroup>
            <Label>Country</Label>
            <Input
              type="text"
              name="location_country"
              value={(profileData as any).location_country || ''}
              onChange={handleProfileChange}
              placeholder="United States"
            />
          </FormGroup>
        </FormGrid>

        <ButtonGroup>
          <Button $variant="primary" onClick={handleSaveProfile} disabled={loading}>
            <FaSave />
            Save Profile
          </Button>
        </ButtonGroup>
      </Section>

      {/* Location Settings */}
      <Section>
        <SectionTitle>
          <FaMapMarkerAlt />
          Location Settings
        </SectionTitle>

        <LocationOptions>
          <LocationToggle>
            <ToggleButton
              $active={locationMethod === 'gps'}
              onClick={() => setLocationMethod('gps')}
            >
              Use GPS
            </ToggleButton>
            <ToggleButton
              $active={locationMethod === 'manual'}
              onClick={() => setLocationMethod('manual')}
            >
              Manual Entry
            </ToggleButton>
          </LocationToggle>

          {locationMethod === 'gps' ? (
            <>
              <GpsButton onClick={captureGpsLocation} disabled={gpsLoading}>
                <FaMapMarkerAlt />
                {gpsLoading ? 'Getting Location...' : 'Capture My Location'}
              </GpsButton>

              {(locationData.latitude && locationData.longitude) && (
                <FormGrid>
                  <FormGroup>
                    <Label>City</Label>
                    <Input
                      type="text"
                      name="city"
                      value={locationData.city || ''}
                      onChange={handleLocationChange}
                      placeholder="San Francisco"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>State / Province</Label>
                    <Input
                      type="text"
                      name="state"
                      value={locationData.state || ''}
                      onChange={handleLocationChange}
                      placeholder="California"
                    />
                  </FormGroup>

                  <FormGroup $fullWidth>
                    <Label>Country</Label>
                    <Input
                      type="text"
                      name="country"
                      value={locationData.country || ''}
                      onChange={handleLocationChange}
                      placeholder="United States"
                    />
                  </FormGroup>

                  <FormGroup $fullWidth>
                    <LocationInfo>
                      📍 Coordinates: {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                      {locationData.accuracy && ` (±${Math.round(locationData.accuracy)}m accuracy)`}
                    </LocationInfo>
                  </FormGroup>
                </FormGrid>
              )}

              <LocationPermission />
            </>
          ) : (
            <FormGrid>
              <FormGroup $fullWidth>
                <Label>Address</Label>
                <Input
                  type="text"
                  name="address"
                  value={locationData.address || ''}
                  onChange={handleLocationChange}
                  placeholder="123 Main St"
                />
              </FormGroup>

              <FormGroup>
                <Label>City</Label>
                <Input
                  type="text"
                  name="city"
                  value={locationData.city || ''}
                  onChange={handleLocationChange}
                  placeholder="San Francisco"
                />
              </FormGroup>

              <FormGroup>
                <Label>State / Province</Label>
                <Input
                  type="text"
                  name="state"
                  value={locationData.state || ''}
                  onChange={handleLocationChange}
                  placeholder="California"
                />
              </FormGroup>

              <FormGroup>
                <Label>ZIP / Postal Code</Label>
                <Input
                  type="text"
                  name="zip"
                  value={locationData.zip || ''}
                  onChange={handleLocationChange}
                  placeholder="94102"
                />
              </FormGroup>

              <FormGroup>
                <Label>Country</Label>
                <Input
                  type="text"
                  name="country"
                  value={locationData.country || ''}
                  onChange={handleLocationChange}
                  placeholder="United States"
                />
              </FormGroup>
            </FormGrid>
          )}

          <FormGroup $fullWidth>
            <Label>Privacy Settings</Label>
            <PrivacyOptions>
              {/* Only show "exact" option for manual entry */}
              {locationMethod === 'manual' && (
                <RadioOption>
                  <RadioInput
                    type="radio"
                    name="location_sharing"
                    value="exact"
                    checked={locationSharing === 'exact'}
                    onChange={(e) => setLocationSharing(e.target.value as 'exact')}
                  />
                  <RadioContent>
                    <RadioTitle>Share Exact Address</RadioTitle>
                    <RadioDescription>
                      Show your full address including street, city, state, and ZIP.
                    </RadioDescription>
                  </RadioContent>
                </RadioOption>
              )}

              <RadioOption>
                <RadioInput
                  type="radio"
                  name="location_sharing"
                  value="city"
                  checked={locationSharing === 'city'}
                  onChange={(e) => setLocationSharing(e.target.value as 'city')}
                />
                <RadioContent>
                  <RadioTitle>Share City Only</RadioTitle>
                  <RadioDescription>
                    Only show your city. Your exact location remains private.
                  </RadioDescription>
                </RadioContent>
              </RadioOption>

              <RadioOption>
                <RadioInput
                  type="radio"
                  name="location_sharing"
                  value="off"
                  checked={locationSharing === 'off'}
                  onChange={(e) => setLocationSharing(e.target.value as 'off')}
                />
                <RadioContent>
                  <RadioTitle>Don't Share Location</RadioTitle>
                  <RadioDescription>
                    Keep your location completely private.
                  </RadioDescription>
                </RadioContent>
              </RadioOption>
            </PrivacyOptions>
          </FormGroup>

          {locationSharing !== 'off' && (
            <FormGroup>
              <RadioOption>
                <RadioInput
                  type="checkbox"
                  checked={showDistanceInProfile}
                  onChange={(e) => setShowDistanceInProfile(e.target.checked)}
                />
                <RadioContent>
                  <RadioTitle>Show distance in profile</RadioTitle>
                  <RadioDescription>
                    Display your distance to other users on your profile page
                  </RadioDescription>
                </RadioContent>
              </RadioOption>
            </FormGroup>
          )}
        </LocationOptions>

        <ButtonGroup>
          <Button $variant="primary" onClick={handleSaveLocation} disabled={loading}>
            <FaSave />
            Save Location
          </Button>
        </ButtonGroup>
      </Section>

      {/* Change Password */}
      <Section>
        <SectionTitle>
          <FaLock />
          Change Password
        </SectionTitle>

        <FormGrid>
          <FormGroup $fullWidth>
            <Label>Current Password</Label>
            <Input
              type="password"
              name="current_password"
              value={passwordData.current_password}
              onChange={handlePasswordChange}
            />
          </FormGroup>

          <FormGroup>
            <Label>New Password</Label>
            <Input
              type="password"
              name="new_password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
            />
            <HelpText>At least 6 characters</HelpText>
          </FormGroup>

          <FormGroup>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              name="confirm_password"
              value={passwordData.confirm_password}
              onChange={handlePasswordChange}
            />
          </FormGroup>
        </FormGrid>

        <ButtonGroup>
          <Button $variant="primary" onClick={handleChangePassword} disabled={loading}>
            <FaLock />
            Change Password
          </Button>
        </ButtonGroup>
      </Section>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
    </Container>
  );
};

export default EditProfilePage;
