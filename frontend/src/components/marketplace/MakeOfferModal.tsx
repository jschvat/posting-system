import React, { useState } from 'react';
import styled from 'styled-components';
import marketplaceApi, { MarketplaceListing } from '../../services/marketplaceApi';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  padding: 24px;
  border-bottom: 1px solid #ecf0f1;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 28px;
  color: #7f8c8d;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #2c3e50;
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const ListingInfo = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 24px;
`;

const ListingImage = styled.img`
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
`;

const ListingImagePlaceholder = styled.div`
  width: 80px;
  height: 80px;
  background: #ecf0f1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
`;

const ListingDetails = styled.div`
  flex: 1;
`;

const ListingTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
`;

const ListingPrice = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #27ae60;
`;

const MinOfferNote = styled.div`
  font-size: 13px;
  color: #7f8c8d;
  margin-top: 4px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3498db;
  }

  &:disabled {
    background: #f8f9fa;
    cursor: not-allowed;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const HelpText = styled.p`
  font-size: 13px;
  color: #7f8c8d;
  margin: 8px 0 0 0;
`;

const ErrorMessage = styled.div`
  padding: 12px 16px;
  background: #ffe6e6;
  color: #e74c3c;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  padding: 12px 16px;
  background: #d5f4e6;
  color: #27ae60;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`;

const Footer = styled.div`
  padding: 24px;
  border-top: 1px solid #ecf0f1;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.variant === 'primary' ? `
    background: #3498db;
    color: white;

    &:hover:not(:disabled) {
      background: #2980b9;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }
  ` : `
    background: #ecf0f1;
    color: #2c3e50;

    &:hover:not(:disabled) {
      background: #d5dbdb;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const PriceInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 8px;
`;

const PriceLabel = styled.span`
  font-size: 14px;
  color: #7f8c8d;
`;

const PriceValue = styled.span<{ highlight?: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.highlight ? '#27ae60' : '#2c3e50'};
`;

interface MakeOfferModalProps {
  listing: MarketplaceListing;
  onClose: () => void;
  onSuccess: () => void;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({ listing, onClose, onSuccess }) => {
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const listingPrice = parseFloat(listing.price);
  const minOfferPrice = listing.min_offer_price ? parseFloat(listing.min_offer_price) : listingPrice * 0.5;
  const offerAmountNum = offerAmount ? parseFloat(offerAmount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!offerAmount || offerAmountNum <= 0) {
      setError('Please enter a valid offer amount');
      return;
    }

    if (listing.min_offer_price && offerAmountNum < minOfferPrice) {
      setError(`Offer must be at least $${minOfferPrice.toFixed(2)}`);
      return;
    }

    if (offerAmountNum >= listingPrice) {
      setError(`Offer must be less than the listing price of $${listingPrice.toFixed(2)}`);
      return;
    }

    setLoading(true);

    try {
      const response = await marketplaceApi.makeOffer(
        listing.id,
        offerAmountNum,
        message || undefined
      );

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(response.error || 'Failed to submit offer');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit offer');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const calculateSavings = () => {
    if (offerAmountNum > 0 && offerAmountNum < listingPrice) {
      return listingPrice - offerAmountNum;
    }
    return 0;
  };

  const savings = calculateSavings();

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Make an Offer</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <Content>
          <ListingInfo>
            {listing.primary_image ? (
              <ListingImage src={listing.primary_image} alt={listing.title} />
            ) : (
              <ListingImagePlaceholder>📦</ListingImagePlaceholder>
            )}
            <ListingDetails>
              <ListingTitle>{listing.title}</ListingTitle>
              <ListingPrice>{formatPrice(listingPrice)}</ListingPrice>
              {listing.min_offer_price && (
                <MinOfferNote>
                  Minimum offer: {formatPrice(minOfferPrice)}
                </MinOfferNote>
              )}
            </ListingDetails>
          </ListingInfo>

          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>Offer submitted successfully!</SuccessMessage>}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="offerAmount">Your Offer *</Label>
              <Input
                id="offerAmount"
                type="number"
                step="0.01"
                min={minOfferPrice}
                max={listingPrice - 0.01}
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder={`Enter amount (min: ${formatPrice(minOfferPrice)})`}
                disabled={loading || success}
                required
              />
              <HelpText>
                Make a reasonable offer below the asking price
              </HelpText>

              {offerAmountNum > 0 && (
                <PriceInfo>
                  <PriceLabel>You'll save:</PriceLabel>
                  <PriceValue highlight>{formatPrice(savings)}</PriceValue>
                </PriceInfo>
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="message">Message to Seller (Optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message to explain your offer..."
                disabled={loading || success}
                maxLength={500}
              />
              <HelpText>
                {message.length}/500 characters
              </HelpText>
            </FormGroup>

            <Footer>
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading || success}>
                {loading ? 'Submitting...' : 'Submit Offer'}
              </Button>
            </Footer>
          </form>
        </Content>
      </Modal>
    </Overlay>
  );
};

export default MakeOfferModal;
