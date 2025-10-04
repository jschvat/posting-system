#!/bin/bash

# Test Rating and Reputation API Endpoints

echo "=== Testing Rating & Reputation API ==="
echo ""

# Login as Alice (user 12)
echo "1. Login as Alice..."
ALICE_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' | jq -r '.data.token')

echo "Alice Token: ${ALICE_TOKEN:0:20}..."
echo ""

# Login as Bob (user 13)
echo "2. Login as Bob..."
BOB_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"password123"}' | jq -r '.data.token')

echo "Bob Token: ${BOB_TOKEN:0:20}..."
echo ""

# Create a follow relationship so Alice can rate Bob
echo "3. Alice follows Bob..."
curl -s -X POST http://localhost:3001/api/follows/13 \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" | jq '.success'
echo ""

# Test: Check if Alice can rate Bob
echo "4. Check if Alice can rate Bob..."
curl -s http://localhost:3001/api/ratings/check/13 \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq '.'
echo ""

# Test: Alice rates Bob
echo "5. Alice rates Bob (5 stars)..."
curl -s -X POST http://localhost:3001/api/ratings/13 \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating_type": "profile",
    "rating_value": 5,
    "context_type": "general",
    "review_text": "Great developer, very helpful!"
  }' | jq '.'
echo ""

# Test: Get Bob's reputation
echo "6. Get Bob's reputation..."
curl -s http://localhost:3001/api/reputation/13 | jq '.'
echo ""

# Test: Get ratings for Bob
echo "7. Get ratings for Bob..."
curl -s http://localhost:3001/api/ratings/user/13 | jq '.'
echo ""

# Test: Mark Bob's profile as helpful
echo "8. Alice marks Bob as helpful..."
curl -s -X POST http://localhost:3001/api/reputation/helpful/user/13 \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq '.'
echo ""

# Test: Get leaderboard
echo "9. Get reputation leaderboard..."
curl -s http://localhost:3001/api/reputation/leaderboard/top?limit=5 | jq '.'
echo ""

# Test: Get top users
echo "10. Get top users by reputation..."
curl -s http://localhost:3001/api/reputation/top-users?limit=5 | jq '.'
echo ""

echo "=== Testing Complete ==="
