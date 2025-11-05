import React, { useState } from 'react';
import styled from 'styled-components';
import marketplaceApi, { MarketplaceListing } from '../../services/marketplaceApi';

const PriceCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  position: sticky;
  top: 20px;
`;

const Price = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 20px;
`;

const OriginalPrice = styled.span`
  font-size: 18px;
  color: #95a5a6;
  text-decoration: line-through;
  margin-left: 12px;
  font-weight: 400;
`;

const Badge = styled.div<{ type?: 'auction' | 'raffle' }>`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
  background: ${props => props.type === 'auction' ? '#3498db' : props.type === 'raffle' ? '#9b59b6' : '#27ae60'};
  color: white;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 12px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  width: 100%;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: ${props => props.variant === 'secondary' ? '#ecf0f1' : '#3498db'};
  color: ${props => props.variant === 'secondary' ? '#2c3e50' : 'white'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const AuctionInfo = styled.div`
  padding: 16px;
  background: #ecf0f1;
  border-radius: 8px;
  margin-bottom: 16px;

  div {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;

    &:last-child {
      margin-bottom: 0;
    }

    strong {
      color: #2c3e50;
    }

    span {
      color: #7f8c8d;
    }
  }
`;

const BidHistory = styled.div`
  max-height: 200px;
  overflow-y: auto;
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;

  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #2c3e50;
  }
`;

const BidItem = styled.div<{ isWinning?: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  background: ${props => props.isWinning ? '#d5f4e6' : 'white'};
  font-size: 13px;

  strong {
    color: #2c3e50;
  }

  span {
    color: #7f8c8d;
  }
`;

const RaffleInfo = styled.div`
  padding: 16px;
  background: #ecf0f1;
  border-radius: 8px;
  margin-bottom: 16px;

  div {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;

    &:last-child {
      margin-bottom: 0;
    }

    strong {
      color: #2c3e50;
    }

    span {
      color: #7f8c8d;
    }
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  margin-bottom: 12px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ percentage: number }>`
  height: 100%;
  width: ${props => props.percentage}%;
  background: linear-gradient(90deg, #9b59b6, #8e44ad);
  transition: width 0.3s;
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: #ffe6e6;
  color: #e74c3c;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  padding: 12px;
  background: #d5f4e6;
  color: #27ae60;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
`;

interface BuyingInterfaceProps {
  listing: MarketplaceListing;
  onUpdate: () => void;
}

export const BuyingInterface: React.FC<BuyingInterfaceProps> = ({ listing, onUpdate }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [ticketCount, setTicketCount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `$${num.toFixed(2)}`;
  };

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handlePlaceBid = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const amount = parseFloat(bidAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid bid amount');
        return;
      }

      if (listing.auction && amount < parseFloat(listing.auction.current_bid) + parseFloat(listing.auction.bid_increment)) {
        setError(`Minimum bid is ${formatPrice(parseFloat(listing.auction.current_bid) + parseFloat(listing.auction.bid_increment))}`);
        return;
      }

      await marketplaceApi.placeBid(listing.id, amount);
      setSuccess('Bid placed successfully!');
      setBidAmount('');
      setTimeout(() => {
        onUpdate();
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTickets = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const count = parseInt(ticketCount);
      if (isNaN(count) || count <= 0) {
        setError('Please enter a valid ticket count');
        return;
      }

      if (listing.raffle) {
        const remaining = listing.raffle.total_tickets - listing.raffle.tickets_sold;
        if (count > remaining) {
          setError(`Only ${remaining} tickets remaining`);
          return;
        }

        if (listing.raffle.max_tickets_per_user && count > listing.raffle.max_tickets_per_user) {
          setError(`Maximum ${listing.raffle.max_tickets_per_user} tickets per user`);
          return;
        }
      }

      await marketplaceApi.buyRaffleTickets(listing.id, count);
      setSuccess(`Successfully purchased ${count} ticket${count > 1 ? 's' : ''}!`);
      setTicketCount('1');
      setTimeout(() => {
        onUpdate();
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to buy tickets');
    } finally {
      setLoading(false);
    }
  };

  // Regular Sale Interface
  if (listing.listing_type === 'sale') {
    return (
      <PriceCard>
        <Badge>For Sale</Badge>
        <Price>
          {formatPrice(listing.price)}
          {listing.original_price && parseFloat(listing.original_price) > parseFloat(listing.price) && (
            <OriginalPrice>{formatPrice(listing.original_price)}</OriginalPrice>
          )}
        </Price>

        <Button variant="primary" style={{ marginBottom: '12px' }}>
          Buy Now
        </Button>
        <Button variant="secondary">
          Contact Seller
        </Button>

        {listing.allow_offers && (
          <Button variant="secondary" style={{ marginTop: '12px' }}>
            Make an Offer
          </Button>
        )}
      </PriceCard>
    );
  }

  // Auction Interface
  if (listing.listing_type === 'auction' && listing.auction) {
    const minBid = parseFloat(listing.auction.current_bid) + parseFloat(listing.auction.bid_increment);

    return (
      <PriceCard>
        <Badge type="auction">Auction</Badge>
        <Price>
          {formatPrice(listing.auction.current_bid)}
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginTop: '8px' }}>
            Current Bid
          </div>
        </Price>

        <AuctionInfo>
          <div>
            <strong>Bids:</strong>
            <span>{listing.auction.total_bids}</span>
          </div>
          <div>
            <strong>Time Remaining:</strong>
            <span>{formatTimeRemaining(listing.auction.end_time)}</span>
          </div>
          <div>
            <strong>Minimum Bid:</strong>
            <span>{formatPrice(minBid)}</span>
          </div>
        </AuctionInfo>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <Input
          type="number"
          placeholder={`Enter bid amount (min ${formatPrice(minBid)})`}
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          step="0.01"
          min={minBid}
        />

        <Button variant="primary" onClick={handlePlaceBid} disabled={loading}>
          {loading ? 'Placing Bid...' : 'Place Bid'}
        </Button>

        {listing.auction.bids && listing.auction.bids.length > 0 && (
          <BidHistory>
            <h4>Bid History ({listing.auction.bids.length})</h4>
            {listing.auction.bids.slice(0, 5).map((bid, index) => (
              <BidItem key={bid.id} isWinning={index === 0}>
                <strong>{bid.username}</strong>
                <span>{formatPrice(bid.bid_amount)}</span>
              </BidItem>
            ))}
          </BidHistory>
        )}
      </PriceCard>
    );
  }

  // Raffle Interface
  if (listing.listing_type === 'raffle' && listing.raffle) {
    const soldPercentage = (listing.raffle.tickets_sold / listing.raffle.total_tickets) * 100;
    const remaining = listing.raffle.total_tickets - listing.raffle.tickets_sold;
    const ticketPrice = parseFloat(listing.raffle.ticket_price);
    const totalPrice = ticketPrice * parseInt(ticketCount || '0');

    return (
      <PriceCard>
        <Badge type="raffle">Raffle</Badge>
        <Price>
          {formatPrice(listing.raffle.ticket_price)}
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginTop: '8px' }}>
            per ticket
          </div>
        </Price>

        <ProgressBar>
          <ProgressFill percentage={soldPercentage} />
        </ProgressBar>

        <RaffleInfo>
          <div>
            <strong>Tickets Sold:</strong>
            <span>{listing.raffle.tickets_sold} / {listing.raffle.total_tickets}</span>
          </div>
          <div>
            <strong>Remaining:</strong>
            <span>{remaining} tickets</span>
          </div>
          <div>
            <strong>Drawing:</strong>
            <span>{formatTimeRemaining(listing.raffle.end_time)}</span>
          </div>
          {listing.raffle.max_tickets_per_user && (
            <div>
              <strong>Max per User:</strong>
              <span>{listing.raffle.max_tickets_per_user} tickets</span>
            </div>
          )}
          {listing.raffle.user_ticket_count !== undefined && listing.raffle.user_ticket_count > 0 && (
            <div>
              <strong>Your Tickets:</strong>
              <span>{listing.raffle.user_ticket_count}</span>
            </div>
          )}
        </RaffleInfo>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <Input
          type="number"
          placeholder="Number of tickets"
          value={ticketCount}
          onChange={(e) => setTicketCount(e.target.value)}
          min="1"
          max={listing.raffle.max_tickets_per_user || remaining}
        />

        <div style={{ marginBottom: '12px', textAlign: 'center', fontSize: '14px', color: '#7f8c8d' }}>
          Total: {formatPrice(totalPrice)}
        </div>

        <Button variant="primary" onClick={handleBuyTickets} disabled={loading || remaining === 0}>
          {loading ? 'Purchasing...' : remaining === 0 ? 'Sold Out' : 'Buy Tickets'}
        </Button>
      </PriceCard>
    );
  }

  return null;
};
