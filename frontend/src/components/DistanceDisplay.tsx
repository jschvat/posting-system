/**
 * DistanceDisplay Component
 * Display distance to a user with optional location context
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaMapPin } from 'react-icons/fa6';
import locationApi from '../services/locationApi';
import { getTheme } from '../utils/themeHelpers';

interface DistanceDisplayProps {
  userId: number;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  showLocation?: boolean;
}

const Container = styled.div<{ $size: 'small' | 'medium' | 'large' }>`
  display: inline-flex;
  align-items: center;
  gap: ${props => getTheme(props).spacing.xs};
  color: ${props => getTheme(props).colors.textSecondary};
  font-size: ${props => {
    const theme = getTheme(props);
    switch (props.$size) {
      case 'small': return theme.fontSize.xs;
      case 'large': return theme.fontSize.md;
      default: return theme.fontSize.sm;
    }
  }};
`;

const Icon = styled.span`
  color: ${props => getTheme(props).colors.primary};
`;

const Distance = styled.span`
  font-weight: ${props => getTheme(props).fontWeight.medium};
  color: ${props => getTheme(props).colors.primary};
`;

const LocationText = styled.span`
  color: ${props => getTheme(props).colors.textSecondary};
`;

export const DistanceDisplay: React.FC<DistanceDisplayProps> = ({
  userId,
  showIcon = true,
  size = 'medium',
  showLocation = false
}) => {
  const [distance, setDistance] = useState<number | null>(null);
  const [location, setLocation] = useState<{ city: string | null; state: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDistance();
  }, [userId]);

  const loadDistance = async () => {
    try {
      // Get current user's location
      const myLocationResponse = await locationApi.getMyLocation();
      if (!myLocationResponse.success || !myLocationResponse.data) {
        setLoading(false);
        return;
      }

      const myLocation = myLocationResponse.data.location;
      if (!myLocation.latitude || !myLocation.longitude) {
        setLoading(false);
        return;
      }

      // Get other user's location
      const userLocationResponse = await locationApi.getUserLocation(userId);
      if (!userLocationResponse.success || !userLocationResponse.data) {
        setLoading(false);
        return;
      }

      const userLocation = userLocationResponse.data.location;

      // Store location info if needed
      if (showLocation) {
        setLocation({
          city: userLocation.city,
          state: userLocation.state
        });
      }

      // Calculate distance if both have coordinates
      if (userLocation.latitude && userLocation.longitude) {
        const distanceResponse = await locationApi.calculateDistance(
          myLocation.latitude,
          myLocation.longitude,
          userLocation.latitude,
          userLocation.longitude
        );

        if (distanceResponse.success && distanceResponse.data) {
          setDistance(distanceResponse.data.distance);
        }
      }
    } catch (error) {
      console.error('Error loading distance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (miles: number): string => {
    if (miles < 0.1) return 'Nearby';
    if (miles < 1) return `${miles.toFixed(2)} mi`;
    if (miles < 100) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi away`;
  };

  const formatLocation = (): string => {
    if (!location) return '';
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    return parts.join(', ');
  };

  if (loading || distance === null) {
    return null;
  }

  return (
    <Container $size={size}>
      {showIcon && (
        <Icon>
          <FaMapPin />
        </Icon>
      )}
      <Distance>{formatDistance(distance)}</Distance>
      {showLocation && location && (
        <LocationText>• {formatLocation()}</LocationText>
      )}
    </Container>
  );
};

export default DistanceDisplay;
