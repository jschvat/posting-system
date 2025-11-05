import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BuyingInterface } from '../BuyingInterface';
import marketplaceApi from '../../../services/marketplaceApi';
import { MarketplaceListing } from '../../../services/marketplaceApi';

// Mock the API
jest.mock('../../../services/marketplaceApi');
const mockedApi = marketplaceApi as jest.Mocked<typeof marketplaceApi>;

describe('BuyingInterface', () => {
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sale Listing', () => {
    const saleListing: MarketplaceListing = {
      id: 1,
      user_id: 1,
      title: 'Test Product',
      description: 'Test description',
      category_id: 1,
      listing_type: 'sale',
      price: '99.99',
      quantity: 1,
      allow_offers: false,
      condition: 'new',
      location_latitude: '40.7128',
      location_longitude: '-74.0060',
      location_city: 'New York',
      location_state: 'NY',
      location_country: 'USA',
      shipping_available: true,
      local_pickup_only: false,
      status: 'active',
      view_count: 0,
      save_count: 0,
      share_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('renders sale interface correctly', () => {
      render(<BuyingInterface listing={saleListing} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('For Sale')).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
      expect(screen.getByText('Buy Now')).toBeInTheDocument();
      expect(screen.getByText('Contact Seller')).toBeInTheDocument();
    });

    it('shows make offer button when allowed', () => {
      const listingWithOffers = { ...saleListing, allow_offers: true };
      render(<BuyingInterface listing={listingWithOffers} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('Make an Offer')).toBeInTheDocument();
    });

    it('shows original price when available', () => {
      const listingWithDiscount = { ...saleListing, original_price: '149.99' };
      render(<BuyingInterface listing={listingWithDiscount} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('$99.99')).toBeInTheDocument();
      expect(screen.getByText('$149.99')).toBeInTheDocument();
    });
  });

  describe('Auction Listing', () => {
    const auctionListing: MarketplaceListing = {
      id: 2,
      user_id: 1,
      title: 'Auction Product',
      description: 'Test auction',
      category_id: 1,
      listing_type: 'auction',
      price: '250.00',
      quantity: 1,
      allow_offers: false,
      condition: 'new',
      location_latitude: '40.7128',
      location_longitude: '-74.0060',
      location_city: 'New York',
      location_state: 'NY',
      location_country: 'USA',
      shipping_available: true,
      local_pickup_only: false,
      status: 'active',
      view_count: 0,
      save_count: 0,
      share_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      auction: {
        id: 1,
        starting_bid: '250.00',
        current_bid: '280.00',
        bid_increment: '10.00',
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-12-31T23:59:59Z',
        total_bids: 3,
        status: 'active',
        bids: [
          {
            id: 1,
            user_id: 2,
            username: 'bidder1',
            bid_amount: '280.00',
            is_winning: true,
            created_at: '2024-01-01T12:00:00Z'
          },
          {
            id: 2,
            user_id: 3,
            username: 'bidder2',
            bid_amount: '270.00',
            is_winning: false,
            created_at: '2024-01-01T11:00:00Z'
          }
        ]
      }
    };

    it('renders auction interface correctly', () => {
      render(<BuyingInterface listing={auctionListing} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('Auction')).toBeInTheDocument();
      expect(screen.getByText('$280.00')).toBeInTheDocument();
      expect(screen.getByText('Current Bid')).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument(); // Bids count
      expect(screen.getByText('Place Bid')).toBeInTheDocument();
    });

    it('shows bid history', () => {
      render(<BuyingInterface listing={auctionListing} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('bidder1')).toBeInTheDocument();
      expect(screen.getByText('bidder2')).toBeInTheDocument();
    });

    it('validates minimum bid amount', async () => {
      render(<BuyingInterface listing={auctionListing} onUpdate={mockOnUpdate} />);

      const input = screen.getByPlaceholderText(/Enter bid amount/);
      const button = screen.getByText('Place Bid');

      // Try to bid less than minimum
      fireEvent.change(input, { target: { value: '285' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Minimum bid is \$290.00/)).toBeInTheDocument();
      });
    });

    it('places bid successfully', async () => {
      mockedApi.placeBid.mockResolvedValue({
        success: true,
        data: { id: 4, bid_amount: 300 }
      });

      render(<BuyingInterface listing={auctionListing} onUpdate={mockOnUpdate} />);

      const input = screen.getByPlaceholderText(/Enter bid amount/);
      const button = screen.getByText('Place Bid');

      fireEvent.change(input, { target: { value: '300' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockedApi.placeBid).toHaveBeenCalledWith(2, 300, undefined);
        expect(screen.getByText('Bid placed successfully!')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Raffle Listing', () => {
    const raffleListing: MarketplaceListing = {
      id: 3,
      user_id: 1,
      title: 'Raffle Product',
      description: 'Test raffle',
      category_id: 1,
      listing_type: 'raffle',
      price: '5.00',
      quantity: 1,
      allow_offers: false,
      condition: 'new',
      location_latitude: '40.7128',
      location_longitude: '-74.0060',
      location_city: 'New York',
      location_state: 'NY',
      location_country: 'USA',
      shipping_available: true,
      local_pickup_only: false,
      status: 'active',
      view_count: 0,
      save_count: 0,
      share_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      raffle: {
        id: 1,
        ticket_price: '5.00',
        total_tickets: 100,
        tickets_sold: 50,
        max_tickets_per_user: 10,
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-12-31T23:59:59Z',
        status: 'active',
        user_ticket_count: 2
      }
    };

    it('renders raffle interface correctly', () => {
      render(<BuyingInterface listing={raffleListing} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('Raffle')).toBeInTheDocument();
      expect(screen.getByText('$5.00')).toBeInTheDocument();
      expect(screen.getByText('per ticket')).toBeInTheDocument();
      expect(screen.getByText(/50 \/ 100/)).toBeInTheDocument();
      expect(screen.getByText('Buy Tickets')).toBeInTheDocument();
    });

    it('shows progress bar', () => {
      const { container } = render(<BuyingInterface listing={raffleListing} onUpdate={mockOnUpdate} />);

      // Check progress bar exists
      const progressBar = container.querySelector('div[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('calculates total cost correctly', () => {
      render(<BuyingInterface listing={raffleListing} onUpdate={mockOnUpdate} />);

      const input = screen.getByPlaceholderText('Number of tickets');
      fireEvent.change(input, { target: { value: '3' } });

      expect(screen.getByText('Total: $15.00')).toBeInTheDocument();
    });

    it('validates max tickets per user', async () => {
      render(<BuyingInterface listing={raffleListing} onUpdate={mockOnUpdate} />);

      const input = screen.getByPlaceholderText('Number of tickets');
      const button = screen.getByText('Buy Tickets');

      // Try to buy more than max
      fireEvent.change(input, { target: { value: '15' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Maximum 10 tickets per user/)).toBeInTheDocument();
      });
    });

    it('validates remaining tickets', async () => {
      render(<BuyingInterface listing={raffleListing} onUpdate={mockOnUpdate} />);

      const input = screen.getByPlaceholderText('Number of tickets');
      const button = screen.getByText('Buy Tickets');

      // Try to buy more than remaining (50 remaining)
      fireEvent.change(input, { target: { value: '51' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Only 50 tickets remaining/)).toBeInTheDocument();
      });
    });

    it('buys tickets successfully', async () => {
      mockedApi.buyRaffleTickets.mockResolvedValue({
        success: true,
        data: { tickets: [{}, {}, {}], ticket_numbers: [51, 52, 53] }
      });

      render(<BuyingInterface listing={raffleListing} onUpdate={mockOnUpdate} />);

      const input = screen.getByPlaceholderText('Number of tickets');
      const button = screen.getByText('Buy Tickets');

      fireEvent.change(input, { target: { value: '3' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockedApi.buyRaffleTickets).toHaveBeenCalledWith(3, 3);
        expect(screen.getByText('Successfully purchased 3 tickets!')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('disables button when sold out', () => {
      const soldOutListing = {
        ...raffleListing,
        raffle: { ...raffleListing.raffle!, tickets_sold: 100 }
      };

      render(<BuyingInterface listing={soldOutListing} onUpdate={mockOnUpdate} />);

      const button = screen.getByText('Sold Out');
      expect(button).toBeDisabled();
    });
  });
});
