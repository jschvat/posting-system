import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import marketplaceApi from '../../services/marketplaceApi';
import { MarketplaceListing } from '../../services/marketplaceApi';
import { ListingCard } from '../../components/marketplace/ListingCard';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #7f8c8d;
  margin: 0;
`;

const TabsContainer = styled.div`
  border-bottom: 2px solid #ecf0f1;
  margin-bottom: 24px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid ${props => props.active ? '#3498db' : 'transparent'};
  color: ${props => props.active ? '#3498db' : '#7f8c8d'};
  font-size: 15px;
  font-weight: ${props => props.active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    color: #3498db;
    background: #f8f9fa;
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const StatIcon = styled.div`
  font-size: 24px;
`;

const StatContent = styled.div``;

const StatLabel = styled.div`
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
`;

const ListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 24px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  border: 1px solid #e1e8ed;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
`;

const EmptyText = styled.p`
  font-size: 16px;
  color: #7f8c8d;
  margin: 0 0 24px 0;
`;

const BrowseButton = styled.button`
  padding: 12px 32px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2980b9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 18px;
  color: #7f8c8d;
`;

const ErrorMessage = styled.div`
  background: #ffe6e6;
  color: #c0392b;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
`;

const SavedItemCard = styled.div`
  position: relative;
`;

const UnsaveButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  z-index: 10;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #e74c3c;
    color: white;
    transform: scale(1.1);
  }
`;

const FolderInfo = styled.div`
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: #7f8c8d;
  display: flex;
  align-items: center;
  gap: 6px;
`;

interface SavedListing extends MarketplaceListing {
  saved_at?: string;
  folder?: string;
  notes?: string;
}

export const SavedListings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('all');

  useEffect(() => {
    loadSavedListings();
    loadFolders();
  }, [activeFolder]);

  const loadSavedListings = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { limit: 100 };
      if (activeFolder !== 'all') {
        params.folder = activeFolder;
      }

      const response = await marketplaceApi.getSavedListings(params);

      if (response.success) {
        setListings(response.data || []);
      } else {
        setError('Failed to load saved listings');
      }
    } catch (err: any) {
      console.error('Error loading saved listings:', err);
      setError(err.message || 'Failed to load saved listings');
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await marketplaceApi.getSavedFolders();
      if (response.success) {
        setFolders(response.data || []);
      }
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  };

  const handleUnsave = async (listingId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await marketplaceApi.unsaveListing(listingId);
      if (response.success) {
        // Remove from local state
        setListings(prev => prev.filter(l => l.id !== listingId));
      }
    } catch (err) {
      console.error('Error unsaving listing:', err);
    }
  };

  const getStats = () => {
    return {
      total: listings.length,
      priceAlerts: listings.filter(l => (l as any).price_alert_enabled).length,
      folders: folders.length
    };
  };

  const stats = getStats();

  if (loading && listings.length === 0) {
    return (
      <Container>
        <LoadingState>Loading your saved listings...</LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Saved Listings</Title>
        <Subtitle>Keep track of items you're interested in</Subtitle>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <StatsBar>
        <StatCard>
          <StatIcon>💾</StatIcon>
          <StatContent>
            <StatLabel>Total Saved</StatLabel>
            <StatValue>{stats.total}</StatValue>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon>📁</StatIcon>
          <StatContent>
            <StatLabel>Folders</StatLabel>
            <StatValue>{stats.folders}</StatValue>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon>🔔</StatIcon>
          <StatContent>
            <StatLabel>Price Alerts</StatLabel>
            <StatValue>{stats.priceAlerts}</StatValue>
          </StatContent>
        </StatCard>
      </StatsBar>

      <TabsContainer>
        <Tab
          active={activeFolder === 'all'}
          onClick={() => setActiveFolder('all')}
        >
          All ({listings.length})
        </Tab>
        {folders.map(folder => (
          <Tab
            key={folder}
            active={activeFolder === folder}
            onClick={() => setActiveFolder(folder)}
          >
            📁 {folder}
          </Tab>
        ))}
      </TabsContainer>

      {listings.length === 0 ? (
        <EmptyState>
          <EmptyIcon>💾</EmptyIcon>
          <EmptyTitle>
            {activeFolder === 'all'
              ? 'No saved listings yet'
              : `No items in "${activeFolder}"`
            }
          </EmptyTitle>
          <EmptyText>
            {activeFolder === 'all'
              ? 'Save listings to keep track of items you\'re interested in'
              : 'Items you save to this folder will appear here'
            }
          </EmptyText>
          <BrowseButton onClick={() => navigate('/marketplace')}>
            Browse Marketplace
          </BrowseButton>
        </EmptyState>
      ) : (
        <ListingsGrid>
          {listings.map(listing => (
            <SavedItemCard key={listing.id}>
              <UnsaveButton
                onClick={(e) => handleUnsave(listing.id, e)}
                title="Remove from saved"
              >
                ❤️
              </UnsaveButton>
              <ListingCard listing={listing} />
              {listing.folder && (
                <FolderInfo>
                  📁 {listing.folder}
                </FolderInfo>
              )}
            </SavedItemCard>
          ))}
        </ListingsGrid>
      )}
    </Container>
  );
};

export default SavedListings;
