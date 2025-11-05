import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate, useSearchParams } from 'react-router-dom';
import marketplaceApi, { MarketplaceListing, MarketplaceCategory } from '../../services/marketplaceApi';
import { ListingCard } from '../../components/marketplace/ListingCard';
// Using Unicode symbols instead of react-icons for compatibility
const SearchIcon = () => <span>🔍</span>;
const FilterIcon = () => <span>🔽</span>;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 24px 0;
`;

const SearchBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 14px 20px 14px 48px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.1);
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;

  svg {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #95a5a6;
    font-size: 18px;
  }
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 14px 24px;
  background: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : '#2c3e50'};
  border: 2px solid ${props => props.active ? '#3498db' : '#e0e0e0'};
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#2980b9' : '#f8f9fa'};
    border-color: ${props => props.active ? '#2980b9' : '#3498db'};
  }
`;

const FiltersPanel = styled.div<{ show: boolean }>`
  display: ${props => props.show ? 'block' : 'none'};
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
`;

const Select = styled.select`
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Input = styled.input`
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const CategoryTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
`;

const CategoryTag = styled.button<{ active?: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : '#2c3e50'};
  border: 2px solid ${props => props.active ? '#3498db' : '#e0e0e0'};
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#2980b9' : '#f8f9fa'};
    border-color: ${props => props.active ? '#2980b9' : '#3498db'};
  }
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ResultsCount = styled.span`
  font-size: 16px;
  color: #7f8c8d;
`;

const SortSelect = styled.select`
  padding: 10px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
  font-size: 18px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #7f8c8d;

  h3 {
    font-size: 24px;
    margin-bottom: 12px;
    color: #2c3e50;
  }

  p {
    font-size: 16px;
    margin-bottom: 24px;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 40px 0;
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: 10px 16px;
  background: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : '#2c3e50'};
  border: 2px solid ${props => props.active ? '#3498db' : '#e0e0e0'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.active ? '#2980b9' : '#f8f9fa'};
    border-color: #3498db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const MarketplaceBrowse: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(
    searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined
  );
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationRadius, setLocationRadius] = useState<number>(25); // Default 25 miles
  const [useLocation, setUseLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>('');

  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    hasMore: false
  });

  useEffect(() => {
    loadCategories();
    requestUserLocation();
  }, []);

  useEffect(() => {
    loadListings();
  }, [searchQuery, selectedCategory, minPrice, maxPrice, condition, sortBy, page, useLocation, locationRadius]);

  const requestUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationError('');
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to get your location. Location filtering is disabled.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await marketplaceApi.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadListings = async () => {
    setLoading(true);
    try {
      const response = await marketplaceApi.getListings({
        query: searchQuery || undefined,
        category_id: selectedCategory,
        min_price: minPrice ? parseFloat(minPrice) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        condition: condition || undefined,
        latitude: (useLocation && userLocation) ? userLocation.latitude : undefined,
        longitude: (useLocation && userLocation) ? userLocation.longitude : undefined,
        radius: (useLocation && userLocation) ? locationRadius : undefined,
        sort_by: sortBy as any,
        sort_order: 'DESC',
        page,
        limit: 20
      });

      if (response.success) {
        setListings(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadListings();
  };

  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategory(categoryId === selectedCategory ? undefined : categoryId);
    setPage(1);
  };

  const handleSaveListing = async (id: number) => {
    try {
      const listing = listings.find(l => l.id === id);
      if (listing?.is_saved) {
        await marketplaceApi.unsaveListing(id);
      } else {
        await marketplaceApi.saveListing(id);
      }
      // Reload listings to update saved state
      loadListings();
    } catch (error) {
      console.error('Error saving/unsaving listing:', error);
    }
  };

  const handleListingClick = (id: number) => {
    navigate(`/marketplace/${id}`);
  };

  return (
    <Container>
      <Header>
        <Title>Marketplace</Title>

        <SearchBar>
          <SearchWrapper>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search for items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </SearchWrapper>
          <FilterButton active={showFilters} onClick={() => setShowFilters(!showFilters)}>
            <FilterIcon /> Filters
          </FilterButton>
        </SearchBar>

        <FiltersPanel show={showFilters}>
          <FilterGrid>
            <FilterGroup>
              <Label>Min Price</Label>
              <Input
                type="number"
                placeholder="$0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <Label>Max Price</Label>
              <Input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <Label>Condition</Label>
              <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="">All Conditions</option>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </Select>
            </FilterGroup>

            <FilterGroup>
              <Label>
                <input
                  type="checkbox"
                  checked={useLocation}
                  onChange={(e) => setUseLocation(e.target.checked)}
                  disabled={!userLocation}
                  style={{ marginRight: '8px' }}
                />
                Near Me
              </Label>
              {useLocation && userLocation && (
                <>
                  <Label>Radius: {locationRadius} miles</Label>
                  <Input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={locationRadius}
                    onChange={(e) => setLocationRadius(parseInt(e.target.value))}
                  />
                </>
              )}
              {locationError && (
                <span style={{ fontSize: '12px', color: '#e74c3c' }}>{locationError}</span>
              )}
            </FilterGroup>
          </FilterGrid>
        </FiltersPanel>

        {categories.length > 0 && (
          <CategoryTags>
            <CategoryTag
              active={!selectedCategory}
              onClick={() => handleCategoryClick(0)}
            >
              All Categories
            </CategoryTag>
            {categories.slice(0, 8).map((cat) => (
              <CategoryTag
                key={cat.id}
                active={selectedCategory === cat.id}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.name}
              </CategoryTag>
            ))}
          </CategoryTags>
        )}
      </Header>

      <ResultsHeader>
        <ResultsCount>
          {pagination.total} {pagination.total === 1 ? 'item' : 'items'} found
        </ResultsCount>
        <SortSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="created_at">Newest First</option>
          <option value="price">Price: Low to High</option>
          <option value="popular">Most Popular</option>
        </SortSelect>
      </ResultsHeader>

      {loading ? (
        <LoadingMessage>Loading listings...</LoadingMessage>
      ) : listings.length === 0 ? (
        <EmptyState>
          <h3>No items found</h3>
          <p>Try adjusting your search or filters</p>
        </EmptyState>
      ) : (
        <>
          <ListingsGrid>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onSave={handleSaveListing}
                onClick={handleListingClick}
              />
            ))}
          </ListingsGrid>

          {pagination.pages > 1 && (
            <Pagination>
              <PageButton
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </PageButton>

              {[...Array(Math.min(pagination.pages, 5))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <PageButton
                    key={pageNum}
                    active={page === pageNum}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </PageButton>
                );
              })}

              <PageButton
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasMore}
              >
                Next
              </PageButton>
            </Pagination>
          )}
        </>
      )}
    </Container>
  );
};
