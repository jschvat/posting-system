/**
 * Test script for address geocoding functionality
 * Tests updating user profile with address and verifying GPS coordinates are saved
 */

// Use native fetch (Node 18+) or require node-fetch
const fetch = global.fetch || require('node-fetch');

// API configuration
const API_URL = 'http://localhost:3001/api';
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'admin123';

// Test addresses
const TEST_ADDRESSES = [
  {
    name: 'White House',
    address: '1600 Pennsylvania Avenue NW',
    city: 'Washington',
    state: 'DC',
    zip: '20500',
    country: 'USA',
    expectedLat: { min: 38.8, max: 39.0 },
    expectedLon: { min: -77.1, max: -76.9 }
  },
  {
    name: 'Empire State Building',
    address: '350 5th Ave',
    city: 'New York',
    state: 'NY',
    zip: '10118',
    country: 'USA',
    expectedLat: { min: 40.7, max: 40.8 },
    expectedLon: { min: -74.0, max: -73.9 }
  },
  {
    name: 'City Only (Los Angeles)',
    address: null,
    city: 'Los Angeles',
    state: 'CA',
    zip: null,
    country: 'USA',
    expectedLat: { min: 33.9, max: 34.2 },
    expectedLon: { min: -118.5, max: -118.0 }
  }
];

let authToken = null;
let userId = null;

/**
 * Login and get auth token
 */
async function login() {
  console.log(`\n📝 Logging in as ${TEST_USERNAME}...`);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  authToken = data.token;
  userId = data.user.id;

  console.log(`✅ Logged in successfully! User ID: ${userId}`);
  return { token: authToken, userId };
}

/**
 * Update user profile with address
 */
async function updateAddress(testAddress) {
  console.log(`\n🏠 Testing: ${testAddress.name}`);
  console.log(`   Address: ${testAddress.address || 'N/A'}`);
  console.log(`   City: ${testAddress.city}, ${testAddress.state} ${testAddress.zip || ''}`);

  const updateData = {};
  if (testAddress.address) updateData.address = testAddress.address;
  if (testAddress.city) updateData.location_city = testAddress.city;
  if (testAddress.state) updateData.location_state = testAddress.state;
  if (testAddress.zip) updateData.location_zip = testAddress.zip;
  if (testAddress.country) updateData.location_country = testAddress.country;

  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Profile update failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Verify coordinates are within expected range
 */
function verifyCoordinates(user, expected) {
  const lat = parseFloat(user.location_latitude);
  const lon = parseFloat(user.location_longitude);

  console.log(`\n   📍 Geocoded Coordinates:`);
  console.log(`      Latitude: ${lat}`);
  console.log(`      Longitude: ${lon}`);

  const latInRange = lat >= expected.expectedLat.min && lat <= expected.expectedLat.max;
  const lonInRange = lon >= expected.expectedLon.min && lon <= expected.expectedLon.max;

  if (latInRange && lonInRange) {
    console.log(`   ✅ Coordinates are within expected range!`);
    return true;
  } else {
    console.log(`   ❌ Coordinates are OUT OF RANGE!`);
    console.log(`      Expected lat: ${expected.expectedLat.min} to ${expected.expectedLat.max}`);
    console.log(`      Expected lon: ${expected.expectedLon.min} to ${expected.expectedLon.max}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('\n========================================');
  console.log('🧪 Address Geocoding Test Suite');
  console.log('========================================');

  try {
    // Login first
    await login();

    let passedTests = 0;
    let failedTests = 0;

    // Test each address
    for (const testAddress of TEST_ADDRESSES) {
      try {
        const updatedUser = await updateAddress(testAddress);

        // Verify coordinates exist
        if (!updatedUser.location_latitude || !updatedUser.location_longitude) {
          console.log(`   ❌ FAILED: No coordinates saved!`);
          failedTests++;
          continue;
        }

        // Verify coordinates are in expected range
        const isValid = verifyCoordinates(updatedUser, testAddress);
        if (isValid) {
          passedTests++;
        } else {
          failedTests++;
        }

        // Wait 1 second between requests (Nominatim rate limit)
        if (TEST_ADDRESSES.indexOf(testAddress) < TEST_ADDRESSES.length - 1) {
          console.log('   ⏱️  Waiting 1 second (rate limit)...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        failedTests++;
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 Test Results Summary');
    console.log('========================================');
    console.log(`✅ Passed: ${passedTests}/${TEST_ADDRESSES.length}`);
    console.log(`❌ Failed: ${failedTests}/${TEST_ADDRESSES.length}`);
    console.log('========================================\n');

    process.exit(failedTests > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_URL}/users`, { method: 'GET' });
    return response.status === 200 || response.status === 401;
  } catch (error) {
    return false;
  }
}

// Run tests
(async () => {
  console.log('🔍 Checking if backend server is running...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('\n❌ Backend server is not running!');
    console.error('Please start the server first: npm start\n');
    process.exit(1);
  }

  console.log('✅ Server is running!\n');
  await runTests();
})();
