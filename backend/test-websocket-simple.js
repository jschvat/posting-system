/**
 * Simple WebSocket Manual Test
 * Demonstrates WebSocket functionality without complex test setup
 */

const { io: ioClient } = require('socket.io-client');

const WS_URL = 'http://localhost:3002';

// Replace these with valid tokens from your login
const TOKEN1 = process.env.TOKEN1 || 'your-token-1-here';
const TOKEN2 = process.env.TOKEN2 || 'your-token-2-here';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWebSocket() {
  console.log('🧪 Starting Simple WebSocket Test...\n');

  // Connect User 1
  console.log('Connecting User 1...');
  const socket1 = ioClient(WS_URL, {
    auth: { token: TOKEN1 }
  });

  socket1.on('connect', () => {
    console.log('✅ User 1 connected');
  });

  socket1.on('connect_error', (error) => {
    console.log('❌ User 1 connection failed:', error.message);
  });

  socket1.on('error', (error) => {
    console.log('❌ User 1 error:', error);
  });

  socket1.on('user:online', (data) => {
    console.log('📡 User came online:', data);
  });

  socket1.on('user:offline', (data) => {
    console.log('📡 User went offline:', data);
  });

  socket1.on('message:new', (data) => {
    console.log('📨 New message received:', {
      from: data.message.sender?.username,
      content: data.message.content
    });
  });

  socket1.on('user:typing:start', (data) => {
    console.log('⌨️  User typing:', data.username);
  });

  socket1.on('user:typing:stop', (data) => {
    console.log('⌨️  User stopped typing:', data.username);
  });

  socket1.on('notification:new', (data) => {
    console.log('🔔 New notification:', data);
  });

  await sleep(2000);

  // Connect User 2
  console.log('\nConnecting User 2...');
  const socket2 = ioClient(WS_URL, {
    auth: { token: TOKEN2 }
  });

  socket2.on('connect', () => {
    console.log('✅ User 2 connected');
  });

  socket2.on('connect_error', (error) => {
    console.log('❌ User 2 connection failed:', error.message);
  });

  await sleep(2000);

  // Test presence
  console.log('\n=== Testing Presence ===');
  socket1.emit('presence:check', { userIds: [2, 3, 4] });
  socket1.once('presence:status', (data) => {
    console.log('✅ Presence status received:', data.users);
  });

  await sleep(2000);

  // Test typing indicators (conversation ID 1 - update this based on your data)
  console.log('\n=== Testing Typing Indicators ===');
  socket1.emit('user:typing:start', { conversationId: 1 });
  await sleep(1000);
  socket1.emit('user:typing:stop', { conversationId: 1 });

  await sleep(2000);

  // Disconnect
  console.log('\n=== Disconnecting ===');
  socket1.close();
  socket2.close();

  console.log('\n✅ Test completed!');
  process.exit(0);
}

// Run test
testWebSocket().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
