/**
 * LocationPermission Component
 * Requests and handles browser geolocation permissions
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaMapPin, FaXmark } from 'react-icons/fa6';
import locationApi from '../services/locationApi';
import { getTheme } from '../utils/themeHelpers';

interface LocationPermissionProps {
  onLocationGranted?: (lat: number, lon: number) => void;
  onLocationDenied?: () => void;
  autoRequest?: boolean;
}

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
  margin-bottom: ${props => getTheme(props).spacing.md};
`;

const Icon = styled.div<{ $status: 'pending' | 'granted' | 'denied' }>`
  font-size: 24px;
  color: ${props => {
    const theme = getTheme(props);
    switch (props.$status) {
      case 'granted': return theme.colors.success;
      case 'denied': return theme.colors.error;
      default: return theme.colors.primary;
    }
  }};
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${props => getTheme(props).fontSize.lg};
  font-weight: ${props => getTheme(props).fontWeight.semibold};
`;

const Description = styled.p`
  margin: ${props => getTheme(props).spacing.sm} 0;
  color: ${props => getTheme(props).colors.textSecondary};
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => getTheme(props).spacing.sm};
  margin-top: ${props => getTheme(props).spacing.md};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: ${props => getTheme(props).spacing.sm} ${props => getTheme(props).spacing.md};
  border: none;
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-weight: ${props => getTheme(props).fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;

  ${props => {
    const theme = getTheme(props);
    if (props.$variant === 'secondary') {
      return `
        background: transparent;
        color: ${theme.colors.textSecondary};
        border: 1px solid ${theme.colors.border};

        &:hover {
          background: ${theme.colors.hover};
        }
      `;
    }
    return `
      background: ${theme.colors.primary};
      color: white;

      &:hover {
        background: ${theme.colors.primaryDark};
      }
    `;
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  margin-top: ${props => getTheme(props).spacing.sm};
  padding: ${props => getTheme(props).spacing.sm};
  background: ${props => getTheme(props).colors.errorLight};
  color: ${props => getTheme(props).colors.error};
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-size: ${props => getTheme(props).fontSize.sm};
`;

const SuccessMessage = styled.div`
  margin-top: ${props => getTheme(props).spacing.sm};
  padding: ${props => getTheme(props).spacing.sm};
  background: ${props => getTheme(props).colors.successLight};
  color: ${props => getTheme(props).colors.success};
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-size: ${props => getTheme(props).fontSize.sm};
`;

export const LocationPermission: React.FC<LocationPermissionProps> = ({
  onLocationGranted,
  onLocationDenied,
  autoRequest = false
}) => {
  const [status, setStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest]);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setStatus('denied');
      onLocationDenied?.();
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setCoordinates({ lat, lon });
        setStatus('granted');

        try {
          // Update location on server
          await locationApi.updateLocation({
            latitude: lat,
            longitude: lon,
            accuracy: Math.round(accuracy)
          });

          onLocationGranted?.(lat, lon);
        } catch (err) {
          setError('Failed to update location on server');
          console.error('Location update error:', err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setStatus('denied');

        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied. Please enable location access in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('An unknown error occurred.');
        }

        onLocationDenied?.();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <Container>
      <Header>
        <Icon $status={status}>
          {status === 'denied' ? <FaXmark /> : <FaMapPin />}
        </Icon>
        <Title>
          {status === 'pending' && 'Enable Location'}
          {status === 'granted' && 'Location Enabled'}
          {status === 'denied' && 'Location Disabled'}
        </Title>
      </Header>

      {status === 'pending' && (
        <>
          <Description>
            Allow access to your location to find nearby users and connect with people in your area.
            Your location is never shared without your permission.
          </Description>
          <ButtonGroup>
            <Button onClick={requestLocation} disabled={loading}>
              {loading ? 'Requesting...' : 'Enable Location'}
            </Button>
            <Button $variant="secondary" onClick={() => onLocationDenied?.()}>
              Not Now
            </Button>
          </ButtonGroup>
        </>
      )}

      {status === 'granted' && coordinates && (
        <SuccessMessage>
          ✓ Location enabled successfully. You can now find nearby users!
        </SuccessMessage>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Container>
  );
};

export default LocationPermission;
