import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import marketplaceApi, { MarketplaceListing } from '../../services/marketplaceApi';
import { ListingCard } from '../../components/marketplace/ListingCard';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
`;

const CreateButton = styled.button`
  padding: 12px 24px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #2980b9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #ecf0f1;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #bdc3c7;
    border-radius: 2px;
  }
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: ${props => props.active ? 'white' : 'transparent'};
  color: ${props => props.active ? '#3498db' : '#7f8c8d'};
  border: none;
  border-bottom: 3px solid ${props => props.active ? '#3498db' : 'transparent'};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    color: #3498db;
    background: #f8f9fa;
  }
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3498db;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 600;
  text-transform: uppercase;
`;

const ListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
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

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
  font-size: 18px;
`;

const ErrorMessage = styled.div`
  background: #ffe6e6;
  color: #c0392b;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 15px;
`;

export const MyListings: React.FC = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'sold' | 'draft'>('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    sold: 0,
    draft: 0,
  });

  useEffect(() => {
    loadListings();
  }, [activeTab]);

  const loadListings = async () => {
    setLoading(true);
    setError('');

    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await marketplaceApi.getMyListings({ status, limit: 100 });

      if (response.success) {
        setListings(response.data || []);
        // Calculate stats from all listings
        calculateStats(response.data || []);
      } else {
        setError(response.error || 'Failed to load listings');
      }
    } catch (error: any) {
      console.error('Error loading listings:', error);
      setError(error.message || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (allListings: MarketplaceListing[]) => {
    setStats({
      total: allListings.length,
      active: allListings.filter(l => l.status === 'active').length,
      sold: allListings.filter(l => l.status === 'sold').length,
      draft: allListings.filter(l => l.status === 'draft').length,
    });
  };

  const handleListingClick = (id: number) => {
    navigate(`/marketplace/${id}`);
  };

  const handleCreateClick = () => {
    navigate('/marketplace/create');
  };

  const getFilteredListings = () => {
    if (activeTab === 'all') return listings;
    return listings.filter(l => l.status === activeTab);
  };

  const filteredListings = getFilteredListings();

  return (
    <Container>
      <Header>
        <Title>My Listings</Title>
        <CreateButton onClick={handleCreateClick}>
          + Create New Listing
        </CreateButton>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Stats>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total Listings</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.active}</StatValue>
          <StatLabel>Active</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.sold}</StatValue>
          <StatLabel>Sold</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.draft}</StatValue>
          <StatLabel>Drafts</StatLabel>
        </StatCard>
      </Stats>

      <Tabs>
        <Tab active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
          All ({stats.total})
        </Tab>
        <Tab active={activeTab === 'active'} onClick={() => setActiveTab('active')}>
          Active ({stats.active})
        </Tab>
        <Tab active={activeTab === 'sold'} onClick={() => setActiveTab('sold')}>
          Sold ({stats.sold})
        </Tab>
        <Tab active={activeTab === 'draft'} onClick={() => setActiveTab('draft')}>
          Drafts ({stats.draft})
        </Tab>
      </Tabs>

      {loading ? (
        <LoadingSpinner>Loading your listings...</LoadingSpinner>
      ) : filteredListings.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📦</EmptyIcon>
          <EmptyTitle>
            {activeTab === 'all' ? 'No listings yet' : `No ${activeTab} listings`}
          </EmptyTitle>
          <EmptyText>
            {activeTab === 'all'
              ? 'Get started by creating your first listing'
              : `You don't have any ${activeTab} listings at the moment`
            }
          </EmptyText>
          {activeTab === 'all' && (
            <CreateButton onClick={handleCreateClick}>
              + Create Your First Listing
            </CreateButton>
          )}
        </EmptyState>
      ) : (
        <ListingsGrid>
          {filteredListings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => handleListingClick(listing.id)}
            />
          ))}
        </ListingsGrid>
      )}
    </Container>
  );
};
