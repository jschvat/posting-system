import { apiClient } from './api';
import { getApiBaseUrl } from '../config/app.config';

// Helper function to convert relative URLs to full URLs
const toFullUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getApiBaseUrl()}${path}`;
};

// Helper function to transform listing with full image URLs
const transformListing = (listing: any): MarketplaceListing => {
  return {
    ...listing,
    primary_image: toFullUrl(listing.primary_image),
    seller_image: toFullUrl(listing.seller_image),
    media: listing.media?.map((m: any) => ({
      ...m,
      file_url: toFullUrl(m.file_url),
      thumbnail_url: toFullUrl(m.thumbnail_url)
    }))
  };
};

export interface AuctionBid {
  id: number;
  user_id: number;
  username: string;
  bid_amount: string;
  is_winning: boolean;
  created_at: string;
}

export interface MarketplaceAuction {
  id: number;
  starting_bid: string;
  reserve_price?: string;
  current_bid: string;
  bid_increment: string;
  start_time: string;
  end_time: string;
  total_bids: number;
  status: 'active' | 'ended' | 'cancelled' | 'sold';
  bids?: AuctionBid[];
}

export interface MarketplaceRaffle {
  id: number;
  ticket_price: string;
  total_tickets: number;
  tickets_sold: number;
  min_tickets_to_draw?: number;
  max_tickets_per_user?: number;
  start_time: string;
  end_time: string;
  status: 'active' | 'ended' | 'drawn' | 'cancelled';
  user_ticket_count?: number;
}

export interface MarketplaceListing {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  listing_type: 'sale' | 'raffle' | 'auction';
  price: string;
  original_price?: string;
  quantity: number;
  allow_offers: boolean;
  min_offer_price?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'for_parts';
  location_latitude: string;
  location_longitude: string;
  location_city: string;
  location_state: string;
  location_zip?: string;
  location_country: string;
  shipping_available: boolean;
  shipping_cost?: string;
  shipping_radius_miles?: number;
  local_pickup_only: boolean;
  status: 'draft' | 'active' | 'sold' | 'expired' | 'removed' | 'suspended';
  view_count: number;
  save_count: number;
  share_count: number;
  seller_username?: string;
  seller_name?: string;
  seller_image?: string;
  seller_rating?: string;
  seller_review_count?: number;
  seller_level?: string;
  primary_image?: string;
  media?: Array<{
    id: number;
    file_url: string;
    file_type: string;
    is_primary: boolean;
    thumbnail_url?: string;
    display_order: number;
  }>;
  media_count?: number;
  distance_miles?: string;
  is_saved?: boolean;
  auction?: MarketplaceAuction;
  raffle?: MarketplaceRaffle;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceCategory {
  id: number;
  name: string;
  slug: string;
  parent_id?: number;
  description?: string;
  icon_url?: string;
  display_order: number;
  listing_count: number;
  is_active: boolean;
  children?: MarketplaceCategory[];
  breadcrumb?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  subcategories?: MarketplaceCategory[];
}

export interface SearchParams {
  query?: string;
  category_id?: number;
  listing_type?: 'sale' | 'raffle' | 'auction';
  min_price?: number;
  max_price?: number;
  condition?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  status?: string;
  sort_by?: 'created_at' | 'price' | 'distance' | 'popular';
  sort_order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface ListingResponse {
  success: boolean;
  data: MarketplaceListing[];
  pagination?: {
    page: number;
    pages: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CreateListingData {
  title: string;
  description: string;
  category_id?: number;
  listing_type?: 'sale' | 'raffle' | 'auction';
  price?: number;
  original_price?: number;
  quantity?: number;
  allow_offers?: boolean;
  min_offer_price?: number;
  condition: string;
  location_latitude: number;
  location_longitude: number;
  location_city: string;
  location_state: string;
  location_zip?: string;
  shipping_available?: boolean;
  shipping_cost?: number;
  shipping_radius_miles?: number;
  local_pickup_only?: boolean;
  status?: string;
}

const marketplaceApi = {
  // Categories
  getCategories: async () => {
    const response = await apiClient.get('/marketplace/categories');
    return response.data;
  },

  getCategoryHierarchy: async () => {
    const response = await apiClient.get('/marketplace/categories/hierarchy');
    return response.data;
  },

  getCategoryBySlug: async (slug: string) => {
    const response = await apiClient.get(`/marketplace/categories/${slug}`);
    return response.data;
  },

  getPopularCategories: async (limit = 10) => {
    const response = await apiClient.get(`/marketplace/categories/popular?limit=${limit}`);
    return response.data;
  },

  searchCategories: async (query: string) => {
    const response = await apiClient.get(`/marketplace/categories/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Listings
  getListings: async (params: SearchParams = {}): Promise<ListingResponse> => {
    const queryString = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/listings?${queryString.toString()}`);
    const data = response.data;

    // Transform listings to include full image URLs
    if (data.success && data.data) {
      data.data = data.data.map(transformListing);
    }

    return data;
  },

  getListing: async (id: number) => {
    const response = await apiClient.get(`/marketplace/listings/${id}`);
    const data = response.data;

    // Transform listing to include full image URLs
    if (data.success && data.data) {
      data.data = transformListing(data.data);
    }

    return data;
  },

  getNearbyListings: async (latitude: number, longitude: number, radius = 25, limit = 20) => {
    const response = await apiClient.get(
      `/marketplace/listings/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}&limit=${limit}`
    );
    return response.data;
  },

  getMyListings: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryString.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/listings/my-listings?${queryString.toString()}`);
    return response.data;
  },

  createListing: async (data: CreateListingData) => {
    const response = await apiClient.post('/marketplace/listings', data);
    return response.data;
  },

  updateListing: async (id: number, data: Partial<CreateListingData>) => {
    const response = await apiClient.put(`/marketplace/listings/${id}`, data);
    return response.data;
  },

  deleteListing: async (id: number) => {
    const response = await apiClient.delete(`/marketplace/listings/${id}`);
    return response.data;
  },

  saveListing: async (id: number, folder?: string, notes?: string) => {
    const response = await apiClient.post(`/marketplace/listings/${id}/save`, { folder, notes });
    return response.data;
  },

  unsaveListing: async (id: number) => {
    const response = await apiClient.delete(`/marketplace/listings/${id}/save`);
    return response.data;
  },

  // Auction methods
  placeBid: async (listingId: number, bidAmount: number, maxBidAmount?: number) => {
    const response = await apiClient.post(`/marketplace/auctions/${listingId}/bid`, {
      bid_amount: bidAmount,
      max_bid_amount: maxBidAmount
    });
    return response.data;
  },

  getAuctionBids: async (listingId: number) => {
    const response = await apiClient.get(`/marketplace/auctions/${listingId}/bids`);
    return response.data;
  },

  // Raffle methods
  buyRaffleTickets: async (listingId: number, ticketCount: number) => {
    const response = await apiClient.post(`/marketplace/raffles/${listingId}/tickets`, {
      ticket_count: ticketCount
    });
    return response.data;
  },

  getRaffleTickets: async (listingId: number) => {
    const response = await apiClient.get(`/marketplace/raffles/${listingId}/tickets`);
    return response.data;
  },

  // Saved Listings
  getSavedListings: async (params: { folder?: string; page?: number; limit?: number } = {}) => {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryString.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/saved?${queryString.toString()}`);
    return response.data;
  },

  getSavedFolders: async () => {
    const response = await apiClient.get('/marketplace/saved/folders');
    return response.data;
  },

  updateSavedFolder: async (listingId: number, folder: string) => {
    const response = await apiClient.put(`/marketplace/saved/${listingId}/folder`, { folder });
    return response.data;
  },

  updateSavedNotes: async (listingId: number, notes: string) => {
    const response = await apiClient.put(`/marketplace/saved/${listingId}/notes`, { notes });
    return response.data;
  },

  setPriceAlert: async (listingId: number, enabled: boolean, threshold?: number) => {
    const response = await apiClient.put(`/marketplace/saved/${listingId}/price-alert`, {
      enabled,
      threshold
    });
    return response.data;
  },

  // Offers
  makeOffer: async (listingId: number, offerAmount: number, message?: string) => {
    const response = await apiClient.post('/marketplace/offers', {
      listing_id: listingId,
      offer_amount: offerAmount,
      message
    });
    return response.data;
  },

  getReceivedOffers: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryString.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/offers/received?${queryString.toString()}`);
    return response.data;
  },

  getSentOffers: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryString.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/offers/sent?${queryString.toString()}`);
    return response.data;
  },

  acceptOffer: async (offerId: number) => {
    const response = await apiClient.put(`/marketplace/offers/${offerId}/accept`);
    return response.data;
  },

  rejectOffer: async (offerId: number) => {
    const response = await apiClient.put(`/marketplace/offers/${offerId}/reject`);
    return response.data;
  },

  counterOffer: async (offerId: number, counterAmount: number, message?: string) => {
    const response = await apiClient.put(`/marketplace/offers/${offerId}/counter`, {
      counter_amount: counterAmount,
      counter_message: message
    });
    return response.data;
  },

  withdrawOffer: async (offerId: number) => {
    const response = await apiClient.put(`/marketplace/offers/${offerId}/withdraw`);
    return response.data;
  },

  acceptCounterOffer: async (offerId: number) => {
    const response = await apiClient.put(`/marketplace/offers/${offerId}/accept-counter`);
    return response.data;
  },

  rejectCounterOffer: async (offerId: number) => {
    const response = await apiClient.put(`/marketplace/offers/${offerId}/reject-counter`);
    return response.data;
  },

  // Image Upload methods
  uploadImages: async (listingId: number, images: File[], onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    images.forEach(image => {
      formData.append('images', image);
    });

    const response = await apiClient.post(`/marketplace/listings/${listingId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
    return response.data;
  },

  deleteImage: async (listingId: number, imageId: number) => {
    const response = await apiClient.delete(`/marketplace/listings/${listingId}/images/${imageId}`);
    return response.data;
  },

  setPrimaryImage: async (listingId: number, imageId: number) => {
    const response = await apiClient.put(`/marketplace/listings/${listingId}/images/${imageId}/primary`);
    return response.data;
  },

  reorderImages: async (listingId: number, imageOrder: number[]) => {
    const response = await apiClient.put(`/marketplace/listings/${listingId}/images/reorder`, {
      imageOrder
    });
    return response.data;
  }
};

export default marketplaceApi;
