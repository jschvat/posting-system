import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import marketplaceApi from '../../services/marketplaceApi';
import { ImageUpload, ImageFile } from '../../components/marketplace/ImageUpload';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
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

const Form = styled.form`
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const Section = styled.div`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #ecf0f1;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
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
  font-size: 15px;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3498db;
  }

  &:disabled {
    background: #f8f9fa;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 15px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-right: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: 15px;
  color: #2c3e50;
  cursor: pointer;
`;

const HelpText = styled.p`
  font-size: 13px;
  color: #7f8c8d;
  margin: 6px 0 0 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 14px 24px;
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
  }
`;

const LocationStatus = styled.div`
  background: #e8f5e9;
  border: 1px solid #4caf50;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LocationStatusIcon = styled.span`
  font-size: 20px;
`;

const LocationStatusText = styled.div`
  flex: 1;
`;

const LocationStatusTitle = styled.div`
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 4px;
`;

const LocationStatusSubtitle = styled.div`
  font-size: 13px;
  color: #558b2f;
`;

const LocationDetecting = styled.div`
  background: #fff3e0;
  border: 1px solid #ff9800;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DetectingText = styled.div`
  color: #e65100;
  font-weight: 500;
`;

const ChangeLocationButton = styled.button`
  background: transparent;
  color: #3498db;
  border: 1px solid #3498db;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #3498db;
    color: white;
  }
`;

const DetectLocationButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #ffe6e6;
  color: #c0392b;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  background: #d4edda;
  color: #155724;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
`;

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

export const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState({
    latitude: 0,
    longitude: 0,
    city: '',
    state: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    listing_type: 'sale',
    price: '',
    original_price: '',
    quantity: '1',
    condition: 'used',
    allow_offers: true,
    min_offer_price: '',
    location_city: '',
    location_state: '',
    location_zip: '',
    shipping_available: false,
    shipping_cost: '',
    local_pickup_only: true,
  });

  useEffect(() => {
    loadCategories();
    detectUserLocation();
  }, []);

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

  const detectUserLocation = async () => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser');
      return;
    }

    setLocationDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Use reverse geocoding to get city and state from OpenStreetMap Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            {
              headers: {
                'User-Agent': 'MarketplaceApp/1.0'
              }
            }
          );
          const data = await response.json();

          const city = data.address.city ||
                       data.address.town ||
                       data.address.village ||
                       data.address.county || '';
          const state = data.address.state || '';
          const zip = data.address.postcode || '';

          setDetectedLocation({
            latitude,
            longitude,
            city,
            state
          });

          // Auto-fill the form with detected location
          setFormData(prev => ({
            ...prev,
            location_city: city,
            location_state: state,
            location_zip: zip
          }));

          setLocationDetected(true);
        } catch (error) {
          console.error('Error getting location name:', error);
          // Still save coordinates even if we can't get the name
          setDetectedLocation({
            latitude,
            longitude,
            city: '',
            state: ''
          });
          setLocationDetected(true);
        }

        setLocationDetecting(false);
      },
      (error) => {
        console.log('Location detection declined or failed:', error.message);
        setLocationDetecting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (!formData.title || !formData.description) {
        throw new Error('Title and description are required');
      }

      if (!formData.location_city || !formData.location_state) {
        throw new Error('Location is required');
      }

      if (formData.listing_type === 'sale' && !formData.price) {
        throw new Error('Price is required for sale listings');
      }

      // Use detected location coordinates, or geocode if user entered manually
      let latitude = detectedLocation.latitude;
      let longitude = detectedLocation.longitude;

      // If user manually entered location and we don't have coordinates, geocode it
      if (useManualLocation && (!latitude || !longitude)) {
        try {
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(formData.location_city)}&state=${encodeURIComponent(formData.location_state)}&country=USA&format=json&limit=1`,
            {
              headers: {
                'User-Agent': 'MarketplaceApp/1.0'
              }
            }
          );
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.length > 0) {
            latitude = parseFloat(geocodeData[0].lat);
            longitude = parseFloat(geocodeData[0].lon);
          }
        } catch (geocodeError) {
          console.error('Error geocoding location:', geocodeError);
          // Fall back to default coordinates if geocoding fails
          latitude = 37.7749; // Default to SF
          longitude = -122.4194;
        }
      }

      // Validate we have coordinates
      if (!latitude || !longitude) {
        throw new Error('Unable to determine location coordinates. Please allow location access or enter a valid city and state.');
      }

      const listingData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id ? parseInt(formData.category_id) : undefined,
        listing_type: formData.listing_type as 'sale' | 'raffle' | 'auction',
        price: formData.price ? parseFloat(formData.price) : undefined,
        original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
        quantity: parseInt(formData.quantity),
        condition: formData.condition,
        allow_offers: formData.allow_offers,
        min_offer_price: formData.min_offer_price ? parseFloat(formData.min_offer_price) : undefined,
        location_latitude: latitude,
        location_longitude: longitude,
        location_city: formData.location_city,
        location_state: formData.location_state,
        location_zip: formData.location_zip || undefined,
        location_country: 'USA',
        shipping_available: formData.shipping_available,
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : undefined,
        local_pickup_only: formData.local_pickup_only,
        status: 'active'
      };

      const response = await marketplaceApi.createListing(listingData);

      if (response.success) {
        const listingId = response.data.id;

        // Upload images if any
        if (images.length > 0) {
          setSuccess('Listing created! Uploading images...');

          try {
            // Update upload progress for each image
            const imagesToUpload = images.map(img => img.file);

            // Track overall progress
            let uploadedCount = 0;
            const totalImages = imagesToUpload.length;

            const uploadResponse = await marketplaceApi.uploadImages(
              listingId,
              imagesToUpload,
              (progress) => {
                // Update progress for current image
                const overallProgress = ((uploadedCount * 100) + progress) / totalImages;
                console.log(`Upload progress: ${Math.round(overallProgress)}%`);
              }
            );

            if (uploadResponse.success) {
              setSuccess(`Listing created with ${uploadResponse.data.length} image(s)!`);
            }
          } catch (uploadError: any) {
            console.error('Error uploading images:', uploadError);
            setError('Listing created but some images failed to upload');
          }
        } else {
          setSuccess('Listing created successfully!');
        }

        setTimeout(() => {
          navigate(`/marketplace/${listingId}`);
        }, 1500);
      } else {
        throw new Error(response.error || 'Failed to create listing');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Create New Listing</Title>
        <Subtitle>List an item for sale, auction, or raffle</Subtitle>
      </Header>

      <Form onSubmit={handleSubmit}>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <Section>
          <SectionTitle>Basic Information</SectionTitle>

          <FormGroup>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="iPhone 14 Pro Max - Like New"
              maxLength={100}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description *</Label>
            <TextArea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your item in detail..."
              maxLength={2000}
              required
            />
            <HelpText>{formData.description.length}/2000 characters</HelpText>
          </FormGroup>

          <Row>
            <FormGroup>
              <Label htmlFor="category_id">Category</Label>
              <Select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="condition">Condition *</Label>
              <Select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                required
              >
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </Select>
            </FormGroup>
          </Row>
        </Section>

        <Section>
          <SectionTitle>Photos</SectionTitle>
          <ImageUpload
            images={images}
            onImagesChange={setImages}
            maxImages={10}
            maxFileSize={10}
          />
        </Section>

        <Section>
          <SectionTitle>Pricing</SectionTitle>

          <Row>
            <FormGroup>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleChange}
                placeholder="99.99"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="original_price">Original Price (Optional)</Label>
              <Input
                id="original_price"
                name="original_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.original_price}
                onChange={handleChange}
                placeholder="149.99"
              />
              <HelpText>Show how much you paid originally</HelpText>
            </FormGroup>
          </Row>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                name="allow_offers"
                checked={formData.allow_offers}
                onChange={handleChange}
              />
              Allow buyers to make offers
            </CheckboxLabel>
          </FormGroup>

          {formData.allow_offers && (
            <FormGroup>
              <Label htmlFor="min_offer_price">Minimum Offer Price</Label>
              <Input
                id="min_offer_price"
                name="min_offer_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.min_offer_price}
                onChange={handleChange}
                placeholder="80.00"
              />
              <HelpText>Reject offers below this amount automatically</HelpText>
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="quantity">Quantity Available</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
            />
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>Location</SectionTitle>

          {locationDetecting && (
            <LocationDetecting>
              <LocationStatusIcon>📍</LocationStatusIcon>
              <DetectingText>Detecting your location...</DetectingText>
            </LocationDetecting>
          )}

          {locationDetected && !useManualLocation && (
            <LocationStatus>
              <LocationStatusIcon>✅</LocationStatusIcon>
              <LocationStatusText>
                <LocationStatusTitle>Location detected</LocationStatusTitle>
                <LocationStatusSubtitle>
                  {detectedLocation.city}, {detectedLocation.state}
                </LocationStatusSubtitle>
              </LocationStatusText>
              <ChangeLocationButton
                type="button"
                onClick={() => setUseManualLocation(true)}
              >
                Change Location
              </ChangeLocationButton>
            </LocationStatus>
          )}

          {(!locationDetected || useManualLocation) && !locationDetecting && (
            <div style={{ marginBottom: '16px' }}>
              <DetectLocationButton
                type="button"
                onClick={detectUserLocation}
                disabled={locationDetecting}
              >
                <span>📍</span>
                <span>Detect My Location</span>
              </DetectLocationButton>
            </div>
          )}

          <Row>
            <FormGroup>
              <Label htmlFor="location_city">City *</Label>
              <Input
                id="location_city"
                name="location_city"
                type="text"
                value={formData.location_city}
                onChange={(e) => {
                  handleChange(e);
                  if (!useManualLocation) setUseManualLocation(true);
                }}
                placeholder="San Francisco"
                required
                disabled={locationDetected && !useManualLocation}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="location_state">State *</Label>
              <Input
                id="location_state"
                name="location_state"
                type="text"
                value={formData.location_state}
                onChange={(e) => {
                  handleChange(e);
                  if (!useManualLocation) setUseManualLocation(true);
                }}
                placeholder="CA"
                maxLength={2}
                required
                disabled={locationDetected && !useManualLocation}
              />
            </FormGroup>
          </Row>

          <FormGroup>
            <Label htmlFor="location_zip">ZIP Code (Optional)</Label>
            <Input
              id="location_zip"
              name="location_zip"
              type="text"
              value={formData.location_zip}
              onChange={handleChange}
              placeholder="94102"
              maxLength={10}
            />
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>Shipping</SectionTitle>

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                name="shipping_available"
                checked={formData.shipping_available}
                onChange={handleChange}
              />
              Offer shipping
            </CheckboxLabel>
          </FormGroup>

          {formData.shipping_available && (
            <FormGroup>
              <Label htmlFor="shipping_cost">Shipping Cost</Label>
              <Input
                id="shipping_cost"
                name="shipping_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.shipping_cost}
                onChange={handleChange}
                placeholder="15.00"
              />
            </FormGroup>
          )}

          <FormGroup>
            <CheckboxLabel>
              <Checkbox
                name="local_pickup_only"
                checked={formData.local_pickup_only}
                onChange={handleChange}
              />
              Local pickup only
            </CheckboxLabel>
          </FormGroup>
        </Section>

        <ButtonGroup>
          <Button type="button" variant="secondary" onClick={() => navigate('/marketplace')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Listing'}
          </Button>
        </ButtonGroup>
      </Form>
    </Container>
  );
};
