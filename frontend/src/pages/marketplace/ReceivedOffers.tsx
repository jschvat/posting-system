import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import marketplaceApi from '../../services/marketplaceApi';

const Container = styled.div`
  max-width: 1200px;
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

const OffersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const OfferCard = styled.div`
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const OfferHeader = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
`;

const ListingImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
`;

const ListingImagePlaceholder = styled.div`
  width: 100px;
  height: 100px;
  background: #ecf0f1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
`;

const OfferContent = styled.div`
  flex: 1;
`;

const ListingTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
  cursor: pointer;

  &:hover {
    color: #3498db;
  }
`;

const OfferInfo = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
  margin-bottom: 12px;
`;

const PriceCompare = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const OfferPrice = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #e67e22;
`;

const ListingPrice = styled.div`
  font-size: 16px;
  color: #7f8c8d;
  text-decoration: line-through;
`;

const BuyerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7f8c8d;
  font-size: 14px;
`;

const TimeInfo = styled.div`
  color: #95a5a6;
  font-size: 13px;
`;

const Message = styled.div`
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin: 12px 0;
  font-size: 14px;
  color: #2c3e50;
  font-style: italic;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.status) {
      case 'pending': return '#fff3cd';
      case 'accepted': return '#d5f4e6';
      case 'rejected': return '#ffe6e6';
      case 'countered': return '#e7f3ff';
      case 'expired': return '#f0f0f0';
      default: return '#f8f9fa';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'pending': return '#856404';
      case 'accepted': return '#27ae60';
      case 'rejected': return '#c0392b';
      case 'countered': return '#3498db';
      case 'expired': return '#7f8c8d';
      default: return '#2c3e50';
    }
  }};
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const Button = styled.button<{ variant?: 'accept' | 'reject' | 'counter' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => {
    switch (props.variant) {
      case 'accept':
        return `
          background: #27ae60;
          color: white;
          &:hover { background: #229954; }
        `;
      case 'reject':
        return `
          background: #e74c3c;
          color: white;
          &:hover { background: #c0392b; }
        `;
      case 'counter':
        return `
          background: #3498db;
          color: white;
          &:hover { background: #2980b9; }
        `;
      default:
        return `
          background: #ecf0f1;
          color: #2c3e50;
          &:hover { background: #d5dbdb; }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CounterOfferInput = styled.input`
  padding: 10px;
  border: 2px solid #ecf0f1;
  border-radius: 6px;
  font-size: 14px;
  width: 150px;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
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
  margin: 0;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 18px;
  color: #7f8c8d;
`;

interface Offer {
  id: number;
  listing_id: number;
  listing_title: string;
  listing_price: string;
  listing_image: string;
  buyer_id: number;
  buyer_username: string;
  offer_amount: string;
  message: string;
  counter_amount: string;
  counter_message: string;
  status: string;
  created_at: string;
  responded_at: string;
}

export const ReceivedOffers: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [counterAmount, setCounterAmount] = useState<{ [key: number]: string }>({});
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadOffers();
  }, [activeTab]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (activeTab !== 'all') {
        params.status = activeTab;
      }

      const response = await marketplaceApi.getReceivedOffers(params);
      if (response.success) {
        setOffers(response.data || []);
      }
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (offerId: number) => {
    setActionLoading(offerId);
    try {
      const response = await marketplaceApi.acceptOffer(offerId);
      if (response.success) {
        loadOffers();
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (offerId: number) => {
    setActionLoading(offerId);
    try {
      const response = await marketplaceApi.rejectOffer(offerId);
      if (response.success) {
        loadOffers();
      }
    } catch (error) {
      console.error('Error rejecting offer:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCounter = async (offerId: number) => {
    const amount = counterAmount[offerId];
    if (!amount) return;

    setActionLoading(offerId);
    try {
      const response = await marketplaceApi.counterOffer(offerId, parseFloat(amount));
      if (response.success) {
        setCounterAmount({ ...counterAmount, [offerId]: '' });
        loadOffers();
      }
    } catch (error) {
      console.error('Error countering offer:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price: string) => `$${parseFloat(price).toFixed(2)}`;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getFilteredOffers = () => {
    if (activeTab === 'all') return offers;
    return offers.filter(o => o.status === activeTab);
  };

  const filteredOffers = getFilteredOffers();

  if (loading && offers.length === 0) {
    return (
      <Container>
        <LoadingState>Loading offers...</LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Received Offers</Title>
        <Subtitle>Manage offers from buyers on your listings</Subtitle>
      </Header>

      <TabsContainer>
        <Tab active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
          All ({offers.length})
        </Tab>
        <Tab active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
          Pending
        </Tab>
        <Tab active={activeTab === 'accepted'} onClick={() => setActiveTab('accepted')}>
          Accepted
        </Tab>
        <Tab active={activeTab === 'countered'} onClick={() => setActiveTab('countered')}>
          Countered
        </Tab>
        <Tab active={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')}>
          Rejected
        </Tab>
      </TabsContainer>

      {filteredOffers.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📬</EmptyIcon>
          <EmptyTitle>No offers yet</EmptyTitle>
          <EmptyText>
            When buyers make offers on your listings, they'll appear here
          </EmptyText>
        </EmptyState>
      ) : (
        <OffersList>
          {filteredOffers.map(offer => (
            <OfferCard key={offer.id}>
              <OfferHeader>
                {offer.listing_image ? (
                  <ListingImage src={offer.listing_image} alt={offer.listing_title} />
                ) : (
                  <ListingImagePlaceholder>📦</ListingImagePlaceholder>
                )}
                <OfferContent>
                  <ListingTitle onClick={() => navigate(`/marketplace/${offer.listing_id}`)}>
                    {offer.listing_title}
                  </ListingTitle>
                  <OfferInfo>
                    <PriceCompare>
                      <OfferPrice>{formatPrice(offer.offer_amount)}</OfferPrice>
                      <ListingPrice>{formatPrice(offer.listing_price)}</ListingPrice>
                    </PriceCompare>
                    <StatusBadge status={offer.status}>{offer.status}</StatusBadge>
                  </OfferInfo>
                  <BuyerInfo>
                    <span>👤 {offer.buyer_username}</span>
                    <span>•</span>
                    <TimeInfo>{formatTimeAgo(offer.created_at)}</TimeInfo>
                  </BuyerInfo>
                  {offer.message && <Message>"{offer.message}"</Message>}

                  {offer.status === 'pending' && (
                    <Actions>
                      <Button
                        variant="accept"
                        onClick={() => handleAccept(offer.id)}
                        disabled={actionLoading === offer.id}
                      >
                        ✓ Accept
                      </Button>
                      <CounterOfferInput
                        type="number"
                        step="0.01"
                        placeholder="Counter amount"
                        value={counterAmount[offer.id] || ''}
                        onChange={(e) => setCounterAmount({ ...counterAmount, [offer.id]: e.target.value })}
                      />
                      <Button
                        variant="counter"
                        onClick={() => handleCounter(offer.id)}
                        disabled={actionLoading === offer.id || !counterAmount[offer.id]}
                      >
                        ↔ Counter
                      </Button>
                      <Button
                        variant="reject"
                        onClick={() => handleReject(offer.id)}
                        disabled={actionLoading === offer.id}
                      >
                        ✗ Reject
                      </Button>
                    </Actions>
                  )}

                  {offer.status === 'countered' && offer.counter_amount && (
                    <div style={{ marginTop: '12px' }}>
                      <strong>Your counter offer: {formatPrice(offer.counter_amount)}</strong>
                      {offer.counter_message && <Message>"{offer.counter_message}"</Message>}
                    </div>
                  )}
                </OfferContent>
              </OfferHeader>
            </OfferCard>
          ))}
        </OffersList>
      )}
    </Container>
  );
};

export default ReceivedOffers;
