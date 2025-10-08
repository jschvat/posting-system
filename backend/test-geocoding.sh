#!/bin/bash

# Test script for address geocoding functionality
# Tests updating user profile with address and verifying GPS coordinates are saved

API_URL="http://localhost:3001/api"
USERNAME="geocodetest"
PASSWORD="TestPass123"

echo ""
echo "========================================"
echo "🧪 Address Geocoding Test Suite"
echo "========================================"
echo ""

# Login and get token
echo "📝 Logging in as $USERNAME..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully! User ID: $USER_ID"
echo ""

# Test 1: White House address
echo "🏠 Test 1: White House (Full Address)"
echo "   Address: 1600 Pennsylvania Avenue NW, Washington, DC 20500"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/users/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "address": "1600 Pennsylvania Avenue NW",
    "location_city": "Washington",
    "location_state": "DC",
    "location_zip": "20500",
    "location_country": "USA"
  }')

LAT=$(echo $UPDATE_RESPONSE | grep -o '"location_latitude":"[^"]*' | sed 's/"location_latitude":"//')
LON=$(echo $UPDATE_RESPONSE | grep -o '"location_longitude":"[^"]*' | sed 's/"location_longitude":"//')

echo "   📍 Geocoded Coordinates:"
echo "      Latitude: $LAT"
echo "      Longitude: $LON"

# Verify coordinates (DC is around 38.9°N, 77°W)
if [ ! -z "$LAT" ] && [ ! -z "$LON" ]; then
  LAT_INT=$(echo $LAT | cut -d'.' -f1)
  if [ "$LAT_INT" = "38" ] || [ "$LAT_INT" = "39" ]; then
    echo "   ✅ Latitude is in expected range for Washington DC!"
  else
    echo "   ❌ Latitude is OUT OF RANGE! Expected ~38-39, got $LAT"
  fi
else
  echo "   ❌ No coordinates returned!"
fi

echo ""
echo "⏱️  Waiting 2 seconds (Nominatim rate limit)..."
sleep 2
echo ""

# Test 2: City only (New York)
echo "🏙️  Test 2: New York City (City/State Only)"
echo "   City: New York, NY"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/users/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "location_city": "New York",
    "location_state": "NY",
    "location_country": "USA"
  }')

LAT=$(echo $UPDATE_RESPONSE | grep -o '"location_latitude":"[^"]*' | sed 's/"location_latitude":"//')
LON=$(echo $UPDATE_RESPONSE | grep -o '"location_longitude":"[^"]*' | sed 's/"location_longitude":"//')

echo "   📍 Geocoded Coordinates:"
echo "      Latitude: $LAT"
echo "      Longitude: $LON"

# Verify coordinates (NYC is around 40.7°N, 74°W)
if [ ! -z "$LAT" ] && [ ! -z "$LON" ]; then
  LAT_INT=$(echo $LAT | cut -d'.' -f1)
  if [ "$LAT_INT" = "40" ] || [ "$LAT_INT" = "41" ]; then
    echo "   ✅ Latitude is in expected range for New York City!"
  else
    echo "   ❌ Latitude is OUT OF RANGE! Expected ~40-41, got $LAT"
  fi
else
  echo "   ❌ No coordinates returned!"
fi

echo ""
echo "⏱️  Waiting 2 seconds (Nominatim rate limit)..."
sleep 2
echo ""

# Test 3: Empire State Building
echo "🏢 Test 3: Empire State Building (Specific Address)"
echo "   Address: 350 5th Ave, New York, NY 10118"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/users/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "address": "350 5th Ave",
    "location_city": "New York",
    "location_state": "NY",
    "location_zip": "10118",
    "location_country": "USA"
  }')

LAT=$(echo $UPDATE_RESPONSE | grep -o '"location_latitude":"[^"]*' | sed 's/"location_latitude":"//')
LON=$(echo $UPDATE_RESPONSE | grep -o '"location_longitude":"[^"]*' | sed 's/"location_longitude":"//')

echo "   📍 Geocoded Coordinates:"
echo "      Latitude: $LAT"
echo "      Longitude: $LON"

if [ ! -z "$LAT" ] && [ ! -z "$LON" ]; then
  echo "   ✅ Coordinates geocoded successfully!"
else
  echo "   ❌ No coordinates returned!"
fi

echo ""

# Verify in database
echo "📊 Verifying data in database..."
DB_QUERY="SELECT address, location_city, location_state, location_zip, location_latitude, location_longitude FROM users WHERE id = $USER_ID;"
PGPASSWORD=dev_password psql -h localhost -U dev_user -d posting_system -c "$DB_QUERY"

echo ""
echo "========================================"
echo "✅ Geocoding tests completed!"
echo "========================================"
echo ""
