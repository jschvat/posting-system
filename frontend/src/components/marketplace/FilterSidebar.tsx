import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Sidebar = styled.div`
  width: 280px;
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 20px;

  @media (max-width: 968px) {
    display: none;
  }
`;

const SidebarTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ClearButton = styled.button`
  font-size: 13px;
  color: #3498db;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;

const FilterSection = styled.div`
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #ecf0f1;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const FilterLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
`;

const PriceInputs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PriceInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d5dbdb;
  border-radius: 6px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const PriceSeparator = styled.span`
  display: none;
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #2c3e50;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: #3498db;
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
  cursor: pointer;
  width: 16px;
  height: 16px;
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #2c3e50;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: #3498db;
  }
`;

const Radio = styled.input`
  margin-right: 8px;
  cursor: pointer;
`;

const DistanceSlider = styled.input`
  width: 100%;
  margin-top: 8px;
`;

const DistanceValue = styled.div`
  font-size: 13px;
  color: #7f8c8d;
  margin-top: 8px;
  text-align: center;
`;

const LocationButton = styled.button`
  width: 100%;
  padding: 10px;
  background: #e7f3ff;
  color: #3498db;
  border: 1px solid #3498db;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.2s;

  &:hover {
    background: #3498db;
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LocationStatus = styled.div`
  font-size: 12px;
  color: #27ae60;
  margin-top: 8px;
  text-align: center;
`;

const ActiveFiltersCount = styled.span`
  background: #3498db;
  color: white;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
`;

export interface FilterState {
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  listingType?: string[];
  distance?: number;
  latitude?: number;
  longitude?: number;
  sortBy?: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFiltersChange }) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    const updated = {
      ...localFilters,
      [type === 'min' ? 'minPrice' : 'maxPrice']: numValue
    };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleConditionChange = (condition: string, checked: boolean) => {
    const current = localFilters.condition || [];
    const updatedConditions = checked
      ? [...current, condition]
      : current.filter(c => c !== condition);
    const updated = {
      ...localFilters,
      condition: updatedConditions.length > 0 ? updatedConditions : undefined
    };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleListingTypeChange = (type: string, checked: boolean) => {
    const current = localFilters.listingType || [];
    const updatedTypes = checked
      ? [...current, type]
      : current.filter(t => t !== type);
    const updated = {
      ...localFilters,
      listingType: updatedTypes.length > 0 ? updatedTypes : undefined
    };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleDistanceChange = (value: string) => {
    const updated = {
      ...localFilters,
      distance: parseInt(value)
    };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleSortChange = (sortBy: string) => {
    const updated = {
      ...localFilters,
      sortBy
    };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalFilters(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          distance: prev.distance || 25
        }));
        setLocationDetected(true);
        setDetectingLocation(false);
      },
      (error) => {
        console.error('Error detecting location:', error);
        setDetectingLocation(false);
        alert('Unable to detect your location. Please enable location services.');
      }
    );
  };

  const handleClear = () => {
    const clearedFilters: FilterState = {};
    setLocalFilters(clearedFilters);
    setLocationDetected(false);
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.minPrice) count++;
    if (localFilters.maxPrice) count++;
    if (localFilters.condition && localFilters.condition.length > 0) count++;
    if (localFilters.listingType && localFilters.listingType.length > 0) count++;
    if (localFilters.distance && localFilters.latitude) count++;
    return count;
  };

  const activeCount = getActiveFiltersCount();

  return (
    <Sidebar>
      <SidebarTitle>
        <span>
          Filters {activeCount > 0 && <ActiveFiltersCount>{activeCount}</ActiveFiltersCount>}
        </span>
        {activeCount > 0 && <ClearButton onClick={handleClear}>Clear All</ClearButton>}
      </SidebarTitle>

      {/* Price Range */}
      <FilterSection>
        <FilterLabel>Price Range</FilterLabel>
        <PriceInputs>
          <PriceInput
            type="number"
            placeholder="Min"
            value={localFilters.minPrice || ''}
            onChange={(e) => handlePriceChange('min', e.target.value)}
            min="0"
            step="1"
          />
          <PriceSeparator>-</PriceSeparator>
          <PriceInput
            type="number"
            placeholder="Max"
            value={localFilters.maxPrice || ''}
            onChange={(e) => handlePriceChange('max', e.target.value)}
            min="0"
            step="1"
          />
        </PriceInputs>
      </FilterSection>

      {/* Condition */}
      <FilterSection>
        <FilterLabel>Condition</FilterLabel>
        <CheckboxGroup>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={localFilters.condition?.includes('new') || false}
              onChange={(e) => handleConditionChange('new', e.target.checked)}
            />
            New
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={localFilters.condition?.includes('like_new') || false}
              onChange={(e) => handleConditionChange('like_new', e.target.checked)}
            />
            Like New
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={localFilters.condition?.includes('good') || false}
              onChange={(e) => handleConditionChange('good', e.target.checked)}
            />
            Good
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={localFilters.condition?.includes('fair') || false}
              onChange={(e) => handleConditionChange('fair', e.target.checked)}
            />
            Fair
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={localFilters.condition?.includes('poor') || false}
              onChange={(e) => handleConditionChange('poor', e.target.checked)}
            />
            Poor
          </CheckboxLabel>
        </CheckboxGroup>
      </FilterSection>

      {/* Listing Type */}
      <FilterSection>
        <FilterLabel>Listing Type</FilterLabel>
        <CheckboxGroup>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={localFilters.listingType?.includes('sale') || false}
              onChange={(e) => handleListingTypeChange('sale', e.target.checked)}
            />
            For Sale
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={localFilters.listingType?.includes('auction') || false}
              onChange={(e) => handleListingTypeChange('auction', e.target.checked)}
            />
            Auction
          </CheckboxLabel>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={localFilters.listingType?.includes('raffle') || false}
              onChange={(e) => handleListingTypeChange('raffle', e.target.checked)}
            />
            Raffle
          </CheckboxLabel>
        </CheckboxGroup>
      </FilterSection>

      {/* Distance */}
      <FilterSection>
        <FilterLabel>Distance</FilterLabel>
        {locationDetected ? (
          <>
            <DistanceSlider
              type="range"
              min="1"
              max="100"
              value={localFilters.distance || 25}
              onChange={(e) => handleDistanceChange(e.target.value)}
            />
            <DistanceValue>
              Within {localFilters.distance || 25} miles
            </DistanceValue>
            <LocationStatus>Location detected</LocationStatus>
          </>
        ) : (
          <LocationButton onClick={detectLocation} disabled={detectingLocation}>
            {detectingLocation ? 'Detecting...' : 'Use My Location'}
          </LocationButton>
        )}
      </FilterSection>

      {/* Sort By */}
      <FilterSection>
        <FilterLabel>Sort By</FilterLabel>
        <RadioGroup>
          <RadioLabel>
            <Radio
              type="radio"
              name="sortBy"
              value="relevant"
              checked={!localFilters.sortBy || localFilters.sortBy === 'relevant'}
              onChange={(e) => handleSortChange(e.target.value)}
            />
            Most Relevant
          </RadioLabel>
          <RadioLabel>
            <Radio
              type="radio"
              name="sortBy"
              value="price_low"
              checked={localFilters.sortBy === 'price_low'}
              onChange={(e) => handleSortChange(e.target.value)}
            />
            Price: Low to High
          </RadioLabel>
          <RadioLabel>
            <Radio
              type="radio"
              name="sortBy"
              value="price_high"
              checked={localFilters.sortBy === 'price_high'}
              onChange={(e) => handleSortChange(e.target.value)}
            />
            Price: High to Low
          </RadioLabel>
          <RadioLabel>
            <Radio
              type="radio"
              name="sortBy"
              value="date_new"
              checked={localFilters.sortBy === 'date_new'}
              onChange={(e) => handleSortChange(e.target.value)}
            />
            Newest First
          </RadioLabel>
          <RadioLabel>
            <Radio
              type="radio"
              name="sortBy"
              value="distance"
              checked={localFilters.sortBy === 'distance'}
              onChange={(e) => handleSortChange(e.target.value)}
              disabled={!locationDetected}
            />
            Distance {!locationDetected && '(enable location)'}
          </RadioLabel>
        </RadioGroup>
      </FilterSection>
    </Sidebar>
  );
};

export default FilterSidebar;
