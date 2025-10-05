/**
 * NearbyUsers Component
 * Displays list of users within a specified radius
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaMapPin, FaUser, FaMagnifyingGlass } from 'react-icons/fa6';
import locationApi, { NearbyUser } from '../services/locationApi';
import { getTheme } from '../utils/themeHelpers';
import LocationPermission from './LocationPermission';

interface NearbyUsersProps {
  initialRadius?: number;
}

const Container = styled.div`
  padding: ${props => getTheme(props).spacing.lg};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => getTheme(props).spacing.lg};
`;

const Title = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${props => getTheme(props).spacing.sm};
  font-size: ${props => getTheme(props).fontSize.xl};
  font-weight: ${props => getTheme(props).fontWeight.bold};
`;

const SearchControls = styled.div`
  display: flex;
  gap: ${props => getTheme(props).spacing.sm};
  margin-bottom: ${props => getTheme(props).spacing.md};
  align-items: center;
`;

const RadiusSelect = styled.select`
  padding: ${props => getTheme(props).spacing.sm};
  border: 1px solid ${props => getTheme(props).colors.border};
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-size: ${props => getTheme(props).fontSize.md};
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${props => getTheme(props).colors.primary};
  }
`;

const SearchButton = styled.button`
  padding: ${props => getTheme(props).spacing.sm} ${props => getTheme(props).spacing.md};
  background: ${props => getTheme(props).colors.primary};
  color: white;
  border: none;
  border-radius: ${props => getTheme(props).borderRadius.md};
  font-weight: ${props => getTheme(props).fontWeight.medium};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${props => getTheme(props).spacing.xs};
  transition: background 0.2s;

  &:hover {
    background: ${props => getTheme(props).colors.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => getTheme(props).spacing.md};
`;

const UserCard = styled.div`
  display: flex;
  align-items: center;
  padding: ${props => getTheme(props).spacing.md};
  background: ${props => getTheme(props).colors.surface};
  border-radius: ${props => getTheme(props).borderRadius.lg};
  box-shadow: ${props => getTheme(props).shadows.sm};
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: ${props => getTheme(props).shadows.md};
  }
`;

const Avatar = styled.img`
  width: 60px;
  height: 60px;
  border-radius: ${props => getTheme(props).borderRadius.full};
  object-fit: cover;
  margin-right: ${props => getTheme(props).spacing.md};
`;

const DefaultAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: ${props => getTheme(props).borderRadius.full};
  background: ${props => getTheme(props).colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  margin-right: ${props => getTheme(props).spacing.md};
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-weight: ${props => getTheme(props).fontWeight.semibold};
  font-size: ${props => getTheme(props).fontSize.md};
  margin-bottom: ${props => getTheme(props).spacing.xs};
`;

const UserLocation = styled.div`
  font-size: ${props => getTheme(props).fontSize.sm};
  color: ${props => getTheme(props).colors.textSecondary};
  margin-bottom: ${props => getTheme(props).spacing.xs};
`;

const Distance = styled.div`
  font-size: ${props => getTheme(props).fontSize.lg};
  font-weight: ${props => getTheme(props).fontWeight.semibold};
  color: ${props => getTheme(props).colors.primary};
  white-space: nowrap;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => getTheme(props).spacing.xl};
  color: ${props => getTheme(props).colors.textSecondary};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${props => getTheme(props).spacing.xl};
  color: ${props => getTheme(props).colors.textSecondary};
`;

const CachedBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: ${props => getTheme(props).colors.primaryLight};
  color: ${props => getTheme(props).colors.primary};
  border-radius: ${props => getTheme(props).borderRadius.sm};
  font-size: ${props => getTheme(props).fontSize.xs};
  margin-left: ${props => getTheme(props).spacing.xs};
`;

export const NearbyUsers: React.FC<NearbyUsersProps> = ({ initialRadius = 25 }) => {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(initialRadius);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [cached, setCached] = useState(false);

  const searchNearby = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const response = await locationApi.findNearby({
        latitude: lat,
        longitude: lon,
        radiusMiles: radius,
        limit: 50
      });

      if (response.success && response.data) {
        setUsers(response.data.users);
        setCached(response.data.cached);
      }
    } catch (error) {
      console.error('Error finding nearby users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationGranted = (lat: number, lon: number) => {
    setLocationGranted(true);
    setUserLocation({ lat, lon });
    searchNearby(lat, lon);
  };

  const handleSearch = () => {
    if (userLocation) {
      searchNearby(userLocation.lat, userLocation.lon);
    }
  };

  const formatDistance = (miles: number): string => {
    if (miles < 0.1) return 'Nearby';
    if (miles < 1) return `${miles.toFixed(2)} mi`;
    if (miles < 100) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
  };

  const getLocationDisplay = (user: NearbyUser): string => {
    const parts = [];
    if (user.location_city) parts.push(user.location_city);
    if (user.location_state) parts.push(user.location_state);
    return parts.join(', ') || 'Location hidden';
  };

  if (!locationGranted) {
    return <LocationPermission onLocationGranted={handleLocationGranted} />;
  }

  return (
    <Container>
      <Header>
        <Title>
          <FaMapPin />
          Nearby Users
          {cached && <CachedBadge>Cached</CachedBadge>}
        </Title>
      </Header>

      <SearchControls>
        <label>Radius:</label>
        <RadiusSelect value={radius} onChange={(e) => setRadius(parseInt(e.target.value))}>
          <option value={5}>5 miles</option>
          <option value={10}>10 miles</option>
          <option value={25}>25 miles</option>
          <option value={50}>50 miles</option>
          <option value={100}>100 miles</option>
          <option value={250}>250 miles</option>
        </RadiusSelect>
        <SearchButton onClick={handleSearch} disabled={loading}>
          <FaMagnifyingGlass />
          {loading ? 'Searching...' : 'Search'}
        </SearchButton>
      </SearchControls>

      {loading && <LoadingState>Finding nearby users...</LoadingState>}

      {!loading && users.length === 0 && (
        <EmptyState>
          No users found within {radius} miles.
          Try increasing the search radius.
        </EmptyState>
      )}

      <UserList>
        {users.map((user) => (
          <UserCard key={user.user_id}>
            {user.avatar_url ? (
              <Avatar src={user.avatar_url} alt={user.username} />
            ) : (
              <DefaultAvatar>
                <FaUser />
              </DefaultAvatar>
            )}
            <UserInfo>
              <UserName>
                {user.first_name} {user.last_name} (@{user.username})
              </UserName>
              <UserLocation>{getLocationDisplay(user)}</UserLocation>
            </UserInfo>
            <Distance>{formatDistance(user.distance_miles)}</Distance>
          </UserCard>
        ))}
      </UserList>
    </Container>
  );
};

export default NearbyUsers;
