# Marketplace Testing Guide

## Overview
Complete testing guide for the marketplace feature with multiple buying options (Sale, Auction, Raffle).

## Frontend Tests Created

### BuyingInterface Component Tests
**Location**: `frontend/src/components/marketplace/__tests__/BuyingInterface.test.tsx`

#### Test Coverage:

**1. Sale Listing Tests**
- ✅ Renders sale interface correctly (price, buttons)
- ✅ Shows "Make an Offer" button when enabled
- ✅ Displays original price with strikethrough for discounts
- ✅ Buy Now and Contact Seller buttons present

**2. Auction Listing Tests**
- ✅ Renders auction interface with current bid
- ✅ Shows bid count and time remaining
- ✅ Displays bid history with usernames
- ✅ Validates minimum bid amount (current bid + increment)
- ✅ Places bid successfully via API
- ✅ Shows success message and refreshes data
- ✅ Input validation for invalid amounts

**3. Raffle Listing Tests**
- ✅ Renders raffle interface with ticket price
- ✅ Shows progress bar (50% sold = 50% filled)
- ✅ Displays tickets sold / total tickets
- ✅ Calculates total cost correctly (3 tickets × $5 = $15)
- ✅ Validates max tickets per user limit
- ✅ Validates remaining tickets available
- ✅ Buys tickets successfully via API
- ✅ Shows success message with ticket count
- ✅ Disables button when sold out

## Manual Testing Checklist

### 1. Sale Listings (8 listings)
- [ ] Browse to marketplace at `http://localhost:3000/marketplace`
- [ ] Click on MacBook Air (ID: 25) or iPhone (ID: 24)
- [ ] Verify image slideshow with navigation arrows
- [ ] Verify thumbnail strip below main image
- [ ] Check "Buy Now" button displays
- [ ] Verify price shows correctly
- [ ] Test "Contact Seller" button
- [ ] If offers enabled, check "Make an Offer" button

### 2. Auction Listings (2 listings)

#### PlayStation 5 Auction (ID: 27)
- [ ] Navigate to `/marketplace/27`
- [ ] Verify "Auction" badge displays
- [ ] Check current bid shows: $280.00
- [ ] Verify bid count shows: 3 bids
- [ ] Check time remaining countdown
- [ ] Verify minimum bid shows: $290.00 ($280 + $10 increment)
- [ ] View bid history (3 bids from different users)
- [ ] Try bidding less than minimum (should show error)
- [ ] Try bidding $290 or more
- [ ] Verify bid success message
- [ ] Check page refreshes with new bid data

#### Fender Guitar Auction (ID: 31)
- [ ] Navigate to `/marketplace/31`
- [ ] Verify starting bid: $400.00
- [ ] Check bid increment: $25.00
- [ ] Test bidding functionality
- [ ] Verify auto-extend works if bid in last 5 minutes

### 3. Raffle Listings (2 listings)

#### Sony Headphones Raffle (ID: 35)
- [ ] Navigate to `/marketplace/35`
- [ ] Verify "Raffle" badge displays
- [ ] Check ticket price: $5.00 per ticket
- [ ] Verify progress bar shows 5/100 tickets sold (5%)
- [ ] Check max tickets per user: 10
- [ ] View tickets sold: 5 / 100
- [ ] Try buying 1 ticket (should calculate $5.00 total)
- [ ] Try buying 3 tickets (should calculate $15.00 total)
- [ ] Try buying 11 tickets (should show "Maximum 10 tickets per user" error)
- [ ] Successfully buy tickets
- [ ] Verify success message shows ticket count
- [ ] Check "Your Tickets" count updates

#### Canon Camera Raffle (ID: 30)
- [ ] Navigate to `/marketplace/30`
- [ ] Verify ticket price: $10.00 per ticket
- [ ] Check total tickets: 200
- [ ] Verify max per user: 20 tickets
- [ ] Test ticket purchase flow
- [ ] Verify remaining tickets calculation

### 4. Image Slideshow Testing
- [ ] Click any listing with multiple images
- [ ] Use left arrow to go to previous image
- [ ] Use right arrow to go to next image
- [ ] Verify circular navigation (last → first, first → last)
- [ ] Check image counter updates (1/3, 2/3, 3/3)
- [ ] Click thumbnails to jump to specific images
- [ ] Verify active thumbnail highlighted with blue border
- [ ] Check images display properly (not cropped)

### 5. Geolocation Filtering
- [ ] Go to `/marketplace`
- [ ] Click "Filters" button
- [ ] Enable "Near Me" checkbox (browser will ask for location permission)
- [ ] Allow location access
- [ ] Adjust radius slider (5-100 miles)
- [ ] Verify listings update to show only nearby items
- [ ] Check distance shows for each listing
- [ ] Verify sort by distance works

### 6. Multi-User Testing
- [ ] Verify listings belong to different users:
  - admin_alice (iPhone, Office Desk)
  - mod_bob (MacBook, Sony Headphones)
  - charlie_coder (Gaming PC)
  - diana_design (PS5)
  - evan_photo (Samsung TV)
  - frank_foodie (Nintendo Switch)
  - grace_chef (Canon Camera)
  - henry_gamer (Fender Guitar)
  - iris_rpg (Herman Miller Chair)
  - jack_social (Vinyl Records)

## API Endpoints Testing

### Auction Endpoints

**Place Bid**
```bash
curl -X POST http://localhost:3001/api/marketplace/auctions/27/bid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"bid_amount": 290, "max_bid_amount": 300}'
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "id": 4,
    "auction_id": 1,
    "user_id": 30,
    "bid_amount": "290.00",
    "is_winning": true
  },
  "message": "Bid placed successfully"
}
```

**Get Auction Bids**
```bash
curl http://localhost:3001/api/marketplace/auctions/27/bids
```

### Raffle Endpoints

**Buy Tickets**
```bash
curl -X POST http://localhost:3001/api/marketplace/raffles/35/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"ticket_count": 3}'
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "tickets": [...],
    "total_cost": 15.00,
    "ticket_numbers": [6, 7, 8]
  },
  "message": "Successfully purchased 3 tickets"
}
```

**Get Raffle Tickets**
```bash
curl http://localhost:3001/api/marketplace/raffles/35/tickets
```

## Database Validation

### Check Auction Data
```sql
SELECT
  l.id, l.title, l.listing_type,
  a.current_bid, a.total_bids, a.end_time, a.status
FROM marketplace_listings l
JOIN marketplace_auctions a ON l.id = a.listing_id
WHERE l.listing_type = 'auction';
```

### Check Raffle Data
```sql
SELECT
  l.id, l.title, l.listing_type,
  r.ticket_price, r.total_tickets, r.tickets_sold, r.status
FROM marketplace_listings l
JOIN marketplace_raffles r ON l.id = r.listing_id
WHERE l.listing_type = 'raffle';
```

### Check Bid History
```sql
SELECT
  b.id, b.bid_amount, b.is_winning, b.created_at,
  u.username
FROM marketplace_auction_bids b
JOIN users u ON b.user_id = u.id
WHERE b.auction_id = (SELECT id FROM marketplace_auctions WHERE listing_id = 27)
ORDER BY b.created_at DESC;
```

### Check Raffle Tickets
```sql
SELECT
  t.ticket_number, t.purchase_amount, t.created_at,
  u.username
FROM marketplace_raffle_tickets t
JOIN users u ON t.user_id = u.id
WHERE t.raffle_id = (SELECT id FROM marketplace_raffles WHERE listing_id = 35)
ORDER BY t.ticket_number;
```

## Error Scenarios to Test

### Auction Errors
- [ ] Bid less than minimum (should error)
- [ ] Bid on own auction (should error)
- [ ] Bid on ended auction (should error)
- [ ] Bid on cancelled auction (should error)
- [ ] Bid without authentication (should require login)

### Raffle Errors
- [ ] Buy more tickets than remaining (should error)
- [ ] Exceed max tickets per user (should error)
- [ ] Buy tickets for own raffle (should error)
- [ ] Buy tickets for ended raffle (should error)
- [ ] Buy 0 or negative tickets (should error)
- [ ] Buy tickets without authentication (should require login)

## Performance Testing
- [ ] Load marketplace with 12 listings (should load quickly)
- [ ] Image slideshow navigation (should be smooth)
- [ ] Bid placement (should respond within 1 second)
- [ ] Ticket purchase (should respond within 1 second)
- [ ] Filter by location (should update results quickly)
- [ ] Thumbnail clicks (should change image instantly)

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## Summary

**Total Features Implemented:**
- ✅ 3 buying types (Sale, Auction, Raffle)
- ✅ Real product images (32 images from Pexels)
- ✅ Image slideshow with navigation
- ✅ Thumbnail strip
- ✅ Geolocation filtering
- ✅ Multiple images per listing (2-3 each)
- ✅ Full URL support for images
- ✅ Auction bidding system
- ✅ Raffle ticket system
- ✅ 12 listings across 10 users
- ✅ Comprehensive validation
- ✅ Real-time updates
- ✅ Error handling

**Test Files Created:**
1. `BuyingInterface.test.tsx` - 13 test cases covering all buying types

**Backend Routes:**
- `POST /api/marketplace/auctions/:listingId/bid`
- `GET /api/marketplace/auctions/:listingId/bids`
- `POST /api/marketplace/raffles/:listingId/tickets`
- `GET /api/marketplace/raffles/:listingId/tickets`

**Database Tables:**
- `marketplace_auctions` - Auction configuration
- `marketplace_auction_bids` - Bid tracking
- `marketplace_raffles` - Raffle configuration
- `marketplace_raffle_tickets` - Ticket purchases
