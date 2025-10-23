/**
 * WebSocket Integration Test
 * Tests real-time messaging, notifications, and presence tracking
 */

const { io: ioClient } = require('socket.io-client');
const axios = require('axios');

const API_URL = 'http://localhost:3002/api';
const WS_URL = 'http://localhost:3002';

// Test users
let user1Token, user2Token;
let user1Id, user2Id;
let socket1, socket2;
let conversationId;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const symbols = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    test: '🧪'
  };
  console.log(`${symbols[type]} ${message}`);
}

function recordTest(name, passed, error = null) {
  results.tests.push({ name, passed, error });
  if (passed) {
    results.passed++;
    log(`PASS: ${name}`, 'success');
  } else {
    results.failed++;
    log(`FAIL: ${name} - ${error}`, 'error');
  }
}

// Helper to wait for event
function waitForEvent(socket, eventName, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function setupTestUsers() {
  log('Setting up test users...', 'test');

  try {
    // Login User 1 (existing test user)
    const login1 = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'msgtest1@test.com',
      password: 'password123'
    });

    user1Token = login1.data.data.token;
    user1Id = login1.data.data.user.id;

    // Login User 2 (existing test user)
    const login2 = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'msgtest2@test.com',
      password: 'password123'
    });

    user2Token = login2.data.data.token;
    user2Id = login2.data.data.user.id;

    log(`User 1 ID: ${user1Id}`, 'info');
    log(`User 2 ID: ${user2Id}`, 'info');
    recordTest('User login', true);
  } catch (error) {
    recordTest('User login', false, error.message);
    throw error;
  }
}

async function testWebSocketAuthentication() {
  log('\n=== Testing WebSocket Authentication ===', 'test');

  try {
    // Test successful authentication
    socket1 = ioClient(WS_URL, {
      auth: { token: user1Token }
    });

    await waitForEvent(socket1, 'connect');
    recordTest('WebSocket authentication (User 1)', true);

    socket2 = ioClient(WS_URL, {
      auth: { token: user2Token }
    });

    await waitForEvent(socket2, 'connect');
    recordTest('WebSocket authentication (User 2)', true);

    // Test failed authentication
    const badSocket = ioClient(WS_URL, {
      auth: { token: 'invalid-token' }
    });

    try {
      await waitForEvent(badSocket, 'connect', 2000);
      recordTest('WebSocket authentication rejection', false, 'Should have rejected invalid token');
      badSocket.close();
    } catch (error) {
      recordTest('WebSocket authentication rejection', true);
      badSocket.close();
    }
  } catch (error) {
    recordTest('WebSocket authentication', false, error.message);
    throw error;
  }
}

async function testPresenceTracking() {
  log('\n=== Testing Presence Tracking ===', 'test');

  try {
    // Check online status
    const checkPromise = waitForEvent(socket1, 'presence:status');
    socket1.emit('presence:check', { userIds: [user2Id] });

    const presenceData = await checkPromise;
    const isOnline = presenceData.users[user2Id];

    recordTest('Presence check', isOnline === true);

    // Subscribe to presence updates
    const subscribePromise = waitForEvent(socket1, 'presence:subscribed');
    socket1.emit('presence:subscribe', { userIds: [user2Id] });

    const subscribeData = await subscribePromise;
    recordTest('Presence subscription', subscribeData.users[user2Id] === true);

  } catch (error) {
    recordTest('Presence tracking', false, error.message);
  }
}

async function testConversationManagement() {
  log('\n=== Testing Conversation Management ===', 'test');

  try {
    // Create conversation via REST API
    const convResponse = await axios.post(`${API_URL}/conversations`, {
      type: 'direct',
      participant_ids: [user2Id]
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    conversationId = convResponse.data.data.id;
    log(`Created conversation ID: ${conversationId}`, 'info');
    recordTest('Create conversation (REST)', true);

    // Join conversation via WebSocket
    const joinPromise1 = waitForEvent(socket1, 'conversation:joined');
    socket1.emit('conversation:join', { conversationId });
    await joinPromise1;
    recordTest('Join conversation (User 1)', true);

    const joinPromise2 = waitForEvent(socket2, 'conversation:joined');
    socket2.emit('conversation:join', { conversationId });
    await joinPromise2;
    recordTest('Join conversation (User 2)', true);

  } catch (error) {
    recordTest('Conversation management', false, error.message);
    throw error;
  }
}

async function testRealTimeMessaging() {
  log('\n=== Testing Real-time Messaging ===', 'test');

  try {
    // User 2 listens for new message
    const messagePromise = waitForEvent(socket2, 'message:new');

    // User 1 sends message
    socket1.emit('message:send', {
      conversationId,
      content: 'Hello from User 1! This is a WebSocket test.',
      messageType: 'text'
    });

    // Wait for User 2 to receive it
    const messageData = await messagePromise;

    const messageReceived = messageData.message.content.includes('WebSocket test');
    recordTest('Real-time message delivery', messageReceived);

    // Store message ID for later tests
    const messageId = messageData.message.id;

    // Test message editing
    const editPromise = waitForEvent(socket2, 'message:edited');
    socket1.emit('message:edit', {
      messageId,
      content: 'EDITED: Hello from User 1!'
    });

    const editData = await editPromise;
    recordTest('Real-time message editing', editData.message.content.includes('EDITED'));

    // Test read receipts
    const readPromise = waitForEvent(socket1, 'message:read');
    socket2.emit('message:read', { messageId });

    const readData = await readPromise;
    recordTest('Real-time read receipts', readData.messageId === messageId);

  } catch (error) {
    recordTest('Real-time messaging', false, error.message);
  }
}

async function testTypingIndicators() {
  log('\n=== Testing Typing Indicators ===', 'test');

  try {
    // User 2 listens for typing
    const typingStartPromise = waitForEvent(socket2, 'user:typing:start');

    // User 1 starts typing
    socket1.emit('user:typing:start', { conversationId });

    const typingData = await typingStartPromise;
    recordTest('Typing indicator (start)', typingData.userId === user1Id);

    // User 1 stops typing
    const typingStopPromise = waitForEvent(socket2, 'user:typing:stop');
    socket1.emit('user:typing:stop', { conversationId });

    const stopData = await typingStopPromise;
    recordTest('Typing indicator (stop)', stopData.userId === user1Id);

  } catch (error) {
    recordTest('Typing indicators', false, error.message);
  }
}

async function testNotifications() {
  log('\n=== Testing Real-time Notifications ===', 'test');

  try {
    // Get notification count
    const countPromise = waitForEvent(socket1, 'notification:count:response');
    socket1.emit('notification:count');

    const countData = await countPromise;
    recordTest('Get notification count', typeof countData.count === 'number');

    // Subscribe to notifications
    const subscribePromise = waitForEvent(socket1, 'notification:subscribed');
    socket1.emit('notification:subscribe');

    const subscribeData = await subscribePromise;
    recordTest('Subscribe to notifications', subscribeData.userId === user1Id);

  } catch (error) {
    recordTest('Notifications', false, error.message);
  }
}

async function testErrorHandling() {
  log('\n=== Testing Error Handling ===', 'test');

  try {
    // Try to join conversation user is not part of
    const errorPromise = waitForEvent(socket1, 'error');
    socket1.emit('conversation:join', { conversationId: 999999 });

    const errorData = await errorPromise;
    recordTest('Error handling (unauthorized access)',
      errorData.message.includes('not a participant'));

  } catch (error) {
    recordTest('Error handling', false, error.message);
  }
}

async function cleanup() {
  log('\n=== Cleaning up ===', 'test');

  if (socket1) socket1.close();
  if (socket2) socket2.close();

  log('WebSocket connections closed', 'info');
}

async function printResults() {
  log('\n' + '='.repeat(50), 'info');
  log('TEST RESULTS', 'info');
  log('='.repeat(50), 'info');

  results.tests.forEach((test, index) => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    const error = test.error ? ` (${test.error})` : '';
    log(`${index + 1}. ${status}: ${test.name}${error}`, 'info');
  });

  log('\n' + '='.repeat(50), 'info');
  log(`Total Tests: ${results.tests.length}`, 'info');
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
  log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`, 'info');
  log('='.repeat(50), 'info');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run all tests
async function runTests() {
  log('Starting WebSocket Integration Tests...', 'test');

  try {
    await setupTestUsers();
    await testWebSocketAuthentication();
    await testPresenceTracking();
    await testConversationManagement();
    await testRealTimeMessaging();
    await testTypingIndicators();
    await testNotifications();
    await testErrorHandling();
  } catch (error) {
    log(`Critical error: ${error.message}`, 'error');
  } finally {
    await cleanup();
    await printResults();
  }
}

// Run tests
runTests();
