/**
 * RegistrationForm Component
 * User registration form with optional location capture
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { FaUser, FaLock, FaEnvelope, FaMapPin } from 'react-icons/fa6';
import locationApi from '../services/locationApi';
import { getTheme } from '../utils/themeHelpers';

interface RegistrationFormProps {
  onSubmit: (data: RegistrationData) => Promise<void>;
  onSuccess?: () => void;
}

export interface RegistrationData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  bio?: string;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
    country?: string;
    accuracy?: number;
  };
  location_sharing?: 'exact' | 'city' | 'off';
}

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: ${props => getTheme(props).spacing.lg};
`;

const Form = styled.form`
  background: ${props => getTheme(props).colors.surface};
  padding: ${props => getTheme(props).spacing.xl};
  border-radius: ${props => getTheme(props).borderRadius.lg};
  box-shadow: ${props => getTheme(props).shadows.md};
`;

const Title = styled.h2`
  margin: 0 0 ${props => getTheme(props).spacing.lg};
  font-size: ${props => getTheme(props).fontSize.xl};
  font-weight: ${props => getTheme(props).fontWeight.bold};
  text-align: center;
`;

const FormGroup = styled.div`
  margin-bottom: ${props => getTheme(props).spacing.md};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${props => getTheme(props).spacing.xs};
  font-weight: ${props => getTheme(props).fontWeight.semibold};
  font-size: ${props => getTheme(props).fontSize.sm};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Icon = styled.span`
  position: absolute;
  left: ${props => getTheme(props).spacing.sm};
  color: ${props => getTheme(props).colors.textSecondary};
  font-size: ${props => getTheme(props).fontSize.md};
`;

const Input = styled.input`
  width: 100%;
  padding: ${props => getTheme(props).spacing.sm};
  padding-left: ${props => getTheme(props).spacing.xl};
  border: 1px solid ${props => getTheme(props).colors.border};
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-size: ${props => getTheme(props).fontSize.md};

  &:focus {
    outline: none;
    border-color: ${props => getTheme(props).colors.primary};
  }

  &:disabled {
    background: ${props => getTheme(props).colors.background};
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${props => getTheme(props).spacing.sm};
  border: 1px solid ${props => getTheme(props).colors.border};
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-size: ${props => getTheme(props).fontSize.md};
  font-family: inherit;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${props => getTheme(props).colors.primary};
  }
`;

const LocationSection = styled.div`
  margin-top: ${props => getTheme(props).spacing.lg};
  padding: ${props => getTheme(props).spacing.md};
  background: ${props => getTheme(props).colors.background};
  border-radius: ${props => getTheme(props).borderRadius.md};
`;

const LocationButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => getTheme(props).spacing.sm};
  padding: ${props => getTheme(props).spacing.sm} ${props => getTheme(props).spacing.md};
  background: ${props => getTheme(props).colors.primary};
  color: white;
  border: none;
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-weight: ${props => getTheme(props).fontWeight.medium};
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${props => getTheme(props).colors.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LocationInfo = styled.div`
  margin-top: ${props => getTheme(props).spacing.sm};
  padding: ${props => getTheme(props).spacing.sm};
  background: ${props => getTheme(props).colors.successLight};
  color: ${props => getTheme(props).colors.success};
  border-radius: ${props => getTheme(props).borderRadius.sm};
  font-size: ${props => getTheme(props).fontSize.sm};
`;

const PrivacySelect = styled.select`
  width: 100%;
  padding: ${props => getTheme(props).spacing.sm};
  border: 1px solid ${props => getTheme(props).colors.border};
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-size: ${props => getTheme(props).fontSize.sm};
  margin-top: ${props => getTheme(props).spacing.xs};

  &:focus {
    outline: none;
    border-color: ${props => getTheme(props).colors.primary};
  }
`;

const ErrorMessage = styled.div`
  margin-top: ${props => getTheme(props).spacing.xs};
  color: ${props => getTheme(props).colors.error};
  font-size: ${props => getTheme(props).fontSize.sm};
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: ${props => getTheme(props).spacing.md};
  background: ${props => getTheme(props).colors.primary};
  color: white;
  border: none;
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-size: ${props => getTheme(props).fontSize.md};
  font-weight: ${props => getTheme(props).fontWeight.semibold};
  cursor: pointer;
  transition: background 0.2s;
  margin-top: ${props => getTheme(props).spacing.lg};

  &:hover {
    background: ${props => getTheme(props).colors.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HelpText = styled.small`
  display: block;
  margin-top: ${props => getTheme(props).spacing.xs};
  color: ${props => getTheme(props).colors.textSecondary};
  font-size: ${props => getTheme(props).fontSize.xs};
`;

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit, onSuccess }) => {
  const [formData, setFormData] = useState<RegistrationData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    bio: '',
    location_sharing: 'off'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const captureLocation = async () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, location: 'Geolocation is not supported by your browser' }));
      return;
    }

    setLocationLoading(true);
    setErrors(prev => ({ ...prev, location: '' }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy)
          },
          location_sharing: 'city' // Default to city-level sharing
        }));
        setLocationCaptured(true);
        setLocationLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
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
        setErrors(prev => ({ ...prev, location: errorMessage }));
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) newErrors.username = 'Username must be alphanumeric';

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      onSuccess?.();
    } catch (error: any) {
      if (error.response?.data?.error) {
        const apiError = error.response.data.error;
        if (apiError.field) {
          setErrors({ [apiError.field]: apiError.message });
        } else {
          setErrors({ general: apiError.message });
        }
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        <Title>Create Your Account</Title>

        {errors.general && <ErrorMessage>{errors.general}</ErrorMessage>}

        <FormGroup>
          <Label>Username</Label>
          <InputWrapper>
            <Icon><FaUser /></Icon>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              disabled={loading}
            />
          </InputWrapper>
          {errors.username && <ErrorMessage>{errors.username}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Email</Label>
          <InputWrapper>
            <Icon><FaEnvelope /></Icon>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              disabled={loading}
            />
          </InputWrapper>
          {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>First Name</Label>
          <Input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="John"
            disabled={loading}
          />
          {errors.first_name && <ErrorMessage>{errors.first_name}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Last Name</Label>
          <Input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Doe"
            disabled={loading}
          />
          {errors.last_name && <ErrorMessage>{errors.last_name}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Password</Label>
          <InputWrapper>
            <Icon><FaLock /></Icon>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
            />
          </InputWrapper>
          <HelpText>Must be 8+ characters with uppercase, lowercase, and number</HelpText>
          {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Confirm Password</Label>
          <InputWrapper>
            <Icon><FaLock /></Icon>
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
            />
          </InputWrapper>
          {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Bio (Optional)</Label>
          <TextArea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us a bit about yourself..."
            disabled={loading}
          />
        </FormGroup>

        <LocationSection>
          <Label>Location (Optional)</Label>
          <HelpText>
            Share your location to find nearby users. You can always change this later.
          </HelpText>

          {!locationCaptured ? (
            <LocationButton
              type="button"
              onClick={captureLocation}
              disabled={locationLoading || loading}
            >
              <FaMapPin />
              {locationLoading ? 'Getting location...' : 'Enable Location'}
            </LocationButton>
          ) : (
            <>
              <LocationInfo>
                ✓ Location captured ({formData.location?.accuracy}m accuracy)
              </LocationInfo>
              <PrivacySelect
                name="location_sharing"
                value={formData.location_sharing}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="exact">Share exact location</option>
                <option value="city">Share city only</option>
                <option value="off">Keep private</option>
              </PrivacySelect>
            </>
          )}

          {errors.location && <ErrorMessage>{errors.location}</ErrorMessage>}
        </LocationSection>

        <SubmitButton type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </SubmitButton>
      </Form>
    </Container>
  );
};

export default RegistrationForm;
