import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import marketplaceApi, { MarketplaceListing } from '../../services/marketplaceApi';
import { BuyingInterface } from '../../components/marketplace/BuyingInterface';
import { ImageModal } from '../../components/marketplace/ImageModal';
// Using Unicode symbols instead of react-icons for compatibility
const LocationIcon = () => <span>📍</span>;
const ArrowLeftIcon = () => <span>←</span>;
const UserIcon = () => <span>👤</span>;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #3498db;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 20px;
  padding: 8px 0;

  &:hover {
    color: #2980b9;
  }
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div``;

const ImageGallery = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const MainImage = styled.div`
  width: 100%;
  padding-top: 75%;
  background: #f0f0f0;
  position: relative;
`;

const Image = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const PlaceholderImage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 120px;
  font-weight: bold;
`;

const NavigationButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.direction}: 16px;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  color: #2c3e50;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  z-index: 2;

  &:hover {
    background: white;
    transform: translateY(-50%) scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const ImageCounter = styled.div`
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  z-index: 2;
`;

const ThumbnailStrip = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px;
  background: white;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
  }
`;

const Thumbnail = styled.div<{ active: boolean }>`
  min-width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid ${props => props.active ? '#3498db' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    border-color: #3498db;
    opacity: 0.8;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DetailsCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 16px 0;
  line-height: 1.3;
`;

const Category = styled.span`
  display: inline-block;
  padding: 6px 14px;
  background: #ecf0f1;
  color: #7f8c8d;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 24px;
`;

const ConditionBadge = styled.span<{ condition: string }>`
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  margin-left: 8px;
  background: ${props => {
    switch (props.condition) {
      case 'new': return '#2ecc71';
      case 'like_new': return '#3498db';
      case 'good': return '#f39c12';
      default: return '#95a5a6';
    }
  }};
  color: white;
`;

const Description = styled.div`
  color: #555;
  line-height: 1.8;
  margin-bottom: 24px;
  white-space: pre-wrap;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid #ecf0f1;
  border-bottom: 1px solid #ecf0f1;
  margin-bottom: 24px;
`;

const InfoItem = styled.div`
  h4 {
    font-size: 12px;
    color: #95a5a6;
    text-transform: uppercase;
    margin: 0 0 4px 0;
    font-weight: 600;
  }

  p {
    font-size: 15px;
    color: #2c3e50;
    margin: 0;
    font-weight: 600;
  }
`;

const RightColumn = styled.div``;

const SellerCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const SellerTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 16px 0;
`;

const SellerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SellerAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
`;

const SellerDetails = styled.div`
  flex: 1;

  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0 0 4px 0;
  }

  p {
    font-size: 13px;
    color: #7f8c8d;
    margin: 0;
  }
`;

const Location = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  border-top: 1px solid #ecf0f1;
  margin-top: 16px;
  color: #7f8c8d;
  font-size: 15px;

  svg {
    color: #e74c3c;
    font-size: 18px;
  }
`;

export const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadListing(parseInt(id));
    }
  }, [id]);

  const loadListing = async (listingId: number) => {
    setLoading(true);
    try {
      const response = await marketplaceApi.getListing(listingId);
      if (response.success) {
        setListing(response.data);
      }
    } catch (error) {
      console.error('Error loading listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!listing) return;

    try {
      if (listing.is_saved) {
        await marketplaceApi.unsaveListing(listing.id);
      } else {
        await marketplaceApi.saveListing(listing.id);
      }
      loadListing(listing.id);
    } catch (error) {
      console.error('Error saving listing:', error);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num === 0 ? 'Free' : `$${num.toFixed(2)}`;
  };

  const formatCondition = (condition: string) => {
    return condition.replace('_', ' ');
  };

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#7f8c8d' }}>
          Loading...
        </div>
      </Container>
    );
  }

  if (!listing) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <h2>Listing not found</h2>
          <BackButton onClick={() => navigate('/marketplace')}>
            <ArrowLeftIcon /> Back to Marketplace
          </BackButton>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton onClick={() => navigate('/marketplace')}>
        <ArrowLeftIcon /> Back to Marketplace
      </BackButton>

      <Content>
        <LeftColumn>
          <ImageGallery>
            <MainImage>
              {listing.media && listing.media.length > 0 ? (
                <>
                  <Image
                    src={listing.media[currentImageIndex].file_url}
                    alt={`${listing.title} - Image ${currentImageIndex + 1}`}
                    onClick={() => setIsModalOpen(true)}
                  />
                  {listing.media.length > 1 && (
                    <>
                      <NavigationButton
                        direction="left"
                        onClick={() => setCurrentImageIndex(prev => prev === 0 ? listing.media!.length - 1 : prev - 1)}
                        disabled={listing.media.length <= 1}
                      >
                        ‹
                      </NavigationButton>
                      <NavigationButton
                        direction="right"
                        onClick={() => setCurrentImageIndex(prev => prev === listing.media!.length - 1 ? 0 : prev + 1)}
                        disabled={listing.media.length <= 1}
                      >
                        ›
                      </NavigationButton>
                      <ImageCounter>
                        {currentImageIndex + 1} / {listing.media.length}
                      </ImageCounter>
                    </>
                  )}
                </>
              ) : listing.primary_image ? (
                <Image src={listing.primary_image} alt={listing.title} />
              ) : (
                <PlaceholderImage>
                  {listing.title.charAt(0).toUpperCase()}
                </PlaceholderImage>
              )}
            </MainImage>
            {listing.media && listing.media.length > 1 && (
              <ThumbnailStrip>
                {listing.media.map((image, index) => (
                  <Thumbnail
                    key={image.id}
                    active={index === currentImageIndex}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img src={image.file_url} alt={`Thumbnail ${index + 1}`} />
                  </Thumbnail>
                ))}
              </ThumbnailStrip>
            )}
          </ImageGallery>

          <DetailsCard>
            <Title>{listing.title}</Title>
            <div>
              <Category>{listing.category_name || 'Uncategorized'}</Category>
              <ConditionBadge condition={listing.condition}>
                {formatCondition(listing.condition)}
              </ConditionBadge>
            </div>

            <InfoGrid>
              <InfoItem>
                <h4>Price</h4>
                <p>{formatPrice(listing.price)}</p>
              </InfoItem>
              <InfoItem>
                <h4>Condition</h4>
                <p>{formatCondition(listing.condition)}</p>
              </InfoItem>
              <InfoItem>
                <h4>Shipping</h4>
                <p>{listing.shipping_available ? `$${listing.shipping_cost}` : 'Pickup only'}</p>
              </InfoItem>
              <InfoItem>
                <h4>Quantity</h4>
                <p>{listing.quantity} available</p>
              </InfoItem>
            </InfoGrid>

            <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '18px' }}>Description</h3>
            <Description>{listing.description}</Description>
          </DetailsCard>
        </LeftColumn>

        <RightColumn>
          <BuyingInterface listing={listing} onUpdate={() => loadListing(listing.id)} />

          <SellerCard>
            <SellerTitle>Seller Information</SellerTitle>
            <SellerInfo>
              <SellerAvatar>
                {listing.seller_username ? listing.seller_username.charAt(0).toUpperCase() : <UserIcon />}
              </SellerAvatar>
              <SellerDetails>
                <h4>{listing.seller_username || 'Anonymous'}</h4>
                <p>Member since {new Date(listing.created_at).getFullYear()}</p>
              </SellerDetails>
            </SellerInfo>

            <Location>
              <LocationIcon />
              {listing.location_city}, {listing.location_state}
              {listing.distance_miles && ` (${parseFloat(listing.distance_miles).toFixed(1)} mi away)`}
            </Location>
          </SellerCard>
        </RightColumn>
      </Content>

      {isModalOpen && listing.media && listing.media.length > 0 && (
        <ImageModal
          images={listing.media}
          currentIndex={currentImageIndex}
          onClose={() => setIsModalOpen(false)}
          onNavigate={(index) => setCurrentImageIndex(index)}
        />
      )}
    </Container>
  );
};
