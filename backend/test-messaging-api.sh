#!/bin/bash

# Test script for Messaging and Notifications API
# Run this after starting the backend server

API_URL="http://localhost:3001/api"
echo "=========================================="
echo "Testing Messaging & Notifications API"
echo "=========================================="
echo ""

# Step 1: Create test users and get tokens
echo "1. Creating test users..."

# Create User 1
USER1_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "msgtest1",
    "email": "msgtest1@test.com",
    "password": "password123",
    "first_name": "Message",
    "last_name": "Tester1"
  }')

TOKEN1=$(echo $USER1_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN1" ]; then
  echo "❌ Failed to create User 1 or user already exists. Trying to login..."
  LOGIN1=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "msgtest1@test.com", "password": "password123"}')
  TOKEN1=$(echo $LOGIN1 | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

echo "✅ User 1 Token: ${TOKEN1:0:20}..."

# Create User 2
USER2_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "msgtest2",
    "email": "msgtest2@test.com",
    "password": "password123",
    "first_name": "Message",
    "last_name": "Tester2"
  }')

TOKEN2=$(echo $USER2_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN2" ]; then
  echo "❌ Failed to create User 2 or user already exists. Trying to login..."
  LOGIN2=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "msgtest2@test.com", "password": "password123"}')
  TOKEN2=$(echo $LOGIN2 | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

echo "✅ User 2 Token: ${TOKEN2:0:20}..."

# Get User IDs
USER1_ID=$(curl -s -X GET "$API_URL/users/me" \
  -H "Authorization: Bearer $TOKEN1" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

USER2_ID=$(curl -s -X GET "$API_URL/users/me" \
  -H "Authorization: Bearer $TOKEN2" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo "✅ User 1 ID: $USER1_ID"
echo "✅ User 2 ID: $USER2_ID"
echo ""

# Step 2: Test Conversations API
echo "=========================================="
echo "2. Testing Conversations API"
echo "=========================================="
echo ""

# 2a. Create a direct conversation
echo "2a. Creating direct conversation..."
CONV_RESPONSE=$(curl -s -X POST "$API_URL/conversations" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"direct\",
    \"participant_ids\": [$USER2_ID]
  }")

CONV_ID=$(echo $CONV_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Created conversation ID: $CONV_ID"
echo "Response: $CONV_RESPONSE" | jq '.' 2>/dev/null || echo "Response: $CONV_RESPONSE"
echo ""

# 2b. Get conversations list
echo "2b. Getting conversations list..."
curl -s -X GET "$API_URL/conversations" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 2c. Get conversation details
echo "2c. Getting conversation details..."
curl -s -X GET "$API_URL/conversations/$CONV_ID" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# Step 3: Test Messages API
echo "=========================================="
echo "3. Testing Messages API"
echo "=========================================="
echo ""

# 3a. Send a message
echo "3a. Sending message from User 1..."
MSG_RESPONSE=$(curl -s -X POST "$API_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello! This is a test message from User 1.",
    "message_type": "text"
  }')

MSG_ID=$(echo $MSG_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Sent message ID: $MSG_ID"
echo "Response: $MSG_RESPONSE" | jq '.' 2>/dev/null || echo "Response: $MSG_RESPONSE"
echo ""

# 3b. Send another message
echo "3b. Sending reply from User 2..."
MSG2_RESPONSE=$(curl -s -X POST "$API_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hi there! Replying to your message.",
    "message_type": "text"
  }')

MSG2_ID=$(echo $MSG2_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Sent message ID: $MSG2_ID"
echo ""

# 3c. Get messages
echo "3c. Getting messages in conversation..."
curl -s -X GET "$API_URL/conversations/$CONV_ID/messages?limit=10" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 3d. Edit message
echo "3d. Editing message..."
curl -s -X PUT "$API_URL/messages/$MSG_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello! This is an EDITED test message from User 1."
  }' | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 3e. Mark message as read
echo "3e. Marking message as read..."
curl -s -X POST "$API_URL/messages/$MSG_ID/read" \
  -H "Authorization: Bearer $TOKEN2" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 3f. Get read receipts
echo "3f. Getting read receipts..."
curl -s -X GET "$API_URL/messages/$MSG_ID/read-receipts" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 3g. Mark all as read
echo "3g. Marking all messages as read..."
curl -s -X POST "$API_URL/conversations/$CONV_ID/read" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 3h. Get unread count
echo "3h. Getting unread count..."
curl -s -X GET "$API_URL/conversations/unread-count" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# Step 4: Test Notifications API
echo "=========================================="
echo "4. Testing Notifications API"
echo "=========================================="
echo ""

# 4a. Get notifications
echo "4a. Getting notifications..."
curl -s -X GET "$API_URL/notifications" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 4b. Get unread notification count
echo "4b. Getting unread notification count..."
curl -s -X GET "$API_URL/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 4c. Get notification preferences
echo "4c. Getting notification preferences..."
PREFS_RESPONSE=$(curl -s -X GET "$API_URL/notifications/preferences" \
  -H "Authorization: Bearer $TOKEN1")
echo "$PREFS_RESPONSE" | jq '.' 2>/dev/null || echo "Response: $PREFS_RESPONSE"
echo ""

# 4d. Update notification preference
echo "4d. Updating notification preference..."
curl -s -X PUT "$API_URL/notifications/preferences/follow" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "email_enabled": false,
    "push_enabled": true,
    "in_app_enabled": true
  }' | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# Step 5: Test Conversation Actions
echo "=========================================="
echo "5. Testing Conversation Actions"
echo "=========================================="
echo ""

# 5a. Mute conversation
echo "5a. Muting conversation..."
curl -s -X POST "$API_URL/conversations/$CONV_ID/mute" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"muted": true}' | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 5b. Archive conversation
echo "5b. Archiving conversation..."
curl -s -X POST "$API_URL/conversations/$CONV_ID/archive" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"archived": true}' | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 5c. Unarchive conversation
echo "5c. Unarchiving conversation..."
curl -s -X POST "$API_URL/conversations/$CONV_ID/archive" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"archived": false}' | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# 5d. Search messages
echo "5d. Searching messages..."
curl -s -X GET "$API_URL/conversations/$CONV_ID/messages/search?q=test" \
  -H "Authorization: Bearer $TOKEN1" | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# Step 6: Test Group Conversations
echo "=========================================="
echo "6. Testing Group Conversations"
echo "=========================================="
echo ""

# 6a. Create group conversation
echo "6a. Creating group conversation..."
GROUP_RESPONSE=$(curl -s -X POST "$API_URL/conversations" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"group\",
    \"title\": \"Test Group Chat\",
    \"participant_ids\": [$USER2_ID]
  }")

GROUP_ID=$(echo $GROUP_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Created group conversation ID: $GROUP_ID"
echo "Response: $GROUP_RESPONSE" | jq '.' 2>/dev/null || echo "Response: $GROUP_RESPONSE"
echo ""

# 6b. Update group title
echo "6b. Updating group title..."
curl -s -X PUT "$API_URL/conversations/$GROUP_ID" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Test Group"}' | jq '.' 2>/dev/null || echo "Failed to parse JSON"
echo ""

echo "=========================================="
echo "✅ All tests completed!"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Created direct conversation: ID $CONV_ID"
echo "- Sent messages: IDs $MSG_ID, $MSG2_ID"
echo "- Created group conversation: ID $GROUP_ID"
echo ""
